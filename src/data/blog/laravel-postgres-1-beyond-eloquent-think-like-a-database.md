---
author: Qisthi Ramadhani
pubDatetime: 2025-08-14T00:00:00.000Z
title: "Beyond Eloquent: Think Like a Database (Laravel + PostgreSQL Performance Part 1)"
slug: laravel-postgres-1-beyond-eloquent-think-like-a-database
featured: false
draft: false
tags:
  - laravel
  - postgresql
  - eloquent
  - performance
  - query-optimization
  - laravel-and-php
  - series-supercharging-laravel-with-postgresql-query-optimization
description: "Eloquent is elegant, but every Laravel developer eventually hits performance walls caused by hidden SQL inefficiencies. This first part explains the mindset shift from imperative PHP to declarative SQL, exposes pitfalls like N+1 and the 'shopping list problem,' and gives a simple first habit: inspect the actual queries your code generates."
---

As Laravel developers, we love Eloquent. It lets us write clean, expressive, and maintainable code to interact with our database. A line like this is pure poetry:

```php
$user = User::with('posts.comments')->find(1);
```

It feels intuitive and object-oriented. But have you ever stopped to think about what's really happening? Behind that elegant line of code, Laravel is constructing one or more SQL queries, sending them to PostgreSQL, and then hydrating the results back into your beautiful model objects.

And here lies the crucial point: **Your application's performance is fundamentally tied to the performance of those underlying SQL queries.**

## The Disconnect: Imperative vs. Declarative

The core challenge, as the book points out, is the difference between how we write our PHP code and how the database works.

- **Imperative (PHP/Laravel):** We write code that gives a sequence of steps. "First, find the user. Then, get their posts. After that, get the comments for each post." We think in terms of actions and loops.
- **Declarative (SQL):** SQL is different. We don't tell the database _how_ to get the data; we simply _describe_ the result we want. "Give me the user, their posts, and the related comments, where the user's ID is 1."

The PostgreSQL query planner's job is to look at our declarative SQL and figure out the most efficient _imperative_ plan to get that data. Should it scan the `users` table first? Should it use an index? Which join method is best? It makes all these decisions for us.

## When Eloquent's Magic Becomes a Mystery

The problem arises when the magic of Eloquent hides what we're actually asking the database to do. We might write a simple-looking loop in our Blade view or controller that accidentally generates hundreds of database queries. This is the classic **"N+1 Problem,"** but it's just one symptom of a larger issue.

The book calls this the **"Shopping List Problem."** Imagine you have a list of 15 items to buy. You wouldn't drive to the store, buy one item, drive home, put it away, and then drive back for the next item . It's absurdly inefficient!

Yet, we often build applications that do exactly this. A `foreach` loop that makes a database call inside it is the programmatic equivalent of making 15 separate trips to the store.

## The Goal: "Think Like a Database"

The central message of "PostgreSQL Query Optimization" is that to write truly performant applications, we must learn to **"think like a database."** This doesn't mean abandoning Eloquent. It means understanding what kind of SQL your Eloquent code is generating and whether that SQL is giving the PostgreSQL planner enough information to build an efficient execution plan.

Optimization isn't something you do _after_ you've built a feature and it's slow. It's a way of thinking that you integrate into your development process from the very start.

### Your First Practical Step: See the SQL

Before we can optimize, we need to see what we're working with. Laravel makes this easy. You can log all queries your application runs or use a tool like Laravel Telescope.

For a quick check, you can use the `toSql()` method on a query builder instance:

```php
// See the SQL for finding a user and their posts
$sql = User::with('posts')->where('id', 1)->toSql();

// dd($sql); // Will output the raw SQL query
```

**Your homework before the next article:** Pick a feature in one of your Laravel projects. Use `toSql()` or Telescope to look at the actual SQL queries being generated. Don't worry about understanding them fully yet. Just get comfortable with the idea that every Eloquent call translates into this declarative SQL language.

In the next part, we'll dive into what happens when PostgreSQL receives that SQL and how to read its "execution plan." Stay tuned!
