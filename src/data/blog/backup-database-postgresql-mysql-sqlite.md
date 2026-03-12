---
author: Qisthi Ramadhani
pubDatetime: 2026-03-12T00:00:00.000Z
title: "Backup and Restore Databases: PostgreSQL pg_dump, MySQL mysqldump, and SQLite"
featured: false
draft: true
tags:
  - postgresql
  - mysql
  - sqlite
  - sql
  - database
  - database-management
  - backup
  - devops-and-infrastructure
description: "Master database backups with pg_dump, mysqldump, and SQLite .backup command, plus restore workflows and automation tips."
---

You've spent months building your application, your schema is pristine, and your data is invaluable. Then one day, a migration goes sideways, a `DROP TABLE` fires against the wrong database, or a disk simply dies. If you don't have a _tested_ backup strategy, that day becomes the worst of your career. Let's walk through the reliable, battle-proven tools each major database provides for backing up and restoring your data.

## The PostgreSQL Way: `pg_dump` and `pg_restore`

PostgreSQL ships with `pg_dump`, one of the most versatile backup utilities in the database world. It supports two primary output formats: plain SQL and the custom compressed format.

### Plain SQL Dump

The simplest approach produces a readable `.sql` file containing all the `CREATE TABLE` and `INSERT` statements needed to reconstruct your database from scratch.

```bash
# Dump the entire database to a plain SQL file
pg_dump -U postgres -d my_app_production > backup_2026_03_12.sql

# Dump only the schema (no data)
pg_dump -U postgres -d my_app_production --schema-only > schema_only.sql

# Dump a single table
pg_dump -U postgres -d my_app_production -t users > users_table.sql
```

Restoring from a plain SQL dump is straightforward:

```bash
# Restore into a fresh database
psql -U postgres -d my_app_staging < backup_2026_03_12.sql
```

### Custom Format (Recommended for Production)

The custom format (`-Fc`) produces a compressed, non-plain-text archive that supports _selective restore_ and parallel jobs. This is what I use in every production environment.

```bash
# Create a compressed custom-format backup
pg_dump -U postgres -Fc -d my_app_production -f backup_2026_03_12.dump

# Restore from custom format (supports parallel jobs)
pg_restore -U postgres -d my_app_staging -j 4 backup_2026_03_12.dump

# Restore only a specific table from the archive
pg_restore -U postgres -d my_app_staging -t orders backup_2026_03_12.dump
```

The `-j 4` flag runs four parallel restore jobs, which can dramatically speed up recovery on large databases.

> _Note: The custom format with `pg_restore` allows you to selectively restore individual tables or schemas from a single backup file. This flexibility alone makes it worth adopting over plain SQL dumps._

## The MySQL Way: `mysqldump` and Restore

`mysqldump` is the standard logical backup tool for MySQL. It generates a plain SQL file by default.

```bash
# Dump the entire database
mysqldump -u root -p my_app_production > backup_2026_03_12.sql

# Dump with common production flags
mysqldump -u root -p \
  --single-transaction \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  my_app_production > backup_2026_03_12.sql

# Dump specific tables only
mysqldump -u root -p my_app_production users orders > partial_backup.sql
```

The `--single-transaction` flag is _critical_ for InnoDB tables -- it ensures a consistent snapshot without locking the entire database. Without it, you risk backing up data in an inconsistent state.

Restoring is done through the `mysql` client:

```bash
# Restore into a database
mysql -u root -p my_app_staging < backup_2026_03_12.sql
```

### Compressed Backups

For large databases, piping through `gzip` is standard practice:

```bash
# Backup with compression
mysqldump -u root -p --single-transaction my_app_production | gzip > backup_2026_03_12.sql.gz

# Restore from compressed backup
gunzip < backup_2026_03_12.sql.gz | mysql -u root -p my_app_staging
```

## The SQLite Approach: File Copy and `.backup`

