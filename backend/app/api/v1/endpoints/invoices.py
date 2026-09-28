import os
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.core.database import get_db
from app.core.config import settings
from app.models.models import Invoice, InvoiceItem, Product, Customer, User, SystemSetting
from app.schemas.schemas import InvoiceCreate, InvoiceResponse, InvoiceItemResponse
from app.services.pdf_service import generate_invoice_pdf
from app.services.whatsapp_email_service import generate_whatsapp_bill_url, send_email_notification
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()
PDF_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "invoices_pdf"))

def build_pdf_url(request: Request, invoice_id: str) -> str:
    base_url = str(request.base_url).rstrip("/")
    return f"{base_url}{settings.API_V1_STR}/invoices/{invoice_id}/pdf"

async def get_db_company_branding(db: AsyncSession) -> dict:
    res = await db.execute(select(SystemSetting))
    db_settings = {s.key: s.value for s in res.scalars().all()}
    return {
        "company_name": db_settings.get("company_name", settings.SHOP_NAME),
        "company_address": db_settings.get("company_address", settings.SHOP_ADDRESS),
        "company_phone": db_settings.get("company_phone", settings.SHOP_PHONE),
        "company_email": db_settings.get("company_email", settings.ADMIN_EMAIL),
        "tax_id": db_settings.get("tax_id", "GSTIN: 27AAAAA0000A1Z5"),
        "company_logo": db_settings.get("company_logo", ""),
        "google_rating_url": db_settings.get("google_rating_url", settings.GOOGLE_RATING_URL),
        "default_upi_payment_id": db_settings.get("default_upi_payment_id", settings.DEFAULT_UPI_PAYMENT_ID),
        "invoice_footer_note": db_settings.get("invoice_footer_note", "Thank you for shopping with us! Items can be exchanged within 7 days with valid receipt."),
        "currency_symbol": db_settings.get("currency_symbol", "$"),
        "currency_code": db_settings.get("currency_code", "USD"),
        "active_branch_name": db_settings.get("active_branch_name", "Main Downtown Flagship"),
        "active_terminal_name": db_settings.get("active_terminal_name", "Counter #01 - Main Cash Register")
    }


