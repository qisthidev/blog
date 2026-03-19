---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T22:24:07.778Z
title: "Redis READONLY on Laravel Writes to Replica: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - production
  - debugging
  - devops-and-infrastructure
  - infrastructure
  - redis
  - failover
  - horizon
description: "This Redis error appears when Laravel sends a write command to a replica instead of the current primary node. In production this usually happens after a fa..."
faqs:
  - question: "Why do some Laravel pages still work when Redis says it is read-only?"
    answer: "Because not every request performs a write. Reads like cached lookups may continue to succeed against a replica, while writes such as session persistence, queue dispatching, cache updates, locks, and Horizon metrics fail immediately. That makes the incident look partial or random. If one code path writes and another only reads, both can hit the same Redis host and behave very differently."
  - question: "Do I need to restart Laravel workers after fixing a Redis writer endpoint?"
    answer: "Usually yes. Queue workers and Horizon processes can keep old configuration in memory even after you update environment variables. Clear the config cache, then restart Horizon or your queue workers so every long-running process reconnects using the corrected endpoint. Otherwise the web app may recover while workers continue writing to the stale replica target."
---

## TL;DR

This Redis error appears when Laravel sends a write command to a replica instead of the current primary node. In production this usually happens after a failover, a misconfigured managed Redis endpoint, or an app configuration that points all traffic at a read-only replica address. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- Laravel logs show `READONLY You can't write against a read only replica` during cache or queue operations
- Horizon dashboards stop updating even though workers are still running
- Session writes fail after a Redis failover or maintenance window
- Read-only commands such as `GET` keep working while `SET`, `LPUSH`, or `HSET` fail
- The issue started after switching to a managed Redis cluster, Sentinel, or replicated service endpoint

If any of these symptoms look familiar, you're dealing with **redis readonly on laravel writes to replica**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

This Redis error appears when Laravel sends a write command to a replica instead of the current primary node. In production this usually happens after a failover, a misconfigured managed Redis endpoint, or an app configuration that points all traffic at a read-only replica address. Queue pushes, cache writes, session updates, and Horizon metrics all fail because they require write access. The bug often survives deploys because the environment variables look valid, but the hostname behind them is no longer the writable node after a topology change or manual promotion.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Identify whether your application is connected to a primary endpoint, a replica endpoint, or a stale DNS target by checking the exact Redis host in the active Laravel configuration.

Identify whether your application is connected to a primary endpoint, a replica endpoint, or a stale DNS target by checking the exact Redis host in the active Laravel configuration.

### Step 2: Use the managed service's writer endpoint or a properly configured Sentinel primary name for cache, queue, session, and Horizon write traffic rather than a node-specific replica host.

Use the managed service's writer endpoint or a properly configured Sentinel primary name for cache, queue, session, and Horizon write traffic rather than a node-specific replica host.

### Step 3: Separate read and write connections only when your application and client library explicitly support that topology, because Laravel queue and session traffic must always hit a writable node.

Separate read and write connections only when your application and client library explicitly support that topology, because Laravel queue and session traffic must always hit a writable node.

### Step 4: Clear and rebuild Laravel configuration cache after changing Redis environment variables so the application does not keep using stale endpoints from a previous deploy.

Clear and rebuild Laravel configuration cache after changing Redis environment variables so the application does not keep using stale endpoints from a previous deploy.

### Step 5: Verify failover behavior in staging or a maintenance window so you know whether your service endpoint follows the new primary automatically after promotion.

Verify failover behavior in staging or a maintenance window so you know whether your service endpoint follows the new primary automatically after promotion.

### Step 6: Once writes work again, inspect failed jobs, stale sessions, and dropped cache operations so you can clean up the backlog created while the application was pointed at the replica.

Once writes work again, inspect failed jobs, stale sessions, and dropped cache operations so you can clean up the backlog created while the application was pointed at the replica.

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```dotenv
# .env\nREDIS_HOST=redis-replica.internal\nCACHE_STORE=redis\nQUEUE_CONNECTION=redis\nSESSION_DRIVER=redis\n\n// Queue push fails\nProcessInvoice::dispatch($invoice);
```

### After (Fixed)

```dotenv
# .env\nREDIS_HOST=redis-primary.internal\nCACHE_STORE=redis\nQUEUE_CONNECTION=redis\nSESSION_DRIVER=redis\n\n# Or use a managed writer endpoint\nREDIS_HOST=redis-writer.internal\n\nphp artisan config:clear\nphp artisan config:cache
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

### Why do some Laravel pages still work when Redis says it is read-only?

Because not every request performs a write. Reads like cached lookups may continue to succeed against a replica, while writes such as session persistence, queue dispatching, cache updates, locks, and Horizon metrics fail immediately. That makes the incident look partial or random. If one code path writes and another only reads, both can hit the same Redis host and behave very differently.

### Do I need to restart Laravel workers after fixing a Redis writer endpoint?

Usually yes. Queue workers and Horizon processes can keep old configuration in memory even after you update environment variables. Clear the config cache, then restart Horizon or your queue workers so every long-running process reconnects using the corrected endpoint. Otherwise the web app may recover while workers continue writing to the stale replica target.
