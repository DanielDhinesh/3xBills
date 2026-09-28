from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import os
import shutil
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.models.models import User, SystemSetting, Product, Invoice
from app.api.v1.endpoints.auth import get_admin_user
from app.services.whatsapp_email_service import send_email_notification
from app.services.report_export_service import generate_financial_statement_pdf

router = APIRouter()

class SystemSettingsUpdate(BaseModel):
    # SMTP Settings
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = ""
    smtp_password: Optional[str] = ""
    admin_notify_email: Optional[str] = ""
    enable_low_stock_alerts: Optional[bool] = True
    enable_inventory_updates: Optional[bool] = True
    enable_periodic_reports: Optional[bool] = True
    report_frequency: Optional[str] = "WEEKLY" # DAILY, WEEKLY, MONTHLY
    
    # Company Profile & Branding Details
    company_name: Optional[str] = "NextGen Enterprise Supermarket"
    company_tagline: Optional[str] = "Retail & Wholesale POS Billing Engine"
    company_logo: Optional[str] = ""
    company_phone: Optional[str] = "+1 (800) 555-0199"
    company_email: Optional[str] = "contact@shopbilling.com"
    company_address: Optional[str] = "100 Commercial Plaza, Suite 400"
    tax_id: Optional[str] = "GSTIN: 27AAAAA0000A1Z5"
    company_website: Optional[str] = "https://3xbills-retail.com"
    google_rating_url: Optional[str] = "https://g.page/r/example_shop_review/review"
    default_upi_payment_id: Optional[str] = "shopname@okaxis"
    invoice_footer_note: Optional[str] = "Thank you for shopping with us! Items can be exchanged within 7 days with valid tax receipt."
    
    # Currency Settings
    currency_symbol: Optional[str] = "$"
    currency_code: Optional[str] = "USD"

    # Multi-Branch & Multi-Terminal Settings
    active_branch_name: Optional[str] = "Main Downtown Flagship"
    active_terminal_name: Optional[str] = "Counter #01 - Main Cash Register"
    branches_list_json: Optional[str] = None
    terminals_list_json: Optional[str] = None

    # Theme Selection
    active_theme: Optional[str] = "enterprise-slate"

class TestEmailRequest(BaseModel):
    recipient_email: str

class SendReportRequest(BaseModel):
    report_type: str = "WEEKLY" # WEEKLY, MONTHLY, ALL_TIME
    recipient_email: Optional[str] = None

DEFAULT_BRANCHES_JSON = '[{"id":"br-1","name":"Main Downtown Flagship","code":"BR-01","phone":"+1 800-555-0199","address":"100 Commercial Plaza, Suite 400"},{"id":"br-2","name":"Airport Plaza Branch","code":"BR-02","phone":"+1 800-555-0299","address":"Terminal 2, Airport Retail Zone"}]'
DEFAULT_TERMINALS_JSON = '[{"id":"term-1","name":"Counter #01 - Main Cash Register","code":"TERM-01","branch_name":"Main Downtown Flagship"},{"id":"term-2","name":"Counter #02 - Express POS","code":"TERM-02","branch_name":"Main Downtown Flagship"},{"id":"term-3","name":"Counter #03 - Wholesale Billing Desk","code":"TERM-03","branch_name":"Airport Plaza Branch"}]'

@router.get("/settings/public")
@router.get("/settings/public/")
async def get_public_branding_settings(
    db: AsyncSession = Depends(get_db)
):
    """
    Publicly accessible endpoint for fetching company logo, name, currency, branches, terminals, tax ID, and active theme.
    """
    result = await db.execute(select(SystemSetting))
    db_settings = {s.key: s.value for s in result.scalars().all()}

    return {
        "company_name": db_settings.get("company_name", settings.SHOP_NAME),
        "company_tagline": db_settings.get("company_tagline", "Retail & Wholesale SaaS Billing Engine"),
        "company_logo": db_settings.get("company_logo", ""),
        "company_phone": db_settings.get("company_phone", settings.SHOP_PHONE),
        "company_email": db_settings.get("company_email", settings.ADMIN_EMAIL),
        "company_address": db_settings.get("company_address", settings.SHOP_ADDRESS),
        "tax_id": db_settings.get("tax_id", "GSTIN: 27AAAAA0000A1Z5"),
        "company_website": db_settings.get("company_website", "https://3xbills-retail.com"),
        "google_rating_url": db_settings.get("google_rating_url", settings.GOOGLE_RATING_URL),
        "default_upi_payment_id": db_settings.get("default_upi_payment_id", settings.DEFAULT_UPI_PAYMENT_ID),
        "invoice_footer_note": db_settings.get("invoice_footer_note", "Thank you for shopping with us! Returns valid within 7 days."),
        "currency_symbol": db_settings.get("currency_symbol", "$"),
        "currency_code": db_settings.get("currency_code", "USD"),
        "active_branch_name": db_settings.get("active_branch_name", "Main Downtown Flagship"),
        "active_terminal_name": db_settings.get("active_terminal_name", "Counter #01 - Main Cash Register"),
        "branches_list_json": db_settings.get("branches_list_json", DEFAULT_BRANCHES_JSON),
        "terminals_list_json": db_settings.get("terminals_list_json", DEFAULT_TERMINALS_JSON),
        "active_theme": db_settings.get("active_theme", "enterprise-slate")
    }

