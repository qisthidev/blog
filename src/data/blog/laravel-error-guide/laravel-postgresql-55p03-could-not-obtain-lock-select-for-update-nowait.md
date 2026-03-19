---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T21:42:25.387Z
title: "SQLSTATE[55P03] Could Not Obtain Lock on Row: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - postgresql
  - locking
  - concurrency
  - database
  - laravel-error-guide
  - error-handling
description: "PostgreSQL throws SQLSTATE[55P03] when a SELECT FOR UPDATE NOWAIT or SELECT FOR UPDATE SKIP LOCKED query cannot immediately acquire a row-level lock becaus..."
faqs:
  - question: "What is the difference between SELECT FOR UPDATE, NOWAIT, and SKIP LOCKED in PostgreSQL?"
    answer: "SELECT FOR UPDATE blocks the current transaction until the row lock is released by the other transaction — this can wait indefinitely and lead to timeouts. Adding NOWAIT makes it fail immediately with SQLSTATE[55P03] if the row is locked — useful when you want fast failure instead of blocking. SKIP LOCKED silently skips over any locked rows and returns only unlocked ones — perfect for queue-like patterns where any available row is acceptable. In Laravel, use lockForUpdate() for the blocking variant and raw SQL for NOWAIT and SKIP LOCKED, as Eloquent doesn't have built-in methods for these modifiers."
  - question: "How do I implement SKIP LOCKED in Laravel Eloquent for job claiming?"
    answer: "Laravel's Eloquent doesn't have a native skipLocked() method, so use a raw query approach. Wrap it in a transaction: DB::transaction(fn() => DB::selectOne('SELECT * FROM jobs WHERE status = ? LIMIT 1 FOR UPDATE SKIP LOCKED', ['pending'])). Then update the claimed row within the same transaction. This pattern efficiently distributes work across parallel workers without lock contention — each worker gets a different unlocked row. This is exactly how PostgreSQL-based queue systems like que (Ruby) and River (Go) work internally."
---

## TL;DR

PostgreSQL throws SQLSTATE[55P03] when a SELECT FOR UPDATE NOWAIT or SELECT FOR UPDATE SKIP LOCKED query cannot immediately acquire a row-level lock because another transaction holds it. Unlike the default SELECT FOR UPDATE which blocks indefinitely until the lock is released, NOWAIT returns an error immediately and SKIP LOCKED silently skips locked rows. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- SQLSTATE[55P03]: Lock not available: ERROR: could not obtain lock on row in relation
- Lock contention errors during high-concurrency booking or reservation flows
- Queue workers competing for the same job record in database-driven queues
- Inventory reservation systems failing when multiple users try to claim the same item
- Batch processing jobs failing when parallel workers target overlapping row sets

If any of these symptoms look familiar, you're dealing with **sqlstate[55p03] could not obtain lock on row**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

PostgreSQL throws SQLSTATE[55P03] when a SELECT FOR UPDATE NOWAIT or SELECT FOR UPDATE SKIP LOCKED query cannot immediately acquire a row-level lock because another transaction holds it. Unlike the default SELECT FOR UPDATE which blocks indefinitely until the lock is released, NOWAIT returns an error immediately and SKIP LOCKED silently skips locked rows. In Laravel, this occurs in queue job processing, reservation systems, or any pattern that uses pessimistic locking to claim resources. The error itself is actually expected behavior — it signals that contention exists and the application should handle it gracefully.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Understand the intent: NOWAIT is designed to fail fast

Understand the intent: NOWAIT is designed to fail fast — the error is expected behavior, not a bug. Your application should handle it as a normal control flow event

### Step 2: Catch the specific exception: wrap the lockForUpdate() query in try-catch and handle SQLSTATE[55P03] by retrying, skipping, or returning a user-friendly 'resource busy' message

Catch the specific exception: wrap the lockForUpdate() query in try-catch and handle SQLSTATE[55P03] by retrying, skipping, or returning a user-friendly 'resource busy' message

### Step 3: Use SKIP LOCKED for queue-like patterns: this tells PostgreSQL to silently skip locked rows and return only unlocked ones

