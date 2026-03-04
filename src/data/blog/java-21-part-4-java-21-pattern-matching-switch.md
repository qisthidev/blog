---
author: Qisthi Ramadhani
pubDatetime: 2025-07-28T00:00:00.000Z
title: "Learning Note: Java 21 Feature – Pattern Matching for Switch"
featured: false
draft: false
tags:
  - java
  - development
  - java 21
  - pattern matching
  - switch
  - java-development
description: "summary"
---

Continuing my journey through [“Java 21 – Exploring the Latest Innovations for 2024”](https://subscription.packtpub.com/video/programming/9781836649113), I’ve reached Feature 2: Pattern Matching for Switch. This enhancement brings a major improvement to how conditional logic is handled in Java, making code both cleaner and safer.

## Motivation: Cleaner and More Expressive Conditional Logic

The analogy used in the course is that of a chef preparing various ingredients—each requiring a specific tool or treatment. In traditional Java, handling different types in a switch statement was like using a single knife for all ingredients: possible, but neither efficient nor elegant. You’d often have to rely on `instanceof` checks and manual typecasting, which made code verbose, error-prone, and hard to read.

```java
if (obj instanceof String) {
  String s = (String) obj;
  System.out.println(s.toLowerCase());
} else if (obj instanceof Integer) {
  Integer i = (Integer) obj;
  System.out.println(i + 1);
} else {
  System.out.println("Unknown type");
}
```

Pattern matching for switch addresses these pain points by allowing you to handle different data types and patterns directly in the switch statement. This results in more readable, maintainable, and expressive code.

## Key Advantages

- **Simplifies Common Coding Patterns:** Reduces verbosity and complexity in handling multiple types.
- **Enhanced Language Expressiveness:** Lets you express complex, data-oriented logic succinctly.
- **Improved Safety:** Type checking and casting are handled automatically, reducing the risk of runtime errors.

## Example: Pattern Matching for Switch in Action

Here’s a simplified example inspired by the course:

```java
public class PatternMatching {
  public static void main(String[] args) {
    System.out.println(asStringValue(1));       // int 1
    System.out.println(asStringValue("Hello")); // string Hello
    System.out.println(asStringValue(1L));      // long 1
    System.out.println(asStringValue(3.14));    // double 3.14
    System.out.println(asStringValue(true));    // unknown
  }

  static String asStringValue(Object anyValue) {
    return switch (anyValue) {
      case Integer i -> "int " + i;
      case String s -> "string " + s;
      case Long l -> "long " + l;
      case Double d -> "double " + d;
      default -> "unknown";
    };
  }
}
```

This code checks the type of `anyValue` and matches it to the appropriate case, automatically handling type casting. It’s much more concise than the old approach, which required multiple `instanceof` checks and manual casts.

## Hands-On Takeaway

- You can now use switch statements to match on both type and value, all in one place.
- The code is easier to read and maintain, especially when handling diverse input types.
- Pattern matching for switch is a powerful tool for writing robust, data-driven logic in modern Java.

This feature is one of the highlights of Java 21, and after trying it hands-on, I can clearly see how it will simplify everyday coding tasks and make my codebase more reliable.
