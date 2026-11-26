# ADR-0006: Backfill 2022–2026 once, then load only data that can still change

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-11-05 |
| Revised | 2026-11-08, in place, at the owner's direction (not finalized): ledger piece is dataset × season; ledger in MySQL; incremental loads re-read the current season's file. 2026-11-09: ledger row count corrected for the ten Phase 1 files. 2026-11-10, in place, at the owner's direction (not finalized): the backfill starts in 2022, not 2017. 2026-11-10, Claude's correction after validating against real data: the team table loads by upsert, because foreign keys reference it. 2026-11-23, in place, at the owner's direction (not finalized): overlapping runs are handled by idempotent piece loads and next-run retry. 2026-11-23, Claude's proposal, **not confirmed by the owner**: each piece's ledger row written in its swap transaction. 2026-11-23, at the owner's direction: upsert from staging added as a considered load method, not yet weighed against delete-and-replace. 2026-11-24, in place, at the owner's direction (not finalized): `player` and `game` load by upsert like `team`; a player or game absent from a later file is kept, never deleted. Fact-table load method still open. 2026-11-25, in place, at the owner's direction (not finalized): each scheduled run also checks every past-season file's published version and reloads only files that changed; earlier, past seasons were never downloaded again once loaded. 2026-11-25, at the owner's direction: a publishing transaction that fails is retried up to 2 more times within the run, and each failure and the final outcome are logged ([schema review](../reviews/2026-11-24-schema-principles-review.md) D1) 2026-11-25: references to the schema review renumbered after its decisions were consolidated (D13 → D1) |
| Decision-makers | Project owner |
| Consulted | Claude (design) |
| Confidence | High |
| Supersedes | None |
| Related | ADR-0004 (Sleeper dated copies); ADR-0005 (storage); ADR-0013 (current-season-only datasets); ADR-0008 (runner); [`specs/ff-data-etl-storage-spec.md`](../../specs/ff-data-etl-storage-spec.md) §5 (loading) |

## Context and problem statement
The player card shows past seasons, and five seasons (2022–2026) are needed; the owner reduced the initial load from ten seasons (2017–2026) on 2026-11-10. Re-downloading every season on every scheduled run would waste time and compete with the API for resources. Updates must be reliable, and two runs at once must never leave inconsistent or duplicate data.

nflverse publishes one file per dataset per season (for example `stats_player_week_2025.csv`), or a single file for datasets without seasons (schedules, players). There are no per-week files.

## Decision drivers
- Full history is loaded once.
- Scheduled runs move only what can still change.
- A failed run never leaves partial data and is retried automatically.
- Overlapping runs must not leave duplicate or partial data; an older copy of a file committing last is an accepted risk, corrected by the next run (owner, 2026-11-25).

## Considered options
### Option 1: Re-download everything on every run
- Good: simplest logic.
- Bad: slow, wasteful, and heavy on shared resources.

### Option 2: One-time backfill, then incremental loads with a ledger
- Good: small scheduled runs, with a resumable backfill.
- Bad: a ledger to build.

### Past-season files after the backfill, within Option 2
Added 2026-11-25.

- **Never download again once loaded** (the first version; not chosen): fewest requests. Bad: nflverse republishes past-season files (weekly stats on 2026-11-25, snap counts on 2025-10-06), so a corrected past season would stay stale in the database for good.
- **Check every past-season file's version on each run; reload only changed files** (chosen 2026-11-25): about 20 version checks per run. Bad: if nflverse rebuilds a file with identical content but a new version, the run downloads and reloads it for nothing; a content-hash comparison (schema review §4, 2a) would skip that reload.

### Load method within Option 2
Added 2026-11-23 at the owner's direction. The delete-and-replace method below was adopted without alternatives being weighed; these are the alternatives, **not yet weighed for a decision**.

- **A. Delete and replace from staging (current):** stage the file, then in one transaction delete the piece's rows and insert the staged ones.
  - Good: the table ends as an exact copy of the file, including removing rows the source no longer has; all-or-nothing; row-count check before live data is touched.
  - Bad: rewrites every row, changed or not; can't be used for a table other tables reference by foreign key (hence the `team` exception); a delete followed by inserts over the same range is a deadlock pattern when runs overlap.
- **B. Upsert from staging** (`INSERT ... SELECT ... ON DUPLICATE KEY UPDATE`, as `team` already does), optionally followed by deleting rows whose key is missing from staging:
  - Good: unchanged rows are left alone; works for foreign-key parents; all-or-nothing and the row-count check are kept; Airflow's best practice for re-runnable tasks prescribes upsert ("Replace it with UPSERT", [Airflow best practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)).
  - Bad: without the delete step, rows the source dropped stay in the table; with it, the delete step is still needed for season rollover (ADR-0013).