@router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(
    invoice_in: InvoiceCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    if not invoice_in.items:
        raise HTTPException(status_code=400, detail="Invoice must contain at least one item.")
        
    branding = await get_db_company_branding(db)
    branch_to_set = invoice_in.branch_name or branding["active_branch_name"]
    terminal_to_set = invoice_in.terminal_name or branding["active_terminal_name"]

    # 1. Resolve or Create Customer
    customer = None
    if invoice_in.customer_phone:
        res = await db.execute(select(Customer).filter(Customer.phone == invoice_in.customer_phone))
        customer = res.scalars().first()
        if not customer:
            customer = Customer(
                name=invoice_in.customer_name or "Retail Customer",
                phone=invoice_in.customer_phone,
                email=invoice_in.customer_email
            )
            db.add(customer)
            await db.flush()

    # 2. Process Items and stock calculation
    subtotal = Decimal("0.0")
    tax_total = Decimal("0.0")
    total_cost = Decimal("0.0")
    
    invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    
    db_items = []
    response_items = []

    for item_in in invoice_in.items:
        prod_res = await db.execute(select(Product).filter(Product.id == item_in.product_id))
        product = prod_res.scalars().first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {item_in.product_id} not found.")
            
        if product.stock_quantity < item_in.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for '{product.name}'. Available: {product.stock_quantity}")

        # Deduct stock
        product.stock_quantity -= item_in.quantity

        # Item Math
        unit_price = Decimal(str(product.selling_price))
        cost_price = Decimal(str(product.cost_price))
        tax_rate = Decimal(str(product.tax_rate))
        
        line_subtotal = unit_price * item_in.quantity
        line_tax = (line_subtotal * tax_rate) / Decimal("100.0")
        line_total = line_subtotal + line_tax
        line_cost = cost_price * item_in.quantity
        line_profit = line_total - line_cost

        subtotal += line_subtotal
        tax_total += line_tax
        total_cost += line_cost

        db_item = InvoiceItem(
            product_id=product.id,
            quantity=item_in.quantity,
            unit_price=unit_price,
            tax_rate=tax_rate,
            tax_amount=line_tax,
            line_total=line_total,
            line_cost=line_cost,
            line_profit=line_profit
        )
        db_items.append(db_item)

        response_items.append(
            InvoiceItemResponse(
                id="",
                product_id=product.id,
                product_name=product.name,
                quantity=item_in.quantity,
                unit_price=unit_price,
                tax_rate=tax_rate,
                tax_amount=line_tax,
                line_total=line_total,
                line_profit=line_profit
            )
        )

    discount = Decimal(str(invoice_in.discount_amount))
    grand_total = (subtotal + tax_total) - discount
    if grand_total < 0:
        grand_total = Decimal("0.0")
        
    profit_margin = grand_total - total_cost

    # Save Invoice
    new_invoice = Invoice(
        invoice_number=invoice_number,
        customer_id=customer.id if customer else None,
        subtotal=subtotal,
        tax_total=tax_total,
        discount_amount=discount,
        grand_total=grand_total,
        profit_margin=profit_margin,
        payment_method=invoice_in.payment_method,
        payment_status="PAID",
        branch_name=branch_to_set,
        terminal_name=terminal_to_set
    )
    db.add(new_invoice)
    await db.flush()

    for item in db_items:
        item.invoice_id = new_invoice.id
        db.add(item)

    if customer:
        customer.total_spent = Decimal(str(customer.total_spent)) + grand_total

    await db.commit()

    # 3. Generate PDF Invoice
    os.makedirs(PDF_DIR, exist_ok=True)
    pdf_filename = f"{invoice_number}.pdf"
    pdf_filepath = os.path.join(PDF_DIR, pdf_filename)
    
    pdf_data = {
        "invoice_number": invoice_number,
        "created_at": new_invoice.created_at.strftime("%Y-%m-%d %H:%M"),
        "customer_name": customer.name if customer else "Retail Walk-in",
        "customer_phone": customer.phone if customer else "",
        "payment_method": invoice_in.payment_method,
        "branch_name": branch_to_set,
        "terminal_name": terminal_to_set,
        "items": [item.model_dump() for item in response_items],
        "subtotal": subtotal,
        "tax_total": tax_total,
        "discount_amount": discount,
        "grand_total": grand_total,
        **branding
    }
    
    generate_invoice_pdf(pdf_data, pdf_filepath)
    new_invoice.pdf_filepath = pdf_filepath
    await db.commit()

    # 4. Generate WhatsApp Share URL & Email Notification
    whatsapp_url = None
    if customer and customer.phone:
        whatsapp_url = generate_whatsapp_bill_url(
            phone=customer.phone,
            customer_name=customer.name,
            invoice_number=invoice_number,
            grand_total=str(grand_total),
            shop_name=branding["company_name"]
        )

    if customer and customer.email:
        background_tasks.add_task(
            send_email_notification,
            to_email=customer.email,
            subject=f"[{branding['company_name']}] Invoice #{invoice_number}",
            body_text=f"<h3>Thank you for your purchase!</h3><p>Find attached your official digital tax invoice receipt #{invoice_number}.</p>",
            attachment_filepath=pdf_filepath
        )

    full_pdf_url = build_pdf_url(request, new_invoice.id)

    return InvoiceResponse(
        id=new_invoice.id,
        invoice_number=invoice_number,
        cashier_name="System Store",
        customer_name=customer.name if customer else "Walk-in Customer",
        customer_phone=customer.phone if customer else None,
        subtotal=subtotal,
        tax_total=tax_total,
        discount_amount=discount,
        grand_total=grand_total,
        profit_margin=profit_margin,
        payment_method=invoice_in.payment_method,
        payment_status="PAID",
        branch_name=branch_to_set,
        terminal_name=terminal_to_set,
        pdf_url=full_pdf_url,
        whatsapp_share_url=whatsapp_url,
        created_at=new_invoice.created_at,
        items=response_items
    )

@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.customer), selectinload(Invoice.cashier), selectinload(Invoice.items).selectinload(InvoiceItem.product))
        .order_by(Invoice.created_at.desc())
    )
    invoices = result.scalars().all()
    branding = await get_db_company_branding(db)
    
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
                shop_name=branding["company_name"]
            )

        full_pdf_url = build_pdf_url(request, inv.id)

        res.append(InvoiceResponse(
            id=inv.id,
            invoice_number=inv.invoice_number,
            cashier_name=inv.cashier.full_name if inv.cashier else "System Store",
            customer_name=inv.customer.name if inv.customer else "Walk-in Customer",
            customer_phone=inv.customer.phone if inv.customer else None,
            subtotal=inv.subtotal,
            tax_total=inv.tax_total,
            discount_amount=inv.discount_amount,
            grand_total=inv.grand_total,
            profit_margin=inv.profit_margin,
            payment_method=inv.payment_method,
            payment_status=inv.payment_status,
            branch_name=inv.branch_name or branding["active_branch_name"],
            terminal_name=inv.terminal_name or branding["active_terminal_name"],
            pdf_url=full_pdf_url,
            whatsapp_share_url=wa_url,
            created_at=inv.created_at,
            items=items_res
        ))
    return res

