# ADR-0009: Write the data pipeline in TypeScript

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-11-05 |
| Revised | 2026-11-08, in place, at the owner's direction (not finalized): DuckDB and Postgres removed. The first version assumed DuckDB would do the data-heavy work and write to Postgres; the pipeline now parses files in TypeScript and loads MySQL directly (ADR-0012, ADR-0005) |
| Decision-makers | Project owner |
| Consulted | Claude (research and comparison) |
| Confidence | High |
| Supersedes | None |
| Related | ADR-0002 (Next.js); ADR-0005 (storage); ADR-0006 (load strategy); ADR-0008 (backend with in-process scheduler); ADR-0012 (no transform library); open question 3 |

## Context and problem statement
The pipeline's language was left open by ADR-0002. ADR-0008 runs scheduled jobs inside the always-on Node.js Express backend; a pipeline in any other language must run as a separate program with its own runtime installed alongside. The pipeline downloads nflverse files over HTTPS, parses and maps them, and loads them into MySQL (ADR-0005), with no transform library (ADR-0012). It also covers the ingest ledger and run lock (ADR-0006), orchestration and tests, and later the Sleeper API.

## Decision drivers
- One runtime with the backend's in-process scheduler (ADR-0008).
- Table schemas shared between the pipeline and the app.
- Mature MySQL access and streamed CSV parsing.
- Fewest languages for one developer.

## Considered options
### Option 1: TypeScript (Node)
- Good: same language and runtime as the backend; runs inside its scheduler; shared types; established MySQL (`mysql2`) and streamed CSV (`csv-parse`) libraries.
- Bad: no nflverse loader library (reads the published files directly); weak modelling ecosystem.

### Option 2: Python
- Good: strongest data and modelling ecosystem; nflverse's Python loader (nflreadpy).
- Bad: separate program and runtime beside the Node server; schemas defined twice; nflreadpy is marked experimental.

### Option 3: Go or Rust
- Good: single compiled binary.
- Bad: no nflverse tooling; smaller data ecosystem; a second language.

## Decision outcome
Chosen option: **Option 1**, because it keeps one language and runtime and fits ADR-0008 without a second process.

We will write the data pipeline in TypeScript, running on Node inside the backend's in-process scheduler (ADR-0008).

## Consequences
- Good: one toolchain, one runtime, one container; pipeline and app share table types.
- Bad: nflverse data is read from its published files without a loader library; any helpers that library would provide are written by us.
- Neutral: future projection models (out of Phase 1) can be a separate component in another language without changing the pipeline.

## Confirmation
The pipeline's code lives in the TypeScript codebase and runs under Node; no second language runtime is installed in the backend's container.

## More information
- nflverse data access: [nflverse on GitHub](https://github.com/nflverse)
- Python loader status: [nflreadpy on PyPI](https://pypi.org/project/nflreadpy/)
