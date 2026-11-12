# ADR-0008: Run the API and pipeline in a separate Node.js Express backend, as a layered modular monolith

**Status:** Accepted
**Date:** 2026-11-05
**Revised:** 2026-11-08, in place, at the owner's direction (not finalized): this ADR now carries the decision that replaced its first version. First version (2026-11-05): run scheduled pipeline jobs inside the always-on Next.js app server. Current (2026-11-06): a separate Express backend holds the API, the pipeline and its scheduled tasks. 2026-11-09: the controller and routing layers became GraphQL resolvers behind one endpoint (ADR-0017).
**Deciders:** William Sanchez

## Context

The web app is built with Next.js ([ADR-0002](ADR-0002-build-the-phase-1-web-app-with-nextjs.md)), which left open whether there is one full-stack app or a separate frontend and backend (open question 2). The pipeline is written in TypeScript on Node ([ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md)) and writes to MySQL ([ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md)).

The pipeline runs on a schedule. It can be triggered by an external service (GitHub Actions, Cloud Run jobs with Cloud Scheduler, an orchestrator such as Prefect) or by a scheduler module running inside an always-on server. An in-process scheduler fires only while its process runs, and heavy jobs inside a web process compete with requests for memory and CPU. The first version of this decision ran the jobs inside the Next.js server.

## Decision

**Use a separate backend: a Node.js Express server, built as a layered modular monolith, that holds the API, the ETL pipeline with its scheduled tasks, and the backfill script. The Next.js app is the frontend. MySQL is the database.**

1. **Layers:** model, service, controller, middleware and routing, organized as a modular monolith (modules inside one deployable server). Since ADR-0017, the controllers are GraphQL resolvers behind one endpoint.
2. **Scheduled tasks** are defined in the server's code and run inside the always-on Express process.
3. **The backfill script** lives in the server's codebase and runs as a one-off command, not on the scheduler ([ADR-0006](ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md)).
4. **Conditions:**
   - an always-on Node process, not serverless functions;
   - each job has its own entry point, which the scheduler only calls, so jobs can move to a separate worker later without code changes;
   - the run lock and ingest ledger from ADR-0006 prevent duplicate runs;
   - on a shutdown signal, the scheduler stops starting new runs, and an interrupted run is redone safely;
   - upgrade trigger: move jobs to a separate worker process when API response times rise noticeably while a job runs, or memory during a run nears the instance's limit.

## Options Considered

### Option A — Separate Express backend plus Next.js frontend (chosen)
| Dimension | Assessment |
|---|---|
| Code structure | Layered (model, service, controller, middleware, routing), one deployable; controllers are GraphQL resolvers since ADR-0017 |
| Where jobs run | Inside the Express process |
| Frontend hosting | Next.js doesn't host the pipeline |
| Deployables | Two: the backend and the frontend |

### Option B — One full-stack Next.js app with jobs inside it (the first version; not chosen)
One deployable. The API, pipeline and scheduler live in the Next.js server, with jobs started from its startup hook.

### Option C — An external scheduler (GitHub Actions, Cloud Run jobs, Prefect) (not chosen)
GitHub Actions scheduled runs can be delayed under load and queued jobs dropped; Cloud Run adds a cloud account and service; Prefect still needs compute from another option.

### Option D — A separate worker process from the start (not chosen)
Isolates jobs from the API, but usually costs a second always-on instance. Kept as the upgrade path.

## Consequences

**Easier:** the backend's structure is explicit and independent of the frontend framework; the frontend can be hosted without carrying the pipeline; no extra scheduling service.
**Harder / to revisit:**
- Two deployables, and the frontend calls the backend across a network boundary (origins, authentication between them).
- Jobs share the API's single Node process: large files must be parsed as streams and inserted in batches, so a job never blocks API requests or exhausts memory.
- A deploy can interrupt a run, which is then redone.
- The backend is in TypeScript, since it contains the TypeScript pipeline (ADR-0009).

## Relationship to other decisions

- **Answers** open question 2 (separate frontend and backend; layered modular monolith) and question 3 for the server (Node.js).
- **Narrows** [ADR-0002](ADR-0002-build-the-phase-1-web-app-with-nextjs.md): Next.js is the frontend; the always-on requirement belongs to the Express backend.
- **Depends on** [ADR-0006](ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md) (lock, ledger, backfill), [ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md) (TypeScript) and [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) (MySQL).
- **Changed by** [ADR-0017](ADR-0017-use-graphql-for-the-backend-api.md): controllers and routes became GraphQL resolvers behind one endpoint.
- **Meets** the multi-user guardrail of [ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md): jobs can move to their own process without rework.

Sources: [Heroku: Scheduled Jobs and Custom Clock Processes](https://devcenter.heroku.com/articles/scheduled-jobs-custom-clock-processes), [Heroku: Worker Dynos, Background Jobs and Queueing](https://devcenter.heroku.com/articles/background-jobs-queueing), [Twelve-Factor: Concurrency](https://12factor.net/concurrency), [GitHub Docs: Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).
