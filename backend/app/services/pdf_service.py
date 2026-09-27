import os
import qrcode
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from app.core.config import settings

def generate_qr_code_image(data: str) -> BytesIO:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer

def generate_invoice_pdf(invoice_data: dict, output_filepath: str) -> str:
    """
    Generates a professional PDF invoice containing shop details, line items,
    Google Rating QR code, and Payment UPI QR code.
    """
    os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
    doc = SimpleDocTemplate(output_filepath, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=4
    )
    
    sub_title_style = ParagraphStyle(
        'ShopSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#475569'),
        leading=13
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.HexColor('#334155'),
        alignment=2 # Right aligned
    )

    # 1. Header Section (Shop info + Invoice meta)
    header_data = [
        [
            Paragraph(f"<b>{settings.SHOP_NAME}</b><br/>{settings.SHOP_ADDRESS}<br/>Phone: {settings.SHOP_PHONE}", sub_title_style),
            Paragraph(f"<b>TAX INVOICE</b><br/>Invoice #: <b>{invoice_data['invoice_number']}</b><br/>Date: {invoice_data['created_at']}<br/>Payment: <b>{invoice_data['payment_method']}</b>", meta_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[3.5*inch, 3.5*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=15))

    # 2. Customer Info
    cust_info = f"<b>Billed To:</b> {invoice_data.get('customer_name', 'Walk-in Customer')}"
    if invoice_data.get('customer_phone'):
        cust_info += f" | Phone: {invoice_data.get('customer_phone')}"
    story.append(Paragraph(cust_info, sub_title_style))
    story.append(Spacer(1, 12))

    # 3. Line Items Table
    table_data = [["Item Description", "Qty", "Price", "Tax %", "Line Total"]]
    for item in invoice_data.get('items', []):
        table_data.append([
            item['product_name'],
            str(item['quantity']),
            f"${float(item['unit_price']):.2f}",
            f"{float(item['tax_rate']):.1f}%",
            f"${float(item['line_total']):.2f}"
        ])

    items_table = Table(table_data, colWidths=[3.2*inch, 0.8*inch, 1.0*inch, 0.8*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 15))

    # 4. Totals Summary Table
    subtotal = float(invoice_data.get('subtotal', 0))
    tax_total = float(invoice_data.get('tax_total', 0))
    discount = float(invoice_data.get('discount_amount', 0))
    grand_total = float(invoice_data.get('grand_total', 0))

    totals_data = [
        ["Subtotal:", f"${subtotal:.2f}"],
        ["Tax Amount:", f"${tax_total:.2f}"],
        ["Discount:", f"-${discount:.2f}"],
        ["Grand Total:", f"${grand_total:.2f}"]
    ]
    totals_table = Table(totals_data, colWidths=[5.5*inch, 1.5*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,-2), 'Helvetica'),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,-1), (-1,-1), 11),
        ('TEXTCOLOR', (0,-1), (-1,-1), colors.HexColor('#0f172a')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 20))

    # 5. QR Code Section (Google Rating QR + Payment QR)
    # Generate Google Rating QR Code
    google_rating_buf = generate_qr_code_image(settings.GOOGLE_RATING_URL)
    google_qr_img = RLImage(google_rating_buf, width=1.1*inch, height=1.1*inch)

    # Generate UPI Payment QR Code
    upi_payload = f"upi://pay?pa={settings.DEFAULT_UPI_PAYMENT_ID}&pn={settings.SHOP_NAME}&am={grand_total:.2f}&cu=USD"
    upi_qr_buf = generate_qr_code_image(upi_payload)
    upi_qr_img = RLImage(upi_qr_buf, width=1.1*inch, height=1.1*inch)

    qr_caption_style = ParagraphStyle(
        'QRCaption',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        alignment=1, # Centered
        textColor=colors.HexColor('#334155')
    )

    qr_table_data = [
        [google_qr_img, upi_qr_img],
        [
            Paragraph("<b>Rate Us 5-Stars!</b><br/>Scan for Google Review", qr_caption_style),
            Paragraph(f"<b>Instant Payment QR</b><br/>Pay ${grand_total:.2f} via Mobile", qr_caption_style)
        ]
    ]
    qr_table = Table(qr_table_data, colWidths=[3.5*inch, 3.5*inch])
    qr_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceAfter=15))
    story.append(qr_table)

    # Build document
    doc.build(story)
    return output_filepath
