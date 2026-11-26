# ADR-0026: Keep descriptor and duplicate columns off fact tables

**Status:** Accepted
**Date:** 2026-11-24 and 2026-11-25 · recorded 2026-11-25
**Deciders:** William Sanchez

## Context

The fact tables repeat descriptions of players and games: names and headshots on weekly stats, injuries and play-by-play (48 name columns on `play`); names, birth date, college and four columns duplicating `player` on rosters; game facts on snap counts; and 28 game-level columns on every play. Data checks (2026-11-25) showed each dropped value is held on `player` or `game`, or can be copied there first. The 22 game columns on `play` matched `game` in all 285 games of 2025, and every named player exists in `player`. `play`'s 18 drive columns repeat on every play of a drive; a drive has no standalone ID, only `(game_id, fixed_drive)` ([review](../reviews/2026-11-24-schema-principles-review.md) §5.3, Appendix B).

## Decision

**A fact table holds keys, measures and facts of its own grain; descriptions of players and games live on `player` and `game`.** Values only a fact row holds are copied to `player` or `game` before the column is dropped. Per table:
- `player_week_stat` drops its 3 name and headshot columns and keeps the week's `position` and `position_group`.
- `roster` keeps 15 columns (its key plus 12 per-season facts) and drops names, birth date, college and 4 duplicates of `player`.
- `injury_report` drops its 3 name columns.
- `snap_count` drops 4 columns that repeat `game`, and keeps `player` and `position`.
- `game` drops its 2 QB name columns and gains `start_time`, `weather` and `home_opening_kickoff` from play-by-play, whose stadium name also replaces games.csv's outdated one.
- `play` drops 28 game-level columns and 26 player names.

Recorded exception: `play`'s 18 drive columns stay; there is no drive table. Column lists: the [migration script](../reviews/2026-11-24-schema-principles-review-migration.sql).

## Options Considered

### Option A — Descriptors and duplicates off fact tables (chosen)
| Dimension | Assessment |
|---|---|
| Normalization | Meets 2NF and 3NF except the recorded drive exception ([review](../reviews/2026-11-24-schema-principles-review.md) R10–R13, R31) |
| Size | `play` from 372 to 258 columns; `roster` from 36 to 15 |
| Queries | Names come through a join to `player` or `game` |

### Option B — Keep the descriptor columns
Not chosen by the project owner (2026-11-24).

### Option C — A `drive` table keyed `(game_id, fixed_drive)`
Not chosen by the project owner, who judged it too granular.

## Consequences

**Binding constraints:** loads that fill copied values must not overwrite them with an empty file value ([implementation plan](../reviews/2026-11-25-schema-review-implementation-plan.md) §2).

**Easier:** one copy of each name; smaller fact tables.
**Harder / to revisit:** the API reads names through joins; play-by-play's short name form (`C.Jordan`) is not kept where `player.short_name` is empty. `game.start_time`, `weather` and `home_opening_kickoff` stay empty for 2022–2025 ([ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md)). Revisit the drive exception if drive-level analysis is built.

## Relationship to other decisions

- Consistent with [ADR-0025](ADR-0025-give-stadiums-and-depth-chart-positions-their-own-tables.md) and [ADR-0027](ADR-0027-store-play-participants-as-rows-in-a-play-participant-table.md).
- Consistent with [ADR-0007](ADR-0007-calculate-fantasy-points-in-the-app-from-stored-stats.md) (stats stored; fantasy points calculated in the app).
