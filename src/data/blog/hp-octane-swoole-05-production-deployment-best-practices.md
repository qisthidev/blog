---
author: Qisthi Ramadhani
pubDatetime: 2025-07-18T00:00:00.000Z
title: "Laravel Octane 05: Production Deployment & Best Practices for High-Performance Laravel"
featured: false
draft: false
tags:
  - laravel
  - octane
  - swoole
  - production
  - deployment
  - nginx
  - supervisor
  - laravel-and-php
  - series-laravel-octane-mastery
description: "Master the final steps of deploying your high-performance Laravel Octane application with Nginx, Supervisor, and essential optimizations. Learn how to set up a production-like environment locally, manage Octane processes, and apply best practices for a robust deployment."
---

Welcome to the final article in our **Laravel Octane with Swoole** series! Over the past four articles, we've built a solid foundation:

> **📚 Series Navigation:** This is Part 5 (Final) of the [Laravel Octane Mastery](/tags/series-laravel-octane-mastery) series.

- [Part 1](/blog/hp-octane-swole-01-laravel-octane-swoole-introduction): Understanding Laravel Octane and the stateful paradigm
- [Part 2](/blog/hp-octane-swole-02-laravel-octane-swoole-setup): Setting up our development environment with Sail
- [Part 3](/blog/hp-octane-swole-03-concurrency-asynchronous-workflows): Mastering concurrency and asynchronous workflows
- [Part 4](/blog/hp-octane-swoole-04-advanced-caching-data-management-monitoring-performance): Advanced caching and performance monitoring

Now, it's time to take the final step: deploying our high-performance application to a production environment that can handle real-world traffic.

Moving to production involves more than just copying files to a server. We need a robust architecture that is reliable, secure, and configured for optimal performance. This article will guide you through:

- Setting up a production-ready architecture with Nginx and Octane
- Managing your Octane processes with Supervisor
- Essential Laravel optimization commands
- Real-world deployment examples
- A recap of the most important best practices

**Important:** This article assumes you have a basic understanding of Linux servers. If you're completely new to server management, consider starting with a managed hosting provider like Laravel Forge, which can handle much of this setup automatically.

## 1. Setting Up Local Production-Like Environment

Before deploying to production, let's first set up a local environment that mirrors our production architecture. This approach helps us catch configuration issues early and ensures our deployment will work smoothly.

### Adding Nginx to Docker Compose

First, let's enhance our local `docker-compose.yml` to include Nginx. This gives us a complete production-like setup for development and testing.

Create or update your `docker-compose.yml` file:

```yaml
# docker-compose.yml
services:
  # Nginx - The front-facing web server
  nginx:
    image: nginx:alpine
    container_name: "${APP_NAME:-laravel}_nginx"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./:/var/www/html
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/sites:/etc/nginx/sites-available
      - ./docker/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - laravel.test
    networks:
      - sail

  # Laravel Octane Application
  laravel.test:
    build:
      context: ./vendor/laravel/sail/runtimes/8.3
      dockerfile: Dockerfile
      args:
        WWWGROUP: "${WWWGROUP}"
    image: sail-8.3/app
    container_name: "${APP_NAME:-laravel}_app"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "${VITE_PORT:-5173}:${VITE_PORT:-5173}"
    environment:
      WWWUSER: "${WWWUSER}"
      LARAVEL_SAIL: 1
      XDEBUG_MODE: "${SAIL_XDEBUG_MODE:-off}"
      XDEBUG_CONFIG: "${SAIL_XDEBUG_CONFIG:-client_host=host.docker.internal}"
      IGNITION_LOCAL_SITES_PATH: "${PWD}"
      SUPERVISOR_PHP_COMMAND: "/usr/bin/php -d variables_order=EGPCS /var/www/html/artisan octane:start --server=swoole --host=0.0.0.0 --port=8000 --watch"
    volumes:
      - ".:/var/www/html"
    networks:
      - sail
    depends_on:
      - mysql
      - redis

  # Database
  mysql:
    image: "mysql/mysql-server:8.0"
    container_name: "${APP_NAME:-laravel}_mysql"
    ports:
      - "${FORWARD_DB_PORT:-3306}:3306"
    environment:
      MYSQL_ROOT_PASSWORD: "${DB_PASSWORD}"
      MYSQL_ROOT_HOST: "%"
      MYSQL_DATABASE: "${DB_DATABASE}"
      MYSQL_USER: "${DB_USERNAME}"
      MYSQL_PASSWORD: "${DB_PASSWORD}"
      MYSQL_ALLOW_EMPTY_PASSWORD: 1
    volumes:
      - "sail-mysql:/var/lib/mysql"
      - "./vendor/laravel/sail/database/mysql/create-testing-database.sh:/docker-entrypoint-initdb.d/10-create-testing-database.sh"
    networks:
      - sail

  # Redis Cache
  redis:
    image: "redis:alpine"
    container_name: "${APP_NAME:-laravel}_redis"
    ports:
      - "${FORWARD_REDIS_PORT:-6379}:6379"
    volumes:
      - "sail-redis:/data"
    networks:
      - sail

networks:
  sail:
    driver: bridge

volumes:
  sail-mysql:
    driver: local
  sail-redis:
    driver: local
```

