---
author: Qisthi Ramadhani
pubDatetime: 2026-03-12T00:00:00.000Z
title: "Grant and Revoke Permissions in PostgreSQL and MySQL: A Practical Guide"
featured: false
draft: true
tags:
  - postgresql
  - mysql
  - sql
  - database
  - database-management
  - security
description: "Learn GRANT and REVOKE syntax for PostgreSQL roles and MySQL users, including read-only access, schema-level, and table-level permissions."
---

Your Laravel application connects to the database as `root` with full superuser privileges. It works, sure -- until a bug in your code accidentally runs a `DROP TABLE` in production, or worse, an SQL injection attack gains unrestricted access to every table in your system. The principle of _least privilege_ isn't optional for production databases; it's foundational. Let's walk through how to properly manage permissions in the two most popular open-source databases.

## The PostgreSQL Way: Roles and Granular Privileges

PostgreSQL uses a unified _role_ system for both users and groups. A "user" is simply a role with the `LOGIN` privilege. This elegant design lets you build layered permission structures with role inheritance.

### Creating Roles

```sql
-- Create an application user with login capability
CREATE ROLE app_user WITH LOGIN PASSWORD 'strong_password_here';

-- Create a read-only role (no login -- used as a group)
CREATE ROLE readonly_group NOLOGIN;

-- Create a developer role that inherits from readonly
CREATE ROLE developer WITH LOGIN PASSWORD 'dev_password' IN ROLE readonly_group;
```

### Granting Permissions

PostgreSQL supports granting at the database, schema, and table level:

```sql
-- Grant connect access to a specific database
GRANT CONNECT ON DATABASE my_app_production TO app_user;

-- Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO app_user;

-- Grant specific table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Grant read-only access to the readonly group
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_group;

-- Grant access to sequences (needed for INSERT with auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

### Default Privileges for Future Tables

A common pitfall: you grant permissions on all existing tables, then create a new table next week, and your application can't access it. `ALTER DEFAULT PRIVILEGES` solves this:

```sql
-- Ensure app_user automatically gets permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- Ensure readonly_group gets SELECT on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO readonly_group;

-- Same for sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app_user;
```

### Revoking Permissions

```sql
-- Remove write access, keeping read-only
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM app_user;

-- Remove all privileges from a role
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM former_employee;

-- Remove role membership
REVOKE readonly_group FROM developer;
```

### Role Membership (Group Inheritance)

```sql
-- Add a user to a group role
GRANT readonly_group TO new_analyst;

-- The new_analyst now inherits all permissions from readonly_group
```

> _Note: Use `\du` in `psql` to quickly list all roles and their attributes, or query `pg_catalog.pg_roles` programmatically. See my [guide on listing PostgreSQL users](/posts/postgresql-list-users) for the full breakdown._

## The MySQL Way: User@Host and `FLUSH PRIVILEGES`

MySQL's permission system is built around the `user@host` identity pattern. The same username can have different privileges depending on which host they connect from -- a design that's both powerful and confusing if you're coming from PostgreSQL.

### Creating Users

```sql
-- Create a user that can connect from any host
CREATE USER 'app_user'@'%' IDENTIFIED BY 'strong_password_here';

-- Create a user restricted to localhost
CREATE USER 'admin_user'@'localhost' IDENTIFIED BY 'admin_password';

-- Create a user restricted to a specific IP range
CREATE USER 'remote_user'@'10.0.0.%' IDENTIFIED BY 'remote_password';
```

### Granting Permissions

```sql
-- Grant full access on a specific database
GRANT SELECT, INSERT, UPDATE, DELETE ON my_app_production.* TO 'app_user'@'%';

-- Grant read-only access
GRANT SELECT ON my_app_production.* TO 'readonly_user'@'%';

-- Grant access to a specific table only
GRANT SELECT, INSERT ON my_app_production.orders TO 'orders_service'@'10.0.0.%';

-- Grant all privileges (use sparingly)
GRANT ALL PRIVILEGES ON my_app_production.* TO 'admin_user'@'localhost';

-- Apply the changes
FLUSH PRIVILEGES;
```

The `FLUSH PRIVILEGES` command reloads the grant tables. It's technically only required when you modify the grant tables directly with `INSERT` or `UPDATE` statements, but running it after `GRANT`/`REVOKE` is a safe habit.

### Viewing Grants

```sql
-- Show grants for a specific user
SHOW GRANTS FOR 'app_user'@'%';

