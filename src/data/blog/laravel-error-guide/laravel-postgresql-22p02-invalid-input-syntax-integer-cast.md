---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T21:42:25.387Z
title: "SQLSTATE[22P02] Invalid Input Syntax for Integer: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - postgresql
  - validation
  - type-safety
  - eloquent
  - laravel-error-guide
  - error-handling
  - database
description: "PostgreSQL strictly enforces integer type constraints and refuses to implicitly cast string values to integers, unlike MySQL which performs silent coercion..."
faqs:
  - question: "Why does MySQL accept string values in integer columns but PostgreSQL does not?"
    answer: "MySQL performs implicit type coercion — when you pass the string 'abc' to an integer column in a WHERE clause, MySQL silently converts it to 0 and proceeds with the query. PostgreSQL follows the SQL standard more strictly and refuses to perform this implicit conversion, throwing SQLSTATE[22P02] instead. This strict behavior is actually beneficial because it catches bugs and potential SQL injection vectors that MySQL would silently accept. The fix is to validate and cast all inputs before they reach the query layer, which is good practice regardless of which database you use."
  - question: "How do I configure Laravel Eloquent casts for PostgreSQL integer columns?"
    answer: "Define a $casts property on your Eloquent model: protected $casts = ['price' => 'integer', 'quantity' => 'integer', 'is_active' => 'boolean']. This ensures that when Eloquent reads values from the database or sets values on the model, they are automatically cast to the correct PHP type. For form input, also use FormRequest validation rules ('integer', 'numeric') to reject invalid values before they reach the model. Combining both approaches — validation at the request layer and casting at the model layer — provides defense-in-depth against type errors."
---

## TL;DR

PostgreSQL strictly enforces integer type constraints and refuses to implicitly cast string values to integers, unlike MySQL which performs silent coercion. When Laravel passes a string value (from request input, route parameters, or relationship keys) to an integer column in PostgreSQL, the database rejects the query with SQLSTATE[22P02]. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- SQLSTATE[22P02]: Invalid text representation: ERROR: invalid input syntax for type integer
- API endpoints returning 500 errors when string parameters are passed to integer column filters
- Route model binding crashing for URLs with non-numeric segments targeting integer primary keys
- Eloquent where clauses failing when unvalidated request input reaches integer columns
- Batch operations breaking when CSV import data contains non-numeric values in integer fields

If any of these symptoms look familiar, you're dealing with **sqlstate[22p02] invalid input syntax for integer**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

PostgreSQL strictly enforces integer type constraints and refuses to implicitly cast string values to integers, unlike MySQL which performs silent coercion. When Laravel passes a string value (from request input, route parameters, or relationship keys) to an integer column in PostgreSQL, the database rejects the query with SQLSTATE[22P02]. This commonly occurs with route model binding when URL segments contain non-numeric characters, search filters where user input is passed directly to integer column queries, and when Eloquent casts aren't properly configured on models with integer foreign keys.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Validate all request inputs before they reach the database: use 'integer' validation rule in FormRequest classes for any parameter mapped to an integer column

Validate all request inputs before they reach the database: use 'integer' validation rule in FormRequest classes for any parameter mapped to an integer column

### Step 2: Cast route parameters explicitly: use Route::get('/posts/{post}', ...)->whereNumber('post') to enforce numeric constraints at the routing level

Cast route parameters explicitly: use Route::get('/posts/{post}', ...)->whereNumber('post') to enforce numeric constraints at the routing level

### Step 3: Configure Eloquent casts on your model: protected $casts = ['quantity' => 'integer', 'price' => 'integer'] to ensure type safety

Configure Eloquent casts on your model: protected $casts = ['quantity' => 'integer', 'price' => 'integer'] to ensure type safety

### Step 4: Sanitize filter inputs: cast user input with (int) before passing to queries, e.g., Model::where('id', (int) $request->id)

Sanitize filter inputs: cast user input with (int) before passing to queries, e.g., Model::where('id', (int) $request->id)

### Step 5: Add a global exception handler for QueryException to return 422 instead of 500 for type casting errors

Add a global exception handler for QueryException to return 422 instead of 500 for type casting errors

### Step 6: Use form request validation consistently: never pass raw request()->input() directly into Eloquent where() clauses without validation

Use form request validation consistently: never pass raw request()->input() directly into Eloquent where() clauses without validation

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// Problem: unvalidated input passed to integer column
$posts = Post::where('category_id', $request->input('category'))
    ->get();
// If category = 'all' or 'abc' -> SQLSTATE[22P02]

// Or route model binding with integer PK
Route::get('/posts/{post}', function (Post $post) {
    return $post;
});
// GET /posts/latest -> SQLSTATE[22P02]
```

### After (Fixed)

```php
// Fix 1: Validate in FormRequest
class ListPostsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'category' => ['nullable', 'integer', 'exists:categories,id'],
        ];
    }
}

public function index(ListPostsRequest $request)
{
    $query = Post::query();
    if ($request->validated('category')) {
        $query->where('category_id', $request->validated('category'));
    }
    return $query->paginate();
}

// Fix 2: Route constraint
Route::get('/posts/{post}', function (Post $post) {
    return $post;
})->whereNumber('post');

// Fix 3: Model-level resolution
class Post extends Model
{
    public function resolveRouteBinding($value, $field = null): ?self
    {
        if (!is_numeric($value)) {
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

### Why does MySQL accept string values in integer columns but PostgreSQL does not?

MySQL performs implicit type coercion — when you pass the string 'abc' to an integer column in a WHERE clause, MySQL silently converts it to 0 and proceeds with the query. PostgreSQL follows the SQL standard more strictly and refuses to perform this implicit conversion, throwing SQLSTATE[22P02] instead. This strict behavior is actually beneficial because it catches bugs and potential SQL injection vectors that MySQL would silently accept. The fix is to validate and cast all inputs before they reach the query layer, which is good practice regardless of which database you use.

### How do I configure Laravel Eloquent casts for PostgreSQL integer columns?

Define a $casts property on your Eloquent model: protected $casts = ['price' => 'integer', 'quantity' => 'integer', 'is_active' => 'boolean']. This ensures that when Eloquent reads values from the database or sets values on the model, they are automatically cast to the correct PHP type. For form input, also use FormRequest validation rules ('integer', 'numeric') to reject invalid values before they reach the model. Combining both approaches — validation at the request layer and casting at the model layer — provides defense-in-depth against type errors.
