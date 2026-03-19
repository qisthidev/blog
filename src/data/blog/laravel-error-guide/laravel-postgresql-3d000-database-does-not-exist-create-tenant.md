---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T21:42:25.389Z
title: "SQLSTATE[3D000] Database Does Not Exist: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - postgresql
  - multi-tenancy
  - setup
  - database
  - laravel-error-guide
  - error-handling
description: "PostgreSQL throws SQLSTATE[3D000] when a connection attempt specifies a database name that doesn't exist on the server. Unlike MySQL which can auto-create..."
faqs:
  - question: "How do I create a PostgreSQL database from Laravel without using the command line?"
    answer: "Connect to the 'postgres' maintenance database (which always exists) and execute CREATE DATABASE. You cannot create a database while connected to it, so you need a separate connection. Configure a 'pgsql_admin' connection in config/database.php with 'database' => 'postgres', then use DB::connection('pgsql_admin')->statement('CREATE DATABASE \"myapp\"'). Note: CREATE DATABASE cannot run inside a transaction, so don't wrap it in DB::transaction(). The user specified in the connection must have CREATEDB privilege or be a superuser."
  - question: "How do I handle dynamic database creation in Laravel multi-tenant applications?"
    answer: "Use a dedicated admin connection to the postgres maintenance database for CREATE DATABASE operations. After creating the database, configure a tenant connection dynamically: config(['database.connections.tenant.database' => $dbName]), then run migrations with Artisan::call('migrate', ['--database' => 'tenant']). Use DB::purge('tenant') to reset the connection when switching between tenants. Popular packages like stancl/tenancy and spatie/laravel-multitenancy automate this pattern. For PostgreSQL schema-based multi-tenancy (single database, multiple schemas), use SET search_path instead of separate databases."
---

## TL;DR

PostgreSQL throws SQLSTATE[3D000] when a connection attempt specifies a database name that doesn't exist on the server. Unlike MySQL which can auto-create databases in some configurations, PostgreSQL requires databases to be explicitly created with CREATE DATABASE before they can be used. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- SQLSTATE[3D000]: Invalid catalog name: ERROR: database "myapp" does not exist
- php artisan migrate failing on fresh project setup because the database doesn't exist
- Multi-tenant application failing when provisioning a new tenant's database dynamically
- CI/CD pipeline failures because the test database wasn't created in the build step
- Connection errors after cloning a project when the .env DB_DATABASE doesn't match any existing database

If any of these symptoms look familiar, you're dealing with **sqlstate[3d000] database does not exist**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

PostgreSQL throws SQLSTATE[3D000] when a connection attempt specifies a database name that doesn't exist on the server. Unlike MySQL which can auto-create databases in some configurations, PostgreSQL requires databases to be explicitly created with CREATE DATABASE before they can be used. In Laravel, this commonly occurs during initial project setup when the database hasn't been created yet, in multi-tenant applications that dynamically create per-tenant databases, or when the DB_DATABASE environment variable is misconfigured. The error prevents any database connection from being established.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Create the database manually: run createdb myapp from the command line or CREATE DATABASE myapp in psql as a superuser

Create the database manually: run createdb myapp from the command line or CREATE DATABASE myapp in psql as a superuser

### Step 2: For automated setup, add a database creation step: use DB::connection('pgsql_admin')->statement('CREATE DATABASE myapp') with a connection configured to use the postgres default database

For automated setup, add a database creation step: use DB::connection('pgsql_admin')->statement('CREATE DATABASE myapp') with a connection configured to use the postgres default database

### Step 3: For multi-tenant apps, create databases programmatically: connect to the 'postgres' maintenance database first, then issue CREATE DATABASE tenant_xxx

For multi-tenant apps, create databases programmatically: connect to the 'postgres' maintenance database first, then issue CREATE DATABASE tenant_xxx

### Step 4: In Docker, use POSTGRES_DB environment variable on the PostgreSQL container to auto-create the database on first startup

In Docker, use POSTGRES_DB environment variable on the PostgreSQL container to auto-create the database on first startup

### Step 5: Check your .env file: ensure DB_DATABASE matches an existing database

Check your .env file: ensure DB_DATABASE matches an existing database — run psql -l to list all databases on the server

### Step 6: For CI/CD, add a setup step: createdb -U postgres test_myapp or include it in your docker-compose.yml test configuration

For CI/CD, add a setup step: createdb -U postgres test_myapp or include it in your docker-compose.yml test configuration

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// Problem: connecting to a database that doesn't exist
// .env
DB_DATABASE=myapp  // doesn't exist on the server

// Multi-tenant: dynamic database creation fails
config(['database.connections.tenant.database' => "tenant_{$id}"]);
DB::connection('tenant')->getPdo();
// SQLSTATE[3D000] if the database hasn't been created
```

### After (Fixed)

```php
// Fix 1: Create database in artisan command or setup script
Artisan::command('db:create', function () {
    $database = config('database.connections.pgsql.database');
    $connection = config('database.connections.pgsql');
    $connection['database'] = 'postgres'; // connect to maintenance DB

    $pdo = new PDO(
        "pgsql:host={$connection['host']};port={$connection['port']};dbname=postgres",
        $connection['username'],
        $connection['password']
    );
    $pdo->exec("CREATE DATABASE \"{$database}\"");
    $this->info("Database {$database} created successfully.");
});

// Fix 2: Multi-tenant database provisioning
function createTenantDatabase(string $tenantId): void
{
    $dbName = "tenant_{$tenantId}";
    // Must use the maintenance connection (postgres DB)
    DB::connection('pgsql_admin')->statement(
        "CREATE DATABASE \"{$dbName}\" OWNER \"app_user\""
    );

    // Run migrations on the new database
    config(["database.connections.tenant.database" => $dbName]);
    Artisan::call('migrate', [
        '--database' => 'tenant',
        '--force' => true,
    ]);
}

// Docker: auto-create in docker-compose.yml
// postgres:
//   image: postgres:16
//   environment:
//     POSTGRES_DB: myapp
//     POSTGRES_USER: myapp
//     POSTGRES_PASSWORD: secret
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

### How do I create a PostgreSQL database from Laravel without using the command line?

Connect to the 'postgres' maintenance database (which always exists) and execute CREATE DATABASE. You cannot create a database while connected to it, so you need a separate connection. Configure a 'pgsql_admin' connection in config/database.php with 'database' => 'postgres', then use DB::connection('pgsql_admin')->statement('CREATE DATABASE "myapp"'). Note: CREATE DATABASE cannot run inside a transaction, so don't wrap it in DB::transaction(). The user specified in the connection must have CREATEDB privilege or be a superuser.

### How do I handle dynamic database creation in Laravel multi-tenant applications?

Use a dedicated admin connection to the postgres maintenance database for CREATE DATABASE operations. After creating the database, configure a tenant connection dynamically: config(['database.connections.tenant.database' => $dbName]), then run migrations with Artisan::call('migrate', ['--database' => 'tenant']). Use DB::purge('tenant') to reset the connection when switching between tenants. Popular packages like stancl/tenancy and spatie/laravel-multitenancy automate this pattern. For PostgreSQL schema-based multi-tenancy (single database, multiple schemas), use SET search_path instead of separate databases.
