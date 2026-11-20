# Phase 1 — Remaining Work Tracker

**A dated working record of everything left to finish Phase 1 (three screens on real nflverse data, signed in, deployed). Working status only — decisions stay in ADRs, scope stays in the PRDs/specs.**

**Created:** 2026-11-17 · **Owner:** William Sanchez · **Historical record as of 2026-11-19** (owner): actionable work tracking moved to GitHub Issues in this repository per [`governance/work-tracking-and-completion.md`](../../governance/work-tracking-and-completion.md); this file is no longer updated.
**Last updated:** 2026-11-19 (retired as historical: open items migrated to GitHub Issues). Earlier 2026-11-18 (owner: deployment deferred until real league integration works — the Pre-deploy section waits; next up: Firebase auth milestone, then the Viewing phase)

**Priority:** `[CRITICAL]` — Phase 1 cannot ship without it · `[IMPORTANT]` — protects quality/process; shippable without it, at known risk · `[OPTIONAL]` — hygiene; do when convenient
**Sources:** [`specs/ff-frontend-foundation-spec.md`](../../specs/ff-frontend-foundation-spec.md) §13 (sequencing), [`design/architecture-decisions.md`](../architecture-decisions.md) (open items), the three frontend specs, [`design/system-design.md`](../system-design.md) §8.

## Done

- [x] Frontend repo init + CI (`verify`, `security-baseline`, `planning-refs`) — merged
- [x] App shell, Google sign-in (sample-mode stub), auth states — merged
- [x] Data layer (ADR-0016 codegen loop, ADR-0019 gql + TanStack Query), sample source — merged
- [x] Scoring engine (ADR-0007) with golden tests — merged
- [x] Player explorer complete: table (ADR-0020), card, compare, columns modal, season switch (PE1–PE4) — merged
- [x] Code-style policy (AGENTS rules 5–7) applied across frontend and backend
- [x] ADR Implementation-started lines: 0002, 0007, 0008, 0010, 0014, 0015, 0016, 0017, 0018, 0019, 0020 (standing authorization in templates.md)
- [x] Contract cut-over merged and integration-tested on real nflverse data (2026-11-17)
- [x] Post-test fixes merged: IDP removed end to end (PE5), player population tightened (11,608 → 6,881), O(n²) target-share scan precomputed, Sleeper-style list/game-log polish (# ranks, centred values, group gaps, coloured position subline)
- [x] ETL spec v2.18: `play` yardage columns widened to SMALLINT after a live overflow; full ingest green (pbp 26,246 rows)

## Immediate — no blockers

- [x] `[CRITICAL]` **NFL screen** (foundation §13 step 6; [`specs/ff-nfl-scores-and-schedule-spec.md`](../../specs/ff-nfl-scores-and-schedule-spec.md)) — built 2026-11-17 directly on the live contract (the cut-over had already landed, so the sample-first step was unnecessary)
- [x] `[OPTIONAL]` Backend code-style commit on `feat/player-read-api-contract` (if not yet committed)
- [ ] `[IMPORTANT]` Frontend ruleset: make `verify` + `security-baseline` required checks
- [ ] `[OPTIONAL]` Planning repo ruleset (optional): PR-only `main`

## Intermediate — contract cut-over (foundation §13 step 7)

- [x] `[CRITICAL]` **Backend fields** (player spec §9, NFL spec §6, foundation §7): `players`, `teams`, `statLines` (per-position interface, 5,000-row page cap), `teamWeekStats`, `games`, `dataFreshness`, `mySettings`/`saveSettings` + `user_settings` table in `sql/` — in progress on `feat/player-read-api-contract`
- [x] `[CRITICAL]` Backend persisted-store: strip the manifest's `sha256:` prefix when loading `frontend.json`
- [x] `[CRITICAL]` Real data locally: run the 2022–2026 backfill + daily ingest into MySQL
- [x] `[CRITICAL]` Frontend cut-over: real `.graphql` operations → `schema:pull` → codegen → `persisted:copy`; implement `apiSource`; settings server sync; `NEXT_PUBLIC_DATA_SOURCE=api`
- [x] `[IMPORTANT]` **Measure the full-season stat-line payload** — measured 2026-11-17: ~5.6 MB for 2026 (acceptable; shrinks further with IDP removed per spec PE5)
- [ ] `[CRITICAL]` Firebase project: enable Google sign-in; frontend public config in `.env.local`; backend admin credentials; insert the owner's `users` row (account creation remains manual — open decision)

## Pre-deploy (foundation §13 step 8) — deferred: deploy waits until real league integration works (owner, 2026-11-18)

- [ ] `[CRITICAL]` Hosting decision → ADR(s): always-on Node host (backend), MySQL host, frontend host (decision log open item 4)
- [ ] `[CRITICAL]` MTDP written ([`governance/templates.md`](../../governance/templates.md) §4) — required before the first hosted deploy
- [ ] `[IMPORTANT]` Playwright smoke of the three screens against the real API
- [ ] `[CRITICAL]` Production hardening (system design §8): `FRONTEND_ORIGIN`, `TRUST_PROXY`, HSTS, `Cache-Control: no-store` on account data, MySQL over TLS, shared rate-limit store
- [ ] `[CRITICAL]` Deploy in ADR-0016 order: schema SQL → backend → frontend → production backfill → smoke check
- [x] `[IMPORTANT]` ADR-0014 / ADR-0017 Implementation-started lines when the browser first calls the live API

**Integration test (2026-11-17):** real data renders end to end (list, card, prior seasons, compare, freshness). Fixes applied the same day: IDP removed (PE5), player population tightened, O(n²) target-share computation precomputed, list/game-log styling polish.

## Open questions that surface during this work

| Question | Tracked in |
| --- | --- |
| How soon after games are nflverse stats final? | Player explorer + NFL PRDs (answer during build) |
| How are user accounts created (beyond manual)? | System design §3 "not decided" |
| Hosting provider | Decision log open item 4 |