@router.get("/settings")
@router.get("/settings/")
async def get_system_settings(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(SystemSetting))
    db_settings = {s.key: s.value for s in result.scalars().all()}

    return {
        # SMTP
        "smtp_host": db_settings.get("smtp_host", settings.SMTP_HOST),
        "smtp_port": int(db_settings.get("smtp_port", settings.SMTP_PORT)),
        "smtp_user": db_settings.get("smtp_user", settings.SMTP_USER),
        "smtp_password": db_settings.get("smtp_password", settings.SMTP_PASSWORD),
        "admin_notify_email": db_settings.get("admin_notify_email", admin.email),
        "enable_low_stock_alerts": db_settings.get("enable_low_stock_alerts", "true") == "true",
        "enable_inventory_updates": db_settings.get("enable_inventory_updates", "true") == "true",
        "enable_periodic_reports": db_settings.get("enable_periodic_reports", "true") == "true",
        "report_frequency": db_settings.get("report_frequency", "WEEKLY"),
        
        # Company Profile & Branding
        "company_name": db_settings.get("company_name", settings.SHOP_NAME),
        "company_tagline": db_settings.get("company_tagline", "Retail & Wholesale SaaS Billing Engine"),
        "company_logo": db_settings.get("company_logo", ""),
        "company_phone": db_settings.get("company_phone", settings.SHOP_PHONE),
        "company_email": db_settings.get("company_email", admin.email),
        "company_address": db_settings.get("company_address", settings.SHOP_ADDRESS),
        "tax_id": db_settings.get("tax_id", "GSTIN: 27AAAAA0000A1Z5"),
        "company_website": db_settings.get("company_website", "https://3xbills-retail.com"),
        "google_rating_url": db_settings.get("google_rating_url", settings.GOOGLE_RATING_URL),
        "default_upi_payment_id": db_settings.get("default_upi_payment_id", settings.DEFAULT_UPI_PAYMENT_ID),
        "invoice_footer_note": db_settings.get("invoice_footer_note", "Thank you for shopping with us! Returns valid within 7 days with invoice."),
        "currency_symbol": db_settings.get("currency_symbol", "$"),
        "currency_code": db_settings.get("currency_code", "USD"),
        "active_branch_name": db_settings.get("active_branch_name", "Main Downtown Flagship"),
        "active_terminal_name": db_settings.get("active_terminal_name", "Counter #01 - Main Cash Register"),
        "branches_list_json": db_settings.get("branches_list_json", DEFAULT_BRANCHES_JSON),
        "terminals_list_json": db_settings.get("terminals_list_json", DEFAULT_TERMINALS_JSON),
        "active_theme": db_settings.get("active_theme", "enterprise-slate")
    }

