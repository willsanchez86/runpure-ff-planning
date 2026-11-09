# ADR-0013: Transform pipeline data in TypeScript and MySQL, with no transform library

**Status:** Accepted
**Date:** 2026-11-06
**Deciders:** William Sanchez

## Context

The pipeline is written in TypeScript and runs as a scheduled job inside the app server ([ADR-0008](ADR-0008-run-scheduled-jobs-inside-the-app-server-for-phase-1.md), [ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md)). Raw downloads go to the bucket and app-ready tables to MySQL ([ADR-0010](ADR-0010-store-pipeline-output-in-a-bucket-plus-mysql.md)). ADR-0009 assumed DuckDB would carry the data-heavy work: reading source files, transforming them and writing to the database.

DuckDB is an in-process analytical SQL engine, not a separate server. Used here, it would be a transform step inside the job, either in memory or as a persistent file. Similar in-process options exist for Node, and the transform can also be done with no added library.

The size of the data and the shape of the transforms have not been estimated yet. Fantasy points are calculated in the app from stored stats ([ADR-0007](ADR-0007-calculate-fantasy-points-in-the-app-from-stored-stats.md)), so the pipeline doesn't do the scoring itself. The transform step lives inside the job, so changing it later doesn't touch the schema or the app.

## Decision

**Use no transform library: transform pipeline data in TypeScript code and in MySQL SQL.**

## Options Considered

### Option A — Plain TypeScript plus MySQL SQL (chosen)
| Dimension | Assessment |
|---|---|
| Added dependencies | None |
| Fit with existing decisions | Same language as the job (ADR-0009); same hand-written approach as ADR-0011 and ADR-0012 |
| Joins and aggregations | In TypeScript code, or in MySQL (for example staging tables plus `INSERT … SELECT`) |
| Reading source files | Done by our own code |
| Cost to change later | Low: confined to the job's transform step |

### Option B — DuckDB, in memory or as a persistent file (not chosen)
An in-process SQL engine that can read files directly and write to MySQL through its MySQL extension. It adds a native dependency and a second SQL dialect, and its benefit is unproven until the data is sized.

### Option C — nodejs-polars (not chosen)
The server-side Node bindings for the Polars DataFrame library; MIT-licensed and actively maintained. Adds a native dependency and a DataFrame API alongside SQL.

### Option D — chDB-node (not chosen)
ClickHouse run inside the Node process, with SQL queries. Adds a native dependency and a second SQL dialect.

### Option E — Arquero (not chosen)
A pure-JavaScript, dplyr-style table-transformation library (BSD-3). Last pushed in February 2025.

## Consequences

**Easier:** no extra dependency or native binary in the app's container; one SQL dialect (MySQL); transforms are written the way the rest of the code is.
**Harder / to revisit:**
- ADR-0009 assumed DuckDB would read the source files and do the data-heavy work. Our TypeScript code now downloads and parses the source files, and joins and aggregations are written in TypeScript or MySQL.
- The 2017–2026 backfill ([ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md)) is the largest load and has not been sized.
- Revisit if the sized data or the transforms prove too heavy for TypeScript and MySQL.

## Relationship to other decisions

- **Changes an assumption in** [ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md), that DuckDB carries the data-heavy work. ADR-0009's decision (TypeScript) is unchanged.
- **Depends on** [ADR-0008](ADR-0008-run-scheduled-jobs-inside-the-app-server-for-phase-1.md) (job inside the app server) and [ADR-0010](ADR-0010-store-pipeline-output-in-a-bucket-plus-mysql.md) (MySQL).
- **Consistent with** [ADR-0011](ADR-0011-map-database-rows-to-code-by-hand-without-an-orm.md) and [ADR-0012](ADR-0012-apply-schema-changes-by-hand-with-no-migration-tool.md) (hand-written code and SQL, no added tooling).

Sources: [DuckDB Node.js client](https://duckdb.org/docs/current/clients/node_neo/overview.html), [DuckDB MySQL extension](https://duckdb.org/docs/current/core_extensions/mysql.html), [nodejs-polars](https://github.com/pola-rs/nodejs-polars), [chDB for Node.js](https://clickhouse.com/docs/chdb/install/nodejs), [Arquero](https://github.com/uwdata/arquero).
