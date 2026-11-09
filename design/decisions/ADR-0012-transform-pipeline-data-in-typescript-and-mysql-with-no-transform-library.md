# ADR-0012: Transform pipeline data in TypeScript and MySQL, with no transform library

**Status:** Accepted
**Date:** 2026-11-06
**Revised:** 2026-11-08, in place, at the owner's direction (not finalized): references to ADR-0009's earlier DuckDB assumption updated; data size added. 2026-11-09: Option B's wording aligned with the sized data. 2026-11-09: **Rules out** line added for the doc check.
**Deciders:** William Sanchez
**Rules out:** DuckDB; transform library

## Context

The pipeline is written in TypeScript and runs as a scheduled job inside the backend server ([ADR-0008](ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md), [ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md)). App-ready tables go to MySQL ([ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md)). The first version of ADR-0009 assumed DuckDB would carry the data-heavy work: reading source files, transforming them and writing to the database.

DuckDB is an in-process analytical SQL engine, not a separate server. Used here, it would be a transform step inside the job, either in memory or as a persistent file. Similar in-process options exist for Node, and the transform can also be done with no added library.

The data was sized on 2026-11-08: about 300 MB of CSV for Phase 1, an estimated 515 MB in MySQL (ETL spec §7.2.4). Fantasy points are calculated in the app from stored stats ([ADR-0007](ADR-0007-calculate-fantasy-points-in-the-app-from-stored-stats.md)), so the pipeline doesn't do the scoring itself. The transform step lives inside the job, so changing it later doesn't touch the schema or the app.

## Decision

**Use no transform library: transform pipeline data in TypeScript code and in MySQL SQL.**

## Options Considered

### Option A — Plain TypeScript plus MySQL SQL (chosen)
| Dimension | Assessment |
|---|---|
| Added dependencies | None |
| Fit with existing decisions | Same language as the job (ADR-0009); same hand-written approach as ADR-0010 and ADR-0011 |
| Joins and aggregations | In TypeScript code, or in MySQL (for example staging tables plus `INSERT … SELECT`) |
| Reading source files | Done by our own code |
| Cost to change later | Low: confined to the job's transform step |

### Option B — DuckDB, in memory or as a persistent file (not chosen)
An in-process SQL engine that can read files directly and write to MySQL through its MySQL extension. It adds a native dependency and a second SQL dialect, and the sized data (about 300 MB of CSV for Phase 1) doesn't need it.

### Option C — nodejs-polars (not chosen)
The server-side Node bindings for the Polars DataFrame library; MIT-licensed and actively maintained. Adds a native dependency and a DataFrame API alongside SQL.

### Option D — chDB-node (not chosen)
ClickHouse run inside the Node process, with SQL queries. Adds a native dependency and a second SQL dialect.

### Option E — Arquero (not chosen)
A pure-JavaScript, dplyr-style table-transformation library (BSD-3). Last pushed in February 2025.

## Consequences

**Easier:** no extra dependency or native binary in the app's container; one SQL dialect (MySQL); transforms are written the way the rest of the code is.
**Harder / to revisit:**
- Our TypeScript code downloads and parses the source files, and joins and aggregations are written in TypeScript or MySQL.
- The 2017–2026 backfill ([ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md)) is the largest load: about 300 MB of CSV and an estimated 515 MB in MySQL (ETL spec §7.2.4), not yet measured.
- Revisit if the sized data or the transforms prove too heavy for TypeScript and MySQL.

## Relationship to other decisions

- **Consistent with** [ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md) (TypeScript), which was revised in place to drop its DuckDB assumption.
- **Depends on** [ADR-0008](ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md) (jobs inside the backend server) and [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) (MySQL).
- **Consistent with** [ADR-0010](ADR-0010-map-database-rows-to-code-by-hand-without-an-orm.md) and [ADR-0011](ADR-0011-apply-schema-changes-by-hand-with-no-migration-tool.md) (hand-written code and SQL, no added tooling).

Sources: [DuckDB Node.js client](https://duckdb.org/docs/current/clients/node_neo/overview.html), [DuckDB MySQL extension](https://duckdb.org/docs/current/core_extensions/mysql.html), [nodejs-polars](https://github.com/pola-rs/nodejs-polars), [chDB for Node.js](https://clickhouse.com/docs/chdb/install/nodejs), [Arquero](https://github.com/uwdata/arquero).
