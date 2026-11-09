# ADR-0010: Map database rows to code by hand, without an ORM

**Status:** Accepted
**Date:** 2026-11-05
**Revised:** 2026-11-08, in place, at the owner's direction (not finalized): the DuckDB assumption and the open migration-tool item removed, per ADR-0012 and ADR-0011. 2026-11-09: **Rules out** line added for the doc check.
**Deciders:** William Sanchez
**Rules out:** ORM

## Context

The app and pipeline are TypeScript ([ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md)) and the app database is MySQL ([ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md)). Code needs a way to read and write database rows as in-memory objects. The options run from writing SQL with hand-defined types, through typed query builders (Kysely) and lightweight ORMs (Drizzle), to full ORMs (Prisma).

The pipeline's data work is hand-written TypeScript and MySQL SQL ([ADR-0012](ADR-0012-transform-pipeline-data-in-typescript-and-mysql-with-no-transform-library.md)), so an ORM would mainly serve the app side (users, settings, reading stats). Schema changes are applied by hand ([ADR-0011](ADR-0011-apply-schema-changes-by-hand-with-no-migration-tool.md)).

## Decision

**Write SQL and define the object schemas in code by hand; use no ORM.** Database rows are mapped to the code's own TypeScript types and schemas, as the project owner has always done.

## Options Considered

### Option A — Hand-written SQL and hand-defined schemas (chosen)
| Dimension | Assessment |
|---|---|
| Control over queries | Full; every MySQL feature is usable directly |
| Extra dependencies and code generation | None |
| Keeping code types and tables in sync | By hand |
| Schema changes | Applied by hand, with no migration tool (ADR-0011) |
| Familiarity | The owner's existing practice |

### Option B — Typed query builder, e.g. Kysely (not chosen)
Types are still hand-defined, and queries are checked at build time. Adds a dependency for a benefit the owner's practice already covers.

### Option C — Lightweight ORM, e.g. Drizzle (not chosen)
One TypeScript schema produces types and migrations, staying close to SQL. Adds a dependency and its own conventions.

### Option D — Full ORM, e.g. Prisma (not chosen)
Most automation, through a separate schema language and generated client code; furthest from SQL.

## Consequences

**Easier:** queries use MySQL directly, with nothing between the code and the database; no generated code to maintain.
**Harder / to revisit:**
- Code types and table definitions must be kept in sync by hand.
- Every query must use parameters, never string-built SQL, to prevent SQL injection.

## Relationship to other decisions

- **Depends on** [ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md) (TypeScript) and [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) (MySQL).
- **Paired with** [ADR-0011](ADR-0011-apply-schema-changes-by-hand-with-no-migration-tool.md) (schema changes applied by hand) and [ADR-0012](ADR-0012-transform-pipeline-data-in-typescript-and-mysql-with-no-transform-library.md) (transforms in TypeScript and MySQL).
