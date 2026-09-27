import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NextGen Retail & Supermarket SaaS Billing Platform"
    API_V1_STR: str = "/api/v1"
    
    # DB Configuration (Supports PostgreSQL and SQLite fallback for local run)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./bill_software.db")
    SYNC_DATABASE_URL: str = os.getenv("SYNC_DATABASE_URL", "sqlite:///./bill_software.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey_nextgen_billing_software_2026_change_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Shop Details
    SHOP_NAME: str = os.getenv("SHOP_NAME", "NextGen Enterprise Supermarket & Retail")
    SHOP_PHONE: str = os.getenv("SHOP_PHONE", "+1 (800) 555-0199")
    SHOP_ADDRESS: str = os.getenv("SHOP_ADDRESS", "100 Commercial Plaza, Suite 400")
    GOOGLE_RATING_URL: str = os.getenv("GOOGLE_RATING_URL", "https://g.page/r/example_shop_review/review")
    DEFAULT_UPI_PAYMENT_ID: str = os.getenv("DEFAULT_UPI_PAYMENT_ID", "shopname@okaxis")
    
    # Email SMTP
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@shopbilling.com")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: str = os.getenv("SMTP_USER", "your_email@gmail.com")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "your_app_password")
    
    # Licensing
    RSA_LICENSE_SECRET_KEY: str = os.getenv("RSA_LICENSE_SECRET_KEY", "nextgen_local_licensing_rsa_secret_2026")

    class Config:
        case_sensitive = True

settings = Settings()
