---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T21:42:25.388Z
title: "SQLSTATE[08006] Could Not Connect to Server Connection Refused: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - postgresql
  - docker
  - devops-and-infrastructure
  - connection
  - laravel-error-guide
  - error-handling
  - database
description: "SQLSTATE[08006] indicates that the PostgreSQL client library (libpq) could not establish a TCP connection to the PostgreSQL server. This is a network-level..."
faqs:
  - question: "Why does my Laravel app fail to connect to PostgreSQL in Docker Compose?"
    answer: "The most common cause is using DB_HOST=localhost or DB_HOST=127.0.0.1 in your .env file. Inside Docker Compose, containers communicate via the Docker network using service names, not localhost. Set DB_HOST to your PostgreSQL service name (e.g., 'postgres' or 'db'). The second most common cause is starting the Laravel container before PostgreSQL is ready — use depends_on with a healthcheck condition instead of just depends_on, which only waits for the container to start, not for PostgreSQL to accept connections."
  - question: "How do I debug PostgreSQL connection issues in Laravel?"
    answer: "Start by isolating the layer: (1) Network: can you reach the host? Use telnet DB_HOST DB_PORT or nc -zv DB_HOST DB_PORT. (2) PostgreSQL: is the server ready? Use pg_isready -h HOST -p PORT. (3) Authentication: can you authenticate? Use psql -h HOST -p PORT -U USER -d DATABASE. (4) Laravel: is the config correct? Run php artisan tinker then DB::connection()->getPdo(). Check each layer in order — most connection issues are network or configuration problems, not application bugs. Also verify your .env file is being read correctly with php artisan config:show database."
---

## TL;DR

SQLSTATE[08006] indicates that the PostgreSQL client library (libpq) could not establish a TCP connection to the PostgreSQL server. This is a network-level failure that occurs before any authentication or protocol negotiation. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- SQLSTATE[08006]: could not connect to server: Connection refused on the specified host and port
- Laravel application failing to boot with database connection errors after docker-compose up
- Intermittent connection failures during container restarts or deployments
- php artisan migrate failing with 'could not connect to server' in CI/CD pipelines
- Health check endpoints returning 500 because the database connection cannot be established

If any of these symptoms look familiar, you're dealing with **sqlstate[08006] could not connect to server connection refused**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

SQLSTATE[08006] indicates that the PostgreSQL client library (libpq) could not establish a TCP connection to the PostgreSQL server. This is a network-level failure that occurs before any authentication or protocol negotiation. In Laravel with Docker, this commonly happens because the PostgreSQL container hasn't finished initializing when the Laravel container starts, the database service name in docker-compose.yml doesn't match DB_HOST in .env, firewall rules block the connection, or PostgreSQL is not configured to accept connections on the expected interface (listen_addresses in postgresql.conf). In cloud environments, security groups, private networking, and SSL requirements add more potential failure points.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Verify PostgreSQL is running: check with docker-compose ps or pg_isready -h localhost -p 5432 to confirm the server accepts connections

Verify PostgreSQL is running: check with docker-compose ps or pg_isready -h localhost -p 5432 to confirm the server accepts connections

### Step 2: In Docker Compose, add a depends_on with healthcheck: ensure the Laravel service waits for PostgreSQL to be ready, not just started

In Docker Compose, add a depends_on with healthcheck: ensure the Laravel service waits for PostgreSQL to be ready, not just started — use pg_isready in the healthcheck condition

### Step 3: Verify DB_HOST matches the Docker service name: in docker-compose, use the service name (e.g., 'postgres') not 'localhost' or '127.0.0.1' for inter-container communication

Verify DB_HOST matches the Docker service name: in docker-compose, use the service name (e.g., 'postgres') not 'localhost' or '127.0.0.1' for inter-container communication

### Step 4: Check PostgreSQL listen_addresses: ensure postgresql.conf has listen_addresses = '*' if connections come from other containers or remote hosts

Check PostgreSQL listen_addresses: ensure postgresql.conf has listen_addresses = '*' if connections come from other containers or remote hosts

### Step 5: Verify pg_hba.conf allows the connection: ensure there's a rule for the Laravel container's IP range (e.g., host all all 172.0.0.0/8 md5)

Verify pg_hba.conf allows the connection: ensure there's a rule for the Laravel container's IP range (e.g., host all all 172.0.0.0/8 md5)

### Step 6: Add connection retry logic in your Docker entrypoint script: loop until pg_isready succeeds before starting the Laravel application

Add connection retry logic in your Docker entrypoint script: loop until pg_isready succeeds before starting the Laravel application

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```php
// docker-compose.yml — BROKEN: no healthcheck, app starts before DB is ready
services:
  app:
    build: .
    depends_on:
      - postgres
    environment:
      DB_HOST: localhost  # wrong: should be service name
      DB_PORT: 5432
  postgres:
    image: postgres:16
```

### After (Fixed)

```php
// docker-compose.yml — FIXED: proper healthcheck and service name
services:
  app:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DB_HOST: postgres    # Docker service name
      DB_PORT: 5432
      DB_CONNECTION: pgsql

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp -d myapp"]
      interval: 5s
      timeout: 5s
      retries: 5
    ports:
      - "5432:5432"

// Docker entrypoint with retry (entrypoint.sh)
#!/bin/bash
until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USERNAME; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done
php artisan migrate --force
php-fpm
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

### Why does my Laravel app fail to connect to PostgreSQL in Docker Compose?

The most common cause is using DB_HOST=localhost or DB_HOST=127.0.0.1 in your .env file. Inside Docker Compose, containers communicate via the Docker network using service names, not localhost. Set DB_HOST to your PostgreSQL service name (e.g., 'postgres' or 'db'). The second most common cause is starting the Laravel container before PostgreSQL is ready — use depends_on with a healthcheck condition instead of just depends_on, which only waits for the container to start, not for PostgreSQL to accept connections.

### How do I debug PostgreSQL connection issues in Laravel?

Start by isolating the layer: (1) Network: can you reach the host? Use telnet DB_HOST DB_PORT or nc -zv DB_HOST DB_PORT. (2) PostgreSQL: is the server ready? Use pg_isready -h HOST -p PORT. (3) Authentication: can you authenticate? Use psql -h HOST -p PORT -U USER -d DATABASE. (4) Laravel: is the config correct? Run php artisan tinker then DB::connection()->getPdo(). Check each layer in order — most connection issues are network or configuration problems, not application bugs. Also verify your .env file is being read correctly with php artisan config:show database.
