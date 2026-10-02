import os
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, and_, String
from decimal import Decimal
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.models import Invoice, InvoiceItem, Product, SystemLicense, User, SystemSetting
from app.schemas.schemas import DashboardKPI, SalesChartPoint, TopProductItem, MonthlyReportRow, PaymentMethodBreakdown, CashierPerformanceRow
from app.core.licensing import get_machine_fingerprint, verify_license_token
from app.services.report_export_service import generate_financial_statement_pdf

router = APIRouter()
REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "reports_pdf"))

def apply_date_filters(query, start_date: Optional[str], end_date: Optional[str]):
    if start_date:
        try:
            s_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Invoice.created_at >= s_dt)
        except ValueError:
            pass
    if end_date:
        try:
            e_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(Invoice.created_at < e_dt)
        except ValueError:
            pass
    return query

@router.get("/dashboard/kpi", response_model=DashboardKPI)
async def get_dashboard_kpis(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(
        func.coalesce(func.sum(Invoice.grand_total), 0).label("revenue"),
        func.coalesce(func.sum(Invoice.profit_margin), 0).label("profit"),
        func.coalesce(func.sum(Invoice.tax_total), 0).label("tax"),
        func.count(Invoice.id).label("total_invoices")
    )
    stmt = apply_date_filters(stmt, start_date, end_date)
    inv_res = await db.execute(stmt)
    inv_stats = inv_res.first()
    
    total_revenue = Decimal(str(inv_stats.revenue))
    net_profit = Decimal(str(inv_stats.profit))
    tax_collected = Decimal(str(inv_stats.tax))
    total_invoices = inv_stats.total_invoices

    cogs = total_revenue - net_profit
    avg_order_value = (total_revenue / Decimal(str(total_invoices))) if total_invoices > 0 else Decimal("0.0")
    profit_margin_percentage = ((net_profit / total_revenue) * Decimal("100.0")) if total_revenue > 0 else Decimal("0.0")
    
    # Low stock count
    stock_res = await db.execute(
        select(func.count(Product.id)).filter(Product.is_active == True, Product.stock_quantity <= Product.min_stock_alert)
    )
    low_stock = stock_res.scalar_one()

    # Total Inventory Cost Valuation (Sum of active stock_quantity * cost_price)
    inv_cost_res = await db.execute(
        select(func.coalesce(func.sum(Product.stock_quantity * Product.cost_price), 0)).filter(Product.is_active == True)
    )
    total_inventory_cost = Decimal(str(inv_cost_res.scalar_one()))

    # License Status
    lic_res = await db.execute(select(SystemLicense).filter(SystemLicense.is_active == True).order_by(SystemLicense.created_at.desc()))
    active_lic = lic_res.scalars().first()
    
    status_str = "TRIAL / UNLICENSED"
    days_left = 30
    if active_lic:
        hwid = get_machine_fingerprint()
        verification = verify_license_token(active_lic.license_key, hwid)
        if verification.get("valid"):
            status_str = f"ACTIVE ({verification.get('tier', 'ENTERPRISE')})"
            days_left = verification.get("days_left", 0)
        else:
            status_str = f"EXPIRED / INVALID ({verification.get('reason', '')})"

    return DashboardKPI(
        total_revenue=total_revenue,
        net_profit=net_profit,
        cogs=cogs,
        total_inventory_cost=total_inventory_cost,
        avg_order_value=avg_order_value,
        profit_margin_percentage=profit_margin_percentage,
        total_invoices=total_invoices,
        low_stock_count=low_stock,
        tax_collected=tax_collected,
        active_license_status=status_str,
        days_left_license=days_left
    )

@router.get("/dashboard/chart", response_model=List[SalesChartPoint])
async def get_sales_chart_data(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    date_col = func.substr(func.cast(Invoice.created_at, String), 1, 10).label("date_str")
    stmt = (
        select(
            date_col,
            func.coalesce(func.sum(Invoice.grand_total), 0).label("daily_sales"),
            func.coalesce(func.sum(Invoice.profit_margin), 0).label("daily_profit")
        )
    )
    stmt = apply_date_filters(stmt, start_date, end_date)
    stmt = (
        stmt.group_by(func.substr(func.cast(Invoice.created_at, String), 1, 10))
        .order_by("date_str")
        .limit(30)
    )
    res = await db.execute(stmt)
    rows = res.all()
    
    chart = []
    for r in rows:
        chart.append(SalesChartPoint(
            date=r.date_str,
            sales=Decimal(str(r.daily_sales)),
            profit=Decimal(str(r.daily_profit))
        ))
    return chart

@router.get("/dashboard/monthly-reports", response_model=List[MonthlyReportRow])
async def get_monthly_reports(db: AsyncSession = Depends(get_db)):
    month_col = func.substr(func.cast(Invoice.created_at, String), 1, 7).label("month_str")
    stmt = (
        select(
            month_col,
            func.coalesce(func.sum(Invoice.grand_total), 0).label("revenue"),
            func.coalesce(func.sum(Invoice.profit_margin), 0).label("profit"),
            func.coalesce(func.sum(Invoice.tax_total), 0).label("tax"),
            func.count(Invoice.id).label("total_invoices")
        )
        .group_by(func.substr(func.cast(Invoice.created_at, String), 1, 7))
        .order_by(desc("month_str"))
        .limit(12)
    )
    res = await db.execute(stmt)
    rows = res.all()
    
    result = []
    for r in rows:
        rev = Decimal(str(r.revenue))
        prof = Decimal(str(r.profit))
        cogs = rev - prof
        cnt = r.total_invoices
        aov = (rev / Decimal(str(cnt))) if cnt > 0 else Decimal("0.0")

        result.append(MonthlyReportRow(
            month_str=r.month_str,
            gross_revenue=rev,
            cogs=cogs,
            net_profit=prof,
            tax_collected=Decimal(str(r.tax)),
            total_invoices=cnt,
            avg_order_value=aov
        ))
    return result

@router.get("/dashboard/cashiers-performance", response_model=List[CashierPerformanceRow])
async def get_cashiers_performance(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns Sales Audit Logs per cashier (who sold how much, order counts, and averages).
    """
    users_res = await db.execute(select(User))
    users = users_res.scalars().all()

    result = []
    for u in users:
        stmt = select(
            func.coalesce(func.sum(Invoice.grand_total), 0).label("tot_sales"),
            func.count(Invoice.id).label("tot_inv")
        ).filter(Invoice.cashier_id == u.id)
        
        stmt = apply_date_filters(stmt, start_date, end_date)
        res = await db.execute(stmt)
        stats = res.first()
        
        sales = Decimal(str(stats.tot_sales))
        cnt = stats.tot_inv
        avg_val = (sales / Decimal(str(cnt))) if cnt > 0 else Decimal("0.0")

        result.append(CashierPerformanceRow(
            cashier_id=u.id,
            full_name=u.full_name,
            email=u.email,
            role=u.role,
            total_sales=sales,
            total_invoices=cnt,
            avg_sale_value=avg_val
        ))
    return result

@router.get("/dashboard/payment-breakdown", response_model=List[PaymentMethodBreakdown])
async def get_payment_breakdown(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(
            Invoice.payment_method,
            func.coalesce(func.sum(Invoice.grand_total), 0).label("total_amount"),
            func.count(Invoice.id).label("cnt")
        )
    )
    stmt = apply_date_filters(stmt, start_date, end_date)
    stmt = stmt.group_by(Invoice.payment_method)
    
    res = await db.execute(stmt)
    rows = res.all()
    
    return [
        PaymentMethodBreakdown(
            payment_method=r.payment_method,
            total_amount=Decimal(str(r.total_amount)),
            transaction_count=r.cnt
        )
        for r in rows
    ]

@router.get("/dashboard/top-products", response_model=List[TopProductItem])
async def get_top_products(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(
            Product.name.label("product_name"),
            func.sum(InvoiceItem.quantity).label("sold_qty"),
            func.sum(InvoiceItem.line_total).label("revenue")
        )
        .join(InvoiceItem, Product.id == InvoiceItem.product_id)
        .join(Invoice, InvoiceItem.invoice_id == Invoice.id)
    )
    stmt = apply_date_filters(stmt, start_date, end_date)
    stmt = (
        stmt.group_by(Product.name)
        .order_by(desc("revenue"))
        .limit(5)
    )
    res = await db.execute(stmt)
    rows = res.all()
    
    top = []
    for r in rows:
        top.append(TopProductItem(
            product_name=r.product_name,
            total_quantity_sold=r.sold_qty,
            total_revenue=Decimal(str(r.revenue))
        ))
    return top

@router.get("/dashboard/export-report")
async def export_financial_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    kpi = await get_dashboard_kpis(start_date=start_date, end_date=end_date, db=db)
    monthly_rows = await get_monthly_reports(db=db)
    top_prods = await get_top_products(start_date=start_date, end_date=end_date, db=db)

    timeframe_str = "All-Time Financial Overview"
    if start_date and end_date:
        timeframe_str = f"Custom Period ({start_date} to {end_date})"
    elif start_date:
        timeframe_str = f"From {start_date} onwards"

    res_settings = await db.execute(select(SystemSetting))
    db_settings = {s.key: s.value for s in res_settings.scalars().all()}

    meta = {
        "timeframe_label": timeframe_str,
        "total_revenue": kpi.total_revenue,
        "net_profit": kpi.net_profit,
        "cogs": kpi.cogs,
        "tax_collected": kpi.tax_collected,
        "currency_symbol": db_settings.get("currency_symbol", "$"),
        "company_name": db_settings.get("company_name"),
        "company_address": db_settings.get("company_address"),
        "company_phone": db_settings.get("company_phone")
    }

    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_filename = f"financial_statement_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.pdf"
    report_filepath = os.path.join(REPORTS_DIR, report_filename)

    generate_financial_statement_pdf(
        report_meta=meta,
        monthly_rows=[m.model_dump() for m in monthly_rows],
        top_products=[t.model_dump() for t in top_prods],
        output_filepath=report_filepath
    )

    return FileResponse(
        path=report_filepath,
        media_type="application/pdf",
        filename=report_filename,
        headers={"Content-Disposition": f"attachment; filename=\"{report_filename}\""}
    )
