---
author: Qisthi Ramadhani
pubDatetime: 2025-08-19T00:00:00.000Z
title: "Taming Timeouts: A Case Study on Optimizing a Heavy Laravel Dashboard"
featured: false
draft: true
tags:
  - laravel
  - php
  - performance
  - optimization
  - database
  - web-development
description: "We eliminated dashboard timeouts by cutting unnecessary eager loads, narrowing selected columns, converting a triple nested aggregation into a grouped lookup, and adding focused indexes—delivering consistent sub‑timeout performance without infrastructure changes."
---

Hey everyone, I'm Qisthi Ramadhani (but you can call me Rama), a full-stack developer from Magetan, Indonesia. At PT Javan Cipta Solusi, where I currently work as an L6 Programmer, I often dive into performance tuning. I'm passionate about making things fast, whether it's with Laravel Octane or by refactoring a tricky piece of code. Today, I want to share a real-world case study on how we tackled a dashboard that was buckling under pressure.

## The Problem: A Dashboard on the Brink of Collapse

We had a multi-tenant Laravel application with a critical admin dashboard. This dashboard was designed to show aggregate statistics—counts, breakdowns by category, and daily timelines. While it worked perfectly for small datasets, it hit a wall when users selected a wide date range, like a full year or more. With the underlying data growing past a few hundred records, the page would frequently crash, hitting a 30-second timeout.

The symptoms were clear:

- **Intermittent Timeouts:** The page would fail to load whenever the date filter was too broad.
- **High Memory Usage:** The server's memory consumption ballooned in proportion to the size of the dataset being processed.
- **Inefficient Code:** We noticed slow PHP loops that scaled exponentially with the number of records, days, and categories involved.
- **Over-fetching Data:** The code was eagerly loading entire Eloquent models and their relationships, even when they weren't needed for the dashboard widgets.

## Digging Deeper: The Root Causes

After profiling the application, we pinpointed several key issues that, when combined, created the perfect storm for our performance bottleneck:

| Issue                                               | Impact                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| Over-fetching extra relations (unused many-to-many) | Extra database queries and memory overhead from hydrating models.         |
| Selecting full model columns (`SELECT *`)           | Larger data payloads transferred from the database to PHP.                |
| A triple-nested aggregation loop                    | A CPU-intensive `O(N*C*D)` loop (records × categories × days).            |
| Missing database indexes on queried columns         | Slower database queries as the planner had to perform larger table scans. |
| Date bucketing in PHP                               | Repeated date formatting and comparison work inside a loop.               |

## The Fix: A Multi-Pronged Optimization Strategy

Instead of immediately reaching for a caching layer, we decided to address the foundational issues first. Our strategy was to trim the fat, optimize the algorithm, and give the database the tools it needed to work efficiently.

### 1. Slimming Down the Query

First, we stopped fetching unnecessary data. The original query eagerly loaded multiple relationships and all columns from the table. We refactored it to select only the columns required for the dashboard and load only the single relationship needed for labeling.

**Before:**

```php
// Fetching everything, including unused 'tags'
Support::with(['category','tags'])->get();
```

**After:**

```php
// Fetching only what's needed
Support::with('category')
    ->select(['id','category_id','created_at','status','anonymous','verificator_recomendation','review_recomendation'])
    ->whereBetween('created_at', [$start, $end])
    ->whereNull('deleted_at')
    ->where('is_draft', false)
    ->get();
```

### 2. Rethinking the Aggregation

The most significant performance hit came from a triple-nested loop that iterated through categories, then days, then the entire collection of items. We replaced this `O(N*C*D)` nightmare with a much more efficient `O(N + C*D)` approach. We grouped the collection by `category_id` and then by a formatted day label _once_. This allowed us to look up the count for any given category and day directly, rather than recalculating it on every iteration.

**Before:**

```php
// Inefficient nested loops
foreach ($categories as $cat) {
  foreach ($days as $day) {
    $count = $collection->where('category_id',$cat)
      ->filter(fn($r) => $r->created_at->isSameDay($day))
      ->count();
  }
}
```

**After:**

```php
// Group once, then loop and lookup
$grouped = $collection->groupBy('category_id')
  ->map(fn($items) => $items->groupBy(fn($r) => $r->created_at->format('d-M')));

foreach ($categories as $catId => $catName) {
  foreach ($dayLabels as $label) {
    $count = optional($grouped[$catId][$label] ?? null)->count() ?? 0;
  }
}
```

### 3. Adding Targeted Database Indexes

Finally, to speed up the initial data fetch, we added indexes to the columns that were frequently used in `WHERE` clauses. This included single-column indexes and a crucial compound index to cover the main dashboard query.