### Creating Nginx Configuration Files

Now let's create the Nginx configuration structure. Create the following directory structure:

```bash
# Create directories for Nginx configuration
mkdir -p docker/nginx/sites
mkdir -p docker/nginx/ssl
```

Create the main Nginx configuration file at `docker/nginx/nginx.conf`:

```nginx
# docker/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Include site configurations
    include /etc/nginx/sites-available/*;
}
```

Create the Laravel application configuration at `docker/nginx/sites/laravel.conf`:

```nginx
# docker/nginx/sites/laravel.conf
server {
    listen 80;
    listen [::]:80;

    # Use localhost for local development
    server_name localhost *.localhost;
    root /var/www/html/public;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    index index.php index.html;
    charset utf-8;

    # Handle static files directly (SUPER FAST - bypasses PHP entirely)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf|zip)$ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public, no-transform";
        try_files $uri =404;
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
    }

    location ~ ^/(storage|vendor)/ {
        deny all;
    }

    # Main location block - handles all dynamic requests
    location / {
        try_files $uri $uri/ @octane;
    }

    # Proxy to Laravel Octane
    location @octane {
        # Point to our Laravel container
        proxy_pass http://laravel.test:8000;

        # Forward essential headers
        proxy_set_header Host $http_host;
        proxy_set_header Scheme $scheme;
        proxy_set_header SERVER_PORT $server_port;
        proxy_set_header REMOTE_ADDR $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Prevent timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Testing the Local Setup

Now you can start your complete development environment:

```bash
# Start all services including Nginx
./vendor/bin/sail up -d

# Check that everything is running
./vendor/bin/sail ps

