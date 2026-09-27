# NextGen Retail & Supermarket SaaS Billing Platform

An enterprise-grade, local-first hybrid SaaS platform designed for retail shops, SMBs, and supermarkets. Built using **React (Vite)**, **FastAPI**, **PostgreSQL**, and **Docker Compose**, featuring hardware-bound RSA subscription licensing, automated PDF invoice generation with Google Rating & Payment QR codes, WhatsApp & Email billing, bulk customer marketing, and automated 10-day database backups.

---

## 🌟 Key Features

1. **High-Speed POS & Barcode Checkout**:
   - Hardware barcode gun listener support.
   - Dynamic tax breakdown (GST / VAT / Sales Tax) per item.
   - Payment method toggle (Cash, Payment QR, Card).

2. **PDF Invoicing with Smart QR Codes**:
   - Programmatically generated vector PDF invoices (ReportLab).
   - **Google Review QR Code**: Prompts customers to leave 5-star ratings on Google Maps.
   - **Payment UPI QR Code**: Encodes invoice grand total into instant mobile payment QR.

3. **Digital Dispatch & Marketing Automation**:
   - **WhatsApp Billing**: Generates pre-formatted `https://wa.me/...` click-to-send links and digital receipts.
   - **Email Receipts & Alerts**: Sends attached PDF invoices and low stock warnings via SMTP.
   - **Bulk Customer Campaigns**: Segment and broadcast promotional discounts/offers to customers.

4. **Hardware Fingerprinting & Subscription Licensing**:
   - Local-first architecture protecting client data without internet latency.
   - Cryptographically signed RSA hardware-bound license keys (MAC + CPU fingerprint).
   - Tier management (Starter, Professional, Enterprise) and subscription expiration enforcer.

5. **Automated Database Backups & 10-Day Retention**:
   - APScheduler daily 00:00 cron job executing `pg_dump`.
   - Automatically emails database dump file to Shop Admin Email.
   - Automatically purges local backups older than 10 days to conserve disk space.

6. **Executive Financial & Stock Dashboard**:
   - Real-time Gross Revenue, Net Profit, COGS, Tax summaries, and low-stock alerts.
   - Interactive Recharts timeline visualizations.

---

## 🚀 Quick Start with Docker Compose

Ensure Docker Desktop is running on your machine, then execute:

```bash
# Clone or navigate to the directory
cd "c:\Users\DanialG\Dev\bill software"

# Launch PostgreSQL, FastAPI, Nginx Frontend & Backup worker
docker-compose up -d --build
```

### Access Ports:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend & Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL Database**: `localhost:5432`

---

## 🛠 Local Development Setup (Without Docker)

### 1. Backend (FastAPI):
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (React + Vite):
```bash
cd frontend
npm install
npm run dev
```

---

## 📄 Documentation Artifacts
Detailed High-Level Design (HLD), Low-Level Design (LLD), Flowcharts, and Database ER Diagrams are available in:
- [architecture_and_design.md](file:///C:/Users/DanialG/.gemini/antigravity-ide/brain/5c05700b-ab49-40c8-87da-ae9ffa78eafb/architecture_and_design.md)
