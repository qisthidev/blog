---
author: Qisthi Ramadhani
pubDatetime: 2026-03-12T00:00:00.000Z
title: "Truncate vs Delete: Clearing Tables in PostgreSQL, MySQL, SQLite, and Laravel"
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
description: "Understand when to use TRUNCATE vs DELETE, restart identity sequences, CASCADE behavior, and the Laravel truncate approach."
---

You need to wipe all rows from a table. Maybe you're resetting a staging environment, clearing a job queue, or purging stale session data. You reach for `DELETE FROM sessions` -- and then wonder if `TRUNCATE` would be faster. The answer is almost always _yes_, but the differences between the two go far deeper than performance. And if you're using SQLite, you might not even have `TRUNCATE` as an option. Let's break it down.

## TRUNCATE vs DELETE: The Fundamental Difference

Before diving into database-specific syntax, it's worth understanding _why_ these two operations exist and when each is the right tool.

`DELETE FROM table` is a _DML_ (Data Manipulation Language) operation. It scans the table, removes rows one by one (or in batches), fires any `BEFORE DELETE` and `AFTER DELETE` triggers for each row, and logs every individual deletion to the transaction log. You can roll it back, and you can add a `WHERE` clause to selectively remove rows.

`TRUNCATE TABLE` is a _DDL_ (Data Definition Language) operation. It deallocates the data pages in bulk without scanning individual rows. It doesn't fire row-level triggers, generates minimal transaction log entries, and is dramatically faster on large tables. But it's an all-or-nothing operation -- no `WHERE` clause, no row-by-row processing.

| Aspect | `DELETE` | `TRUNCATE` |
|---|---|---|
| Speed on large tables | Slow (row-by-row) | Fast (page deallocation) |
| Fires row triggers | Yes | No |
| Supports `WHERE` | Yes | No |
| Transaction log | Full (every row logged) | Minimal |
| Resets auto-increment/identity | No | Yes (usually) |
| Rollback support | Yes | Database-dependent |

## The PostgreSQL Way: `TRUNCATE` with Full Transaction Support

PostgreSQL's `TRUNCATE` is the most feature-rich of the three major databases. It's transactional, supports cascading, and gives you explicit control over identity sequences.

```sql
-- Basic truncate (fast, removes all rows)
TRUNCATE TABLE sessions;

-- Reset the auto-increment sequence back to 1
TRUNCATE TABLE sessions RESTART IDENTITY;

-- Keep the current sequence value (continue from where you left off)
TRUNCATE TABLE sessions CONTINUE IDENTITY;

-- Cascade to all tables with foreign keys referencing this table
TRUNCATE TABLE users CASCADE;

-- Truncate multiple tables at once
TRUNCATE TABLE sessions, cache, jobs RESTART IDENTITY;
```

The `RESTART IDENTITY` option is critical for staging environment resets. Without it, if your `users` table had an auto-increment sequence at 50,000 and you truncate, the next inserted row would get id 50,001. With `RESTART IDENTITY`, it resets to 1.

> _Note:_ `TRUNCATE` in PostgreSQL is _fully transactional_. You can wrap it in a `BEGIN ... ROLLBACK` block and undo it completely. This is a significant difference from MySQL, where `TRUNCATE` causes an implicit commit.

`TRUNCATE ... CASCADE` is powerful but demands caution. It truncates every table that has a foreign key dependency on the target table. On a complex schema, this can cascade through dozens of tables. Always check dependencies first:

```sql
-- Check which tables reference 'users' before cascading
SELECT conrelid::regclass AS dependent_table, conname AS constraint_name
FROM pg_constraint
WHERE confrelid = 'users'::regclass AND contype = 'f';
```

## The MySQL Way: `TRUNCATE` with Implicit Commit

MySQL's `TRUNCATE` is fast and effective, but it behaves more like a DDL statement than a DML one. The most important thing to understand is that it performs an _implicit commit_ -- you cannot roll it back within a transaction.

```sql
-- Basic truncate (auto-increment resets to 1 automatically)
TRUNCATE TABLE sessions;
```

That's it. MySQL's `TRUNCATE` doesn't support `CASCADE`, `RESTART IDENTITY`, or truncating multiple tables in one statement. It _automatically_ resets the `AUTO_INCREMENT` counter to 1, which is the default behavior you'd expect.

If the table has foreign key constraints pointing to it, MySQL will refuse to truncate:

```sql
-- This fails if other tables have foreign keys referencing 'users'
TRUNCATE TABLE users;
-- ERROR 1701: Cannot truncate a table referenced in a foreign key constraint

-- Workaround: disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;
```

If you need to selectively delete rows or want rollback safety, use `DELETE` instead:

```sql
-- Rollback-safe alternative to truncate in MySQL
START TRANSACTION;
DELETE FROM sessions WHERE created_at < '2026-01-01';
-- ROLLBACK; if something went wrong
COMMIT;
```

