# ADR-0011: Map database rows to code by hand, without an ORM

**Status:** Accepted
**Date:** 2026-11-05
**Deciders:** William Sanchez

## Context

The app and pipeline are TypeScript ([ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md)) and the app database is MySQL ([ADR-0010](ADR-0010-store-pipeline-output-in-a-bucket-plus-mysql.md)). Code needs a way to read and write database rows as in-memory objects. The options run from writing SQL with hand-defined types, through typed query builders (Kysely) and lightweight ORMs (Drizzle), to full ORMs (Prisma).

The pipeline's heavy data work is SQL run in DuckDB, so an ORM would mainly serve the app side (users, settings, reading stats). Schema changes must go through migrations under the multi-user guardrail ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)).

## Decision

**Write SQL and define the object schemas in code by hand; use no ORM.** Database rows are mapped to the code's own TypeScript types and schemas, as the project owner has always done.

## Options Considered

### Option A — Hand-written SQL and hand-defined schemas (chosen)
| Dimension | Assessment |
|---|---|
| Control over queries | Full; every MySQL feature is usable directly |
| Extra dependencies and code generation | None |
| Keeping code types and tables in sync | By hand |
| Migrations | Needs a separate migration tool |
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
- A migration tool is still needed and has not been chosen.

## Relationship to other decisions

- **Depends on** [ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md) (TypeScript) and [ADR-0010](ADR-0010-store-pipeline-output-in-a-bucket-plus-mysql.md) (MySQL).
- **Serves** the migrations requirement of [ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)'s guardrail only once a migration tool is chosen.
