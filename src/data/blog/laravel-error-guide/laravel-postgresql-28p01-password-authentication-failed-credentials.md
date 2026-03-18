---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T21:42:25.389Z
title: "SQLSTATE[28P01] Password Authentication Failed for User: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - postgresql
  - authentication
  - connection
  - security
  - laravel-error-guide
  - error-handling
  - database
description: "PostgreSQL rejects the connection with SQLSTATE[28P01] when the provided username/password combination doesn't match any entry in pg_hba.conf authenticatio..."
faqs:
  - question: "Why does my PostgreSQL password work in psql but not in Laravel?"
    answer: "pg_hba.conf rules are matched by connection type and source address. When you connect via psql on the same machine, the 'local' rule applies (often using 'peer' authentication which uses your OS username, ignoring the password). When Laravel connects via TCP (host), a different rule applies that requires password authentication. Check pg_hba.conf for both 'local' and 'host' entries. Also, psql may use a different port or host than Laravel. Verify by matching DB_HOST, DB_PORT, DB_USERNAME from your .env exactly in your psql command: psql -h 127.0.0.1 -p 5432 -U myapp -d myapp."
  - question: "How do I handle special characters in PostgreSQL passwords in Laravel .env?"
    answer: "Wrap the password value in double quotes in your .env file, for example DB_PASSWORD='my#complex$pass' (with the value wrapped in quotes). Without quotes, characters like # (comment marker), $ (variable expansion in some shells), and whitespace will cause the value to be truncated or misinterpreted. Laravel Dotenv parser handles quoted values correctly, preserving all special characters. If your password contains quote characters, escape them with a backslash. For maximum safety, use only alphanumeric characters and standard symbols in database passwords."
---

## TL;DR

PostgreSQL rejects the connection with SQLSTATE[28P01] when the provided username/password combination doesn't match any entry in pg_hba.conf authentication rules or the pg_authid system catalog. In Laravel, this typically happens when .env credentials don't match the PostgreSQL user's actual password, when pg_hba.conf requires a different authentication method (e.g., peer or ident instead of md5/scram-sha-256), when the database user doesn't exist, or when using Docker where the POSTGRES_PASSWORD is set on first initialization only and changing it in docker-compose.yml after volume creation has no effect.. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- SQLSTATE[28P01]: Invalid authorization specification: password authentication failed for user
- Laravel app failing to connect after changing database password in .env without updating PostgreSQL
- Docker containers failing to connect after rebuilding with different POSTGRES_PASSWORD
- Connection working via psql but failing from Laravel due to different pg_hba.conf rules for different hosts
- CI/CD pipeline failures when database credentials don't match the PostgreSQL instance

If any of these symptoms look familiar, you're dealing with **sqlstate[28p01] password authentication failed for user**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

PostgreSQL rejects the connection with SQLSTATE[28P01] when the provided username/password combination doesn't match any entry in pg_hba.conf authentication rules or the pg_authid system catalog. In Laravel, this typically happens when .env credentials don't match the PostgreSQL user's actual password, when pg_hba.conf requires a different authentication method (e.g., peer or ident instead of md5/scram-sha-256), when the database user doesn't exist, or when using Docker where the POSTGRES_PASSWORD is set on first initialization only and changing it in docker-compose.yml after volume creation has no effect.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Verify credentials manually: run psql -h DB_HOST -p DB_PORT -U DB_USERNAME -d DB_DATABASE to test the connection with the same credentials as your .env

Verify credentials manually: run psql -h DB_HOST -p DB_PORT -U DB_USERNAME -d DB_DATABASE to test the connection with the same credentials as your .env

### Step 2: Check pg_hba.conf authentication method: ensure the rule for your application's IP uses md5 or scram-sha-256, not peer or ident which ignore passwords

Check pg_hba.conf authentication method: ensure the rule for your application's IP uses md5 or scram-sha-256, not peer or ident which ignore passwords

### Step 3: Reset the PostgreSQL user password: ALTER USER myapp WITH PASSWORD 'newpassword' and update .env to match

