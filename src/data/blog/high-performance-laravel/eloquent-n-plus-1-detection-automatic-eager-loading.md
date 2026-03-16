---
author: Qisthi Ramadhani
pubDatetime: 2026-03-16T15:10:06.238Z
title: "Eloquent N+1 Query Detection and Automatic Eager Loading: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - php
  - eloquent
  - database
  - postgresql
  - performance
  - high-performance-laravel
description: "The N+1 query problem occurs when code iterates over a collection of models and accesses a relationship on each one, triggering a separate SQL query per mo..."
faqs:
  - question: "Should I enable preventLazyLoading() in production?"
    answer: "It depends on your risk tolerance. In strict mode, a lazy load throws an exception (500 error). Most teams enable it only in development/testing to catch issues early. If you want production protection without breaking the app, use Model::handleLazyLoadingViolationUsing() to log violations instead of throwing exceptions."
  - question: "What is the performance difference between N+1 and eager loading?"
    answer: "With 100 records and 1 relationship: N+1 = 101 queries (often 200-500ms), eager loading = 2 queries (often 5-20ms). The difference grows linearly — with 1000 records, N+1 can take seconds while eager loading stays under 50ms. The database round-trip overhead per query (~1-2ms) is the main cost, not the query execution itself."
---

## TL;DR

The N+1 query problem occurs when code iterates over a collection of models and accesses a relationship on each one, triggering a separate SQL query per model instead of a single eager-loaded query. In a loop of 100 users with posts, this means 1 query for users + 100 queries for posts = 101 queries instead of 2. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- Pages that slow down as data grows (linear query growth with record count)
- Hundreds or thousands of nearly identical SELECT queries in the query log
- Debugbar showing 200+ queries on a single page
- Database CPU spikes during list/index page loads
- LazyLoadingViolationException after enabling preventLazyLoading()

If any of these symptoms look familiar, you're dealing with **eloquent n+1 query detection and automatic eager loading**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

The N+1 query problem occurs when code iterates over a collection of models and accesses a relationship on each one, triggering a separate SQL query per model instead of a single eager-loaded query. In a loop of 100 users with posts, this means 1 query for users + 100 queries for posts = 101 queries instead of 2. Laravel provides built-in N+1 detection via Model::preventLazyLoading() and packages like spatie/laravel-query-detector, but many teams don't enable these until performance problems surface in production.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Enable N+1 detection in development: add Model::preventLazyLoading(!app()->isProduction()) to AppServiceProvider::boot()

Enable N+1 detection in development: add Model::preventLazyLoading(!app()->isProduction()) to AppServiceProvider::boot()

### Step 2: Install Laravel Debugbar in development to visually identify N+1 patterns

Install Laravel Debugbar in development to visually identify N+1 patterns

### Step 3: Fix N+1 queries by adding ->with('relationship') to the original query

Fix N+1 queries by adding ->with('relationship') to the original query

### Step 4: For nested relationships, use dot notation: ->with('posts.comments.author')

For nested relationships, use dot notation: ->with('posts.comments.author')

### Step 5: Use ->withCount('relationship') when you only need the count, not the full relation

Use ->withCount('relationship') when you only need the count, not the full relation

### Step 6: Consider ->load('relationship') for conditional eager loading after the initial query

Consider ->load('relationship') for conditional eager loading after the initial query

### Step 7: For API resources, use whenLoaded() to only include relationships that were eager-loaded

For API resources, use whenLoaded() to only include relationships that were eager-loaded

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// N+1 PROBLEM: 1 query for users + N queries for each user's posts
// Controller
public function index()
{
    $users = User::all(); // 1 query
    return view('users.index', compact('users'));
}

// Blade template
@foreach ($users as $user)
    <p>{{ $user->name }} has {{ $user->posts->count() }} posts</p>
    {{-- ^ triggers a query per user! --}}
@endforeach
```

### After (Fixed)

```php
// FIXED: Eager load with withCount — only 2 queries total
// AppServiceProvider.php — enable detection globally
public function boot(): void
{
    Model::preventLazyLoading(!app()->isProduction());
}

// Controller
public function index()
{
    $users = User::withCount('posts') // 2 queries total
        ->with('latestPost')           // eager load if needed
        ->paginate(20);
    return view('users.index', compact('users'));
}

// Blade template
@foreach ($users as $user)
    <p>{{ $user->name }} has {{ $user->posts_count }} posts</p>
    {{-- ^ uses eager-loaded count, no extra query --}}
@endforeach
```

---

## Key Takeaways

- **Identify before you fix**: Use the symptoms checklist above to confirm you're dealing with this specific issue, not a different problem with similar error messages
- **Test under load**: Many of these issues only surface under concurrent access — always verify your fix with load testing before deploying to production
- **Monitor after deployment**: Set up alerting for the symptoms listed above so you catch regressions early

---

## Difficulty Level

**Beginner**

This guide is suitable for developers new to this topic. You should be comfortable with basic framework concepts and have a development environment set up. No prior experience with the specific error or optimization technique is required.

---

## Frequently Asked Questions

### Should I enable preventLazyLoading() in production?

It depends on your risk tolerance. In strict mode, a lazy load throws an exception (500 error). Most teams enable it only in development/testing to catch issues early. If you want production protection without breaking the app, use Model::handleLazyLoadingViolationUsing() to log violations instead of throwing exceptions.

### What is the performance difference between N+1 and eager loading?

With 100 records and 1 relationship: N+1 = 101 queries (often 200-500ms), eager loading = 2 queries (often 5-20ms). The difference grows linearly — with 1000 records, N+1 can take seconds while eager loading stays under 50ms. The database round-trip overhead per query (~1-2ms) is the main cost, not the query execution itself.
