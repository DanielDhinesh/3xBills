import os
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from app.core.config import settings

def generate_financial_statement_pdf(report_meta: dict, monthly_rows: list, top_products: list, output_filepath: str) -> str:
    """
    Generates a PDF Executive Financial Report for the specified timeframe.
    """
    os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
    doc = SimpleDocTemplate(output_filepath, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    styles = getSampleStyleSheet()

    font_path = os.path.join(os.path.dirname(__file__), "..", "static", "fonts")
    try:
        pdfmetrics.registerFont(TTFont('Unicode', os.path.join(font_path, 'DejaVuSans.ttf')))
        pdfmetrics.registerFont(TTFont('Unicode-Bold', os.path.join(font_path, 'DejaVuSans-Bold.ttf')))
        font_regular = 'Unicode'
        font_bold = 'Unicode-Bold'
    except Exception:
        font_regular = 'Helvetica'
        font_bold = 'Helvetica-Bold'

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName=font_bold,
        fontSize=18,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )
    
    sub_title_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName=font_regular,
        fontSize=9,
        textColor=colors.HexColor('#475569'),
        leading=12
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName=font_bold,
        fontSize=9,
        textColor=colors.HexColor('#334155'),
        alignment=2
    )

    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName=font_bold,
        fontSize=12,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=12,
        spaceAfter=6
    )

    comp_name = report_meta.get("company_name") or settings.SHOP_NAME
    comp_address = report_meta.get("company_address") or settings.SHOP_ADDRESS
    comp_phone = report_meta.get("company_phone") or settings.SHOP_PHONE

    # 1. Header
    header_data = [
        [
            Paragraph(f"<b>{comp_name}</b><br/>{comp_address}<br/>Phone: {comp_phone}", sub_title_style),
            Paragraph(f"<b>EXECUTIVE FINANCIAL STATEMENT</b><br/>Timeframe: <b>{report_meta['timeframe_label']}</b><br/>Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", meta_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[3.5*inch, 3.5*inch])
    header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f172a'), spaceAfter=15))

    currency_symbol = report_meta.get("currency_symbol", "$")

    # 2. Executive KPI Highlights Grid
    kpi_data = [
        ["Gross Revenue", "Net Profit", "COGS", "Tax Collected"],
        [
            f"{currency_symbol}{float(report_meta['total_revenue']):.2f}",
            f"{currency_symbol}{float(report_meta['net_profit']):.2f}",
            f"{currency_symbol}{float(report_meta['cogs']):.2f}",
            f"{currency_symbol}{float(report_meta['tax_collected']):.2f}"
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[1.75*inch, 1.75*inch, 1.75*inch, 1.75*inch])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), font_bold),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,1), (-1,1), font_bold),
        ('FONTSIZE', (0,1), (-1,1), 11),
        ('TEXTCOLOR', (1,1), (1,1), colors.HexColor('#16a34a')), # Net Profit in green
        ('ROWBACKGROUNDS', (0,1), (-1,1), [colors.HexColor('#f8fafc')]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 15))

    # 3. Monthly Breakdown Table
    story.append(Paragraph("Monthly Financial Breakdown", section_header))
    m_data = [["Month Period", "Gross Revenue", "COGS", "Net Profit", "Tax", "Orders", "Avg Order Value"]]
    for row in monthly_rows:
        m_data.append([
            row['month_str'],
            f"{currency_symbol}{float(row['gross_revenue']):.2f}",
            f"{currency_symbol}{float(row['cogs']):.2f}",
            f"{currency_symbol}{float(row['net_profit']):.2f}",
            f"{currency_symbol}{float(row['tax_collected']):.2f}",
            str(row['total_invoices']),
            f"{currency_symbol}{float(row['avg_order_value']):.2f}"
        ])

    m_table = Table(m_data, colWidths=[1.1*inch, 1.0*inch, 0.9*inch, 1.0*inch, 0.9*inch, 0.7*inch, 1.4*inch])
    m_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), font_bold),
        ('FONTNAME', (0,1), (-1,-1), font_regular),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(m_table)
    story.append(Spacer(1, 15))

    # 4. Top Best Selling Products
    story.append(Paragraph("Top 5 Revenue Generating Products", section_header))
    top_data = [["Rank", "Product Name", "Units Sold", "Total Revenue"]]
    for idx, p in enumerate(top_products):
        top_data.append([
            f"#{idx + 1}",
            p['product_name'],
            str(p['total_quantity_sold']),
            f"{currency_symbol}{float(p['total_revenue']):.2f}"
        ])

    top_table = Table(top_data, colWidths=[0.8*inch, 3.8*inch, 1.2*inch, 1.2*inch])
    top_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#334155')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), font_bold),
        ('FONTNAME', (0,1), (-1,-1), font_regular),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
        ('ALIGN', (0,0), (1,-1), 'LEFT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(top_table)

    doc.build(story)
    return output_filepath
