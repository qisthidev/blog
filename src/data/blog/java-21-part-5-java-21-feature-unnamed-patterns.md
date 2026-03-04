---
author: Qisthi Ramadhani
pubDatetime: 2025-07-28T00:00:00.000Z
title: "Learning Note: Java 21 Feature – Unnamed Patterns and Variables"
featured: false
draft: false
tags:
  - java
  - development
  - java 21
  - unnamed patterns
  - variables
  - java-development
description: "summary"
---

As I continue my exploration of Java 21 with the [“Java 21 – Exploring the Latest Innovations for 2024”](https://subscription.packtpub.com/video/programming/9781836649113) course, I’ve reached Feature 3: unnamed patterns and variables. This enhancement, currently in preview, brings Java closer to modern programming practices by allowing developers to ignore unneeded data in pattern matching and method signatures.

## Motivation: Ignore What You Don’t Need

The analogy presented in the course is organizing a large event with various ticket types (VIP, general admission, standing only). Sometimes, you only care whether a person can access a section—not all the details about their ticket. Similarly, in Java, you often find yourself forced to acknowledge variables you don’t actually use, cluttering your code with unnecessary details.

## What’s New: Unnamed Patterns and Variables

With unnamed patterns and variables, you can now use underscores (`_`) to indicate that certain values are intentionally ignored. This is especially useful in pattern matching, such as when using `instanceof` or record deconstruction, where you might only need a subset of the available data.

### Example

Suppose you have a record like this:

```java
record Ticket(String type, String holderName, int seatNumber) {}

void checkAccess(Object ticket) {
    if (ticket instanceof Ticket(String type, String _, int _)) {
        if ("VIP".equals(type)) {
            System.out.println("Access to all areas.");
        }
    }
}
```

In this example:

- Only the `type` parameter is needed to determine access.
- The underscore (`_`) is used to ignore `holderName` and `seatNumber`, which are irrelevant for this check.

This makes the code cleaner and more focused, allowing you to express your intent without unnecessary boilerplate.

## Key Advantages

- **Enhanced Code Readability:** Code is cleaner and more focused, showing only what’s relevant.
- **Improved Maintainability:** Less boilerplate and fewer unused variables make code easier to update and understand.
- **Error Reduction:** Prevents warnings about unused variables, reducing noise in your codebase.
- **Alignment with Modern Practices:** This change supports a more streamlined, expressive, and maintainable style of programming.

## Takeaway

Unnamed patterns and variables in Java 21 help you write more concise, focused, and modern Java code. By letting you ignore what you don’t need, your logic becomes clearer and your programs become easier to maintain—an important step forward for Java’s evolution.
