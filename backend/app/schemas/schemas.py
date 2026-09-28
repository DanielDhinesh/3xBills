from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "CASHIER"
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Category Schemas
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryResponse(CategoryCreate):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Supplier Schemas
class SupplierCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    company_name: Optional[str] = None

class SupplierResponse(SupplierCreate):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Product Schemas
class ProductCreate(BaseModel):
    barcode: str
    name: str
    category_id: Optional[str] = None
    supplier_id: Optional[str] = None
    cost_price: Decimal = Decimal("0.0")
    selling_price: Decimal
    tax_rate: Decimal = Decimal("0.0")
    stock_quantity: int = 0
    min_stock_alert: int = 5
    unit: str = "pcs"

class RestockRequest(BaseModel):
    quantity_to_add: int
    new_cost_price: Optional[Decimal] = None
    new_selling_price: Optional[Decimal] = None

class ProductResponse(ProductCreate):
    id: str
    is_active: bool
    created_at: datetime
    category_name: Optional[str] = None
    supplier_name: Optional[str] = None
    class Config:
        from_attributes = True

# Customer Schemas
class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None

class CustomerResponse(CustomerCreate):
    id: str
    total_spent: Decimal
    created_at: datetime
    class Config:
        from_attributes = True

# Invoice Schemas
class InvoiceItemCreate(BaseModel):
    product_id: str
    quantity: int

class InvoiceCreate(BaseModel):
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    payment_method: str = "CASH" # CASH, UPI_QR, CARD, CREDIT
    discount_amount: Decimal = Decimal("0.0")
    branch_name: Optional[str] = None
    terminal_name: Optional[str] = None
    items: List[InvoiceItemCreate]

class InvoiceItemResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    quantity: int
    unit_price: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    line_total: Decimal
    line_profit: Decimal
    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    cashier_name: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    subtotal: Decimal
    tax_total: Decimal
    discount_amount: Decimal
    grand_total: Decimal
    profit_margin: Decimal
    payment_method: str
    payment_status: str
    branch_name: Optional[str] = None
    terminal_name: Optional[str] = None
    pdf_url: Optional[str] = None
    whatsapp_share_url: Optional[str] = None
    created_at: datetime
    items: List[InvoiceItemResponse] = []
    class Config:
        from_attributes = True

# Analytics & Dashboard Schemas
class DashboardKPI(BaseModel):
    total_revenue: Decimal
    net_profit: Decimal
    cogs: Decimal
    total_inventory_cost: Decimal = Decimal("0.0")
    avg_order_value: Decimal
    profit_margin_percentage: Decimal
    total_invoices: int
    low_stock_count: int
    tax_collected: Decimal
    active_license_status: str
    days_left_license: int

class SalesChartPoint(BaseModel):
    date: str
    sales: Decimal
    profit: Decimal

class TopProductItem(BaseModel):
    product_name: str
    total_quantity_sold: int
    total_revenue: Decimal

class MonthlyReportRow(BaseModel):
    month_str: str
    gross_revenue: Decimal
    cogs: Decimal
    net_profit: Decimal
    tax_collected: Decimal
    total_invoices: int
    avg_order_value: Decimal

class PaymentMethodBreakdown(BaseModel):
    payment_method: str
    total_amount: Decimal
    transaction_count: int

class CashierPerformanceRow(BaseModel):
    cashier_id: str
    full_name: str
    email: str
    role: str
    total_sales: Decimal
    total_invoices: int
    avg_sale_value: Decimal

# Campaign Schemas
class CampaignCreate(BaseModel):
    title: str
    message_content: str
    channel: str = "EMAIL" # EMAIL, WHATSAPP, BOTH

class CampaignResponse(CampaignCreate):
    id: str
    target_count: int
    sent_count: int
    created_at: datetime
    class Config:
        from_attributes = True

# License Schemas
class LicenseActivateRequest(BaseModel):
    license_key: str

class LicenseStatusResponse(BaseModel):
    is_licensed: bool
    shop_name: str
    tier: str
    expires: str
    days_left: int
    machine_id: str
    message: str
