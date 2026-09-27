from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, Dict, Any
from pydantic import BaseModel
import os

from app.core.database import get_db
from app.core.config import settings
from app.models.models import User, SystemSetting, Product, Invoice
from app.api.v1.endpoints.auth import get_admin_user
from app.services.whatsapp_email_service import send_email_notification
from app.services.report_export_service import generate_pdf_financial_report

router = APIRouter()

class SmtpSettingsUpdate(BaseModel):
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = ""
    smtp_password: Optional[str] = ""
    admin_notify_email: Optional[str] = ""
    enable_low_stock_alerts: Optional[bool] = True
    enable_inventory_updates: Optional[bool] = True
    enable_periodic_reports: Optional[bool] = True
    report_frequency: Optional[str] = "WEEKLY" # DAILY, WEEKLY, MONTHLY

class TestEmailRequest(BaseModel):
    recipient_email: str

class SendReportRequest(BaseModel):
    report_type: str = "WEEKLY" # WEEKLY, MONTHLY, ALL_TIME
    recipient_email: Optional[str] = None

@router.get("")
async def get_system_settings(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(SystemSetting))
    db_settings = {s.key: s.value for s in result.scalars().all()}

    return {
        "smtp_host": db_settings.get("smtp_host", settings.SMTP_HOST),
        "smtp_port": int(db_settings.get("smtp_port", settings.SMTP_PORT)),
        "smtp_user": db_settings.get("smtp_user", settings.SMTP_USER),
        "smtp_password": db_settings.get("smtp_password", settings.SMTP_PASSWORD),
        "admin_notify_email": db_settings.get("admin_notify_email", admin.email),
        "enable_low_stock_alerts": db_settings.get("enable_low_stock_alerts", "true") == "true",
        "enable_inventory_updates": db_settings.get("enable_inventory_updates", "true") == "true",
        "enable_periodic_reports": db_settings.get("enable_periodic_reports", "true") == "true",
        "report_frequency": db_settings.get("report_frequency", "WEEKLY")
    }

@router.put("")
async def update_system_settings(
    payload: SmtpSettingsUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    updates = {
        "smtp_host": payload.smtp_host or "smtp.gmail.com",
        "smtp_port": str(payload.smtp_port or 587),
        "smtp_user": payload.smtp_user or "",
        "smtp_password": payload.smtp_password or "",
        "admin_notify_email": payload.admin_notify_email or admin.email,
        "enable_low_stock_alerts": "true" if payload.enable_low_stock_alerts else "false",
        "enable_inventory_updates": "true" if payload.enable_inventory_updates else "false",
        "enable_periodic_reports": "true" if payload.enable_periodic_reports else "false",
        "report_frequency": payload.report_frequency or "WEEKLY"
    }

    for key, val in updates.items():
        res = await db.execute(select(SystemSetting).filter(SystemSetting.key == key))
        setting = res.scalars().first()
        if setting:
            setting.value = val
        else:
            db.add(SystemSetting(key=key, value=val))

    await db.commit()
    return {"message": "System Settings & Gmail SMTP configuration updated successfully!"}

@router.post("/test-email")
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

@router.post("/send-report")
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

    pdf_path = generate_pdf_financial_report(
        report_title=f"{payload.report_type.title()} Executive Sales & Inventory Report",
        start_date="",
        end_date="",
        total_revenue=total_sales,
        total_invoices=len(invoices),
        total_products=len(products),
        low_stock_count=len(low_stock),
        invoices=invoices[:15]
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

    try:
        send_email_notification(
            to_email=target_email,
            subject=f"[{settings.SHOP_NAME}] {payload.report_type.title()} Sales & Inventory Report",
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

@router.post("/send-low-stock-alert")
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
