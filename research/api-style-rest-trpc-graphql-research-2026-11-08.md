# API style research: REST vs tRPC vs GraphQL, applied to Runpure FF

**Date:** 2026-11-08 · **Author:** Claude (research), for William Sanchez
**Status:** Final. Supports [ADR-0017](../design/decisions/ADR-0017-use-graphql-for-the-backend-api.md) (GraphQL chosen by the project owner) and the revised [ADR-0016](../design/decisions/ADR-0016-define-the-api-contract-in-the-graphql-schema.md).
**How to read it:** §1–§2 are general findings, each tied to a source. §3 lists the facts about our system that the findings are applied to. §4–§6 are inference: each row says which finding it rests on and what would change in our solution. Anything marked *Inference* is Claude's reasoning, not a sourced fact. Every source is linked in §9; all links were opened or returned by a search on 2026-11-08 or 2026-11-09.

---

## 1. What each style is, and its general strengths and costs

### 1.1 REST

REST is an architectural style defined by constraints (client-server, stateless, cacheable, uniform interface, layered system) in Fielding's dissertation, chapter 5 [S1]. Two of those constraints drive most of the trade-off with GraphQL:

- **Uniform interface.** Fielding states the trade-off himself: it simplifies the architecture and improves visibility, but "degrades efficiency, since information is transferred in a standardized form rather than one which is specific to an application's needs" [S1].
- **Cache.** Cache constraints improve "efficiency, scalability, and user-perceived performance" [S1]. HTTP caching is standardised in RFC 9111, which notes that many caches in common use only cache GET responses [S2].

| Strengths | Source |
|---|---|
| Uses HTTP as designed: methods, status codes, and caching by URL work with every proxy, CDN and browser | [S1], [S2] |
| Most widely used style: 93% of respondents in Postman's 2025 survey use REST; 33% use GraphQL | [S3] (Postman figures as reported by Nordic APIs and VoxBooster; Postman's own interactive report was not opened) |
| Language-neutral contract with mature tooling: OpenAPI is "a standard, programming language-agnostic interface description for HTTP APIs" | [S4] |

| Costs | Source |
|---|---|
| Fixed response shapes: a screen that needs part of a resource gets all of it (over-fetching), and a screen that needs several resources makes several calls (under-fetching). GitHub found responses "simultaneously sent too much data *and* didn't include data that consumers needed", and some views needed two or three calls | [S5] |
| Chatty object-graph retrieval is a common misuse in practice | [S6] (Thoughtworks Radar, Nov 2016) |
| Per-screen endpoints multiply as screens grow; the usual fix is a Backend-for-Frontend per experience | [S7] (Sam Newman), [S8] (Microsoft) |

### 1.2 tRPC

tRPC lets a TypeScript client call server procedures with types shared directly from the server code, with no schema or code generation step [S9]. Its own docs say who it is for: "tRPC is for full-stack TypeScript developers", for projects "built with full-stack TypeScript" [S9]. Its introduction assumes a way to share types between client and server and hopes "you're using a monorepo" [S10].

| Strengths | Source |
|---|---|
| End-to-end types with no contract file and no generator | [S9] |
| Least ceremony of the three for a TypeScript-only stack | [S9] |

| Costs | Source |
|---|---|
| TypeScript on both ends only; no language-neutral contract (an OpenAPI generator, `@trpc/openapi`, was in alpha as of March 2026) | [S9], [S11] |
| Works best when client and server share a repo | [S10] |
| No query language: each procedure returns a fixed shape, like a REST endpoint | [S9] |

### 1.3 GraphQL

GraphQL is a query language and runtime: one typed schema, one endpoint, and the client states exactly which fields it wants. The specification is maintained by the GraphQL Foundation; the current edition is September 2025, the first since October 2021 [S12].

