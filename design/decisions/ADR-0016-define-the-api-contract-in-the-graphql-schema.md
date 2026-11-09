# ADR-0016: Define the API contract in the GraphQL schema

**Status:** Accepted
**Date:** 2026-11-08
**Revised:** 2026-11-09, in place, at the owner's direction (not finalized): the API style was decided as GraphQL ([ADR-0017](ADR-0017-use-graphql-for-the-backend-api.md)), so the contract moves from an OpenAPI document (first version of this ADR) to the GraphQL schema; later the same day, the code-first workflow and the trusted-documents hand-off were added.
**Deciders:** William Sanchez

## Context

The frontend and the backend live in separate repos ([ADR-0008](ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md)) and must agree on every request and response shape. The system design requires API contracts to be versioned so changes don't break running clients ([`design/system-design.md`](../system-design.md) §0, row 10). The API is GraphQL ([ADR-0017](ADR-0017-use-graphql-for-the-backend-api.md)). A GraphQL schema is typed and introspectable, and GraphQL Code Generator's client preset generates TypeScript types for each query the frontend writes ([GraphQL Code Generator](https://www.the-guild.dev/graphql/codegen/docs/guides/react)). Research: [`research/api-style-rest-trpc-graphql-research-2026-11-08.md`](../../research/api-style-rest-trpc-graphql-research-2026-11-08.md).

## Decision

**The GraphQL schema, committed in the backend repo as an SDL file, is the API's contract. The frontend generates its TypeScript types from it.**

1. The schema is written code-first with Pothos ([ADR-0017](ADR-0017-use-graphql-for-the-backend-api.md)); the build prints it to `schema.graphql` with `printSchema`, and the file is committed with the code change that produced it, so a change to the contract is visible in review ([graphql-js, type generation](https://www.graphql-js.org/docs/type-generation/); [WunderGraph, code-first workflow](https://hub-docs.wundergraph.com/schema-development/code-first)).
2. The frontend regenerates its types from the committed schema with GraphQL Code Generator's client preset whenever it changes ([Pothos, generating client types](https://pothos-graphql.dev/docs/guide/generating-client-types)).
3. **Trusted documents across the two repos:** the frontend's codegen run also writes the list of the web app's operations (persisted documents). That file is copied into the backend repo in the same change set as the frontend code that uses it, and the backend's persisted-operations store loads it (ADR-0017, item 9). An operation the frontend ships before the backend has its entry is rejected, so the backend is deployed first.
4. Row 10 is met by schema evolution rather than version numbers: changes are additive; a field is marked `@deprecated` before it is removed; CI fails on breaking changes ([graphql.org, Governance and versioning](https://www.graphql.org/learn/governance-versioning/); [GraphQL Inspector](https://the-guild.dev/graphql/inspector/docs/products/action)).

## Options Considered

### Option A — GraphQL schema as the contract (chosen)
| Dimension | Assessment |
|---|---|
| Works across two repos | Yes: one committed file; each side reads it |
| Language-neutral | Yes: any GraphQL client or tool can read SDL or introspect the server |
| Frontend types | Generated per query, no runtime cost |
| Versioning | Evolution with `@deprecated` plus a breaking-change check in CI |

### Option B — OpenAPI document (first version of this ADR; not chosen after ADR-0017)
Describes REST endpoints natively; would be a second schema beside GraphQL's own. If a REST surface is ever needed, it can be generated from the GraphQL schema ([GraphQL Yoga v3, Sofa](https://the-guild.dev/blog/graphql-yoga-v3)).

### Option C — Shared TypeScript types package (not chosen)
Hand-written types published for both repos; no language-neutral description.

### Option D — No formal contract (not chosen)
Mismatches show up only at runtime.

## Consequences

**Easier:** the contract is generated from the server, so it can't drift from the code; typed queries in the frontend; schema docs come from introspection.
**Harder / to revisit:**
- Breaking changes need a deprecation period even with one client, unless the frontend and backend deploy together.
- The breaking-change check must run in the backend repo's CI.
- The persisted-documents file has to be carried from the frontend repo to the backend repo on every change to a query.

## Relationship to other decisions

- **Depends on** [ADR-0008](ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md) (two repos) and [ADR-0017](ADR-0017-use-graphql-for-the-backend-api.md) (GraphQL).
- **Paired with** [ADR-0014](ADR-0014-call-the-express-api-directly-from-the-browser.md) and [ADR-0015](ADR-0015-authenticate-users-with-firebase-authentication.md).
- **Meets** row 10 of the multi-user guardrail ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)) by schema evolution; see ADR-0017.
- **Answers** part of open question 6 (how the API is described).
