---
author: Qisthi Ramadhani
pubDatetime: 2025-08-02T00:00:00.000Z
title: "A Developer's Guide Listing Tables: PostgreSQL, MySQL, SQLite, & MongoDB"
featured: false
draft: true
tags:
  - database
  - sql
  - nosql
  - postgresql
  - mysql
  - sqlite
  - mongodb
  - database-management
description: "A comprehensive guide on how to show tables in PostgreSQL, MySQL, SQLite, and MongoDB, including both CLI commands and programmatic methods."
---

Whether you're jumping into a new codebase, debugging a tricky query, or just exploring a database for the first time, one of your first commands will likely be to list all the tables. It's a fundamental task, but the syntax can differ slightly across database systems.

This guide is your quick reference for showing tables (and their NoSQL equivalent, collections) in four of the most popular databases today: PostgreSQL, MySQL, SQLite, and MongoDB. Whether you need to **show tables from database postgres**, **show all tables in mysql**, **sqlite show tables**, or **show tables in mongodb**, we've got you covered with both the easy-to-remember interactive commands for your terminal and the more robust SQL queries you can use directly in your application code.

From **psql show tables** commands to **sqlite list tables** methods, you'll learn the most efficient ways to explore your database structure across different systems.

## How to Show Tables in PostgreSQL?

PostgreSQL is known for its powerful features and strict adherence to SQL standards. When you're working within its interactive terminal, `psql`, the quickest way to **show tables from database postgres** is with a meta-command.

**In the `psql` CLI:**

The `\dt` command is your best friend for **psql show tables** operations. It displays a list of all tables in the current schema.

```bash
-- Connect to your database first
psql -U your_user -d your_database

-- Then run the command to list tables psql
your_database=> \dt

-- For more detailed information
your_database=> \dt+

-- To show tables from a specific schema
your_database=> \dt schema_name.*
```

This will give you a clean list of table names, their schema, type, and owner. The `\dt+` variant provides additional details like table sizes and descriptions.

**The Standard SQL Way:**

For a method that works outside of `psql` (for instance, in your Laravel or Go application code), you can query the `information_schema`. This is the standard way to **show tables in postgres** programmatically.

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- To show tables from database postgres with more details
SELECT table_name, table_schema, table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY table_schema, table_name;
```

This query specifically asks for tables within the `public` schema, which is the default for most projects. It's a portable and reliable way to get a list of tables programmatically.

## How to Show All Tables in MySQL?

MySQL is famous for its user-friendly commands, and listing tables is no exception.

**In the MySQL CLI:**

The command is exactly what you'd expect it to be. After selecting a database with `USE your_database;`, you can run:

```sql
SHOW TABLES;
```

This command is simple, memorable, and gets the job done quickly.

**The Standard SQL Way:**

Just like PostgreSQL, MySQL also supports the `information_schema`. This is useful for writing database-agnostic scripts or for when you need more detailed metadata.

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'your_database_name'
ORDER BY table_name;
```

## How to List Tables in SQLite?

SQLite is a self-contained, file-based database that's incredibly convenient for local development and embedded applications. There are several ways to **show table sqlite** and **sqlite list tables**.

**In the `sqlite3` CLI:**

SQLite uses "dot-commands" for its metadata operations. To **show tables sqlite3** or **sqlite show tables**, you use `.tables`.

```bash
-- Open your database file
sqlite3 your_database.db

-- Then run the command to show tables sqlite
sqlite> .tables

-- For tables matching a pattern
sqlite> .tables pattern%

-- To see detailed schema information
sqlite> .schema

-- To see schema for a specific table
sqlite> .schema table_name

-- To see complete database structure
sqlite> .fullschema
```

The `.tables` command is the quickest way to **sqlite show tables**, while `.schema` gives you the complete table structure.

**The Programmatic Way:**

Under the hood, SQLite stores its schema in a special table called `sqlite_master`. You can query this table directly to **sqlite list tables** programmatically and get a list of all objects in the database.

