---
author: Qisthi Ramadhani
pubDatetime: 2026-03-12T00:00:00.000Z
title: "Export Database Tables to CSV in PostgreSQL, MySQL, SQLite, and Laravel"
featured: false
draft: true
tags:
  - postgresql
  - mysql
  - sqlite
  - laravel
  - sql
  - database
  - database-management
description: "Export query results to CSV using PostgreSQL COPY, MySQL SELECT INTO OUTFILE, SQLite .mode csv, and Laravel's streaming approach."
---

Someone from the business team needs "all orders from last quarter in a spreadsheet." Your analytics pipeline needs a daily dump of user activity. Or maybe you're migrating data between systems and CSV is the universal interchange format. Whatever the reason, exporting database tables to CSV is one of those tasks every developer encounters regularly, and the approach varies _significantly_ across databases. Let's look at the right tool for each one.

## The PostgreSQL Way: `COPY` and `\copy`

PostgreSQL provides two distinct CSV export mechanisms, and understanding the difference between them is critical.

### Server-Side: `COPY TO`

The `COPY` command runs on the _server_ and writes directly to the server's filesystem. This is the fastest option for large exports, but requires that the PostgreSQL process has write access to the target path.

```sql
-- Export an entire table to CSV with headers
COPY users TO '/tmp/users_export.csv' WITH (FORMAT CSV, HEADER);

-- Export a filtered query result
COPY (
    SELECT id, email, created_at
    FROM users
    WHERE created_at >= '2026-01-01'
    ORDER BY created_at
) TO '/tmp/recent_users.csv' WITH (FORMAT CSV, HEADER);

-- Custom delimiter (e.g., tab-separated)
COPY users TO '/tmp/users_export.tsv' WITH (FORMAT CSV, HEADER, DELIMITER E'\t');
```

### Client-Side: `\copy`

The `\copy` meta-command runs in `psql` and writes to the _client_ machine's filesystem. This is what you'll use when you don't have filesystem access to the database server -- which is most of the time with managed databases like Amazon RDS or DigitalOcean Managed Databases.

```bash
# Export from psql to your local machine
\copy users TO './users_export.csv' WITH (FORMAT CSV, HEADER)

# Export a query result
\copy (SELECT id, email, created_at FROM users WHERE created_at >= '2026-01-01') TO './recent_users.csv' WITH (FORMAT CSV, HEADER)
```

> _Note: Despite the similar syntax, `COPY` and `\copy` are fundamentally different. `COPY` is a SQL command executed by the server. `\copy` is a `psql` meta-command that streams the data over the client connection. For managed databases where you have no server filesystem access, `\copy` is your only option._

## The MySQL Way: `SELECT INTO OUTFILE` and `mysqldump`

### `SELECT INTO OUTFILE`

MySQL's built-in CSV export writes to the server's filesystem:

```sql
-- Export a table to CSV
SELECT *
INTO OUTFILE '/tmp/users_export.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
FROM users;

-- Export with headers (MySQL doesn't add them automatically)
SELECT 'id', 'email', 'name', 'created_at'
UNION ALL
SELECT id, email, name, created_at
INTO OUTFILE '/tmp/users_with_headers.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
FROM users;
```

The biggest gotcha with `SELECT INTO OUTFILE` is the `secure_file_priv` system variable. MySQL restricts file exports to a specific directory (or disables them entirely). Check your configuration:

```sql
-- Check where MySQL allows file exports
SHOW VARIABLES LIKE 'secure_file_priv';
```

### Using `mysqldump` with `--tab`

For client-side exports, `mysqldump` with the `--tab` flag produces separate `.sql` (schema) and `.txt` (data) files:

```bash
# Export table data as tab-separated values
mysqldump -u root -p --tab=/tmp --fields-terminated-by=',' --fields-enclosed-by='"' my_app_production users

# This creates:
# /tmp/users.sql  (CREATE TABLE statement)
# /tmp/users.txt  (CSV data)
```

### Quick Client-Side Alternative

When you just need a quick export from the command line without `OUTFILE` permissions:

```bash
# Pipe a query through mysql with column headers
mysql -u root -p -e "SELECT id, email, created_at FROM users" my_app_production | tr '\t' ',' > users_export.csv
```

## The SQLite Approach: `.mode csv` and `.output`

