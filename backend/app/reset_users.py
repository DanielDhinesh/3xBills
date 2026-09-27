import asyncio
import sys
import os

# Add parent dir to sys.path so app module works cleanly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal
from app.models.models import User
from app.core.security import get_password_hash
from sqlalchemy.future import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        if not users:
            print("No users found in database.")
        for user in users:
            if user.email == "admin@shopbilling.com":
                user.password_hash = get_password_hash("admin123")
                user.is_active = True
                print("Updated admin@shopbilling.com password to admin123")
            elif user.email == "cashier@shopbilling.com":
                user.password_hash = get_password_hash("cashier123")
                user.is_active = True
                print("Updated cashier@shopbilling.com password to cashier123")
        await db.commit()

if __name__ == "__main__":
    asyncio.run(main())