@router.post("/invoices/{invoice_id}/regenerate", response_model=InvoiceResponse)
async def regenerate_lost_invoice_bill(invoice_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Regenerates a lost bill PDF and returns updated links for customer re-printing and WhatsApp resend.
    """
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.customer), selectinload(Invoice.cashier), selectinload(Invoice.items).selectinload(InvoiceItem.product))
        .filter(Invoice.id == invoice_id)
    )
    invoice = result.scalars().first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    os.makedirs(PDF_DIR, exist_ok=True)
    pdf_filename = f"{invoice.invoice_number}.pdf"
    pdf_filepath = os.path.join(PDF_DIR, pdf_filename)

    items_res = []
    for item in invoice.items:
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

    branding = await get_db_company_branding(db)
    pdf_data = {
        "invoice_number": invoice.invoice_number,
        "created_at": invoice.created_at.strftime("%Y-%m-%d %H:%M"),
        "customer_name": invoice.customer.name if invoice.customer else "Retail Walk-in",
        "customer_phone": invoice.customer.phone if invoice.customer else "",
        "payment_method": invoice.payment_method,
        "items": [item.model_dump() for item in items_res],
        "subtotal": invoice.subtotal,
        "tax_total": invoice.tax_total,
        "discount_amount": invoice.discount_amount,
        "grand_total": invoice.grand_total,
        **branding
    }

    generate_invoice_pdf(pdf_data, pdf_filepath)
    invoice.pdf_filepath = pdf_filepath
    await db.commit()

    wa_url = None
    if invoice.customer and invoice.customer.phone:
        wa_url = generate_whatsapp_bill_url(
            phone=invoice.customer.phone,
            customer_name=invoice.customer.name,
            invoice_number=invoice.invoice_number,
            grand_total=str(invoice.grand_total),
            shop_name=branding["company_name"]
        )

    full_pdf_url = build_pdf_url(request, invoice.id)

    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        cashier_name=invoice.cashier.full_name if invoice.cashier else "System Store",
        customer_name=invoice.customer.name if invoice.customer else "Walk-in Customer",
        customer_phone=invoice.customer.phone if invoice.customer else None,
        subtotal=invoice.subtotal,
        tax_total=invoice.tax_total,
        discount_amount=invoice.discount_amount,
        grand_total=invoice.grand_total,
        profit_margin=invoice.profit_margin,
        payment_method=invoice.payment_method,
        payment_status=invoice.payment_status,
        pdf_url=full_pdf_url,
        whatsapp_share_url=wa_url,
        created_at=invoice.created_at,
        items=items_res
    )

@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Invoice).filter(Invoice.id == invoice_id))
    invoice = result.scalars().first()
    if not invoice or not invoice.pdf_filepath or not os.path.exists(invoice.pdf_filepath):
        raise HTTPException(status_code=404, detail="Invoice PDF file not found.")
        
    return FileResponse(
        path=invoice.pdf_filepath,
        media_type="application/pdf",
        filename=f"{invoice.invoice_number}.pdf",
        headers={
            "Content-Disposition": f"inline; filename=\"{invoice.invoice_number}.pdf\""
        }
    )
