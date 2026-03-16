---
author: Qisthi Ramadhani
pubDatetime: 2026-03-16T12:20:41.103Z
title: "Laravel Queue Deadlock with Redis vs Database Driver: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - php
  - redis
  - database
  - queues
  - high-performance-laravel
  - performance
description: "Queue deadlocks in Laravel occur when queued jobs compete for the same resources — either at the queue broker level (Redis connection exhaustion, database..."
faqs:
  - question: "Should I use Redis or database driver for Laravel queues in production?"
    answer: "Use Redis for production in almost all cases. The database queue driver uses row-level locking (SELECT FOR UPDATE) to reserve jobs, which creates contention under high concurrency. Redis uses atomic operations (BRPOPLPUSH/BLMOVE) that scale much better. The database driver is fine for development, low-traffic apps, or when you cannot run Redis."
  - question: "How do I monitor for queue deadlocks in Laravel?"
    answer: "Install Laravel Horizon for Redis-based queues — it provides real-time monitoring of worker status, job throughput, and failure rates. For database queues, query the jobs table for rows with reserved_at timestamps older than retry_after. Set up alerts in your monitoring system (Datadog, New Relic) for queue depth exceeding thresholds and worker count dropping."
---

## TL;DR

Queue deadlocks in Laravel occur when queued jobs compete for the same resources — either at the queue broker level (Redis connection exhaustion, database row locks) or at the application level (jobs that dispatch other jobs that depend on the parent completing first). The database queue driver is particularly prone to deadlocks under high concurrency because it uses SELECT ... This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- Queue workers become unresponsive and stop processing jobs
- SQLSTATE[40001] Serialization failure: deadlock detected in PostgreSQL
- Redis connection timeout errors in queue worker logs
- Jobs stuck in 'reserved' state that never complete or fail
- Horizon dashboard shows workers as 'paused' with growing job backlog
- Memory usage on Redis server climbing continuously

If any of these symptoms look familiar, you're dealing with **laravel queue deadlock with redis vs database driver**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

Queue deadlocks in Laravel occur when queued jobs compete for the same resources — either at the queue broker level (Redis connection exhaustion, database row locks) or at the application level (jobs that dispatch other jobs that depend on the parent completing first). The database queue driver is particularly prone to deadlocks under high concurrency because it uses SELECT ... FOR UPDATE to reserve jobs, creating lock contention on the jobs table. The Redis driver avoids this with atomic BRPOPLPUSH operations but introduces different failure modes around connection pooling and memory limits.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Identify the deadlock type: check Laravel logs for SQLSTATE errors (database deadlock) or Redis timeout errors (connection exhaustion)

Identify the deadlock type: check Laravel logs for SQLSTATE errors (database deadlock) or Redis timeout errors (connection exhaustion)

### Step 2: For database driver deadlocks: switch to Redis driver if possible

For database driver deadlocks: switch to Redis driver if possible — it uses atomic operations that avoid row-level lock contention

### Step 3: For Redis connection issues: configure a dedicated Redis connection for queues separate from cache in config/database.php

For Redis connection issues: configure a dedicated Redis connection for queues separate from cache in config/database.php

### Step 4: Set appropriate queue connection pooling: use QUEUE_REDIS_CONNECTION=queue and define a separate Redis database (e.g., database 1 for queue, 0 for cache)

Set appropriate queue connection pooling: use QUEUE_REDIS_CONNECTION=queue and define a separate Redis database (e.g., database 1 for queue, 0 for cache)

### Step 5: Configure retry_after in config/queue.php to be longer than your longest-running job to prevent duplicate processing

Configure retry_after in config/queue.php to be longer than your longest-running job to prevent duplicate processing

### Step 6: Add --timeout flag to queue workers that is shorter than retry_after to ensure graceful worker recycling

Add --timeout flag to queue workers that is shorter than retry_after to ensure graceful worker recycling

### Step 7: For circular job dependencies: refactor to use job batches (Bus::batch) or event-driven patterns instead of direct job chaining

For circular job dependencies: refactor to use job batches (Bus::batch) or event-driven patterns instead of direct job chaining

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// config/database.php — PROBLEMATIC: queue and cache share Redis connection
'redis' => [
    'default' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_DB', '0'),
    ],
],

// config/queue.php
'redis' => [
    'driver' => 'redis',
    'connection' => 'default', // shares with cache!
    'queue' => 'default',
    'retry_after' => 90,
],
```

### After (Fixed)

```php
// config/database.php — FIXED: dedicated Redis connection for queues
'redis' => [
    'default' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_DB', '0'),
    ],
    'queue' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_QUEUE_DB', '1'), // separate DB
    ],
],

// config/queue.php
'redis' => [
    'driver' => 'redis',
    'connection' => 'queue', // dedicated connection
    'queue' => env('REDIS_QUEUE', 'default'),
    'retry_after' => 90,
    'block_for' => 5, // efficient blocking pop
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

### Should I use Redis or database driver for Laravel queues in production?

Use Redis for production in almost all cases. The database queue driver uses row-level locking (SELECT FOR UPDATE) to reserve jobs, which creates contention under high concurrency. Redis uses atomic operations (BRPOPLPUSH/BLMOVE) that scale much better. The database driver is fine for development, low-traffic apps, or when you cannot run Redis.

### How do I monitor for queue deadlocks in Laravel?

Install Laravel Horizon for Redis-based queues — it provides real-time monitoring of worker status, job throughput, and failure rates. For database queues, query the jobs table for rows with reserved_at timestamps older than retry_after. Set up alerts in your monitoring system (Datadog, New Relic) for queue depth exceeding thresholds and worker count dropping.
