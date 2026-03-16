---
author: Qisthi Ramadhani
pubDatetime: 2026-03-12T00:00:00.000Z
title: "Add Constraints and Foreign Keys in PostgreSQL, MySQL, SQLite, and Laravel"
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
description: "Master ALTER TABLE ADD CONSTRAINT for foreign keys, unique, check, and not null across PostgreSQL, MySQL, SQLite, and Laravel."
---

Your application works fine in development, but in production, somehow an `orders` row exists with a `user_id` that points to a user who was deleted three months ago. Orphaned records, duplicate emails slipping through, negative prices in your products table -- these are all symptoms of missing database constraints. Relying _solely_ on application-level validation is playing with fire. Let's look at how to properly enforce data integrity at the database level across every major system.

## The PostgreSQL Way: Full Constraint Support

PostgreSQL has the most comprehensive constraint support of any open-source database. You can add foreign keys, unique constraints, check constraints, and not-null constraints to existing tables with `ALTER TABLE`.

### Foreign Keys

```sql
-- Add a foreign key constraint to an existing table
ALTER TABLE orders
    ADD CONSTRAINT fk_orders_user_id
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
```

The `ON DELETE CASCADE` clause means that when a user is deleted, all their orders are automatically removed. Other options include `SET NULL`, `SET DEFAULT`, `RESTRICT`, and `NO ACTION`.

### Unique Constraints

```sql
-- Ensure no two users share the same email
ALTER TABLE users
    ADD CONSTRAINT uq_users_email UNIQUE (email);

-- Composite unique constraint (e.g., one review per user per product)
ALTER TABLE reviews
    ADD CONSTRAINT uq_reviews_user_product UNIQUE (user_id, product_id);
```

### Check Constraints

```sql
-- Ensure price is always positive
ALTER TABLE products
    ADD CONSTRAINT chk_products_price_positive CHECK (price > 0);

-- Ensure status is one of the allowed values
ALTER TABLE orders
    ADD CONSTRAINT chk_orders_status CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled'));
```

### Not Null on Existing Columns

```sql
-- Make an existing column non-nullable
ALTER TABLE users
    ALTER COLUMN email SET NOT NULL;
```

> _Note: PostgreSQL validates existing data when you add a constraint. If any rows violate the new constraint, the `ALTER TABLE` will fail. Clean your data first, or use `NOT VALID` to defer validation: `ALTER TABLE orders ADD CONSTRAINT fk_orders_user_id FOREIGN KEY (user_id) REFERENCES users (id) NOT VALID;` -- then validate later with `ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_user_id;`._

## The MySQL Way: InnoDB Required

MySQL supports foreign keys and constraints, but _only on InnoDB tables_. If your tables use the older MyISAM engine, foreign key constraints are silently ignored -- one of MySQL's most dangerous gotchas.

### Foreign Keys

```sql
-- Add a foreign key (InnoDB only)
ALTER TABLE orders
    ADD CONSTRAINT fk_orders_user_id
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
```

The syntax is identical to PostgreSQL. However, MySQL requires that both the referencing and referenced columns have matching data types _and_ that the referenced column has an index.

### Unique Constraints

```sql
-- Add a unique constraint
ALTER TABLE users
    ADD CONSTRAINT uq_users_email UNIQUE (email);
```

### Check Constraints

```sql
-- Check constraints (enforced in MySQL 8.0.16+)
ALTER TABLE products
    ADD CONSTRAINT chk_products_price_positive CHECK (price > 0);
```

**Important**: MySQL versions before 8.0.16 _accept_ `CHECK` constraint syntax but silently ignore it. Your constraint will appear to be created, but it won't actually enforce anything. Always verify your MySQL version if you rely on check constraints.

### Verifying Constraints

```sql
-- View all foreign keys on a table
SELECT constraint_name, column_name, referenced_table_name, referenced_column_name
FROM information_schema.key_column_usage
WHERE table_schema = DATABASE()
  AND table_name = 'orders'
  AND referenced_table_name IS NOT NULL;
```

