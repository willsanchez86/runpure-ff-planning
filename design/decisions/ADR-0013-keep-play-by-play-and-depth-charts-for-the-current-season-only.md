# ADR-0013: Record play-by-play and depth charts from the 2026 season onward

**Status:** Accepted
**Date:** 2026-11-06 · rewritten 2026-11-27
**Revised:** 2026-11-08, 2026-11-09 and 2026-11-10, in place (hosting references removed; sizes corrected and re-measured). 2026-11-27, in place, at the owner's direction (not finalized): the earlier text, "keep play-by-play and depth charts for the current season only … past seasons are not backfilled or kept", recorded the owner's decision wrongly. The owner decided where recording *starts*, not that earlier seasons are removed later.
**Implementation started:** 2026-11-09 (added by Claude on 2026-11-27 at the owner's direction: first implemented in the backend's initial commit d6d28ce, 2026-11-09)
**Deciders:** William Sanchez

## Context

nflverse publishes play-by-play (one row per play, about 49,000 plays and 94–100 MB of CSV per season) and depth charts (dated snapshots from ESPN since 2025, roughly daily: 53 MB for 2025, 71 MB for 2026 to date). Together they are about two-thirds of all the data nflverse publishes for the seasons this app covers. Measured from the release files on 2026-11-06 and 2026-11-10.

The other nflverse datasets (weekly player and team stats, rosters, injuries, snap counts, schedules, players, teams) are backfilled from 2022 ([ADR-0006](ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md)). Play-by-play is wanted for later analytics, not to recompute weekly stats, which nflverse already derives from it.

## Decision

**Start recording play-by-play and depth charts with the 2026 season, with no backfill of earlier seasons, and keep every season recorded from then on.**

- Seasons before 2026 of these two datasets are not loaded.
- From 2026 on, each season's rows stay in the database after the season ends; nothing removes them at a season change.
- These two datasets are loaded like every other table: by upsert, with past seasons version-checked daily and reloaded when nflverse republishes them, and rows removed only by the quarterly reconciliation of rows nflverse itself removed ([ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md)).

## Options Considered

### Option A — Record from 2026 on, no backfill, keep every season (chosen)
| Dimension | Assessment |
|---|---|
| Backfill size | None for these two datasets (play-by-play alone is about 914 MB of CSV for 2017–2026) |
| History | Builds from 2026 forward; nothing recorded is lost |
| Growth | About 100 MB of play-by-play CSV and 50–70 MB of depth charts a season |

### Option B — Backfill these two datasets from 2022 like the others
Not chosen by the project owner: the backfill would be several times larger for data not yet used.

### Option C — Keep only the current season, removing the previous one at each season change
The earlier, mistaken record of this decision. Not the owner's decision.

## Consequences

**Easier:** no large backfill; the play and depth-chart history grows on its own.
**Harder / to revisit:** analytics needing play-by-play or depth charts before 2026 aren't possible without a backfill later; storage grows by one season of each per year. Revisit if a feature needs earlier seasons.

## Relationship to other decisions

- **Narrows** [ADR-0006](ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md): its 2022 backfill excludes these two datasets.
- **Depends on** [ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md) (upsert loads, quarterly reconciliation) and [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) (MySQL is the only store).

Sources: [nflverse-data releases](https://github.com/nflverse/nflverse-data/releases), [nflreadr changelog (dated depth charts from 2025)](https://nflverse.r-universe.dev/nflreadr/NEWS.txt).
