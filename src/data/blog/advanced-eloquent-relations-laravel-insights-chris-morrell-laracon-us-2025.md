---
author: Qisthi Ramadhani
pubDatetime: 2025-08-09T00:00:00.000Z
title: "Advanced Eloquent Relations in Laravel: Key Insights from Chris Morrell at Laracon US 2025"
featured: false
draft: true
tags:
  - laravel
  - eloquent
  - orm
  - web-development
description: "A deep dive into custom Eloquent relations, showcasing how to extend Laravel's ORM capabilities for unique business needs."
---

Chris Morrell’s session at Laracon US 2025, “Advanced Eloquent Relations,” is a must-watch for any Laravel developer aiming to push the boundaries of what Eloquent ORM can do. He demonstrates that Eloquent relations are, at their core, just PHP code—meaning you can extend, customize, and even invent new types of relationships to solve unique business problems or data structures that don’t fit the usual conventions.

## Core Takeaways

### 1. Eloquent Relations Are Just PHP Code

- Under the hood, Eloquent relations are not magic—they’re simply query builders and PHP methods.
- You’re not limited to the standard `hasMany`, `belongsTo`, etc. You can create custom relation classes to handle non-standard data models.

### 2. Custom Relations: When and Why

- **Legacy Data:** Chris shows how to handle legacy databases, such as comma-separated IDs instead of pivot tables, by writing a custom relation that parses and matches these IDs.
- **Geospatial Relationships:** You can define a relation (e.g., `hasNear`) that finds related models within a certain distance using latitude/longitude, leveraging raw SQL or custom PHP logic.
- **Dynamic/Generated Data:** Relations don’t even have to hit the database. You can use Faker or even AI to generate related data on the fly for testing or demonstration purposes.

### 3. How Custom Relations Work

- Implement two main methods: `addEagerConstraints` (set up the query for eager loading) and `match` (attach the loaded results to the parent models).
- The interface is flexible: you can key, filter, and attach related data in any way you need.
- This approach allows you to keep using Eloquent’s expressive syntax and features, even with unconventional data.

### 4. Practical Guidance

- **Follow Conventions First:** 99% of the time, stick to Laravel’s built-in relations for clarity and maintainability.
- **Reach for Custom Relations When Needed:** For the rare cases where business logic or legacy data require it, don’t be afraid to implement your own.
- **Document and Isolate:** Clearly document custom relations and keep them isolated to avoid confusion for future maintainers.

### 5. Real-World Examples

- **HasSpeakers:** Handles a list of speaker IDs stored as a string.
- **HasNear:** Finds related models within a geographic radius.
- **HasFake/HasLetters:** Generates fake or computed relations for demos or special cases.
- **HasPredictedEvents:** Uses an AI model to predict and generate related event data dynamically.

## How This Applies to My Work

- At my work and in Laravolt, understanding the power and flexibility of Eloquent relations enables us to maintain clean code even when faced with legacy systems or unique business needs.
- When building reusable components or open-source packages, knowing how to craft custom relations increases the adaptability and reach of our solutions.
- For knowledge sharing and mentoring, these insights help junior developers see both the power and the boundaries of Laravel’s ORM.

---

**References:**

- [Advanced Eloquent Relations | Chris Morrell Laracon US 2025](https://www.youtube.com/watch?v=qLC04_BPQTY)
