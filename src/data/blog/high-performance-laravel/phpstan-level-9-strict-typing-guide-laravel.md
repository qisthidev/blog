---
author: Qisthi Ramadhani
pubDatetime: 2026-03-16T12:20:41.105Z
title: "PHPStan Level 9 Strict Typing Guide for Laravel: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - php
  - static-analysis
  - testing
  - code-quality
  - high-performance-laravel
  - performance
description: "PHPStan level 9 enforces the strictest static analysis rules in PHP, requiring full type coverage for all parameters, return types, properties, and generic..."
faqs:
  - question: "Is PHPStan level 9 worth it for Laravel projects?"
    answer: "Yes, for medium-to-large codebases with multiple developers. Level 9 catches entire categories of bugs at analysis time (null access, type mismatches, incorrect method calls). For solo developers or small projects, level 6-7 provides most of the value with less effort. The key is using Larastan and IDE Helper to handle Laravel's magic methods."
  - question: "How do I handle PHPStan errors in Eloquent relationships?"
    answer: "Install larastan and run `php artisan ide-helper:models --write` to generate @property PHPDoc annotations on your models. This tells PHPStan the types of all model attributes and relationships. For custom relationship types, add @return annotations to your relationship methods: `/** @return HasMany<Post> */`."
---

## TL;DR

PHPStan level 9 enforces the strictest static analysis rules in PHP, requiring full type coverage for all parameters, return types, properties, and generics. Laravel's heavy use of magic methods (__get, __set, __call), dynamic facades, and loose-typed collections makes reaching level 9 compliance challenging. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- Hundreds of PHPStan errors when first enabling level 9
- Cannot access property $name on model App\Models\User (magic property not recognized)
- Method App\Models\User::where() invoked with wrong parameter types
- Generic type Collection<int, mixed> expected, array given
- Return type of function is mixed but should be specific

If any of these symptoms look familiar, you're dealing with **phpstan level 9 strict typing guide for laravel**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

PHPStan level 9 enforces the strictest static analysis rules in PHP, requiring full type coverage for all parameters, return types, properties, and generics. Laravel's heavy use of magic methods (__get, __set, __call), dynamic facades, and loose-typed collections makes reaching level 9 compliance challenging. Key pain points include: Eloquent model properties not being type-safe by default, Collection generic types, facade return types, and service container resolution. The larastan (phpstan/phpstan for Laravel) extension resolves many of these by providing type stubs for Laravel's magic.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Install Larastan: composer require larastan/larastan --dev

Install Larastan: composer require larastan/larastan --dev

### Step 2: Start at level 0 and incrementally increase

Start at level 0 and incrementally increase — don't jump straight to 9

### Step 3: Generate model type stubs: php artisan ide-helper:models --write to add @property PHPDoc to models

Generate model type stubs: php artisan ide-helper:models --write to add @property PHPDoc to models

### Step 4: Use PHPStan baseline to ignore existing errors: phpstan analyse --generate-baseline

Use PHPStan baseline to ignore existing errors: phpstan analyse --generate-baseline

### Step 5: Fix errors level by level, running your test suite after each batch of fixes

Fix errors level by level, running your test suite after each batch of fixes

### Step 6: Add return types to all controller methods, service classes, and repository patterns

Add return types to all controller methods, service classes, and repository patterns

### Step 7: Use @template and @extends annotations for custom Collection subclasses

Use @template and @extends annotations for custom Collection subclasses

### Step 8: Configure phpstan.neon with strictRules, Laravel-specific rules, and custom paths to ignore

Configure phpstan.neon with strictRules, Laravel-specific rules, and custom paths to ignore

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// PHPStan level 9 errors everywhere
class UserService
{
    public function findActive() // missing return type
    {
        return User::where('active', true)->get(); // Collection<mixed>
    }

    public function getFullName($user) // missing parameter type
    {
        return $user->first_name . ' ' . $user->last_name;
    }
}
```

### After (Fixed)

```php
// PHPStan level 9 compliant
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class UserService
{
    /** @return Collection<int, User> */
    public function findActive(): Collection
    {
        return User::where('active', true)->get();
    }

    public function getFullName(User $user): string
    {
        return "{$user->first_name} {$user->last_name}";
    }
}

// phpstan.neon
includes:
    - vendor/larastan/larastan/extension.neon
parameters:
    level: 9
    paths:
        - app/
    ignoreErrors: []
    checkGenericClassInNonGenericObjectType: false
```

---

## Key Takeaways

- **Identify before you fix**: Use the symptoms checklist above to confirm you're dealing with this specific issue, not a different problem with similar error messages
- **Test under load**: Many of these issues only surface under concurrent access — always verify your fix with load testing before deploying to production
- **Monitor after deployment**: Set up alerting for the symptoms listed above so you catch regressions early

---

## Difficulty Level

**Intermediate**

This guide assumes familiarity with the framework and its core tooling. You should understand basic database concepts, configuration patterns, and be comfortable reading framework source code when needed. Prior experience with similar issues will help but is not required.

---

## Frequently Asked Questions

### Is PHPStan level 9 worth it for Laravel projects?

Yes, for medium-to-large codebases with multiple developers. Level 9 catches entire categories of bugs at analysis time (null access, type mismatches, incorrect method calls). For solo developers or small projects, level 6-7 provides most of the value with less effort. The key is using Larastan and IDE Helper to handle Laravel's magic methods.

### How do I handle PHPStan errors in Eloquent relationships?

Install larastan and run `php artisan ide-helper:models --write` to generate @property PHPDoc annotations on your models. This tells PHPStan the types of all model attributes and relationships. For custom relationship types, add @return annotations to your relationship methods: `/** @return HasMany<Post> */`.
