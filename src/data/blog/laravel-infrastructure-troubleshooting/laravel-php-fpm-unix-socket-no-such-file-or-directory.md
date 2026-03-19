---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T22:24:07.777Z
title: "Laravel PHP-FPM Unix Socket File Missing: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - production
  - debugging
  - devops-and-infrastructure
  - infrastructure
  - php-fpm
  - nginx
  - unix-socket
description: "Nginx throws this error when it is configured to send PHP requests to a Unix socket path that does not exist at request time. The missing socket usually me..."
faqs:
  - question: "Should I switch from a Unix socket to TCP to avoid this Laravel PHP-FPM error?"
    answer: "You can, but it is not automatically the best fix. Unix sockets are fast and perfectly reliable when the path, permissions, and service order are correct. Switching to TCP may simplify some container or multi-host setups, but it also changes your network surface and does not solve bad restart sequencing or broken PHP-FPM startup. Fix the configuration mismatch first, then decide based on architecture."
  - question: "Why does the socket path often break right after a PHP upgrade?"
    answer: "Distribution packages usually version the socket file, so a move from PHP 8.3 to 8.4 changes the default path from something like `php8.3-fpm.sock` to `php8.4-fpm.sock`. If Nginx still points at the old filename, it will keep trying to connect to a file that will never be created. That is why upgrade checklists should always include both Nginx and PHP-FPM config review."
---

## TL;DR

Nginx throws this error when it is configured to send PHP requests to a Unix socket path that does not exist at request time. The missing socket usually means PHP-FPM is not running, is listening on a different versioned socket path, failed to start because of invalid pool configuration, or created the socket with permissions Nginx cannot use. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- Every PHP route returns 502 Bad Gateway immediately after a deploy or reboot
- Nginx error logs show `connect() to unix:/run/php/... failed (2: No such file or directory)`
- Static assets still work because Nginx itself is healthy
- The socket path in `/run/php` differs from the one in the Nginx site config
- Restarting PHP-FPM temporarily fixes the issue until the next version or service change

If any of these symptoms look familiar, you're dealing with **laravel php-fpm unix socket file missing**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

Nginx throws this error when it is configured to send PHP requests to a Unix socket path that does not exist at request time. The missing socket usually means PHP-FPM is not running, is listening on a different versioned socket path, failed to start because of invalid pool configuration, or created the socket with permissions Nginx cannot use. This is common after PHP version upgrades, distro package changes, or deploy scripts that restart Nginx before PHP-FPM has fully come back. The message points at Nginx, but the durable fix is to align the `fastcgi_pass` target, the PHP-FPM `listen` directive, and the service startup order.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Check the exact socket path Nginx is trying to use in the site configuration and compare it with the `listen` directive in the active PHP-FPM pool configuration.

Check the exact socket path Nginx is trying to use in the site configuration and compare it with the `listen` directive in the active PHP-FPM pool configuration.

### Step 2: Verify the PHP-FPM service is running with `systemctl status` and inspect its journal for syntax errors, missing extensions, or permission failures that prevented startup.

Verify the PHP-FPM service is running with `systemctl status` and inspect its journal for syntax errors, missing extensions, or permission failures that prevented startup.

### Step 3: Align the socket path after PHP upgrades so Nginx and PHP-FPM both use the same versioned file such as `php8.3-fpm.sock` rather than a stale path.

Align the socket path after PHP upgrades so Nginx and PHP-FPM both use the same versioned file such as `php8.3-fpm.sock` rather than a stale path.

### Step 4: Confirm socket ownership and mode using `listen.owner`, `listen.group`, and `listen.mode` so the Nginx user can actually open the file after PHP-FPM creates it.

Confirm socket ownership and mode using `listen.owner`, `listen.group`, and `listen.mode` so the Nginx user can actually open the file after PHP-FPM creates it.

### Step 5: Restart PHP-FPM first and Nginx second during deploys or package upgrades so Nginx never points at a socket that has not been created yet.

Restart PHP-FPM first and Nginx second during deploys or package upgrades so Nginx never points at a socket that has not been created yet.

### Step 6: Retest with `nginx -t`, `systemctl restart php-fpm`, and a live request to ensure the socket exists, permissions are correct, and the site responds before you close the incident.

Retest with `nginx -t`, `systemctl restart php-fpm`, and a live request to ensure the socket exists, permissions are correct, and the site responds before you close the incident.

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```ini
# nginx\nfastcgi_pass unix:/run/php/php8.3-fpm.sock;\n\n; www.conf\nlisten = /run/php/php8.4-fpm.sock\nlisten.owner = www-data\nlisten.group = www-data
```

### After (Fixed)

```ini
# nginx\nfastcgi_pass unix:/run/php/php8.4-fpm.sock;\n\n; www.conf\nlisten = /run/php/php8.4-fpm.sock\nlisten.owner = www-data\nlisten.group = www-data\nlisten.mode = 0660\n\n# deploy order\nsystemctl restart php8.4-fpm\nsystemctl reload nginx
```

---

## Key Takeaways

- **Identify before you fix**: Use the symptoms checklist above to confirm you're dealing with this specific issue, not a different problem with similar error messages
- **Test under load**: Many of these issues only surface under concurrent access — always verify your fix with load testing before deploying to production
- **Monitor after deployment**: Set up alerting for the symptoms listed above so you catch regressions early

---

## Difficulty Level

**Beginner**

This guide is suitable for developers new to this topic. You should be comfortable with basic framework concepts and have a development environment set up. No prior experience with the specific error or optimization technique is required.

---

## Frequently Asked Questions

### Should I switch from a Unix socket to TCP to avoid this Laravel PHP-FPM error?

You can, but it is not automatically the best fix. Unix sockets are fast and perfectly reliable when the path, permissions, and service order are correct. Switching to TCP may simplify some container or multi-host setups, but it also changes your network surface and does not solve bad restart sequencing or broken PHP-FPM startup. Fix the configuration mismatch first, then decide based on architecture.

### Why does the socket path often break right after a PHP upgrade?

Distribution packages usually version the socket file, so a move from PHP 8.3 to 8.4 changes the default path from something like `php8.3-fpm.sock` to `php8.4-fpm.sock`. If Nginx still points at the old filename, it will keep trying to connect to a file that will never be created. That is why upgrade checklists should always include both Nginx and PHP-FPM config review.