| Strengths | Source |
|---|---|
| The client asks for exactly the fields and related objects a view needs, in one request; the response mirrors the query | [S5] (GitHub), [S13] (graphql.org) |
| Typed schema with introspection: docs and typed clients are generated from it | [S5], [S14] |
| Response structure is driven by the consumer, not the server; useful for server-side aggregation | [S6] (Thoughtworks, Nov 2019) |
| Evolves without versions: fields are added, and old ones marked `@deprecated` and removed once unused | [S15] (graphql.org) |
| Field-level usage is visible, because every query names its fields, which makes deprecation measurable | [S16] (Phil Sturgeon) |
| Tooling can detect breaking schema changes in CI | [S17] (GraphQL Inspector) |

| Costs | Source |
|---|---|
| **N+1 queries:** naive resolvers issue one database query per parent row; the standard fix is batching with DataLoader | [S18] (graphql-js), [S6] (Thoughtworks) |
| **Boilerplate** when adding new models, adding complexity | [S6] |
| **Denial-of-service surface:** clients can write deep or wide queries; OWASP recommends depth limits, amount limits, query cost analysis, pagination, timeouts and rate limiting. Depth limiting is not built in and needs a library or custom code | [S19] (OWASP) |
| **HTTP caching does not come free:** most requests are POST to one URL, and common caches only cache GET [S2]. graphql.org's mitigation is GET requests with hashed (persisted) documents | [S20], [S21] (graphql.org) |
| **Errors are in the body:** a request can return HTTP 200 with an `errors` array and partial data, so monitoring by status code misses failures | [S22] (Apollo client docs), [S21] |
| Authorization must not live in resolvers ad hoc; graphql.org says to delegate it to the business-logic layer | [S23], [S24] |
| Thoughtworks has kept GraphQL at **Assess** (not Trial or Adopt) and warned about misuse; it repeated caching, versioning and DoS concerns in Nov 2025 | [S6], [S25] |
| Not a fit for every product: InfoQ, reporting on GitHub's move, notes GraphQL may not shine for a simple website with few consumers | [S26] |

---

## 2. Where each style fits best (from the sources)

| Style | Best-fit cases | Source |
|---|---|---|
| REST | Public or partner APIs consumed by many unknown clients; resource-shaped data; responses that can be cached by URL in shared caches; teams that need the broadest tool and hiring pool | [S1], [S2], [S3], [S4] |
| tRPC | One TypeScript team owning client and server, ideally in one repo, with no outside consumers | [S9], [S10] |
| GraphQL | Clients whose screens need different subsets and combinations of a rich, connected data model; many screens over the same data; aggregation of several sources into one view; bandwidth-sensitive clients. An alternative to one Backend-for-Frontend per screen when payload flexibility is the goal | [S5], [S6], [S27] (arc42 quality model) |

---

## 3. Facts about our system the findings are applied to

| # | Fact | Where it comes from |
|---|---|---|
| F1 | Two repos: the Express backend and the Next.js frontend | ADR-0008 |
| F2 | Backend is TypeScript on Node 24, Express 5, layered (routes → controllers → services → models), hand-written SQL with mysql2 | ADR-0009, ADR-0010 |
| F3 | The browser calls the Express API directly over public HTTPS with a Firebase ID token on every request | ADR-0014, ADR-0015 |
| F4 | One first-party client now (the web app); no public API planned in the PRDs | PRDs |
| F5 | Player list: about 1,250 fantasy-relevant rows (QB 64, RB 112, WR 163, TE 99, K 33, DB 288, DL 225, LB 232, plus 32 team defenses), with a column chooser over a stat table that has 150 columns | Measured from 2025 nflverse files |
| F6 | Weekly player stats: 19,422 rows a season, 150 columns, 8.7 MB as CSV | Measured, 2025 |
| F7 | Size of the API: Phase 1 about 10–13 REST endpoints; full product about 45–55 REST endpoints, or about 25–35 top-level GraphQL fields | Q6 inventory from the PRDs (open-decisions doc) |
| F8 | Later screens combine several leagues across Sleeper, Yahoo and ESPN in one view (game-day problem list, cross-league exposure) | PRDs |
| F9 | Live board refreshes every 30–60 s during games | System design §4, Platform connections PRD |
| F10 | Most screens are per-user (leagues, rosters, settings); NFL player and stats data is shared by all users | ADR-0001 guardrail rows 3 and 9 |
| F11 | Guardrail row 10: API responses are versioned so changes roll out without breaking running clients | System design §0 |
| F12 | Solo developer; the owner wants demonstrated GraphQL experience | Owner's stated reason |

