---
author: Qisthi Ramadhani
pubDatetime: 2025-08-15T00:00:00.000Z
title: "What Happens When You Run ->get()? Reading PostgreSQL Execution Plans (Laravel + PostgreSQL Performance Part 2)"
featured: false
draft: false
tags:
  - laravel-and-php
  - series-supercharging-laravel-with-postgresql-query-optimization
description: "A practical walkthrough for Laravel devs on what PostgreSQL does after Eloquent sends a query: parse, plan, execute. Learn how to extract SQL, run EXPLAIN, and decode Seq Scan cost, rows, and width so you can spot missing indexes early."
---

We've established that every elegant Eloquent chain, like `Post::where('is_published', true)->get()`, gets translated into raw SQL. But what happens after Laravel sends that SQL string to PostgreSQL? It's not magic; it's a well-defined, three-step process.

## **Step 1: Compilation (The Parser)** ✍️

First, PostgreSQL receives the SQL query as a text string. Its internal parser checks the string for correct syntax and translates it into an internal, high-level representation called a "logical plan." Think of this as the database understanding _what_ you're asking for, but not yet _how_ it's going to get it. It identifies the tables, columns, and conditions involved.

## **Step 2: Optimization (The Planner)** 🗺️

This is where the real intelligence lies. The component called the "query planner" (or optimizer) takes the logical plan and figures out the most efficient way to execute it.

It asks questions like:

- "Should I read the entire `posts` table from start to finish?" (a **Sequential Scan**)
- "Is there an index on the `is_published` column I can use to find the matching rows directly?" (an **Index Scan**)
- "If there's a join, what's the best order to connect the tables?"

The planner considers many possible strategies, estimates the "cost" of each one (based on CPU cycles and disk I/O), and chooses the plan with the lowest estimated cost.

The final output of this step is the **Execution Plan**. This is the crucial document we need to learn how to read. It's the database's turn-by-turn navigation for retrieving your data.

## **Step 3: Execution (The Executor)** 🏃‍♂️

Finally, the "executor" takes the chosen execution plan and follows its instructions precisely, step-by-step, to fetch the data from the disk, perform any necessary operations (like sorting or joining), and return the final result set back to your Laravel application.

---

## **How to See the Execution Plan in Your Laravel App**

Okay, theory is great, but let's get practical. How do we see this famous execution plan for our own queries? It's a two-step dance:

1.  **Get the Raw SQL from Eloquent.**
2.  **Ask PostgreSQL to `EXPLAIN` it.**

Let's use a simple query as an example:

```php
// Our Eloquent query in Laravel
$postsQuery = App\Models\Post::where('status', 'published');
```

**Step 1: Get the SQL**

You can use the `toSql()` method to see the generated SQL. Remember to also get the bindings!

```php
// In Tinker or your controller
$sql = $postsQuery->toSql();
$bindings = $postsQuery->getBindings();

// Manually replace the '?' placeholders
$fullSql = vsprintf(str_replace('?', '%s', $sql), array_map(function ($binding) {
    return is_numeric($binding) ? $binding : "'" . $binding . "'";
}, $bindings));

echo $fullSql;
// Outputs: select * from "posts" where "status" = 'published'
```

**Step 2: Get the Plan**

Now, take that raw SQL and head over to your favorite database client (like TablePlus, DBeaver, or even just the `psql` command line). Prefix your query with the `EXPLAIN` keyword and run it:

```sql
EXPLAIN SELECT * FROM "posts" WHERE "status" = 'published';
```

PostgreSQL won't actually _run_ the query; instead, it will return the execution plan it _would_ use. It might look something like this:

```result
                          QUERY PLAN
    --------------------------------------------------------------
     Seq Scan on posts  (cost=0.00..27058.64 rows=227725 width=71)
       Filter: (status = 'published'::text)
    (2 rows)
```

## **Decoding Your First Execution Plan**

Let's break that down. You read an execution plan from the most indented line outwards.

- `Seq Scan on posts`: This is the core action. It means "Sequential Scan." PostgreSQL is telling us its plan is to read the `posts` table from beginning to end, one row at a time.
- `Filter: (status = 'published'::text)`: While it's scanning each row, it will apply this filter to see if the status matches.
- `(cost=0.00..27058.64 rows=227725 width=71)`: This is the planner's estimate.
  - **cost**: The first number is the startup cost (to get the first row), and the second is the total cost to get all rows. Think of this as an arbitrary unit of work. **Lower is better.**
  - **rows**: The estimated number of rows that will be returned by this step.
  - **width**: The estimated average size of each row in bytes.

This `Seq Scan` tells us something very important: **PostgreSQL did not use an index for this query.** It had to read the entire table. For a small table, that's fine. For a table with millions of posts, that's a huge performance problem waiting to happen.

Now that you know how to see the database's plan, you're ready to start influencing it.

In our next article, we'll focus on optimizing these common "short queries" and learn how to turn that `Seq Scan` into a much faster `Index Scan`. Ready for the next step?
