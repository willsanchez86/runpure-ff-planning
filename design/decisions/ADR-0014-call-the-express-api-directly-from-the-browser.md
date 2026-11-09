# ADR-0014: Call the Express API directly from the browser

**Status:** Accepted
**Date:** 2026-11-08
**Revised:** 2026-11-09, in place, at the owner's direction (not finalized): cross-references to the renamed ADR-0016 and to ADR-0017 added; token checking described for one GraphQL endpoint.
**Deciders:** William Sanchez

## Context

The Next.js frontend and the Express backend are separate apps ([ADR-0008](ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md)). The frontend can reach the API in two ways: its own server fetches from the API and renders the result, keeping the backend's address private; or the browser calls the API itself. The system design requires real user accounts and every request scoped to the signed-in user ([`design/system-design.md`](../system-design.md) §0, rows 2 and 3), so the API needs to know who is calling.

## Decision

**The browser calls the Express API directly, and every request carries the signed-in user's credentials.** Sign-in is decided in [ADR-0015](ADR-0015-authenticate-users-with-firebase-authentication.md).

1. The backend is reachable from the public internet over HTTPS.
2. The backend allows the frontend's origin through CORS, and only that origin.
3. Each request sends the user's ID token in the `Authorization` header; the API rejects a request without a valid token.

## Options Considered

### Option A — Browser calls the API directly (chosen)
| Dimension | Assessment |
|---|---|
| Hops per request | One: browser to API |
| Backend exposure | Public; protected by token checks and CORS |
| Cross-origin setup | Needed: the API allows the frontend's origin |
| Fit with interactive screens | Sorting, filtering and toggles fetch straight from the API |

### Option B — Next.js server calls the API (not chosen)
Pages fetch on the Next.js server, so the backend's address stays private and no cross-origin setup is needed. Not chosen by the project owner.

## Consequences

**Easier:** one hop per request; the frontend stays a thin client; any future client can use the same API.
**Harder / to revisit:**
- The backend is public, so every request must carry a valid token, checked by the middleware in front of the GraphQL endpoint (ADR-0015, ADR-0017), and CORS must name the frontend's origin exactly.
- The backend's host must offer a public HTTPS address (decision log, open question 4).
- Requests with an `Authorization` header trigger a browser preflight request before each new kind of call (*inference* from how CORS works).

## Relationship to other decisions

- **Depends on** [ADR-0008](ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md) (separate backend).
- **Paired with** [ADR-0015](ADR-0015-authenticate-users-with-firebase-authentication.md) (how the token is issued and checked) and [ADR-0016](ADR-0016-define-the-api-contract-in-the-graphql-schema.md) (the contract the browser calls) and [ADR-0017](ADR-0017-use-graphql-for-the-backend-api.md) (the GraphQL endpoint).
- **Meets** rows 2 and 3 of the multi-user guardrail ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)).
- **Answers** part of open question 5 (the frontend-to-API interface).
