---
author: Qisthi Ramadhani
pubDatetime: 2026-03-07T00:00:00.000Z
title: "Laravel Queue Deadlock: Redis vs Database Driver (SQLSTATE 40001)"
featured: false
draft: false
tags:
  - laravel
  - redis
  - database
  - performance
  - debugging
  - laravel-and-php
description: "Resolve Laravel queue deadlocks (Serialization failure: 1213). Compare Redis vs Database drivers, locking mechanisms, and the SKIP LOCKED fix for PostgreSQL and MySQL."
faqs:
  - question: "Why do I get SQLSTATE[40001]: 1213 Deadlock found in Laravel?"
    answer: "This occurs when multiple queue workers using the database driver contend for the same row locks simultaneously during the SELECT ... FOR UPDATE operation."
  - question: "Can reducing Supervisor numprocs fix queue deadlocks?"
    answer: "Yes. Reducing numprocs to 1 eliminates concurrency for that specific queue, removing the possibility of lock contention, though it reduces processing throughput."
  - question: "Is Redis immune to all deadlocks in Laravel?"
    answer: "Redis eliminates deadlocks at the queue processing level. However, if the PHP code executed inside your Job accesses the database concurrently, you can still trigger database-level deadlocks."
---

> **TL;DR:** Laravel queue deadlocks (`SQLSTATE[40001]: Serialization failure: 1213 Deadlock found`) occur when multiple workers using the `database` driver contend for the same job lock. **The definitive fix for high-concurrency production environments is to switch to the `redis` driver.** If you must use the database driver, upgrade to MySQL 8.0.1+ or PostgreSQL 9.5+ to utilize the `SKIP LOCKED` feature, and ensure jobs are dispatched *after* database transactions commit.

## Understanding the Queue Deadlock

In Laravel applications, deadlocks typically manifest under heavy load when numerous supervisor processes (e.g., `numprocs > 1`) attempt to process queued jobs simultaneously.

When the `database` driver fetches a job, it executes a `SELECT ... FOR UPDATE` query. This acquires an exclusive row lock (and potentially index locks). A deadlock occurs when:
1. Worker A locks Job 1.
2. Worker B locks Job 2.
3. Worker A needs a lock on Job 2 (or a related index) to delete Job 1.
4. Worker B needs a lock on Job 1.

The database engine detects this circular dependency and forcefully terminates one transaction, throwing the infamous `1213 Deadlock found` exception.

## Redis vs. Database Queue Driver Comparison

To prevent architectural bottlenecks, evaluating the underlying locking mechanism of your queue driver is critical.

| Feature | Database Driver (`database`) | Redis Driver (`redis`) |
| :--- | :--- | :--- |
| **Locking Mechanism** | Row-level `FOR UPDATE` (SQL) | Atomic operations (`LPOP`, `ZADD`) |
| **Deadlock Risk** | High (in older DB versions / high concurrency) | Non-existent (at the queue level) |
| **Concurrency Limit** | Bound by DB connection pool & transaction locks | Extremely high (single-threaded event loop) |
| **Memory Usage** | Minimal (stored on disk) | High (stored in RAM) |
| **Best Use Case** | Low-traffic apps, local development | High-traffic production APIs, heavy background processing |

## 3 Strategies to Fix Laravel Queue Deadlocks

### 1. The Definitive Solution: Migrate to Redis

Because Redis executes commands atomically in a single thread, it completely bypasses SQL transaction deadlocks for queue management.

**Implementation:**
1. Install the Predis or PhpRedis extension.
2. Update your `.env`:
```env
QUEUE_CONNECTION=redis
```
3. Ensure your `config/database.php` has a valid Redis configuration.

*Note: You may still see deadlock errors if the logic inside the job itself causes a database deadlock, but the queue worker fetching process will be stable.*

### 2. The Database Upgrade: `SKIP LOCKED`

If migrating to Redis is not feasible, ensure your database engine supports `SKIP LOCKED`.

Starting with Laravel 5.6+, the framework natively utilizes `SKIP LOCKED` when fetching jobs, provided the database engine supports it. This instructs the database to ignore rows that are already locked by another transaction, drastically reducing contention.

**Requirements:**
*   MySQL 8.0.1+
*   PostgreSQL 9.5+
*   MariaDB 10.6+

### 3. Dispatching Jobs Outside Transactions

A common architectural flaw is queuing jobs within active database transactions. If the transaction takes time or rolls back, the worker might try to process a job that doesn't yet logically exist or contend for shared schema locks.

**Bad Practice:**
```php
DB::transaction(function () use ($user) {
    $user->update(['status' => 'active']);
    SendWelcomeEmail::dispatch($user); // Dispatched inside transaction!
});
```

**Best Practice (using `afterCommit`):**
```php
DB::transaction(function () use ($user) {
    $user->update(['status' => 'active']);
    SendWelcomeEmail::dispatch($user)->afterCommit();
});
```
