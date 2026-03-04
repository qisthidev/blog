---
author: Qisthi Ramadhani
pubDatetime: 2025-08-19T00:00:00.000Z
title: "Solving N+1 for Good in Laravel: The NORM JSON Function Pattern (Performance Part 6)"
slug: laravel-postgres-6-norm-n-plus-one-json
featured: false
draft: false
tags:
  - laravel-and-php
  - series-supercharging-laravel-with-postgresql-query-optimization
description: "How to eliminate N+1 queries in complex Laravel endpoints by offloading relationship assembly to a PostgreSQL JSON-building function (NORM pattern) and returning one predictable JSON payload."
---

We've all been there. You load a page, open Laravel Telescope, and see a waterfall of 50, 100, or even more duplicate queries. This is the infamous **N+1 problem**, and it's the most common performance killer in Laravel applications. While we have tools like `->with()` (eager loading) to fight it, sometimes we're fetching such a complex web of data that even eager loading becomes complicated and inefficient.

The book "PostgreSQL Query Optimization" calls this a symptom of the "object-relational impedance mismatch" (`ORIM`). It’s the fundamental conflict between our neat PHP objects and the set-based world of SQL. Our application thinks in terms of "one object at a time," leading directly to the **"Shopping List Problem"**—making hundreds of database trips when one would suffice.

So, how do we solve this for good, especially for complex API endpoints or page loads? The book proposes a radical but powerful pattern it calls **NORM (No-ORM)**. We're not going to replace Eloquent, but we are going to borrow the core NORM principle to build a hyper-efficient data access layer for specific, complex scenarios.

## The Core Idea: A JSON Contract

The NORM approach centers on a single idea: instead of the application asking the database for dozens of small things, the database should have a function that knows how to build a complete, complex data object and return it in one go.

The "contract" between Laravel and PostgreSQL becomes a predictable JSON structure.

- **Laravel says:** "Hey PostgreSQL, please run the `get_booking_details` function for booking ID 123."
- **PostgreSQL says:** "Sure. I'll do all the complex joins and logic internally, build a nested JSON object with the booking, its flights, and all its passengers, and hand you back this single piece of text."
- **Laravel says:** "Thanks! I just need to `json_decode` this one string and I'm done."

This reduces potentially hundreds of database round trips into **one**.

## A Practical Guide to Implementing NORM in Laravel

Let's build a real example based on the `postgres_air` schema from the book. We want to fetch a `booking_leg` object, complete with its nested `flight` details and a list of all `boarding_passes`.

### Step 1: Define the Contract (The JSON Structure)

First, we decide what our final JSON should look like. This is our contract.

```json
{
  "booking_leg_id": 17564910,
  "leg_num": 2,
  "booking_id": 232346,
  "flight": {
    "flight_id": 13650,
    "flight_no": "1245",
    "departure_airport_code": "JFK",
    "arrival_airport_code": "CDG"
    // ... other flight details
  },
  "boarding_passes": [
    {
      "boarding_pass_id": 1247796,
      "last_name": "LEWIS",
      "first_name": "ELIA",
      "seat": "1E"
      // ... other pass details
    },
    {
      "boarding_pass_id": 1247797,
      "last_name": "LEVY",
      "first_name": "ALEXANDER",
      "seat": "1F"
      // ... other pass details
    }
  ]
}
```

### Step 2: Build the PostgreSQL Function

This is where the magic happens. We'll create a PostgreSQL function that takes an ID and does all the heavy lifting using PostgreSQL's powerful JSON functions. We'll put this in a Laravel migration.

```php
// database/migrations/xxxx_xx_xx_xxxxxx_create_get_booking_leg_details_function.php
public function up()
{
    DB::statement("
        CREATE OR REPLACE FUNCTION get_booking_leg_details(p_booking_leg_id int)
        RETURNS jsonb AS $$
        SELECT to_jsonb(t)
        FROM (
            SELECT
                bl.booking_leg_id,
                bl.leg_num,
                bl.booking_id,
                -- Nest the flight object
                (
                    SELECT jsonb_build_object(
                        'flight_id', f.flight_id,
                        'flight_no', f.flight_no,
                        'departure_airport_code', f.departure_airport,
                        'arrival_airport_code', f.arrival_airport
                        -- Add other flight fields here
                    )
                    FROM flight f WHERE f.flight_id = bl.flight_id
                ) as flight,
                -- Nest the boarding passes array
                (
                    SELECT jsonb_agg(jsonb_build_object(
                        'boarding_pass_id', bp.pass_id,
                        'last_name', p.last_name,
                        'first_name', p.first_name,
                        'seat', bp.seat
                        -- Add other pass fields here
                    ))
                    FROM boarding_pass bp
                    JOIN passenger p ON bp.passenger_id = p.passenger_id
                    WHERE bp.booking_leg_id = bl.booking_leg_id
                ) as boarding_passes
            FROM booking_leg bl
            WHERE bl.booking_leg_id = p_booking_leg_id
        ) t;
        $$ LANGUAGE sql;
    ");
}

public function down() { /* ... DROP FUNCTION ... */ }
```

**Let's break down the key PostgreSQL functions:**

- `jsonb_build_object(...)`: Creates a JSON object from a list of key-value pairs. Perfect for nesting single objects like `flight`.
- `jsonb_agg(...)`: Aggregates a set of values into a JSON array. Perfect for creating the `boarding_passes` list.
- `to_jsonb(t)`: Converts the entire final row into a single `jsonb` object.

This function encapsulates all our business logic. If we need to add a field to the flight details, we only change it here, in one place.

### Step 3: Call the Function from Laravel

Now the application side becomes incredibly simple. We don't need Eloquent relationships or complex `with()` arrays. We just call the function.

```php
// In a repository or controller
use Illuminate\Support\Facades\DB;

class BookingRepository
{
    public function findBookingLegDetails(int $bookingLegId): ?object
    {
        // Use selectOne to call the function and get the first result
        $result = DB::selectOne(
            'SELECT get_booking_leg_details(?) as details',
            [$bookingLegId]
        );

        // The result is a JSON string, so we just decode it
        return $result ? json_decode($result->details) : null;
    }
}

// Usage:
// $repo = new BookingRepository();
// $bookingLeg = $repo->findBookingLegDetails(17564910);
// dd($bookingLeg->flight->flight_no); // Outputs "1245"
```

That's it. One database query. No N+1. No complex eager loading. Just a clean, fast, and predictable result.

## Why This is a Game-Changer

The NORM pattern isn't for every situation. For simple CRUD operations, Eloquent is still king. But for complex, read-heavy operations like powering an API endpoint, a Single Page Application, or a detailed view page, this approach offers massive benefits:

1. **Peak Performance:** It solves the N+1 problem at its root, reducing hundreds of queries to a single network round trip.
2. **A Clear Contract:** The JSON structure provides a firm contract between the front-end, the Laravel back-end, and the database, making development and testing easier for everyone.
3. **Encapsulation of Logic:** All the complex data-fetching logic lives in one place—the PostgreSQL function—making it easier to maintain and optimize.
4. **Database Power:** It lets you use the full power of PostgreSQL to build your data objects, a task it is highly optimized for.

In the final article of our series, we'll bring everything together into a practical checklist—your "Ultimate Optimization Algorithm"—to help you decide which of these techniques to use and when.
