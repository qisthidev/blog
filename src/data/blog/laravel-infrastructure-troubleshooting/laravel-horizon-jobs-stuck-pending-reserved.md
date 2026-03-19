---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T22:24:07.779Z
title: "Laravel Horizon Jobs Stuck in Pending or Reserved State: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - production
  - debugging
  - devops-and-infrastructure
  - infrastructure
  - horizon
  - redis
  - queues
description: "Jobs get stuck in `pending` or `reserved` when Laravel is successfully enqueueing work but the workers cannot complete the job lifecycle. The usual causes..."
faqs:
  - question: "What is the difference between pending and reserved jobs in Laravel Horizon?"
    answer: "Pending jobs are still waiting in the queue and have not yet been claimed by a worker. Reserved jobs were claimed by a worker, but the system has not yet marked them complete, failed, or released back to the queue. If reserved jobs accumulate, it usually points to worker crashes, timeout mismatches, or jobs that hang after they are claimed rather than a simple enqueue problem."
  - question: "Why can jobs stay reserved even when Horizon says workers are running?"
    answer: "Because the workers can be alive but unhealthy. They may be timing out, crashing after boot, pointing at the wrong Redis connection, or repeatedly reconnecting under network trouble. Horizon's presence indicators do not replace worker log inspection. When jobs are reserved but never complete, always check the process manager, Redis health, and timeout settings together."
---

## TL;DR

Jobs get stuck in `pending` or `reserved` when Laravel is successfully enqueueing work but the workers cannot complete the job lifecycle. The usual causes are workers not running, Horizon pointing at the wrong Redis connection, `retry_after` and worker `timeout` values being misaligned, fatal job crashes before delete or release, or queue processes that lost Redis connectivity. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- Horizon shows a growing pending queue while throughput drops toward zero
- Jobs remain in reserved state for longer than expected and do not complete
- Workers appear online, but logs show repeated timeouts, memory exits, or Redis reconnects
- Failed job counts stay low even though users report that background work never finishes
- The incident starts after changing queue timeout, adding long-running jobs, or deploying new Redis settings

If any of these symptoms look familiar, you're dealing with **laravel horizon jobs stuck in pending or reserved state**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

Jobs get stuck in `pending` or `reserved` when Laravel is successfully enqueueing work but the workers cannot complete the job lifecycle. The usual causes are workers not running, Horizon pointing at the wrong Redis connection, `retry_after` and worker `timeout` values being misaligned, fatal job crashes before delete or release, or queue processes that lost Redis connectivity. Reserved jobs are especially deceptive because they look like they were picked up, but they remain invisible to other workers until the reservation expires. The fix is to treat Horizon as a system of Redis, workers, Supervisor, and job runtime configuration together rather than as a dashboard-only problem.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Confirm workers are truly running under Horizon or Supervisor and not just present in the dashboard, because stale processes and zombie supervisors can mislead the UI.

Confirm workers are truly running under Horizon or Supervisor and not just present in the dashboard, because stale processes and zombie supervisors can mislead the UI.

### Step 2: Align `retry_after` in `config/queue.php` so it is longer than the worker timeout, otherwise jobs can be re-reserved or left in confusing intermediate states.

Align `retry_after` in `config/queue.php` so it is longer than the worker timeout, otherwise jobs can be re-reserved or left in confusing intermediate states.

### Step 3: Review Horizon and worker logs for fatal exits, memory limits, and lost Redis connections that stop jobs after reservation but before completion bookkeeping.

Review Horizon and worker logs for fatal exits, memory limits, and lost Redis connections that stop jobs after reservation but before completion bookkeeping.

### Step 4: Check that Horizon uses the intended Redis connection and queue names, especially after introducing separate cache and queue Redis instances.

Check that Horizon uses the intended Redis connection and queue names, especially after introducing separate cache and queue Redis instances.

### Step 5: Audit long-running jobs and break them into smaller pieces or batches if they regularly exceed timeout budgets and monopolize reserved slots.

Audit long-running jobs and break them into smaller pieces or batches if they regularly exceed timeout budgets and monopolize reserved slots.

### Step 6: After configuration changes, terminate Horizon cleanly and restart it so every supervisor and worker process reloads the current queue, timeout, and Redis settings.

After configuration changes, terminate Horizon cleanly and restart it so every supervisor and worker process reloads the current queue, timeout, and Redis settings.

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// config/queue.php\n'redis' => [\n    'driver' => 'redis',\n    'retry_after' => 60,\n],\n\n# Supervisor\ncommand=php artisan horizon\n\n# Worker timeout\nphp artisan horizon --timeout=90
```

### After (Fixed)

```php
// config/queue.php\n'redis' => [\n    'driver' => 'redis',\n    'retry_after' => 120,\n],\n\n# Supervisor\ndirectory=/var/www/myapp/current\ncommand=/usr/bin/php artisan horizon\nautostart=true\nautorestart=true\nstopwaitsecs=360\n\nphp artisan horizon:terminate
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

### What is the difference between pending and reserved jobs in Laravel Horizon?

Pending jobs are still waiting in the queue and have not yet been claimed by a worker. Reserved jobs were claimed by a worker, but the system has not yet marked them complete, failed, or released back to the queue. If reserved jobs accumulate, it usually points to worker crashes, timeout mismatches, or jobs that hang after they are claimed rather than a simple enqueue problem.

### Why can jobs stay reserved even when Horizon says workers are running?

Because the workers can be alive but unhealthy. They may be timing out, crashing after boot, pointing at the wrong Redis connection, or repeatedly reconnecting under network trouble. Horizon's presence indicators do not replace worker log inspection. When jobs are reserved but never complete, always check the process manager, Redis health, and timeout settings together.
