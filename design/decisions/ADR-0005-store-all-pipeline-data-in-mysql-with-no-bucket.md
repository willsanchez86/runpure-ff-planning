# ADR-0005: Store all pipeline data in MySQL, with no object storage bucket

**Status:** Accepted
**Date:** 2026-11-05
**Revised:** 2026-11-08, in place, at the owner's direction (not finalized): this ADR now carries the decisions that replaced its earlier versions. First version (2026-11-05): an object storage bucket plus Postgres. Second (2026-11-05): a bucket plus MySQL. Current (2026-11-06): MySQL only, no bucket. 2026-11-09: **Rules out** line added for the doc check.
**Deciders:** William Sanchez
**Rules out:** object storage bucket; Parquet; Postgres; SQLite

## Context

The pipeline produces app-ready tables, the ingest ledger and run lock ([ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md)), and the dated Sleeper player-list copies ([ADR-0004](ADR-0004-keep-dated-copies-of-every-sleeper-player-list-pull.md)). The app also stores user accounts and account-owned rows ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)).

**Database engine.** The first version of this decision chose Postgres while comparing storage layouts, not engines. A comparison of the realistic engines followed:
- **SQLite** serializes writers and fails the multi-user guardrail ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)) once there is a second instance. It is not a production option.
- **MySQL and Postgres** both meet the guardrail: both use multi-version concurrency control, so reads and writes don't block each other.
- **Differences found:**
  - MySQL's default collation compares text without regard to case or accents; the Player explorer PRD's name search ignores capitals and accents.
  - Postgres can roll back a set of schema changes inside one transaction; MySQL commits each schema change implicitly.
  - Both have application-level named locks.

**Raw files.** Earlier versions also kept raw downloads and dated copies in an object storage bucket. With no transform library ([ADR-0012](ADR-0012-transform-pipeline-data-in-typescript-and-mysql-with-no-transform-library.md)), the pipeline downloads each source file, parses it, and loads the result straight into MySQL.
- **nflverse data** can be downloaded again at any time, so a saved raw copy only means we could rebuild without downloading again.
- **The Sleeper player list** returns only the current state. The dated copies required by ADR-0004 are the only record of past days.

## Decision

**Use MySQL as the only store, with no object storage bucket: don't keep raw downloads, and keep ADR-0004's dated Sleeper player-list copies as rows in MySQL.** MySQL holds:

1. The app-ready tables the API reads.
2. The ingest ledger and the run lock from [ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md).
3. User accounts and every account-owned row ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)).
4. The dated Sleeper player-list copies ([ADR-0004](ADR-0004-keep-dated-copies-of-every-sleeper-player-list-pull.md)).

## Options Considered

### Option A — MySQL only (chosen)
| Dimension | Assessment |
|---|---|
| Services to run | One (MySQL) |
| Concurrent writers (ADR-0001) | Meets it: multi-version concurrency control |
| Name search ignoring capitals and accents | Default behaviour |
| Schema-change safety | Each schema change commits on its own; a failed multi-step change is not rolled back as a unit |
| Rebuilding loaded data | Download again from the sources |
| Sleeper player-list history | Kept, as dated rows in MySQL |

### Option B — Bucket plus MySQL (the second version; not chosen)
Keeps raw downloads so the database can be rebuilt without downloading again. Adds a second storage service and provider that the pipeline doesn't otherwise need.

### Option C — Bucket plus Postgres (the first version; not chosen)
Meets the same requirements and rolls back multi-step schema changes as a unit. Name search ignoring accents needs extra setup. Not chosen by the project owner.

### Option D — SQLite (rejected)
Serializes writers, so it fails the multi-user guardrail once there is a second instance.

## Consequences

**Easier:** one storage service; name search that ignores capitals and accents works without extra setup; no file layout or bucket permissions to manage.
**Harder / to revisit:**
- Schema changes can't be rolled back as a unit, so each change must be safe to re-run or fix forward.
- No saved raw files: a load error is fixed by downloading from the source again.
- The dated Sleeper copies grow MySQL's storage. ADR-0004 estimates about 1.8 GB a year before compression if each full list is kept.
- ADR-0004's confirmation is met by one dated set of rows per pull.
- The MySQL host is a deployment-phase decision.

## Relationship to other decisions

- **Changes where** [ADR-0004](ADR-0004-keep-dated-copies-of-every-sleeper-player-list-pull.md)'s dated copies are kept: in MySQL. ADR-0004's decision is unchanged.
- **Keeps** [ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md)'s run lock and ingest ledger in MySQL.
- **Meets** the concurrent-writer requirement of [ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md).
- **Paired with** [ADR-0010](ADR-0010-map-database-rows-to-code-by-hand-without-an-orm.md), which decides how the code talks to MySQL.
- **Follows from** [ADR-0012](ADR-0012-transform-pipeline-data-in-typescript-and-mysql-with-no-transform-library.md) (files are parsed and loaded directly).

Sources: [MySQL consistent reads](https://dev.mysql.com/doc/refman/en/innodb-consistent-read.html), [MySQL case sensitivity in string searches](https://dev.mysql.com/doc/refman/en/case-sensitivity.html), [MySQL 9.5 atomic DDL](https://docs.oracle.com/cd/E17952_01/mysql-9.5-en/atomic-ddl.html).