# Test the setup
curl -I http://localhost
```

You should see the `Server: nginx` header in the response, confirming that Nginx is properly proxying requests to your Octane application.

### Benefits of This Local Setup

This approach gives you several advantages:

- **Production Parity**: Your local environment now matches production architecture
- **Early Issue Detection**: Nginx configuration problems are caught during development
- **Performance Testing**: You can test static file serving and proxy performance locally
- **SSL Testing**: Easy to add local SSL certificates for HTTPS testing
- **Team Consistency**: All developers have the same Nginx setup

## 2. Understanding Production Architecture: From Local to Production

Now that we have a production-like environment running locally, let's understand how to adapt this for actual production deployment.

In production, instead of Docker containers, we typically run each service directly on the server or use orchestration tools like Docker Swarm or Kubernetes for larger deployments.

### Architecture Overview: Local vs Production

The core architecture remains the same, but the implementation differs:

**Local Development (Docker Compose):**

- Nginx container → Laravel Octane container
- All services containerized and isolated
- Easy to reset and rebuild

**Production (Direct Installation):**

- Nginx process → Laravel Octane process
- Services installed directly on the server
- More performant, but requires more setup

### Why Not Just Run Octane Directly?

You might wonder: **_If Octane is so fast, why not just expose it directly to the internet?_** Here's why we need this two-tier setup:

- **Security:** Nginx is battle-tested for handling malicious traffic, rate limiting, and DDoS protection
- **SSL/HTTPS:** Nginx excels at handling SSL certificates and encryption
- **Static Files:** Nginx serves images, CSS, and JavaScript files much faster than PHP
- **Load Balancing:** When you scale up, Nginx can distribute requests across multiple Octane instances

Here's how it works:

- **Nginx (The Front Door):** Nginx faces the public internet and handles incoming traffic. It terminates SSL (HTTPS) and serves **static assets** (CSS, JavaScript, images, etc.) directly from the filesystem—this is incredibly fast and doesn't require PHP at all.
- **Octane (The Engine Room):** The Octane server runs as a separate process, listening on an internal port (like 8000). It receives only the dynamic requests that Nginx forwards to it. This allows Octane to focus exclusively on what it does best: executing your Laravel application logic at supersonic speeds.

> For detail infrastructure setup, you can refer to the [Laravel Octane Infrastructure Setup: From Zero to Production on DigitalOcean](/blog/laravel-octane-infrastructure-setup-digitalocean).

### Production Nginx Configuration

For production, we adapt our local Nginx configuration. The main differences are domain names, SSL certificates, and security hardening.

Here's a production-ready Nginx configuration. Save this as `/etc/nginx/sites-available/hp-laravel.com` on your production server:

```conf
# /etc/nginx/sites-available/hp-laravel.com

