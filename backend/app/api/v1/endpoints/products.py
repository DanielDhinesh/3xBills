from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from decimal import Decimal

from app.core.database import get_db
from app.models.models import Product, Category, Supplier, User
from app.schemas.schemas import ProductCreate, ProductResponse, CategoryCreate, CategoryResponse, SupplierCreate, SupplierResponse, RestockRequest
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

async def require_inventory_write(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["ADMIN", "INVENTORY_MANAGER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inventory modification privileges required."
        )
    return current_user

# Products CRUD
@router.get("/products", response_model=List[ProductResponse])
async def list_products(
    search: Optional[str] = Query(None),
    low_stock_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    query = select(Product).options(selectinload(Product.category), selectinload(Product.supplier)).filter(Product.is_active == True)
    
    if search:
        query = query.filter((Product.name.ilike(f"%{search}%")) | (Product.barcode.ilike(f"%{search}%")))
    if low_stock_only:
        query = query.filter(Product.stock_quantity <= Product.min_stock_alert)
        
    result = await db.execute(query.order_by(Product.name))
    products = result.scalars().all()
    
    res = []
    for p in products:
        item = ProductResponse.model_validate(p)
        item.category_name = p.category.name if p.category else None
        item.supplier_name = p.supplier.name if p.supplier else None
        res.append(item)
    return res

@router.post("/products", response_model=ProductResponse)
async def create_or_restock_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_inventory_write)
):
    """
    Creates a new product or automatically restocks (merges) stock if the barcode already exists! (Admin/Inventory Manager)
    """
    result = await db.execute(select(Product).filter(Product.barcode == product_in.barcode))
    existing_product = result.scalars().first()
    
    if existing_product:
        existing_product.stock_quantity += product_in.stock_quantity
        existing_product.is_active = True
        
        if product_in.cost_price > Decimal("0.0"):
            existing_product.cost_price = product_in.cost_price
        if product_in.selling_price > Decimal("0.0"):
            existing_product.selling_price = product_in.selling_price
        if product_in.name:
            existing_product.name = product_in.name
            
        await db.commit()
        await db.refresh(existing_product)
        target_id = existing_product.id
    else:
        new_product = Product(**product_in.model_dump())
        db.add(new_product)
        await db.commit()
        await db.refresh(new_product)
        target_id = new_product.id
    
    res_query = await db.execute(select(Product).options(selectinload(Product.category), selectinload(Product.supplier)).filter(Product.id == target_id))
    p = res_query.scalars().first()
    item = ProductResponse.model_validate(p)
    item.category_name = p.category.name if p.category else None
    item.supplier_name = p.supplier.name if p.supplier else None
    return item

@router.post("/products/{product_id}/restock", response_model=ProductResponse)
async def restock_product(
    product_id: str,
    req: RestockRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_inventory_write)
):
    result = await db.execute(select(Product).filter(Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if req.quantity_to_add <= 0:
        raise HTTPException(status_code=400, detail="Quantity to add must be greater than 0")

    product.stock_quantity += req.quantity_to_add
    if req.new_cost_price and req.new_cost_price > Decimal("0.0"):
        product.cost_price = req.new_cost_price
    if req.new_selling_price and req.new_selling_price > Decimal("0.0"):
        product.selling_price = req.new_selling_price

    await db.commit()
    await db.refresh(product)

    res_query = await db.execute(select(Product).options(selectinload(Product.category), selectinload(Product.supplier)).filter(Product.id == product_id))
    p = res_query.scalars().first()
    item = ProductResponse.model_validate(p)
    item.category_name = p.category.name if p.category else None
    item.supplier_name = p.supplier.name if p.supplier else None
    return item

@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_inventory_write)
):
    result = await db.execute(select(Product).filter(Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    for key, val in product_in.model_dump().items():
        setattr(product, key, val)
        
    await db.commit()
    await db.refresh(product)
    
    res_query = await db.execute(select(Product).options(selectinload(Product.category), selectinload(Product.supplier)).filter(Product.id == product_id))
    p = res_query.scalars().first()
    item = ProductResponse.model_validate(p)
    item.category_name = p.category.name if p.category else None
    item.supplier_name = p.supplier.name if p.supplier else None
    return item

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_inventory_write)
):
    result = await db.execute(select(Product).filter(Product.id == product_id))
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    product.is_active = False
    await db.commit()
    return {"message": "Product deactivated successfully"}

# Categories
@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.name))
    return result.scalars().all()

@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    cat_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_inventory_write)
):
    new_cat = Category(**cat_in.model_dump())
    db.add(new_cat)
    await db.commit()
    await db.refresh(new_cat)
    return new_cat

# Suppliers
@router.get("/suppliers", response_model=List[SupplierResponse])
async def list_suppliers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplier).order_by(Supplier.name))
    return result.scalars().all()

@router.post("/suppliers", response_model=SupplierResponse)
async def create_supplier(
    sup_in: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_inventory_write)
):
    new_sup = Supplier(**sup_in.model_dump())
    db.add(new_sup)
    await db.commit()
    await db.refresh(new_sup)
    return new_sup
