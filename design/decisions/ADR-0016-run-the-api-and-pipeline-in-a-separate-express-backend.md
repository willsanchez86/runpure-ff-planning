# ADR-0016: Run the API and pipeline in a separate Node.js Express backend, as a layered modular monolith

**Status:** Accepted
**Date:** 2026-11-06
**Deciders:** William Sanchez

## Context

The web app is built with Next.js ([ADR-0002](ADR-0002-build-the-phase-1-web-app-with-nextjs.md)), which left open whether there is one full-stack app or a separate frontend and backend (open question 2). [ADR-0008](ADR-0008-run-scheduled-jobs-inside-the-app-server-for-phase-1.md) ran the scheduled pipeline jobs inside the always-on Next.js server. The pipeline is written in TypeScript on Node ([ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md)) and writes to MySQL ([ADR-0014](ADR-0014-store-all-pipeline-data-in-mysql-with-no-bucket.md)).

## Decision

**Use a separate backend: a Node.js Express server, built as a layered modular monolith, that holds the API, the ETL pipeline with its scheduled tasks, and the backfill script. The Next.js app is the frontend. MySQL is the database.**

1. **Layers:** model, service, controller, middleware and routing, organized as a modular monolith (modules inside one deployable server).
2. **Scheduled tasks** are defined in the server's code and run inside the always-on Express process.
3. **The backfill script** lives in the server's codebase and runs as a one-off command, not on the scheduler ([ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md)).
4. **ADR-0008's conditions carry over to the Express server:**
   - an always-on Node process, not serverless functions;
   - each job has its own entry point, which the scheduler only calls, so jobs can move to a separate worker later without code changes;
   - the run lock and ingest ledger from ADR-0006 prevent duplicate runs;
   - on a shutdown signal, the scheduler stops starting new runs, and an interrupted run is redone safely;
   - upgrade trigger: move jobs to a separate worker process when API response times rise noticeably while a job runs, or memory during a run nears the instance's limit.

## Options Considered

### Option A — Separate Express backend plus Next.js frontend (chosen)
| Dimension | Assessment |
|---|---|
| Code structure | Layered (model, service, controller, middleware, routing), one deployable |
| Where jobs run | Inside the Express process |
| Frontend hosting | Next.js no longer needs to host the pipeline |
| Deployables | Two: the backend and the frontend |

### Option B — One full-stack Next.js app with jobs inside it, as in ADR-0008 (not chosen)
One deployable. The API, pipeline and scheduler live in the Next.js server, with jobs started from its startup hook.

## Consequences

**Easier:** the backend's structure is explicit and independent of the frontend framework; the frontend can be hosted without carrying the pipeline.
**Harder / to revisit:**
- Two deployables, and the frontend calls the backend across a network boundary (origins, authentication between them).
- Jobs share the API's single Node process: large files must be parsed as streams and inserted in batches, so a job never blocks API requests or exhausts memory.
- The backend is in TypeScript, since it contains the TypeScript pipeline (ADR-0009).

## Relationship to other decisions

- **Supersedes** [ADR-0008](ADR-0008-run-scheduled-jobs-inside-the-app-server-for-phase-1.md): jobs run inside the Express server, not the Next.js server; its conditions are restated above.
- **Answers** open question 2 (separate frontend and backend; layered modular monolith) and question 3 for the server (Node.js).
- **Narrows** [ADR-0002](ADR-0002-build-the-phase-1-web-app-with-nextjs.md): Next.js is the frontend. ADR-0002's note that ADR-0008 requires Next.js to run as an always-on Node server no longer applies; the always-on requirement moves to the Express backend.
- **Depends on** [ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md) (lock, ledger, backfill), [ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md) (TypeScript) and [ADR-0014](ADR-0014-store-all-pipeline-data-in-mysql-with-no-bucket.md) (MySQL).
