# ADR-0011: Apply schema changes by hand, with no migration tool

**Status:** Accepted
**Date:** 2026-11-05
**Revised:** 2026-11-08, in place, at the owner's direction (not finalized): wording of its link to ADR-0010 updated after ADR-0010's revision. 2026-11-09: keeping each statement in order in `sql/` recorded as part of the decision, as the ETL spec and system design already apply it. 2026-11-09: **Rules out** line added for the doc check.
**Deciders:** William Sanchez
**Rules out:** migration tool

## Context

The app database is MySQL ([ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md)), and rows are mapped to code by hand ([ADR-0010](ADR-0010-map-database-rows-to-code-by-hand-without-an-orm.md)). ADR-0010 doesn't decide how schema changes reach each database: a local copy now, and a hosted copy later.

Two established approaches use tooling:
- **Migration-based:** numbered change scripts, each applied once, with a table recording which have run (e.g. Flyway, dbmate, Rails migrations).
- **State-based:** one file describes the whole schema, and a tool compares it with the live database and generates the changes (e.g. Liquibase's diff).

The project owner has managed production MySQL databases for years by applying `CREATE`, `ALTER` and `DROP` statements by hand as needed. One developer owns the schema.

## Decision

**Apply schema changes by hand, as `CREATE`, `ALTER` and `DROP` statements run when needed, with no migration tool.**

## Options Considered

### Option A — Hand-applied statements (chosen)
| Dimension | Assessment |
|---|---|
| Setup | None |
| Fit with the owner's practice | Matches years of production use |
| Tracking which changes reached which database | Manual |
| Rebuilding a database from scratch | Only from whatever statements were kept |
| Number of people changing the schema | One, so no coordination is needed |

### Option B — Migration-based tool, e.g. dbmate or Flyway (not chosen)
Records which change scripts each database has run and applies pending ones in order. Adds a tool and a convention that one developer with two database copies doesn't need.

### Option C — State-based diff tool (not chosen)
One schema file as the source of truth; a tool generates the changes. Adds a tool, with less control over the exact statements run.

## Consequences

**Binding:** every statement run is kept in the backend repo's `sql/` folder, one numbered file per change (`sql/000N_*.sql`), and applied in order to each database.

**Preference (not binding):** connect with MySQL Workbench (locally, and to the hosted database through an SSH tunnel).

**Easier:** no tool to install, learn or maintain; schema changes are made the way the owner already works.
**Harder / to revisit:**
- Local and hosted databases can drift apart if a change is applied to one and not the other.
- Rebuilding a database from scratch depends on statements having been kept.
- Revisit if a second person starts changing the schema, or the number of database copies grows.

## Relationship to other decisions

- **Completes** [ADR-0010](ADR-0010-map-database-rows-to-code-by-hand-without-an-orm.md): schema changes are applied by hand, with no migration tool.
- **Changes how** the multi-user guardrail's schema-change requirement ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md); [`design/system-design.md`](../system-design.md) §0, row 10, "schema changes only through migrations") is met: by hand-applied statements, not a migration tool.
- **Depends on** [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) (MySQL).
