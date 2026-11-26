# Implementation Spec — Data ETL & Storage

**Date:** 2026-11-25 · **Version:** v2.27 · **Status:** Draft. This spec's own decisions are in §0.2 (D1–D16 here); the 2026-11-23 to 2026-11-25 schema and load decisions are the [schema principles review](../design/reviews/2026-11-24-schema-principles-review.md)'s "review D1–D8", cited with that prefix. Open: review O5, O6, O8, O10.
**Companion to:** the Data ETL & storage technical PRD, [`prds/infra-data-etl-and-storage.md`](../prds/infra-data-etl-and-storage.md).
**Implements:** ADR-0001 to ADR-0013, ADR-0017 for the operator query fields, and ADR-0022 to ADR-0027 for the schema principles review's table decisions (accepted 2026-11-25, not built) ([`design/architecture-decisions.md`](../design/architecture-decisions.md)).

> **v2.27 (2026-11-25):** The schema principles review's 29 owner decisions are consolidated into review D1–D8 and reflected throughout: runs and retries (review D1; §4.2, §5.3), past-season version checks and upserted entity tables (review D2; §5.1), foreign keys on every player and game reference (review D3; §7.2.4, §8), provider-ID mapping tables `source`, `player_source`, `game_source` (review D4), unidentifiable players (review D5; §5.4, §8), lookup tables `stadium`, `position_group`, `position` (review D6), descriptor and duplicate columns off fact rows (review D7), `play_participant` (review D8). §7.2.1 lists every table as decided. Not built yet; the build is the [implementation plan](../design/reviews/2026-11-25-schema-review-implementation-plan.md), the database change its migration script (§13).
>
> **v2.26 (2026-11-25):** Owner's decisions on provider IDs, unidentifiable players, overlapping runs, past seasons, `team`, `game` and stadiums. Numbered review D8–D18 at the time; consolidated in v2.27 as review D1–D6.
>
> **v2.25 (2026-11-24):** Owner's decisions: descriptor columns come off fact rows (a fact table holds keys and measures; the entity table holds the entity's properties), and no row-hash change detection (`ON DUPLICATE KEY UPDATE` already skips unchanged rows). Which columns are dropped, and whether weekly position stays, were decided on 2026-11-25 (review D7). Not built yet.
>
> **v2.24 (2026-11-24):** Owner's decision: `player` and `game` load by upsert like `team`, and rows absent from a later file are kept (ADR-0006 revised in place; §7.2.1). Not built yet: the code still replaces both whole. Schema reviewed against relational and MySQL fundamentals: [`design/reviews/2026-11-24-schema-principles-review.md`](../design/reviews/2026-11-24-schema-principles-review.md), findings Proposed, decision-log item 16.
>
> **v2.23 (2026-11-24):** Owner's decision: transient request failures are retried within the run (§4.2 "Transient failures"; §5.4 extract steps 2 and 5). Not built yet. Raised by Claude from a review of the owner's AssetPanda cron jobs, accepted by the owner 2026-11-24.
>
> **v2.22 (2026-11-23):** Reopened by the owner: player and game references without foreign keys (§7.2.3, §8) do not align with best practice. That choice came in v2.11 without an owner decision. How to add the foreign keys was decided on 2026-11-25 (review D3–D5).
>
> **v2.21 (2026-11-23):** Documentation brought in line with the code, no behaviour change. §5.4 "Run walkthrough" added: one run step by step, written from the backend code, including the known issue that a failed piece's retry runs without the row-count check. Marked **not built**: §4.2's content-hash fallback (the code compares the `ETag` only and reloads every run when there is none) and §8's out-of-range and older-than-24-hours warnings. §8's row-count threshold now states the implemented `ROW_COUNT_MIN_RATIO` (default 0.5, uncalibrated). §5.3's overlapping-runs statement corrected: expected to be safe, not yet tested.
>
> **v2.20 (2026-11-23):** At the owner's direction: runs are no longer coordinated; overlapping runs are handled by whole-piece loads and next-run retry of a failed piece, including one rolled back by a deadlock with another run (ADR-0006, revised in place; §5.3). *Claude's proposal, not confirmed by the owner:* each piece's ledger row is marked `loaded` in the same transaction as its swap. `job_run.outcome` is `running`, `ok` or `failed` (backend `sql/0014_job_run_outcome.sql`).
>
> **v2.19 (2026-11-18):** Governance correction, no behaviour change: D10 (structural checks block, value checks warn) and D12 (node-cron) were closed in 2026-11-08 on Claude's recommendation without explicit owner approval; the owner ratified both on 2026-11-18. Attribution preserved in §0.2, §8 and §12. Same day: §11.4's consensus-rankings paths dropped (owner: no third-party projection data is fetched; PRD Q11 closed).
>
> **v2.18 (2026-11-17):** Claude's correction after a live 2026 ingest failed loading play-by-play: `fumble_recovery_2_yards` carried a negative value, overflowing its `TINYINT UNSIGNED` column (the dictionary sized it from profiled seasons whose values happened to be 0-3). It and `lateral_rushing_yards` (same shape, same risk) are widened to `SMALLINT`, matching their `_1` siblings (dictionary rows 185 and 262; backend `sql/0013_play_signed_yardage.sql`).
>
> **v2.17 (2026-11-12):** Claude's corrections and hardening while implementing the load path and backfill, validated against freshly fetched files and a real load into an isolated MySQL schema. (1) Only primary-key columns are `NOT NULL`; every other column is nullable, because the data dictionary's 0.0%-empty figures are a single snapshot that live data violates (e.g. `player.height`/`weight`, several `play` clock/result columns). The load drops rows whose key is empty (§8). (2) `roster.draft_club` carries no foreign key: nflverse uses a different team-code vocabulary there (`AZ` for Arizona vs `team_abbr` `ARI`), so it can't reference `team` (§7.2.4). (3) Transport hardening (§4.2): the downloader follows redirects by hand with an https host allowlist (SSRF), bounds time-to-headers and inter-chunk idle (not a whole-download deadline), and caps download and gzip-decompressed bytes (bomb guard); `RELEASE_BASE` is now an environment variable (§4.1). (4) Staging is a session-scoped `TEMPORARY` table discarded when its connection closes, and an errored load destroys its connection (§5.3).
>
> **v2.16 (2026-11-12):** Claude's corrections while writing the data-table `CREATE TABLE` files, validated against freshly fetched files (data dictionary A3, A7). Schedules' `pfr` game id is typed `VARCHAR(16) ascii`, matching snap counts' `pfr_game_id` (both are ASCII). The injuries dictionary note now states that the file ships two 16-column headers (2017–2024 with `date_modified`, 2025+ with `season_type` second), so the 17-column table is their union, both columns are nullable, and injuries is mapped and validated by column name (§7.2.3, §8 already describe the two headers).
>
> **v2.15 (2026-11-10):** a download that fails partway through now fails its piece instead of leaving the run waiting forever (`nflverse.service.ts` uses `pipeline` instead of `pipe`, which doesn't pass stream errors on).
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
| [ADR-0006](../design/decisions/ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md) | One-time backfill, incremental runs, ingest ledger, staging then swap (§5) |
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
| D10 | §8 | Structural checks block a load; value checks only warn. *Claude's 2026-11-08 proposal, ratified by the owner 2026-11-18* |
| D12 | §12 | node-cron, as the scaffold already uses. *Claude's proposal, ratified by the owner 2026-11-18* |

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
  MySQL  <table>__staging (session TEMPORARY)  ──►  one transaction: upsert (team, player, game) or delete-and-replace (facts), mark the ledger row loaded
        │
        ▼
  MySQL app tables  ◄── Express API: GraphQL endpoint (Yoga) → resolvers → services → models

  Express backend process (always on):
    scheduler (in-process) ──► ingest entry point ──► ingest_ledger, job_run
    backfill: one-off CLI command, same entry point (never on the scheduler)
```

Rules:
- **MySQL is the only store** (ADR-0005). No raw files are kept. Every table can be rebuilt by downloading again (backfill), because nflverse republishes its data.
- **Files are streamed, never loaded whole**, and inserted in batches, because jobs share the API's single Node process (ADR-0008).

## 3. Where the code lives

Backend repository (`runpure-ff-backend`), created by [`code-repo-kit/init-runpure-backend.ps1`](../code-repo-kit/init-runpure-backend.ps1) (pipeline parts shown):

```
src/
  config/env.ts               environment variables
  db/pool.ts                  MySQL pool
  middleware/, routes/        Express layers; the GraphQL endpoint (Yoga) is mounted here
  modules/pipeline/
    model/                    ingest_ledger and job_run queries
    service/datasets.ts       dataset registry + hand-written column mappings
    service/season.ts         current season; which seasons each run loads
    service/nflverse.service.ts   version check and streamed CSV download
    service/load.service.ts   staging table, then swap and ledger row in one transaction
    service/ingest.service.ts one run: ledger, piece by piece
    graphql/                  Pothos types and resolvers: pipelineRuns, ingestLedger (operator accounts only; ADR-0017)
  scheduler/index.ts          schedules that only call the ingest entry point
  jobs/                       CLI entry points: ingest, backfill, headers
sql/                          hand-applied schema statements, in order (ADR-0011)
docker-compose.yml            local MySQL (mysql:8.4, bound to 127.0.0.1)
```

## 4. Sources

### 4.1 nflverse

Files are fetched from `${RELEASE_BASE}/<release>/<file>`, where `RELEASE_BASE` is an environment variable defaulting to `https://github.com/nflverse/nflverse-data/releases/download` (so a mirror needs no redeploy; §12). No authentication. GitHub's REST API (60 requests an hour unauthenticated, counted per IP address) is **not** used; if a job ever lists releases through the API, it needs a token.

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

- **Version headers.** Incremental runs skip a file whose published version is unchanged (ADR-0006). The pipeline reads `ETag` and `Last-Modified` from the final response of a HEAD request; confirmed 2026-11-12 that GitHub redirects release assets to `release-assets.githubusercontent.com`, which returns an `ETag`. Redirects are followed **by hand** and every hop (including the start URL) is validated against an https host allowlist (`RELEASE_HOST_ALLOWLIST`), not auto-followed; the download has a response-header timeout, an inter-chunk idle timeout, and download and gzip-decompression byte caps (SSRF and resource-exhaustion guards; §12). If no `ETag` is returned, compare `Content-Length` plus a content hash recorded in the ledger. **Not built:** the code compares the `ETag` only (`Last-Modified` and `Content-Length` are recorded, not compared; the ledger has no hash column), so a file served without an `ETag` reloads on every run.
- **Transient failures** (owner, 2026-11-24; **not built yet**). A HEAD or GET request that fails before its response headers arrive is retried within the run, so a momentary fault doesn't cost a piece until the next scheduled run. Rules:
  - Retried: a network error (connection refused or reset, DNS failure, the response-header timeout), HTTP 5xx, and HTTP 429 (if the response carries `Retry-After` in seconds, that wait is used instead of the backoff).
  - Not retried: any other 4xx (a 404 means the file isn't published; retrying can't help), a blocked redirect host, too many redirects.
  - Attempts: `FETCH_ATTEMPTS`, default 3. Wait between attempts: `FETCH_BACKOFF_MS` (default 1,000) doubled each time, so 1 s then 2 s; a retry restarts from the start URL, so a failure on a redirect hop re-walks the chain under the same allowlist.
  - Not retried once the body is streaming: an idle timeout or byte cap mid-download fails the piece as today, and the next run retries it (§5.3). Restarting a half-consumed stream would mean discarding the staging rows already written, which the next-run retry already does.
  - Each retry is logged with the attempt number and the reason; the exhausted error names the last reason.
- **Team codes.** v1.3 required normalizing relocated teams (OAK→LV, SD→LAC, STL→LA) before any join. nflverse's team file keeps the old codes as their own rows (OAK, SD, STL, plus both LA and LAR), so every code joins to `team` as published. Check during mapping whether a screen needs them shown under the current team.

### 4.3 Sleeper player list (parked)

ADR-0003 uses Sleeper's documented player list for injury status, body part, practice participation and depth-chart order; ADR-0004 keeps a dated copy of every pull, in MySQL (ADR-0005). The owner set Sleeper aside on 2026-11-06 to focus on nflverse.

Facts that bear on it: nflverse's injury files carry the official report status and practice participation back to 2009, and its depth charts have been dated since 2025. A daily copy of Sleeper's full list is about 5 MB, roughly 1.8 GB a year.

**Decided (D4):** not in Phase 1; Sleeper is set aside (owner, 2026-11-06).

## 5. Loading

### 5.1 Backfill and incremental runs (ADR-0006, ADR-0013)

- **Backfill (once):** `npm run backfill -- --from 2022 --to 2026` (ADR-0006; `HISTORY_START_SEASON=2022`). Earlier seasons can be added later with an earlier `--from`. Loads every history dataset for each season, piece by piece. It's a command, never on the scheduler. Resumable: a piece already loaded with an unchanged source version is skipped.
- **Incremental (each scheduled run):**
  - history datasets: the current season's file, and a version check on every past-season file (below);
  - current-season datasets (pbp, depth charts): the current season's file;
  - single-file datasets: the whole file.

  Past seasons of history datasets: each run checks every past-season file's published version and reloads only a file whose version changed (review D2, ADR-0006; **not built yet**: the code still loads the current season only). nflverse republishes past-season files (weekly stats on 2026-11-25; snap counts on 2025-10-06).
- **Stat corrections:** nflverse publishes one file per season, so the current season's file carries corrections to any week. ADR-0006's incremental load re-reads that file whenever its version changes, so corrections to any week are picked up.
- **Season rollover:** loading a new season's pbp or depth-chart file replaces the whole table, which removes the previous season (ADR-0013). Deleting a play also deletes its `play_participant` rows (`ON DELETE CASCADE`; review D8, not built yet).

**Ledger grain (D5):** one piece per dataset × season, with season 0 for single files (ADR-0006).

### 5.2 Current season

**Rule (D6):** the current season is the NFL season in progress on today's date. Between seasons, each dataset switches when nflverse starts publishing the new season, following nflreadr's own rule:
- season rosters: on March 15;
- weekly stats, snap counts, injuries, depth charts and play-by-play: on the Wednesday after Labor Day (the 2026 opener moved to a Wednesday);
- single-file datasets have no season.

`CURRENT_SEASON` overrides the rule. Each dataset's switch date is set in `datasets.ts` (`rollover`) and applied in `season.ts`, in the Eastern time zone.

### 5.3 Reliability

- **One piece at a time:** rows stream into a session-scoped `<table>__staging` `TEMPORARY` table in batches (default 1,000 rows); then one transaction deletes the rows being replaced (that season, or the whole table), copies staging in and marks the piece's ledger row `loaded`. A crash before the swap leaves the live table untouched; the `TEMPORARY` staging is discarded when its connection closes, and an errored load destroys its connection, so no staging table lingers for a later run.
- **Ledger:** each piece is recorded in `ingest_ledger` with its source URL, version headers, status (`downloading`, `loaded`, `failed`), row count and error. A failed publishing transaction is retried up to 2 more times within the run, each attempt logged (review D1; not built yet); a piece still failing is retried on the next run.
- **Run record:** each run writes a `job_run` row (kind, start, end, outcome, pieces loaded, skipped and failed). The GraphQL query fields `pipelineRuns` and `ingestLedger` expose them to operator accounts (ADR-0017).
- **Overlapping runs:** runs are not coordinated (no lock; review D1). Loading a piece twice never duplicates rows. A publishing transaction that fails, for example in a deadlock with another run, is retried up to 2 more times within the run, and every attempt and the final outcome are logged (not built yet). Accepted risk (owner, 2026-11-25): two overlapping runs download the same file minutes apart; if an older copy commits last, the next run sees the changed version and reloads it. Two runs at once duplicate the download and load work.
- **Shutdown:** on SIGTERM or SIGINT the scheduler stops starting runs; an interrupted run is redone safely (ADR-0008).

**Alerting (D8):** out of scope for now; monitoring and alerting get their own PRD in a later phase. A failure is visible in `job_run` and the logs.

### 5.4 Run walkthrough

What one run does, in order, as the backend implements it (`runpure-ff-backend`, `src/modules/pipeline/`). Each piece (dataset × season) goes through extract, transform and load before the next piece starts, and rows stream through all three: nothing waits for a whole file.

**Start of a run** (`ingest.service.ts`)
1. Triggered by the in-process scheduler (§9), `npm run ingest` or `npm run backfill`; all call the same entry point.
2. A `job_run` row is inserted with outcome `running`.
3. Datasets are taken in registry order (`datasets.ts`), parents before children, because MySQL checks foreign keys on every statement: today `team` first; once review D3–D8 are built, teams → players → schedules → rosters → weekly stats and injuries → snap counts → depth charts → play-by-play (implementation plan §3). A `--dataset` filter narrows them. A dataset with no mapping is skipped and counted.
4. Seasons per dataset: a backfill takes `HISTORY_START_SEASON` to the current season; a scheduled ingest takes the current season (§5.2) and, once built, version-checks every past season (review D2); a single-file dataset is season 0.

**Extract** (`nflverse.service.ts`)
1. Build the file URL from `RELEASE_BASE` and the dataset's path.
2. HEAD request: redirects followed by hand, every hop checked against the https host allowlist, with a response-header timeout; reads `ETag`, `Last-Modified` and `Content-Length` from the final response (§4.2). A network error, 5xx or 429 is retried up to `FETCH_ATTEMPTS` times with backoff (§4.2 "Transient failures"; not built yet).
3. Read the piece's ledger row. If it is `loaded` with the same `ETag` and `--force` wasn't given, the piece is skipped.
4. Upsert the ledger row as `downloading`, which also clears `rows_loaded`.
5. GET request under the same guards and the same retry rule up to the response headers (not built yet), streamed through an idle timeout, a download byte cap, gzip decompression with a decompressed-byte cap (`.gz` files), and the CSV parser, which yields one object per row.

**Transform** (`validate.service.ts`, `load.service.ts`)
1. Header check on the first row: a mapped column missing from the header (other than injuries' optional columns) fails the piece before anything is written (§8).
2. Rows whose natural key has an empty or `NA` column are dropped and counted (§7.2.3).
3. A dataset with `dedupeBy` keeps one row per natural key: the greatest `dedupeBy` value, or the last row in file order when it is empty (counted, and warned). A dataset without it streams through; a repeated key there fails at the staging insert (§8).
4. Each row is mapped: only mapped columns are kept (so fantasy-point columns are left out, ADR-0007), renamed to table columns, `''` and `NA` become NULL, and per-column casts apply (for example timestamps to UTC `DATETIME`) (§6).
5. *Decided, not built (review D4, D5):* roster rows whose `gsis_id` is not in `player` are dropped and counted; provider-ID columns are written as `player_source` / `game_source` rows (conflicts and shared IDs logged, not stored); snap rows get `source_code = 'pfr'` where `player_source` knows the PFR ID, otherwise it stays empty and is counted; an empty depth-chart `gsis_id` is filled from the ESPN ID through `player_source`.

**Load** (`load.service.ts`)
1. On one connection, create the session-scoped `TEMPORARY` staging table `LIKE` the target.
2. Insert rows into staging in batches (`LOAD_BATCH_SIZE`, default 1,000).
3. Row-count check: if the staged count is below `previous rows × ROW_COUNT_MIN_RATIO` (default 0.5), staging is dropped and the piece fails, keeping the previous data (§8). The previous count is the ledger's `rows_loaded` when the row is `loaded`; otherwise there is nothing to compare and the check is skipped.
4. One transaction: for `team`, insert new rows and update existing ones, deleting none; for a history dataset, delete that season's rows and insert from staging; for a single-file or current-season dataset, delete the whole table and insert from staging (for `player` and `game` this changes to the `team` upsert, review D2, not built yet). The ledger row is marked `loaded` with its row count inside the same transaction, then it commits. A foreign-key violation or deadlock rolls back all of it; once built, the transaction is retried up to 2 more times and each attempt logged (review D1).
5. Staging is dropped and the connection returned to the pool; after an error the connection is destroyed instead, so no staging table outlives it.
6. Reference checks count player and game IDs with no parent row and record warnings; a reference whose parent table is empty is skipped (§8). *As built today; replaced by foreign keys (review D3), with only review D5's unidentifiable snap and depth-chart rows counted.*

**When a piece fails:** any error in extract, transform or load marks the ledger row `failed` with the error, clearing its `ETag` and `rows_loaded`; the run counts it and moves to the next piece. The next run retries it; once built, downloads get up to 3 attempts and the publishing transaction up to 2 more within the run (review D1). *Known issue:* because `rows_loaded` is cleared, that retry runs without the row-count check.

**End of a run**
1. Outcome: `failed` if any piece failed, otherwise `ok`.
2. The `job_run` row gets its finish time, loaded/skipped/failed counts, and any warnings in `error` with a `WARNINGS:` prefix.
3. The `ingest` and `backfill` commands exit with code 1 on `failed`, 0 otherwise; a scheduled run logs a one-line summary.

## 6. Transform and mapping (ADR-0010, ADR-0012)

- Each dataset has a hand-written mapping in `datasets.ts`: CSV header → MySQL column, with an optional cast. A dataset without a mapping is skipped and reported.
- Empty fields and `NA` become NULL. Nulls stay null; no values are imputed.
- Fantasy-point columns are never mapped (ADR-0007).
- Player identity: the GSIS ID (`player_id` in weekly stats). A player's IDs at other providers (PFR, ESPN, Sleeper, Yahoo, …) are rows in `player_source`, loaded from nflverse's own files (review D4); rows are linked only by exact ID (review D5).
- Any join or aggregation is written in TypeScript or as MySQL SQL (for example `INSERT … SELECT` from staging). No transform library.

## 7. Storage (ADR-0011, ADR-0005)

### 7.1 Bookkeeping tables

Defined in `sql/0001_pipeline_tables.sql`: `ingest_ledger` (unique on dataset, season) and `job_run`.

### 7.2 Data tables (schema)

Every column of every file Phase 1 ingests was downloaded and profiled on 2026-11-08 (2026-11-09 UTC for depth charts and teams): the five seasonal datasets for all of 2017–2026, the three single files, play-by-play for 2025 (full season) and 2026 to date, and depth charts for 2026 to date. Each column's observed type, share of empty values, range or longest value, and the values of short code columns were recorded, matched to nflverse's own data dictionary, and given a proposed MySQL type by the rules in §7.2.2. The column-by-column result is **Appendix A**, the data dictionary file. Profiling used one-off scripts outside the repos; re-run the `headers` command before mapping each table.

All seasons of each dataset have the same columns, except injuries: from 2025 the files add `season_type` and drop `date_modified`. Depth charts changed source and format after 2024; only the 2025+ format matters here, because only the current season is kept (ADR-0013).

#### 7.2.1 Tables: entities and facts

**Descriptor and duplicate columns (owner, 2026-11-24 and 2026-11-25; review D7; not built yet):** fact tables keep keys, measures and facts of their own grain; a player's or game's descriptions live on `player` or `game`. Dropped: `player_week_stat` names and headshot (weekly `position` and `position_group` stay); `roster` names, birth date, college and 4 columns duplicating `player`; `injury_report` names; `snap_count` columns repeating `game` (`player` name and `position` stay); `game` QB names; `play`'s 28 game-level columns and 26 player names. Values only a fact row holds are copied to `player` or `game` first. `play`'s 18 drive columns stay (recorded exception). `depth_chart.player_name` stays (review D5).

**Provider IDs (owner, 2026-11-25; review D4; not built yet):** `source` (key `source_code`, 17 providers) lists ID providers. `player_source (gsis_id, source_code, source_player_id VARCHAR(64) ascii_bin NOT NULL)`, key `(gsis_id, source_code)`, `UNIQUE (source_code, source_player_id)`, foreign keys to `player` and `source`, holds a player's ID at each provider; the 7 ID columns on `player` and 11 on `roster` move there, `players.csv` winning conflicts, which are logged. `game_source` does the same for games (`game`'s 7 ID columns and `play.nfl_api_id`); an ID shared by two games is skipped and logged. `snap_count` keeps `pfr_player_id` and gains `source_code`, with the foreign key `(source_code, pfr_player_id)` → `player_source`.

**Lookup tables (owner, 2026-11-25; review D6, D8; not built yet):** `stadium` (key `stadium_id`; `game.stadium` keeps the name the game was played under, taken from play-by-play where present); `position_group` (key `pos_grp_id`) and `position` (key `pos_id`) for depth charts; `play_participant` replaces `play`'s 60 numbered slot columns. `team` keeps `team_abbr` as its key. Every column of every table: the [migration script](../design/reviews/2026-11-24-schema-principles-review-migration.sql).

Each table states its grain (what one row is) before its columns ([Kimball, Declaring the Grain](https://www.kimballgroup.com/2003/03/declaring-the-grain/)). Things that exist on their own are entity tables in third normal form, so a player's birth date lives on the player, not on every weekly row ([Kent, A Simple Guide to Five Normal Forms](https://www.bkent.net/Doc/simple5.htm)). Measurements and events are fact tables keyed by those entities.

| Table | Source | Kind | Grain | Primary key (checked unique) | Points to | Columns | Rows profiled |
|---|---|---|---|---|---|---|---|
| `player` | `players/players.csv` | Entity | One player | `gsis_id` | `team` | 39 (32 after review D4) | 24,867 |
| `game` | `schedules/games.csv` | Entity | One game | `game_id` | `team`; after review D3, D6: `player` (QB IDs), `stadium` | 46 (40 after review D4, D7) | 7,548 |
| `player_week_stat` | `stats_player` | Fact | One player in one week | `season, season_type, week, player_id` | `player`, `game`, `team` | 150 (148 stored; 145 after review D7) | 173,203 |
| `team_week_stat` | `stats_team` | Fact | One team in one week | `season, season_type, week, team` | `game`, `team` | 138 | 5,232 |
| `roster` | `rosters` | Fact (membership) | One player on one team in one season | `season, team, gsis_id` | `player`, `team` | 36 (15 after review D4, D7) | 31,013 |
| `injury_report` | `injuries` | Fact (event) | One player's report for one game week | `season, week, game_type, team, gsis_id` (latest report wins) | `player`, `team` | 17 (14 after review D7) | 53,262 |
| `snap_count` | `snap_counts` | Fact | One player in one game | `game_id, pfr_player_id` | `game`, `team`; player via `player_source (source_code, pfr_player_id)` (review D4; today `player.pfr_id`) | 16 (13 after review D4, D7) | 240,602 |
| `depth_chart` | `depth_charts` (current season) | Fact (dated snapshot) | One player in one depth-chart slot at one snapshot | `dt, team, pos_grp_id, pos_slot, pos_rank` | `player` (where `gsis_id` is present), `team`; after review D6: `position_group`, `position` | 12 (9 after review D6) | 763,791 |
| `play` | `pbp` (current season) | Fact (event) | One play | `game_id, play_id` | `game`, `team`; after review D3: `player` (26 columns) | 372 (258 after review D4, D7, D8) | 70,118 (2025 + 2026) |
| `team` | `teams/teams_colors_logos.csv` | Entity | One team code | `team_abbr` | — | 16 | 36 |
| `source` | Seeded by the migration | Lookup (review D4) | One ID provider | `source_code` | — | 2 | 17 |
| `player_source` | `players.csv`, `rosters` | Mapping (review D4) | One player's ID at one provider | `gsis_id, source_code` | `player`, `source` | 3 | — |
| `game_source` | `games.csv`, `pbp` | Mapping (review D4) | One game's ID at one provider | `game_id, source_code` | `game`, `source` | 3 | — |
| `stadium` | `games.csv` | Entity (review D6) | One stadium | `stadium_id` | — | 2 | — |
| `position_group` | `depth_charts` | Lookup (review D6) | One depth-chart formation | `pos_grp_id` | — | 2 | 4 (2025) |
| `position` | `depth_charts` | Lookup (review D6) | One depth-chart position | `pos_id` | — | 3 | 31 (2025) |
| `play_participant` | `pbp` (current season) | Fact (bridge, review D8) | One player in one role on one play | `game_id, play_id, role, seq` | `play`, `player`, `team` | 7 | — |

Row counts above are from the 2017–2026 profile. Phase 1 loads 2022–2026 (ADR-0006), about half the rows of each seasonal table; §7.2.4 sizes that load.

#### 7.2.2 Rules applied to every column

| Rule | Source |
|---|---|
| Every table has an explicit primary key; fact tables use the natural composite key, leading with the most-filtered columns, so "season X, weeks a–b" reads adjacent rows | [MySQL 8.4: clustered and secondary indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html); [InnoDB best practices](https://dev.mysql.com/doc/refman/8.4/en/innodb-best-practices.html); [multiple-column indexes](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html) |
| One or two secondary indexes per fact table (e.g. `player_id`); InnoDB appends the primary key to each | [index extensions](https://dev.mysql.com/doc/refman/8.4/en/index-extensions.html) |
| Smallest integer type that holds twice the largest value seen; `UNSIGNED` when a value can't be negative; integer identifiers `INT UNSIGNED`; no display widths | [optimizing data size](https://dev.mysql.com/doc/refman/8.4/en/data-size.html); [numeric type syntax](https://dev.mysql.com/doc/refman/8.4/en/numeric-type-syntax.html) |
| 0/1 play flags `BOOLEAN`; model outputs and shares (EPA, WPA, CPOE, target share) `DOUBLE`; counts are stored, not only rates | [numeric type syntax](https://dev.mysql.com/doc/refman/8.4/en/numeric-type-syntax.html); [problems with floating-point values](https://dev.mysql.com/doc/refman/8.4/en/problems-with-float.html) |
| Every player-ID column used for joins (GSIS and PFR IDs) has one identical type, `VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin`, so joins use the index; other providers' IDs are rows in `player_source` / `game_source`, one `VARCHAR(64) ascii_bin` column for all (review D4); every team-code column is `VARCHAR(4)` ascii, matching `team.team_abbr`; names stay `utf8mb4` with the default accent- and case-insensitive collation | [how MySQL uses indexes](https://dev.mysql.com/doc/refman/8.4/en/mysql-indexes.html); [server character set and collation](https://dev.mysql.com/doc/refman/8.4/en/charset-server.html) |
| `DATE` for dates; `DATETIME` (or `DATETIME(3)` where the source has milliseconds) in UTC for timestamps; never `TIMESTAMP`, which ends in 2038; game-clock values (`mm:ss`) as short strings, with the numeric seconds columns used for arithmetic | [date and time types](https://dev.mysql.com/doc/refman/8.4/en/datetime.html) |
| `ENUM` only for small closed sets (`season_type`, `game_type`, `location`, `team_conf`); team stays a code; depth-chart positions use the `position` and `position_group` lookups (review D6) | [ENUM type](https://dev.mysql.com/doc/refman/8.4/en/enum.html) |
| Only primary-key columns (and the mapping tables' ID columns, review D4) are `NOT NULL`; per-column review is open (review O8) (the profile's 0.0%-empty is a snapshot live data violates); every other column is nullable, and a stat that doesn't apply stays `NULL`, never 0; strict SQL mode on | [optimizing data size](https://dev.mysql.com/doc/refman/8.4/en/data-size.html); [Kimball Design Tip #43](https://www.kimballgroup.com/2003/02/design-tip-43-dealing-with-nulls-in-the-dimensional-model/) |
| Wide tables stay as typed columns, not JSON; long text (the play description, up to 717 characters) is `TEXT` | [column count and row size limits](https://dev.mysql.com/doc/refman/8.4/en/column-count-limit.html); [JSON type](https://dev.mysql.com/doc/refman/8.4/en/json.html) |
| Column names kept exactly as nflverse spells them (snake_case) | [SQL Style Guide](https://www.sqlstyle.guide/) |

Full findings and citations behind these rules: [`research/relational-schema-best-practice-2026-11-08.md`](../research/relational-schema-best-practice-2026-11-08.md).

#### 7.2.3 What the profiling found

- **Player IDs are not all 10 characters.** 6,079 of 24,867 players carry older 9-character IDs, so the ID type is `VARCHAR(10)`, not `CHAR(10)`.
- **Weekly player stats has 150 columns.** Two are fantasy points (`fantasy_points`, `fantasy_points_ppr`), which aren't stored (ADR-0007). 36 columns are newer than nflverse's published dictionary.
- **203 weekly stat rows have no player** (about one per team-week, no name or position). They can't be keyed to a player and are left out.
- **Injuries repeat a key 4 times** (2024: a status updated twice in one week). The latest `date_modified` wins; from 2025 that column no longer exists.
- **12 roster rows have no player ID**; they are left out.
- **Snap counts identify players by Pro Football Reference ID, not GSIS.** 99.91% of rows map to a player through the PFR ID (today `player.pfr_id`; after review D4, `player_source`); 22 IDs don't, and those rows load with an empty `source_code` and are counted (review D5).
- **Depth charts:** 285 dated snapshots between 2026-03-22 and 2026-11-08, so roughly daily. 3.2% of rows have no `gsis_id` (ESPN ID present), so `gsis_id` is nullable here and `player` is joined where it exists. After review D3, D5: a foreign key to `player`; an empty `gsis_id` is filled from the ESPN ID through `player_source`, and rows still empty are counted.
- **13 play-by-play columns are empty** in both seasons profiled; their types are set from their names.
- **Season rosters mark practice squad as status `DEV`** (*inference* from the code; per D2, a practice-squad player is included only once he has a weekly stats row).
- **Validated against fresh downloads, 2026-11-10** (every season 2017–2026 of the five seasonal datasets, the three single files, the 2026 depth charts and play-by-play):
  - Every file's columns are unchanged in name and order, in every season. Injuries still has two headers: 2017–2024, and 2025 on.
  - Every observed value fits its proposed type except `kick_distance`, which had a punt of −2 yards; it is now `SMALLINT` (data dictionary, section A10).
  - Every team code in every team column has a row in `team`, except `play.side_of_field`, which also holds `50` (midfield). It gets no foreign key.
  - **1,501 players on season rosters (1,610 rows, mostly cut players) have no row in `players.csv`**, in every season since 2017. nflverse also dropped 130 players last active in 2012 from `players.csv` since 2026-11-08. Today player and game references are checked by the load and only warn (§8). Decided (owner, 2026-11-23 to 2026-11-25; not built yet): references carry foreign keys (review D3); `player` and `game` are upserted (review D2); those roster rows are excluded during transform and counted (review D5).
  - Snap counts: 225 rows (22 Pro Football Reference IDs) don't map to `player.pfr_id`, as before; after review D4–D5 they load with an empty player reference and are counted. Weekly stats still have 203 rows without a player, rosters 12, and injuries 4 repeated keys.
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
- Every column that holds a team code has a database foreign key to `team.team_abbr`, except `play.side_of_field` (which also holds `50`) and `roster.draft_club` (which uses a different nflverse vocabulary, e.g. `AZ` for Arizona vs `ARI`; dropped under review D7). `play_participant.team` joins them (review D8). A code with no row in `team` otherwise blocks the load (§8).
- Player and game references (the "Points to" column above) carry no database foreign key **today**; the load checks them and warns (§8). Decided (not built): every player and game reference gets a foreign key (review D3); `player` and `game` are upserted and keep rows absent from later files (review D2); roster rows whose player isn't in `players.csv` are excluded during transform and counted, and other rows whose player can't be identified load with an empty reference and are counted (review D5).
- MySQL checks a foreign key immediately and, by default, rejects deleting a parent row that child rows still reference ([MySQL 8.4, FOREIGN KEY constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html); [constraint differences](https://dev.mysql.com/doc/refman/8.4/en/ansi-diff-foreign-keys.html)). So `team` is loaded first and by upsert (insert new codes, update existing ones, delete none), not by delete-and-replace like the other single files. `player` and `game` follow the same rule (owner, 2026-11-24; not built yet: the code still deletes and replaces both). The new parents load before their children: `source` (seeded), `stadium` before `game`, `position_group` and `position` before `depth_chart`, `play` before `play_participant` (implementation plan §3).

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

**Rule (D10; Claude's proposal, ratified by the owner 2026-11-18):** structural checks block a load, so the previous good data stays in place; value checks load the new data and record a warning in `job_run`.

| Check | Effect |
|---|---|
| The file's header doesn't match the dataset's mapping (injuries accepts both of its headers, §7.2) | Blocks |
| A natural key repeats, or a key column is empty, after the expected cases are handled: rows §7.2.3 leaves out (weekly stats without a player, roster rows without a player ID, and, once built, roster rows whose player is not in `player`, review D5) are dropped and counted in `job_run`, and a repeated injury key keeps the latest report | Blocks |
| The row count falls sharply against the same piece's last load | Blocks |
| A player or game ID in a fact table has no row in `player` or `game` | Warns today. Decided: blocks through foreign keys (review D3); unidentifiable snap and depth-chart rows load with an empty reference and are counted (review D5); not built yet |
| A team code has no row in `team` | Blocks: the foreign key to `team.team_abbr` (D9a) rejects the load. *Owner's decision, 2026-11-09* |
| A value is out of its usual range (for example a stat correction) | Warns. **Not built yet** |
| Weekly stats or schedules older than 24 hours in season | Warns. **Not built yet** |

"Falls sharply" is implemented as a staged count below `ROW_COUNT_MIN_RATIO` × the last load's count (default 0.5; `0` disables it). The ratio has not been calibrated against real loads.

**Removed (D11):** v1.3's reconciliation of play-by-play totals against box-score stats isn't carried over; play-by-play isn't used to reconcile weekly stats (ADR-0013).

## 9. Jobs and schedule

| Job | Runs | What it does |
|---|---|---|
| `ingest` | On the in-process schedule; also on demand (`npm run ingest`) | Incremental load (§5.1) |
| `backfill` | Once, by hand (`npm run backfill`) | History load, resumable |
| `headers` | On demand | Prints each dataset's columns for mapping; no database needed |

**Schedule (D7):** one run a day at 06:00 Eastern (`PIPELINE_CRON=0 6 * * *`, `PIPELINE_TZ=America/New_York`, the scaffold's default). nflverse builds player stats nightly, so a game that ends near midnight is loaded by 06:00. No extra game-night runs.

## 10. Idempotency contract

1. Every load is idempotent (replace or upsert, review D2); re-running any piece is always safe.
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

Dropped (owner, 2026-11-18): no third-party projection or rankings data is fetched — rankings come from the app's own model (the Projections & rankings PRD). The research into nflverse `ff_rankings` and FantasyPros (`x-api-key`) is kept above for the record; Q11 is closed in the Data ETL & storage PRD.

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

**Scheduler (D12; Claude's proposal, ratified by the owner 2026-11-18):** node-cron, as the scaffold already uses: it is maintained, ships its own types and runs on wall-clock time in a named zone. The earlier version of ADR-0008 cited node-schedule, whose last release is about three years old.

## 13. Sequencing

1. Run the backend setup script ([`code-repo-kit/init-runpure-backend.ps1`](../code-repo-kit/init-runpure-backend.ps1)): repo, Express layers, GraphQL endpoint with the token check, pipeline module with the D6 switch dates, ledger, scheduler, backfill and headers commands, local MySQL. Then run `npm run spike`, the Yoga-on-Express-5 check that ADR-0017 makes the first build step.
2. Apply `sql/0001_pipeline_tables.sql` and `sql/0002_users.sql` by hand (ADR-0011).
3. Map each Phase 1 dataset (D2; tables in §7.2): `headers` → `CREATE TABLE` → mapping → `npm run ingest -- --dataset <name>`.
4. Add the D10 checks to the load (§8).
5. Run the backfill.
6. Build the Player list, Player card and schedule queries on the loaded tables, as GraphQL fields (ADR-0017).
7. Confirm the D6 switch dates and the 06:00 Eastern schedule (D7) against nflverse's publishing once the first season rolls over.
8. Deployment phase: choose the host (D13) and backup and recovery (D16).
9. Schema principles review decisions (review D1–D8): apply `sql/0014`, then the [migration script](../design/reviews/2026-11-24-schema-principles-review-migration.sql) as `sql/0015`, with the matching backend changes, following the [implementation plan](../design/reviews/2026-11-25-schema-review-implementation-plan.md).

---

## Appendix A. Data dictionary

Every column of every ingested file, profiled 2026-11-08 (teams and depth charts 2026-11-09 UTC), with its observed type, empty-value share, range and proposed MySQL type: [`ff-data-etl-storage-spec-data-dictionary.md`](ff-data-etl-storage-spec-data-dictionary.md), sections A1–A10.