@router.put("/settings")
@router.put("/settings/")
async def update_system_settings(
    payload: SystemSettingsUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    updates = {
        # SMTP
        "smtp_host": payload.smtp_host or "smtp.gmail.com",
        "smtp_port": str(payload.smtp_port or 587),
        "smtp_user": payload.smtp_user or "",
        "smtp_password": payload.smtp_password or "",
        "admin_notify_email": payload.admin_notify_email or admin.email,
        "enable_low_stock_alerts": "true" if payload.enable_low_stock_alerts else "false",
        "enable_inventory_updates": "true" if payload.enable_inventory_updates else "false",
        "enable_periodic_reports": "true" if payload.enable_periodic_reports else "false",
        "report_frequency": payload.report_frequency or "WEEKLY",
        
        # Company Profile & Branding
        "company_name": payload.company_name or settings.SHOP_NAME,
        "company_tagline": payload.company_tagline or "",
        "company_logo": payload.company_logo or "",
        "company_phone": payload.company_phone or "",
        "company_email": payload.company_email or "",
        "company_address": payload.company_address or "",
        "tax_id": payload.tax_id or "",
        "company_website": payload.company_website or "",
        "google_rating_url": payload.google_rating_url or settings.GOOGLE_RATING_URL,
        "default_upi_payment_id": payload.default_upi_payment_id or settings.DEFAULT_UPI_PAYMENT_ID,
        "invoice_footer_note": payload.invoice_footer_note or "",
        "currency_symbol": payload.currency_symbol or "$",
        "currency_code": payload.currency_code or "USD",
        "active_branch_name": payload.active_branch_name or "Main Downtown Flagship",
        "active_terminal_name": payload.active_terminal_name or "Counter #01 - Main Cash Register",
        "active_theme": payload.active_theme or "enterprise-slate"
    }

    if payload.branches_list_json is not None:
        updates["branches_list_json"] = payload.branches_list_json
    if payload.terminals_list_json is not None:
        updates["terminals_list_json"] = payload.terminals_list_json

    for key, val in updates.items():
        res = await db.execute(select(SystemSetting).filter(SystemSetting.key == key))
        setting = res.scalars().first()
        if setting:
            setting.value = str(val)
        else:
            db.add(SystemSetting(key=key, value=str(val)))

    await db.commit()
    return {"message": "Company details, branding & system settings updated successfully!"}

@router.post("/settings/upload-logo")
async def upload_company_logo(
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Uploads company logo image, saves to static uploads directory, and updates company_logo setting.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image (PNG, JPG, SVG, WebP, etc.).")

    static_upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "uploads"))
    os.makedirs(static_upload_dir, exist_ok=True)


    ext = os.path.splitext(file.filename)[1] or ".png"
    unique_filename = f"logo_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(static_upload_dir, unique_filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    logo_url = f"/static/uploads/{unique_filename}"

    # Update in DB
    res = await db.execute(select(SystemSetting).filter(SystemSetting.key == "company_logo"))
    setting = res.scalars().first()
    if setting:
        setting.value = logo_url
    else:
        db.add(SystemSetting(key="company_logo", value=logo_url))

    await db.commit()
    return {"message": "Company logo uploaded successfully!", "logo_url": logo_url}

@router.post("/settings/test-email")
async def test_email_configuration(
    payload: TestEmailRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(SystemSetting))
    db_settings = {s.key: s.value for s in res.scalars().all()}

    smtp_host = db_settings.get("smtp_host", settings.SMTP_HOST)
    smtp_port = int(db_settings.get("smtp_port", settings.SMTP_PORT))
    smtp_user = db_settings.get("smtp_user", settings.SMTP_USER)
    smtp_password = db_settings.get("smtp_password", settings.SMTP_PASSWORD)

    if not smtp_user or not smtp_password:
        raise HTTPException(
            status_code=400, 
            detail="SMTP Gmail user or App Password is missing. Please save valid SMTP settings first."
        )

    try:
        html_body = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #ffffff; border-radius: 12px;">
            <h2 style="color: #38bdf8;">✅ 3xBills Gmail SMTP Connection Test</h2>
            <p>Congratulations! Your Gmail SMTP configuration is active and working properly.</p>
            <p><strong>Configured Sender:</strong> {smtp_user}</p>
            <p><strong>Target Recipient:</strong> {payload.recipient_email}</p>
            <hr style="border: 1px solid #1e293b; margin: 20px 0;"/>
            <p style="font-size: 12px; color: #94a3b8;">Sent automatically from NextGen SaaS Supermarket Billing Platform</p>
        </div>
        """

        send_email_notification(
            to_email=payload.recipient_email,
            subject="[3xBills] Gmail SMTP Connection Test Successful",
            body_text=html_body,
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_user=smtp_user,
            smtp_password=smtp_password
        )
        return {"message": f"Test email dispatched successfully to {payload.recipient_email}!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@router.post("/settings/send-report")
async def email_sales_report(
    payload: SendReportRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(SystemSetting))
    db_settings = {s.key: s.value for s in res.scalars().all()}

    target_email = payload.recipient_email or db_settings.get("admin_notify_email") or admin.email
    smtp_host = db_settings.get("smtp_host", settings.SMTP_HOST)
    smtp_port = int(db_settings.get("smtp_port", settings.SMTP_PORT))
    smtp_user = db_settings.get("smtp_user", settings.SMTP_USER)
    smtp_password = db_settings.get("smtp_password", settings.SMTP_PASSWORD)

    # Fetch products and low stock count
    prod_res = await db.execute(select(Product))
    products = prod_res.scalars().all()
    low_stock = [p for p in products if p.stock_quantity <= p.min_stock_alert]

    # Fetch invoices count & revenue
    inv_res = await db.execute(select(Invoice))
    invoices = inv_res.scalars().all()
    total_sales = sum(float(i.grand_total) for i in invoices)
    net_profit = sum(float(i.profit_margin) for i in invoices)
    tax_total = sum(float(i.tax_total) for i in invoices)

    reports_dir = os.path.join(os.getcwd(), "app", "reports_pdf")
    os.makedirs(reports_dir, exist_ok=True)
    report_filename = f"financial_statement_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.pdf"
    pdf_path = os.path.join(reports_dir, report_filename)

    meta = {
        "timeframe_label": f"{payload.report_type.title()} Overview",
        "total_revenue": total_sales,
        "net_profit": net_profit,
        "cogs": max(0, total_sales - net_profit),
        "tax_collected": tax_total
    }

    generate_financial_statement_pdf(
        report_meta=meta,
        monthly_rows=[],
        top_products=[],
        output_filepath=pdf_path
    )

    body_text = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #ffffff; border-radius: 12px;">
        <h2 style="color: #38bdf8;">📊 3xBills {payload.report_type.title()} Sales & Inventory Report</h2>
        <p>Dear {admin.full_name},</p>
        <p>Here is your automated <strong>{payload.report_type}</strong> store performance summary:</p>
        <ul>
            <li><strong>Total Revenue:</strong> ${total_sales:.2f}</li>
            <li><strong>Total Invoices Billed:</strong> {len(invoices)}</li>
            <li><strong>Active Inventory Items:</strong> {len(products)}</li>
            <li><strong>Low Stock Alerts:</strong> <span style="color: #f43f5e;">{len(low_stock)} items</span></li>
        </ul>
        <p>Attached to this email is the full PDF Executive Report.</p>
        <hr style="border: 1px solid #1e293b; margin: 20px 0;"/>
        <p style="font-size: 12px; color: #94a3b8;">NextGen Retail & Supermarket Billing Platform</p>
    </div>
    """

    shop_title = db_settings.get("company_name", settings.SHOP_NAME)
    try:
        send_email_notification(
            to_email=target_email,
            subject=f"[{shop_title}] {payload.report_type.title()} Sales & Inventory Report",
            body_text=body_text,
            attachment_filepath=pdf_path,
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_user=smtp_user,
            smtp_password=smtp_password
        )
        return {"message": f"Report successfully generated and emailed to {target_email}!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error emailing report: {str(e)}")

