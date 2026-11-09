# ADR-0015: Authenticate users with Firebase Authentication

**Status:** Accepted
**Date:** 2026-11-08
**Revised:** 2026-11-09, in place, at the owner's direction (not finalized): cross-references to the renamed ADR-0016 and to ADR-0017 added.
**Deciders:** William Sanchez

## Context

The system design requires real user accounts and login from day one, even with one account, and every API request scoped to the signed-in user ([`design/system-design.md`](../system-design.md) §0, rows 2 and 3; [ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)). The browser calls the API directly ([ADR-0014](ADR-0014-call-the-express-api-directly-from-the-browser.md)), so the API needs a token it can check on every request.

Facts checked on 2026-11-08:
- When a Firebase client app talks to a custom backend, the client sends its ID token (a JSON Web Token), and the backend verifies it with the Firebase Admin SDK's `verifyIdToken()`, which needs a service account ([Firebase: Verify ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)).
- Firebase's no-cost Spark plan limits most sign-in providers to 3,000 daily active users once a project is upgraded to Firebase Authentication with Identity Platform; on the Blaze plan, 50,000 monthly active users are at no cost ([Firebase Authentication](https://firebase.google.com/docs/auth/)).

## Decision

**Use Firebase Authentication for sign-in, for now.**

1. The Next.js frontend signs users in with the Firebase client SDK.
2. The browser sends the Firebase ID token in the `Authorization` header of every API request ([ADR-0014](ADR-0014-call-the-express-api-directly-from-the-browser.md)).
3. An Express middleware verifies the token with the Firebase Admin SDK and attaches the user's Firebase `uid` to the request; a request without a valid token gets `401`.
4. The app's own `users` table in MySQL keys each account to its Firebase `uid`; account-owned rows carry the app's `user_id` ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)).
5. The service-account key is a backend secret, never in the repo or the browser.

## Options Considered

### Option A — Firebase Authentication (chosen)
| Dimension | Assessment |
|---|---|
| Cost at our scale | No cost within the limits above |
| Backend work | One middleware calling `verifyIdToken()` |
| Passwords stored by us | None |
| Fit with guardrail rows 2 and 3 | Real accounts and a per-request user from day one |

No other provider was compared before this decision.

## Consequences

**Easier:** no password storage or sign-in screens to build from scratch; the same token works for any later client.
**Harder / to revisit:**
- Accounts depend on Google's Firebase service and a Firebase project.
- The backend needs the service-account key as a secret in every environment, including local development.
- The owner chose it "for now": revisit if a later phase needs features or limits that change the cost (for example the Identity Platform upgrade).

## Relationship to other decisions

- **Meets** rows 2 and 3 of the multi-user guardrail ([ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md)).
- **Paired with** [ADR-0014](ADR-0014-call-the-express-api-directly-from-the-browser.md) (the browser sends the token) and [ADR-0016](ADR-0016-define-the-api-contract-in-the-graphql-schema.md) (the GraphQL schema is the contract) and [ADR-0017](ADR-0017-use-graphql-for-the-backend-api.md) (the GraphQL endpoint reads the verified uid from the request context).
- **Depends on** [ADR-0008](ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md) (the Express backend checks the token) and [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) (the `users` table lives in MySQL).
- **Adds** two interfaces to open question 5: the browser to Firebase Auth, and the API to Firebase for token checks.
