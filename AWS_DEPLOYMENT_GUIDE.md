# AWS Deployment & HTTPS Guide for 3xBills

This guide explains how to deploy the 3xBills application (React Frontend + FastAPI Backend) to a single AWS EC2 instance (Ubuntu 24.04 LTS), serve it using Nginx, and secure it with free HTTPS via Let's Encrypt (Certbot).

## Step 1: AWS EC2 Provisioning & Security
1. Go to your AWS Console > EC2 > **Launch Instance**.
2. **OS Image**: Select **Ubuntu 24.04 LTS**.
3. **Instance Type**: `t3.micro` or `t3.small`.
4. **Key Pair**: Create one and download the `.pem` file to SSH in.
5. **Network Settings**: Edit the Security Group to allow:
   - **SSH** (Port 22) - from your IP only (or Anywhere for ease)
   - **HTTP** (Port 80) - from Anywhere (0.0.0.0/0)
   - **HTTPS** (Port 443) - from Anywhere (0.0.0.0/0)
6. Launch the instance.

## Step 2: Configure Domain Name DNS
In your domain registrar (Route53, GoDaddy, etc.):
- Create an **A Record** for your domain (e.g., `app.yourdomain.com`).
- Point the record to the **Public IPv4 Address** of your new EC2 instance.

## Step 3: Server Preparation
SSH into your server:
```bash
ssh -i /path/to/your-key.pem ubuntu@<your-ec2-ip>
```
Install the required system packages:
```bash
sudo apt update
sudo apt install nginx python3-pip python3-venv python3-certbot-nginx git nodejs npm -y
```

## Step 4: Clone & Setup the Application
Clone your repository into the `ubuntu` home folder:
```bash
cd ~
git clone <your-repo-url> 3xBills
cd 3xBills
```

### 4a. Backend Setup
```bash
cd ~/3xBills/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
Create a `.env` file for your backend in the `backend` folder based on your local settings.

### 4b. Frontend Setup
```bash
cd ~/3xBills/frontend
npm install
npm run build
```
*(This creates the static files in `~/3xBills/frontend/dist`)*

## Step 5: Configure Systemd for the Backend
You want the FastAPI backend to run automatically in the background and restart on failure.
Create a systemd service file:
```bash
sudo nano /etc/systemd/system/3xbills-backend.service
```
Paste this configuration:
```ini
[Unit]
Description=Gunicorn daemon for 3xBills FastAPI
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/3xBills/backend
Environment="PATH=/home/ubuntu/3xBills/backend/venv/bin"
# Starts uvicorn on port 8000
ExecStart=/home/ubuntu/3xBills/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl start 3xbills-backend
sudo systemctl enable 3xbills-backend
```

## Step 6: Configure Nginx
Nginx will serve your React static files directly and forward `/api` requests to the FastAPI backend.
```bash
sudo nano /etc/nginx/sites-available/3xbills
```
Paste this configuration (Replace `app.yourdomain.com` with your actual domain):
```nginx
server {
    listen 80;
    server_name app.yourdomain.com;

    # Serve the React Frontend Build
    location / {
        root /home/ubuntu/3xBills/frontend/dist;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API Requests to FastAPI Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable the site and restart Nginx:
```bash
# Remove the default nginx site to avoid conflicts
sudo rm /etc/nginx/sites-enabled/default 

# Link our new config
sudo ln -s /etc/nginx/sites-available/3xbills /etc/nginx/sites-enabled/

# Test syntax and restart
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: Enable HTTPS (SSL Certificate)
Finally, use Certbot to automatically generate a free SSL certificate from Let's Encrypt and apply it to Nginx.
```bash
sudo certbot --nginx -d app.yourdomain.com
```
Follow the prompts (enter email, accept terms). Certbot will automatically rewrite your Nginx configuration file to listen on Port 443 and attach the SSL certificates.

### Automatic Renewals
Certbot automatically installs a cron job to renew the certificates every 90 days. You can test the renewal process dry-run with:
```bash
sudo certbot renew --dry-run
```

## You're Live!
Navigate to `https://app.yourdomain.com` in your browser.