---

## 4. Applicability to Runpure FF, dimension by dimension

Each row: the finding, then what each style would do to our solution. *Inference* throughout, resting on the cited findings.

| Dimension | Finding it rests on | REST in our solution | tRPC in our solution | GraphQL in our solution |
|---|---|---|---|---|
| **Column chooser and varied screens** (F5, F7) | Fixed shapes over- or under-fetch [S5]; uniform interface trades efficiency for generality [S1] | Either every player-list call returns all 150 columns for ~1,250 rows, or we invent a `fields=` parameter (JSON:API-style sparse fieldsets [S28]) and maintain it by hand per endpoint | Same as REST: each procedure returns a fixed shape unless we add selection arguments | The chooser's selection becomes the query's field list. No extra endpoint code per column set; the server resolves only the requested fields |
| **Cross-league and multi-source views** (F8) | GitHub needed 2–3 calls per view under REST [S5]; GraphQL suits server-side aggregation [S6] | Either several calls per screen from the browser, or a purpose-built aggregate endpoint per screen (a BFF in all but name [S7]) | Same as REST | One query fetches leagues, rosters and players together; aggregation happens in resolvers that call existing services |
| **Number of things to build and document** (F7) | Endpoints multiply with screens [S7] | ~45–55 routes, each with its own parameters and response type | ~45–55 procedures | ~25–35 top-level fields over shared types; types are reused across screens |
| **Contract across two repos** (F1) | OpenAPI is language-neutral [S4]; tRPC wants shared types / a monorepo [S10]; GraphQL schema is introspectable and generates clients [S14] | OpenAPI document + openapi-typescript [S29] (previous ADR-0016) | Weakest fit: types live in server code in another repo, so the frontend needs a published types package or a monorepo; `@trpc/openapi` is alpha [S11] | The GraphQL schema (SDL file committed in the backend repo) is the contract; GraphQL Code Generator's client preset types every query in the frontend [S14] |
| **Layered architecture** (F2) | Authorization in the business-logic layer [S23], [S24] | Controllers call services | Procedures call services | Resolvers replace controllers and call the same services and models. Services and SQL are unchanged |
| **Database efficiency** (F2, F6) | N+1 without batching [S18]; boilerplate risk [S6] | Each endpoint's SQL is written for its screen; no N+1 by construction | Same as REST | Must add a DataLoader per request for each related lookup (player → team, roster → player). Hand-written SQL makes the batch queries explicit `WHERE id IN (...)` calls in the model layer. Missing one shows up as hundreds of small queries on a 1,250-row list |
| **Security** (F3, F4) | OWASP depth/amount/cost limits, rate limiting [S19]; persisted documents [S20] | Standard per-route checks and rate limits | Same as REST | Extra work: limit depth and list sizes, cap page sizes, time out long queries. Because we own the only client (F4), we can accept only pre-registered (trusted) operations, which removes arbitrary queries entirely |
| **HTTP caching** (F9, F10) | Common caches only cache GET [S2]; GET + hashed documents [S20] | Shared NFL data (player list, schedule) can be cached by URL at a CDN or browser | Supports GET for queries, similar to REST | POST requests aren't cached by HTTP caches. Per-user data (F10) gains little from shared caches under any style. For shared NFL data, either send queries as GET with persisted-document hashes, or cache in the service layer. *Inference:* small cost at our load, since the MySQL tables are already shaped for the screens |
| **Live board** (F9) | Yoga serves subscriptions over SSE [S30] | Polling a GET every 30–60 s | Polling, or tRPC subscriptions | Polling the same query every 30–60 s works unchanged; subscriptions over SSE are available later without a second protocol |
| **Errors and monitoring** | 200 with `errors` [S22], [S21] | Status codes tell monitoring what failed | Status codes per procedure | Monitoring and logging must read the `errors` array and per-operation names, not just status codes; partial data must be handled in the UI |
| **Versioning: guardrail row 10** (F11) | Evolution over versioning [S15]; field usage visible [S16]; breaking-change checks [S17] | `/v1/` paths or versioned media types, described in OpenAPI | No built-in versioning | No version numbers. Row 10's purpose (changes don't break running clients) is met by additive changes, `@deprecated` before removal, and a CI check that fails on breaking schema changes. This changes how row 10 is met, not whether: recorded in ADR-0017 |
| **Ecosystem and skills** (F12) | REST 93%, GraphQL 33% of Postman respondents [S3] | Largest pool of tools, examples and hiring | TypeScript-only niche | Large, mature ecosystem (Yoga, Apollo, Pothos, Codegen, Inspector), smaller than REST's. Builds the experience the owner wants |
| **Fit to Phase 1 size alone** (F4, F7) | GraphQL may not shine for a simple site with few consumers [S26]; Thoughtworks keeps it at Assess [S6] | Phase 1's ~10–13 endpoints are well within what REST handles simply | Simplest for Phase 1 if both apps were in one repo | Phase 1 alone doesn't need GraphQL. The case rests on the full product (F7, F8) and the column chooser (F5) |

