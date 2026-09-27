from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import uvicorn

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.db.init_db import init_db_data
from app.services.backup_service import perform_database_backup

# API Endpoint imports
from app.api.v1.endpoints import auth, products, customers, invoices, analytics, notifications, licensing, backups

scheduler = AsyncIOScheduler()

def scheduled_backup_job():
    print("[APScheduler]: Executing Daily Automated Database Backup & 10-Day Cleanup...")
    perform_database_backup()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables & seed data
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as session:
        await init_db_data(session)

    # Start daily backup cron job (Every day at midnight 00:00)
    scheduler.add_job(scheduled_backup_job, 'cron', hour=0, minute=0)
    scheduler.start()
    print("[NextGen SaaS Billing Server]: Started successfully with APScheduler backup active.")

    yield

    # Shutdown
    scheduler.shutdown()
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(products.router, prefix=settings.API_V1_STR, tags=["Products & Inventory"])
app.include_router(customers.router, prefix=settings.API_V1_STR, tags=["Customers"])
app.include_router(invoices.router, prefix=settings.API_V1_STR, tags=["POS Invoicing & Billing"])
app.include_router(analytics.router, prefix=settings.API_V1_STR, tags=["Executive Dashboard & Financials"])
app.include_router(notifications.router, prefix=settings.API_V1_STR, tags=["Marketing & Notifications"])
app.include_router(licensing.router, prefix=settings.API_V1_STR, tags=["SaaS License Subscription"])
app.include_router(backups.router, prefix=settings.API_V1_STR, tags=["Database Backups"])

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "status": "ONLINE",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
