from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.models.models import Customer, Campaign
from app.schemas.schemas import CampaignCreate, CampaignResponse
from app.services.whatsapp_email_service import dispatch_bulk_campaign

router = APIRouter()

@router.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(
    campaign_in: CampaignCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    cust_res = await db.execute(select(Customer.email).filter(Customer.email.isnot(None)))
    customer_emails = [e for e in cust_res.scalars().all() if e]

    target_count = len(customer_emails)

    new_campaign = Campaign(
        title=campaign_in.title,
        message_content=campaign_in.message_content,
        channel=campaign_in.channel,
        target_count=target_count,
        sent_count=target_count # Will update async
    )
    db.add(new_campaign)
    await db.commit()
    await db.refresh(new_campaign)

    if customer_emails:
        background_tasks.add_task(
            dispatch_bulk_campaign,
            customer_emails=customer_emails,
            campaign_title=campaign_in.title,
            campaign_body=campaign_in.message_content
        )

    return new_campaign

@router.get("/campaigns", response_model=List[CampaignResponse])
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Campaign).order_by(Campaign.created_at.desc()))
    return result.scalars().all()
