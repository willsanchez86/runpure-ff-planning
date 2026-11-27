# ADR-0029: Give every table created_at and updated_at columns set by the database

**Status:** Accepted
**Date:** 2026-11-27
**Deciders:** William Sanchez

## Context

No data table records when a row was first loaded or last changed, so a corrected stat line can't be told apart from an untouched one. Every load is now an upsert ([ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md)), so a row is written only when it is new or changed, which makes such timestamps meaningful. MySQL can fill both columns itself: a default of the current time on insert, and an automatic update to the current time when any other column changes. That current time follows the database session's time zone.

## Decision

**Every table has a `created_at` column, set by the database when the row is inserted, and an `updated_at` column, set by the database when the row is inserted and whenever it changes; no application code writes them.**

- Applies to every table: the data tables, the mapping and lookup tables, the pipeline tables, and `users`.
- Every database connection runs in UTC, so both columns hold UTC times.
- Rows that exist when the columns are added get the time of that change as `created_at`, meaning "present when the columns were added", not "first seen".

*Proposed type (Claude, for the build):* `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`, plus `ON UPDATE CURRENT_TIMESTAMP` for `updated_at`. `DATETIME` doesn't convert by time zone and has no 2038 limit, unlike `TIMESTAMP`.

## Options Considered

### Option A — Both columns on every table, filled by the database (chosen)
| Dimension | Assessment |
|---|---|
| Accuracy | Set by MySQL itself; a load can't forget or fake them |
| "What changed in last night's load" | One query on `updated_at` |
| Cost | Two columns per table |

### Option B — No row timestamps
Not chosen by the project owner.

### Option C — Timestamps only on tables loaded by upsert
Not applicable once every table is upserted ([ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md)).

## Consequences

**Binding constraints:** every connection sets its session time zone to UTC; `created_at` is never written by a load or a reconciliation.

**Easier:** auditing corrections and freshness per row.
**Harder / to revisit:** a session not set to UTC would record local times; the connection setup must enforce it.

## Relationship to other decisions

- **Depends on** [ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md) (rows written only when new or changed).
- **Consistent with** [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) (MySQL is the only store) and [ADR-0011](ADR-0011-apply-schema-changes-by-hand-with-no-migration-tool.md) (the columns are added by a hand-applied statement).
