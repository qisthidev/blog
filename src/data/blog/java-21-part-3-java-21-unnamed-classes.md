---
author: Qisthi Ramadhani
pubDatetime: 2025-07-28T00:00:00.000Z
title: "Learning Note: Java 21 Feature – Unnamed Classes and Instance Main Methods (Preview)"
featured: false
draft: false
tags:
  - java
  - development
  - java 21
  - unnamed classes
  - instance main methods
  - java-development
description: "A beginner-friendly introduction to Java 21's unnamed classes and instance main methods, designed to simplify the entry point for new Java developers."
---

In my ongoing study of Java 21, guided by the [“Java 21 – Exploring the Latest Innovations for 2024”](https://subscription.packtpub.com/video/programming/9781836649113) course, I’ve reached the section on one of the most beginner-friendly enhancements: unnamed classes and instance main methods. This feature is currently in preview, but it’s a significant step toward making Java more accessible, especially for newcomers.

## Motivation: Reducing Verbosity for Beginners

Traditionally, writing a simple Java program (like “Hello, World”) requires a lot of boilerplate code: defining a class, writing `public static void main(String[] args)`, and then adding the print statement. For beginners, this can be overwhelming and unnecessarily complex.

```java
public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("Hello, World!");
    }
}
```

Java 21 aims to minimize this verbosity. The new feature allows you to write much simpler entry-point code, making the language more approachable for students and those new to Java.

## What’s New: Minimal Entry Point

With this preview feature, you can now write a Java program like this:

```java
void main() {
    System.out.println("Hello, Java 21!");
}
```

- No need for a class declaration.
- No need for `public static`.
- The focus is on the logic, not the structure.

## Setting Up and Running an Unnamed Class in VSCode

If you’re using Visual Studio Code (VSCode), the process is straightforward:

1. **Create a New Java Project:**

   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Type and select “Create Java Project.”
   - Choose “No build tools” for simplicity.
   - Select a folder and provide a project name.

2. **Write Your Minimal Java Program:**

   - In the `src` folder, create a file (e.g., `App.java`).
   - Write your code using the new minimal style.

3. **Compile and Run with Preview Features:**
   - Open a terminal and navigate to your `src` directory.
   - Compile with preview enabled:
     ```bash
     javac --release 21 --enable-preview App.java
     ```
   - Run with preview enabled:
     ```bash
     java --enable-preview App
     ```
   - You should see your output (e.g., “Hello, Java 21!”).

**Note:** If you try to run this code without enabling preview features, it will not compile or run, as this feature is not yet standard.

## Key Takeaways

- **Purpose:** Make Java simpler for beginners by reducing required boilerplate for entry-point programs.
- **How:** Allows omitting the class declaration and `public static` for main methods.
- **Status:** Feature is under preview in Java 21, so you must enable preview features during compilation and execution.
- **Benefit:** Easier for new learners and quick prototyping.

This feature, although small, reflects Java’s ongoing effort to modernize and lower the entry barrier for new programmers. I find it a welcome change, especially as I continue to explore more of Java 21’s innovations in my learning journey.