- **C. Multi-row upsert straight into the table** (`INSERT ... VALUES ... ON DUPLICATE KEY UPDATE`, no staging):
  - Good: simplest code; no staging table.
  - Bad: no row-count check before live data changes; all-or-nothing only if the whole stream runs in one long transaction; rows the source dropped stay.

## Decision outcome
Chosen option: **Option 2**.

We will:
- **Backfill once:** load 2022–2026 as a one-off command, not on the scheduler. It runs piece by piece, one piece per **dataset × season** (season 0 for single-file datasets), matching how nflverse publishes its files. Each finished piece is recorded in an ingest ledger, so a stopped backfill resumes where it left off. Play-by-play and depth charts are loaded for the current season only ([ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md)).
- **Load incrementally on each scheduled run:**
  - seasonal nflverse datasets: the current season's file, which carries stat corrections to any week;
  - single-file nflverse datasets: the whole file;
  - Sleeper player list, once Sleeper is enabled (set aside since 2026-11-06): once a day, as a dated copy (ADR-0004).

  Past seasons of the seasonal datasets are **checked on every run**: the run reads each past-season file's published version and reloads only a file whose version changed since it was loaded (about 20 version checks for 2022–2025, no download unless changed). nflverse republishes past-season files: weekly player and team stats for 2022–2025 were republished on 2026-11-25, and snap counts for 2022 and 2024 on 2025-10-06 (checked 2026-11-25).
- **Skip unchanged files:** compare the source's published version (ETag, Last-Modified or content hash) with the ledger.
- **Write reliably:**
  - a piece is marked done only after it's written and validated;
  - failed pieces are retried within the run (below) and then on the next run;
  - data is written to staging and swapped in whole;
  - database rows for a piece are replaced in one transaction;
  - the entity tables `team`, `player` and `game`, which other tables reference by foreign key (decided 2026-11-25, schema review D3; not built yet), are upserted: new rows inserted, existing ones updated, none deleted, because MySQL rejects deleting a referenced row ([ETL spec §7.2](../../specs/ff-data-etl-storage-spec.md)). A player or game that disappears from a later source file stays in the table (owner, 2026-11-24). `team` has worked this way since 2026-11-10; `player` and `game` are **not yet built** this way.
- **Overlapping runs** (expected to be safe; not yet tested against concurrent runs):
  - loads replace whole pieces, so loading the same piece twice never creates duplicates;
  - a piece's ledger row is marked loaded in the same transaction as its swap, so a `loaded` ledger row and the table's data commit together (*Claude's proposal, not confirmed by the owner; implemented, uncommitted*);
  - a publishing transaction that fails, for example one rolled back by a database deadlock with another run or a lock-wait timeout, is retried up to 2 more times within the run; each failure and the final outcome are logged for later lookup or alerting (owner, 2026-11-25; schema review D1). A piece still failing after that is retried on the next run;
  - two overlapping runs almost always load the same file version, because they download it minutes apart; if an older copy commits last, the next run sees the changed version and reloads it. This risk is accepted (owner, 2026-11-25; schema review D1).

## Consequences
- Good: scheduled runs are small; a crashed or interrupted run is safe to redo; about 30 ledger rows for Phase 1's ten files (five history datasets × 5 seasons, three single files, and the current season of play-by-play and depth charts) instead of about 550 at a per-week grain, with identical downloads.
- Neutral: earlier seasons can be added later by running the backfill with an earlier `--from`; pieces already loaded are skipped.
- Bad: the ledger and staging-then-swap must be built and tested.
- Neutral: two runs at once can download and load the same piece twice; the result is expected to be correct (not yet tested), and the work is wasted.
- Neutral: each run checks the published version of about 20 past-season files; a past-season file whose version changed is downloaded and reloaded.
- Neutral: replacing a whole season per piece rewrites a few thousand weekly rows each time the current season's file changes.

## Confirmation
Tests cover:
- loading the same piece twice gives identical tables;
- two loads of the same piece at once leave the ledger matching the table;
- a rolled-back swap leaves the ledger unchanged;
- a run killed midway leaves the previous data intact;
- a past-season file with a changed version is reloaded, and one with an unchanged version is skipped;
- a failed publishing transaction is retried up to 2 more times, and each attempt is logged.

## More information
[`specs/ff-data-etl-storage-spec.md`](../../specs/ff-data-etl-storage-spec.md) §5 holds the implementation detail.
