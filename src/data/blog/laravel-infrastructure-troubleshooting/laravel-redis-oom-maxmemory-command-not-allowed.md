---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T22:24:07.778Z
title: "Redis OOM maxmemory Errors in Laravel: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - production
  - debugging
  - devops-and-infrastructure
  - infrastructure
  - redis
  - memory
  - horizon
description: "This Redis error means the server has reached its `maxmemory` limit and the active eviction policy does not allow the incoming write to succeed. In Laravel..."
faqs:
  - question: "Is `noeviction` always wrong for Laravel Redis servers?"
    answer: "No. It can be the right choice for queues, sessions, and locks where silent eviction would be worse than a loud failure. The problem comes when you mix disposable cache data with critical queue data on the same instance and expect one policy to fit both. In that case Laravel needs either separate Redis roles or much more intentional TTL and memory design."
  - question: "Why does Redis OOM sometimes break queues before I notice cache problems?"
    answer: "Because queue dispatches and Horizon bookkeeping are write-heavy and often occur continuously under load. A full Redis instance may still serve some reads while rejecting every new write. That makes the queue system look broken first, even though the real issue is shared memory exhaustion. Watch Redis memory and write error rates, not just app latency, to catch this earlier."
---

## TL;DR

This Redis error means the server has reached its `maxmemory` limit and the active eviction policy does not allow the incoming write to succeed. In Laravel environments it often appears when queues, cache, Horizon metrics, and sessions share one Redis instance without memory isolation or when `noeviction` is left enabled for a workload that constantly writes cache data. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- Laravel logs show `OOM command not allowed when used memory > maxmemory`
- Queue dispatches or cache writes fail during traffic spikes or large jobs
- Redis memory usage sits at or near the configured limit for long periods
- Horizon metrics or cached reports grow quickly and never get evicted
- The issue is worst after enabling more caching without revisiting Redis capacity or eviction policy

If any of these symptoms look familiar, you're dealing with **redis oom maxmemory errors in laravel**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

This Redis error means the server has reached its `maxmemory` limit and the active eviction policy does not allow the incoming write to succeed. In Laravel environments it often appears when queues, cache, Horizon metrics, and sessions share one Redis instance without memory isolation or when `noeviction` is left enabled for a workload that constantly writes cache data. The application-level symptom may look like a queue outage or session failure, but the infrastructure issue is that Redis memory policy and workload shape do not match each other. If you do not separate critical data from disposable cache keys, one noisy feature can starve everything else.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Inspect `maxmemory`, `maxmemory-policy`, and key distribution so you know whether the failing writes are hitting a cache-heavy instance or one carrying critical queue and session data.

Inspect `maxmemory`, `maxmemory-policy`, and key distribution so you know whether the failing writes are hitting a cache-heavy instance or one carrying critical queue and session data.

### Step 2: Separate Redis roles where possible by giving cache, queues, and sessions different instances or at least different connections with different operational expectations.

Separate Redis roles where possible by giving cache, queues, and sessions different instances or at least different connections with different operational expectations.

### Step 3: Use an eviction policy appropriate for cache-heavy workloads such as `allkeys-lru` or `volatile-lru`, but avoid relying on eviction for queue data that must not disappear silently.

Use an eviction policy appropriate for cache-heavy workloads such as `allkeys-lru` or `volatile-lru`, but avoid relying on eviction for queue data that must not disappear silently.

### Step 4: Set realistic TTLs on cache entries and Horizon metrics so memory can be reclaimed automatically instead of growing forever under steady traffic.

Set realistic TTLs on cache entries and Horizon metrics so memory can be reclaimed automatically instead of growing forever under steady traffic.

### Step 5: Increase Redis memory only after you understand the growth pattern, because simply adding RAM can delay the incident while unbounded keys continue accumulating.

Increase Redis memory only after you understand the growth pattern, because simply adding RAM can delay the incident while unbounded keys continue accumulating.

### Step 6: After the fix, monitor memory usage, evictions, and application error rates together so you can verify that Laravel write traffic is stable under peak production load.

After the fix, monitor memory usage, evictions, and application error rates together so you can verify that Laravel write traffic is stable under peak production load.

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
# .env\nCACHE_STORE=redis\nQUEUE_CONNECTION=redis\nSESSION_DRIVER=redis\n\n# redis.conf\nmaxmemory 512mb\nmaxmemory-policy noeviction\n\nCache::put('heavy-report:' . $id, $hugePayload, now()->addDay());
```

### After (Fixed)

```php
# cache redis instance\nmaxmemory 1gb\nmaxmemory-policy allkeys-lru\n\n# queue/session redis instance\nmaxmemory 512mb\nmaxmemory-policy noeviction\n\nCache::put('heavy-report:' . $id, $compactPayload, now()->addMinutes(30));
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

### Is `noeviction` always wrong for Laravel Redis servers?

No. It can be the right choice for queues, sessions, and locks where silent eviction would be worse than a loud failure. The problem comes when you mix disposable cache data with critical queue data on the same instance and expect one policy to fit both. In that case Laravel needs either separate Redis roles or much more intentional TTL and memory design.

### Why does Redis OOM sometimes break queues before I notice cache problems?

Because queue dispatches and Horizon bookkeeping are write-heavy and often occur continuously under load. A full Redis instance may still serve some reads while rejecting every new write. That makes the queue system look broken first, even though the real issue is shared memory exhaustion. Watch Redis memory and write error rates, not just app latency, to catch this earlier.