```sql
-- Basic way to show table sqlite programmatically
SELECT name
FROM sqlite_master
WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
ORDER BY name;

-- Get more detailed information
SELECT name, sql
FROM sqlite_master
WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
ORDER BY name;

-- Count tables
SELECT COUNT(*) as table_count
FROM sqlite_master
WHERE type = 'table' AND name NOT LIKE 'sqlite_%';
```

The `name NOT LIKE 'sqlite_%'` clause is a good practice to filter out SQLite's internal system tables when you want to **show tables sqlite3**.

## How to Show Collections in MongoDB?

Moving to the NoSQL world, MongoDB doesn't have "tables" or "schemas." Instead, it has **collections** of documents within a database. When you want to **show tables in mongodb** (which are actually collections), the concept is identical to traditional databases.

**In the `mongosh` (MongoDB Shell):**

The command is simple and intuitive to **show tables in mongodb**.

```javascript
// Switch to your database first
use your_database

// Then show collections (MongoDB's equivalent of tables)
show collections

// Alternative command
show tables

// Get detailed collection information
db.runCommand("listCollections")

// Show collections with stats
db.stats()
```

Both `show collections` and `show tables` work in MongoDB shell - they're equivalent commands for listing collections.

**The Programmatic Way:**

When using a driver in your application (like in Node.js, Go, or PHP), you'd typically call a method on your database object to **show tables in mongodb**.

```javascript
// This is JavaScript syntax, but the method name is similar across drivers
db.listCollections().toArray();

// Get collection names only
db.listCollectionNames();

// With filter options
db.listCollections({}, { nameOnly: true }).toArray();
```

This command returns a list of objects, each containing detailed information about a collection, which is MongoDB's way to **show tables in mongodb**.

## Quick Reference Summary

| Database       | Interactive CLI Command                     | Alternative Commands                      | Programmatic SQL/Query Method                                             |
| :------------- | :------------------------------------------ | :---------------------------------------- | :------------------------------------------------------------------------ |
| **PostgreSQL** | `\dt` (psql show tables)                    | `\dt+`, `\dt schema.*`                    | `SELECT table_name FROM information_schema.tables WHERE ...`              |
| **MySQL**      | `SHOW TABLES;` (show all tables in mysql)   | `SHOW TABLES FROM db;`                    | `SELECT table_name FROM information_schema.tables WHERE ...`              |
| **SQLite**     | `.tables` (sqlite show tables)              | `.schema`, `.fullschema`                  | `SELECT name FROM sqlite_master WHERE type='table';` (sqlite list tables) |
| **MongoDB**    | `show collections` (show tables in mongodb) | `show tables`, `db.listCollectionNames()` | `db.listCollections()` (or similar driver method)                         |

### Command Variations Quick Reference:

**PostgreSQL (psql show tables):**

- `\dt` - Basic table list
- `\dt+` - Detailed table information
- `\dt schema_name.*` - Tables from specific schema
- SQL: `information_schema.tables` query

**MySQL (show all tables in mysql):**

- `SHOW TABLES;` - Tables in current database
- `SHOW TABLES FROM database_name;` - Tables from specific database
- SQL: `information_schema.tables` query

**SQLite (sqlite show tables / sqlite list tables):**

- `.tables` - List all tables (sqlite3)
- `.tables pattern` - Tables matching pattern
- `.schema` - Complete database schema
- SQL: `sqlite_master` table query

**MongoDB (show tables in mongodb):**

- `show collections` - List collections
- `show tables` - Alternative command
- `db.listCollectionNames()` - Programmatic method

## Final Thoughts

While the simple CLI commands are perfect for quick checks during development, understanding the programmatic methods—especially the `information_schema` in SQL databases—is crucial for building robust applications. It allows your code to inspect the database schema dynamically, leading to more maintainable and powerful tools.

I hope this guide helps you navigate your databases more efficiently!

_You can find me on X/Twitter [@ramageek](https://twitter.com/ramageek) and check out my open-source work on GitHub [@ramaID](https://github.com/ramaID)._
