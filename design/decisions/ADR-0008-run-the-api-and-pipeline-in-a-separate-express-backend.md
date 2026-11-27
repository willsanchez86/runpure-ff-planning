# ADR-0008: Run the API and pipeline in a separate Node.js Express backend, as a layered modular monolith

**Status:** Accepted
**Date:** 2026-11-05
**Revised:** 2026-11-08, in place, at the owner's direction (not finalized): this ADR now carries the decision that replaced its first version. First version (2026-11-05): run scheduled pipeline jobs inside the always-on Next.js app server. Current (2026-11-06): a separate Express backend holds the API, the pipeline and its scheduled tasks. 2026-11-09: the controller and routing layers became GraphQL resolvers behind one endpoint (ADR-0017). 2026-11-27, in place, at the owner's direction (one-time override of the rule that an implemented ADR is not edited): the run-lock condition replaced by the accepted overlapping-run risk; the scheduled jobs include the quarterly reconciliation (ADR-0028). The 2026-11-27 replacement ADR-0008 was folded back into this ADR and removed.
**Implementation started:** 2026-11-09 (added by the owner 2026-11-17, reconciling the gate: the Express backend's first code was committed to runpure-ff-backend on 2026-11-09)
**Deciders:** William Sanchez

## Context

The web app is built with Next.js ([ADR-0002](ADR-0002-build-the-phase-1-web-app-with-nextjs.md)). The data pipeline is written in TypeScript on Node ([ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md)) and writes to MySQL ([ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md)). The pipeline runs on a schedule: daily loads and a quarterly reconciliation ([ADR-0006](ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md), [ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md)).

A schedule can be driven by an external service (GitHub Actions, Cloud Run jobs with Cloud Scheduler, an orchestrator such as Prefect) or by a scheduler module inside an always-on server. An in-process scheduler fires only while its process runs, and heavy jobs inside a web process compete with requests for memory and CPU.


## Decision

**Use a separate backend: a Node.js Express server, built as a layered modular monolith, that holds the API, the data pipeline with its scheduled jobs, and the backfill command. The Next.js app is the frontend. MySQL is the database.**

1. **Layers:** model, service, resolver, middleware, organized as modules inside one deployable server. The API is one GraphQL endpoint ([ADR-0017](ADR-0017-use-graphql-for-the-backend-api.md)).
2. **Scheduled jobs** are defined in the server's code and run inside the always-on Express process: the daily load at 06:00 Eastern and the quarterly reconciliation.
3. **The backfill** lives in the server's codebase and runs as a one-off command, never on the scheduler.
4. **Conditions:**
   - an always-on Node process, not serverless functions;
   - each job has its own entry point, which the scheduler only calls, so jobs can move to a separate worker later without code changes;
   - runs are not coordinated: loads are idempotent, and overlapping runs are an accepted risk ([ADR-0006](ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md));
   - on a shutdown signal, the scheduler stops starting new runs, and an interrupted run is redone safely;
   - upgrade trigger: move jobs to a separate worker process when API response times rise noticeably while a job runs, or memory during a run nears the instance's limit.

## Options Considered

### Option A — Separate Express backend plus Next.js frontend (chosen)
| Dimension | Assessment |
|---|---|
| Code structure | Layered, one deployable; GraphQL resolvers behind one endpoint |
| Where jobs run | Inside the Express process |
| Frontend hosting | Next.js doesn't host the pipeline |
| Deployables | Two: the backend and the frontend |

### Option B — One full-stack Next.js app with jobs inside it
The first version of ADR-0008. Not chosen: the frontend would carry the pipeline and its scheduler.

### Option C — An external scheduler (GitHub Actions, Cloud Run jobs, Prefect)
Not chosen: GitHub Actions scheduled runs can be delayed under load and queued jobs dropped; Cloud Run adds a cloud account and service; Prefect still needs compute from another option.

### Option D — A separate worker process from the start
Not chosen: isolates jobs from the API, but usually costs a second always-on instance. Kept as the upgrade path.

### Option E — A run lock so that only one run happens at a time
The earlier condition of this ADR. Removed by the project owner on 2026-11-23.

## Consequences

**Easier:** the backend's structure is independent of the frontend framework; the frontend can be hosted without the pipeline; no extra scheduling service.
**Harder / to revisit:**
- Two deployables, with the frontend calling the backend across a network boundary.
- Jobs share the API's single Node process: large files are parsed as streams and inserted in batches, so a job never blocks API requests or exhausts memory.
- A deploy can interrupt a run, which is then redone.
- If the host runs more than one copy of the server, each runs its own schedule; overlapping runs are accepted, at the cost of duplicate work.

## Relationship to other decisions

- **Narrows** [ADR-0002](ADR-0002-build-the-phase-1-web-app-with-nextjs.md): Next.js is the frontend; the always-on requirement belongs to the Express backend.
- **Depends on** [ADR-0006](ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md), [ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md), [ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md) and [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md).
- **Consistent with** [ADR-0017](ADR-0017-use-graphql-for-the-backend-api.md) (one GraphQL endpoint) and the multi-user guardrail of [ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md): jobs can move to their own process without rework.

Sources: [Heroku: Scheduled Jobs and Custom Clock Processes](https://devcenter.heroku.com/articles/scheduled-jobs-custom-clock-processes), [Heroku: Worker Dynos, Background Jobs and Queueing](https://devcenter.heroku.com/articles/background-jobs-queueing), [Twelve-Factor: Concurrency](https://12factor.net/concurrency), [GitHub Docs: Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).
