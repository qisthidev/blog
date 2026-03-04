---
author: Qisthi Ramadhani
pubDatetime: 2025-07-28T00:00:00.000Z
title: "Installing Java with SDKMAN! A Step-by-Step Learning Note"
featured: false
draft: false
tags:
  - java
  - sdkman
  - installation
  - development
  - java-development
description: "A comprehensive guide to installing and managing Java versions using SDKMAN."
---

As part of my journey to expand my programming language toolkit, I recently explored installing the latest Java version on my development machine using SDKMAN!. This post serves as a detailed learning note—both for my own review and to help fellow developers, especially junior colleagues, streamline their Java setup process.

To deepen my understanding of Java’s latest features, I’m also following the course [Java 21 - Exploring the Latest Innovations for 2024](https://subscription.packtpub.com/video/programming/9781836649113) by Paulo Dichone. This course covers Java 21’s enhancements, including hands-on exercises and practical applications, which makes it a perfect companion to setting up a modern Java environment.

## Why SDKMAN!?

SDKMAN! is a powerful tool for managing parallel versions of multiple Software Development Kits (SDKs) on most Unix-based systems. It’s especially popular for Java, Scala, Groovy, Kotlin, and many more. With SDKMAN!, switching between different versions becomes effortless, making it ideal for both development and testing environments.

## Step 1: Installing SDKMAN!

First, I installed SDKMAN! using a simple `curl` command. This fetches and runs the installation script:

```bash
curl -s "https://get.sdkman.io" | bash
```

After running this command, I followed the on-screen instructions to add SDKMAN! to my shell profile and reloaded the terminal session using `source ~/.sdkman/bin/sdkman-init.sh`.

## Step 2: Listing Available Java Versions

To see the available Java SDKs, I ran:

```bash
sdk list java
```

This command displays a comprehensive list of Java distributions and versions, including OpenJDK, Oracle, Amazon Corretto, and more. The list includes information such as version numbers and vendors, helping you choose the right build for your needs.

## Step 3: Installing a Specific Java Version

I decided to install Amazon Corretto’s latest release, version 24.0.2. The installation command is straightforward:

```bash
sdk install java 24.0.2-amzn
```

The output walks you through the download and installation process:

```
Downloading: java 24.0.2-amzn

In progress...

################################################################### 100.0%

Repackaging Java 24.0.2-amzn...

Done repackaging...
Cleaning up residual files...

Installing: java 24.0.2-amzn
Done installing!

Setting java 24.0.2-amzn as default.
```

SDKMAN! automatically sets this newly installed version as the default, so any new shell session will use it.

## Step 4: Verifying the Installation

To confirm Java is installed and set up correctly, I checked the version and path:

```bash
java --version
```

Output:

```
openjdk 24.0.2 2025-07-15
OpenJDK Runtime Environment Corretto-24.0.2.12.1 (build 24.0.2+12-FR)
OpenJDK 64-Bit Server VM Corretto-24.0.2.12.1 (build 24.0.2+12-FR, mixed mode, sharing)
```

To ensure the correct binary is being used, I ran:

```bash
which java
```

Output:

```
/Users/rama/.sdkman/candidates/java/current/bin/java
```

This confirms that Java is managed by SDKMAN! and points to the correct path.

## Summary

With these steps, I successfully installed and configured Java 24.0.2 (Amazon Corretto) using SDKMAN!. This approach is simple, repeatable, and ideal for managing multiple SDKs across projects. If you’re interested in learning more about Java 21’s newest features and enhancements, I highly recommend the course [Java 21 - Exploring the Latest Innovations for 2024](https://subscription.packtpub.com/video/programming/9781836649113) as a next step.

If you have questions or want to share your own setup experiences, feel free to reach out!
