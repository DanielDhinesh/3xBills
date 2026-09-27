from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.core.database import get_db
from app.models.models import Customer, Invoice, InvoiceItem
from app.schemas.schemas import CustomerCreate, CustomerResponse, InvoiceResponse, InvoiceItemResponse
from app.services.whatsapp_email_service import generate_whatsapp_bill_url
from app.core.config import settings

router = APIRouter()

@router.get("/customers", response_model=List[CustomerResponse])
async def list_customers(
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(Customer)
    if search:
        query = query.filter(
            (Customer.name.ilike(f"%{search}%")) | 
            (Customer.phone.ilike(f"%{search}%")) |
            (Customer.email.ilike(f"%{search}%"))
        )
    result = await db.execute(query.order_by(Customer.created_at.desc()))
    return result.scalars().all()

@router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer_in: CustomerCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).filter(Customer.phone == customer_in.phone))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this phone number already exists.")
        
    new_customer = Customer(**customer_in.model_dump())
    db.add(new_customer)
    await db.commit()
    await db.refresh(new_customer)
    return new_customer

@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, customer_in: CustomerCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).filter(Customer.id == customer_id))
    customer = result.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    for key, val in customer_in.model_dump().items():
        setattr(customer, key, val)

    await db.commit()
    await db.refresh(customer)
    return customer

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).filter(Customer.id == customer_id))
    customer = result.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    await db.delete(customer)
    await db.commit()
    return {"message": "Customer record deleted successfully"}

@router.get("/customers/{customer_id}/invoices", response_model=List[InvoiceResponse])
async def get_customer_purchase_history(customer_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.customer), selectinload(Invoice.items).selectinload(InvoiceItem.product))
        .filter(Invoice.customer_id == customer_id)
        .order_by(Invoice.created_at.desc())
    )
    invoices = result.scalars().all()
    
    res = []
    for inv in invoices:
        items_res = []
        for item in inv.items:
            items_res.append(InvoiceItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else "Deleted Product",
                quantity=item.quantity,
                unit_price=item.unit_price,
                tax_rate=item.tax_rate,
                tax_amount=item.tax_amount,
                line_total=item.line_total,
                line_profit=item.line_profit
            ))
            
        wa_url = None
        if inv.customer and inv.customer.phone:
            wa_url = generate_whatsapp_bill_url(
                phone=inv.customer.phone,
                customer_name=inv.customer.name,
                invoice_number=inv.invoice_number,
                grand_total=str(inv.grand_total),
                shop_name=settings.SHOP_NAME
            )

        res.append(InvoiceResponse(
            id=inv.id,
            invoice_number=inv.invoice_number,
            customer_name=inv.customer.name if inv.customer else "Walk-in Customer",
            customer_phone=inv.customer.phone if inv.customer else None,
            subtotal=inv.subtotal,
            tax_total=inv.tax_total,
            discount_amount=inv.discount_amount,
            grand_total=inv.grand_total,
            profit_margin=inv.profit_margin,
            payment_method=inv.payment_method,
            payment_status=inv.payment_status,
            pdf_url=f"/api/v1/invoices/{inv.id}/pdf",
            whatsapp_share_url=wa_url,
            created_at=inv.created_at,
            items=items_res
        ))
    return res
