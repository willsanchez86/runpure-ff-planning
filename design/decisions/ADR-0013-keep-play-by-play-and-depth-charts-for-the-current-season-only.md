# ADR-0013: Keep play-by-play and depth charts for the current season only

**Status:** Accepted
**Date:** 2026-11-06
**Revised:** 2026-11-08, in place, at the owner's direction (not finalized): hosting references removed; purpose of play-by-play and source of depth charts stated. 2026-11-09: the size of the other datasets corrected (the earlier 270 MB figure didn't match the files) and the list completed.
**Deciders:** William Sanchez

## Context

[ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md) backfills 2017–2026 once for every nflverse source. All data is stored in MySQL ([ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md)). Hosting is a deployment-phase decision and does not bear on this one.

Measured sizes of nflverse's published CSV files, 2017–2026 (2026 to date), taken from the release download URLs on 2026-11-06:
- **Play-by-play:** about 914 MB in total, 94–100 MB per full season. About two-thirds of all the data.
- **Depth charts:** about 151 MB in total. About 3.4 MB per season through 2024; since nflverse began publishing dated depth charts in 2025, 53 MB for 2025 and 71 MB for 2026 so far.
- **Everything else Phase 1 loads** (weekly player stats about 77 MB, season rosters about 10 MB, snap counts about 22 MB, injuries about 7 MB, schedules about 2 MB, players about 7 MB, weekly team stats about 2 MB, teams under 0.1 MB): about 127 MB, re-measured from the downloaded files. Weekly rosters (about 146 MB) aren't loaded.

File sizes are not database sizes; the estimated size in MySQL is in the ETL spec §7.2.4.

Both datasets are published by nflverse, the source Phase 1 uses: play-by-play at `pbp/play_by_play_<season>.csv.gz` and depth charts at `depth_charts/depth_charts_<season>.csv`. Depth charts come from ESPN since 2025 and are dated snapshots, roughly daily (285 snapshots between 2026-03-22 and 2026-11-08).

## Decision

**Keep play-by-play and depth charts for the current season only.** Past seasons of these two datasets are not backfilled or kept. Every other nflverse dataset keeps the 2017–2026 history from ADR-0006.

Play-by-play is loaded for the current season to enable analytics later. It is not used to reconcile weekly stats, which nflverse already computes from play-by-play.

## Options Considered

### Option A — Current season only for play-by-play and depth charts (chosen)
| Dimension | Assessment |
|---|---|
| Stored size of these two datasets | About one season: roughly 100 MB of play-by-play CSV plus one season of depth charts |
| Past seasons' stats | From nflverse's weekly player stats, not play-by-play |
| Past depth charts | Not kept |

### Option B — Full 2017–2026 history, as in ADR-0006 (not chosen)
Every dataset has the same history. Play-by-play alone is about 914 MB as CSV, and dated depth charts grow by tens of MB each season.

## Consequences

**Easier:** the largest and fastest-growing datasets stay at about one season's size; the backfill is much smaller.
**Harder / to revisit:**
- Stats for past seasons come only from nflverse's weekly player stats; analytics that need play-by-play for a past season aren't available.
- Past seasons' depth charts aren't available.
- When a new season starts, the previous season's play-by-play and depth-chart rows are removed.

## Relationship to other decisions

- **Narrows** [ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md): the 2017–2026 backfill excludes play-by-play and depth charts, which are loaded for the current season only. ADR-0006's load strategy is otherwise unchanged.
- **Follows from** [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) (all data in MySQL).

Sources: [nflverse-data releases](https://github.com/nflverse/nflverse-data/releases), [nflreadr changelog (dated depth charts from 2025)](https://nflverse.r-universe.dev/nflreadr/NEWS.txt), [nflreadr depth chart dictionary](https://ftp.fau.de/cran/web/packages/nflreadr/vignettes/dictionary_depth_charts.html).