Use SKIP LOCKED for queue-like patterns: this tells PostgreSQL to silently skip locked rows and return only unlocked ones — ideal for job claiming and work distribution

### Step 4: In Laravel, use sharedLock() when you only need read consistency without blocking other readers

In Laravel, use sharedLock() when you only need read consistency without blocking other readers — this reduces contention compared to lockForUpdate()

### Step 5: Add exponential backoff retry: if using NOWAIT, retry 3-5 times with increasing delays before giving up

Add exponential backoff retry: if using NOWAIT, retry 3-5 times with increasing delays before giving up

### Step 6: Design for partitioned work: assign workers to non-overlapping row ranges (e.g., by modulo of ID) to minimize lock contention

Design for partitioned work: assign workers to non-overlapping row ranges (e.g., by modulo of ID) to minimize lock contention

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// Problem: NOWAIT fails immediately if row is locked
DB::transaction(function () {
    $seat = Seat::where('event_id', $eventId)
        ->where('status', 'available')
        ->lockForUpdate()
        ->first();
    // Blocks forever if another transaction holds the lock
    // Or with raw NOWAIT:
    // SQLSTATE[55P03] if seat is locked by another request
});
```

### After (Fixed)

```php
// Fix: Use SKIP LOCKED to claim the next available seat
DB::transaction(function () use ($eventId, $userId) {
    $seat = Seat::where('event_id', $eventId)
        ->where('status', 'available')
        ->orderBy('seat_number')
        ->limit(1)
        ->lockForUpdate()
        // PostgreSQL: SKIP LOCKED via raw
        ->whereRaw('true FOR UPDATE SKIP LOCKED')
        ->first();

    if (!$seat) {
        throw new NoSeatsAvailableException();
    }

    $seat->update([
        'status' => 'reserved',
        'reserved_by' => $userId,
        'reserved_at' => now(),
    ]);
});

// Alternative: raw query with SKIP LOCKED
$seat = DB::selectOne(
    'SELECT * FROM seats WHERE event_id = ? AND status = ? ORDER BY seat_number LIMIT 1 FOR UPDATE SKIP LOCKED',
    [$eventId, 'available']
);
```

---

## Key Takeaways

- **Identify before you fix**: Use the symptoms checklist above to confirm you're dealing with this specific issue, not a different problem with similar error messages
- **Test under load**: Many of these issues only surface under concurrent access — always verify your fix with load testing before deploying to production
- **Monitor after deployment**: Set up alerting for the symptoms listed above so you catch regressions early

---

## Difficulty Level

**Advanced**

This guide requires deep understanding of framework internals and production debugging techniques. You should be experienced with profiling tools, understand concurrency patterns, and be comfortable debugging issues that only manifest under production load or specific timing conditions.

---

## Frequently Asked Questions

### What is the difference between SELECT FOR UPDATE, NOWAIT, and SKIP LOCKED in PostgreSQL?

SELECT FOR UPDATE blocks the current transaction until the row lock is released by the other transaction — this can wait indefinitely and lead to timeouts. Adding NOWAIT makes it fail immediately with SQLSTATE[55P03] if the row is locked — useful when you want fast failure instead of blocking. SKIP LOCKED silently skips over any locked rows and returns only unlocked ones — perfect for queue-like patterns where any available row is acceptable. In Laravel, use lockForUpdate() for the blocking variant and raw SQL for NOWAIT and SKIP LOCKED, as Eloquent doesn't have built-in methods for these modifiers.

### How do I implement SKIP LOCKED in Laravel Eloquent for job claiming?

Laravel's Eloquent doesn't have a native skipLocked() method, so use a raw query approach. Wrap it in a transaction: DB::transaction(fn() => DB::selectOne('SELECT * FROM jobs WHERE status = ? LIMIT 1 FOR UPDATE SKIP LOCKED', ['pending'])). Then update the claimed row within the same transaction. This pattern efficiently distributes work across parallel workers without lock contention — each worker gets a different unlocked row. This is exactly how PostgreSQL-based queue systems like que (Ruby) and River (Go) work internally.