```php
// Conceptual migration for adding indexes
Schema::table('supports', function (Blueprint $table) {
    $table->index('created_at');
    $table->index('category_id');
    $table->index('status');
    $table->index('verificator_recomendation');
    $table->index('review_recomendation');
    $table->index(['created_at','category_id','deleted_at','is_draft'], 'wbs_dashboard_compound_idx');
});
```

## The Results: Fast, Stable, and Scalable

The impact of these changes was immediate and dramatic.

| Aspect                     | Before                      | After                          |
| -------------------------- | --------------------------- | ------------------------------ |
| **Aggregation Complexity** | O(N \* C \* D)              | O(N + C \* D)                  |
| **Data Transferred**       | Full rows + extra relations | Minimal columns + one relation |
| **Index Support**          | Partial / Implicit          | Explicit and targeted          |

We validated the fix by running tests with 600–1000 records over a multi-year span. The page now renders consistently under the timeout threshold, N+1 query problems are gone, and memory usage is stable.

Let's break down the complexity of `O(N * C * D)` using an analogy.

In simple terms, **`O(N * C * D)` describes an algorithm whose workload multiplies based on three different factors.** The "O" stands for "Order of," which is part of Big O notation—a way to describe how the runtime or memory usage of a process scales as the input size grows. In the case study, this complexity arose from a triple-nested loop.

### The Warehouse Analogy 📦

Imagine you're a warehouse manager and you need to create a daily inventory report.

- **N**: The total number of **Items** in a massive, unsorted pile on the floor (e.g., 1000 items).
- **C**: The number of **Categories** you sell (e.g., 10 categories like "Electronics," "Apparel," "Books").
- **D**: The number of **Days** you need to report on (e.g., 30 days).

#### The Inefficient `O(N * C * D)` Method

This is the approach the dashboard was originally using. It's like doing the inventory count in the most manual and repetitive way possible.

1. You pick your first **Category**, "Electronics."
2. Then, you pick your first **Day**, "Day 1."
3. Now, you must sift through the **entire pile of 1,000 Items (N)**, one by one, asking each item: "Are you an electronic, AND did you arrive on Day 1?" You count them and write down the number.
4. Next, you move to "Day 2" but stick with the "Electronics" category. You have to go through the **entire pile of 1,000 Items again** to find the electronics that arrived on Day 2.
5. You repeat this for all 30 days. You've now sifted through the entire pile of 1,000 items 30 times, just for one category.
6. Now, you move to the next category, "Apparel," and repeat the entire process—sifting through all 1,000 items for each of the 30 days.

The total work is `10 Categories * 30 Days * 1,000 Items` = **300,000** item inspections. This is extremely slow because you repeatedly scan the entire dataset. This is the essence of a triple-nested loop and `O(N * C * D)` complexity.

### The Efficient `O(N + C * D)` Method

This is the optimized approach the case study implemented using `groupBy()`.

1. **Sort First (The `O(N)` part):** You go through the massive pile of 1,000 **Items (N)** just **once**. As you pick up each item, you place it into a pre-organized set of bins. For example, an item that is "Apparel" and arrived on "Day 15" goes into the "Apparel" bin, inside the "Day 15" slot. This initial sorting is your main effort.
2. **Count Later (The `O(C * D)` part):** Now, your data is perfectly organized. To create your report, you simply walk up to the "Electronics" bin, look at the "Day 1" slot, and count the items inside. No need to search the whole warehouse. You do this for each category and each day.

The total work is the initial sorting (`1,000 Items`) plus the final counting (`10 Categories * 30 Days`), which is `1,000 + 300` = **1,300** operations.

As you can see, 1,300 operations is vastly faster than 300,000. This is why changing the algorithm from a nested loop (`O(N * C * D)`) to a "group then lookup" approach (`O(N + C * D)`) solved the timeout issue on the dashboard.

## Key Takeaway

My biggest lesson from this experience is to **always start by trimming data and reducing algorithmic complexity before reaching for caching layers**. Focused database indexes and smarter in-memory grouping can often resolve the majority of latency issues for analytical dashboards without adding infrastructure overhead.

We successfully eliminated the dashboard timeouts and delivered consistent, sub-timeout performance simply by refining our code and database schema.

---

I hope this case study provides some useful insights for your own projects\! I’m passionate about performance tuning and love sharing what I learn. If you want to connect or see more of my work, you can find me here:

- **Email:** rama@qisthi.dev
- **Website:** [https://qisthi.dev](https://qisthi.dev)
- **GitHub:** @qisthidev
- **YouTube:** @qisthidev
- **X/Twitter:** @ramageek
