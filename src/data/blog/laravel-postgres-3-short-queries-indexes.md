---
author: Qisthi Ramadhani
pubDatetime: 2025-08-16T00:00:00.000Z
title: "Short Queries, Massive Tables: Indexes That Make Laravel Fly (Laravel + PostgreSQL Performance Part 3)"
slug: laravel-postgres-3-short-queries-indexes
featured: false
draft: false
tags:
  - laravel-and-php
  - series-supercharging-laravel-with-postgresql-query-optimization
description: "Why once-fast find() and where() calls slow down at scale, how PostgreSQL chooses Seq Scan vs Index Scan, and the exact indexing habits to keep short queries instant on millions of rows."
---

In any Laravel application, the vast majority of our database queries are what the book calls **"short queries."** These are the workhorses of our app:

- Fetching a single user: `User::find(1)`
- Finding a blog post by its slug: `Post::where('slug', 'my-first-post')->first()`
- Getting all posts for a specific user: `Post::where('user_id', 1)->get()`

The defining feature of a short query is that we expect it to return a **very small percentage of the total rows in the table**—often just one.

For a new app with only a few hundred users, these queries are always fast. But what happens when your `users` table has 5 million rows? Suddenly, a simple `User::find()` might start to feel sluggish. Why? The answer lies in the execution plan we learned about in Part 2.

## The Problem: Searching Without a Map 🗺️

Without any help, the only way PostgreSQL can find the user with `id = 1` is to start at the very beginning of the `users` table and check every single row one by one until it finds a match. This is a **Sequential Scan** (`Seq Scan`).

Imagine trying to find a single piece of information in a massive encyclopedia by reading it from page one. It's incredibly inefficient. For a large table, this means reading thousands, or even millions, of rows from the disk just to find one.

## The Solution: Creating an Index 📇

This is where **indexes** come in. An index is a special, separate data structure in your database that acts like the index at the back of a book. Instead of scanning the whole book, you look up your topic in the index, which tells you exactly which page to turn to.

In database terms, an index stores the values of a specific column (or columns) in a highly efficient, sorted structure (most commonly a **B-Tree**). Each value in the index has a pointer that leads directly to the full table row.

When you run `User::find(1)`, PostgreSQL's planner sees the index on the `id` column, instantly finds the entry for `1`, follows the pointer, and retrieves the row. This is called an **Index Scan**. It's the difference between reading the entire book and just turning to a single page.

## Practical Guide: Adding Indexes in Your Laravel Migrations

The good news is that Laravel automatically creates an index for your primary key (`id`) columns. That's why `User::find()` is usually fast. But what about foreign keys?

Let's say you have a `posts` table and you often run this query:

```php
$userPosts = Post::where('user_id', $userId)->get();
```

Without an index on the `user_id` column, PostgreSQL has to do a `Seq Scan` on the entire `posts` table every time. Let's fix that in a migration.

```php
// database/migrations/xxxx_xx_xx_xxxxxx_create_posts_table.php

public function up()
{
    Schema::create('posts', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->string('title');
        $table->text('body');
        $table->timestamps();

        // Let's add an index!
        // $table->index('user_id'); // This is the line that creates the magic.
    });
}
```

**Pro Tip:** As of Laravel 9+, the `constrained()` method on `foreignId` automatically creates an index for you! But it's still crucial to know how to add them manually for other columns.

When you run this migration, you're telling PostgreSQL to build and maintain that sorted "book index" for the `user_id` column.

## Before vs. After: The Execution Plan

Let's see the impact.

**Before adding the index:**

```sql
EXPLAIN SELECT * FROM "posts" WHERE "user_id" = 1;
```

```result
                      QUERY PLAN
    --------------------------------------------------------------
     Seq Scan on posts  (cost=0.00..12345.67 rows=15 width=128)
       Filter: (user_id = 1)
```

**After adding the index:**

```sql
EXPLAIN SELECT * FROM "posts" WHERE "user_id" = 1;
```

```result
                                     QUERY PLAN
    ------------------------------------------------------------------------------------
     Bitmap Heap Scan on posts  (cost=4.45..38.51 rows=15 width=128)
       Recheck Cond: (user_id = 1)
       ->  Bitmap Index Scan on posts_user_id_index  (cost=0.00..4.44 rows=15 width=0)
             Index Cond: (user_id = 1)
```

Don't worry about the "Bitmap Heap Scan" details for now; the key part is the `Bitmap Index Scan`. This plan tells us the database first used our new `posts_user_id_index` to quickly find all matching rows, and then it fetched them from the table. Notice the **dramatically lower cost estimate** (38.51 vs 12345.67)! This query will now be orders of magnitude faster on a large table.

## A Quick Word on When _Not_ to Index

Indexes aren't free. They take up disk space and add a tiny bit of overhead to `INSERT` and `UPDATE` operations. You don't need to index every column.

A key factor is **selectivity**. An index works best on a column with many unique values (like an ID, email, or slug). An index on a column with low selectivity, like a `status` column that only ever contains 'draft', 'published', or 'archived', is much less useful and the planner might choose to ignore it anyway.

---

You've now learned the single most important technique for speeding up your Laravel applications. By identifying your "short queries" and ensuring they are backed by indexes, you can solve 80% of common performance problems.

Next up, we'll tackle the other 20%: the big, heavy reports and data exports. We'll learn how to optimize "long queries" where scanning the whole table is sometimes the _best_ option.