Reset the PostgreSQL user password: ALTER USER myapp WITH PASSWORD 'newpassword' and update .env to match

### Step 4: For Docker, if changing POSTGRES_PASSWORD doesn't work, delete the PostgreSQL volume and recreate: docker-compose down -v && docker-compose up -d

For Docker, if changing POSTGRES_PASSWORD doesn't work, delete the PostgreSQL volume and recreate: docker-compose down -v && docker-compose up -d

### Step 5: Verify .env is being read correctly: run php artisan tinker and check config('database.connections.pgsql.password') to ensure the password isn't being truncated or escaped

Verify .env is being read correctly: run php artisan tinker and check config('database.connections.pgsql.password') to ensure the password isn't being truncated or escaped

### Step 6: Check for special characters in passwords: if your password contains #, $, or quotes, ensure they're properly escaped in .env (wrap the value in double quotes)

Check for special characters in passwords: if your password contains #, $, or quotes, ensure they're properly escaped in .env (wrap the value in double quotes)

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// .env — credentials don't match PostgreSQL
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=myapp
DB_USERNAME=myapp
DB_PASSWORD=wrong_password  // doesn't match PostgreSQL user

// Or: password with special characters not escaped
DB_PASSWORD=p@ss#word$123  // # starts a comment in .env!
```

### After (Fixed)

```php
// Fix 1: Correct credentials in .env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=myapp
DB_USERNAME=myapp
DB_PASSWORD="p@ss#word$123"  // wrap in quotes for special chars

// Fix 2: Reset PostgreSQL password
// psql -U postgres
// ALTER USER myapp WITH PASSWORD 'new_secure_password';

// Fix 3: Check pg_hba.conf rules
// /etc/postgresql/16/main/pg_hba.conf
// # TYPE  DATABASE  USER    ADDRESS         METHOD
// host    myapp     myapp   127.0.0.1/32    scram-sha-256
// host    myapp     myapp   172.0.0.0/8     scram-sha-256  # Docker network

// Fix 4: Verify in tinker
// php artisan tinker
// >>> config('database.connections.pgsql.password')
// => "p@ss#word$123"  // verify it matches PostgreSQL
// >>> DB::connection()->getPdo()  // test connection
```

---

## Key Takeaways

- **Identify before you fix**: Use the symptoms checklist above to confirm you're dealing with this specific issue, not a different problem with similar error messages
- **Test under load**: Many of these issues only surface under concurrent access — always verify your fix with load testing before deploying to production
- **Monitor after deployment**: Set up alerting for the symptoms listed above so you catch regressions early

---

## Difficulty Level

**Beginner**

This guide is suitable for developers new to this topic. You should be comfortable with basic framework concepts and have a development environment set up. No prior experience with the specific error or optimization technique is required.

---

## Frequently Asked Questions

### Why does my PostgreSQL password work in psql but not in Laravel?

pg_hba.conf rules are matched by connection type and source address. When you connect via psql on the same machine, the 'local' rule applies (often using 'peer' authentication which uses your OS username, ignoring the password). When Laravel connects via TCP (host), a different rule applies that requires password authentication. Check pg_hba.conf for both 'local' and 'host' entries. Also, psql may use a different port or host than Laravel. Verify by matching DB_HOST, DB_PORT, DB_USERNAME from your .env exactly in your psql command: psql -h 127.0.0.1 -p 5432 -U myapp -d myapp.

### How do I handle special characters in PostgreSQL passwords in Laravel .env?

Wrap the password value in double quotes in your .env file, for example DB_PASSWORD='my#complex$pass' (with the value wrapped in quotes). Without quotes, characters like # (comment marker), $ (variable expansion in some shells), and whitespace will cause the value to be truncated or misinterpreted. Laravel Dotenv parser handles quoted values correctly, preserving all special characters. If your password contains quote characters, escape them with a backslash. For maximum safety, use only alphanumeric characters and standard symbols in database passwords.
