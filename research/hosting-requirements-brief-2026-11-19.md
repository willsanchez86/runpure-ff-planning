# Hosting requirements brief — Fantasy Workbench (2026-11-19)

**Purpose:** a self-contained hand-off for evaluating hosting options from scratch. Deliberately names **no candidate providers**, so an independent search is unanchored. Authoritative source: the system design §6 (`design/system-design.md`); this copy restates it without repository-internal references.

## The application

A personal fantasy-football web app (one user at launch, designed multi-user-ready; no public launch, no revenue). Three deployable pieces:

1. **Frontend** — Next.js (App Router), fully client-dynamic behind sign-in; static-capable hosting with a Node build works.
2. **Backend** — a **single always-on Node 24 process**: Express 5 serving a GraphQL API, plus an in-process data pipeline and its cron scheduler. Docker-ready. Must not sleep or scale to zero.
3. **Database** — MySQL 8, ~410 MB today, growing modestly per season.

Sign-in is Firebase Authentication (external service; the backend verifies ID tokens with the Firebase Admin SDK).

## Hard requirements — any option must satisfy all of these

1. **Always-on backend compute.** An internal scheduler fires a daily 06:00 US-Eastern data ingest (multi-minute runs, streaming CSV downloads from GitHub releases). A later feature polls external APIs every ~60 seconds during NFL game windows. Platforms that sleep on idle, scale to zero, or cap execution to short-lived function invocations do not qualify.
2. **Real MySQL 8 semantics**, specifically: session-scoped `TEMPORARY` tables, foreign-key constraints, transactions. MySQL-compatible engines qualify only if these are individually confirmed.
3. **Public HTTPS to the backend** (the browser calls the API directly; CORS pinned to the frontend origin), and HTTPS on the frontend.
4. **Private or low-latency networking between backend and database** preferred; database reachable over TLS in production.
5. **Outbound internet from the backend** to GitHub (data downloads) and Google/Firebase (token verification).
6. **Server-side secret configuration** (database credentials, a Firebase service-account key) via environment variables or equivalent — never client-exposed.
7. **Database backups**, or at minimum durable storage: most tables are rebuildable from public data, but user-owned rows are not.

## Workload profile

- Storage: ~410 MB MySQL now; low single-digit GB over multiple seasons.
- Traffic: a handful of users at most; near-idle outside the daily ingest and Sunday game windows. No burst scaling needed.
- The ingest is the heaviest regular job: downloads ~100–250 MB, loads for a few minutes, daily.
- Region: US (data sources and the user are US-based).

## Selection constraints (the owner's)

- **Budget: ≤ $15/month all-in; free tiers strongly preferred** where their compromises are acceptable — but a backend that sleeps is not an acceptable compromise (see hard requirement 1).
- **One provider preferred** over best-per-component mixes.
- Low operational burden preferred: a managed database beats self-operating MySQL unless self-ops buys a decisive price difference.
- Timeline: deploy as soon as authentication work completes; nothing may be publicly reachable before then.

## What to produce

For each candidate: current pricing (verify on the provider's own pages — third-party summaries go stale), whether the always-on and MySQL requirements are met *specifically*, free-tier terms and their catches (sleep, quotas, reclaim policies, expiry), operational burden, and a realistic monthly estimate for this workload.