> _Note:_ In MySQL, `TRUNCATE TABLE` drops and recreates the table internally. This means it resets not just the auto-increment counter, but also any per-table statistics that InnoDB maintains. After truncating a heavily-used table, your first few queries might have suboptimal execution plans until the optimizer collects fresh statistics.

## The SQLite Approach: There is No TRUNCATE

SQLite does _not_ have a `TRUNCATE TABLE` command. The equivalent operation is `DELETE FROM` without a `WHERE` clause:

```sql
-- SQLite's equivalent of TRUNCATE
DELETE FROM sessions;
```

SQLite is smart about this -- when it detects a `DELETE FROM` with no `WHERE` clause, it internally optimizes the operation to be similar to a truncate (deallocating pages rather than deleting rows one by one). So the performance difference is smaller than you might expect.

However, the auto-increment behavior is different. SQLite tracks auto-increment values in an internal `sqlite_sequence` table. A bare `DELETE FROM` does _not_ reset it:

```sql
-- Delete all rows (auto-increment does NOT reset)
DELETE FROM users;

-- Manually reset the auto-increment counter
DELETE FROM sqlite_sequence WHERE name = 'users';

-- Or do both in one script
DELETE FROM users;
DELETE FROM sqlite_sequence WHERE name = 'users';
```

> _Note:_ The `sqlite_sequence` table only exists for tables that use `AUTOINCREMENT` (with the explicit keyword). If your table uses `INTEGER PRIMARY KEY` without the `AUTOINCREMENT` keyword, SQLite uses `max(rowid) + 1` for new rows, and `DELETE FROM` effectively resets it naturally because there are no rows left to calculate a max from.

## The Laravel Way: `DB::table()->truncate()` and `Model::truncate()`

Laravel provides truncate through both the query builder and Eloquent models. Both emit the correct SQL for the configured database driver.

```php
use App\Models\Session;
use Illuminate\Support\Facades\DB;

// Using the query builder
DB::table('sessions')->truncate();

// Using an Eloquent model
Session::truncate();

// Delete with conditions (when you need a WHERE clause)
DB::table('sessions')->where('created_at', '<', '2026-01-01')->delete();
Session::where('created_at', '<', '2026-01-01')->delete();
```

On PostgreSQL and MySQL, `truncate()` emits a `TRUNCATE TABLE` statement. On SQLite, it emits `DELETE FROM` followed by a reset of the `sqlite_sequence` table -- handling the cross-database difference transparently.

For truncating tables with foreign key constraints in a seeder or test setup:

```php
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

// Safe truncate with FK handling
Schema::disableForeignKeyConstraints();
DB::table('order_items')->truncate();
DB::table('orders')->truncate();
DB::table('users')->truncate();
Schema::enableForeignKeyConstraints();
```

### Why This is Superior

1. **Database Agnostic**: On SQLite (your test database), Laravel translates `truncate()` into the `DELETE FROM` + sequence reset pattern. On PostgreSQL and MySQL, it uses native `TRUNCATE TABLE`. You don't write different code for different environments.
2. **Testable**: `Model::truncate()` in your `setUp()` method ensures a clean state before each test, and it works identically across drivers.
3. **Expressive**: The intent is immediately clear. `Session::truncate()` is more readable than `DB::statement('TRUNCATE TABLE sessions RESTART IDENTITY')`, and it handles the identity reset behavior per-driver.

## Quick Reference

| Feature | PostgreSQL | MySQL | SQLite | Laravel |
|---|---|---|---|---|
| `TRUNCATE TABLE` | Yes | Yes | No (use `DELETE FROM`) | `->truncate()` |
| Resets auto-increment | `RESTART IDENTITY` | Always (automatic) | Manual (`sqlite_sequence`) | Handled per-driver |
| `CASCADE` support | Yes | No | N/A | `disableForeignKeyConstraints()` |
| Transactional / rollback | Yes (fully) | No (implicit commit) | N/A (`DELETE` is transactional) | Driver-dependent |
| Fires row triggers | No | No | Yes (`DELETE` fires triggers) | Driver-dependent |
| Multiple tables | Yes (comma-separated) | No (one at a time) | N/A | One call per table |

**My recommendation**: Use `Model::truncate()` or `DB::table()->truncate()` in Laravel for seeding, testing, and maintenance scripts -- it handles the SQLite-has-no-truncate problem silently and resets sequences correctly per driver. For selective row removal, use `DELETE` with a `WHERE` clause. And in PostgreSQL production environments, always use `TRUNCATE ... RESTART IDENTITY` when resetting tables to avoid confusing gaps in your ID sequences. Reserve `CASCADE` for when you've explicitly verified the dependency chain -- a careless `TRUNCATE users CASCADE` on a production database can empty half your schema before you finish reading the output.
