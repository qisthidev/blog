---
author: Qisthi Ramadhani
pubDatetime: 2025-08-20T00:00:00.000Z
title: "The Ultimate Laravel + PostgreSQL Query Optimization Checklist (Part 7)"
featured: false
draft: false
tags:
  - laravel-and-php
  - series-supercharging-laravel-with-postgresql-query-optimization
description: "A practical end-to-end checklist to diagnose and optimize any Laravel query: classify short vs long, apply index and N+1 fixes, streamline long report queries, and escalate with CTEs, views, JSON functions, and partitioning."
---

You've learned the theory, seen the execution plans, and explored advanced patterns. Now, let's put it all together. This is your step-by-step guide to follow whenever you're writing a new query or debugging a slow one.

Think of this as the Ultimate Optimization Algorithm from the book, adapted for your Laravel workflow.

## **Step 1: Identify Your Query Type: Short or Long?**

Before you write a single line of optimization code, ask yourself this fundamental question :

- **Is this a Short Query?** Am I fetching a small, specific set of records (often just one)? This includes most day-to-day operations like `find()`, `first()`, or a `where()` clause on a unique key.
- **Is this a Long Query?** Am I processing a large percentage of a table to generate a report, an export, or an aggregate dashboard?

Your answer determines your entire strategy.

## **Step 2: The Short Query Checklist (The Quick Wins)**

If you're dealing with a short query, your goal is to **use an index to avoid a `Seq Scan`**.

- **✅ Get the Raw SQL:** Use `toSql()` or Laravel Telescope to see the exact query being generated.
- **✅ Run `EXPLAIN`:** Go to your database client and check the execution plan. Do you see an `Index Scan` or `Bitmap Index Scan`?

  - If **YES**, you're likely in good shape.
  - If **NO**, and you see a `Seq Scan`, proceed to the next step.

- **✅ Add the Index:** The most common oversight is a missing index on a foreign key or a frequently searched column. Open the relevant migration and add `$table->index('column_name');`. Remember, `foreignId()->constrained()` adds this for you automatically in recent Laravel versions.
- **✅ Check for Query Transformations:** Does your `WHERE` clause modify the column value, like `WHERE DATE(created_at) = '...'`? This will prevent a normal index from being used. Rewrite it to be "index-friendly": `WHERE created_at >= '...' AND created_at < '...'`.
- **✅ Kill N+1 Loops:** Is this query running inside a `foreach` loop? This is the "Shopping List Problem." Refactor your code to fetch all the data you need _before_ the loop, typically using Eloquent's `with()` (eager loading) or a collection method like `whereIn()`.

## **Step 3: The Long Query Checklist (The Marathon Strategy)**

If you have a long query, your goal is to **make the table scans and joins as efficient as possible**.

- **✅ Filter as Early as Possible:** Your most important task is to reduce the size of the datasets _before_ joining them. Use `whereExists()` (a semi-join) to filter a large table based on a condition in another table without performing a full join.
- **✅ Group Strategically:**

  - **Filter First, Group Last:** For most reports, apply all your `WHERE` clauses first to shrink the dataset, and then perform your `groupBy()` and aggregates.
  - **Group First, Join Last:** If you need to aggregate a massive table (e.g., counting all orders per user), do it in a subquery or CTE _first_, then join the much smaller result set to other tables.

- **✅ Use CTEs for Readability:** If your report involves multiple logical steps, use `withExpression()` or `DB::raw('WITH ...')` to structure it as a Common Table Expression. This makes the query much easier to maintain and doesn't hurt performance in modern PostgreSQL.
- **✅ Avoid Multiple Scans:** Does your query hit the same large table multiple times (e.g., joining to an entity-attribute-value table three times to get three attributes)? Rewrite it to scan the table only once and use `CASE` statements or other logic to pivot the data.

## **Step 4: The Advanced Scenarios Checklist (The Power Tools)**

If you've followed the steps above and still face performance issues, especially with complex, nested data, it's time to bring out the heavy machinery.

- **✅ Consider a View:** If you have a very complex set of joins and calculations that you reuse all over your application, encapsulate that logic in a database View via a migration. Then, create a read-only Eloquent model to interact with it cleanly. This is great for keeping your logic DRY.
- **✅ Implement the NORM Pattern:** If you have an API endpoint that needs to return a deeply nested JSON object and is suffering from the N+1 problem, this is the ultimate solution. Create a PostgreSQL function that builds the entire JSON object in a single query. Call this one function from Laravel and simply decode the result. This transforms hundreds of potential queries into one.
- **✅ Investigate Partitioning:** If you have a table with hundreds of millions of rows (like logs or events) and your queries are timing out, consider partitioning the table by a date range (e.g., by month) using raw SQL in your migrations. This allows the query planner to scan only the relevant partitions, drastically improving performance.

## Final Thought: Optimization is a Habit, Not a Task

The most important takeaway from this entire series is to **"think like a database."** Make looking at query logs in Telescope a regular part of your development process. When you write a new feature, take the extra minute to run `EXPLAIN` on the queries it generates.

By making these small checks a regular habit, you'll stop thinking of optimization as a painful chore and start seeing it for what it is: a crucial part of writing clean, scalable, and professional Laravel applications. Happy coding!