SQLite's CLI makes CSV export remarkably simple with its dot-commands:

```bash
# Open the database and configure CSV output
sqlite3 my_app.db

# Set output mode to CSV
.mode csv

# Include column headers
.headers on

# Direct output to a file
.output users_export.csv

# Run your query
SELECT id, email, name, created_at FROM users;

# Reset output back to the terminal
.output stdout
```

You can also do this as a one-liner from the shell:

```bash
# One-liner: export a query to CSV
sqlite3 -header -csv my_app.db "SELECT id, email, name, created_at FROM users;" > users_export.csv
```

> _Note: SQLite's CSV mode handles quoting and escaping automatically. Fields containing commas or quotes are properly enclosed. For very large databases, this approach streams rows directly to disk without loading everything into memory._

## The Laravel Way: Streaming CSV Responses

Inside a Laravel application, the cleanest approach for CSV export combines chunked database queries with PHP's native `fputcsv()` function. This pattern handles large datasets without exhausting memory.

### Streaming Download Response

```php
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

public function exportUsers(): StreamedResponse
{
    return response()->streamDownload(function () {
        $handle = fopen('php://output', 'w');

        // Write the header row
        fputcsv($handle, ['ID', 'Email', 'Name', 'Created At']);

        // Stream data in chunks to avoid memory exhaustion
        DB::table('users')
            ->orderBy('id')
            ->chunk(1000, function ($users) use ($handle) {
                foreach ($users as $user) {
                    fputcsv($handle, [
                        $user->id,
                        $user->email,
                        $user->name,
                        $user->created_at,
                    ]);
                }
            });

        fclose($handle);
    }, 'users_export.csv', [
        'Content-Type' => 'text/csv',
    ]);
}
```

The `chunk(1000, ...)` call processes 1,000 rows at a time, so even a table with millions of rows won't blow up your PHP memory limit.

### Using Laravel Excel (For Complex Exports)

For more complex scenarios -- multiple sheets, formatting, or very large datasets -- the `maatwebsite/excel` package is the de facto standard:

```php
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class UsersExport implements FromQuery, WithHeadings, WithChunkReading
{
    public function query()
    {
        return User::query()->where('active', true);
    }

    public function headings(): array
    {
        return ['ID', 'Email', 'Name', 'Created At'];
    }

    public function chunkSize(): int
    {
        return 1000;
    }
}

// In your controller:
return Excel::download(new UsersExport, 'users_export.csv');
```

### Why This is Superior in Laravel

1. **Database Agnostic**: The `DB::table()->chunk()` approach works identically on PostgreSQL, MySQL, and SQLite. No need to worry about `COPY`, `OUTFILE`, or `.mode csv` syntax differences.
2. **Testable**: You can write feature tests that assert the response is a CSV download with the correct headers and content -- something impossible with raw SQL file exports.
3. **Readable**: The streaming pattern clearly expresses intent: open a file, write headers, stream chunks, close. Any Laravel developer can understand and maintain it.

## Quick Reference

| Method | Best For | Server Access | Handles Large Data |
|---|---|---|---|
| PostgreSQL `COPY TO` | Server-side bulk export | Requires server filesystem | Yes (streaming) |
| PostgreSQL `\copy` | Client-side export | No server access needed | Yes (streaming) |
| MySQL `SELECT INTO OUTFILE` | Server-side export | Requires `secure_file_priv` path | Yes |
| MySQL `mysqldump --tab` | Client-side with schema | Requires server filesystem | Yes |
| SQLite `.mode csv` | Local/embedded databases | N/A (file-based) | Yes (streaming) |
| Laravel `streamDownload` | Web application exports | N/A (HTTP response) | Yes (chunked queries) |

**My recommendation**: For one-off exports from the terminal, use PostgreSQL's `\copy` or SQLite's `-header -csv` one-liner -- they're fast, require no server filesystem access, and produce clean output. For MySQL, the `mysql -e ... | tr` pipe trick avoids the `secure_file_priv` headache. Inside a Laravel application, always use the streaming `chunk()` + `fputcsv()` pattern for direct CSV downloads, or reach for the Laravel Excel package when you need advanced features like multiple sheets or formatted headers. Never load an entire table into memory with `get()` and then iterate -- that's a production outage waiting to happen.
