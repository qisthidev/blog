---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T22:24:07.776Z
title: "Nginx 504 Gateway Timeout with Laravel PHP-FPM: How to Fix"
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
  - timeouts
description: "A 504 Gateway Timeout happens when Nginx successfully proxies the request to PHP-FPM but does not receive a complete response before its upstream timeout e..."
faqs:
  - question: "Should I just increase fastcgi_read_timeout to fix Laravel 504 errors?"
    answer: "Only after you know why the request is slow. Increasing `fastcgi_read_timeout` can reduce false positives for legitimate heavy endpoints, but it does not fix blocked PHP-FPM workers, missing indexes, synchronous file generation, or slow external services. In many Laravel apps the better fix is to queue the work, optimize the query, or add worker capacity. Treat longer timeouts as a safety margin, not as the primary solution."
  - question: "How do I tell whether a Laravel 504 is caused by Nginx, PHP-FPM, or the application code?"
    answer: "Start with the request timeline. Nginx tells you when it gave up, PHP-FPM tells you whether workers were busy or slow, and Laravel logs tell you which route or job was executing. If the same endpoint always spikes database time, the root cause is application or database work. If all endpoints fail during bursts and PHP-FPM is saturated, capacity is the first thing to fix."
---

## TL;DR

A 504 Gateway Timeout happens when Nginx successfully proxies the request to PHP-FPM but does not receive a complete response before its upstream timeout expires. In Laravel applications, this usually means the PHP worker is blocked by a slow database query, a synchronous export, an external API call, or a queue-like task that should never have stayed inside the request cycle. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- Users intermittently receive 504 Gateway Timeout responses on report, export, or admin pages
- Nginx access logs show long request durations ending in status 504
- PHP-FPM workers stay busy for tens of seconds during traffic spikes
- Database slow query logs or external API logs line up with the failed requests
- The same page works locally but fails in production when data volume is much larger

If any of these symptoms look familiar, you're dealing with **nginx 504 gateway timeout with laravel php-fpm**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

A 504 Gateway Timeout happens when Nginx successfully proxies the request to PHP-FPM but does not receive a complete response before its upstream timeout expires. In Laravel applications, this usually means the PHP worker is blocked by a slow database query, a synchronous export, an external API call, or a queue-like task that should never have stayed inside the request cycle. The problem is often misdiagnosed as a pure Nginx issue, but the real bottleneck is usually inside PHP-FPM capacity or the application code path. If your PHP-FPM pool is saturated, Nginx may wait on an idle worker first and then also wait on the slow request itself, making 504s appear random under production traffic.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Confirm where the time is spent by correlating Nginx request duration, PHP-FPM slow logs, Laravel application logs, and database slow query logs for the exact failing endpoint.

Confirm where the time is spent by correlating Nginx request duration, PHP-FPM slow logs, Laravel application logs, and database slow query logs for the exact failing endpoint.

### Step 2: Move long-running work out of the request cycle by dispatching a queued job for exports, imports, backups, and third-party API fan-out instead of making the browser wait for completion.

Move long-running work out of the request cycle by dispatching a queued job for exports, imports, backups, and third-party API fan-out instead of making the browser wait for completion.

### Step 3: Review PHP-FPM pool pressure with process metrics and raise `pm.max_children` only after calculating memory per worker so you do not trade 504s for OOM kills.

Review PHP-FPM pool pressure with process metrics and raise `pm.max_children` only after calculating memory per worker so you do not trade 504s for OOM kills.

### Step 4: Set `fastcgi_read_timeout` high enough for legitimate long requests, but do not use large timeouts to hide application bottlenecks that should be optimized or queued.

Set `fastcgi_read_timeout` high enough for legitimate long requests, but do not use large timeouts to hide application bottlenecks that should be optimized or queued.

### Step 5: Profile the Laravel code path with Telescope, Pulse, or query logging so you can eliminate N+1 queries, missing indexes, and expensive collection work before adjusting infrastructure knobs.

Profile the Laravel code path with Telescope, Pulse, or query logging so you can eliminate N+1 queries, missing indexes, and expensive collection work before adjusting infrastructure knobs.

### Step 6: After fixing the root cause, load-test the endpoint again and verify that 95th percentile response time stays comfortably below your Nginx and PHP-FPM timeout thresholds.

After fixing the root cause, load-test the endpoint again and verify that 95th percentile response time stays comfortably below your Nginx and PHP-FPM timeout thresholds.

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
# nginx.conf\nlocation ~ \\.php$ {\n    include fastcgi_params;\n    fastcgi_pass unix:/run/php/php8.3-fpm.sock;\n    fastcgi_read_timeout 60s;\n}\n\n// Controller\npublic function export()\n{\n    $rows = Order::with(['customer', 'items.product'])->get();\n    return Excel::download(new OrdersExport($rows), 'orders.xlsx');\n}
```

### After (Fixed)

```php
# nginx.conf\nlocation ~ \\.php$ {\n    include fastcgi_params;\n    fastcgi_pass unix:/run/php/php8.3-fpm.sock;\n    fastcgi_read_timeout 180s; // only after profiling the real bottleneck\n}\n\n// Controller\npublic function export()\n{\n    ExportOrders::dispatch(auth()->id());\n    return response()->json(['status' => 'queued']);\n}\n\n// www.conf\npm = dynamic\npm.max_children = 40\nrequest_slowlog_timeout = 10s\nslowlog = /var/log/php8.3-fpm-slow.log
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

### Should I just increase fastcgi_read_timeout to fix Laravel 504 errors?

Only after you know why the request is slow. Increasing `fastcgi_read_timeout` can reduce false positives for legitimate heavy endpoints, but it does not fix blocked PHP-FPM workers, missing indexes, synchronous file generation, or slow external services. In many Laravel apps the better fix is to queue the work, optimize the query, or add worker capacity. Treat longer timeouts as a safety margin, not as the primary solution.

### How do I tell whether a Laravel 504 is caused by Nginx, PHP-FPM, or the application code?

Start with the request timeline. Nginx tells you when it gave up, PHP-FPM tells you whether workers were busy or slow, and Laravel logs tell you which route or job was executing. If the same endpoint always spikes database time, the root cause is application or database work. If all endpoints fail during bursts and PHP-FPM is saturated, capacity is the first thing to fix.
