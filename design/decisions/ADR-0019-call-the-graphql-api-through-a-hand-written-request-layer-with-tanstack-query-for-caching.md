# ADR-0019: Call the GraphQL API through a hand-written request layer with TanStack Query for caching

**Status:** Accepted
**Date:** 2026-11-16
**Deciders:** William Sanchez
**Rules out:** Apollo Client; urql

## Context

The browser calls the Express GraphQL API directly with a Firebase ID token on every request ([ADR-0014](ADR-0014-call-the-express-api-directly-from-the-browser.md), [ADR-0015](ADR-0015-authenticate-users-with-firebase-authentication.md)), sending only pre-registered persisted operations ([ADR-0016](ADR-0016-define-the-api-contract-in-the-graphql-schema.md), [ADR-0017](ADR-0017-use-graphql-for-the-backend-api.md)). That client-side plumbing — request building, token attachment, persisted-hash lookup, error unwrapping, caching, dedupe, loading state — can come from a GraphQL client library or be written by hand. The owner's bar for the frontend: no dependency without significant benefit over building it ourselves.

Phase 1's caching needs are small: data refreshes once a day at 06:00 Eastern, screens are read-only, and staleness is reported by the API itself. Later phases add 15-minute league refresh and live polling. Verified 2026-11-16: TanStack Query is the dominant React server-state cache (~34.2M weekly npm downloads vs ~4.9M for SWR and ~1.4M for Apollo Client; [PkgPulse](https://www.pkgpulse.com/guides/tanstack-query-vs-swr-vs-apollo-2026)), is 13.0 kB min+gzip ([Bundlephobia](https://bundlephobia.com/package/@tanstack/react-query)), and is officially promise-agnostic for GraphQL with GraphQL Code Generator as its recommended typing path ([TanStack docs](https://tanstack.com/query/latest/docs/framework/react/graphql)), which ADR-0016 already mandates.

## Decision

**The GraphQL request layer is hand-written — fetch, Firebase token, persisted-operation hash, error unwrapping — and caching, deduplication, retries and garbage collection belong to TanStack Query. No GraphQL client library.**

Screens consume both through one owned hook (`useGql`), so the library stays swappable. The persisted-documents workflow and types come from GraphQL Code Generator per ADR-0016; this ADR decides only the runtime client.

## Options Considered

### Option A — Hand-written request layer + TanStack Query cache (chosen)
| Dimension | Assessment |
|---|---|
| Owned code | ~150 lines of request plumbing we control and test; caching edge cases (races, cancellation, GC) owned by the standard library |
| Dependency weight | One dependency, 13.0 kB min+gzip, tree-shakeable |
| Ecosystem standing | The de-facto React server-state cache (~34M weekly downloads) |
| Later phases | 15-minute refresh and live polling are configuration (`staleTime`, `refetchInterval`), not architecture |
| Fit with ADR-0016 | Persisted hashes and codegen types pass straight through our own `fetch` |

### Option B — Fully hand-written, including the cache
The owner's first choice (2026-11-16, morning), revised the same day before recording after a cited review of the ecosystem: the hand-written cache's ~60 lines were the first 10% of what TanStack Query provides, and later phases' revalidation needs would grow it toward a worse copy.

### Option C — urql
Claude's initial recommendation: a purpose-built GraphQL client (~15 kB) with persisted-documents support. Not chosen by the project owner.

### Option D — Apollo Client
The most documented GraphQL client; its normalized cache serves entity-heavy mutation apps, which these read-only screens are not. Not chosen by the project owner.

## Consequences

**Easier:** the request layer is small, fully understood and testable; caching behavior is the ecosystem standard with devtools; later-phase freshness needs are config changes.
**Harder / to revisit:** no normalized cache — fine while screens are read-only; revisit if later phases mutate entities that many screens display. The request layer's correctness (persisted-hash format, errors-inside-200) is ours to test. One more dependency to keep current.

## Relationship to other decisions

- **Depends on** [ADR-0014](ADR-0014-call-the-express-api-directly-from-the-browser.md), [ADR-0015](ADR-0015-authenticate-users-with-firebase-authentication.md), [ADR-0016](ADR-0016-define-the-api-contract-in-the-graphql-schema.md), [ADR-0017](ADR-0017-use-graphql-for-the-backend-api.md).
- **Consistent with** [ADR-0010](ADR-0010-map-database-rows-to-code-by-hand-without-an-orm.md) and [ADR-0012](ADR-0012-transform-pipeline-data-in-typescript-and-mysql-with-no-transform-library.md): hand-written where we'd otherwise own a framework's behavior, a library only where it clearly wins.

## Sources

- [TanStack Query — Overview](https://tanstack.com/query/latest/docs/framework/react/overview) (dedupe, caching, background updates, garbage collection)
- [TanStack Query — GraphQL](https://tanstack.com/query/latest/docs/framework/react/graphql) (promise-agnostic; GraphQL Code Generator pairing; no normalized caching)
- [Bundlephobia — @tanstack/react-query](https://bundlephobia.com/package/@tanstack/react-query) (13.0 kB min+gzip)
- [PkgPulse — TanStack Query vs SWR vs Apollo 2026](https://www.pkgpulse.com/guides/tanstack-query-vs-swr-vs-apollo-2026) (download comparison)