---

## 5. What choosing GraphQL changes in our solution

These are the concrete consequences, in the order they'd be built. All are recorded in ADR-0017.

1. **Server:** one GraphQL endpoint mounted on the Express 5 app (GraphQL Yoga mounts as Express middleware [S31]; Apollo Server documents Express 5 middleware [S32]). The Firebase middleware runs before it and puts the verified `uid` into the GraphQL context [S33].
2. **Layers:** resolvers take the place of controllers; services and models are unchanged; authorization stays in services [S23].
3. **Batching:** a DataLoader per request for every lookup by foreign key, implemented as `IN (...)` queries in the model layer [S18].
4. **Contract:** the schema SDL is committed in the backend repo; the frontend generates types with GraphQL Code Generator [S14] (revised ADR-0016).
5. **Protection:** trusted documents (the web app's operations registered at build time), plus pagination caps and rate limiting [S19], [S20], [S44]; depth, amount and cost limits only if outside clients are ever allowed (§7).
6. **Change control:** additive changes, `@deprecated` before removal, GraphQL Inspector in CI to fail on breaking changes [S15], [S17].
7. **Monitoring:** log the operation name and the `errors` array for every request [S22].
8. **Escape hatch:** if a REST surface is ever needed (a public API, webhooks), Yoga's Sofa plugin can generate REST endpoints and an OpenAPI document from the same schema [S34].

---

## 6. Why GraphQL, stated plainly

**For:** the full product has many screens over one connected data model (players, stats, teams, leagues, rosters across three platforms), a column chooser over 150 stat columns, and cross-league views. Those are the cases where sources say GraphQL fits best [S5], [S6], [S27]. It lowers the number of things to build (~25–35 fields vs ~45–55 endpoints) and gives a typed, introspectable contract across our two repos [S14]. It meets the owner's goal of gaining GraphQL experience.

**Against, and accepted:** for Phase 1 alone, REST would be simpler [S26]. GraphQL adds work REST doesn't need: batching, query limits, error monitoring and a different answer to versioning [S18], [S19], [S22], [S15]. Shared HTTP caching needs GET with persisted documents or a service-layer cache [S20]. The ecosystem and hiring pool are smaller than REST's [S3]. Thoughtworks still rates it Assess [S6].

**Why not tRPC:** it is built for one TypeScript codebase sharing types, ideally a monorepo [S9], [S10]. Our two-repo split (ADR-0008) removes its main advantage, and it doesn't solve the column-chooser or aggregation cases any better than REST.

---

## 7. Server-stack choices (decided 2026-11-09)

The owner accepted the recommendations below after the follow-up research in §8; recorded in ADR-0017, items 7–11. Operator endpoints also move into GraphQL (ADR-0017, item 11).

| Choice | Options | Decided (Claude's recommendation, accepted by the owner) |
|---|---|---|
| Server library | GraphQL Yoga [S31] · Apollo Server [S32] | Yoga: Express middleware, SSE subscriptions and Sofa in one package. Yoga on Express 5 specifically isn't stated in its docs; verify with a spike before committing |
| Schema style | Code-first with Pothos [S35] · schema-first SDL with codegen resolver types | Pothos: types inferred from TypeScript, plugin for scope-based auth; avoids keeping SDL and resolver types in step by hand |
| Query protection | Trusted documents only [S20] · depth/amount/cost limits [S19] · both | Trusted documents, since the web app is the only client; add limits if outside clients are ever allowed |
| Live board | Polling [S21] · subscriptions over SSE [S30] | Polling at launch, as the system design already states |

---

## 8. Follow-up questions (2026-11-09)

### 8.1 Apollo Server vs GraphQL Yoga

| Criterion | Apollo Server | GraphQL Yoga | Source |
|---|---|---|---|
| Popularity | ~1.3M–2M weekly npm downloads | ~0.6M–0.7M weekly npm downloads | [S36], [S37] (snapshots differ by date) |
| Support | v5 current, no planned end-of-life; v4 end-of-life since 2026-01-26 | v6 current; needs Node 22+; 25 MB request-body cap by default | [S38], [S41] |
| Express 5 | Official package `@as-integrations/express5`; body parsing and CORS set up by you | Express page names no Express version | [S32], [S31] |
| Known advisories (2026) | CSRF-prevention bypass through a browser bug, fixed in 5.5.0; DoS in `startStandaloneServer` (not used by us) | None direct for the 5.x versions checked by Snyk | [S39], [S40], [S42] |
| Trusted documents | Apollo Server alone has only automatic persisted queries, which Apollo says don't support safelisting; safelisting needs GraphOS Router (plan requirements stated differently on two doc pages) | Free persisted-operations plugin on our own server; rejects operations not in the store | [S43], [S44] |
| Depth and cost limits | Not built in; GraphQL Armor supports Apollo | Not built in; GraphQL Armor plugins in Yoga's production guide | [S45], [S46] |
| Live updates | No built-in subscriptions for non-federated graphs; add graphql-ws over WebSockets | Server-sent events built in | [S47], [S30] |

*Inference:* no evidence that either is inherently more secure; fewer advisories can also mean fewer users looking. CSRF matters little for us, because the token travels in the `Authorization` header (ADR-0014), not a cookie. The deciding difference is free, self-hosted trusted documents in Yoga.

### 8.2 Schema-writing workflow

Both styles are standard; graphql-js documents both without preferring one, and no survey of which is more common was found [S48].
- **Code-first:** write types and resolvers in TypeScript, print the schema to SDL with `printSchema`, commit the code and the generated file together, then generate client types from the file [S48], [S49], [S50]. Code-first projects need this printing step so changes stay visible in review [S51].
- **Schema-first:** write `.graphql` files as the source of truth, generate resolver types from them, then write resolvers that match [S48].
- **Counterpoints:** schema-first gives a contract to discuss before code exists; one team moved from Pothos to schema-first for that reason [S52]. Apollo argues schema-first can also generate typed resolver code [S53].

### 8.3 Is expensive-query protection GraphQL-specific?

No. OWASP API4:2023 (Unrestricted Resource Consumption) applies to every API: limits on memory and CPU, input sizes, request rate, and server-side checks on how many records a request may return [S54]. What differs is who decides a request's cost: in REST the server fixes each endpoint's query, so request-rate and page-size limits bound it; in GraphQL the client writes the query, so one request can carry many operations. OWASP's example is a single request with a large array of upload mutations that a per-request rate limit counts as one [S54]. *Inference:* trusted documents bring us close to REST's position, because only queries the web app shipped can run.

---

## 9. Sources

| # | Source | Link |
|---|---|---|
| S1 | Roy Fielding, *Architectural Styles and the Design of Network-based Software Architectures*, ch. 5 "Representational State Transfer" (2000) | https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style |
| S2 | IETF RFC 9111, *HTTP Caching* (2022) | https://rfc-editor.org/rfc/rfc9111 |
| S3 | Postman 2025 State of the API figures, as reported by Nordic APIs and VoxBooster | https://nordicapis.com/?p=22783 · https://voxbooster.com/blog/api-economy-statistics-2026 · https://digitalcxo.com/?p=23397 |
| S4 | OpenAPI Initiative, *OpenAPI Specification* | https://www.openapis.org/get-involved · https://spec.openapis.org/oas/v3.1.1 |
| S5 | GitHub Engineering, "The GitHub GraphQL API" (2016, updated 2021) | https://github.blog/news-insights/the-library/the-github-graphql-api/ |
| S6 | Thoughtworks Technology Radar, GraphQL (Assess; Apr 2016, Nov 2016, Nov 2019) | https://www.thoughtworks.com/radar/languages-and-frameworks/graphql |
| S7 | Sam Newman, "Pattern: Backends For Frontends" | https://samnewman.io/patterns/architectural/bff/ |
| S8 | Microsoft Azure Architecture Center, "Backends for Frontends pattern" | https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends |
| S9 | tRPC documentation | https://trpc.io/docs |
| S10 | tRPC, "Introducing tRPC" | https://trpc.io/blog/introducing-trpc |
| S11 | tRPC release notes (`@trpc/openapi` alpha, March 2026) | https://releasebot.io/updates/trpc |
| S12 | GraphQL Foundation, "Announcing the September 2025 Edition of the GraphQL Specification" | https://graphql.org/blog/2025-09-08-september-edition/ |
| S13 | graphql.org, "Thinking in Graphs" | https://graphql.org/learn/thinking-in-graphs/ |
| S14 | The Guild, GraphQL Code Generator: React / client preset guide | https://www.the-guild.dev/graphql/codegen/docs/guides/react |
| S15 | graphql.org, "Governance and versioning" | https://www.graphql.org/learn/governance-versioning/ |
| S16 | Phil Sturgeon, "GraphQL vs REST: Overview" | https://philsturgeon.com/graphql-vs-rest-overview/ |
| S17 | The Guild, GraphQL Inspector (GitHub Action) | https://the-guild.dev/graphql/inspector/docs/products/action |
| S18 | graphql-js docs, "Solving the N+1 Problem with DataLoader" | https://www.graphql-js.org/docs/n1-dataloader/ |
| S19 | OWASP Cheat Sheet Series, "GraphQL Cheat Sheet" | https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html |
| S20 | graphql.org, "Performance" | https://graphql.org/learn/performance |
| S21 | graphql.org, "Serving over HTTP" | https://graphql.org/learn/serving-over-http |
| S22 | Apollo Client docs, "Handling operation errors" | https://apollographql.com/docs/react/data/error-handling |
| S23 | graphql.org, "Authorization" | https://graphql.org/learn/authorization/ |
| S24 | graphql-js docs, "Authorization strategies" | https://www.graphql-js.org/docs/authorization-strategies/ |
| S25 | Thoughtworks Technology Radar, "GraphQL as data access pattern for LLMs" (Nov 2025) | https://www.thoughtworks.com/radar/techniques/graphql-as-data-access-pattern-for-llms |
| S26 | InfoQ, "GitHub Moves to GraphQL" (2016) | https://www.infoq.com/news/2016/10/graphQL-GitHub |
| S27 | arc42 Quality Model, "Backends for Frontends" | https://quality.arc42.org/approaches/backends-for-frontends |
| S28 | Spryker docs, "Sparse fieldsets" (JSON:API-style field selection in REST) | https://docs.spryker.com/docs/dg/dev/architecture/api-platform/sparse-fieldsets |
| S29 | openapi-typescript, Introduction | https://openapi-ts.dev/introduction |
| S30 | The Guild, GraphQL Yoga subscriptions example | https://www.the-guild.dev/graphql/yoga-server/examples/graphql-ws |
| S31 | The Guild, GraphQL Yoga "Integration with Express" | https://the-guild.dev/graphql/yoga-server/docs/integrations/integration-with-express |
| S32 | Apollo Server docs, `expressMiddleware` | https://www.apollographql.com/docs/apollo-server/api/express-middleware |
| S33 | Firebase docs, "Verify ID Tokens" | https://firebase.google.com/docs/auth/admin/verify-id-tokens |
| S34 | The Guild, "GraphQL Yoga v3" (Sofa plugin: REST and OpenAPI from a GraphQL schema) | https://the-guild.dev/blog/graphql-yoga-v3 |
| S35 | Pothos GraphQL | https://pothos-graphql.dev/ |
| S36 | npm-compare, @apollo/server vs graphql-yoga | https://npm-compare.com/@apollo/server,@nestjs/graphql,express-graphql,graphql-yoga |
| S37 | PkgPulse, graphql-yoga vs apollo-server vs mercurius (2026) | https://www.pkgpulse.com/guides/graphql-yoga-vs-apollo-server-vs-mercurius-graphql-2026 |
| S38 | Apollo Server docs, previous versions | https://www.apollographql.com/docs/apollo-server/previous-versions |
| S39 | GitLab Advisory Database, GHSA-9q82-xgwf-vj6h | https://advisories.gitlab.com/npm/apollo-server-core/GHSA-9q82-xgwf-vj6h/ |
| S40 | Apollo CVE list | https://cve.imfht.com/vendor/apollographql?lang=en |
| S41 | The Guild, Yoga CSRF-prevention plugin changelog (Yoga 6 notes) | https://the-guild.dev/graphql/yoga-server/changelogs/plugins/csrf-prevention |
| S42 | Snyk, graphql-yoga | https://security.snyk.io/package/npm/graphql-yoga/5.15.1-alpha-20250711191504-e1433b0f4f09644e234e02698853210226d481b8 |
| S43 | Apollo Router docs, safelisting with persisted queries | https://apollographql.com/docs/router/configuration/persisted-queries |
| S44 | The Guild, Yoga persisted operations | https://the-guild.dev/graphql/yoga-server/docs/features/persisted-operations |
| S45 | GraphQL Armor (Socket) | https://socket.dev/npm/package/@escape.tech/graphql-armor/overview/1.0.1 |
| S46 | The Guild, Yoga "Prepare for production" | https://the-guild.dev/graphql/yoga-server/docs/prepare-for-production |
| S47 | Apollo Server docs, subscriptions | https://www.apollographql.com/docs/graphql-subscriptions/ |
| S48 | graphql-js docs, type generation | https://www.graphql-js.org/docs/type-generation/ |
| S49 | Pothos, generating client types | https://pothos-graphql.dev/docs/guide/generating-client-types |
| S50 | WunderGraph Hub, code-first workflow | https://hub-docs.wundergraph.com/schema-development/code-first |
| S51 | Marc-André Giroux, "SDL or Code-first GraphQL Schemas?" | https://xuorig.medium.com/sdl-or-code-first-graphql-schemas-16e7dbdab2f5 |
| S52 | CHILLNN, schema-first vs code-first (Japanese) | https://zenn.dev/chillnn_tech/articles/15462cffcdecd3 |
| S53 | Apollo blog, "Schema-First vs Code-Only GraphQL" | https://www.apollographql.com/blog/schema-first-vs-code-only-graphql |
| S54 | OWASP API Security Top 10, API4:2023 Unrestricted Resource Consumption | https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/ |

**Not verified:** Postman's own 2025 report page (the 93% / 33% figures come from secondary reports, S3). Whether GraphQL Yoga officially supports Express 5 (S31 shows Express integration without naming a version); ADR-0017 makes a spike the first build step. The English OWASP API4 page (S54) was linked from the French edition, which was the one read.
