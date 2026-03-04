---
author: Qisthi Ramadhani
pubDatetime: 2025-07-19T00:00:00.000Z
title: "Laravel Octane Infrastructure Setup: From Zero to Production on DigitalOcean"
featured: false
draft: false
tags:
  - laravel
  - octane
  - digitalocean
  - ubuntu
  - server
  - infrastructure
  - production
  - devops-and-infrastructure
  - series-laravel-octane-mastery
description: "Complete guide to setting up a production-ready Laravel Octane server on DigitalOcean. Learn how to configure Ubuntu 24.04, install dependencies, secure your server, and prepare for high-performance Laravel deployment."
---

Setting up the perfect infrastructure for Laravel Octane can make or break your application's performance. In this guide, we'll transform a fresh DigitalOcean droplet into a production-ready Laravel Octane server that can handle serious traffic.

**What You'll Build:** By the end of this guide, you'll have a fully configured Ubuntu 24.04 server with PHP 8.3, Swoole, Nginx, Redis, and all the tools needed for high-performance Laravel Octane deployment.

**Server Specs:** This guide is optimized for a **2GB Memory / 2 Intel vCPUs / 90GB Disk** DigitalOcean droplet, but the instructions work for any similar VPS provider.

> **💡 Alternative Setup:** For lightweight setups, check out our [Deploy Laravel Octane on Alpine Linux Guide](/blog/deploy-laravel-octane-alpine-linux). For a complete deployment walkthrough, see our [Laravel Octane Production Deployment article](/blog/hp-octane-swoole-05-production-deployment-best-practices).

> **📋 Related Articles:** This infrastructure setup pairs perfectly with our [Laravel Octane Mastery](/tags/series-laravel-octane-mastery) series and [Alpine Linux Migration](/blog/docker-alpine-migration) experience.

## 1. Initial Server Setup and Security

### Creating Your DigitalOcean Droplet

Start by creating a new droplet in the DigitalOcean control panel:

- **Image:** Ubuntu 24.04 (LTS) x64
- **Plan:** Basic - 2GB RAM / 2 vCPUs / 90GB SSD
- **Region:** Choose closest to your users (SGP1 for Singapore)
- **Authentication:** SSH Key (recommended) or Password
- **Hostname:** Something descriptive like `laravel-octane-prod`

### First Connection and Updates

Once your droplet is ready, connect via SSH and update the system:

```bash
# Connect to your server (replace with your droplet's IP)
ssh root@your_server_ip

# Update package list and upgrade system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

### Creating a Non-Root User

**Never run your application as root!** Let's create a dedicated user:

```bash
# Create a new user (replace 'deploy' with your preferred username)
adduser deploy

# Add user to sudo group
usermod -aG sudo deploy

# Switch to the new user
su - deploy

# Create SSH directory and set permissions
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# If you used SSH key for root, copy it to the new user
sudo cp /root/.ssh/authorized_keys ~/.ssh/
sudo chown deploy:deploy ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Securing SSH Access

Edit the SSH configuration to improve security:

```bash
sudo nano /etc/ssh/sshd_config
```

Make these changes:

```bash
# Disable root login
PermitRootLogin no

# Use SSH key authentication only (recommended)
PasswordAuthentication no
PubkeyAuthentication yes

# Change default SSH port (optional but recommended)
Port 2222

# Limit login attempts
MaxAuthTries 3
MaxStartups 3
```

Restart SSH service:

```bash
sudo systemctl restart ssh
```

**Important:** Test your new SSH connection in a new terminal before closing the current one!

```bash
# Test with new port and user (from your local machine)
ssh -p 2222 deploy@your_server_ip
```

### Setting Up UFW Firewall

Configure the Uncomplicated Firewall to protect your server:

```bash
# Reset firewall rules
sudo ufw --force reset

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH on your custom port
sudo ufw allow 2222/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## 2. Installing PHP 8.3 and Essential Extensions

### Adding PHP Repository

Ubuntu 24.04 comes with PHP 8.3, but we'll add the Ondrej PPA for better package management:

```bash
# Add Ondrej PPA for PHP
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
```

### Installing PHP 8.3 and Extensions

Install PHP with all the extensions Laravel Octane needs:

```bash
# Install PHP 8.3 and essential extensions
sudo apt install -y \
    php8.3-fpm \
    php8.3-cli \
    php8.3-sqlite3 \
    php8.3-redis \
    php8.3-memcached \
    php8.3-gd \
    php8.3-imagick \
    php8.3-curl \
    php8.3-zip \
    php8.3-xml \
    php8.3-mbstring \
    php8.3-intl \
    php8.3-bcmath \
    php8.3-soap \
    php8.3-readline \
    php8.3-common \
    php8.3-opcache \
    php8.3-swoole
```

### Verifying PHP Installation

Check that everything is installed correctly:

```bash
# Check PHP version
php -v

# Verify Swoole is installed
php -m | grep swoole

# Check all installed extensions
php -m
```

You should see output confirming PHP 8.3 and the Swoole extension.

## 3. Installing and Configuring Redis

Redis will serve as our cache and session store:

```bash
# Install Redis server
sudo apt install -y redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf
```

Make these important changes:

```bash
# Bind to localhost only for security
bind 127.0.0.1

# Set password (uncomment and set strong password)
requirepass your_redis_password_here

