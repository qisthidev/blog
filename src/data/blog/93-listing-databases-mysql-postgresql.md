---
author: Qisthi Ramadhani
pubDatetime: 2025-08-03T00:00:00.000Z
title: "A Pragmatic Developer's Guide to Listing Databases: MySQL vs. PostgreSQL"
slug: listing-databases-mysql-postgresql
featured: false
draft: true
tags:
  - database-management
description: "Learn how to list databases in MySQL and PostgreSQL with practical examples for both interactive sessions and programmatic access. This guide covers the `SHOW DATABASES` command in MySQL and the `\\\\l` meta-command in PostgreSQL, along with best practices for application code."
---

As developers, especially when working across multiple projects or in a DevOps capacity, one of our first interactions with a database server is often to ask a simple question: "What's on here?" Whether you're setting up a new local environment with Docker, SSHing into a staging server, or building programmatic tooling, knowing how to list available databases is a fundamental skill.

While both MySQL and PostgreSQL are titans in the world of relational databases, they approach this simple task with their own distinct syntax. Let's cut through the noise and get to the practical commands you'll use daily.

## MySQL: `SHOW DATABASES` and the `information_schema`

For a quick, interactive lookup in the MySQL command-line client, the `SHOW DATABASES;` command is your most direct route. It’s a MySQL-specific statement that does exactly what it says.

```sql
-- Connect to MySQL and run the command
SHOW DATABASES;
```

However, when you're writing application code—say, within a Laravel application—relying on proprietary SQL statements isn't ideal for maintainability or portability. The more robust, standards-compliant approach is to query the `information_schema`. This virtual schema contains metadata about the database system itself.

In a Laravel context, you can get a clean list of database names with a simple raw DB query. This is far more portable and predictable within your application code.

```php
// In a Laravel Artisan command or service class
use Illuminate\Support\Facades\DB;

$databases = collect(DB::select('SELECT schema_name FROM information_schema.schemata'))
    ->pluck('schema_name')
    ->all();

// $databases is now a clean array: ['my_app', 'another_db', ...]
```

## PostgreSQL: The `\l` Meta-Command and `pg_database`

If you're in the `psql` interactive terminal, the go-to command is `\l` (or its more readable alias, `\list`). It's crucial to remember this is a _meta-command_ for the `psql` client, not an SQL statement. It won't work if you try to execute it through a standard PDO driver in PHP. It gives a rich output, including owner and encoding, which is perfect for administrative checks.

```sh
# From within the psql client
\l
```

For programmatic access from your application, you should query the `pg_catalog`, which is PostgreSQL's equivalent of a system-wide metadata store. Specifically, you'll query the `pg_database` table.

A naive query (`SELECT datname FROM pg_database;`) works, but it includes system template databases (`template0`, `template1`), which is rarely what you want in application logic. A more refined query filters these out, giving you a list of user-created databases.

Here’s how you’d handle it cleanly within a Laravel application, producing a result you can actually work with.

```php
// In a Laravel Artisan command or service class
use Illuminate\Support\Facades\DB;

$databases = collect(DB::select('SELECT datname FROM pg_database WHERE datistemplate = false;'))
    ->pluck('datname')
    ->all();

// $databases now contains only user-defined database names.
```

## The Takeaway

While quick CLI commands like `SHOW DATABASES` and `\l` are great for interactive sessions, embedding standard SQL queries against metadata schemas (`information_schema` for MySQL, `pg_database` for PostgreSQL) into your application is the superior architectural choice. It keeps your code database-agnostic where possible and adheres to a more predictable, testable pattern—a principle we value when building robust systems, whether it's a client project or open-source tooling like the Laravolt packages.