SQLite stores everything in a single file, which makes backups deceptively simple -- but there's a catch. You _cannot_ just copy the file while the application is writing to it; you'll risk a corrupted backup.

### Using the `.backup` Command (Safe)

The `sqlite3` CLI provides a built-in `.backup` command that creates a consistent copy even while the database is in use:

```bash
# Safe backup using the .backup command
sqlite3 my_app.db ".backup 'backup_2026_03_12.db'"
```

### Using the Online Backup API via SQL

You can also use the `VACUUM INTO` statement, which creates a compacted copy:

```sql
-- Creates a compacted, defragmented backup copy
VACUUM INTO '/backups/backup_2026_03_12.db';
```

### Safe File Copy (When Database is Idle)

If you can guarantee no writes are happening (e.g., during a maintenance window), a simple file copy works:

```bash
# Only safe when no connections are active
cp my_app.db backup_2026_03_12.db
```

> _Note: Never use `cp` on a SQLite database that has active writers. Use `.backup` or `VACUUM INTO` instead -- they handle the write-ahead log (WAL) correctly._

Restoring a SQLite backup is as simple as replacing the file:

```bash
# Stop your application first, then replace
cp backup_2026_03_12.db my_app.db
```

## Automating Backups

A backup strategy is only as good as its automation. Here's a practical shell script that handles daily backups with rotation for PostgreSQL. The same pattern applies to MySQL and SQLite with minor adjustments.

```bash
#!/bin/bash
# daily_backup.sh -- Automated PostgreSQL backup with 7-day rotation

BACKUP_DIR="/var/backups/postgresql"
DB_NAME="my_app_production"
DB_USER="postgres"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Run the backup (custom format, compressed)
pg_dump -U "$DB_USER" -Fc "$DB_NAME" -f "$BACKUP_FILE"

# Check if backup succeeded
if [ $? -eq 0 ]; then
    echo "[$(date)] Backup successful: $BACKUP_FILE"
else
    echo "[$(date)] ERROR: Backup failed for $DB_NAME" >&2
    exit 1
fi

# Delete backups older than retention period
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Cleanup complete. Removed backups older than $RETENTION_DAYS days."
```

Schedule it with cron to run daily at 2 AM:

```bash
# Add to crontab with: crontab -e
0 2 * * * /opt/scripts/daily_backup.sh >> /var/log/db_backup.log 2>&1
```

For MySQL, replace the `pg_dump` line with:

```bash
mysqldump -u "$DB_USER" -p"$DB_PASS" --single-transaction "$DB_NAME" | gzip > "${BACKUP_FILE}.sql.gz"
```

For SQLite, replace it with:

```bash
sqlite3 "$DB_FILE" ".backup '${BACKUP_FILE}'"
```

## Quick Reference

| Database | Backup Command | Restore Command | Compressed | Selective Restore |
|---|---|---|---|---|
| PostgreSQL (plain) | `pg_dump -d mydb > file.sql` | `psql -d mydb < file.sql` | Pipe through `gzip` | No |
| PostgreSQL (custom) | `pg_dump -Fc -d mydb -f file.dump` | `pg_restore -d mydb file.dump` | Built-in | Yes (`-t table`) |
| MySQL | `mysqldump --single-transaction mydb > file.sql` | `mysql mydb < file.sql` | Pipe through `gzip` | No |
| SQLite | `sqlite3 mydb.db ".backup 'file.db'"` | `cp file.db mydb.db` | N/A (small files) | No |

**My recommendation**: For PostgreSQL, always use the custom format (`-Fc`) in production -- the selective restore and built-in compression are worth it. For MySQL, never forget `--single-transaction` on InnoDB databases. For SQLite, use `.backup` or `VACUUM INTO` instead of raw file copies. Whatever database you use, automate it with a cron job, test your restores regularly, and store at least one copy off-site. A backup you've never tested is not a backup -- it's a hope.
