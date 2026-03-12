---
author: Qisthi Ramadhani
pubDatetime: 2026-03-12T00:00:00.000Z
title: "The Right Way to Create Indexes in PostgreSQL, MySQL, SQLite, and Laravel"
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
  - indexing
description: "Learn how to create indexes in PostgreSQL, MySQL, and SQLite with proper syntax, plus the clean Laravel migration approach with composite and partial indexes."
---

You've just deployed a feature that queries a `users` table by `email`, and everything works beautifully -- until the table grows past a hundred thousand rows and that once-snappy query starts taking seconds. The fix is almost always the same: _add an index_. But the syntax and capabilities for creating indexes vary more than you'd expect across database systems. Let's walk through the correct way to create indexes in PostgreSQL, MySQL, and SQLite, and then see why Laravel's migration system is the cleanest approach for application developers.

## The PostgreSQL Way: `CREATE INDEX` with Superpowers

PostgreSQL offers the most powerful indexing toolkit of any open-source database. The basic syntax is straightforward, but the real strength lies in features like concurrent index creation, partial indexes, and multiple index types.

```sql
-- Basic B-tree index (default)
CREATE INDEX idx_users_email ON users (email);

-- Unique index (enforces uniqueness at the database level)
CREATE UNIQUE INDEX idx_users_email_unique ON users (email);

-- Composite index on multiple columns
CREATE INDEX idx_orders_user_status ON orders (user_id, status);

-- Partial index: only index rows matching a condition
CREATE INDEX idx_orders_pending ON orders (created_at)
    WHERE status = 'pending';

-- Hash index for equality-only lookups
CREATE INDEX idx_sessions_token ON sessions USING HASH (token);
```

The standout feature is `CREATE INDEX CONCURRENTLY`, which builds the index _without locking the table for writes_. On a production database with heavy traffic, this is non-negotiable:

```sql
-- Build index without blocking writes (PostgreSQL only)
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
```

> _Note:_ `CONCURRENTLY` takes longer to complete and cannot run inside a transaction block. It's a trade-off, but in production, avoiding downtime is almost always worth the extra build time.

Partial indexes deserve special attention. If you have a `status` column where 95% of rows are `'completed'` and you only ever query for `'pending'`, a partial index on just the pending rows is dramatically smaller and faster than indexing the entire column.

## The MySQL Way: `CREATE INDEX` with Algorithm Hints

MySQL's indexing syntax is similar to PostgreSQL's, but with a few important differences. The default storage engine, InnoDB, uses B-tree indexes exclusively for standard columns.

```sql
-- Basic index
CREATE INDEX idx_users_email ON users (email);

-- Unique index
CREATE UNIQUE INDEX idx_users_email_unique ON users (email);

-- Composite index
CREATE INDEX idx_orders_user_status ON orders (user_id, status);

-- Prefix index for long text columns (index first 50 chars)
CREATE INDEX idx_posts_title ON posts (title(50));
```

MySQL also supports algorithm and locking hints for online index operations, which is its answer to PostgreSQL's `CONCURRENTLY`:

```sql
-- Online index creation with minimal locking (MySQL 5.6+)
CREATE INDEX idx_users_email ON users (email)
    ALGORITHM=INPLACE, LOCK=NONE;
```

One key difference: MySQL does _not_ support partial indexes. If you need to index a subset of rows, you'll need to work around this limitation with generated columns or application-level filtering.

> _Note:_ In MySQL, the order of columns in a composite index matters significantly. The index on `(user_id, status)` can satisfy queries filtering by `user_id` alone, but _not_ queries filtering only by `status`. Always put the most selective or most frequently filtered column first.

## The SQLite Approach: Simple but Sufficient

SQLite keeps things minimal. It supports standard `CREATE INDEX` syntax with B-tree indexes, and that's essentially it -- no concurrent builds, no algorithm hints, no hash indexes.

```sql
-- Basic index
CREATE INDEX idx_users_email ON users (email);

-- Unique index
CREATE UNIQUE INDEX idx_users_email_unique ON users (email);

-- Composite index
CREATE INDEX idx_orders_user_status ON orders (user_id, status);

-- Prevent errors if the index already exists
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
```

SQLite does support partial indexes (since version 3.8.0), which is a pleasant surprise:

```sql
-- Partial index in SQLite (3.8.0+)
CREATE INDEX idx_orders_pending ON orders (created_at)
    WHERE status = 'pending';
```

The main limitation is that SQLite indexes are _always_ built synchronously, blocking all other operations on the database file. For embedded and local development databases this is fine, but it's one of many reasons SQLite isn't suited for high-concurrency production workloads.

## The Laravel Way: `Schema::table()` with Fluent Index Methods

Inside a Laravel application, creating indexes through migrations is the definitive approach. It's clean, version-controlled, and completely database-agnostic.

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Basic index
            $table->index('email');

            // Unique index
            $table->unique('email');

            // Composite index
            $table->index(['user_id', 'status']);

            // Named index
            $table->index('email', 'my_custom_index_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['email']);
            $table->dropUnique(['email']);
        });
    }
};
```

For advanced cases like partial indexes that Laravel's fluent API doesn't cover, you can drop down to a raw statement within the migration:

```php
public function up(): void
{
    // Partial index via raw SQL (still inside a migration for version control)
    DB::statement('
        CREATE INDEX idx_orders_pending ON orders (created_at)
        WHERE status = \'pending\'
    ');
}
```

### Why This is Superior

1. **Database Agnostic**: Laravel translates `$table->index()` into the correct syntax for PostgreSQL, MySQL, or SQLite automatically. Your migration works identically regardless of the driver.
2. **Version Controlled**: Every index change is tracked in a migration file with a proper `down()` method, making rollbacks trivial.
3. **Testable**: Your test suite, likely running on SQLite in-memory, will apply the same indexes without choking on database-specific syntax.

## Quick Reference

| Feature | PostgreSQL | MySQL | SQLite | Laravel |
|---|---|---|---|---|
| Basic `CREATE INDEX` | Yes | Yes | Yes | `$table->index()` |
| Unique index | Yes | Yes | Yes | `$table->unique()` |
| Composite index | Yes | Yes | Yes | `$table->index([cols])` |
| Partial index | Yes (`WHERE`) | No | Yes (3.8.0+) | Raw `DB::statement()` |
| Non-blocking build | `CONCURRENTLY` | `ALGORITHM=INPLACE` | No | N/A |
| Hash index | `USING HASH` | Memory engine only | No | N/A |
| Prefix index | No (use expression) | Yes (`col(N)`) | No | N/A |

**My recommendation**: Always define indexes in Laravel migrations for application code -- they're portable, reversible, and self-documenting. Reserve raw `CREATE INDEX CONCURRENTLY` for production hotfixes where you need to add an index to a massive table without downtime. And regardless of which database you use, _always_ check your query plans with `EXPLAIN ANALYZE` before and after adding an index to verify it's actually being used.