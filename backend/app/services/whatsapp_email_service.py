import urllib.parse
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import List, Optional
import os
from app.core.config import settings

def generate_whatsapp_bill_url(phone: str, customer_name: str, invoice_number: str, grand_total: str, shop_name: str) -> str:
    """
    Generates a pre-filled WhatsApp click-to-send web link.
    """
    clean_phone = "".join(filter(str.isdigit, phone))
    if not clean_phone.startswith("1") and len(clean_phone) == 10:
        clean_phone = f"1{clean_phone}"

    message = (
        f"Hello {customer_name},\n\n"
        f"Thank you for shopping at *{shop_name}*!\n"
        f"🧾 Invoice Number: *{invoice_number}*\n"
        f"💰 Total Amount: *${float(grand_total):.2f}*\n\n"
        f"⭐ We value your feedback! Rate us 5-stars on Google:\n{settings.GOOGLE_RATING_URL}\n\n"
        f"Have a great day!"
    )
    encoded_message = urllib.parse.quote(message)
    return f"https://wa.me/{clean_phone}?text={encoded_message}"

def send_email_notification(
    to_email: str, 
    subject: str, 
    body_text: str, 
    attachment_filepath: Optional[str] = None,
    smtp_host: Optional[str] = None,
    smtp_port: Optional[int] = None,
    smtp_user: Optional[str] = None,
    smtp_password: Optional[str] = None
) -> bool:
    """
    Sends an email using standard SMTP or custom provided SMTP parameters.
    """
    host = smtp_host or settings.SMTP_HOST
    port = smtp_port or settings.SMTP_PORT
    user = smtp_user or settings.SMTP_USER
    password = smtp_password or settings.SMTP_PASSWORD

    if not user or user == "your_email@gmail.com":
        print(f"[Simulated Email Dispatch] To: {to_email} | Subject: {subject}")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = user
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body_text, 'html'))

        if attachment_filepath and os.path.exists(attachment_filepath):
            with open(attachment_filepath, 'rb') as f:
                part = MIMEApplication(f.read(), Name=os.path.basename(attachment_filepath))
                part['Content-Disposition'] = f'attachment; filename="{os.path.basename(attachment_filepath)}"'
                msg.attach(part)

        server = smtplib.SMTP(host, int(port))
        server.starttls()
        server.login(user, password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"[Email Send Error]: {str(e)}")
        raise e

def dispatch_bulk_campaign(customer_emails: List[str], campaign_title: str, campaign_body: str) -> int:
    """
    Sends promotional or alert emails to bulk customers.
    """
    success_count = 0
    for email in customer_emails:
        if email:
            sent = send_email_notification(
                to_email=email,
                subject=f"[{settings.SHOP_NAME}] {campaign_title}",
                body_text=f"<h3>{campaign_title}</h3><p>{campaign_body}</p><br/><hr/><p><small>{settings.SHOP_NAME} - {settings.SHOP_ADDRESS}</small></p>"
            )
            if sent:
                success_count += 1
    return success_count