# Memory optimization for 2GB server
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence settings
save 900 1
save 300 10
save 60 10000
```

Restart Redis:

```bash
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test Redis connection
redis-cli ping
```

## 4. Installing and Configuring Nginx

### Installing Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Creating Directory Structure

Set up the directory structure for your Laravel application:

```bash
# Create web directory
sudo mkdir -p /var/www/hp-laravel-swoole

# Set ownership to your user
sudo chown -R deploy:www-data /var/www/hp-laravel-swoole

# Set proper permissions
sudo chmod -R 755 /var/www/hp-laravel-swoole
```

### Basic Nginx Configuration

Create a basic Nginx configuration that we'll enhance when deploying Laravel:

```bash
sudo nano /etc/nginx/sites-available/hp-laravel-swoole
```

You can find config at [Production Deployment & Best Practices for High-Performance Laravel](/blog/hp-octane-swoole-05-production-deployment-best-practices).

Enable the site:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/hp-laravel-swoole /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 5. Installing Supervisor

Supervisor will manage your Octane processes:

```bash
# Install Supervisor
sudo apt install -y supervisor

# Start and enable Supervisor
sudo systemctl start supervisor
sudo systemctl enable supervisor
```

## 6. Installing Composer

Install Composer for PHP dependency management:

```bash
# Download and install Composer
cd ~
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Make it executable
sudo chmod +x /usr/local/bin/composer

# Verify installation
composer --version
```

## 7. Installing Node.js and npm

For building frontend assets:

```bash
# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

## 8. SSL Certificate Setup with Certbot

Secure your site with Let's Encrypt SSL certificates:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate (replace with your domain)
sudo certbot --nginx -d malescast.tech -d www.malescast.tech

# Test automatic renewal
sudo certbot renew --dry-run
```

## 9. Final Security Hardening

### Installing Fail2Ban

Protect against brute force attacks:

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Create custom configuration
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
```

Start Fail2Ban:

```bash
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### Setting Up Automatic Updates

Configure automatic security updates:

```bash
# Install unattended upgrades
sudo apt install -y unattended-upgrades

# Configure automatic updates
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Uncomment and configure:

```bash
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
```

Enable automatic updates:

```bash
echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades
```

## 11. Monitoring and Maintenance Setup

### Creating a System Status Script

Create a handy script to check system status:

```bash
nano ~/system-status.sh
```

```bash
#!/bin/bash
echo "=== SYSTEM STATUS ==="
echo "Date: $(date)"
echo ""

echo "=== MEMORY USAGE ==="
free -h
echo ""

echo "=== DISK USAGE ==="
df -h /
echo ""

echo "=== SERVICES STATUS ==="
sudo systemctl is-active nginx redis-server supervisor php8.3-fpm
echo ""

echo "=== NGINX STATUS ==="
sudo nginx -t
echo ""

echo "=== PHP VERSION ==="
php -v | head -1
echo ""

echo "=== SWOOLE STATUS ==="
php -m | grep swoole
echo ""

echo "=== LARAVEL LOGS (last 10 lines) ==="
if [ -f "/var/www/hp-laravel-swoole/storage/logs/laravel.log" ]; then
    tail -10 /var/www/hp-laravel-swoole/storage/logs/laravel.log
else
    echo "Laravel not yet deployed"
fi
```

Make it executable:

```bash
chmod +x ~/system-status.sh
```

### Setting Up Log Rotation

Configure log rotation to prevent disk space issues:

```bash
sudo nano /etc/logrotate.d/laravel
```

```bash
/var/www/hp-laravel-swoole/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    sharedscripts
}
```

## 12. Verification Checklist

Before deploying your Laravel application, verify everything is working:

```bash
# Run your system status script
~/system-status.sh

# Check all required services are running
sudo systemctl status nginx redis-server supervisor php8.3-fpm

# Verify PHP configuration
php -i | grep -E "(memory_limit|max_execution_time|swoole)"

# Test Redis connection
redis-cli -a your_redis_password_here ping

# Check disk space
df -h

# Check memory usage
free -h

# Verify firewall status
sudo ufw status

# Check for any system errors
sudo journalctl -p 3 -xb
```

## What's Next?

🎉 **Congratulations!** Your server is now ready for Laravel Octane deployment. You have:

- ✅ Secure Ubuntu 24.04 server with proper firewall configuration
- ✅ PHP 8.3 with Swoole extension for maximum performance
- ✅ Redis configured for caching and sessions
- ✅ Nginx ready for high-performance reverse proxy setup
- ✅ Supervisor installed for process management
- ✅ SSL certificate capability with Certbot
- ✅ Security hardening with Fail2Ban and automatic updates

**Next Steps:**
1. Deploy your Laravel application to `/var/www/hp-laravel-swoole`
2. Configure Supervisor for your Octane processes
3. Set up the production Nginx configuration for Octane proxying
4. Run Laravel optimization commands
5. Monitor performance and scale as needed

Your infrastructure is now production-ready and capable of handling serious traffic with Laravel Octane's performance advantages!

## Server Maintenance Tips

### Weekly Maintenance Tasks

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Check disk usage
df -h

# Check memory usage
free -h

# Review security logs
sudo journalctl -u fail2ban -n 50

# Check service status
~/system-status.sh
```

### Monthly Tasks

- Review and rotate logs manually if needed
- Check SSL certificate expiration: `sudo certbot certificates`
- Monitor database performance and optimization
- Review server metrics and consider scaling if needed
- Update Laravel application dependencies

This infrastructure foundation will serve your Laravel Octane application reliably and securely. The configuration is optimized for your 2GB DigitalOcean droplet while providing room for growth as your application scales.
