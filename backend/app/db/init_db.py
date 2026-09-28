from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from app.core.security import get_password_hash
from app.models.models import User, Category, Supplier, Product, Customer, Invoice, InvoiceItem
from decimal import Decimal

async def run_auto_migrations(db: AsyncSession):
    try:
        bind = db.bind
        dialect_name = bind.dialect.name if bind else "sqlite"
        if dialect_name == "sqlite":
            res = await db.execute(text("PRAGMA table_info(invoices)"))
            cols = [r[1] for r in res.fetchall()]
            if "branch_name" not in cols:
                await db.execute(text("ALTER TABLE invoices ADD COLUMN branch_name VARCHAR DEFAULT 'Main Downtown Flagship'"))
            if "terminal_name" not in cols:
                await db.execute(text("ALTER TABLE invoices ADD COLUMN terminal_name VARCHAR DEFAULT 'Counter #01 - Main Cash Register'"))
        else:
            await db.execute(text("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS branch_name VARCHAR DEFAULT 'Main Downtown Flagship'"))
            await db.execute(text("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terminal_name VARCHAR DEFAULT 'Counter #01 - Main Cash Register'"))
        await db.commit()
    except Exception as e:
        print("[Auto-Migration Info]:", e)

async def init_db_data(db: AsyncSession):
    await run_auto_migrations(db)
    # 1. Create Default Admin User
    user_res = await db.execute(select(User).filter(User.email == "admin@shopbilling.com"))
    if not user_res.scalars().first():
        admin = User(
            email="admin@shopbilling.com",
            password_hash=get_password_hash("admin123"),
            full_name="System Store Manager",
            role="ADMIN"
        )
        cashier = User(
            email="cashier@shopbilling.com",
            password_hash=get_password_hash("cashier123"),
            full_name="Sarah Connor (POS Cashier)",
            role="CASHIER"
        )
        db.add(admin)
        db.add(cashier)
        await db.flush()

    # 2. Create Categories
    cat_res = await db.execute(select(Category))
    categories = cat_res.scalars().all()
    if not categories:
        cat1 = Category(name="Beverages & Dairy", description="Milk, juices, sodas, and dairy products")
        cat2 = Category(name="Snacks & Confectionery", description="Chips, biscuits, chocolates")
        cat3 = Category(name="Household & Cleaning", description="Detergents, soaps, tissue rolls")
        cat4 = Category(name="Staples & Grains", description="Rice, flour, pulses, spices")
        db.add_all([cat1, cat2, cat3, cat4])
        await db.flush()
        categories = [cat1, cat2, cat3, cat4]

    # 3. Create Suppliers
    sup_res = await db.execute(select(Supplier))
    suppliers = sup_res.scalars().all()
    if not suppliers:
        sup1 = Supplier(name="Global Foods Distro Ltd.", company_name="Global Foods", phone="+1 555-901-2233", email="orders@globalfoods.com")
        sup2 = Supplier(name="Apex FMCG Wholesalers", company_name="Apex Group", phone="+1 555-889-1100", email="sales@apexfmcg.com")
        db.add_all([sup1, sup2])
        await db.flush()
        suppliers = [sup1, sup2]

    # 4. Create Initial Products
    prod_res = await db.execute(select(Product))
    if not prod_res.scalars().first():
        products = [
            Product(
                barcode="89010010001",
                name="Organic Whole Milk 1L",
                category_id=categories[0].id,
                supplier_id=suppliers[0].id,
                cost_price=Decimal("1.80"),
                selling_price=Decimal("3.49"),
                tax_rate=Decimal("5.0"),
                stock_quantity=45,
                min_stock_alert=10,
                unit="box"
            ),
            Product(
                barcode="89010020002",
                name="Artisanal Dark Chocolate 100g",
                category_id=categories[1].id,
                supplier_id=suppliers[1].id,
                cost_price=Decimal("2.10"),
                selling_price=Decimal("4.99"),
                tax_rate=Decimal("18.0"),
                stock_quantity=3, # Trigger Low Stock alert
                min_stock_alert=8,
                unit="pcs"
            ),
            Product(
                barcode="89010030003",
                name="Ultra Clean Laundry Liquid 2L",
                category_id=categories[2].id,
                supplier_id=suppliers[1].id,
                cost_price=Decimal("6.50"),
                selling_price=Decimal("12.99"),
                tax_rate=Decimal("18.0"),
                stock_quantity=28,
                min_stock_alert=5,
                unit="pcs"
            ),
            Product(
                barcode="89010040004",
                name="Basmati Premium Rice 5kg",
                category_id=categories[3].id,
                supplier_id=suppliers[0].id,
                cost_price=Decimal("9.00"),
                selling_price=Decimal("16.50"),
                tax_rate=Decimal("5.0"),
                stock_quantity=20,
                min_stock_alert=5,
                unit="pcs"
            ),
            Product(
                barcode="89010050005",
                name="Sparkling Citrus Energy Drink 355ml",
                category_id=categories[0].id,
                supplier_id=suppliers[0].id,
                cost_price=Decimal("0.90"),
                selling_price=Decimal("2.49"),
                tax_rate=Decimal("12.0"),
                stock_quantity=60,
                min_stock_alert=15,
                unit="pcs"
            )
        ]
        db.add_all(products)
        await db.flush()

    # 5. Create Sample Customer
    cust_res = await db.execute(select(Customer))
    if not cust_res.scalars().first():
        cust = Customer(
            name="John Doe",
            phone="+14155552671",
            email="johndoe@example.com",
            address="456 Elm Street, Cityville"
        )
        db.add(cust)
        await db.flush()

    await db.commit()
