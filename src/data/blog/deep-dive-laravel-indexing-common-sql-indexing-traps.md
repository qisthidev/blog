---
author: Qisthi Ramadhani
pubDatetime: 2025-08-13T00:00:00.000Z
title: "Navigating Common SQL Performance Traps: !=, NULL, LIKE, and GROUP BY"
slug: deep-dive-laravel-indexing-common-sql-indexing-traps
featured: false
draft: false
tags:
  - database
  - sql
  - performance
  - laravel
  - indexing
  - web-development
  - series-deep-dive-into-laravel-database-indexing
description: "Dive into common but tricky SQL query patterns that silently kill performance. Learn how to optimize !=, IS NULL, LIKE, and GROUP BY clauses with the right indexing strategies for faster, more efficient applications."
---

We've all been there. You need to pull all the records that _aren't_ in a particular state. It seems so innocent, doesn't it?

`SELECT * FROM payments WHERE status != 'open';`

On the surface, it looks fine. But under the hood, this query can be a silent performance killer. The problem, as laid out in section 3.1 of _Indexing Beyond the Basics_, is one of uncertainty. When the database query planner sees `!= 'open'`, it throws its hands up. It has no reliable way to estimate the result size. Will it match 10% of the table? 50%? 99%? This high-cardinality guesswork often leads it to abandon a perfectly good index on `status` and default to a grueling full-table scan. Ouch.

But here's the thing: these queries rarely exist in a vacuum. Let’s say we’re actually looking for all non-open payments for a _specific_ shop. Now we're getting somewhere.

`SELECT * FROM payments WHERE shop_id = 327 AND status != 'open';`

This is where the "From Left to Right" principle (section 2.3) becomes our guiding star. To make this fly, we need a composite index that puts the most selective column first. In this case, that's `shop_id`. The optimal index is `['shop_id', 'status']`.

By putting `shop_id` first, you give the database a solid anchor. It can instantly perform a fast lookup to find the small, manageable slice of payments where `shop_id` is 327. _Then_, and only within that tiny subset, does it scan for a `status` that isn't 'open'. It's the difference between searching all of Indonesia for someone versus checking a single building.

In a Laravel migration, it’s beautifully simple:

```php
Schema::table('payments', function (Blueprint $table) {
    $table->index(['shop_id', 'status']);
});
```

## The Two Faces of `NULL`: Fast Friend, Slow Foe

This same logic applies to another tricky customer: `NULL` values. As section 3.2 of the book points out, we can use a simple mental shortcut: `IS NULL` behaves like an equality check (`=`), and `IS NOT NULL` acts like an inequality check (`!=`).

So, when you write this Eloquent query to find users who haven't verified their email, what’s your performance gut-check?

`User::whereNull('email_verified_at')->get();`

With an index on `email_verified_at`, this query is blazing fast. Because `IS NULL` is treated like a direct lookup, the database can use the index to jump straight to that group of records. It's efficient and predictable.

But its counterpart, `whereNotNull()`, suffers from the same old problem. The database can't predict how many non-null rows exist, so it gets hesitant to use the index. The key takeaway? You can confidently index columns for `whereNull` checks, but for `whereNotNull`, you'll want to pair it with another high-selectivity column in your index to ensure good performance.

## `LIKE`: How a Trailing `%` Unlocks Index Magic

Next up: text searches with `LIKE`. Let's imagine finding every user whose name starts with "Alex".

`User::where('name', 'LIKE', 'Alex%')->get();`

This is a textbook case of where a B-tree index on `name` truly shines. How does it work? Think of it less like a full scan and more like a surgical strike. The book's "Scan on Range Conditions" principle (section 2.4) explains that the database internally rewrites this. It's effectively searching for everything `>='Alex'` and `<'Aley'`.

This allows the database to:

1.  Instantly **jump** to the first "Alex" in the sorted index.
2.  **Scan forward**, scooping up `Alex`, `Alexander`, and `Alexandra`.
3.  **Stop** the moment it hits the first name that doesn't fit the pattern (like "Barbara").

It only reads a tiny, relevant _range_ of the index. This is incredibly efficient. But remember, this magic only works with a _trailing_ wildcard. A leading wildcard (`LIKE '%lex'`) sends you right back to a full scan, as the database has no starting point to jump to.

## Taming the `GROUP BY` Beast

Finally, let's talk about aggregations, the heart of dashboards and reports. You need to count users per country.

`SELECT country_code, COUNT(*) FROM users GROUP BY country_code;`

To make this efficient, the database needs to process identical `country_code` values together. The simplest way to help it? Give it a perfectly sorted list. A straightforward index on `country_code` is the perfect tool for the job.

As section 3.5 discusses, with that index in place, the database can just stroll through the already-sorted list of countries, counting as it goes. It avoids creating a slow, resource-intensive temporary table in memory or on disk. It's a clean, direct path to the result.

Your migration would be just as clean:

```php
Schema::table('users', function (Blueprint $table) {
    $table->index('country_code');
});
```

And there you have it, Rama. By understanding _how_ the database "thinks" about these common query patterns, we can move beyond just adding indexes and start crafting them with precision and foresight. It's a fundamental step toward building truly high-performance applications.
