# ADR-0026: Keep descriptor and duplicate columns off fact tables

**Status:** Accepted
**Date:** 2026-11-24 and 2026-11-25
**Revised:** 2026-11-27, in place, at the owner's direction (not finalized): rewritten to stand on its own, without references to the review's numbering; the decision is unchanged.
**Deciders:** William Sanchez

## Context

The fact tables (one row per event or measurement: a player's week, a roster spot, an injury report, a game's snaps, a play) repeat descriptions that belong to the player or the game: names and headshots, birth date and college, and game details on every play. These copies can disagree with the player or game row and with each other.

Checked on 2026-11-25 against the live database and nflverse's 2025 files:
- every player named on these rows exists in `player` with a name, except a few values held only on fact rows (5 short names, about 25 colleges, 5 football names);
- 22 game columns on `play` are identical to `game` in all 285 games of 2025, and 4 more game facts exist only on `play`;
- 4 roster columns duplicate `player` columns (rookie year, draft pick, entry year, draft team).

## Decision

**Fact tables hold only keys, measurements and facts of their own row; descriptions of players and games are stored once, on `player` and `game`.** Values that only a fact row holds are copied to `player` or `game` before the column is removed.

| Table | Removed | Kept on purpose |
|---|---|---|
| `player_week_stat` | `player_name`, `player_display_name`, `headshot_url` | `position`, `position_group`: the position played that week |
| `roster` | `full_name`, `first_name`, `last_name`, `football_name`, `birth_date`, `college`; duplicates `rookie_year`, `entry_year`, `draft_number`, `draft_club` | 12 facts of that season: `position`, `depth_chart_position`, `jersey_number`, `status`, `status_description_abbr`, `years_exp`, `ngs_position`, `height`, `weight`, `headshot_url`, `week`, `game_type` |
| `injury_report` | `full_name`, `first_name`, `last_name` | `position` on that report |
| `snap_count` | `pfr_game_id`, `season`, `week`, `game_type` (all repeat `game`) | `player` (the only name for unidentifiable rows), `position` that game |
| `game` | `away_qb_name`, `home_qb_name` | Gains `start_time`, `weather`, `home_opening_kickoff` from play-by-play; `stadium` takes play-by-play's name where available |
| `play` | 28 game-level columns (`old_game_id`, `home_team`, `away_team`, `season`, `week`, `game_date`, `season_type`, the stadium, weather, coach, score, result and betting-line columns, `start_time`, `home_opening_kickoff`, `nfl_api_id`); 48 player-name columns | The 18 drive columns (a recorded exception: no drive table) |

## Options Considered

### Option A — Descriptions on `player` and `game` only (chosen)
| Dimension | Assessment |
|---|---|
| Consistency | One copy of each name and game fact |
| Size | `play` from 372 to 296 columns; `roster` from 36 to 15 |
| Queries | Names come through a join to `player` or `game` |

### Option B — Keep the descriptions on fact rows
Not chosen by the project owner (2026-11-24).

### Option C — A separate drive table for the 18 drive columns
Not chosen by the project owner, who judged it too granular; a drive has no ID of its own.

## Consequences

**Binding constraints:** loads that fill copied values on `player` or `game` keep a stored value when the file's value is empty.

**Easier:** one place to correct a name or game fact; smaller fact tables.
**Harder / to revisit:** API queries join `player` for names; play-by-play's short name form (for example `C.Jordan`) isn't kept where `player.short_name` is empty; the game facts taken from play-by-play exist only from 2026 ([ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md)). Revisit the drive exception if drive-level analysis is built.

## Relationship to other decisions

- **Consistent with** [ADR-0025](ADR-0025-give-stadiums-and-depth-chart-positions-their-own-tables.md), [ADR-0027](ADR-0027-keep-play-by-play-numbered-player-columns-with-a-foreign-key-on-each-player-column.md) and [ADR-0007](ADR-0007-calculate-fantasy-points-in-the-app-from-stored-stats.md) (fantasy points are calculated from the stats kept).
