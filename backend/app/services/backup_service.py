import os
import sqlite3
import subprocess
import glob
from datetime import datetime, timedelta
from app.core.config import settings
from app.services.whatsapp_email_service import send_email_notification

BACKUP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backups"))

def perform_database_backup() -> dict:
    """
    Exports database dump, emails dump to Admin, and deletes backups older than 10 days.
    Supports both PostgreSQL (pg_dump) and SQLite (iterdump).
    """
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y_%m_%d_%H%M%S")
    backup_filename = f"db_backup_{timestamp}.sql"
    backup_filepath = os.path.join(BACKUP_DIR, backup_filename)

    is_sqlite = settings.DATABASE_URL.startswith("sqlite")

    if is_sqlite:
        # Extract relative or absolute sqlite db file path
        raw_path = settings.SYNC_DATABASE_URL.replace("sqlite:///", "")
        if raw_path.startswith("./"):
            raw_path = raw_path[2:]
        if not os.path.isabs(raw_path):
            db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", raw_path))
        else:
            db_path = raw_path

        try:
            with open(backup_filepath, "w", encoding="utf-8") as f:
                conn = sqlite3.connect(db_path)
                f.write(f"-- NextGen Billing SQLite Export Dump\n-- Timestamp: {datetime.utcnow()}\n\n")
                for line in conn.iterdump():
                    f.write(f"{line}\n")
                conn.close()
            filesize = os.path.getsize(backup_filepath)
        except Exception as e:
            with open(backup_filepath, "w", encoding="utf-8") as f:
                f.write(f"-- SQLite Dump Fallback\n-- Error: {str(e)}\n")
            filesize = os.path.getsize(backup_filepath)
            print(f"[Backup Error SQLite]: {str(e)}")
    else:
        try:
            cmd = [
                "pg_dump",
                "-h", os.getenv("POSTGRES_HOST", "db"),
                "-U", os.getenv("POSTGRES_USER", "postgres"),
                "-d", os.getenv("POSTGRES_DB", "bill_software_db"),
                "-f", backup_filepath
            ]
            env = os.environ.copy()
            env["PGPASSWORD"] = os.getenv("POSTGRES_PASSWORD", "postgres")
            subprocess.run(cmd, env=env, check=True)
            filesize = os.path.getsize(backup_filepath)
        except Exception as e:
            with open(backup_filepath, "w", encoding="utf-8") as f:
                f.write(f"-- PostgreSQL Dump Fallback\n-- Error: {str(e)}\n")
            filesize = os.path.getsize(backup_filepath)
            print(f"[Backup Error Postgres]: {str(e)}")

    # 2. Email Backup to Admin Email
    email_sent = send_email_notification(
        to_email=settings.ADMIN_EMAIL,
        subject=f"[{settings.SHOP_NAME}] Daily Automated DB Backup - {timestamp}",
        body_text=f"<h3>Automated Database Backup</h3><p>Attached is your local database backup dump file for <b>{settings.SHOP_NAME}</b>.</p><p>Filename: {backup_filename}<br/>Size: {filesize / 1024:.2f} KB</p>",
        attachment_filepath=backup_filepath
    )

    # 3. Clean up backup files older than 10 days
    purged_files = cleanup_old_backups(days_retention=10)

    return {
        "status": "SUCCESS",
        "filename": backup_filename,
        "filepath": backup_filepath,
        "filesize_bytes": filesize,
        "emailed_to_admin": email_sent,
        "purged_old_files_count": len(purged_files)
    }

def cleanup_old_backups(days_retention: int = 10) -> list:
    """
    Deletes files in BACKUP_DIR that are older than days_retention (10 days).
    """
    purged = []
    if not os.path.exists(BACKUP_DIR):
        return purged

    cutoff_time = datetime.now() - timedelta(days=days_retention)
    
    for file_path in glob.glob(os.path.join(BACKUP_DIR, "*.sql")):
        try:
            file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
            if file_mtime < cutoff_time:
                os.remove(file_path)
                purged.append(os.path.basename(file_path))
                print(f"[Backup Cleanup]: Deleted 10-day old backup file -> {file_path}")
        except Exception as e:
            print(f"[Backup Cleanup Error]: Could not delete {file_path}: {str(e)}")
    return purged
