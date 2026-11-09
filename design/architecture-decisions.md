# Architecture Decision Log — Runpure FF

**Owner / decider:** you · **Last updated:** 2026-11-09
Index of the project's architecture decisions. Each decided item is a full ADR in `design/decisions/`, written with the template in [`governance/templates.md`](../governance/templates.md). This log contains only what you have explicitly decided, plus the open decisions you listed. Claude does not add options, recommendations or outcomes here unless you decide them.

**Renumbered 2026-11-08:** superseded ADRs were updated in place with the decisions that replaced them, the replacing ADRs were deleted, and the rest were renumbered. Old → new: ADR-0010 and ADR-0014 → ADR-0005; ADR-0016 → ADR-0008; ADR-0011 → ADR-0010; ADR-0012 → ADR-0011; ADR-0013 → ADR-0012; ADR-0015 → ADR-0013.

---

## Decided

| ADR | Decision | Status | Date |
|---|---|---|---|
| [ADR-0001](decisions/ADR-0001-design-for-multiple-users-from-day-one.md) | Design for multiple users from day one | Accepted (revised in place 2026-11-09: wording) | 2026-11-05 |
| [ADR-0002](decisions/ADR-0002-build-the-phase-1-web-app-with-nextjs.md) | Build the Phase 1 web app with Next.js | Accepted (Next.js is the frontend, per ADR-0008; revised in place 2026-11-09) | 2026-11-05 |
| [ADR-0003](decisions/ADR-0003-use-independent-sources-with-sleeper-filling-specific-gaps.md) | Use independent sources as the base, with Sleeper filling specific gaps | Accepted (revised in place 2026-11-09; Sleeper set aside 2026-11-06, not in Phase 1) | 2026-11-05 |
| [ADR-0004](decisions/ADR-0004-keep-dated-copies-of-every-sleeper-player-list-pull.md) | Keep dated copies of every Sleeper player-list pull | Accepted (copies kept in MySQL, per ADR-0005; parked with Sleeper; revised in place 2026-11-09) | 2026-11-05 |
| [ADR-0005](decisions/ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) | Store all pipeline data in MySQL, with no object storage bucket | Accepted (revised in place 2026-11-08) | 2026-11-05 |
| [ADR-0006](decisions/ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md) | Backfill 2017–2026 once, then load only data that can still change | Accepted (revised in place 2026-11-08 and 2026-11-09; play-by-play and depth charts current season only, per ADR-0013) | 2026-11-05 |
| [ADR-0007](decisions/ADR-0007-calculate-fantasy-points-in-the-app-from-stored-stats.md) | Calculate fantasy points in the app from stored stats | Accepted | 2026-11-05 |
| [ADR-0008](decisions/ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md) | Run the API and pipeline in a separate Node.js Express backend, as a layered modular monolith | Accepted (revised in place 2026-11-08 and 2026-11-09) | 2026-11-05 |
| [ADR-0009](decisions/ADR-0009-write-the-data-pipeline-in-typescript.md) | Write the data pipeline in TypeScript | Accepted (revised in place 2026-11-08) | 2026-11-05 |
| [ADR-0010](decisions/ADR-0010-map-database-rows-to-code-by-hand-without-an-orm.md) | Map database rows to code by hand, without an ORM | Accepted (revised in place 2026-11-08) | 2026-11-05 |
| [ADR-0011](decisions/ADR-0011-apply-schema-changes-by-hand-with-no-migration-tool.md) | Apply schema changes by hand, with no migration tool | Accepted (revised in place 2026-11-08 and 2026-11-09) | 2026-11-05 |
| [ADR-0012](decisions/ADR-0012-transform-pipeline-data-in-typescript-and-mysql-with-no-transform-library.md) | Transform pipeline data in TypeScript and MySQL, with no transform library | Accepted (revised in place 2026-11-08 and 2026-11-09) | 2026-11-06 |
| [ADR-0013](decisions/ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md) | Keep play-by-play and depth charts for the current season only | Accepted (revised in place 2026-11-08 and 2026-11-09) | 2026-11-06 |
| [ADR-0014](decisions/ADR-0014-call-the-express-api-directly-from-the-browser.md) | Call the Express API directly from the browser | Accepted (revised in place 2026-11-09: cross-references) | 2026-11-08 |
| [ADR-0015](decisions/ADR-0015-authenticate-users-with-firebase-authentication.md) | Authenticate users with Firebase Authentication | Accepted (revised in place 2026-11-09: cross-references) | 2026-11-08 |
| [ADR-0016](decisions/ADR-0016-define-the-api-contract-in-the-graphql-schema.md) | Define the API contract in the GraphQL schema | Accepted (revised in place 2026-11-09) | 2026-11-08 |
| [ADR-0017](decisions/ADR-0017-use-graphql-for-the-backend-api.md) | Use GraphQL for the backend API | Accepted (revised in place 2026-11-09: server stack) | 2026-11-09 |

## Open

1. Where will we store the data? *(Decided in ADR-0005: MySQL only; provider still open.)*
2. Do we have a single frontend/backend application (e.g. Next.js with server-side API) or a dedicated frontend and backend? *(Decided in ADR-0008: Next.js frontend, separate Express backend as a layered modular monolith.)*
   - Should we implement it as a modular monolith using layered architecture (model, service, controller, middleware, routing)? *(Yes, ADR-0008; the controllers became GraphQL resolvers, ADR-0017.)*
   - Or do we favor serverless functions (e.g. Lambda) for each? Does the code architecture still apply, or what changes? *(No: always-on Express server, ADR-0008.)*
3. What language do we write the server-side functions in (Node.js, Rust, etc.)? *(Node.js, per ADR-0008; pipeline in TypeScript, per ADR-0009.)*
4. What hosting options should we choose, based on the answers above? Any that apply to all and meet our requirements on a free tier? *(Backend must run as an always-on Node server: ADR-0008, reachable over public HTTPS: ADR-0014. Deployment-phase decision; research kept in [`research/mysql-hosting-options-research-2026-11-08.md`](../research/mysql-hosting-options-research-2026-11-08.md).)*
5. What is every interface throughout the complete pipeline? *(Your confirmation, 2026-11-08: nflverse release files to the pipeline (HTTPS GET, CSV); pipeline to MySQL (mysql2, hand-written SQL); Express API to MySQL (mysql2); browser to the Express API (GraphQL over HTTPS, JSON; ADR-0014, ADR-0017); operator queries and commands (GraphQL fields `pipelineRuns` and `ingestLedger`, operator accounts only, per ADR-0017; command-line jobs ingest, backfill, headers). Added by ADR-0015: browser to Firebase Auth, and the API to Firebase for token checks.)*
6. What principles do we apply to our API (REST, other)? *(Decided 2026-11-09: GraphQL, ADR-0017; contract is the GraphQL schema, ADR-0016. Research: [`research/api-style-rest-trpc-graphql-research-2026-11-08.md`](../research/api-style-rest-trpc-graphql-research-2026-11-08.md). Server stack decided the same day (owner, accepting Claude's recommendations): GraphQL Yoga, code-first with Pothos, trusted documents, polling for the live board; operator endpoints move into GraphQL. All in ADR-0017.)*
7. Monitoring and alerting: out of scope for now; give it its own PRD in a later phase. *(Your direction, 2026-11-08, from ETL open decision D8.)*
