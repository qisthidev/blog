---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T21:42:25.386Z
title: "SQLSTATE[57014] Query Canceled Due to Statement Timeout: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - postgresql
  - performance
  - query-optimization
  - database
  - laravel-error-guide
  - error-handling
description: "PostgreSQL cancels queries that exceed the configured statement_timeout value. This timeout is a server-side safeguard that kills long-running queries to p..."
faqs:
  - question: "How do I set statement_timeout per query in Laravel PostgreSQL?"
    answer: "Use DB::statement(\"SET LOCAL statement_timeout = '60s'\") inside a DB::transaction() block. The LOCAL keyword ensures the timeout only applies to the current transaction, not the entire connection. This is safer than connection-level settings because it automatically resets when the transaction completes. For Eloquent queries outside transactions, use DB::statement(\"SET statement_timeout = '60s'\") before the query and reset it after with DB::statement(\"RESET statement_timeout\")."
  - question: "Why does my query work locally but timeout in production PostgreSQL?"
    answer: "Production databases typically have stricter statement_timeout settings configured via postgresql.conf, RDS parameter groups, or PgBouncer. Local PostgreSQL usually has statement_timeout set to 0 (unlimited). Additionally, production databases handle concurrent connections which cause lock contention, making queries slower. Your local database likely has less data, warmer caches, and no competing queries. Always test with production-sized datasets and concurrent load before deploying query-heavy features."
---

## TL;DR

PostgreSQL cancels queries that exceed the configured statement_timeout value. This timeout is a server-side safeguard that kills long-running queries to prevent a single runaway query from monopolizing database resources, locking tables indefinitely, or exhausting connection pool slots. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- SQLSTATE[57014]: Query canceled: ERROR: canceling statement due to statement timeout in Laravel logs
- Eloquent queries that work in development but fail in production under load
- Background jobs or artisan commands failing intermittently on large datasets
- Slow API endpoints that randomly return 500 errors during peak traffic
- Database migration commands timing out on large tables with millions of rows

If any of these symptoms look familiar, you're dealing with **sqlstate[57014] query canceled due to statement timeout**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

PostgreSQL cancels queries that exceed the configured statement_timeout value. This timeout is a server-side safeguard that kills long-running queries to prevent a single runaway query from monopolizing database resources, locking tables indefinitely, or exhausting connection pool slots. In Laravel applications, this commonly surfaces during complex Eloquent queries with multiple joins, unoptimized WHERE clauses on large tables, or when running database-intensive jobs without adjusting the timeout. The default statement_timeout is 0 (disabled) on most PostgreSQL installations, but production environments typically enforce 30-60 second limits through pgbouncer, RDS parameter groups, or postgresql.conf.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Check the current statement_timeout: run DB::select("SHOW statement_timeout") to see the active limit for your connection

Check the current statement_timeout: run DB::select("SHOW statement_timeout") to see the active limit for your connection

### Step 2: Identify the slow query: enable query logging with DB::enableQueryLog() or use Laravel Debugbar to find queries exceeding the timeout threshold

Identify the slow query: enable query logging with DB::enableQueryLog() or use Laravel Debugbar to find queries exceeding the timeout threshold

### Step 3: Optimize the query: add database indexes, reduce joins, use chunking for large datasets with Model::chunk(1000, fn) instead of Model::all()

Optimize the query: add database indexes, reduce joins, use chunking for large datasets with Model::chunk(1000, fn) instead of Model::all()

### Step 4: For migrations on large tables, temporarily increase the timeout: DB::statement('SET statement_timeout = 0') before the migration, reset after

For migrations on large tables, temporarily increase the timeout: DB::statement('SET statement_timeout = 0') before the migration, reset after

### Step 5: For long-running jobs, configure a dedicated database connection in config/database.php with a higher statement_timeout via the 'options' key

For long-running jobs, configure a dedicated database connection in config/database.php with a higher statement_timeout via the 'options' key

### Step 6: Add query-level timeout control: use DB::statement("SET LOCAL statement_timeout = '120s'") inside a transaction for specific operations

Add query-level timeout control: use DB::statement("SET LOCAL statement_timeout = '120s'") inside a transaction for specific operations

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// Problem: Eloquent query times out on large table
$users = User::where('status', 'active')
    ->whereHas('orders', function ($q) {
        $q->where('total', '>', 100);
    })
    ->with('orders.items.product')
    ->get(); // SQLSTATE[57014] on 500K+ rows
```

### After (Fixed)

```php
// Fix 1: Optimize with chunking and targeted eager loading
User::where('status', 'active')
    ->whereHas('orders', function ($q) {
        $q->where('total', '>', 100);
    })
    ->with(['orders' => fn ($q) => $q->where('total', '>', 100)->select('id', 'user_id', 'total')])
    ->chunk(500, function ($users) {
        foreach ($users as $user) {
            ProcessUserExport::dispatch($user);
        }
    });

// Fix 2: Dedicated connection for long queries
// config/database.php
'pgsql_long' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST'),
    'database' => env('DB_DATABASE'),
    'username' => env('DB_USERNAME'),
    'password' => env('DB_PASSWORD'),
    'options' => [
        PDO::ATTR_TIMEOUT => 300,
    ],
    'search_path' => 'public',
],
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

### How do I set statement_timeout per query in Laravel PostgreSQL?

Use DB::statement("SET LOCAL statement_timeout = '60s'") inside a DB::transaction() block. The LOCAL keyword ensures the timeout only applies to the current transaction, not the entire connection. This is safer than connection-level settings because it automatically resets when the transaction completes. For Eloquent queries outside transactions, use DB::statement("SET statement_timeout = '60s'") before the query and reset it after with DB::statement("RESET statement_timeout").

### Why does my query work locally but timeout in production PostgreSQL?

Production databases typically have stricter statement_timeout settings configured via postgresql.conf, RDS parameter groups, or PgBouncer. Local PostgreSQL usually has statement_timeout set to 0 (unlimited). Additionally, production databases handle concurrent connections which cause lock contention, making queries slower. Your local database likely has less data, warmer caches, and no competing queries. Always test with production-sized datasets and concurrent load before deploying query-heavy features.
