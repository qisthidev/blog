---
author: Qisthi Ramadhani
pubDatetime: 2026-03-16T15:10:06.238Z
title: "PHP 8.4 Property Hooks Migration for Laravel: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - php
  - php-84
  - migration
  - high-performance-laravel
  - performance
description: "PHP 8.4 introduces property hooks (get/set) that allow defining accessor and mutator logic directly on class properties, replacing the need for magic __get..."
faqs:
  - question: "Do PHP 8.4 property hooks work with Eloquent models?"
    answer: "Not directly for database attributes. Eloquent uses its own attribute access system (__get/__set magic methods and the Attribute class) that bypasses native PHP property access. Use property hooks for non-Eloquent classes like DTOs, Services, and Value Objects. Continue using Laravel's Attribute::make() for Eloquent model accessors and mutators."
  - question: "Should I refactor all my Laravel getters/setters to property hooks?"
    answer: "No. Only refactor plain PHP classes (DTOs, Value Objects, Service classes) where getter/setter boilerplate adds no logic beyond simple validation or transformation. Leave Eloquent models using Laravel's Attribute system, and don't refactor working code just for syntax — do it when you're already modifying the class."
---

## TL;DR

PHP 8.4 introduces property hooks (get/set) that allow defining accessor and mutator logic directly on class properties, replacing the need for magic __get/__set methods or Laravel's attribute casting in many cases. Migrating to property hooks in a Laravel codebase requires understanding the interaction with Eloquent's own accessor/mutator system (which uses PHP attributes since Laravel 9+), knowing where property hooks add value vs where they conflict, and handling edge cases with serialization, validation, and IDE support.. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- Confusion about when to use PHP 8.4 property hooks vs Laravel Attribute accessors
- Property hooks not triggering on Eloquent model attributes (because Eloquent bypasses native property access)
- Type errors when property hooks enforce stricter types than the database column allows
- Serialization failures when using property hooks with Laravel's toArray/toJson

If any of these symptoms look familiar, you're dealing with **php 8.4 property hooks migration for laravel**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

PHP 8.4 introduces property hooks (get/set) that allow defining accessor and mutator logic directly on class properties, replacing the need for magic __get/__set methods or Laravel's attribute casting in many cases. Migrating to property hooks in a Laravel codebase requires understanding the interaction with Eloquent's own accessor/mutator system (which uses PHP attributes since Laravel 9+), knowing where property hooks add value vs where they conflict, and handling edge cases with serialization, validation, and IDE support.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Understand the distinction: PHP 8.4 property hooks work on plain PHP classes (DTOs, Value Objects, Services). Eloquent model attributes should continue using Laravel's Attribute casting system

Understand the distinction: PHP 8.4 property hooks work on plain PHP classes (DTOs, Value Objects, Services). Eloquent model attributes should continue using Laravel's Attribute casting system

### Step 2: Use property hooks for DTOs and Value Objects that don't extend Eloquent Model

Use property hooks for DTOs and Value Objects that don't extend Eloquent Model

### Step 3: For service classes, replace getter/setter boilerplate with property hooks

For service classes, replace getter/setter boilerplate with property hooks

### Step 4: Keep using Laravel's `Attribute::make(get: ..., set: ...)` for Eloquent models

Keep using Laravel's `Attribute::make(get: ..., set: ...)` for Eloquent models — property hooks don't intercept Eloquent's attribute access

### Step 5: Update your PHPStan/Psalm config to support PHP 8.4 syntax

Update your PHPStan/Psalm config to support PHP 8.4 syntax

### Step 6: Add property hooks to your team's coding standards document

Add property hooks to your team's coding standards document

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// Old PHP: getter/setter boilerplate in a DTO
class MoneyDTO
{
    private int $cents;

    public function __construct(int $cents)
    {
        if ($cents < 0) {
            throw new InvalidArgumentException('Amount cannot be negative');
        }
        $this->cents = $cents;
    }

    public function getCents(): int
    {
        return $this->cents;
    }

    public function getDollars(): float
    {
        return $this->cents / 100;
    }
}
```

### After (Fixed)

```php
// PHP 8.4: property hooks eliminate boilerplate
class MoneyDTO
{
    public int $cents {
        set(int $value) {
            if ($value < 0) {
                throw new \InvalidArgumentException('Amount cannot be negative');
            }
            $this->cents = $value;
        }
    }

    public float $dollars {
        get => $this->cents / 100;
    }

    public function __construct(int $cents)
    {
        $this->cents = $cents; // triggers the set hook
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

**Intermediate**

This guide assumes familiarity with the framework and its core tooling. You should understand basic database concepts, configuration patterns, and be comfortable reading framework source code when needed. Prior experience with similar issues will help but is not required.

---

## Frequently Asked Questions

### Do PHP 8.4 property hooks work with Eloquent models?

Not directly for database attributes. Eloquent uses its own attribute access system (__get/__set magic methods and the Attribute class) that bypasses native PHP property access. Use property hooks for non-Eloquent classes like DTOs, Services, and Value Objects. Continue using Laravel's Attribute::make() for Eloquent model accessors and mutators.

### Should I refactor all my Laravel getters/setters to property hooks?

No. Only refactor plain PHP classes (DTOs, Value Objects, Service classes) where getter/setter boilerplate adds no logic beyond simple validation or transformation. Leave Eloquent models using Laravel's Attribute system, and don't refactor working code just for syntax — do it when you're already modifying the class.
