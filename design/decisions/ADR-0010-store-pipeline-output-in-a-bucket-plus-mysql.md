# ADR-0010: Store pipeline output in an object storage bucket plus MySQL

**Status:** Superseded by [ADR-0014](ADR-0014-store-all-pipeline-data-in-mysql-with-no-bucket.md)
**Date:** 2026-11-05
**Deciders:** William Sanchez

## Context

[ADR-0005](ADR-0005-store-pipeline-output-in-a-bucket-plus-postgres.md) chose an object storage bucket for raw downloads and dated copies, and Postgres for the app-ready tables, the ingest ledger and the run lock. It compared storage layouts, not database engines, so Postgres was never weighed against the alternatives.

A comparison of the realistic engines followed:
- **SQLite** serializes writers and fails the multi-user guardrail ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)) once there is a second instance. It is not a production option.
- **MySQL and Postgres** both meet the guardrail: both use multi-version concurrency control, so reads and writes don't block each other.
- **Differences found:**
  - MySQL's default collation compares text without regard to case or accents; the Player explorer PRD's name search ignores capitals and accents.
  - Postgres can roll back a set of schema changes inside one transaction; MySQL commits each schema change implicitly (still true in MySQL 9.5).
  - Both are supported by DuckDB's extensions for reading and writing, by the main TypeScript ORMs, and both have application-level named locks.
  - Verified free managed hosting: Postgres on Neon, Supabase and Aiven; MySQL on Aiven. Each free tier has limits (pausing, scale-to-zero, 0.5–1 GB).

## Decision

**Store raw downloads and dated copies in an object storage bucket, and use MySQL for the app database.** The bucket part of ADR-0005 is unchanged. MySQL replaces Postgres for:

1. The app-ready tables the Next.js app queries.
2. The ingest ledger and the run lock from [ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md).
3. User accounts and every account-owned row ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)).

## Options Considered

### Option A — Bucket plus MySQL (chosen)
| Dimension | Assessment |
|---|---|
| Concurrent writers (ADR-0001) | Meets it: multi-version concurrency control |
| Name search ignoring capitals and accents | Default behaviour |
| Schema-change safety | Each schema change commits on its own; a failed multi-step migration is not rolled back as a unit |
| DuckDB integration | Supported (MySQL extension, read and write) |
| Verified free managed hosting | Aiven |

### Option B — Bucket plus Postgres, as in ADR-0005 (not chosen)
Meets the same requirements and rolls back multi-step schema changes as a unit, with more verified free hosts. Name search ignoring accents needs extra setup. Not chosen by the project owner.

## Consequences

**Easier:** name search that ignores capitals and accents works without extra setup.
**Harder / to revisit:** migrations can't be rolled back as a unit, so each migration step must be safe to re-run or fix forward. Fewer verified free managed hosts (Aiven only); hosting is still open.

## Relationship to other decisions

- **Supersedes** [ADR-0005](ADR-0005-store-pipeline-output-in-a-bucket-plus-postgres.md) in full, restating its bucket decision unchanged.
- **Changes where [ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md)'s run lock and ingest ledger live:** in MySQL, not Postgres. ADR-0006's load strategy is otherwise unchanged.
- **Meets** the concurrent-writer requirement of [ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md).
- **Paired with** [ADR-0011](ADR-0011-map-database-rows-to-code-by-hand-without-an-orm.md), which decides how the code talks to MySQL.

Sources: [MySQL consistent reads](https://dev.mysql.com/doc/refman/en/innodb-consistent-read.html), [MySQL case sensitivity in string searches](https://dev.mysql.com/doc/refman/en/case-sensitivity.html), [MySQL 9.5 atomic DDL](https://docs.oracle.com/cd/E17952_01/mysql-9.5-en/atomic-ddl.html), [DuckDB MySQL extension](https://duckdb.org/docs/current/core_extensions/mysql.html), [Aiven free tier](https://aiven.io/docs/platform/howto/custom-plans).
