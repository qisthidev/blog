---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T21:42:25.388Z
title: "SQLSTATE[HY000] General Error 7 No Connection to the Server: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - postgresql
  - connection
  - reliability
  - devops-and-infrastructure
  - laravel-error-guide
  - error-handling
  - database
description: "SQLSTATE[HY000] with error code 7 indicates that an established PostgreSQL connection was lost during query execution. Unlike SQLSTATE[08006] (connection r..."
faqs:
  - question: "How do I handle PostgreSQL connection drops in Laravel Octane?"
    answer: "Laravel Octane keeps the application in memory across requests, so a database connection established on the first request may be stale by the hundredth request. Add a connection check to the RequestReceived event in config/octane.php: listen to the RequestReceived event and call DB::connection()->getPdo() wrapped in a try-catch — if it throws, call DB::reconnect(). Also configure Octane to flush the database manager between requests by adding it to the 'flush' array. Set max_requests in Octane to periodically restart workers, which establishes fresh connections."
  - question: "What causes intermittent 'no connection to the server' errors in Laravel with PgBouncer?"
    answer: "PgBouncer's server_idle_timeout (default: 600 seconds) closes idle PostgreSQL connections. If a Laravel PHP-FPM worker has been idle longer than this timeout, its next database query will use a PgBouncer connection that maps to a closed backend connection. PgBouncer detects this and creates a new backend connection, but the timing can cause transient errors. Fix by setting server_idle_timeout higher than your longest idle period, or configure server_check_query = 'SELECT 1' in PgBouncer to validate connections before handing them to clients."
---

## TL;DR

SQLSTATE[HY000] with error code 7 indicates that an established PostgreSQL connection was lost during query execution. Unlike SQLSTATE[08006] (connection refused) which fails before connecting, this error means the connection was successfully established but dropped mid-session. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- SQLSTATE[HY000]: General error: 7 no connection to the server
- Intermittent database errors that resolve themselves after a few seconds
- Errors appearing exactly at PgBouncer's server_idle_timeout interval
- Connection failures during database failover or maintenance windows
- Laravel Octane workers producing database errors after idle periods with no traffic

If any of these symptoms look familiar, you're dealing with **sqlstate[hy000] general error 7 no connection to the server**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

SQLSTATE[HY000] with error code 7 indicates that an established PostgreSQL connection was lost during query execution. Unlike SQLSTATE[08006] (connection refused) which fails before connecting, this error means the connection was successfully established but dropped mid-session. Common causes include PostgreSQL server restarts during deployments, PgBouncer server_idle_timeout killing idle connections, cloud provider maintenance events (RDS, Cloud SQL), network interruptions between the application and database server, or PHP-FPM workers holding persistent connections that become stale. In Laravel with Octane or Swoole, this is especially common because connections persist across requests.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Enable Laravel's automatic reconnection: set 'reconnect' => true in config/database.php (Laravel 10+) or implement a custom reconnect middleware

Enable Laravel's automatic reconnection: set 'reconnect' => true in config/database.php (Laravel 10+) or implement a custom reconnect middleware

### Step 2: Handle lost connections in application code: catch QueryException and check for error code HY000, then retry with DB::reconnect()

Handle lost connections in application code: catch QueryException and check for error code HY000, then retry with DB::reconnect()

### Step 3: Configure PgBouncer server_idle_timeout to be longer than your typical idle period, or configure client-side keepalive queries

Configure PgBouncer server_idle_timeout to be longer than your typical idle period, or configure client-side keepalive queries

### Step 4: For Laravel Octane, add database reconnection to the RequestReceived listener to verify the connection is alive before each request

For Laravel Octane, add database reconnection to the RequestReceived listener to verify the connection is alive before each request

### Step 5: Set PDO::ATTR_TIMEOUT in your database config to detect dropped connections faster instead of waiting for the TCP timeout

Set PDO::ATTR_TIMEOUT in your database config to detect dropped connections faster instead of waiting for the TCP timeout

### Step 6: For cloud databases (RDS, Cloud SQL), configure automatic failover handling with a DNS-based endpoint that updates during failover events

For cloud databases (RDS, Cloud SQL), configure automatic failover handling with a DNS-based endpoint that updates during failover events

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// Problem: persistent connection goes stale
// config/database.php
'pgsql' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST'),
    'database' => env('DB_DATABASE'),
    // No reconnect or timeout handling
    // Connection dies after server restart or idle timeout
];
```

### After (Fixed)

```php
// Fix: Add reconnection and timeout handling
// config/database.php
'pgsql' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST'),
    'database' => env('DB_DATABASE'),
    'username' => env('DB_USERNAME'),
    'password' => env('DB_PASSWORD'),
    'options' => [
        PDO::ATTR_TIMEOUT => 5,
        PDO::ATTR_PERSISTENT => false,
    ],
],

// App\Providers\AppServiceProvider.php
use Illuminate\Database\QueryException;

public function boot(): void
{
    // Auto-reconnect on lost connection
    DB::listen(function ($query) {
        // monitoring
    });
}

// Middleware or helper for retry on lost connection
function withDbRetry(callable $operation, int $retries = 3): mixed
{
    for ($i = 1; $i <= $retries; $i++) {
        try {
            return $operation();
        } catch (QueryException $e) {
            if (str_contains($e->getMessage(), 'no connection to the server') && $i < $retries) {
                DB::reconnect();
                continue;
            }
            throw $e;
        }
    }
}

// Usage
$users = withDbRetry(fn() => User::where('active', true)->get());
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

### How do I handle PostgreSQL connection drops in Laravel Octane?

Laravel Octane keeps the application in memory across requests, so a database connection established on the first request may be stale by the hundredth request. Add a connection check to the RequestReceived event in config/octane.php: listen to the RequestReceived event and call DB::connection()->getPdo() wrapped in a try-catch — if it throws, call DB::reconnect(). Also configure Octane to flush the database manager between requests by adding it to the 'flush' array. Set max_requests in Octane to periodically restart workers, which establishes fresh connections.

### What causes intermittent 'no connection to the server' errors in Laravel with PgBouncer?

PgBouncer's server_idle_timeout (default: 600 seconds) closes idle PostgreSQL connections. If a Laravel PHP-FPM worker has been idle longer than this timeout, its next database query will use a PgBouncer connection that maps to a closed backend connection. PgBouncer detects this and creates a new backend connection, but the timing can cause transient errors. Fix by setting server_idle_timeout higher than your longest idle period, or configure server_check_query = 'SELECT 1' in PgBouncer to validate connections before handing them to clients.
