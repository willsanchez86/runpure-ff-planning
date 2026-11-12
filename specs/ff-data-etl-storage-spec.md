# Implementation Spec — Data ETL & Storage

**Date:** 2026-11-10 · **Version:** v2.15 · **Status:** Draft. Every decision is recorded in §0.2; none is open.
**Companion to:** the Data ETL & storage technical PRD, [`prds/infra-data-etl-and-storage.md`](../prds/infra-data-etl-and-storage.md).
**Implements:** ADR-0001 to ADR-0013, and ADR-0017 for the operator query fields ([`design/architecture-decisions.md`](../design/architecture-decisions.md)).

> **v2.15 (2026-11-10):** a download that fails partway through now fails its piece instead of leaving the run waiting forever with the run lock held (`nflverse.service.ts` uses `pipeline` instead of `pipe`, which doesn't pass stream errors on).
>
> **v2.14 (2026-11-10):** TypeScript pinned to 6.0 (§12). `npm install` picked up TypeScript 7.0, which typescript-eslint, used by the backend's JSDoc lint check, doesn't support yet.
>
> **v2.13 (2026-11-10):** local MySQL is pinned to `mysql:8.4` (owner). Docker's `mysql:lts` tag had moved to MySQL 9.7, the newer LTS line, so the first local database came up as 9.7.4 instead of the 8.4 these documents assume (§7.3, §12).
>
> **v2.12 (2026-11-10):** history starts in 2022, not 2017 (owner; ADR-0006, ADR-0013 and ADR-0012 revised): sizes re-measured for 2022–2026 (§4.1, §7.2.4, §7.3), backfill command updated (§5.1). The data dictionary keeps its 2017–2026 profile.
>
> **v2.11 (2026-11-10):** the design was validated against freshly downloaded source files (§7.2.3). Fixes: `kick_distance` is signed; which team columns carry the foreign key, and why player and game references carry none; `team` loads first and by upsert, because a foreign key blocks deleting a referenced parent row; the §8 key checks now match the rows §7.2.3 already leaves out.
>
> **v2.10 (2026-11-10):** the backend setup script was updated to the current decisions before its first run and moved into the planning repo ([`code-repo-kit/init-runpure-backend.ps1`](../code-repo-kit/init-runpure-backend.ps1)); it now builds the D6 switch dates, so §5.2 and §13 no longer list them as a later step.
>
> **v2.9 (2026-11-09):** the five appendix files merged into one data dictionary (sections A1–A10).
>
> **v2.8 (2026-11-09):** line-by-line review fixes: ADR-0017 added to §0.1; Workbench described as a preference (ADR-0011); stat-correction wording matched to ADR-0006; five seasonal datasets; `team` added to every fact table's "Points to" and the team foreign key reconciled with §8; ID-type rule scoped to join IDs; roster status values listed (Appendix A, section A6); PRD question references point to the PRD that now holds them; Node 24 and Express 5 cited to ADR-0017.
>
> **v2.7 (2026-11-09):** the PRDs moved into the planning repo (`prds/`); companion link updated.
>
> **v2.6 (2026-11-09):** operator endpoints are GraphQL query fields (`pipelineRuns`, `ingestLedger`), per ADR-0017 (§3, §5.3).
>
> **v2.5 (2026-11-09):** §1 and §13 updated: the API is GraphQL (ADR-0017). Nothing in the pipeline changes.

> **v2.4 (2026-11-08):** the last open items closed: D6, D7 and D9a by the owner; D10 by Claude's recommendation, because the owner didn't know; D12 by default (node-cron, which the scaffold already uses). The owner can change D10 and D12. Team table added (§7.2, Appendix A, section A4).
>
> **v2.3 (2026-11-08):** the owner's decisions on the open items recorded (D1–D5, D8, D9, D11, D13–D16; §0.2). Phase 1 datasets set: weekly rosters dropped, weekly team stats added. Still open: D6, D7, D9a, D10, D12.
>
> **v2.2 (2026-11-08):** ADR references renumbered after superseded ADRs were merged in place (now ADR-0001 to ADR-0013).
>
> **v2.1 (2026-11-08):** §7.2 schema and Appendix A data dictionary added from profiling every ingested column; hosting references removed.
>
> **v2.0 (2026-11-08):** rewritten to match the accepted ADRs. Removed: the DuckDB warehouse, Parquet raw files, the object storage bucket and its snapshot layout, the bronze/silver/gold layers, ORM and migration tooling, GitHub Actions as the compute host, and Postgres. Phase 1 now covers nflverse only; Sleeper is parked. The league, live-tier, odds and rankings material from v1.1–v1.3 is kept in §11 as later-phase scope, with the decisions the ADRs have reopened.

---

## 0. Decisions

### 0.1 Decisions this spec implements

| ADR | What it means here |
|---|---|
| [ADR-0001](../design/decisions/ADR-0001-design-for-multiple-users-from-day-one.md) | Pipeline tables are shared reference data; account-owned rows (none in this pipeline) carry `user_id` |
| [ADR-0003](../design/decisions/ADR-0003-use-independent-sources-with-sleeper-filling-specific-gaps.md) | nflverse is the base source; Sleeper only through its documented player list (parked, §4.3) |
| [ADR-0004](../design/decisions/ADR-0004-keep-dated-copies-of-every-sleeper-player-list-pull.md) | Dated copies of every Sleeper player-list pull, kept in MySQL (ADR-0005). Parked with Sleeper |
| [ADR-0006](../design/decisions/ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md) | One-time backfill, incremental runs, ingest ledger, run lock, staging then swap (§5) |
| [ADR-0007](../design/decisions/ADR-0007-calculate-fantasy-points-in-the-app-from-stored-stats.md) | No fantasy-point columns stored; the app scores from stat lines |
| [ADR-0009](../design/decisions/ADR-0009-write-the-data-pipeline-in-typescript.md) | Pipeline written in TypeScript on Node |
| [ADR-0010](../design/decisions/ADR-0010-map-database-rows-to-code-by-hand-without-an-orm.md) | Hand-written SQL and hand-defined column mappings; no ORM |
| [ADR-0011](../design/decisions/ADR-0011-apply-schema-changes-by-hand-with-no-migration-tool.md) | Schema statements applied by hand (MySQL Workbench preferred), kept in order in `sql/` |
| [ADR-0012](../design/decisions/ADR-0012-transform-pipeline-data-in-typescript-and-mysql-with-no-transform-library.md) | No transform library: files are fetched, parsed with csv-parse and mapped in TypeScript; joins in TypeScript or MySQL |
| [ADR-0005](../design/decisions/ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) | MySQL is the only store; raw downloads are not kept; a bad load is fixed by downloading again |
| [ADR-0013](../design/decisions/ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md) | Play-by-play and depth charts: current season only; every other dataset keeps 2022–2026 |
| [ADR-0008](../design/decisions/ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md) | Pipeline, scheduler and backfill live in the Express backend (layered modular monolith), in its always-on process |
| [ADR-0017](../design/decisions/ADR-0017-use-graphql-for-the-backend-api.md) | Run history and the ledger are read through the GraphQL query fields `pipelineRuns` and `ingestLedger`, for operator accounts only |

Also agreed (2026-11-06), not separate ADRs:
- Weekly player stats come from nflverse's `stats_player` release for every season, not from aggregating play-by-play.
- nflverse files are fetched with plain HTTPS GET requests, with no authentication.

### 0.2 Decisions (2026-11-08)

| ID | Section | Decision |
|---|---|---|
| D1 | §1 | This spec lives with the ADRs, in the planning repo's `specs/` |
| D2 | §4.1 | Seven datasets: weekly player stats, weekly team stats, schedules, players, season rosters, injuries and snap counts; plus play-by-play and depth charts for the current season (ADR-0013). Weekly rosters aren't loaded. Practice-squad players are left out unless they play. Kickers, team defenses and individual defensive players are included |
| D3 | §4.1 | The current season's play-by-play is loaded to enable analytics later (ADR-0013) |
| D4 | §4.3 | Sleeper is set aside (owner, 2026-11-06); not in Phase 1 |
| D5 | §5.1 | One ledger piece per dataset × season (ADR-0006) |
| D8 | §5.3 | Out of scope: monitoring and alerting get their own PRD in a later phase (decision log, open item 7) |
| D9 | §7.2 | Table design is in §7.2 and Appendix A |
| D11 | §8 | Removed: play-by-play isn't used to reconcile weekly stats (ADR-0013) |
| D13 | §7.3 | Local MySQL only for now; the host and its version are deployment-phase decisions. Hosting research: [`research/mysql-hosting-options-research-2026-11-08.md`](../research/mysql-hosting-options-research-2026-11-08.md) |
| D14 | §11.5 | The snapshot archiver doesn't run in Phase 1; when it starts, snapshots are stored as MySQL rows, as ADR-0005 does for other dated copies |
| D15 | §11 | League data, the live game-day tier and source health move to the backend's platform connections; odds, rankings and the snapshot archiver stay in this spec |
| D16 | §7.3 | Backup and recovery: a deployment-phase decision, not decided now |
| D6 | §5.2 | The current season is the NFL season in progress on today's date (owner). Between seasons, each dataset switches when nflverse publishes the new season: rosters on March 15; stats, snap counts, injuries, depth charts and play-by-play on the Wednesday after Labor Day. `CURRENT_SEASON` overrides it |
| D7 | §9 | One scheduled run a day at 06:00 Eastern (owner) |
| D9a | §7.2 | Load nflverse's team file as a `team` table, so every team code has a foreign key (owner) |
| D10 | §8 | Structural checks block a load; value checks only warn. *Claude's recommendation; the owner didn't know* |
| D12 | §12 | node-cron, as the scaffold already uses. *Claude's recommendation* |

---

## 1. Scope and boundary

**Phase 1:** nflverse data into MySQL tables that the Express API reads for the Player list, Player card, and NFL scores and schedule screens. No leagues are connected.

**The pipeline ends at** the MySQL tables. The API, and the scoring that turns stat lines into fantasy points (ADR-0007), sit outside this spec. Interfaces (open question 5) are confirmed in [`design/architecture-decisions.md`](../design/architecture-decisions.md); the API is GraphQL (ADR-0017). Neither changes anything here.

**Out of Phase 1:** Sleeper (parked, §4.3), league data, the live game-day tier, odds and rankings (§11).

**Where this spec lives (D1):** with the ADRs, in the planning repo's `specs/`.

## 2. Architecture

```
  nflverse release files (public GitHub release assets, HTTPS, no auth)
        │  fetch() stream  ──►  gunzip (pbp only)  ──►  csv-parse (stream)
        ▼
  hand-written column mapping (TypeScript)  ── drops fantasy-point columns (ADR-0007)
        │  batched INSERTs
        ▼
  MySQL  <table>__staging  ──►  one transaction: delete rows being replaced, copy staging in
        │
        ▼
  MySQL app tables  ◄── Express API: GraphQL endpoint (Yoga) → resolvers → services → models

  Express backend process (always on):
    scheduler (in-process) ──► ingest entry point ──► GET_LOCK run lock ──► ingest_ledger, job_run
    backfill: one-off CLI command, same entry point, same lock (never on the scheduler)
```

Rules:
- **MySQL is the only store** (ADR-0005). No raw files are kept. Every table can be rebuilt by downloading again (backfill), because nflverse republishes its data.
- **Files are streamed, never loaded whole**, and inserted in batches, because jobs share the API's single Node process (ADR-0008).

## 3. Where the code lives

Backend repository (`runpure-ff-backend`), created by [`code-repo-kit/init-runpure-backend.ps1`](../code-repo-kit/init-runpure-backend.ps1) (pipeline parts shown):

```
src/
  config/env.ts               environment variables
  db/pool.ts, db/lock.ts      MySQL pool; GET_LOCK run lock
  middleware/, routes/        Express layers; the GraphQL endpoint (Yoga) is mounted here
  modules/pipeline/
    model/                    ingest_ledger and job_run queries
    service/datasets.ts       dataset registry + hand-written column mappings
    service/season.ts         current season; which seasons each run loads
    service/nflverse.service.ts   version check and streamed CSV download
    service/load.service.ts   staging table, then swap in one transaction
    service/ingest.service.ts one run: lock, ledger, piece by piece
    graphql/                  Pothos types and resolvers: pipelineRuns, ingestLedger (operator accounts only; ADR-0017)
  scheduler/index.ts          schedules that only call the ingest entry point
  jobs/                       CLI entry points: ingest, backfill, headers
sql/                          hand-applied schema statements, in order (ADR-0011)
docker-compose.yml            local MySQL (mysql:8.4, bound to 127.0.0.1)
```

## 4. Sources

### 4.1 nflverse

Files are fetched from `https://github.com/nflverse/nflverse-data/releases/download/<release>/<file>`. No authentication. GitHub's REST API (60 requests an hour unauthenticated, counted per IP address) is **not** used; if a job ever lists releases through the API, it needs a token.

The Phase 1 datasets (D2), plus the team file (D9a), and their CSV sizes for the seasons loaded, 2022–2026 (2026 to date), measured from the files downloaded on 2026-11-10 (ADR-0006). Weekly rosters (`weekly_rosters/`, ~146 MB) aren't loaded: no Phase 1 requirement needs them.

| Dataset | Release path | Scope | Size 2022–2026 | Kept |
|---|---|---|---|---|
| Weekly player stats | `stats_player/stats_player_week_<season>.csv` | history | ~36 MB | 2022 onward |
| Season rosters | `rosters/roster_<season>.csv` | history | ~5 MB | 2022 onward |
| Weekly team stats | `stats_team/stats_team_week_<season>.csv` | history | ~1 MB | 2022 onward |
| Snap counts | `snap_counts/snap_counts_<season>.csv` | history | ~10 MB | 2022 onward |
| Injuries | `injuries/injuries_<season>.csv` | history | ~3 MB | 2022 onward |
| Schedules and scores | `schedules/games.csv` | single file | ~2 MB | All seasons in one file |
| Players | `players/players.csv` | single file | ~7 MB | One file |
| Teams | `teams/teams_colors_logos.csv` | single file | ~19 KB | One file (D9a) |
| Depth charts | `depth_charts/depth_charts_<season>.csv` | current season | ~151 MB (71 MB for 2026 so far) | Current season only (ADR-0013) |
| Play-by-play | `pbp/play_by_play_<season>.csv.gz` | current season | ~914 MB as CSV (94–100 MB per season) | Current season only (ADR-0013) |

- Use the `stats_player` release. The older `player_stats` release returned 404 for 2019, 2025 and 2026.
- Since 2025, depth charts are dated snapshots, sourced from ESPN; they grow through the season.
- Read every file's header before mapping it: `npm run headers -- --dataset <name>`. Don't assume columns.
- Observed in `stats_player_week_2025.csv` (2026-11-08): `player_id` is the GSIS ID (e.g. `00-0023459`); rows carry `season`, `week`, `season_type` and `game_id` (e.g. `2025_01_PIT_NYJ`); missing values are empty fields. The rows end with what appear to be fantasy-point columns; confirm their names with `headers` and leave them out of the mapping (ADR-0007).

**Players included (D2):**
- Kickers and individual defensive players (positions K, DB, DL and LB) come from weekly player stats; team defense comes from weekly team stats. No extra dataset is needed.
- Practice-squad players are left out unless they play: a player is included once he has a weekly stats row. Season rosters mark practice squad as status `DEV` (*inference* from the code; the profiled status values are listed in Appendix A, section A6).

**Play-by-play (D3):** the current season is loaded to enable analytics later (ADR-0013). Weekly stats come from `stats_player` (§0.1), not from play-by-play.

### 4.2 Verify at build

- **Version headers.** Incremental runs skip a file whose published version is unchanged (ADR-0006). The scaffold reads `ETag` and `Last-Modified` from a HEAD request that follows GitHub's redirect. This wasn't confirmed: the download host failed during checking on 2026-11-08. If neither header is returned, compare `Content-Length` plus a content hash recorded in the ledger.
- **Team codes.** v1.3 required normalizing relocated teams (OAK→LV, SD→LAC, STL→LA) before any join. nflverse's team file keeps the old codes as their own rows (OAK, SD, STL, plus both LA and LAR), so every code joins to `team` as published. Check during mapping whether a screen needs them shown under the current team.

### 4.3 Sleeper player list (parked)

ADR-0003 uses Sleeper's documented player list for injury status, body part, practice participation and depth-chart order; ADR-0004 keeps a dated copy of every pull, in MySQL (ADR-0005). The owner set Sleeper aside on 2026-11-06 to focus on nflverse.

Facts that bear on it: nflverse's injury files carry the official report status and practice participation back to 2009, and its depth charts have been dated since 2025. A daily copy of Sleeper's full list is about 5 MB, roughly 1.8 GB a year.

**Decided (D4):** not in Phase 1; Sleeper is set aside (owner, 2026-11-06).

## 5. Loading

### 5.1 Backfill and incremental runs (ADR-0006, ADR-0013)

- **Backfill (once):** `npm run backfill -- --from 2022 --to 2026` (ADR-0006; `HISTORY_START_SEASON=2022`). Earlier seasons can be added later with an earlier `--from`. Loads every history dataset for each season, piece by piece. It's a command, never on the scheduler. Resumable: a piece already loaded with an unchanged source version is skipped.
- **Incremental (each scheduled run):**
  - history datasets: the current season's file only;
  - current-season datasets (pbp, depth charts): the current season's file;
  - single-file datasets: the whole file.

  Past seasons are never downloaded again once loaded.
- **Stat corrections:** nflverse publishes one file per season, so the current season's file carries corrections to any week. ADR-0006's incremental load re-reads that file whenever its version changes, so corrections to any week are picked up.
- **Season rollover:** loading a new season's pbp or depth-chart file replaces the whole table, which removes the previous season (ADR-0013).

**Ledger grain (D5):** one piece per dataset × season, with season 0 for single files (ADR-0006).

### 5.2 Current season

**Rule (D6):** the current season is the NFL season in progress on today's date. Between seasons, each dataset switches when nflverse starts publishing the new season, following nflreadr's own rule:
- season rosters: on March 15;
- weekly stats, snap counts, injuries, depth charts and play-by-play: on the Wednesday after Labor Day (the 2026 opener moved to a Wednesday);
- single-file datasets have no season.

`CURRENT_SEASON` overrides the rule. Each dataset's switch date is set in `datasets.ts` (`rollover`) and applied in `season.ts`, in the Eastern time zone.

### 5.3 Reliability

- **One piece at a time:** rows stream into `<table>__staging` in batches (default 1,000 rows); then one transaction deletes the rows being replaced (that season, or the whole table) and copies staging in. A crash before the swap leaves the live table untouched; the next run drops the leftover staging table.
- **Ledger:** each piece is recorded in `ingest_ledger` with its source URL, version headers, status (`downloading`, `loaded`, `failed`), row count and error. A failed piece is retried on the next run.
- **Run record:** each run writes a `job_run` row (kind, start, end, outcome, pieces loaded, skipped and failed). The GraphQL query fields `pipelineRuns` and `ingestLedger` expose them to operator accounts (ADR-0017).
- **No overlap:** each run takes the MySQL named lock `runpure_pipeline_run` (`GET_LOCK`, no wait). A run that can't get it records `skipped_locked` and exits. Backfill and scheduled runs share the lock.
- **Shutdown:** on SIGTERM or SIGINT the scheduler stops starting runs; an interrupted run is redone safely (ADR-0008).

**Alerting (D8):** out of scope for now; monitoring and alerting get their own PRD in a later phase. A failure is visible in `job_run` and the logs.

## 6. Transform and mapping (ADR-0010, ADR-0012)

- Each dataset has a hand-written mapping in `datasets.ts`: CSV header → MySQL column, with an optional cast. A dataset without a mapping is skipped and reported.
- Empty fields and `NA` become NULL. Nulls stay null; no values are imputed.
- Fantasy-point columns are never mapped (ADR-0007).
- Player identity: the GSIS ID (`player_id` in weekly stats). A crosswalk to Sleeper, ESPN or Yahoo IDs is only needed once a non-nflverse source is added.
- Any join or aggregation is written in TypeScript or as MySQL SQL (for example `INSERT … SELECT` from staging). No transform library.

## 7. Storage (ADR-0011, ADR-0005)

### 7.1 Bookkeeping tables

Defined in `sql/0001_pipeline_tables.sql`: `ingest_ledger` (unique on dataset, season) and `job_run`.

### 7.2 Data tables (schema)

Every column of every file Phase 1 ingests was downloaded and profiled on 2026-11-08 (2026-11-09 UTC for depth charts and teams): the five seasonal datasets for all of 2017–2026, the three single files, play-by-play for 2025 (full season) and 2026 to date, and depth charts for 2026 to date. Each column's observed type, share of empty values, range or longest value, and the values of short code columns were recorded, matched to nflverse's own data dictionary, and given a proposed MySQL type by the rules in §7.2.2. The column-by-column result is **Appendix A**, the data dictionary file. Profiling used one-off scripts outside the repos; re-run the `headers` command before mapping each table.

All seasons of each dataset have the same columns, except injuries: from 2025 the files add `season_type` and drop `date_modified`. Depth charts changed source and format after 2024; only the 2025+ format matters here, because only the current season is kept (ADR-0013).

#### 7.2.1 Tables: entities and facts

Each table states its grain (what one row is) before its columns ([Kimball, Declaring the Grain](https://www.kimballgroup.com/2003/03/declaring-the-grain/)). Things that exist on their own are entity tables in third normal form, so a player's birth date lives on the player, not on every weekly row ([Kent, A Simple Guide to Five Normal Forms](https://www.bkent.net/Doc/simple5.htm)). Measurements and events are fact tables keyed by those entities.

| Table | Source | Kind | Grain | Primary key (checked unique) | Points to | Columns | Rows profiled |
|---|---|---|---|---|---|---|---|
| `player` | `players/players.csv` | Entity | One player | `gsis_id` | — | 39 | 24,867 |
| `game` | `schedules/games.csv` | Entity | One game | `game_id` | `team` | 46 | 7,548 |
| `player_week_stat` | `stats_player` | Fact | One player in one week | `season, season_type, week, player_id` | `player`, `game`, `team` | 150 (148 stored) | 173,203 |
| `team_week_stat` | `stats_team` | Fact | One team in one week | `season, season_type, week, team` | `game`, `team` | 138 | 5,232 |
| `roster` | `rosters` | Fact (membership) | One player on one team in one season | `season, team, gsis_id` | `player`, `team` | 36 | 31,013 |
| `injury_report` | `injuries` | Fact (event) | One player's report for one game week | `season, week, game_type, team, gsis_id` (latest report wins) | `player`, `team` | 17 | 53,262 |
| `snap_count` | `snap_counts` | Fact | One player in one game | `game_id, pfr_player_id` | `game`, `team`; player via `player.pfr_id` | 16 | 240,602 |
| `depth_chart` | `depth_charts` (current season) | Fact (dated snapshot) | One player in one depth-chart slot at one snapshot | `dt, team, pos_grp_id, pos_slot, pos_rank` | `player` (where `gsis_id` is present), `team` | 12 | 763,791 |
| `play` | `pbp` (current season) | Fact (event) | One play | `game_id, play_id` | `game`, `team` | 372 | 70,118 (2025 + 2026) |
| `team` | `teams/teams_colors_logos.csv` | Entity | One team code | `team_abbr` | — | 16 | 36 |

Row counts above are from the 2017–2026 profile. Phase 1 loads 2022–2026 (ADR-0006), about half the rows of each seasonal table; §7.2.4 sizes that load.

#### 7.2.2 Rules applied to every column

| Rule | Source |
|---|---|
| Every table has an explicit primary key; fact tables use the natural composite key, leading with the most-filtered columns, so "season X, weeks a–b" reads adjacent rows | [MySQL 8.4: clustered and secondary indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html); [InnoDB best practices](https://dev.mysql.com/doc/refman/8.4/en/innodb-best-practices.html); [multiple-column indexes](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html) |
| One or two secondary indexes per fact table (e.g. `player_id`); InnoDB appends the primary key to each | [index extensions](https://dev.mysql.com/doc/refman/8.4/en/index-extensions.html) |
| Smallest integer type that holds twice the largest value seen; `UNSIGNED` when a value can't be negative; integer identifiers `INT UNSIGNED`; no display widths | [optimizing data size](https://dev.mysql.com/doc/refman/8.4/en/data-size.html); [numeric type syntax](https://dev.mysql.com/doc/refman/8.4/en/numeric-type-syntax.html) |
| 0/1 play flags `BOOLEAN`; model outputs and shares (EPA, WPA, CPOE, target share) `DOUBLE`; counts are stored, not only rates | [numeric type syntax](https://dev.mysql.com/doc/refman/8.4/en/numeric-type-syntax.html); [problems with floating-point values](https://dev.mysql.com/doc/refman/8.4/en/problems-with-float.html) |
| Every player-ID column used for joins (GSIS and PFR IDs) has one identical type, `VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin`, so joins use the index; other providers' IDs keep the length the data needs; every team-code column is `VARCHAR(4)` ascii, matching `team.team_abbr`; names stay `utf8mb4` with the default accent- and case-insensitive collation | [how MySQL uses indexes](https://dev.mysql.com/doc/refman/8.4/en/mysql-indexes.html); [server character set and collation](https://dev.mysql.com/doc/refman/8.4/en/charset-server.html) |
| `DATE` for dates; `DATETIME` (or `DATETIME(3)` where the source has milliseconds) in UTC for timestamps; never `TIMESTAMP`, which ends in 2038; game-clock values (`mm:ss`) as short strings, with the numeric seconds columns used for arithmetic | [date and time types](https://dev.mysql.com/doc/refman/8.4/en/datetime.html) |
| `ENUM` only for small closed sets (`season_type`, `game_type`, `location`, `team_conf`); team and position stay codes | [ENUM type](https://dev.mysql.com/doc/refman/8.4/en/enum.html) |
| Key columns `NOT NULL`; a stat that doesn't apply stays `NULL`, never 0; strict SQL mode on | [optimizing data size](https://dev.mysql.com/doc/refman/8.4/en/data-size.html); [Kimball Design Tip #43](https://www.kimballgroup.com/2003/02/design-tip-43-dealing-with-nulls-in-the-dimensional-model/) |
| Wide tables stay as typed columns, not JSON; long text (the play description, up to 717 characters) is `TEXT` | [column count and row size limits](https://dev.mysql.com/doc/refman/8.4/en/column-count-limit.html); [JSON type](https://dev.mysql.com/doc/refman/8.4/en/json.html) |
| Column names kept exactly as nflverse spells them (snake_case) | [SQL Style Guide](https://www.sqlstyle.guide/) |

Full findings and citations behind these rules: [`research/relational-schema-best-practice-2026-11-08.md`](../research/relational-schema-best-practice-2026-11-08.md).

#### 7.2.3 What the profiling found

- **Player IDs are not all 10 characters.** 6,079 of 24,867 players carry older 9-character IDs, so the ID type is `VARCHAR(10)`, not `CHAR(10)`.
- **Weekly player stats has 150 columns.** Two are fantasy points (`fantasy_points`, `fantasy_points_ppr`), which aren't stored (ADR-0007). 36 columns are newer than nflverse's published dictionary.
- **203 weekly stat rows have no player** (about one per team-week, no name or position). They can't be keyed to a player and are left out.
- **Injuries repeat a key 4 times** (2024: a status updated twice in one week). The latest `date_modified` wins; from 2025 that column no longer exists.
- **12 roster rows have no player ID**; they are left out.
- **Snap counts identify players by Pro Football Reference ID, not GSIS.** 99.91% of rows map to a player through `player.pfr_id`; 22 IDs don't.
- **Depth charts:** 285 dated snapshots between 2026-03-22 and 2026-11-08, so roughly daily. 3.2% of rows have no `gsis_id` (ESPN ID present), so `gsis_id` is nullable here and `player` is joined where it exists.
- **13 play-by-play columns are empty** in both seasons profiled; their types are set from their names.
- **Season rosters mark practice squad as status `DEV`** (*inference* from the code; per D2, a practice-squad player is included only once he has a weekly stats row).
- **Validated against fresh downloads, 2026-11-10** (every season 2017–2026 of the five seasonal datasets, the three single files, the 2026 depth charts and play-by-play):
  - Every file's columns are unchanged in name and order, in every season. Injuries still has two headers: 2017–2024, and 2025 on.
  - Every observed value fits its proposed type except `kick_distance`, which had a punt of −2 yards; it is now `SMALLINT` (data dictionary, section A10).
  - Every team code in every team column has a row in `team`, except `play.side_of_field`, which also holds `50` (midfield). It gets no foreign key.
  - **1,501 players on season rosters (1,610 rows, mostly cut players) have no row in `players.csv`**, in every season since 2017. nflverse also dropped 130 players last active in 2012 from `players.csv` since 2026-11-08. A database-enforced foreign key to `player` would reject those roster rows and stop `player` being replaced, so player and game references are checked by the load and only warn (§8).
  - Snap counts: 225 rows (22 Pro Football Reference IDs) don't map to `player.pfr_id`, as before. Weekly stats still have 203 rows without a player, rosters 12, and injuries 4 repeated keys.
- **Replacing a season stays a single transaction** (delete that season's rows, insert from staging), as in §5.3. A table-rename swap can't be used for it, because MySQL commits any open transaction before a rename ([RENAME TABLE](https://dev.mysql.com/doc/refman/8.4/en/rename-table.html); [atomic DDL](https://dev.mysql.com/doc/refman/8.4/en/atomic-ddl.html)).

#### 7.2.4 Estimated size

*Inference:* estimated from the proposed types and the row counts for the seasons loaded (2022–2026, counted 2026-11-10), plus about 60% for page fill and indexes; measure after the first load.

| Table | Bytes a row (est.) | Rows | Size (est.) |
|---|---|---|---|
| `player_week_stat` | ~390 | ~85,000 (5 seasons) | ~57 MB |
| `play` | ~2,060 | ~49,000 (one full season) | ~165 MB |
| `depth_chart` | ~70 | ~769,000 (2026 to date; grows through the season) | ~125 MB |
| `snap_count` | ~80 | ~119,000 | ~22 MB |
| `injury_report` | ~320 | ~26,000 | ~15 MB |
| `roster` | ~310 | ~16,000 | ~8 MB |
| `player` | ~350 | ~25,000 | ~15 MB |
| `game`, `team_week_stat`, `team` | — | ~10,000 | ~5 MB |
| **Total** | | | **~410 MB** |

For 2017–2026 the total was about 515 MB.

The type rules hold a weekly stat row to about 390 bytes, against about 1,200 if every number were stored as `DOUBLE`.

**Team table (D9a):** nflverse's `teams/teams_colors_logos.csv` is loaded as `team` (36 codes, 16 columns; Appendix A, section A4), and screens get team names, colors and logos.

**Foreign keys** (checked against real data, §7.2.3):
- Every column that holds a team code has a database foreign key to `team.team_abbr`, except `play.side_of_field`, which also holds `50`. A code with no row in `team` therefore blocks the load (§8).
- Player and game references (the "Points to" column above) carry no database foreign key. The load checks them and warns (§8), because real rows reference players missing from `players.csv`, and because `player` and `game` are replaced whole on each load.
- MySQL checks a foreign key immediately and, by default, rejects deleting a parent row that child rows still reference ([MySQL 8.4, FOREIGN KEY constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html); [constraint differences](https://dev.mysql.com/doc/refman/8.4/en/ansi-diff-foreign-keys.html)). So `team` is loaded first and by upsert (insert new codes, update existing ones, delete none), not by delete-and-replace like the other single files.

Each table's `CREATE TABLE` goes in a new `sql/000N_*.sql`, is run by hand (ADR-0011; Workbench preferred), and is then mapped in `datasets.ts`.

### 7.3 Database copies

- **Local:** Docker's `mysql:8.4` image, from the backend repo's `docker-compose.yml`, reachable only from the developer's machine (`127.0.0.1:3306`). Pinned to 8.4 by the owner on 2026-11-10: the `mysql:lts` tag now follows MySQL 9.7, and the hosting research found 8.4 offered by every host compared (`research/mysql-hosting-options-research-2026-11-08.md`).
- **Hosted:** not chosen (open questions 1 and 4).
- **Schema changes:** applied by hand to each copy, from the statements kept in `sql/`, in order (ADR-0011).
- **Size:** about 235 MB of CSV for the Phase 1 datasets (D2): about 64 MB for the seven over 2022–2026, plus about 100 MB of play-by-play (a full season) and about 70 MB of depth charts for the current season; about 410 MB estimated in MySQL (§7.2.4), not yet measured.
- **Backup and recovery (D16):** a deployment-phase decision, not decided now.

**Decided (D13):** local MySQL only for now; the host is a deployment-phase decision, and the local image must then run the same major version as the host. Hosting research: [`research/mysql-hosting-options-research-2026-11-08.md`](../research/mysql-hosting-options-research-2026-11-08.md).

## 8. Validation

Runs inside each load, before a piece is marked `loaded` (ADR-0006).

**Rule (D10; Claude's recommendation, the owner didn't know):** structural checks block a load, so the previous good data stays in place; value checks load the new data and record a warning in `job_run`.

| Check | Effect |
|---|---|
| The file's header doesn't match the dataset's mapping (injuries accepts both of its headers, §7.2) | Blocks |
| A natural key repeats, or a key column is empty, after the expected cases are handled: rows §7.2.3 leaves out (weekly stats without a player, roster rows without a player ID) are dropped and counted in `job_run`, and a repeated injury key keeps the latest report | Blocks |
| The row count falls sharply against the same piece's last load | Blocks |
| A player or game ID in a fact table has no row in `player` or `game` | Warns |
| A team code has no row in `team` | Blocks: the foreign key to `team.team_abbr` (D9a) rejects the load. *Owner's decision, 2026-11-09* |
| A value is out of its usual range (for example a stat correction) | Warns |
| Weekly stats or schedules older than 24 hours in season | Warns |

The "falls sharply" threshold is set when the first loads give row counts to compare.

**Removed (D11):** v1.3's reconciliation of play-by-play totals against box-score stats isn't carried over; play-by-play isn't used to reconcile weekly stats (ADR-0013).

## 9. Jobs and schedule

| Job | Runs | What it does |
|---|---|---|
| `ingest` | On the in-process schedule; also on demand (`npm run ingest`) | Incremental load (§5.1) |
| `backfill` | Once, by hand (`npm run backfill`) | History load, resumable |
| `headers` | On demand | Prints each dataset's columns for mapping; no database needed |

**Schedule (D7):** one run a day at 06:00 Eastern (`PIPELINE_CRON=0 6 * * *`, `PIPELINE_TZ=America/New_York`, the scaffold's default). nflverse builds player stats nightly, so a game that ends near midnight is loaded by 06:00. No extra game-night runs.

## 10. Idempotency contract

1. Every load replaces whole pieces; re-running any piece is always safe.
2. Rebuilding the database means running the backfill again from the sources. Results match the sources as currently published, not a byte-identical earlier state; nflverse corrects and republishes its files.
3. Each ledger row records when its piece was loaded and from which version of the source.

## 11. Later phases (not Phase 1)

Kept from v1.1–v1.3 so the material isn't lost.

**Decided (D15):** league data (§11.1), the live game-day tier (§11.2) and source health (§11.6) move to the backend's platform-connections work; odds (§11.3), rankings (§11.4) and the snapshot archiver (§11.5) stay in this spec. They are kept below until the platform-connections spec exists.

### 11.1 League data: Sleeper, Yahoo, ESPN

- **Sleeper** (REST, `https://api.sleeper.app/v1`, no auth): `/league/<id>`, `/rosters`, `/users`, `/matchups/<wk>`, `/transactions/<rnd>`, `/draft/<id>/picks`, `/state/nfl`, `/players/nfl/trending/<add|drop>`. Rate limit under 1,000 requests a minute.
- **Yahoo:** official Fantasy Sports API, OAuth 2.0; refresh token in the credential store. Confirm resource paths and rate limits before coding (Platform connections PRD; moved from ETL PRD Q4).
- **ESPN:** undocumented v3 API; private leagues need `espn_s2` and `SWID` cookies. Confirm the host and view names at build time; blocked on terms of service (Platform connections PRD; moved from ETL PRD Q2).
- Credentials never appear in stored payloads or logs.
- v1.3 stored each full raw response so a parser change never needed a re-pull. ADR-0005 keeps no raw downloads; league payloads can't be re-pulled for past weeks, so their storage needs its own decision when this phase starts.

### 11.2 Live game-day tier

Polls live scores during game windows, at least every 60 seconds, from first kickoff to the last final; locks players at kickoff; writes disposable live tables replaced by batch data once games are final. It needs an always-on process: since ADR-0008, the Express backend is one, so whether the tier runs there or in a separate worker is decided with platform connections (D15). Needs the late-inactives source (Platform connections PRD; moved from ETL PRD Q5).

### 11.3 Odds

Default The Odds API (`https://api.the-odds-api.com/v4`, `apiKey`): game lines for implied team totals, and per-event player props. Swappable for SportsGameOdds behind the same interface. Vendor open (Data ETL & storage PRD, Q10).

### 11.4 Rankings and FantasyPros

Free path: nflverse `ff_rankings`. Keyed path: FantasyPros consensus rankings (`x-api-key`). Projections are produced downstream (modelling), out of Phase 1 (Data ETL & storage PRD, Q11).

### 11.5 Snapshot archiver

v1.3 called this the critical path: twice-weekly point-in-time snapshots of odds props, ADP, injuries, depth charts and rankings, the only data that can't be rebuilt later. It was designed for append-only files in the bucket, which ADR-0005 removed.

**Decided (D14):** the archiver doesn't run in Phase 1. When it starts, snapshots are stored as MySQL rows, as ADR-0005 does for Sleeper's dated copies. Each week it doesn't run, that week's point-in-time data is gone; nflverse's dated depth charts since 2025 cover part of it.

### 11.6 Source health

v1.1 added a `source_health` table (OK / Out of date / Broken / Reconnect needed) for connected platforms. For nflverse, `job_run` and `ingest_ledger` already record each run's outcome. A separate health table belongs with platform connections.

## 12. Tech

| Part | Choice | From |
|---|---|---|
| Language and runtime | TypeScript 6.0 on Node 24. Move to 7.0 once typescript-eslint supports it (it has no compiler API yet) | ADR-0009, ADR-0008; Node 24 per ADR-0017 |
| Server | Express 5, layered modular monolith; GraphQL Yoga endpoint | ADR-0008, ADR-0017 |
| Database | MySQL 8.4; local `mysql:8.4` in Docker | ADR-0005; §7.3 |
| Database access | `mysql2`, hand-written SQL | ADR-0010 |
| Schema changes | Hand-applied statements in `sql/` | ADR-0011 |
| CSV parsing | `csv-parse`, streamed | ADR-0012 |
| HTTP | Node's built-in `fetch` | ADR-0012 |
| Scheduler | `node-cron` | D12 |
| Run lock | MySQL `GET_LOCK` | ADR-0006 |

**Scheduler (D12; Claude's recommendation):** node-cron, as the scaffold already uses: it is maintained, ships its own types and runs on wall-clock time in a named zone. The earlier version of ADR-0008 cited node-schedule, whose last release is about three years old.

## 13. Sequencing

1. Run the backend setup script ([`code-repo-kit/init-runpure-backend.ps1`](../code-repo-kit/init-runpure-backend.ps1)): repo, Express layers, GraphQL endpoint with the token check, pipeline module with the D6 switch dates, ledger and lock, scheduler, backfill and headers commands, local MySQL. Then run `npm run spike`, the Yoga-on-Express-5 check that ADR-0017 makes the first build step.
2. Apply `sql/0001_pipeline_tables.sql` and `sql/0002_users.sql` by hand (ADR-0011).
3. Map each Phase 1 dataset (D2; tables in §7.2): `headers` → `CREATE TABLE` → mapping → `npm run ingest -- --dataset <name>`.
4. Add the D10 checks to the load (§8).
5. Run the backfill.
6. Build the Player list, Player card and schedule queries on the loaded tables, as GraphQL fields (ADR-0017).
7. Confirm the D6 switch dates and the 06:00 Eastern schedule (D7) against nflverse's publishing once the first season rolls over.
8. Deployment phase: choose the host (D13) and backup and recovery (D16).

---

## Appendix A. Data dictionary

Every column of every ingested file, profiled 2026-11-08 (teams and depth charts 2026-11-09 UTC), with its observed type, empty-value share, range and proposed MySQL type: [`ff-data-etl-storage-spec-data-dictionary.md`](ff-data-etl-storage-spec-data-dictionary.md), sections A1–A10.
