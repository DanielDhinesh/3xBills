# AWS Docker Deployment & HTTPS Guide for 3xBills

This guide explains how to deploy the 3xBills application using your existing `docker-compose.yml` to a single AWS EC2 instance (Ubuntu 24.04 LTS) and secure it with free HTTPS via Let's Encrypt (Certbot).

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
In your domain registrar (Route53, GoDaddy, Namecheap, etc.):
- Create an **A Record** for your domain (e.g., `danieldhinesh.online`).
- Point the record to the **Public IPv4 Address** of your new EC2 instance.

## Step 3: Server Preparation & Docker Installation
SSH into your server:
```bash
ssh -i /path/to/your-key.pem ubuntu@<your-ec2-ip>
```
Install Docker, Docker Compose, Nginx, and Certbot:
```bash
sudo apt update
sudo apt install docker.io docker-compose nginx python3-certbot-nginx git -y

# Add your ubuntu user to the docker group so you don't need sudo for docker commands
sudo usermod -aG docker ubuntu
# Log out and log back in (or run `newgrp docker`) for the group change to take effect
newgrp docker
```

## Step 4: Clone & Start the Application
Clone your repository into the `ubuntu` home folder:
```bash
cd ~
git clone <your-repo-url> 3xBills
cd 3xBills
```
Create a `.env` file in the root based on your `.env.example` to set production passwords.
Start the application using Docker Compose:
```bash
docker-compose up -d --build
```
*(Docker will pull images, build your frontend/backend, and start the containers. Your app is now running on port 3000 locally on the server).*

## Step 5: Configure Nginx as a Reverse Proxy
Nginx on the EC2 host will act as a doorway, taking traffic from the internet and handing it to your Docker container.

We have included a pre-written configuration file in the repository (`nginx-aws.conf`). Copy it to the Nginx directory:
```bash
sudo cp ~/3xBills/nginx-aws.conf /etc/nginx/sites-available/3xbills
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

## Step 6: Enable HTTPS (SSL Certificate)
Use Certbot to automatically generate a free SSL certificate from Let's Encrypt and apply it to Nginx.
```bash
sudo certbot --nginx -d danieldhinesh.online
```
Follow the prompts (enter email, accept terms). Certbot will automatically rewrite your Nginx configuration file to listen on Port 443 and attach the SSL certificates.

### Automatic Renewals
Certbot automatically installs a cron job to renew the certificates every 90 days. You can test the renewal process dry-run with:
```bash
sudo certbot renew --dry-run
```

## You're Live!
Navigate to `https://danieldhinesh.online` in your browser.