@router.post("/settings/send-low-stock-alert")
async def email_low_stock_alert(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(SystemSetting))
    db_settings = {s.key: s.value for s in res.scalars().all()}

    target_email = db_settings.get("admin_notify_email") or admin.email
    smtp_host = db_settings.get("smtp_host", settings.SMTP_HOST)
    smtp_port = int(db_settings.get("smtp_port", settings.SMTP_PORT))
    smtp_user = db_settings.get("smtp_user", settings.SMTP_USER)
    smtp_password = db_settings.get("smtp_password", settings.SMTP_PASSWORD)

    prod_res = await db.execute(select(Product))
    products = prod_res.scalars().all()
    low_stock = [p for p in products if p.stock_quantity <= p.min_stock_alert]

    if not low_stock:
        return {"message": "All stock quantities are healthy! No low stock alerts needed."}

    rows_html = "".join(
        f"<tr><td style='padding: 8px; border: 1px solid #334155;'>{p.barcode}</td>"
        f"<td style='padding: 8px; border: 1px solid #334155;'>{p.name}</td>"
        f"<td style='padding: 8px; border: 1px solid #334155; color: #f43f5e; font-weight: bold;'>{p.stock_quantity} {p.unit}</td></tr>"
        for p in low_stock
    )

    body_text = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #ffffff; border-radius: 12px;">
        <h2 style="color: #f43f5e;">⚠️ Urgent Low Stock Alert ({len(low_stock)} Items)</h2>
        <p>The following inventory items have reached or dropped below their minimum alert limit:</p>
        <table style="width: 100%; border-collapse: collapse; text-align: left; background-color: #1e293b;">
            <thead>
                <tr style="background-color: #0f172a; color: #94a3b8;">
                    <th style="padding: 8px; border: 1px solid #334155;">Barcode</th>
                    <th style="padding: 8px; border: 1px solid #334155;">Item Name</th>
                    <th style="padding: 8px; border: 1px solid #334155;">Current Stock</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
        <p style="margin-top: 15px;">Please restock these items soon in the Inventory panel.</p>
    </div>
    """

    try:
        send_email_notification(
            to_email=target_email,
            subject=f"⚠️ URGENT: Low Stock Alert ({len(low_stock)} items low)",
            body_text=body_text,
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_user=smtp_user,
            smtp_password=smtp_password
        )
        return {"message": f"Low stock alert email dispatched for {len(low_stock)} items to {target_email}!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending low stock alert: {str(e)}")

