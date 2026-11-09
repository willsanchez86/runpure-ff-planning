# ADR-0005: Store pipeline output in an object storage bucket plus Postgres

| Field | Value |
|---|---|
| Status | Superseded by ADR-0010 |
| Date | 2026-11-05 |
| Decision-makers | Project owner |
| Consulted | Claude (analysis) |
| Confidence | High |
| Supersedes | None |
| Related | ADR-0001 (multi-user guardrail); ADR-0004 (dated copies); ADR-0006 (load strategy); open question 4 (hosting) |

## Context and problem statement
The pipeline produces:
- raw downloads (10 seasons of nflverse data);
- daily dated copies of Sleeper's player list;
- app-ready tables that the Next.js app queries.

Each needs a home.

## Decision drivers
- Raw downloads and dated copies are kept, so the warehouse can be rebuilt and history is never lost.
- The app queries relational tables.
- The app database handles concurrent writers across processes and machines (ADR-0001).

## Considered options
### Option 1: Bucket plus Postgres
Raw downloads and dated copies as files in an object storage bucket; app-ready tables in Postgres.
- Good: cheap, durable file storage; the app queries a relational database.
- Bad: two services to run.

### Option 2: Postgres only
Everything, including dated copies, as Postgres tables.
- Good: one service.
- Bad: raw files and growing history inflate the database.

### Option 3: Files only
The pipeline writes files to a bucket, and the app reads the files directly.
- Good: no database.
- Bad: the app has no database for queries, users or ledgers.

## Decision outcome
Chosen option: **Option 1**.

We will store raw downloads and dated copies as files in an object storage bucket, and load app-ready tables into Postgres for the app to query.

## Consequences
- Good: the warehouse can be rebuilt from the bucket; the app queries Postgres.
- Bad: two services to provision and pay for.
- Neutral:
  - The bucket provider and the Postgres host are not chosen yet (open question 4, hosting).
  - Postgres also holds the ingest ledger and the run lock (ADR-0006).

## Confirmation
No raw downloads or dated copies are stored in Postgres, and the app never reads files from the bucket directly.

## More information
None.
