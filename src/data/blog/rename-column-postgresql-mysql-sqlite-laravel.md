---
author: Qisthi Ramadhani
pubDatetime: 2026-03-12T00:00:00.000Z
title: "Rename a Column in PostgreSQL, MySQL, SQLite (and Laravel Migrations)"
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
  - migration
description: "The syntax for renaming columns differs wildly across databases. Here is the right way in PostgreSQL, MySQL, SQLite, and Laravel migrations."
---

Somewhere around the third month of a project, someone on the team decides that the `name` column on the `users` table should really be `full_name`. It's a small change in concept, but the SQL syntax for renaming a column is one of those things that _refuses_ to be consistent across database systems. I've been bitten by this enough times that I keep a mental cheat sheet. Here's that cheat sheet, formalized.

## The PostgreSQL Way: Clean `ALTER TABLE ... RENAME COLUMN`

PostgreSQL has supported the clean, ANSI-style `RENAME COLUMN` syntax since version 9.6, and it's exactly what you'd hope for -- simple, readable, and atomic.

```sql
-- Rename a single column
ALTER TABLE users RENAME COLUMN name TO full_name;

-- The COLUMN keyword is optional but improves readability
ALTER TABLE users RENAME name TO full_name;
```

The operation is _metadata-only_, meaning PostgreSQL simply updates the system catalog entry for the column name. It does not rewrite the table data, so this executes instantly even on tables with billions of rows.

> _Note:_ Renaming a column does _not_ automatically update views, functions, or triggers that reference the old name. You'll need to manually update those or they'll break on next execution. Always search your codebase for the old column name after renaming.

If the column is referenced by an index, PostgreSQL handles that gracefully -- the index continues to work because it references the column's internal ID, not its name. However, the index _name_ itself won't change, so you may want to rename the index separately for clarity:

```sql
-- Optionally rename the associated index for consistency
ALTER INDEX idx_users_name RENAME TO idx_users_full_name;
```

## The MySQL Way: `RENAME COLUMN` (8.0+) or the Legacy `CHANGE`

MySQL's history with column renaming is a story of gradual improvement. Before MySQL 8.0, the _only_ way to rename a column was the `CHANGE` keyword, which awkwardly required you to re-specify the column's entire data type definition.

```sql
-- MySQL 8.0+ (the clean way)
ALTER TABLE users RENAME COLUMN name TO full_name;

-- MySQL 5.7 and earlier (the legacy way)
-- You MUST re-declare the full column definition
ALTER TABLE users CHANGE name full_name VARCHAR(255) NOT NULL;
```

The legacy `CHANGE` syntax is error-prone because if you accidentally specify a _different_ data type or forget the `NOT NULL` constraint, MySQL will silently alter the column definition along with the name. I've seen this cause production data issues more than once.

> _Note:_ If you're still on MySQL 5.7, always run `SHOW CREATE TABLE users;` before and after a `CHANGE` statement to verify the column definition wasn't accidentally modified.

Since MySQL 8.0, `RENAME COLUMN` is the clear winner. It's safe, it only changes the name, and it won't silently alter your data type. If your project supports MySQL 8.0+, there's no reason to use `CHANGE` for renames.

## The SQLite Approach: `RENAME COLUMN` (3.25.0+) or Recreate the Table

SQLite was notoriously limited in its `ALTER TABLE` support for years. The ability to rename a column was only added in version 3.25.0 (released September 2018). If you're on a modern version, it's straightforward:

```sql
-- SQLite 3.25.0+ (the modern way)
ALTER TABLE users RENAME COLUMN name TO full_name;
```

For older versions of SQLite, the only option is the _table recreation_ workaround. This involves creating a new table with the desired schema, copying the data, dropping the old table, and renaming the new one:

```sql
-- SQLite < 3.25.0 (the painful workaround)
BEGIN TRANSACTION;

CREATE TABLE users_new (
    id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL
);

INSERT INTO users_new (id, full_name, email)
    SELECT id, name, email FROM users;

DROP TABLE users;

ALTER TABLE users_new RENAME TO users;

COMMIT;
```

This approach is fragile and requires you to replicate every index, trigger, and constraint on the new table. Wrapping it in a transaction is _critical_ to avoid data loss if something goes wrong mid-operation.

> _Note:_ Even on SQLite 3.25.0+, `RENAME COLUMN` will update references in triggers and views within the same database. This is actually _better_ behavior than PostgreSQL in this specific regard.

## The Laravel Way: `$table->renameColumn()`

Inside a Laravel application, column renames belong in migrations. The `renameColumn()` method on the `Blueprint` handles all the cross-database differences for you.

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('name', 'full_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('full_name', 'name');
        });
    }
};
```

If you need to rename multiple columns in the same migration, call `renameColumn()` for each one within the same closure. Laravel will execute them in order.

```php
Schema::table('orders', function (Blueprint $table) {
    $table->renameColumn('qty', 'quantity');
    $table->renameColumn('desc', 'description');
});
```

### Why This is Superior

1. **Database Agnostic**: Laravel emits the correct SQL for your configured driver. On MySQL 5.7, it uses `CHANGE`; on MySQL 8.0+, PostgreSQL, and modern SQLite, it uses `RENAME COLUMN`. You don't need to think about it.
2. **Testable**: The migration runs identically on your production PostgreSQL and your test suite's in-memory SQLite database, so you catch schema issues before deployment.
3. **Reversible**: The `down()` method provides a clear rollback path. If the rename causes issues, `php artisan migrate:rollback` undoes it cleanly.

## Quick Reference

| Database | Syntax | Version Required | Rewrites Table? |
|---|---|---|---|
| PostgreSQL | `ALTER TABLE t RENAME COLUMN a TO b` | 9.6+ | No (metadata only) |
| MySQL 8.0+ | `ALTER TABLE t RENAME COLUMN a TO b` | 8.0+ | No |
| MySQL 5.7 | `ALTER TABLE t CHANGE a b TYPE` | Any | Depends on engine |
| SQLite 3.25+ | `ALTER TABLE t RENAME COLUMN a TO b` | 3.25.0+ | No |
| SQLite (old) | Recreate table manually | Any | Yes (full copy) |
| Laravel | `$table->renameColumn('a', 'b')` | All drivers | Handled automatically |

**My recommendation**: Always use Laravel's `renameColumn()` in your migrations -- it abstracts away the version-specific syntax differences and gives you a reversible, version-controlled operation. For raw SQL outside of Laravel, use `ALTER TABLE ... RENAME COLUMN` on any modern database version. And regardless of your approach, _always_ search your codebase for the old column name afterward; no ORM or migration tool can update your application code for you.
