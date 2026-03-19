---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T22:24:07.777Z
title: "Laravel Primary Script Unknown from Nginx Root Mismatch: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - production
  - debugging
  - devops-and-infrastructure
  - infrastructure
  - nginx
  - php-fpm
  - deployments
description: "The `Primary script unknown` error means PHP-FPM received a script path that does not exist from Nginx. In Laravel deployments this usually happens because..."
faqs:
  - question: "Why does Laravel show `Primary script unknown` even though `index.php` exists on disk?"
    answer: "Because PHP-FPM does not look for files on its own. It tries to open exactly the path Nginx passes through `SCRIPT_FILENAME`. If that path is wrong due to an incorrect root, a bad symlink, or mismatched variables, PHP-FPM will report that the primary script is unknown even if the right file exists somewhere else in the release directory. Always debug the resolved path, not just file existence."
  - question: "Is `$document_root` or `$realpath_root` better for Laravel Nginx configs?"
    answer: "For simple non-symlinked deployments, either can work if the root is correct. In symlink-based release setups, `$realpath_root` is safer because it resolves the actual filesystem path instead of the symbolic link path. That reduces weirdness when deploy tools switch `current` to a new release and PHP-FPM needs the resolved absolute path for `SCRIPT_FILENAME`."
---

## TL;DR

The `Primary script unknown` error means PHP-FPM received a script path that does not exist from Nginx. In Laravel deployments this usually happens because the Nginx `root` points at the project root instead of the `public` directory, the `SCRIPT_FILENAME` parameter is built from the wrong variable, or a symlink-based deploy changes the real path while Nginx still resolves an outdated location. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- Nginx shows 404 or 502 behavior only for PHP routes while static files may still load
- Error logs contain `Primary script unknown` or `Unable to open primary script`
- The issue appears after changing the deploy path or using symlink releases
- CLI commands like `php artisan route:list` work even though web requests fail
- Requests to `/index.php` or routed pages break while the Nginx virtual host itself is online

If any of these symptoms look familiar, you're dealing with **laravel primary script unknown from nginx root mismatch**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

The `Primary script unknown` error means PHP-FPM received a script path that does not exist from Nginx. In Laravel deployments this usually happens because the Nginx `root` points at the project root instead of the `public` directory, the `SCRIPT_FILENAME` parameter is built from the wrong variable, or a symlink-based deploy changes the real path while Nginx still resolves an outdated location. PHP-FPM is healthy in this case, but it cannot open the file Nginx told it to execute. The fix is to make the document root, `try_files`, and `SCRIPT_FILENAME` all resolve to the same real path for `public/index.php`.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Confirm the active document root points to Laravel's `public` directory and not to the project root, shared storage path, or a stale release symlink.

Confirm the active document root points to Laravel's `public` directory and not to the project root, shared storage path, or a stale release symlink.

### Step 2: Check the FastCGI block and ensure `SCRIPT_FILENAME` is derived from `$realpath_root$fastcgi_script_name` or the correct equivalent for your deploy strategy.

Check the FastCGI block and ensure `SCRIPT_FILENAME` is derived from `$realpath_root$fastcgi_script_name` or the correct equivalent for your deploy strategy.

### Step 3: Use `try_files $uri $uri/ /index.php?$query_string;` in the main location block so Laravel routing always resolves through the front controller.

Use `try_files $uri $uri/ /index.php?$query_string;` in the main location block so Laravel routing always resolves through the front controller.

### Step 4: If you deploy through symlinks, reload Nginx after switching releases so `realpath` values and file cache state match the current release directory.

If you deploy through symlinks, reload Nginx after switching releases so `realpath` values and file cache state match the current release directory.

### Step 5: Review open_basedir or chroot-style restrictions in PHP-FPM if the file exists but PHP still cannot open it under the configured pool user.

Review open_basedir or chroot-style restrictions in PHP-FPM if the file exists but PHP still cannot open it under the configured pool user.

### Step 6: Retest with `nginx -t`, `php-fpm -t`, and a curl request to `/` and `/index.php` so you verify both routing and direct front-controller access behave correctly.

Retest with `nginx -t`, `php-fpm -t`, and a curl request to `/` and `/index.php` so you verify both routing and direct front-controller access behave correctly.

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```nginx
server {\n    root /var/www/myapp;\n\n    location / {\n        try_files $uri $uri/ /index.php?$query_string;\n    }\n\n    location ~ \\.php$ {\n        include fastcgi_params;\n        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;\n        fastcgi_pass unix:/run/php/php8.3-fpm.sock;\n    }\n}
```

### After (Fixed)

```nginx
server {\n    root /var/www/myapp/current/public;\n\n    location / {\n        try_files $uri $uri/ /index.php?$query_string;\n    }\n\n    location ~ \\.php$ {\n        include fastcgi_params;\n        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;\n        fastcgi_param DOCUMENT_ROOT $realpath_root;\n        fastcgi_pass unix:/run/php/php8.3-fpm.sock;\n    }\n}
```

---

## Key Takeaways

- **Identify before you fix**: Use the symptoms checklist above to confirm you're dealing with this specific issue, not a different problem with similar error messages
- **Test under load**: Many of these issues only surface under concurrent access — always verify your fix with load testing before deploying to production
- **Monitor after deployment**: Set up alerting for the symptoms listed above so you catch regressions early

---

## Difficulty Level

**Intermediate**

This guide assumes familiarity with the framework and its core tooling. You should understand basic database concepts, configuration patterns, and be comfortable reading framework source code when needed. Prior experience with similar issues will help but is not required.

---

## Frequently Asked Questions

### Why does Laravel show `Primary script unknown` even though `index.php` exists on disk?

Because PHP-FPM does not look for files on its own. It tries to open exactly the path Nginx passes through `SCRIPT_FILENAME`. If that path is wrong due to an incorrect root, a bad symlink, or mismatched variables, PHP-FPM will report that the primary script is unknown even if the right file exists somewhere else in the release directory. Always debug the resolved path, not just file existence.

### Is `$document_root` or `$realpath_root` better for Laravel Nginx configs?

For simple non-symlinked deployments, either can work if the root is correct. In symlink-based release setups, `$realpath_root` is safer because it resolves the actual filesystem path instead of the symbolic link path. That reduces weirdness when deploy tools switch `current` to a new release and PHP-FPM needs the resolved absolute path for `SCRIPT_FILENAME`.