## The SQLite Approach: Significant Limitations

SQLite has a fundamentally different relationship with constraints compared to PostgreSQL and MySQL. The biggest limitation: **you cannot add or modify constraints on an existing table with `ALTER TABLE`**. SQLite's `ALTER TABLE` only supports renaming tables, renaming columns, and adding new columns.

### Foreign Keys Must Be Enabled

Foreign key enforcement is _disabled by default_ in SQLite. You must explicitly enable it for every connection:

```sql
-- Enable foreign key enforcement (must run per connection)
PRAGMA foreign_keys = ON;
```

### Defining Constraints at Table Creation

Since you can't add constraints after the fact, they must be defined when the table is created:

```sql
-- Foreign keys and constraints must be defined at CREATE TABLE time
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total REAL NOT NULL CHECK (total >= 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

### The Table Recreation Workaround

To add a constraint to an existing SQLite table, you must recreate the table:

```sql
-- Step 1: Create a new table with the desired constraints
CREATE TABLE orders_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total REAL NOT NULL CHECK (total >= 0),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Step 2: Copy data from the old table
INSERT INTO orders_new SELECT id, user_id, total FROM orders;

-- Step 3: Drop the old table and rename
DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;
```

> _Note: This table recreation approach will drop all indexes and triggers associated with the original table. You'll need to recreate those as well. This is why getting your schema right from the start matters more in SQLite than in any other database._

## The Laravel Way: Fluent Constraint API

Laravel's migration system provides an elegant, database-agnostic API for defining constraints. The framework handles the dialect differences behind the scenes, so your migrations work across PostgreSQL, MySQL, and SQLite.

### Foreign Keys

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // The verbose, explicit way
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');

            // The modern shorthand (Laravel 9+)
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['category_id']);
        });
    }
};
```

### Unique and Other Constraints

```php
Schema::table('users', function (Blueprint $table) {
    // Unique constraint
    $table->unique('email');

    // Composite unique
    $table->unique(['user_id', 'product_id'], 'reviews_user_product_unique');
});
```

### Why This is Superior in Laravel

1. **Database Agnostic**: The `constrained()` shorthand works whether your production runs PostgreSQL and your CI pipeline uses SQLite. Laravel generates the correct SQL for each driver.
2. **Testable**: Constraints defined through migrations are consistently applied in your test database setup, ensuring your tests reflect production behavior.
3. **Readable**: `$table->foreignId('user_id')->constrained()->cascadeOnDelete()` reads like a sentence. Compare that to the raw `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES ... ON DELETE CASCADE` statement.

## Quick Reference

| Constraint Type | PostgreSQL | MySQL (InnoDB) | SQLite | Laravel |
|---|---|---|---|---|
| Foreign Key | `ALTER TABLE ADD CONSTRAINT ... FOREIGN KEY` | Same syntax | `CREATE TABLE` only | `$table->foreign()` or `constrained()` |
| Unique | `ALTER TABLE ADD CONSTRAINT ... UNIQUE` | Same syntax | `CREATE TABLE` only | `$table->unique()` |
| Check | `ALTER TABLE ADD CONSTRAINT ... CHECK` | MySQL 8.0.16+ only | `CREATE TABLE` only | Not natively supported |
| Not Null | `ALTER COLUMN SET NOT NULL` | `MODIFY COLUMN ... NOT NULL` | `CREATE TABLE` only | `$table->type()->nullable(false)` |
| Drop Constraint | `ALTER TABLE DROP CONSTRAINT name` | `ALTER TABLE DROP FOREIGN KEY name` | Table recreation | `$table->dropForeign()` |

**My recommendation**: Always use Laravel's migration API when working within a Laravel application -- the `constrained()` shorthand with `cascadeOnDelete()` is both concise and safe. For raw SQL, PostgreSQL's constraint support is the gold standard. If you're on MySQL, verify you're running 8.0.16+ before relying on check constraints. And if you're using SQLite in production (which is valid for certain workloads), plan your schema carefully upfront -- retroactive constraint changes require full table recreation.
