# Tencent Cloud Lighthouse Deployment Guide

## Prerequisites

- Tencent Cloud Lighthouse (Ubuntu 22.04+, 2C2G minimum)
- Domain name (optional, can use IP directly)
- SSH access to the server

## Step 1: Initial Setup

```bash
# SSH into your Lighthouse server
ssh root@YOUR_SERVER_IP

# Run one-click setup
curl -sSL https://raw.githubusercontent.com/chauncywayne64/spot/main/scripts/setup-lighthouse.sh | bash
```

This installs Docker, Nginx, clones the project, and builds the frontend.

## Step 2: Configure Environment

```bash
cd /opt/customer-radar
vi .env
```

Fill in all required values from `.env.example`:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- `ZLBX_API_KEY`
- `MIMO_API_KEY`
- `WECOM_WEBHOOK_URL`
- `CORS_ORIGIN` = your domain (e.g., `https://radar.leadcom.chat`)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`

## Step 3: Start Backend

```bash
cd /opt/customer-radar
docker compose up -d

# Verify
curl http://localhost:3200/api/health
```

## Step 4: Configure Nginx

```bash
# Copy nginx config
cp scripts/nginx-site.conf /etc/nginx/sites-available/customer-radar

# Edit: replace YOUR_DOMAIN with your domain or IP
vi /etc/nginx/sites-available/customer-radar

# Enable site
ln -sf /etc/nginx/sites-available/customer-radar /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t && systemctl reload nginx
```

## Step 5: SSL (Optional but Recommended)

```bash
# If you have a domain:
certbot --nginx -d YOUR_DOMAIN
```

## Step 6: Verify

```bash
# Health check
curl https://YOUR_DOMAIN/api/health

# Open in browser
open https://YOUR_DOMAIN
```

## Maintenance

```bash
# View logs
docker logs -f customer-radar

# Restart
cd /opt/customer-radar && docker compose restart

# Update code
cd /opt/customer-radar && git pull && docker compose up -d --build

# Backup database
bash scripts/backup-db.sh
```

## Firewall

Make sure these ports are open in Tencent Cloud console:
- 80 (HTTP)
- 443 (HTTPS)
- 22 (SSH)
