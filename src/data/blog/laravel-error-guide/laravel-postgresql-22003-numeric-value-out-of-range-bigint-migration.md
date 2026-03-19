---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T21:42:25.390Z
title: "SQLSTATE[22003] Numeric Value Out of Range Integer Overflow: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - postgresql
  - data-types
  - migrations
  - scalability
  - laravel-error-guide
  - error-handling
  - database
description: "PostgreSQL enforces strict numeric range limits for integer types. A standard integer column (int4) holds values from -2,147,483,648 to 2,147,483,647. When..."
faqs:
  - question: "When should I use bigint vs integer for PostgreSQL primary keys in Laravel?"
    answer: "Use bigint (Laravel's $table->id()) for any table that could grow to millions of rows: events, logs, analytics, transactions, messages, notifications. Use integer only for lookup tables with a known small number of rows (countries, categories, roles). Since Laravel 5.8, $table->id() already creates bigint, so this is only a concern for older applications. Storage difference is minimal: bigint uses 8 bytes vs 4 bytes for integer. The performance difference is negligible on modern hardware, so defaulting to bigint is the safer choice for all new tables."
  - question: "How do I safely migrate a PostgreSQL integer primary key to bigint in production?"
    answer: "ALTER TABLE ... ALTER COLUMN id TYPE bigint requires an ACCESS EXCLUSIVE lock and rewrites the entire table. For large tables (millions of rows), this can take minutes to hours and blocks all reads and writes. Strategies for production: (1) For tables under 1M rows, schedule during a maintenance window — it completes in seconds. (2) For larger tables, use pg_repack or a tool like pgloader to do an online conversion. (3) Create a new bigint column, backfill it, swap columns with renames, and update the sequence. (4) For very large tables, consider logical replication to a new table with the correct schema. Always test on a copy of production data first to estimate the time required."
---

## TL;DR

PostgreSQL enforces strict numeric range limits for integer types. A standard integer column (int4) holds values from -2,147,483,648 to 2,147,483,647. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- SQLSTATE[22003]: Numeric value out of range: ERROR: integer out of range
- Auto-incrementing primary key reaching the 2.1 billion integer limit on high-volume tables
- Financial calculations overflowing when multiplying prices by large quantities
- Unix timestamp storage failing for dates beyond 2038 (the Y2K38 problem)
- Batch import operations failing on records with large numeric values that exceed int4 range

If any of these symptoms look familiar, you're dealing with **sqlstate[22003] numeric value out of range integer overflow**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

PostgreSQL enforces strict numeric range limits for integer types. A standard integer column (int4) holds values from -2,147,483,648 to 2,147,483,647. When a value exceeds this range — most commonly an auto-incrementing primary key on a high-volume table, a financial calculation exceeding integer limits, or a Unix timestamp stored as integer — PostgreSQL rejects the operation with SQLSTATE[22003]. In Laravel, this becomes critical when tables with $table->id() (which creates a 4-byte integer by default) approach 2.1 billion rows, or when storing large numeric values like cent-based monetary amounts that exceed integer range during multiplication.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Identify the column causing the overflow: the error message references the specific table

Identify the column causing the overflow: the error message references the specific table — check the column type with \d+ tablename in psql

### Step 2: For ID columns approaching the limit, migrate from integer to bigint: ALTER TABLE tablename ALTER COLUMN id TYPE bigint

For ID columns approaching the limit, migrate from integer to bigint: ALTER TABLE tablename ALTER COLUMN id TYPE bigint

### Step 3: In Laravel migrations, use $table->bigIncrements('id') or $table->id() (which uses bigint since Laravel 5.8) for new tables expected to have high row counts

In Laravel migrations, use $table->bigIncrements('id') or $table->id() (which uses bigint since Laravel 5.8) for new tables expected to have high row counts

### Step 4: For existing tables, create a migration: DB::statement('ALTER TABLE tablename ALTER COLUMN id TYPE bigint')

For existing tables, create a migration: DB::statement('ALTER TABLE tablename ALTER COLUMN id TYPE bigint') — this rewrites the entire table, so schedule during maintenance windows

### Step 5: For financial columns, use decimal/numeric types: $table->decimal('amount', 19, 4) instead of integer to avoid overflow during calculations

For financial columns, use decimal/numeric types: $table->decimal('amount', 19, 4) instead of integer to avoid overflow during calculations

### Step 6: Monitor your sequence values: SELECT last_value FROM tablename_id_seq to check how close your auto-increment is to the integer limit

Monitor your sequence values: SELECT last_value FROM tablename_id_seq to check how close your auto-increment is to the integer limit

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// Problem: integer primary key approaching 2.1 billion limit
Schema::create('events', function (Blueprint $table) {
    $table->increments('id'); // creates int4, max ~2.1 billion
    $table->string('type');
    $table->timestamps();
});
// After 2+ billion inserts:
// SQLSTATE[22003]: integer out of range

// Or: financial calculation overflow
$total = $price * $quantity; // 50000 * 100000 = 5,000,000,000 > int4 max
```

### After (Fixed)

```php
// Fix 1: Use bigInteger for high-volume tables
Schema::create('events', function (Blueprint $table) {
    $table->id(); // bigint since Laravel 5.8
    $table->string('type');
    $table->timestamps();
});

// Fix 2: Migrate existing column from int to bigint
Schema::table('events', function (Blueprint $table) {
    // This rewrites the table — lock and maintenance window required
    DB::statement('ALTER TABLE events ALTER COLUMN id TYPE bigint');
});

// Fix 3: Use decimal for financial data
Schema::create('transactions', function (Blueprint $table) {
    $table->id();
    $table->decimal('amount', 19, 4); // handles very large amounts
    $table->decimal('quantity', 12, 2);
    $table->timestamps();
});

// Fix 4: Monitor sequence usage proactively
// Add this to your monitoring/health check
$seqInfo = DB::selectOne("
    SELECT
        schemaname,
        sequencename,
        last_value,
        CASE data_type
            WHEN 'integer' THEN round(last_value::numeric / 2147483647 * 100, 2)
            WHEN 'bigint' THEN round(last_value::numeric / 9223372036854775807 * 100, 6)
        END as usage_pct
    FROM pg_sequences
    WHERE sequencename = 'events_id_seq'
");
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

### When should I use bigint vs integer for PostgreSQL primary keys in Laravel?

Use bigint (Laravel's $table->id()) for any table that could grow to millions of rows: events, logs, analytics, transactions, messages, notifications. Use integer only for lookup tables with a known small number of rows (countries, categories, roles). Since Laravel 5.8, $table->id() already creates bigint, so this is only a concern for older applications. Storage difference is minimal: bigint uses 8 bytes vs 4 bytes for integer. The performance difference is negligible on modern hardware, so defaulting to bigint is the safer choice for all new tables.

### How do I safely migrate a PostgreSQL integer primary key to bigint in production?

ALTER TABLE ... ALTER COLUMN id TYPE bigint requires an ACCESS EXCLUSIVE lock and rewrites the entire table. For large tables (millions of rows), this can take minutes to hours and blocks all reads and writes. Strategies for production: (1) For tables under 1M rows, schedule during a maintenance window — it completes in seconds. (2) For larger tables, use pg_repack or a tool like pgloader to do an online conversion. (3) Create a new bigint column, backfill it, swap columns with renames, and update the sequence. (4) For very large tables, consider logical replication to a new table with the correct schema. Always test on a copy of production data first to estimate the time required.
