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
    Generates a professional PDF invoice containing company logo, store details,
    tax ID, line items, Google Rating QR code, Payment UPI QR code, and footer terms.
    """
    os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
    doc = SimpleDocTemplate(output_filepath, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    styles = getSampleStyleSheet()

    # Extract company settings with fallbacks
    comp_name = invoice_data.get("company_name") or settings.SHOP_NAME
    comp_address = invoice_data.get("company_address") or settings.SHOP_ADDRESS
    comp_phone = invoice_data.get("company_phone") or settings.SHOP_PHONE
    comp_email = invoice_data.get("company_email") or settings.ADMIN_EMAIL
    tax_id = invoice_data.get("tax_id") or "GSTIN: 27AAAAA0000A1Z5"
    logo_path = invoice_data.get("company_logo") or ""
    google_url = invoice_data.get("google_rating_url") or settings.GOOGLE_RATING_URL
    upi_id = invoice_data.get("default_upi_payment_id") or settings.DEFAULT_UPI_PAYMENT_ID
    footer_note = invoice_data.get("invoice_footer_note") or "Thank you for shopping with us! Items can be exchanged within 7 days with valid receipt."
    
    currency_symbol = invoice_data.get("currency_symbol") or "$"
    branch_name = invoice_data.get("branch_name") or "Main Downtown Flagship"
    terminal_name = invoice_data.get("terminal_name") or "Counter #01 - Main Billing Counter"

    # Custom styles
    sub_title_style = ParagraphStyle(
        'ShopSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
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

    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        textColor=colors.HexColor('#64748b'),
        alignment=1 # Centered
    )

    # Resolve logo image flowable
    logo_flowable = None
    if logo_path:
        clean_logo_path = logo_path
        if "static/" in logo_path:
            clean_logo_path = "/static/" + logo_path.split("static/")[1]
            
        if clean_logo_path.startswith('/static/'):
            abs_logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", clean_logo_path.lstrip('/')))
        else:
            abs_logo_path = clean_logo_path
        
        if os.path.exists(abs_logo_path):
            try:
                logo_flowable = RLImage(abs_logo_path, width=1.6*inch, height=0.7*inch, kind='proportional')
            except Exception as e:
                print(f"Error loading logo image into ReportLab: {e}")


    # Build Header Left Content
    shop_text = f"<b><font size=13 color='#0f172a'>{comp_name}</font></b><br/>"
    shop_text += f"{comp_address}<br/>"
    shop_text += f"Phone: {comp_phone} | Email: {comp_email}<br/>"
    if tax_id:
        shop_text += f"<b>{tax_id}</b>"

    header_left_paragraph = Paragraph(shop_text, sub_title_style)

    if logo_flowable:
        header_left_data = [[logo_flowable], [header_left_paragraph]]
        header_left_table = Table(header_left_data, colWidths=[3.5*inch])
        header_left_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ]))
        left_cell = header_left_table
    else:
        left_cell = header_left_paragraph

    # 1. Header Section (Logo + Shop info + Invoice meta)
    header_data = [
        [
            left_cell,
            Paragraph(f"<b>OFFICIAL TAX INVOICE</b><br/>Invoice #: <b>{invoice_data['invoice_number']}</b><br/>Date: {invoice_data['created_at']}<br/>Branch: <b>{branch_name}</b><br/>Counter: <b>{terminal_name}</b><br/>Payment: <b>{invoice_data['payment_method']}</b>", meta_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[3.8*inch, 3.2*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f172a'), spaceAfter=12))

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
            f"{currency_symbol}{float(item['unit_price']):.2f}",
            f"{float(item['tax_rate']):.1f}%",
            f"{currency_symbol}{float(item['line_total']):.2f}"
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
        ["Subtotal:", f"{currency_symbol}{subtotal:.2f}"],
        ["Tax Amount:", f"{currency_symbol}{tax_total:.2f}"],
        ["Discount:", f"-{currency_symbol}{discount:.2f}"],
        ["Grand Total:", f"{currency_symbol}{grand_total:.2f}"]
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
    story.append(Spacer(1, 15))

    # 5. QR Code Section (Google Rating QR + Payment QR)
    google_rating_buf = generate_qr_code_image(google_url)
    google_qr_img = RLImage(google_rating_buf, width=1.0*inch, height=1.0*inch)

    upi_payload = f"upi://pay?pa={upi_id}&pn={comp_name}&am={grand_total:.2f}"
    upi_qr_buf = generate_qr_code_image(upi_payload)
    upi_qr_img = RLImage(upi_qr_buf, width=1.0*inch, height=1.0*inch)

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
            Paragraph(f"<b>Instant Payment QR</b><br/>Pay {currency_symbol}{grand_total:.2f} via Mobile", qr_caption_style)
        ]
    ]
    qr_table = Table(qr_table_data, colWidths=[3.5*inch, 3.5*inch])
    qr_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#e2e8f0'), spaceAfter=10))
    story.append(qr_table)
    story.append(Spacer(1, 12))

    # 6. Footer Terms & Note
    if footer_note:
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceAfter=8))
        story.append(Paragraph(footer_note, footer_style))

    # Build document
    doc.build(story)
    return output_filepath

