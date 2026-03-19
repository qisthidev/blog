---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T21:42:25.387Z
title: "SQLSTATE[23505] Duplicate Key Violates Unique Constraint: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - postgresql
  - database
  - eloquent
  - concurrency
  - laravel-error-guide
  - error-handling
description: "PostgreSQL enforces unique constraints at the database level, rejecting any INSERT that would create a duplicate value in a column or combination of column..."
faqs:
  - question: "What is the difference between firstOrCreate and upsert in Laravel PostgreSQL?"
    answer: "firstOrCreate() performs a SELECT then conditionally an INSERT — two separate queries with a race window between them. Under concurrent requests, both can pass the SELECT check and both attempt to INSERT, causing SQLSTATE[23505]. upsert() uses PostgreSQL's INSERT ... ON CONFLICT DO UPDATE syntax, which is a single atomic SQL statement — the database handles the race condition internally. Use upsert() for high-concurrency scenarios and firstOrCreate() for low-concurrency cases where the simpler API is preferred."
  - question: "How do I handle bulk inserts with potential duplicates in Laravel PostgreSQL?"
    answer: "Use Model::upsert() for bulk operations where you want to update existing rows on conflict, or Model::insertOrIgnore() when you want to silently skip duplicates. Both generate PostgreSQL-native ON CONFLICT clauses. For large datasets (10K+ rows), chunk the upsert into batches of 500-1000 to avoid memory issues and long-running transactions. Example: collect($records)->chunk(500)->each(fn ($chunk) => Model::upsert($chunk->toArray(), ['unique_col'], ['update_col']))."
---

## TL;DR

PostgreSQL enforces unique constraints at the database level, rejecting any INSERT that would create a duplicate value in a column or combination of columns with a UNIQUE index. In Laravel, this error surfaces when using create(), insert(), or firstOrCreate() in concurrent scenarios where two requests simultaneously check for existence and then both attempt to insert. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- SQLSTATE[23505]: Unique violation: ERROR: duplicate key value violates unique constraint
- Intermittent failures in firstOrCreate() or updateOrCreate() under concurrent requests
- User registration failing with duplicate email errors despite client-side validation
- Batch import jobs failing partway through on duplicate records
- Race conditions in API endpoints that create resources with unique slugs or codes

If any of these symptoms look familiar, you're dealing with **sqlstate[23505] duplicate key violates unique constraint**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

PostgreSQL enforces unique constraints at the database level, rejecting any INSERT that would create a duplicate value in a column or combination of columns with a UNIQUE index. In Laravel, this error surfaces when using create(), insert(), or firstOrCreate() in concurrent scenarios where two requests simultaneously check for existence and then both attempt to insert. The race window between the SELECT check and the INSERT is the root cause — neither request sees the other's uncommitted row. Laravel's updateOrCreate() without proper database-level handling is equally vulnerable to this race condition.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Identify the constraint: the error message includes the constraint name

Identify the constraint: the error message includes the constraint name — find it with \d+ tablename in psql to see which columns are involved

### Step 2: Use PostgreSQL-native upsert via Laravel's upsert() method: Model::upsert($data, ['unique_column'], ['columns_to_update'])

Use PostgreSQL-native upsert via Laravel's upsert() method: Model::upsert($data, ['unique_column'], ['columns_to_update'])

### Step 3: For firstOrCreate race conditions, wrap in a try-catch that handles 23505: catch the UniqueConstraintViolationException (Laravel 10+) and retry with a find

For firstOrCreate race conditions, wrap in a try-catch that handles 23505: catch the UniqueConstraintViolationException (Laravel 10+) and retry with a find

### Step 4: Add a unique index at the database level if not already present

Add a unique index at the database level if not already present — never rely solely on application-level uniqueness checks under concurrent load

### Step 5: For bulk inserts, use insertOrIgnore() when you want to silently skip duplicates, or upsert() when you want to update existing rows

For bulk inserts, use insertOrIgnore() when you want to silently skip duplicates, or upsert() when you want to update existing rows

### Step 6: Consider using advisory locks for complex multi-step creation flows: DB::select('SELECT pg_advisory_xact_lock(?)', [crc32($uniqueValue)])

Consider using advisory locks for complex multi-step creation flows: DB::select('SELECT pg_advisory_xact_lock(?)', [crc32($uniqueValue)])

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// RACE CONDITION: two requests can pass the check simultaneously
$user = User::where('email', $email)->first();
if (!$user) {
    $user = User::create(['email' => $email, 'name' => $name]);
    // SQLSTATE[23505] if another request inserted between check and create
}
```

### After (Fixed)

```php
// SAFE: Use upsert or catch the violation
use Illuminate\Database\UniqueConstraintViolationException;

// Option 1: upsert (INSERT ... ON CONFLICT)
User::upsert(
    ['email' => $email, 'name' => $name],
    ['email'],           // unique columns
    ['name']             // columns to update on conflict
);

// Option 2: firstOrCreate with retry on race condition
try {
    $user = User::firstOrCreate(
        ['email' => $email],
        ['name' => $name]
    );
} catch (UniqueConstraintViolationException) {
    // Another request won the race — just fetch the existing row
    $user = User::where('email', $email)->firstOrFail();
}
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

### What is the difference between firstOrCreate and upsert in Laravel PostgreSQL?

firstOrCreate() performs a SELECT then conditionally an INSERT — two separate queries with a race window between them. Under concurrent requests, both can pass the SELECT check and both attempt to INSERT, causing SQLSTATE[23505]. upsert() uses PostgreSQL's INSERT ... ON CONFLICT DO UPDATE syntax, which is a single atomic SQL statement — the database handles the race condition internally. Use upsert() for high-concurrency scenarios and firstOrCreate() for low-concurrency cases where the simpler API is preferred.

### How do I handle bulk inserts with potential duplicates in Laravel PostgreSQL?

Use Model::upsert() for bulk operations where you want to update existing rows on conflict, or Model::insertOrIgnore() when you want to silently skip duplicates. Both generate PostgreSQL-native ON CONFLICT clauses. For large datasets (10K+ rows), chunk the upsert into batches of 500-1000 to avoid memory issues and long-running transactions. Example: collect($records)->chunk(500)->each(fn ($chunk) => Model::upsert($chunk->toArray(), ['unique_col'], ['update_col'])).
