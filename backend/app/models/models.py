import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Numeric, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="CASHIER") # ADMIN, CASHIER, INVENTORY_MANAGER
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    invoices = relationship("Invoice", back_populates="cashier")

class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="category")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="supplier")

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid)
    barcode = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)
    cost_price = Column(Numeric(10, 2), default=0.0)
    selling_price = Column(Numeric(10, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.0) # e.g. 18.00 %
    stock_quantity = Column(Integer, default=0)
    min_stock_alert = Column(Integer, default=5)
    unit = Column(String, default="pcs") # pcs, kg, ltr, box
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    invoice_items = relationship("InvoiceItem", back_populates="product")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    total_spent = Column(Numeric(12, 2), default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    invoices = relationship("Invoice", back_populates="customer")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, default=generate_uuid)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    cashier_id = Column(String, ForeignKey("users.id"), nullable=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=True)
    subtotal = Column(Numeric(10, 2), nullable=False)
    tax_total = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0.0)
    grand_total = Column(Numeric(10, 2), nullable=False)
    profit_margin = Column(Numeric(10, 2), default=0.0)
    payment_method = Column(String, default="CASH") # CASH, UPI_QR, CARD, CREDIT
    payment_status = Column(String, default="PAID") # PAID, PENDING
    pdf_filepath = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cashier = relationship("User", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.0)
    tax_amount = Column(Numeric(10, 2), nullable=False)
    line_total = Column(Numeric(10, 2), nullable=False)
    line_cost = Column(Numeric(10, 2), default=0.0)
    line_profit = Column(Numeric(10, 2), default=0.0)

    invoice = relationship("Invoice", back_populates="items")
    product = relationship("Product", back_populates="invoice_items")

class SystemLicense(Base):
    __tablename__ = "system_licenses"

    id = Column(String, primary_key=True, default=generate_uuid)
    license_key = Column(Text, nullable=False, unique=True)
    customer_shop_name = Column(String, nullable=False)
    machine_fingerprint = Column(String, nullable=False)
    tier = Column(String, default="ENTERPRISE") # STARTER, PROFESSIONAL, ENTERPRISE
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class BackupLog(Base):
    __tablename__ = "backup_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    filesize_bytes = Column(Integer, default=0)
    status = Column(String, default="SUCCESS") # SUCCESS, FAILED
    emailed_to_admin = Column(Boolean, default=False)
    backup_time = Column(DateTime, default=datetime.utcnow)

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    message_content = Column(Text, nullable=False)
    channel = Column(String, default="EMAIL") # EMAIL, WHATSAPP, BOTH
    target_count = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
