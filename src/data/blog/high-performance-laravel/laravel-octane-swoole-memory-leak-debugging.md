---
author: Qisthi Ramadhani
pubDatetime: 2026-03-16T15:10:06.237Z
title: "Laravel Octane Swoole Memory Leak in Production: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - php
  - swoole
  - octane
  - performance
  - debugging
  - high-performance-laravel
description: "Memory leaks in Laravel Octane with Swoole happen because the application stays in memory across requests instead of bootstrapping fresh on each request li..."
faqs:
  - question: "How do I find which class is leaking memory in Laravel Octane?"
    answer: "Use Swoole Tracker or run `php -r \"echo memory_get_usage();\"` before and after handling requests. In development, add logging to Octane's RequestReceived and RequestTerminated events to track memory delta per request. The class with the largest delta is likely your leak. Also search for `static $` properties in your codebase — these are the most common Octane leak source."
  - question: "What is the recommended --max-requests setting for Octane in production?"
    answer: "Start with --max-requests=1000. This automatically restarts workers after 1000 requests, preventing runaway memory leaks from crashing your server. If your memory profiling shows no leaks, you can increase this to 10000 or higher. If you see rapid memory growth, lower it to 500 while you investigate."
---

## TL;DR

Memory leaks in Laravel Octane with Swoole happen because the application stays in memory across requests instead of bootstrapping fresh on each request like PHP-FPM. Static properties, singletons registered in service providers, event listener accumulation, and improper use of global state all persist between requests, causing memory to grow continuously until the worker is killed. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- Worker memory usage grows linearly with each request until OOM killer intervenes
- Swoole workers restart frequently due to --max-requests being hit
- Application slows down progressively after deployment
- Random segfaults or bus errors in Swoole worker processes
- Different responses for the same request depending on which worker handles it

If any of these symptoms look familiar, you're dealing with **laravel octane swoole memory leak in production**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

Memory leaks in Laravel Octane with Swoole happen because the application stays in memory across requests instead of bootstrapping fresh on each request like PHP-FPM. Static properties, singletons registered in service providers, event listener accumulation, and improper use of global state all persist between requests, causing memory to grow continuously until the worker is killed. Common culprits include: logging to arrays, caching query results in static properties, adding event listeners in middleware that fire on every request, and third-party packages that assume a fresh process per request.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Enable Octane's built-in memory leak detection: set OCTANE_MAX_REQUESTS=500 to auto-restart workers and confirm the leak exists by monitoring memory over time

Enable Octane's built-in memory leak detection: set OCTANE_MAX_REQUESTS=500 to auto-restart workers and confirm the leak exists by monitoring memory over time

### Step 2: Profile memory with Swoole Tracker or Xdebug: run `php -d memory_limit=512M artisan octane:start` and watch memory per worker

Profile memory with Swoole Tracker or Xdebug: run `php -d memory_limit=512M artisan octane:start` and watch memory per worker

### Step 3: Audit service providers: ensure any singleton bindings that store request-specific state are flushed

Audit service providers: ensure any singleton bindings that store request-specific state are flushed — register them in Octane's 'flush' array in config/octane.php

### Step 4: Check for static property accumulation: search your codebase for `static $` and ensure these are reset between requests

Check for static property accumulation: search your codebase for `static $` and ensure these are reset between requests

### Step 5: Review event listeners: move listeners from middleware to EventServiceProvider and ensure Octane flushes them

Review event listeners: move listeners from middleware to EventServiceProvider and ensure Octane flushes them

### Step 6: Add leaking classes to Octane's warm/flush configuration in config/octane.php

Add leaking classes to Octane's warm/flush configuration in config/octane.php

### Step 7: Use Octane's RequestTerminated listener to manually clean up resources if needed

Use Octane's RequestTerminated listener to manually clean up resources if needed

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// LEAKS: Static cache accumulates across requests in Octane
class PricingService
{
    private static array $cache = [];

    public function getPrice(int $productId): float
    {
        if (!isset(self::$cache[$productId])) {
            self::$cache[$productId] = DB::table('prices')
                ->where('product_id', $productId)
                ->value('amount');
        }
        return self::$cache[$productId]; // grows forever in Octane
    }
}
```

### After (Fixed)

```php
// FIXED: Use Octane-aware caching with bounded size
use Laravel\Octane\Facades\Octane;

class PricingService
{
    public function __construct(
        private CacheManager $cache
    ) {}

    public function getPrice(int $productId): float
    {
        return $this->cache->remember(
            "price:{$productId}",
            now()->addMinutes(5),
            fn () => DB::table('prices')
                ->where('product_id', $productId)
                ->value('amount')
        );
    }
}

// config/octane.php — flush singletons between requests
'flush' => [
    PricingService::class,
],
```

---

## Key Takeaways

- **Identify before you fix**: Use the symptoms checklist above to confirm you're dealing with this specific issue, not a different problem with similar error messages
- **Test under load**: Many of these issues only surface under concurrent access — always verify your fix with load testing before deploying to production
- **Monitor after deployment**: Set up alerting for the symptoms listed above so you catch regressions early

---

## Difficulty Level

**Advanced**

This guide requires deep understanding of framework internals and production debugging techniques. You should be experienced with profiling tools, understand concurrency patterns, and be comfortable debugging issues that only manifest under production load or specific timing conditions.

---

## Frequently Asked Questions

### How do I find which class is leaking memory in Laravel Octane?

Use Swoole Tracker or run `php -r "echo memory_get_usage();"` before and after handling requests. In development, add logging to Octane's RequestReceived and RequestTerminated events to track memory delta per request. The class with the largest delta is likely your leak. Also search for `static $` properties in your codebase — these are the most common Octane leak source.

### What is the recommended --max-requests setting for Octane in production?

Start with --max-requests=1000. This automatically restarts workers after 1000 requests, preventing runaway memory leaks from crashing your server. If your memory profiling shows no leaks, you can increase this to 10000 or higher. If you see rapid memory growth, lower it to 500 while you investigate.
