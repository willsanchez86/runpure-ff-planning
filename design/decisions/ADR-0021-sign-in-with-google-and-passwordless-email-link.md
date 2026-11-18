# ADR-0021: Sign in with Google and passwordless email link

**Status:** Accepted
**Date:** 2026-11-17
**Deciders:** William Sanchez

## Context

[ADR-0015](ADR-0015-authenticate-users-with-firebase-authentication.md) chose Firebase Authentication but did not fix the set of sign-in providers; the frontend's Phase 1 build so far carries a Google sign-in stub. The Firebase project is about to be configured for the auth milestone (the next `[CRITICAL]` item after the three screens), which forces the provider choice.

In Firebase, both Google sign-in and email-link ("passwordless") sign-in are providers toggled in the console; with Firebase's default *one account per email address* setting, the same email arriving by either route resolves to the same `uid`, so the choice has no schema impact — the app's `users` table keys accounts to the `uid` either way (ADR-0015, [`sql/0002_users.sql`](https://github.com/wlsanchez/runpure-ff-backend)).

## Decision

**Enable two sign-in methods for now: Google sign-in and passwordless email link.** Both through Firebase Authentication (ADR-0015), with Firebase's default one-account-per-email linking so either route lands in the same account. MySQL stores no credentials and no provider data — only the `users` row keyed to the Firebase `uid`.

Scoped to "for now" like ADR-0015 itself: the provider set may grow when real users beyond the owner arrive.

## Options Considered

### Option A — Google + passwordless email link (chosen)
| Dimension | Assessment |
|---|---|
| Build cost | Both are console toggles + one client call each; no backend change |
| Password handling | None — no passwords exist in either flow |
| Coverage | A Google account or any email address suffices to sign in |
| Schema impact | None; same `uid` keying as ADR-0015 |

### Option B — Google only
Covers the owner today but gives invitees without a Google account no way in. Not chosen by the project owner.

### Option C — Email + password
Rejected implicitly by the passwordless choice: it adds password reset flows and weakest-link credentials for no benefit over the email link. Not chosen by the project owner.

## Consequences

**Easier:** no password storage, reset flows or complexity rules — ever; invitees need only an inbox; both flows share the ID-token verification path already built (ADR-0015).
**Harder / to revisit:**
- Email-link sign-in depends on deliverability: Firebase's sign-in emails must not land in spam; the action-URL domain has to be on the Firebase authorized-domains list in every environment.
- A user who signs in by link on a different device than the one that requested it hits Firebase's same-device friction (the email prompt for re-entry).
- Account creation remains manual (owner inserts the `users` row); the per-user account decisions deferred below may change the provider set.

## Relationship to other decisions

- **Narrows** [ADR-0015](ADR-0015-authenticate-users-with-firebase-authentication.md) (implementation started; this ADR fixes the provider set ADR-0015 left open — ADR-0015 is unchanged).
- **Consistent with** [ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md): more users means toggling nothing in the data model.
- **Defers** (owner, 2026-11-17) the user-account decisions to the real-league-integration phase, tracked as decision-log open question 10: how accounts are created beyond manual insert, what per-user data the app stores beyond settings (platform connections, leagues followed, preferences), and which user actions are recorded in the database (sign-in audit, change log).

## Sources

- [Firebase: Authenticate with Google](https://firebase.google.com/docs/auth/web/google-signin) and [Firebase: Authenticate with email link](https://firebase.google.com/docs/auth/web/email-link-auth) — provider setup and the one-account-per-email linking behaviour (verified 2026-11-17).
