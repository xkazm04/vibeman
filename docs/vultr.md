Vultr deployment guide for production n8n server 
## Prerequisites
- Vultr account (we'll set this up first)
- Basic command line knowledge
- SSH client (built into Windows 10+, macOS, and Linux)

## Step 1: Set Up Your Vultr Account and Server

1. **Create Vultr Account**
   - Go to vultr.com and sign up
   - Verify your email and add payment method

2. **Deploy a New Server**
   - Click "Deploy New Server"
   - Choose "Cloud Compute - Shared CPU"
   - Select server location (choose closest to you)
   - Choose Ubuntu 22.04 LTS (recommended)
   - Select server size: **$6/month (1 CPU, 1GB RAM)** minimum, but **$12/month (1 CPU, 2GB RAM)** is better for n8n
   - Add SSH key (recommended) or use password
   - Give your server a hostname like "n8n-server"
   - Click "Deploy Now"

3. **Wait for Server Setup**
   - Server will take 2-3 minutes to deploy
   - Note down the IP address once it's ready

## Step 2: Connect to Your Server

1. **SSH into your server**
   ```bash
   ssh root@YOUR_SERVER_IP
   ```
   (Replace YOUR_SERVER_IP with the actual IP from Vultr)

2. **Update the system**
   ```bash
   apt update && apt upgrade -y
   ```

## Step 3: Install Prerequisites

1. **Install Node.js (using NodeSource repository)**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   apt install -y nodejs
   ```

2. **Verify installation**
   ```bash
   node --version
   npm --version
   ```

3. **Install PM2 (process manager)**
   ```bash
   npm install -g pm2
   ```

## Step 4: Install n8n

1. **Install n8n globally**
   ```bash
   npm install -g n8n
   ```

2. **Create n8n user (security best practice)**
   ```bash
   adduser n8n
   usermod -aG sudo n8n
   ```

3. **Switch to n8n user**
   ```bash
   su - n8n
   ```

## Step 5: Configure n8n

1. **Set environment variables**
   ```bash
   export N8N_HOST=0.0.0.0
   export N8N_PORT=5678
   export N8N_PROTOCOL=http
   export WEBHOOK_URL=http://YOUR_SERVER_IP:5678/
   ```

2. **Create a startup script**
   ```bash
   nano ~/start-n8n.sh
   ```

   Add this content:
   ```bash
   #!/bin/bash
   export N8N_HOST=0.0.0.0
   export N8N_PORT=5678
   export N8N_PROTOCOL=http
   export WEBHOOK_URL=http://YOUR_SERVER_IP:5678/
   n8n start
   ```

3. **Make it executable**
   ```bash
   chmod +x ~/start-n8n.sh
   ```

## Step 6: Start n8n with PM2

1. **Start n8n using PM2**
   ```bash
   pm2 start ~/start-n8n.sh --name n8n
   ```

2. **Save PM2 configuration**
   ```bash
   pm2 save
   pm2 startup
   ```
   (Follow the command it gives you to run with sudo)

3. **Check n8n status**
   ```bash
   pm2 status
   ```

## Step 7: Configure Firewall

1. **Switch back to root**
   ```bash
   exit
   ```

2. **Configure UFW firewall**
   ```bash
   ufw allow ssh
   ufw allow 5678
   ufw enable
   ```

## Step 8: Access n8n

1. **Open your browser and go to**
   ```
   http://YOUR_SERVER_IP:5678
   ```

2. **Set up your n8n account**
   - Create your first admin user
   - Set up your workflows!

## Optional: Set Up SSL with Domain (Recommended for Production)

If you have a domain name:

1. **Install Nginx**
   ```bash
   apt install nginx certbot python3-certbot-nginx -y
   ```

2. **Configure Nginx reverse proxy**
   ```bash
   nano /etc/nginx/sites-available/n8n
   ```

3. **Add SSL certificate**
   ```bash
   certbot --nginx -d your-domain.com
   ```

## Troubleshooting

- **If n8n won't start**: Check logs with `pm2 logs n8n`
- **If you can't connect**: Verify firewall rules and server IP
- **If performance is slow**: Consider upgrading to 2GB RAM server

## Important Security Notes

- Change default ports in production
- Set up SSL certificates
- Configure proper authentication
- Regular backups of your workflows