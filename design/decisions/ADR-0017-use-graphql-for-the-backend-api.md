# ADR-0017: Use GraphQL for the backend API

**Status:** Accepted
**Date:** 2026-11-09
**Revised:** 2026-11-09, in place, at the owner's direction (not finalized): server stack decided (Yoga, Pothos, trusted documents, polling); operator endpoints moved into GraphQL. 2026-11-09: **Rules out** line added for the doc check.
**Deciders:** William Sanchez
**Rules out:** OpenAPI; REST endpoint; tRPC

## Context

Open question 6 asked what style the backend API uses. The Express 5 backend is a layered TypeScript app (routes → controllers → services → models) with hand-written SQL ([ADR-0008](ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md), [ADR-0009](ADR-0009-write-the-data-pipeline-in-typescript.md), [ADR-0010](ADR-0010-map-database-rows-to-code-by-hand-without-an-orm.md)). The browser calls it directly with a Firebase ID token ([ADR-0014](ADR-0014-call-the-express-api-directly-from-the-browser.md), [ADR-0015](ADR-0015-authenticate-users-with-firebase-authentication.md)).

From the PRDs: Phase 1 needs about 10–13 REST endpoints; the full product about 45–55, or about 25–35 top-level GraphQL fields. The player list has about 1,250 fantasy-relevant rows and a column chooser over 150 stat columns. Later screens combine several leagues across three platforms in one view. The live board refreshes every 30–60 seconds.

Full research, with sources: [`research/api-style-rest-trpc-graphql-research-2026-11-08.md`](../../research/api-style-rest-trpc-graphql-research-2026-11-08.md).

## Decision

**The backend exposes one GraphQL endpoint for the web app.**

1. Resolvers take the place of controllers and call the existing services; services and models don't change. Authorization stays in the services ([graphql.org, Authorization](https://graphql.org/learn/authorization/)).
2. The Firebase middleware runs before the GraphQL endpoint and puts the verified `uid` into the request context.
3. Every lookup by foreign key goes through a per-request DataLoader, implemented as `IN (...)` queries in the model layer ([graphql-js, DataLoader](https://www.graphql-js.org/docs/n1-dataloader/)).
4. Queries are limited: pagination caps on lists, trusted documents (item 9) and rate limiting ([OWASP GraphQL Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)).
5. Logging records each request's operation name and its `errors` array, since failures can come back as HTTP 200.
6. The contract is the schema ([ADR-0016](ADR-0016-define-the-api-contract-in-the-graphql-schema.md)).

**Server stack (owner, 2026-11-09, accepting Claude's recommendations in the research doc, §7 and §8):**

7. **Server library: GraphQL Yoga v6**, mounted with `app.use(yoga.graphqlEndpoint, yoga)` ([Yoga, Express integration](https://the-guild.dev/graphql/yoga-server/docs/integrations/integration-with-express)). Yoga 6 needs Node 22 or later (we run 24) and caps request bodies at 25 MB by default ([plugin changelog](https://the-guild.dev/graphql/yoga-server/changelogs/plugins/csrf-prevention)). Yoga's docs don't name Express 5, so the first build step is a spike that proves Yoga runs on our Express 5 app; if it fails, fall back to Apollo Server 5 with `@as-integrations/express5` ([Apollo docs](https://www.apollographql.com/docs/apollo-server/api/express-middleware)) and revisit item 9.
8. **Schema style: code-first with Pothos** ([Pothos](https://pothos-graphql.dev/)). Types and resolvers are written in TypeScript; the build prints the schema to `schema.graphql` ([graphql-js, type generation](https://www.graphql-js.org/docs/type-generation/)), which is committed (ADR-0016).
9. **Query protection: trusted documents only.** Yoga's persisted-operations plugin rejects any operation that isn't in the store, with arbitrary operations turned off ([Yoga, persisted operations](https://the-guild.dev/graphql/yoga-server/docs/features/persisted-operations)). Pagination caps, the request-body cap and rate limiting stay on, as OWASP API4:2023 requires for any API ([OWASP API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)). If outside clients are ever allowed, add depth, alias and cost limits (GraphQL Armor).
10. **Live board: polling** the same query every 30–60 seconds at launch, as the system design states; Yoga's built-in server-sent-event subscriptions are the upgrade path.
11. **Operator endpoints move into GraphQL.** `GET /pipeline/runs` and `GET /pipeline/ledger` become the query fields `pipelineRuns` and `ingestLedger`, readable only by operator accounts (a Pothos auth scope). The `ingest`, `backfill` and `headers` commands stay command-line jobs.

## Options Considered

### Option A — GraphQL (chosen)
| Dimension | Assessment |
|---|---|
| Column chooser, varied screens | Client selects fields; no per-screen endpoint code |
| Cross-league views | One request; aggregation in resolvers |
| Things to build | ~25–35 fields over shared types |
| Extra work | DataLoader, query limits, error monitoring, schema-change checks |
| Caching | POST isn't HTTP-cached; GET with persisted documents or a service-layer cache for shared NFL data |
| Owner's goal | Builds GraphQL experience |

Server libraries compared (research §8): Apollo Server is two to three times more downloaded and documents Express 5 support; Yoga offers trusted documents as a free plugin on our own server, where Apollo's safelisting needs its separate GraphOS Router. No evidence that either is inherently more secure.

### Option B — REST (not chosen)
Simplest for Phase 1 and best for HTTP caching and tooling breadth. Fixed response shapes mean either over-fetching for the column chooser or hand-built field selection, and per-screen aggregate endpoints as screens grow.

### Option C — tRPC (not chosen)
Built for one TypeScript codebase sharing types, ideally one repo. The two-repo split removes its main benefit, and it handles field selection and aggregation no better than REST.

## Consequences

**Easier:** each screen asks for exactly what it shows; fewer top-level operations; a typed, introspectable contract; no URL versioning.
**Harder:**
- N+1 queries if a DataLoader is missed.
- Query limits that REST doesn't need.
- Monitoring has to read response bodies, not just status codes.
- Shared HTTP caching needs extra steps.
- For Phase 1 alone, REST would have been simpler.

**Guardrail row 10 ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)).** Row 10 says API responses are versioned. GraphQL doesn't use version numbers. This ADR meets the row's purpose (changes roll out without breaking running clients) by additive changes, `@deprecated` before removal, and a CI check that fails on breaking schema changes ([graphql.org, Governance and versioning](https://www.graphql.org/learn/governance-versioning/)). This is a change in how row 10 is met, not an exception to it: no rework is needed for more users.

## Relationship to other decisions

- **Changes** [ADR-0008](ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md): its controller and routing layers become resolvers behind one endpoint (item 1).
- **Depends on** [ADR-0008](ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md) and [ADR-0015](ADR-0015-authenticate-users-with-firebase-authentication.md).
- **Determines** [ADR-0016](ADR-0016-define-the-api-contract-in-the-graphql-schema.md) (the contract is the GraphQL schema).
- **Answers** open question 6.
