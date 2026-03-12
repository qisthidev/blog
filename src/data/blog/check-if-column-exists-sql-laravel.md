---
author: Qisthi Ramadhani
pubDatetime: 2026-03-12T00:00:00.000Z
title: "Check if a Column Exists in PostgreSQL, MySQL, SQLite, and Laravel"
featured: false
draft: true
tags:
  - postgresql
  - mysql
  - sqlite
  - laravel
  - sql
  - database
  - database-management
description: "Learn to check column existence using information_schema, pg_attribute, PRAGMA table_info, and Laravel's Schema::hasColumn()."
---

You're writing a migration that adds a new column, but your staging environment already has it from a hotfix someone ran manually last week. Or maybe you're building a plugin system that needs to gracefully handle different schema versions. Either way, you need to _check if a column exists_ before blindly running an `ALTER TABLE` that will blow up with a duplicate column error. Let's look at the right way to do this across every major database.

## The PostgreSQL Way: `information_schema` and `pg_attribute`

PostgreSQL gives you two solid approaches. The first uses the ANSI-standard `information_schema`, which is portable. The second digs into the native `pg_attribute` catalog, which is faster and more flexible.

### Using `information_schema.columns`

This is the approach I reach for first when writing cross-database compatible code:

```sql
-- Check if a column exists using the ANSI standard
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'phone_number'
);
```

This returns a clean boolean -- `t` if the column exists, `f` if it doesn't.

### Using `pg_attribute` (Native Catalog)

When you need the absolute fastest check and you're committed to PostgreSQL, querying the system catalog directly avoids the overhead of the `information_schema` views:

```sql
-- Faster, PostgreSQL-native check using pg_attribute
SELECT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.users'::regclass
      AND attname = 'phone_number'
      AND NOT attisdropped
);
```

The `NOT attisdropped` clause is important -- PostgreSQL doesn't physically remove dropped columns immediately; it marks them as dropped internally. Without this filter, you might get false positives for columns that were already removed.

> _Note: The `::regclass` cast is a convenient PostgreSQL shorthand that resolves the table name to its internal OID. It will throw an error if the table doesn't exist, so use the `information_schema` approach if the table itself might not be present._

## The MySQL Way: `information_schema.columns`

MySQL uses the same `information_schema` standard, but with one key difference: the `table_schema` field refers to the _database name_, not a schema namespace.

```sql
-- Check if a column exists in MySQL
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_schema = 'my_app_production'
  AND table_name = 'users'
  AND column_name = 'phone_number';
```

A count of `1` means the column exists; `0` means it doesn't. You can also wrap this in a conditional for use in stored procedures:

```sql
-- Conditional ALTER TABLE in MySQL (inside a stored procedure)
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'phone_number'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN phone_number VARCHAR(20)',
    'SELECT "Column already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

The `DATABASE()` function returns the currently selected database, which keeps the query portable across environments.

## The SQLite Approach: `PRAGMA table_info()`

SQLite doesn't support `information_schema`. Instead, it provides the `PRAGMA table_info()` command, which returns one row per column in the specified table. You need to parse the result to check for your column.

```sql
-- List all columns in the users table
PRAGMA table_info('users');
```

This returns a result set with columns: `cid`, `name`, `type`, `notnull`, `dflt_value`, and `pk`. To check for a specific column, you filter by name. However, `PRAGMA` results can't be used directly in a `WHERE` clause in standard SQLite SQL. The practical approach is to handle this in application code or use a subquery trick:

```sql
-- Check if column exists in SQLite (works in newer versions)
SELECT COUNT(*)
FROM pragma_table_info('users')
WHERE name = 'phone_number';
```

> _Note: The `pragma_table_info()` table-valued function syntax requires SQLite 3.16.0 or later (2017). If you're on an older version, you'll need to parse the `PRAGMA` output in your application code._

## The Laravel Way: `Schema::hasColumn()`

Inside a Laravel application, reaching for raw SQL to check column existence is almost always unnecessary. The `Schema` facade provides clean, expressive methods that work identically across all supported database drivers.

```php
use Illuminate\Support\Facades\Schema;

// Check if a single column exists
if (Schema::hasColumn('users', 'phone_number')) {
    // The column exists, safe to query or skip migration
}

// Check if multiple columns exist at once
if (Schema::hasColumns('users', ['phone_number', 'avatar_url'])) {
    // Both columns exist
}
```

### Why This is Superior in Laravel

1. **Database Agnostic**: Whether your production runs PostgreSQL and your tests run SQLite, `Schema::hasColumn()` handles the dialect differences for you. No need to maintain separate SQL for each driver.
2. **Testable**: Your migration and seeder tests work seamlessly with in-memory SQLite databases. Raw `pg_attribute` queries would fail in that context.
3. **Readable**: The intent is immediately clear to every developer on your team -- no need to decode catalog table queries.

### Practical Use Case: Conditional Migration

The most common scenario is adding a column only if it doesn't already exist, which prevents migration failures on environments where the column was added manually:

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'phone_number')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('phone_number', 20)->nullable()->after('email');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'phone_number')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('phone_number');
            });
        }
    }
};
```

## Quick Reference

| Method | Best For | Portability | Notes |
|---|---|---|---|
| `information_schema.columns` | Cross-database SQL | PostgreSQL, MySQL, SQL Server | ANSI standard; `table_schema` meaning varies |
| `pg_attribute` catalog | PostgreSQL-only scripts | PostgreSQL only | Fastest; filter `attisdropped` |
| `PRAGMA table_info()` | SQLite environments | SQLite only | Table-valued function in 3.16.0+ |
| `Schema::hasColumn()` | Laravel applications | All Laravel drivers | Also supports `hasColumns()` for batch checks |

**My recommendation**: Always use `Schema::hasColumn()` inside a Laravel application -- it handles the cross-database complexity for you and keeps your migrations testable. For raw SQL scripts outside of a framework, prefer `information_schema.columns` for portability. Only drop down to `pg_attribute` when you're writing PostgreSQL-specific tooling and need the performance edge.