-- Show grants for the current user
SHOW GRANTS;
```

### Revoking Permissions

```sql
-- Remove write access
REVOKE INSERT, UPDATE, DELETE ON my_app_production.* FROM 'app_user'@'%';

-- Remove all privileges
REVOKE ALL PRIVILEGES ON my_app_production.* FROM 'former_employee'@'%';

FLUSH PRIVILEGES;
```

### Dropping Users

```sql
-- Remove a user entirely
DROP USER 'former_employee'@'%';
```

> _Note: In MySQL, the `@'%'` wildcard matches any host, but it does **not** match `localhost` connections on some configurations. If your application connects via a Unix socket, you may need to grant to both `'user'@'localhost'` and `'user'@'%'` to cover all connection paths._

## A Note on SQLite

SQLite doesn't have a user permission system. It's a serverless, file-based database where access control is handled entirely at the _filesystem level_ -- if a process can read the `.db` file, it has full access to all data. For SQLite deployments, use OS-level file permissions (`chmod`, `chown`) and ensure the database file is not accessible from the web root.

## Security Best Practices

Understanding the syntax is only half the battle. Here are the principles that should guide every permission decision in production:

### 1. The Principle of Least Privilege

Every database user should have _exactly_ the permissions required for their function and nothing more. Your web application does not need `DROP TABLE` or `CREATE DATABASE` privileges. A reporting dashboard does not need `INSERT` or `UPDATE`.

```sql
-- PostgreSQL: A well-scoped application role
CREATE ROLE web_app WITH LOGIN PASSWORD 'app_password';
GRANT CONNECT ON DATABASE my_app_production TO web_app;
GRANT USAGE ON SCHEMA public TO web_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_app;
-- Notice: no TRUNCATE, no DROP, no CREATE, no REFERENCES
```

### 2. Separate Roles by Function

Create distinct roles for different parts of your system:

```sql
-- PostgreSQL example: role separation
CREATE ROLE web_app WITH LOGIN PASSWORD 'app_pass';      -- CRUD only
CREATE ROLE migrator WITH LOGIN PASSWORD 'migrate_pass';  -- DDL for migrations
CREATE ROLE analyst WITH LOGIN PASSWORD 'analyst_pass';   -- SELECT only
CREATE ROLE backup_agent WITH LOGIN PASSWORD 'backup_pass'; -- pg_dump access

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO migrator;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analyst;
```

### 3. Audit Regularly

Schedule periodic reviews of who has access to what:

```sql
-- PostgreSQL: list all privileges on tables in the public schema
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
ORDER BY grantee, table_name;
```

```sql
-- MySQL: list all user privileges
SELECT user, host, db, Select_priv, Insert_priv, Update_priv, Delete_priv
FROM mysql.db
WHERE db = 'my_app_production';
```

## Quick Reference

| Operation | PostgreSQL | MySQL |
|---|---|---|
| Create user | `CREATE ROLE name WITH LOGIN PASSWORD '...'` | `CREATE USER 'name'@'host' IDENTIFIED BY '...'` |
| Grant SELECT | `GRANT SELECT ON ALL TABLES IN SCHEMA public TO role` | `GRANT SELECT ON db.* TO 'user'@'host'` |
| Grant CRUD | `GRANT SELECT, INSERT, UPDATE, DELETE ON ...` | `GRANT SELECT, INSERT, UPDATE, DELETE ON ...` |
| Future tables | `ALTER DEFAULT PRIVILEGES ... GRANT ...` | Not supported (re-grant needed) |
| Role groups | `GRANT group_role TO user_role` | `GRANT role TO user` (MySQL 8.0+) |
| View grants | `\du` or `information_schema.table_privileges` | `SHOW GRANTS FOR 'user'@'host'` |
| Revoke | `REVOKE privilege ON ... FROM role` | `REVOKE privilege ON ... FROM 'user'@'host'` |
| Drop user | `DROP ROLE name` | `DROP USER 'name'@'host'` |

**My recommendation**: Never let your application connect as `root` or a superuser -- create a dedicated role with only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on the specific schema it needs. Use a separate migration role with broader DDL privileges, and run migrations through a controlled deployment pipeline, not through the application at runtime. For PostgreSQL, always set `ALTER DEFAULT PRIVILEGES` so new tables automatically inherit the correct grants. For MySQL, audit with `SHOW GRANTS` after every infrastructure change. The five minutes you spend setting up proper permissions today will save you from the breach that costs you everything tomorrow.
