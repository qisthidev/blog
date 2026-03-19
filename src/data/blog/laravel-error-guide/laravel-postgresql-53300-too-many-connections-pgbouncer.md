---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T21:42:25.386Z
title: "SQLSTATE[53300] Too Many Connections in PostgreSQL with Laravel: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - postgresql
  - pgbouncer
  - connection-pooling
  - devops-and-infrastructure
  - laravel-error-guide
  - error-handling
  - database
description: "PostgreSQL has a hard limit on simultaneous connections defined by max_connections in postgresql.conf (default: 100). When all connection slots are occupie..."
faqs:
  - question: "Should I use PgBouncer transaction or session mode with Laravel?"
    answer: "Use transaction mode for Laravel applications. In transaction mode, PgBouncer assigns a server connection only for the duration of a transaction, then returns it to the pool. This gives the best connection multiplexing ratio. Session mode keeps the connection for the entire client session (PHP request), which provides less pooling benefit. The only caveat with transaction mode is that prepared statements, SET commands, and LISTEN/NOTIFY don't work across transactions — but Laravel's query builder doesn't rely on these features by default."
  - question: "How do I monitor PostgreSQL connection usage in Laravel?"
    answer: "Run this query periodically: SELECT count(*) as total, state, usename, application_name FROM pg_stat_activity GROUP BY state, usename, application_name ORDER BY total DESC. This shows you exactly which applications are consuming connections and whether they're active or idle. In Laravel, you can create a health check endpoint that reports this data. Also monitor PgBouncer stats via SHOW POOLS and SHOW STATS commands on the PgBouncer admin console. Set up alerts when connection usage exceeds 80% of max_connections."
---

## TL;DR

PostgreSQL has a hard limit on simultaneous connections defined by max_connections in postgresql.conf (default: 100). When all connection slots are occupied — by web workers, queue workers, cron jobs, and other services — new connection attempts fail with SQLSTATE[53300]. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- SQLSTATE[53300]: too many connections: FATAL: sorry, too many clients already
- Intermittent database connection failures during traffic spikes
- Queue workers failing to start with connection refused errors
- New deployments causing connection storms when all workers restart simultaneously
- PostgreSQL logs showing FATAL: remaining connection slots are reserved for superuser connections

If any of these symptoms look familiar, you're dealing with **sqlstate[53300] too many connections in postgresql with laravel**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

PostgreSQL has a hard limit on simultaneous connections defined by max_connections in postgresql.conf (default: 100). When all connection slots are occupied — by web workers, queue workers, cron jobs, and other services — new connection attempts fail with SQLSTATE[53300]. In Laravel, each PHP-FPM worker, queue worker, and scheduled task opens its own database connection. With Octane or Swoole, connections persist across requests, which can exhaust the pool if not managed properly. The fix is implementing connection pooling with PgBouncer, which multiplexes hundreds of application connections over a small number of actual PostgreSQL connections.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Check current connections: run SELECT count(*), state FROM pg_stat_activity GROUP BY state to see how many connections are active vs idle

Check current connections: run SELECT count(*), state FROM pg_stat_activity GROUP BY state to see how many connections are active vs idle

### Step 2: Identify connection consumers: check the count of PHP-FPM workers (ps aux | grep php-fpm), queue workers, and any other services connecting to PostgreSQL

Identify connection consumers: check the count of PHP-FPM workers (ps aux | grep php-fpm), queue workers, and any other services connecting to PostgreSQL

### Step 3: Install PgBouncer as a connection pooler: configure it to sit between Laravel and PostgreSQL, listening on port 6432

Install PgBouncer as a connection pooler: configure it to sit between Laravel and PostgreSQL, listening on port 6432

### Step 4: Configure PgBouncer pool_mode: use 'transaction' mode for Laravel (releases connections after each transaction)

Configure PgBouncer pool_mode: use 'transaction' mode for Laravel (releases connections after each transaction) — this can reduce 200 app connections to 20 PostgreSQL connections

### Step 5: Update Laravel .env to point to PgBouncer: set DB_PORT=6432 instead of 5432

Update Laravel .env to point to PgBouncer: set DB_PORT=6432 instead of 5432

### Step 6: Add connection lifetime limits: set PGBOUNCER_MAX_CLIENT_CONN=200, PGBOUNCER_DEFAULT_POOL_SIZE=20, and configure server_idle_timeout=600 to reclaim idle connections

Add connection lifetime limits: set PGBOUNCER_MAX_CLIENT_CONN=200, PGBOUNCER_DEFAULT_POOL_SIZE=20, and configure server_idle_timeout=600 to reclaim idle connections

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// .env — connecting directly to PostgreSQL (no pooling)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=myapp
DB_USERNAME=myapp
DB_PASSWORD=secret

// With 50 PHP-FPM workers + 10 queue workers = 60 connections
// Add scheduled tasks, migrations, tinker = easily 80+ connections
// Traffic spike doubles FPM workers = 120 connections > max_connections(100)
```

### After (Fixed)

```php
// .env — route through PgBouncer
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=6432  // PgBouncer port
DB_DATABASE=myapp
DB_USERNAME=myapp
DB_PASSWORD=secret

// pgbouncer.ini
// [databases]
// myapp = host=127.0.0.1 port=5432 dbname=myapp
//
// [pgbouncer]
// listen_port = 6432
// pool_mode = transaction
// max_client_conn = 400
// default_pool_size = 25
// min_pool_size = 5
// reserve_pool_size = 5
// server_idle_timeout = 600

// config/database.php — disable persistent connections with PgBouncer
'pgsql' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST'),
    'port' => env('DB_PORT', '6432'),
    'database' => env('DB_DATABASE'),
    'username' => env('DB_USERNAME'),
    'password' => env('DB_PASSWORD'),
    'options' => [
        PDO::ATTR_PERSISTENT => false, // important for PgBouncer
    ],
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

### Should I use PgBouncer transaction or session mode with Laravel?

Use transaction mode for Laravel applications. In transaction mode, PgBouncer assigns a server connection only for the duration of a transaction, then returns it to the pool. This gives the best connection multiplexing ratio. Session mode keeps the connection for the entire client session (PHP request), which provides less pooling benefit. The only caveat with transaction mode is that prepared statements, SET commands, and LISTEN/NOTIFY don't work across transactions — but Laravel's query builder doesn't rely on these features by default.

### How do I monitor PostgreSQL connection usage in Laravel?

Run this query periodically: SELECT count(*) as total, state, usename, application_name FROM pg_stat_activity GROUP BY state, usename, application_name ORDER BY total DESC. This shows you exactly which applications are consuming connections and whether they're active or idle. In Laravel, you can create a health check endpoint that reports this data. Also monitor PgBouncer stats via SHOW POOLS and SHOW STATS commands on the PgBouncer admin console. Set up alerts when connection usage exceeds 80% of max_connections.
