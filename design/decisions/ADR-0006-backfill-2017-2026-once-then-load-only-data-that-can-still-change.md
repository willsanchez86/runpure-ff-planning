# ADR-0006: Backfill 2017–2026 once, then load only data that can still change

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-11-05 |
| Revised | 2026-11-08, in place, at the owner's direction (not finalized): ledger piece is dataset × season; lock and ledger in MySQL; incremental loads re-read the current season's file. 2026-11-09: ledger row count corrected for the ten Phase 1 files |
| Decision-makers | Project owner |
| Consulted | Claude (design) |
| Confidence | High |
| Supersedes | None |
| Related | ADR-0004 (Sleeper dated copies); ADR-0005 (storage); ADR-0013 (current-season-only datasets); ADR-0008 (runner); [`specs/ff-data-etl-storage-spec.md`](../../specs/ff-data-etl-storage-spec.md) §5 (loading) |

## Context and problem statement
The player card shows past seasons, and 10 seasons (2017–2026) are needed. Re-downloading all 10 seasons on every scheduled run would waste time and compete with the API for resources. Updates must be reliable, and two runs must never overlap or create duplicate data.

nflverse publishes one file per dataset per season (for example `stats_player_week_2025.csv`), or a single file for datasets without seasons (schedules, players). There are no per-week files.

## Decision drivers
- Full history is loaded once.
- Scheduled runs move only what can still change.
- A failed run never leaves partial data and is retried automatically.
- No overlapping runs and no duplicate rows.

## Considered options
### Option 1: Re-download everything on every run
- Good: simplest logic.
- Bad: slow, wasteful, and heavy on shared resources.

### Option 2: One-time backfill, then incremental loads with a ledger and a run lock
- Good: small scheduled runs, with a resumable backfill.
- Bad: a ledger and a lock to build.

## Decision outcome
Chosen option: **Option 2**.

We will:
- **Backfill once:** load 2017–2026 as a one-off command, not on the scheduler. It runs piece by piece, one piece per **dataset × season** (season 0 for single-file datasets), matching how nflverse publishes its files. Each finished piece is recorded in an ingest ledger, so a stopped backfill resumes where it left off. Play-by-play and depth charts are loaded for the current season only ([ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md)).
- **Load incrementally on each scheduled run:**
  - seasonal nflverse datasets: the current season's file, which carries stat corrections to any week;
  - single-file nflverse datasets: the whole file;
  - Sleeper player list, once Sleeper is enabled (set aside since 2026-11-06): once a day, as a dated copy (ADR-0004).

  Past seasons are never downloaded again once recorded as loaded.
- **Skip unchanged files:** compare the source's published version (ETag, Last-Modified or content hash) with the ledger.
- **Write reliably:**
  - a piece is marked done only after it's written and validated;
  - failed pieces are retried on the next run;
  - data is written to staging and swapped in whole;
  - database rows for a piece are replaced in one transaction.
- **Prevent overlap:**
  - each run takes a MySQL named lock (`GET_LOCK`), and a run that finds the lock taken exits and logs that it skipped;
  - loads replace whole pieces, so loading the same piece twice never creates duplicates.

## Consequences
- Good: scheduled runs are small; a crashed or interrupted run is safe to redo; about 55 ledger rows for Phase 1's ten files (five history datasets × 10 seasons, three single files, and the current season of play-by-play and depth charts) instead of about 1,100 at a per-week grain, with identical downloads.
- Bad: the ledger, lock and staging-then-swap must be built and tested.
- Neutral: replacing a whole season per piece rewrites a few thousand weekly rows each time the current season's file changes.

## Confirmation
Tests cover:
- loading the same piece twice gives identical tables;
- a run started while another holds the lock exits;
- a run killed midway leaves the previous data intact.

## More information
[`specs/ff-data-etl-storage-spec.md`](../../specs/ff-data-etl-storage-spec.md) §5 holds the implementation detail.
