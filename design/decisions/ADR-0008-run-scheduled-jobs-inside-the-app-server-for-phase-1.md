# ADR-0008: Run scheduled pipeline jobs inside the always-on app server for Phase 1

| Field | Value |
|---|---|
| Status | Superseded by [ADR-0016](ADR-0016-run-the-api-and-pipeline-in-a-separate-express-backend.md) |
| Date | 2026-11-05 |
| Decision-makers | Project owner |
| Consulted | Claude (research and comparison) |
| Confidence | Medium: the right choice at Phase 1 load; designed to be replaced by a worker process when the upgrade trigger is met |
| Supersedes | None |
| Related | ADR-0001 (multi-user guardrail); ADR-0002 (Next.js); ADR-0006 (load strategy); `specs/ff-data-etl-storage-spec.md` §8 (run schedule) |

## Context and problem statement
The pipeline runs on a schedule (ETL spec §8: daily, plus after Thursday, Sunday and Monday games). It can be triggered by:
- an external service (GitHub Actions, Cloud Run jobs with Cloud Scheduler, an orchestrator such as Prefect);
- a scheduler module running inside the app server.

An in-process scheduler fires only while its process runs. Heavy jobs inside the web process compete with web requests for memory and CPU.

## Decision drivers
- No extra service at Phase 1.
- On-time runs.
- No rework to move jobs out later (ADR-0001).
- The website stays responsive.

## Considered options
### Option 1: Scheduler module inside the always-on app server
- Good: no extra service; one codebase; runs on time.
- Bad: shares memory and CPU with the website; a deploy can interrupt a run; needs an always-on host.

### Option 2: GitHub Actions
- Good: no new service.
- Bad: scheduled runs can be delayed under load, and queued jobs may be dropped.

### Option 3: Cloud Run jobs with Cloud Scheduler
- Good: reliable trigger; within free tiers.
- Bad: an additional cloud account and service.

### Option 4: Prefect Cloud Hobby
- Good: free run history, retries and alerts.
- Bad: still needs compute from another option.

### Option 5: A separate worker process now
- Good: isolates jobs from the website.
- Bad: usually costs a second always-on instance.

## Decision outcome
Chosen option: **Option 1**, with conditions, and a recorded upgrade path to a separate worker.

We will run scheduled jobs from a scheduler module inside the app server, under these conditions:
1. **Always-on Node server.** The app runs as an always-on Node server (`next start`), not on serverless functions, where an in-process scheduler can't fire.
2. **Backfill off the server.** The 10-season backfill runs as a one-off command, not on the web server's scheduler.
3. **Separate entry points.** Each job is its own module with its own entry point, and the scheduler only calls it. Moving jobs to a worker later means starting the same entry point in another process, with no code change.
4. **Lock and ledger.** The run lock and ingest ledger from ADR-0006 prevent duplicate runs (for example, two app copies during a deploy) and recover data from skipped runs.
5. **Shutdown handling.** On a shutdown signal, the scheduler stops starting new runs. An interrupted run is redone safely, because writes go to staging first.
6. **Upgrade trigger.** Move jobs to a separate worker process when page response times rise noticeably while a job runs, or when memory during a run nears the instance's limit. That move gets its own ADR, superseding this one.

## Consequences
- Good: no extra service or cost at Phase 1; one codebase; runs on time.
- Bad:
  - Rules out hosting the app on serverless functions.
  - Jobs share the web server's memory and CPU until the upgrade.
  - A deploy can interrupt a run, which is then redone.
- Neutral: the pipeline's language is still open. If it isn't Node, the scheduler launches it as a separate program, and that language's runtime must be installed in the app's container.

## Confirmation
- The scheduler module contains only schedules and calls to job entry points.
- Each job runs standalone from the command line.
- Response time and memory are monitored during runs, against the upgrade trigger.

## More information
- In-process scheduling: [node-schedule](https://npmjs.com/package/node-schedule)
- Singleton clock process and missed intervals after restarts: [Heroku: Scheduled Jobs and Custom Clock Processes](https://devcenter.heroku.com/articles/scheduled-jobs-custom-clock-processes)
- Keeping heavy work off the web process: [Heroku: Worker Dynos, Background Jobs and Queueing](https://devcenter.heroku.com/articles/background-jobs-queueing)
- Process types: [Twelve-Factor: Concurrency](https://12factor.net/concurrency)
- Deploy overlap and shutdown signals: [Render: Deploying on Render](https://render.com/docs/deploys)
- Serverless functions pause background work: [Vercel: Can I use SMTP with Vercel?](https://vercel.com/kb/guide/serverless-functions-and-smtp)
- Running Next.js as a Node server: [Next.js: Deploying](https://nextjs.org/docs/pages/building-your-application/deploying)
- Delayed and dropped scheduled runs: [GitHub Docs: Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
