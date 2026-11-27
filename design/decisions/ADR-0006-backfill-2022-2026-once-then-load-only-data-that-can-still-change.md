# ADR-0006: Backfill 2022–2026 once, then load only data that can still change

**Status:** Accepted
**Date:** 2026-11-05
**Revised:** 2026-11-08, in place, at the owner's direction (not finalized): ledger piece is dataset × season; ledger in MySQL; incremental loads re-read the current season's file. 2026-11-09: ledger row count corrected for the ten Phase 1 files. 2026-11-10, in place, at the owner's direction (not finalized): the backfill starts in 2022, not 2017. 2026-11-10, Claude's correction after validating against real data: the team table loads by upsert, because foreign keys reference it. 2026-11-23, in place, at the owner's direction (not finalized): overlapping runs are handled by idempotent piece loads and next-run retry. 2026-11-23, Claude's proposal, **not confirmed by the owner**: each piece's ledger row written in its swap transaction. 2026-11-23, at the owner's direction: upsert from staging added as a considered load method, not yet weighed against delete-and-replace. 2026-11-24, in place, at the owner's direction (not finalized): `player` and `game` load by upsert like `team`; a player or game absent from a later file is kept, never deleted. Fact-table load method still open. 2026-11-25, in place, at the owner's direction (not finalized): each scheduled run also checks every past-season file's published version and reloads only files that changed; earlier, past seasons were never downloaded again once loaded. 2026-11-25, at the owner's direction: a publishing transaction that fails is retried up to 2 more times within the run, and each failure and the final outcome are logged ([schema review](../reviews/2026-11-24-schema-principles-review.md) D1) 2026-11-25: references to the schema review renumbered after its decisions were consolidated (D13 → D1) 2026-11-27, in place, at the owner's direction (one-time override of the rule that an implemented ADR is not edited): restated as the current decision: no run lock; download and publishing retries within the run; every past season version-checked daily; upsert for every table (ADR-0028); play-by-play and depth charts from 2026 (ADR-0013); Sleeper data as status history (ADR-0004); the ledger written inside the data's transaction, confirmed by the owner. The 2026-11-27 replacement ADR-0006 was folded back into this ADR and removed.
**Implementation started:** 2026-11-09 (added by Claude on 2026-11-25 under the owner's standing authorization of 2026-11-17, gating backend pull request remove-run-lock: the ingest ledger and pipeline were first committed in the backend's initial commit d6d28ce, 2026-11-09)
**Deciders:** William Sanchez

## Context

The app's NFL data comes from nflverse, which publishes one file per dataset per season (for example `stats_player_week_2025.csv`), or one file for datasets without seasons (schedules, players, teams). There are no per-week files: the current season's file carries corrections to any week. nflverse also republishes past-season files (weekly player and team stats for 2022–2025 on 2026-11-25; snap counts for 2022 and 2024 on 2025-10-06).

The player card shows past seasons, so history from 2022 is needed. Re-downloading every season on every run wastes time and competes with the API, which runs in the same process ([ADR-0008](ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md)). Downloads occasionally fail for a moment (network errors, server errors, rate limits), and a database transaction can fail on a deadlock or lock timeout.


## Decision

**Load history from 2022 once with a one-off backfill, then run one load a day that takes the current season's files, every single-file dataset and any past-season file nflverse has republished; record every piece in a ledger; retry transient failures within the run.**

- **Backfill:** a one-off command, never scheduled, loads 2022 to the current season for the seasonal datasets (weekly player stats, weekly team stats, season rosters, injuries, snap counts) and the whole single-file datasets (schedules, players, teams). Play-by-play and depth charts start with the 2026 season ([ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md)). The backfill runs piece by piece (one piece per dataset × season) and resumes where it stopped.
- **Daily run, 06:00 Eastern:** loads the current season's file of each seasonal dataset and the whole single-file datasets, and checks the published version of every past-season file (2022 on; 2026 on for play-by-play and depth charts), reloading only files whose version changed.
- **Skip unchanged files:** a file whose published version (`ETag`, `Last-Modified` or a content hash) matches the last successful load is not downloaded.
- **Which season is current:** rosters switch to the new season on March 15; every other seasonal dataset on the Wednesday after Labor Day.
- **Ledger:** every piece is recorded (source URL, version headers, status, row count, error), so a run knows what is loaded and a stopped backfill resumes.
- **Writing:** each file is staged first and published in one transaction, so a failed load never leaves partial data; how rows are written (upsert for every table, never delete-and-replace) and when removed rows are deleted (a quarterly reconciliation) is [ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md).
- **Retries:** a download that fails on a network error, 5xx or 429 is retried up to 3 attempts with backoff; a publishing transaction that fails is retried up to 2 more times within the run; every failure and the final outcome are logged; a piece still failing is retried on the next run.
- **Overlapping runs:** runs are not coordinated; there is no run lock. Two overlapping runs download the same file minutes apart, so they almost always load the same version; if an older copy commits last, the next run sees the changed version and reloads it. This risk is accepted.

- **Ledger write:** a piece's ledger row is marked loaded inside the same transaction as its data, so the ledger can never say a file loaded when its data was rolled back (owner, 2026-11-27).

## Options Considered

### Option A — One-off backfill, then daily incremental loads with a ledger (chosen)
| Dimension | Assessment |
|---|---|
| Run size | Small: current-season files plus the few past-season files nflverse republished |
| Corrections | Current-season corrections picked up daily; republished past seasons reloaded |
| Reliability | Staging and one transaction per file; ledger; retries within the run |
| Cost | A ledger and version checks to build |

### Option B — Re-download everything on every run
Not chosen: slow, wasteful and heavy on the process the API shares.

### Option C — Coordinate runs with a lock so only one runs at a time
The earlier version (until 2026-11-23). Removed by the project owner: loads are idempotent and overlapping runs are an accepted risk.

### Option D — Never download a past season again once loaded
The earlier version (until 2026-11-25). Replaced by the project owner after nflverse was found republishing past seasons.

## Consequences

**Binding constraints:** the backfill is never scheduled; a past-season file reloads only when its published version changes; there is no run lock.

**Easier:** daily runs stay small; corrections to any season reach the database; a crashed or interrupted run is safe to redo.
**Harder / to revisit:** about 20 version checks per run for past seasons; a file republished with identical content but a new version reloads for nothing (a content-hash comparison would skip it); history before 2022 needs a backfill with an earlier start.

## Relationship to other decisions

- **Narrowed by** [ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md): play-by-play and depth charts start with 2026.
- **Load method:** [ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md) (upsert for every table; quarterly reconciliation).
- **Depends on** [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) (MySQL) and [ADR-0008](ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md) (where the jobs run).
- **Sleeper data:** [ADR-0004](ADR-0004-record-sleeper-injury-and-depth-chart-status-as-change-history.md) (status change history).
