---
author: Qisthi Ramadhani
pubDatetime: 2025-08-08T00:00:00.000Z
title: "A Developer's Guide to Listing Users in PostgreSQL"
featured: false
draft: true
tags:
  - blog
  - database-management
  - postgresql
  - sql
  - user-management
description: "Learn how to efficiently list all users in PostgreSQL using both the `psql` command line and SQL queries. This guide covers the core concepts of roles, user management, and practical examples for developers."
---

As a developer or database administrator, one of the most fundamental tasks you'll perform is managing user access. Whether you're auditing permissions, setting up a new application user, or just trying to get a lay of the land, you need a quick and reliable way to list users in PostgreSQL.

In this guide, we'll cover the two primary methods to view all users in a PostgreSQL database: the `psql` meta-command for rapid terminal checks and a direct SQL query for more granular, programmatic access.

## Understanding the Core Concept: It's All About Roles

Before we dive in, it's crucial to understand that PostgreSQL handles users and groups under a unified concept: **roles**. A "user" is simply a role that has been granted the `LOGIN` privilege. This is an elegant design that simplifies permission management. When we ask Postgres to list users, we are actually asking it to list roles and their attributes.

## The Quick Method: Using the `psql` Meta-Command

For immediate, human-readable output directly in your terminal, the `psql` command-line interface is your best friend. The fastest way to get a list of all roles is with the `\du` meta-command.

1.  First, connect to your database using `psql`:
    ```bash
    psql -U your_superuser -d your_database
    ```

2.  Once connected, simply run the command:
    ```bash
    \du
    ```

You'll see a neatly formatted table listing all roles, their attributes (like `Superuser` or `Create DB`), and the roles they are members of.

```
                                     List of roles
  Role name      |                         Attributes                         |  Member of
-----------------+------------------------------------------------------------+-------------
 laravel_app     |                                                            | {}
 postgres        | Superuser, Create role, Create DB, Replication, Bypass RLS | {}
 rama            | Superuser, Create role, Create DB                          | {postgres}
 readonly_group  | Cannot login                                               | {}
```

From this output, we can quickly see that `laravel_app` and `rama` can log in (they don't have `Cannot login`), while `readonly_group` cannot.

## The Detailed Approach: Querying `pg_catalog.pg_roles`

When you need to list users programmatically—for instance, in a custom admin panel built in Laravel or a Go microservice—querying the system catalog is the superior method. The `pg_catalog.pg_roles` view contains the authoritative data on every role in the database cluster.

A direct SQL query gives you precise control.

```sql
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin
FROM pg_catalog.pg_roles;
```

This query is perfect for an application backend because it returns structured data. For example, to specifically list roles that are users (i.e., those who can log in), you can filter by the `rolcanlogin` boolean column.

```sql
SELECT rolname FROM pg_catalog.pg_roles WHERE rolcanlogin = true;
```

In a Laravel application, you could run this query easily using the `DB` facade to populate a user management dashboard, ensuring you only display actual users and not permission groups.

```php
// app/Http/Controllers/Admin/PostgresUserController.php
namespace App\Http\Controllers\Admin;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class PostgresUserController
{
    public function index()
    {
        // This query is safe from SQL injection as it has no user input.
        $users = DB::select("SELECT rolname FROM pg_catalog.pg_roles WHERE rolcanlogin = true;");

        return view('admin.users.index', ['users' => $users]);
    }
}
```

Mastering both the `\du` command for quick checks and the `pg_roles` catalog for application logic will make your PostgreSQL user management tasks far more efficient.
