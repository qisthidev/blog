---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T21:42:25.387Z
title: "SQLSTATE[22P02] Invalid Input Syntax for Type UUID: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - postgresql
  - uuid
  - validation
  - routing
  - laravel-error-guide
  - error-handling
  - database
description: "PostgreSQL strictly enforces data types, unlike MySQL which silently coerces values. When a query passes a non-UUID string to a column typed as uuid, Postg..."
faqs:
  - question: "How do I use UUID primary keys in Laravel with PostgreSQL?"
    answer: "In your migration, use $table->uuid('id')->primary() instead of $table->id(). In your model, add use HasUuids (Laravel 9.30+) or manually set $keyType = 'string', $incrementing = false, and override the boot method to generate UUIDs with Str::uuid(). For PostgreSQL, the native uuid type is more efficient than storing UUIDs as varchar(36). You can also use uuid_generate_v4() as a database default by adding ->default(DB::raw('gen_random_uuid()')) to the migration column definition."
  - question: "Why does PostgreSQL reject my UUID but MySQL accepts it?"
    answer: "MySQL's default storage engine (InnoDB) stores UUIDs as VARCHAR or BINARY and performs implicit type coercion — it will attempt to use any string value in a comparison without validating the format. PostgreSQL has a native uuid type with strict format validation. Any string that doesn't match the UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) is rejected. This strict typing catches bugs earlier but requires proper input validation in your application. Always validate UUID format before it reaches the database query to provide user-friendly error messages."
---

## TL;DR

PostgreSQL strictly enforces data types, unlike MySQL which silently coerces values. When a query passes a non-UUID string to a column typed as uuid, PostgreSQL rejects it with SQLSTATE[22P02]. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- SQLSTATE[22P02]: Invalid text representation: ERROR: invalid input syntax for type uuid
- Route model binding returning 500 errors for bot requests or malformed URLs
- API endpoints crashing when clients send integer IDs instead of UUIDs
- Relationship queries failing when mixing integer and UUID primary keys across models
- Search or filter features crashing when user input is passed to UUID column queries

If any of these symptoms look familiar, you're dealing with **sqlstate[22p02] invalid input syntax for type uuid**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

PostgreSQL strictly enforces data types, unlike MySQL which silently coerces values. When a query passes a non-UUID string to a column typed as uuid, PostgreSQL rejects it with SQLSTATE[22P02]. In Laravel, this commonly occurs when route model binding receives a non-UUID segment (like 'favicon.ico' or a slug), when API endpoints receive malformed IDs from clients, or when relationships reference a uuid column with an integer foreign key. Laravel's automatic route model binding doesn't validate the format before querying, so any string in the URL segment gets passed directly to a WHERE uuid_column = ? clause.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Add UUID format validation to incoming requests: use the 'uuid' validation rule in your FormRequest for any parameter that maps to a UUID column

Add UUID format validation to incoming requests: use the 'uuid' validation rule in your FormRequest for any parameter that maps to a UUID column

### Step 2: For route model binding, add a route pattern constraint: Route::get('/users/{user}', ...)->whereUuid('user')

For route model binding, add a route pattern constraint: Route::get('/users/{user}', ...)->whereUuid('user')

### Step 3: Create a middleware or global route pattern: Route::pattern('user', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')

Create a middleware or global route pattern: Route::pattern('user', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')

### Step 4: Use Laravel's custom casts to validate UUID format at the model level with a custom cast class

Use Laravel's custom casts to validate UUID format at the model level with a custom cast class

### Step 5: Add try-catch around queries that accept user-supplied UUID values to return a proper 404 or 422 instead of a 500 error

Add try-catch around queries that accept user-supplied UUID values to return a proper 404 or 422 instead of a 500 error

### Step 6: For mixed integer/UUID systems, ensure foreign key columns match the referenced primary key type exactly in your migrations

For mixed integer/UUID systems, ensure foreign key columns match the referenced primary key type exactly in your migrations

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// Problem: Route model binding with UUID primary key
// GET /api/users/not-a-uuid -> SQLSTATE[22P02]
Route::get('/api/users/{user}', function (User $user) {
    return $user;
});

// Any non-UUID URL segment triggers the error:
// /api/users/favicon.ico
// /api/users/123
// /api/users/admin
```

### After (Fixed)

```php
// Fix 1: Route constraint
Route::get('/api/users/{user}', function (User $user) {
    return $user;
})->whereUuid('user');

// Fix 2: Global pattern in RouteServiceProvider
public function boot(): void
{
    Route::pattern('user', '[0-9a-f-]{36}');
}

// Fix 3: Validation in FormRequest
class ShowUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'user' => ['required', 'uuid'],
        ];
    }
}

// Fix 4: Model-level resolution with 404
class User extends Model
{
    public function resolveRouteBinding($value, $field = null): ?self
    {
        if (!Str::isUuid($value)) {
            abort(404);
        }
        return parent::resolveRouteBinding($value, $field);
    }
}
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

### How do I use UUID primary keys in Laravel with PostgreSQL?

In your migration, use $table->uuid('id')->primary() instead of $table->id(). In your model, add use HasUuids (Laravel 9.30+) or manually set $keyType = 'string', $incrementing = false, and override the boot method to generate UUIDs with Str::uuid(). For PostgreSQL, the native uuid type is more efficient than storing UUIDs as varchar(36). You can also use uuid_generate_v4() as a database default by adding ->default(DB::raw('gen_random_uuid()')) to the migration column definition.

### Why does PostgreSQL reject my UUID but MySQL accepts it?

MySQL's default storage engine (InnoDB) stores UUIDs as VARCHAR or BINARY and performs implicit type coercion — it will attempt to use any string value in a comparison without validating the format. PostgreSQL has a native uuid type with strict format validation. Any string that doesn't match the UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) is rejected. This strict typing catches bugs earlier but requires proper input validation in your application. Always validate UUID format before it reaches the database query to provide user-friendly error messages.