server {
    listen 80;
    listen [::]:80;
    server_name hp-laravel.com www.hp-laravel.com;
    root /var/www/hp-laravel/public; # Point to Laravel's public directory

    # Security headers - protect against common attacks
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    index index.php index.html;
    charset utf-8;

    # Handle static files directly (SUPER FAST - bypasses PHP entirely)
    # This is one of the biggest performance wins!
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf|zip)$ {
        expires 1y;                    # Cache for 1 year
        access_log off;               # Don't log static file requests
        add_header Cache-Control "public, no-transform";

        # Handle missing files gracefully
        try_files $uri =404;
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
    }

    location ~ ^/(storage|vendor)/ {
        deny all;
    }

    # Main location block - handles all dynamic requests
    location / {
        # Try to serve the file directly, then directory, then pass to Octane
        try_files $uri $uri/ @octane;
    }

    # Named location for proxying requests to the Octane server
    location @octane {
        proxy_pass http://127.0.0.1:8000; # Forward to Octane on port 8000

        # Forward essential headers so Laravel knows about the original request
        proxy_set_header Host $http_host;
        proxy_set_header Scheme $scheme;
        proxy_set_header SERVER_PORT $server_port;
        proxy_set_header REMOTE_ADDR $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Prevent timeouts on slow requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Key Differences from Local Setup

Notice the differences between our local Docker configuration and production:

1. **Domain Names**: Production uses actual domain names instead of `localhost`
2. **Proxy Target**: Production uses `127.0.0.1:8000` instead of container name `laravel.test:8000`
3. **File Paths**: Production uses actual server paths like `/var/www/hp-laravel/public`
4. **SSL**: Production will need additional SSL configuration (we'll add this with Let's Encrypt)

### Installing and Configuring Production Nginx

On your production server, install Nginx and configure it:

```bash
# Install Nginx on Ubuntu/Debian
sudo apt update
sudo apt install nginx

# Create the configuration file
sudo nano /etc/nginx/sites-available/hp-laravel.com

# Enable the site
sudo ln -s /etc/nginx/sites-available/hp-laravel.com /etc/nginx/sites-enabled/

# Test the configuration for syntax errors
sudo nginx -t

# If the test passes, reload Nginx
sudo systemctl reload nginx
```

## 3. Managing Octane with Supervisor: Keeping Your App Running 24/7

In local development, we can run `php artisan octane:start` directly in our terminal and watch it work. In production, however, we need this command to run continuously and restart automatically if something goes wrong.

Think of **Supervisor** as a babysitter for your Octane process—it makes sure your application never goes offline.

### Why Can't We Just Run Octane in the Background?

You might think: "Can't I just run `php artisan octane:start &` and be done?" Here's why that won't work:

- If the process crashes, no one restarts it
- If the server reboots, nothing starts your app
- You have no logs or monitoring
- No graceful way to restart during deployments

Supervisor solves all these problems.

### Setting Up Supervisor

First, install Supervisor on your server:

```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install supervisor

# Start and enable the service
sudo systemctl start supervisor
sudo systemctl enable supervisor
```

Next, create a configuration file for your Laravel Octane process at `/etc/supervisor/conf.d/laravel-octane.conf`:

```ini
[program:laravel-octane]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/hp-laravel/artisan octane:start --server=swoole --workers=auto --max-requests=5000 --port=8000 --host=127.0.0.1
directory=/var/www/hp-laravel
autostart=true
autorestart=true
startretries=3
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/hp-laravel/storage/logs/octane.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=5
environment=LARAVEL_OCTANE=1
```

### Understanding Each Configuration Option

Let's break down what each line does:

- **`process_name`**: How Supervisor identifies this process internally
- **`command`**: The actual command to run (we'll explain the flags below)
- **`directory`**: Where to run the command from (your project root)
- **`autostart=true`**: Start this process when Supervisor starts
- **`autorestart=true`**: Restart if the process crashes
- **`startretries=3`**: Try restarting up to 3 times before giving up
- **`user=www-data`**: Run as the web server user (important for file permissions)
- **`numprocs=1`**: Run one instance of this process
- **`redirect_stderr=true`**: Capture error messages in the log file
- **`stdout_logfile`**: Where to save the output logs
- **`stdout_logfile_maxbytes`**: Rotate logs when they get too big
- **`stdout_logfile_backups`**: Keep 5 old log files

### Critical Command-Line Flags Explained

- **`--server=swoole`**: Use the Swoole server (as opposed to RoadRunner or FrankenPHP)
- **`--workers=auto`**: Start one worker per CPU core. On a 4-core server, this creates 4 workers. You can also set a specific number like `--workers=8`
- **`--max-requests=5000`**: 🚨 **This is your most important safety net!** Each worker will restart after handling 5000 requests. This prevents memory leaks from accumulating and keeps your app stable long-term
- **`--port=8000`**: The internal port Octane listens on (matches our Nginx config)
- **`--host=127.0.0.1`**: Only accept connections from localhost (security measure)

### Starting Supervisor and Your Octane Process

Once you've created the configuration file, tell Supervisor to load it and start your process:

```bash
# Reload Supervisor configuration
sudo supervisorctl reread

# Apply changes
sudo supervisorctl update

# Start the Laravel Octane process
sudo supervisorctl start laravel-octane:*

# Check that it's running
sudo supervisorctl status
```

You should see output like:

```
laravel-octane:laravel-octane_00   RUNNING   pid 12345, uptime 0:00:05
```

### Deployment: Restarting Workers for Code Changes

Remember: Since Octane keeps your application in memory, deploying new code won't automatically appear until you restart the workers. Here's how to do it safely:

```bash
# Method 1: Graceful reload (recommended)
cd /var/www/hp-laravel
php artisan octane:reload

# Method 2: Restart via Supervisor (if reload doesn't work)
sudo supervisorctl restart laravel-octane:*
```

The `octane:reload` command is preferable because it gracefully finishes processing current requests before restarting workers.

### Monitoring Your Octane Process

You can monitor your Octane process using these helpful commands:

```bash
# Check status
sudo supervisorctl status laravel-octane:*

# View recent logs
sudo supervisorctl tail laravel-octane

# Follow logs in real-time
sudo supervisorctl tail -f laravel-octane

# Restart if needed
sudo supervisorctl restart laravel-octane:*
```

## 4. Laravel Production Optimization: The Pre-Flight Checklist

Before deploying, there are several standard Laravel optimization commands you should run. Think of this as your **pre-flight checklist**—missing even one step can significantly impact performance.

### Why These Optimizations Matter

Each of these optimizations serves a specific purpose:

- **Configuration caching** eliminates the need to read and parse dozens of config files on every request
- **Route caching** speeds up route matching for applications with many routes
- **View caching** pre-compiles Blade templates, removing parsing overhead
- **Autoloader optimization** creates class maps for faster class loading

### Step-by-Step Optimization Commands

Run these commands in order on your production server. I recommend creating a deployment script that includes all of these:

```bash
#!/bin/bash
# deployment-script.sh

# Navigate to your project directory
cd /var/www/hp-laravel

# 1. Set proper environment
echo "Setting production environment..."
# Ensure your .env file has:
# APP_ENV=production
# APP_DEBUG=false

# 2. Install production dependencies
echo "Installing optimized dependencies..."
composer install --optimize-autoloader --no-dev --no-interaction

# 3. Clear and cache configuration
echo "Optimizing configuration..."
php artisan config:clear
php artisan config:cache

# 4. Clear and cache routes (only if you have many routes)
echo "Optimizing routes..."
php artisan route:clear
php artisan route:cache

# 5. Clear and cache views
echo "Optimizing views..."
php artisan view:clear
php artisan view:cache

# 6. Clear application cache (if using cache)
php artisan cache:clear

# 7. Build frontend assets
echo "Building frontend assets..."
npm ci --production
npm run build

# 8. Set proper permissions
echo "Setting file permissions..."
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 755 storage bootstrap/cache

# 9. Restart Octane workers
echo "Restarting Octane workers..."
php artisan octane:reload

echo "Deployment complete!"
```

### Understanding Each Optimization

1. **[✓] Production Environment Settings:**

   ```bash
   # In your .env file:
   APP_ENV=production
   APP_DEBUG=false          # Disables detailed error pages
   APP_URL=https://hp-laravel.com
   ```

2. **[✓] Optimized Dependencies:**

   ```bash
   composer install --optimize-autoloader --no-dev
   ```

   - `--optimize-autoloader`: Creates a class map for faster class loading
   - `--no-dev`: Skips development packages (PHPUnit, debuggers, etc.)

3. **[✓] Configuration Caching:**

   ```bash
   php artisan config:cache
   ```

   Combines all config files into a single cached file. **Warning:** Don't use `env()` function outside of config files after this!

4. **[✓] Route Caching:**

   ```bash
   php artisan route:cache
   ```

   Pre-registers all routes for faster lookup. **Note:** Only use this if you have many routes, as it can slow down simple applications.

5. **[✓] View Caching:**

   ```bash
   php artisan view:cache
   ```

   Pre-compiles all Blade templates, eliminating template parsing time.

{/* 6. **[✓] Frontend Asset Compilation:**
   ```bash
   npm run build
   ```
   Creates minified, production-ready CSS and JavaScript files. */}

## 5. The Three Golden Rules of Octane Development (Essential Recap)

As we wrap up this series, let's revisit the three most critical rules for Octane development. These aren't just guidelines—they're essential principles that will determine whether your production deployment succeeds or fails.

### Rule #1: Master the Stateful Mindset

**The Problem:** Traditional PHP resets everything between requests. Octane keeps your application alive in memory, which means variables and objects can persist between requests.

**What This Means for You:**

```php
// ❌ DANGER: This static array will grow forever!
class BadService
{
    public static $data = [];

    public function addItem($item)
    {
        self::$data[] = $item; // Memory leak! Never cleared between requests
    }
}

// ✅ GOOD: Use instance properties and inject fresh instances
class GoodService
{
    private $data = [];

    public function addItem($item)
    {
        $this->data[] = $item; // Safe: new instance per request
    }
}
```

**Your Safety Net:** Always use the `--max-requests=5000` flag in production. This periodically restarts workers, clearing any accumulated state.

### Rule #2: Inject Dependencies Correctly

**The Problem:** Singleton services live for the entire worker lifetime. If you inject request-specific data into their constructor, they'll be "poisoned" with data from the first request.

**What This Means for You:**

```php
// ❌ DANGER: This service will forever use the first user's data!
class BadUserService
{
    private $user;

    public function __construct(Request $request)
    {
        $this->user = $request->user(); // Poisoned with first user!
    }
}

// ✅ GOOD: Pass request data to methods, not constructors
class GoodUserService
{
    public function processUser(User $user)
    {
        // Fresh user data for each method call
        return $this->doSomething($user);
    }
}
```

### Rule #3: Offload Heavy Work to Queues

**The Problem:** A blocked worker can't serve other requests. If you're doing heavy processing in a web request, you're wasting Octane's concurrency advantages.

**What This Means for You:**

```php
// ❌ SLOW: This blocks the worker for 30 seconds!
public function sendWelcomeEmail(User $user)
{
    Mail::to($user)->send(new WelcomeEmail()); // Synchronous - blocks worker

    return response()->json(['message' => 'Email sent!']);
}

// ✅ FAST: Queue it and return immediately
public function sendWelcomeEmail(User $user)
{
    Mail::to($user)->queue(new WelcomeEmail()); // Asynchronous - worker stays free

    return response()->json(['message' => 'Email queued!']);
}
```

**For Quick Parallel Tasks:** Use `Octane::concurrently()` for I/O operations within a request (database queries, API calls).
**For Heavy Processing:** Use Laravel Queues for anything that takes more than a few hundred milliseconds.

## 6. Bonus: Simple Health Check Endpoint

Before we conclude, here's a practical bonus: a health check endpoint that helps you monitor your Octane deployment. Add this to your routes:

```php
// routes/web.php
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now()->toISOString(),
        'server' => 'octane-swoole',
        'memory_usage' => memory_get_usage(true),
        'memory_peak' => memory_get_peak_usage(true),
    ]);
});
```

This endpoint helps you:

- Verify your application is responding
- Monitor memory usage patterns
- Confirm Octane is running properly
- Set up uptime monitoring with external services

### Testing Your Complete Setup

With our enhanced Docker Compose setup, you can now test the complete architecture locally:

```bash
# Start the complete stack
./vendor/bin/sail up -d

# Test that Nginx is serving the application
curl -I http://localhost

# Test static file serving (should be served by Nginx)
curl -I http://localhost/favicon.ico

# Test dynamic content (should be processed by Octane)
curl http://localhost/health

# Monitor Octane logs
./vendor/bin/sail logs -f laravel.test

# Monitor Nginx logs
docker logs -f laravel_nginx
```

You should see:

- `Server: nginx` in the response headers
- Static files served directly by Nginx (no PHP processing)
- Dynamic requests proxied to Octane
- Consistent behavior between local and production

## What's Next? A Look Ahead

Congratulations! You've successfully completed our **Laravel Octane with Swoole** series. You now have the knowledge and tools to build, optimize, and deploy high-performance Laravel applications that can handle serious traffic.

### What You've Accomplished

Over these five articles, you've learned:

1. **Part 1:** The fundamental concepts of stateful applications and why Octane is a game-changer
2. **Part 2:** How to set up a robust development environment with Sail and Octane
3. **Part 3:** Advanced concurrency techniques that can dramatically speed up your applications
4. **Part 4:** Sophisticated caching strategies and performance monitoring
5. **Part 5:** Production deployment practices that ensure reliability and performance

### Ready for the Next Level?

The foundation we've built opens the door to even more advanced capabilities. I'm excited to announce the next series, where we'll explore:

- **Part 6: Building Real-Time Features with Octane and WebSockets:** Move beyond HTTP requests to build interactive, real-time features like live notifications and chat applications using Swoole's native WebSocket support.

- **Part 7: The Stateful Detective: Debugging and Preventing Memory Leaks:** Master the biggest challenge of stateful applications with practical techniques for identifying, debugging, and preventing memory leaks in production.

- **Part 8: From Monolith to Microservice: Building High-Performance APIs:** Learn to build lean, lightning-fast API-only services that leverage Octane's low-latency request handling.

- **Part 9: Advanced Queue Mastery with Horizon:** Deep dive into Laravel's queue system with advanced strategies for scaling workers, prioritizing jobs, and ensuring background task reliability.

### Keep Learning!

The Laravel ecosystem is constantly evolving, and high-performance techniques are becoming increasingly important as applications scale. Here are some ways to continue your journey:

- **Practice:** Deploy a simple Octane application to a VPS and experiment with the configurations
- **Monitor:** Set up performance monitoring to see the real-world impact of these optimizations
- **Community:** Join Laravel communities and share your Octane experiences
- **Stay Updated:** Follow the Laravel and Swoole documentation for new features and best practices

## Conclusion: You've Mastered Laravel Octane! 🎉

Congratulations! You've completed the entire **Laravel Octane Mastery** series. You've transformed from someone curious about performance optimization to a developer who can build and deploy enterprise-grade, high-performance Laravel applications.

**What You've Accomplished:**
- ✅ **Fundamental Understanding**: You know why Octane matters and how it works
- ✅ **Development Mastery**: You can set up and develop with Octane + Swoole
- ✅ **Advanced Techniques**: You've mastered concurrency, caching, and monitoring
- ✅ **Production Ready**: You can deploy robust, scalable applications

> **🚀 Series Complete!** This concludes the [Laravel Octane Mastery](/tags/series-laravel-octane-mastery) series. You now have all the knowledge needed to build lightning-fast Laravel applications.
>
> **Want More?** Check out our other series on [DevOps & Infrastructure](/tags/devops-and-infrastructure) or explore [AI & Productivity](/tags/productivity) techniques.

The journey doesn't end here. The skills you've learned—understanding stateful applications, optimizing database queries, implementing monitoring, and deploying with confidence—will serve you well in any high-performance web development project.

Thank you for following along with this series. The combination of Laravel's elegance and Octane's performance creates truly powerful applications. I can't wait to see what you build next!

---

## Works cited

1. Laravel Octane - Laravel 12.x - The PHP Framework For Web Artisans, accessed July 13, 2025, [https://laravel.com/docs/12.x/octane](https://laravel.com/docs/12.x/octane)
2. NGINX recommended setup · Issue #254 · laravel/octane - GitHub, accessed July 13, 2025, [https://github.com/laravel/octane/issues/254](https://github.com/laravel/octane/issues/254)
3. High Performance with Laravel Octane - Roberto Butti, accessed July 13, 2025, [https://subscription.packtpub.com](https://subscription.packtpub.com/book/web-development/9781801819404/pref)
4. How to deploy Laravel Octane app on ubuntu using nginx (practical example). - YouTube, accessed July 13, 2025, [https://www.youtube.com/watch?v=gR5nyy5fVMU](https://www.youtube.com/watch?v=gR5nyy5fVMU)
5. Run octane cmd in production - Laracasts, accessed July 13, 2025, [https://laracasts.com/discuss/channels/servers/run-octane-cmd-in-production](https://laracasts.com/discuss/channels/servers/run-octane-cmd-in-production)
6. laravel octance roadrunner nginx configuration | by Tools Box | Jun, 2025 - Medium, accessed July 13, 2025, [https://medium.com/@qk31cn/laravel-octance-roadrunner-nginx-configuration-f326715f088d](https://medium.com/@qk31cn/laravel-octance-roadrunner-nginx-configuration-f326715f088d)
7. How to setup Octane with Laravel? Explained with Example. How to setup supervisor? | by Kaushik Thakkar, accessed July 13, 2025, [https://devkeytech.medium.com/how-to-setup-octane-with-laravel-explained-with-example-how-to-setup-supervisor-f243df96ccd2](https://devkeytech.medium.com/how-to-setup-octane-with-laravel-explained-with-example-how-to-setup-supervisor-f243df96ccd2)
8. How to setup Octane with Laravel? Explained with Example. How to setup supervisor?, accessed July 13, 2025, [https://devkaushik.hashnode.dev/how-to-setup-octane-with-laravel-explained-with-example-how-to-setup-supervisor](https://devkaushik.hashnode.dev/how-to-setup-octane-with-laravel-explained-with-example-how-to-setup-supervisor)
9. A compiled list of Laravel Octane best practices for your team to follow. - GitHub, accessed July 13, 2025, [https://github.com/michael-rubel/laravel-octane-best-practices](https://github.com/michael-rubel/laravel-octane-best-practices)
10. Myth: You need to use Octane to get acceptable performance from Laravel, accessed July 13, 2025, [https://www.highperformancelaravel.com/tutorials/series/myth-busters/myth-you-need-to-use-octane-to-get-acceptable-performance-from-laravel/](https://www.highperformancelaravel.com/tutorials/series/myth-busters/myth-you-need-to-use-octane-to-get-acceptable-performance-from-laravel/)
11. Is Laravel Octane worth the risk? Limitations you must know before it's too late, accessed July 13, 2025, [https://devkeytech.medium.com/is-laravel-octane-worth-the-risk-limitations-you-must-know-before-its-too-late-2bfa93ddbfc6](https://devkeytech.medium.com/is-laravel-octane-worth-the-risk-limitations-you-must-know-before-its-too-late-2bfa93ddbfc6)
12. Advanced Techniques for Laravel Octane: Supercharging Your Application - Medium, accessed July 13, 2025, [https://medium.com/@islamshariful/advanced-techniques-for-laravel-octane-supercharging-your-application-34db88f75432](https://medium.com/@islamshariful/advanced-techniques-for-laravel-octane-supercharging-your-application-34db88f75432)
13. Debugging in Laravel Octane - Laracasts, accessed July 13, 2025, [https://laracasts.com/discuss/channels/laravel/debugging-in-laravel-octane](https://laracasts.com/discuss/channels/laravel/debugging-in-laravel-octane)
14. php artisan octane:reload - Laravel 11.x, accessed July 13, 2025, [https://artisan.page/11.x/octanereload](https://artisan.page/11.x/octanereload)
15. Ultimate Laravel Performance Optimization Guide - Cloudways, accessed July 13, 2025, [https://www.cloudways.com/blog/laravel-performance-optimization/](https://www.cloudways.com/blog/laravel-performance-optimization/)
16. How to improve Laravel performance - New Relic, accessed July 13, 2025, [https://newrelic.com/blog/best-practices/improve-laravel-performance](https://newrelic.com/blog/best-practices/improve-laravel-performance)
17. Using Laravel Octane for High-Performance Applications - 200OK Solutions, accessed July 13, 2025, [https://200oksolutions.com/blog/using-laravel-octane-high-performance-applications/](https://200oksolutions.com/blog/using-laravel-octane-high-performance-applications/)
18. Laravel Octane - Reddit, accessed July 13, 2025, [https://www.reddit.com/r/laravel/comments/m778x5/laravel_octane/](https://www.reddit.com/r/laravel/comments/m778x5/laravel_octane/)
19. Is there any reason for not use laravel octane for new projects nowadays? - Reddit, accessed July 13, 2025, [https://www.reddit.com/r/laravel/comments/1ddta38/is_there_any_reason_for_not_use_laravel_octane/](https://www.reddit.com/r/laravel/comments/1ddta38/is_there_any_reason_for_not_use_laravel_octane/)
