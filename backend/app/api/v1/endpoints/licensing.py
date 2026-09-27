from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.config import settings
from app.models.models import SystemLicense
from app.schemas.schemas import LicenseActivateRequest, LicenseStatusResponse
from app.core.licensing import get_machine_fingerprint, generate_license_key, verify_license_token

router = APIRouter()

@router.get("/license/status", response_model=LicenseStatusResponse)
async def get_license_status(db: AsyncSession = Depends(get_db)):
    hwid = get_machine_fingerprint()
    result = await db.execute(select(SystemLicense).filter(SystemLicense.is_active == True).order_by(SystemLicense.created_at.desc()))
    active_license = result.scalars().first()
    
    if not active_license:
        # Generate temporary demo status with option to activate
        demo_key = generate_license_key(settings.SHOP_NAME, valid_days=30, tier="TRIAL", machine_id=hwid)
        return LicenseStatusResponse(
            is_licensed=False,
            shop_name=settings.SHOP_NAME,
            tier="TRIAL",
            expires="30 Days Remaining",
            days_left=30,
            machine_id=hwid,
            message=f"Trial License Active. Hardware ID: {hwid}. Please enter your permanent activation key."
        )

    verification = verify_license_token(active_license.license_key, hwid)
    if verification.get("valid"):
        return LicenseStatusResponse(
            is_licensed=True,
            shop_name=verification.get("shop", settings.SHOP_NAME),
            tier=verification.get("tier", "ENTERPRISE"),
            expires=verification.get("expires", ""),
            days_left=verification.get("days_left", 0),
            machine_id=hwid,
            message="Software subscription is active and verified."
        )
    else:
        return LicenseStatusResponse(
            is_licensed=False,
            shop_name=active_license.customer_shop_name,
            tier="EXPIRED",
            expires="Expired",
            days_left=0,
            machine_id=hwid,
            message=verification.get("reason", "License Key Verification Failed.")
        )

@router.post("/license/activate", response_model=LicenseStatusResponse)
async def activate_license(req: LicenseActivateRequest, db: AsyncSession = Depends(get_db)):
    hwid = get_machine_fingerprint()
    verification = verify_license_token(req.license_key, hwid)
    
    if not verification.get("valid"):
        raise HTTPException(status_code=400, detail=verification.get("reason", "Invalid License Key"))

    # Deactivate prior licenses
    prior = await db.execute(select(SystemLicense).filter(SystemLicense.is_active == True))
    for p in prior.scalars().all():
        p.is_active = False

    new_lic = SystemLicense(
        license_key=req.license_key,
        customer_shop_name=verification.get("shop", settings.SHOP_NAME),
        machine_fingerprint=hwid,
        tier=verification.get("tier", "ENTERPRISE"),
        valid_until=datetime.strptime(verification.get("expires"), "%Y-%m-%d") if 'datetime' in globals() else datetime.utcnow(),
        is_active=True
    )
    db.add(new_lic)
    await db.commit()

    return LicenseStatusResponse(
        is_licensed=True,
        shop_name=verification.get("shop", settings.SHOP_NAME),
        tier=verification.get("tier", "ENTERPRISE"),
        expires=verification.get("expires", ""),
        days_left=verification.get("days_left", 0),
        machine_id=hwid,
        message="License activated successfully!"
    )

@router.get("/license/generate-demo-key")
async def generate_demo_license_key(days: int = 365, tier: str = "ENTERPRISE"):
    """
    Utility endpoint for platform author/outsourcer to generate a valid key for a customer shop.
    """
    hwid = get_machine_fingerprint()
    token = generate_license_key(shop_name=settings.SHOP_NAME, valid_days=days, tier=tier, machine_id=hwid)
    return {
        "shop_name": settings.SHOP_NAME,
        "machine_id": hwid,
        "valid_days": days,
        "tier": tier,
        "generated_license_key": token
    }
