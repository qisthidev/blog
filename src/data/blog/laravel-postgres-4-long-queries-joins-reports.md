---
author: Qisthi Ramadhani
pubDatetime: 2025-08-17T00:00:00.000Z
title: "Taming Long Queries & Joins: Winning Strategies for Reports (Laravel + PostgreSQL Performance Part 4)"
slug: laravel-postgres-4-long-queries-joins-reports
featured: false
draft: false
tags:
  - laravel-and-php
  - series-supercharging-laravel-with-postgresql-query-optimization
description: "How to optimize report-style 'long queries' in Laravel with PostgreSQL: when Seq Scans are good, how hash joins work, using EXISTS for semi/anti-joins, and structuring GROUP BY to avoid repeated large table scans."
---

In every application, there are queries that are expected to be slow. These are the **"long queries,"** and they're fundamentally different from the quick lookups we've discussed so far.

A long query is any operation where you need to process a **significant fraction of the rows** from one or more large tables. Think about generating:

- A monthly sales report for all products.
- A data export of every order placed in the last year.
- An admin dashboard calculating statistics across your entire user base.

For these queries, fetching one row at a time using an index isn't just inefficient; it's impossible. We need a different strategy. The goal is no longer to avoid reading the table, but to make that process as smart and efficient as possible.

## The Surprising Truth: Full Scans Are Your Friend

For short queries, a `Seq Scan` (Sequential Scan) was the villain. For long queries, it's often the hero. When you need to read 50% of a table, it's much faster for the database to just read the whole table from start to finish than to jump back and forth between an index and the table data thousands of times.

The **primary optimization goal** for a long query is to **avoid scanning the same large table multiple times**. Every time you make an extra pass over a million-row table, you're adding significant time to your query.

## Understanding Your Tools: A Quick Guide to Join Algorithms

When you join large tables, PostgreSQL doesn't just mash them together. It uses specific algorithms to do the job. While you don't control these directly, understanding them helps you interpret execution plans.

- **Nested Loop Join:** This is the "shopping list" problem we discussed. For each row in the first table, it scans the second table for matches. It's great for short queries with an index (`User::with('posts')`) but disastrous for long queries.
- **Hash Join:** This is the workhorse for long queries. PostgreSQL scans the smaller table and builds a fast in-memory "hash map" (like a PHP associative array). Then it scans the larger table, checking each row against the hash map for matches. It's incredibly efficient for joining large datasets.
- **Sort-Merge Join:** As the name implies, the database sorts both tables by the join key and then merges them together. This is less common but can be very efficient if the data is already sorted.

When you see a `Hash Join` in the execution plan for your report query, that's often a good sign! It means the planner is using the right tool for the job.

## Filter Early, Join Less: The Power of Semi-Joins

The most important strategy for long queries is to **make your datasets as small as possible _before_ you perform expensive joins**. This is where semi-joins and anti-joins come in.

A **semi-join** returns rows from the first table where a match exists in the second table, but it doesn't duplicate rows or add columns from the second table. The most common way to write this is with `EXISTS`.

A Laravel Scenario: Find all users who have placed an order this month.

**The Inefficient Way (a full join):**

```php
// This joins the entire users and orders tables, then filters.
User::join('orders', 'users.id', '=', 'orders.user_id')
    ->where('orders.created_at', '>=', now()->startOfMonth())
    ->select('users.*')
    ->distinct()
    ->get();
```

**The Efficient Way (a semi-join with `whereExists`):**

```php
// This efficiently checks for the existence of a matching order
// without joining the whole table.
User::whereExists(function ($query) {
    $query->select(DB::raw(1))
          ->from('orders')
          ->whereColumn('orders.user_id', 'users.id')
          ->where('created_at', '>=', now()->startOfMonth());
})->get();
```

The `whereExists` query is far more performant because it can filter the `users` table without needing to perform a full, heavy join operation. It's the most restrictive and should be done first. Similarly, `whereNotExists` performs an **anti-join**, which is perfect for finding things like "users who have _never_ placed an order."

## Grouping Smarts: Do Your Math at the Right Time

For aggregate reports, _when_ you perform your `GROUP BY` and calculations can have a massive impact.

1.  **Filter First, Group Last:** This is the most common rule. Apply all your `WHERE` clauses to reduce the dataset as much as possible _before_ you ask the database to do any counting or summing.

    ```php
    // Good: Filters to 'published' posts first, then groups.
    Post::where('status', 'published')
        ->selectRaw('user_id, count(*) as post_count')
        ->groupBy('user_id')
        ->get();
    ```

2.  **Group First, Select Last:** Sometimes, you need to do the opposite. If you need to aggregate a massive table _before_ joining it to another, doing the `GROUP BY` in a subquery or CTE can dramatically reduce the number of rows involved in the final join.

    ```php
    // Good: Calculates order counts in a subquery first,
    // then joins the much smaller result set to the users table.
    User::joinSub(
        Order::selectRaw('user_id, count(*) as order_count')
            ->groupBy('user_id'),
        'user_orders',
        'users.id',
        '=',
        'user_orders.user_id'
    )->get(['users.name', 'user_orders.order_count']);
    ```

Taming your long queries is about thinking strategically. Don't be afraid of a `Seq Scan`, but make sure it's an efficient one. Use the right tools like `whereExists` to filter data early, and be deliberate about the order of your operations, especially when grouping.

In the next part, we'll level up again, looking at advanced structural tools like Views, CTEs, and Partitioning to manage even greater complexity.
