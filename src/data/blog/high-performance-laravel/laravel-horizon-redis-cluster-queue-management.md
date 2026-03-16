---
author: Qisthi Ramadhani
pubDatetime: 2026-03-16T12:20:41.103Z
title: "Laravel Horizon Redis Cluster Queue Management Issues: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - php
  - redis
  - horizon
  - queues
  - devops-and-infrastructure
  - high-performance-laravel
  - performance
description: "Laravel Horizon requires specific Redis configuration when running against a Redis Cluster. The default Redis connection in Laravel uses single-node comman..."
faqs:
  - question: "What is a Redis hash tag and why does Horizon need it?"
    answer: "A Redis hash tag is a portion of the key name enclosed in curly braces (e.g., {horizon}:metrics). Redis Cluster uses hash slots to distribute keys across nodes, but keys with the same hash tag are guaranteed to land on the same node. Horizon needs this because it uses multi-key operations (MGET, pipelines) that require all involved keys to be on the same node."
  - question: "Can I use Laravel Horizon with AWS ElastiCache Redis Cluster?"
    answer: "Yes, but you must use the cluster configuration endpoint (ending in .clustercfg.use1.cache.amazonaws.com), not individual node endpoints. Set REDIS_CLIENT=phpredis (not predis, which has limited cluster support), configure the 'clusters' key in database.php, and use hash tag prefixes for Horizon keys."
---

## TL;DR

Laravel Horizon requires specific Redis configuration when running against a Redis Cluster. The default Redis connection in Laravel uses single-node commands (KEYS, SCAN) that don't work in cluster mode because keys are distributed across hash slots on different nodes. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- CROSSSLOT Keys in request don't hash to the same slot error
- Horizon dashboard shows no workers or supervisors
- Horizon metrics (throughput, runtime, wait) always show zero
- horizon:snapshot artisan command fails silently
- Jobs process correctly but Horizon cannot track them
- MOVED or ASK redirections in Redis logs

If any of these symptoms look familiar, you're dealing with **laravel horizon redis cluster queue management issues**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

Laravel Horizon requires specific Redis configuration when running against a Redis Cluster. The default Redis connection in Laravel uses single-node commands (KEYS, SCAN) that don't work in cluster mode because keys are distributed across hash slots on different nodes. Horizon's dashboard, metrics, and auto-balancing features all rely on these commands. Without the correct cluster configuration — using redis arrays prefix, phredis cluster option, or predis cluster — Horizon will fail to discover workers, show empty dashboards, or throw CROSSSLOT errors.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Configure Redis Cluster connection in config/database.php using the 'clusters' key instead of individual connections

Configure Redis Cluster connection in config/database.php using the 'clusters' key instead of individual connections

### Step 2: Set the 'options.cluster' to 'redis' (for phpredis) in your Redis cluster config

Set the 'options.cluster' to 'redis' (for phpredis) in your Redis cluster config

### Step 3: Ensure all Horizon keys use the same hash tag prefix: configure 'options.prefix' with a hash tag like '{horizon}:' so all Horizon keys land on the same node

Ensure all Horizon keys use the same hash tag prefix: configure 'options.prefix' with a hash tag like '{horizon}:' so all Horizon keys land on the same node

### Step 4: Update config/horizon.php to use the cluster connection name

Update config/horizon.php to use the cluster connection name

### Step 5: Verify cluster connectivity with redis-cli -c -h <node> CLUSTER INFO

Verify cluster connectivity with redis-cli -c -h <node> CLUSTER INFO

### Step 6: If using AWS ElastiCache or DigitalOcean Managed Redis, ensure the cluster endpoint (not individual node endpoints) is in your REDIS_HOST

If using AWS ElastiCache or DigitalOcean Managed Redis, ensure the cluster endpoint (not individual node endpoints) is in your REDIS_HOST

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// config/database.php — BROKEN with Redis Cluster
'redis' => [
    'client' => env('REDIS_CLIENT', 'phpredis'),
    'default' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'port' => env('REDIS_PORT', '6379'),
    ],
],

// config/horizon.php
'use' => 'default', // single-node connection can't do KEYS/SCAN
```

### After (Fixed)

```php
// config/database.php — CORRECT Redis Cluster config
'redis' => [
    'client' => env('REDIS_CLIENT', 'phpredis'),
    'clusters' => [
        'default' => [
            [
                'host' => env('REDIS_HOST', '127.0.0.1'),
                'port' => env('REDIS_PORT', '6379'),
                'database' => 0,
            ],
        ],
        'options' => [
            'cluster' => 'redis',
            'prefix' => '{horizon}:', // hash tag ensures same slot
        ],
    ],
],

// config/horizon.php
'use' => 'default', // now points to cluster config
'prefix' => '{horizon}:',
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

### What is a Redis hash tag and why does Horizon need it?

A Redis hash tag is a portion of the key name enclosed in curly braces (e.g., {horizon}:metrics). Redis Cluster uses hash slots to distribute keys across nodes, but keys with the same hash tag are guaranteed to land on the same node. Horizon needs this because it uses multi-key operations (MGET, pipelines) that require all involved keys to be on the same node.

### Can I use Laravel Horizon with AWS ElastiCache Redis Cluster?

Yes, but you must use the cluster configuration endpoint (ending in .clustercfg.use1.cache.amazonaws.com), not individual node endpoints. Set REDIS_CLIENT=phpredis (not predis, which has limited cluster support), configure the 'clusters' key in database.php, and use hash tag prefixes for Horizon keys.
