import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.models.models import BackupLog
from app.services.backup_service import perform_database_backup, BACKUP_DIR

router = APIRouter()

@router.post("/backups/trigger")
async def trigger_manual_backup(db: AsyncSession = Depends(get_db)):
    try:
        result = perform_database_backup()
        
        new_log = BackupLog(
            filename=result.get("filename"),
            filesize_bytes=result.get("filesize_bytes", 0),
            status=result.get("status"),
            emailed_to_admin=result.get("emailed_to_admin", False)
        )
        db.add(new_log)
        await db.commit()
        await db.refresh(new_log)

        return {
            "message": "Database backup completed successfully!",
            "details": result,
            "log_id": new_log.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@router.get("/backups/logs")
async def get_backup_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BackupLog).order_by(BackupLog.backup_time.desc()).limit(30))
    logs = result.scalars().all()
    return logs

@router.get("/backups/download/{filename}")
async def download_backup_file(filename: str):
    file_path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Backup file not found or purged by 10-day retention policy.")
        
    return FileResponse(
        path=file_path,
        media_type="application/sql",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )
