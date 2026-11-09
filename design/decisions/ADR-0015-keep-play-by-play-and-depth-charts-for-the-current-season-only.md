# ADR-0015: Keep play-by-play and depth charts for the current season only

**Status:** Accepted
**Date:** 2026-11-06
**Deciders:** William Sanchez

## Context

[ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md) backfills 2017–2026 once for every nflverse source. All data is stored in MySQL ([ADR-0014](ADR-0014-store-all-pipeline-data-in-mysql-with-no-bucket.md)), and the only verified free MySQL host (Aiven) allows 1 GB.

Measured sizes of nflverse's published CSV files, 2017–2026 (2026 to date), taken from the release download URLs on 2026-11-06:
- **Play-by-play:** about 914 MB in total, 94–100 MB per full season. About two-thirds of all the data.
- **Depth charts:** about 151 MB in total. About 3.4 MB per season through 2024; since nflverse began publishing dated depth charts in 2025, 53 MB for 2025 and 71 MB for 2026 so far.
- **Everything else** (weekly player stats, rosters, snap counts, injuries, schedules, players): about 270 MB, or about 420 MB including weekly rosters.

File sizes are not database sizes; the size in MySQL depends on column types and indexes.

## Decision

**Keep play-by-play and depth charts for the current season only.** Past seasons of these two datasets are not backfilled or kept. Every other nflverse dataset keeps the 2017–2026 history from ADR-0006.

## Options Considered

### Option A — Current season only for play-by-play and depth charts (chosen)
| Dimension | Assessment |
|---|---|
| Stored size of these two datasets | About one season: roughly 100 MB of play-by-play plus one season of depth charts |
| Past seasons' stats | From nflverse's weekly player stats, not play-by-play |
| Past depth charts | Not kept |
| Fits a 1 GB free tier | Plausibly, alongside the other datasets; not yet measured in MySQL |

### Option B — Full 2017–2026 history, as in ADR-0006 (not chosen)
Every dataset has the same history. Play-by-play alone is about 914 MB as CSV, close to the 1 GB free limit before anything else is stored, and dated depth charts grow by tens of MB each season.

## Consequences

**Easier:** the largest and fastest-growing datasets stay at about one season's size; the backfill is much smaller.
**Harder / to revisit:**
- Stats for past seasons come only from nflverse's weekly player stats; anything that would need play-by-play for a past season isn't available.
- Past seasons' depth charts aren't available.
- When a new season starts, the previous season's play-by-play and depth-chart rows are removed.

## Relationship to other decisions

- **Narrows** [ADR-0006](ADR-0006-backfill-2017-2026-once-then-load-only-data-that-can-still-change.md): the 2017–2026 backfill excludes play-by-play and depth charts, which are loaded for the current season only. ADR-0006's load strategy is otherwise unchanged.
- **Follows from** [ADR-0014](ADR-0014-store-all-pipeline-data-in-mysql-with-no-bucket.md) (all data in MySQL).

Sources: [nflverse-data releases](https://github.com/nflverse/nflverse-data/releases), [nflreadr changelog (dated depth charts from 2025)](https://nflverse.r-universe.dev/nflreadr/NEWS.txt).
