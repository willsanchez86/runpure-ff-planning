# ADR-0025: Give stadiums and depth-chart positions their own tables

**Status:** Accepted
**Date:** 2026-11-25
**Revised:** 2026-11-27, in place, at the owner's direction (not finalized): rewritten to stand on its own, without references to the review's numbering; the decision is unchanged.
**Deciders:** William Sanchez

## Context

- **Games** carry a stadium ID and a stadium name. In nflverse's schedule, 24 of 67 stadium IDs have carried more than one name over the years (naming rights), and play-by-play's names are current where the schedule's are outdated (58 of 285 games in 2025).
- **Depth charts** repeat ESPN's formation name (for example "3WR 1TE") and position name and abbreviation ("Quarterback", "QB") on every row: about 550,000 rows a season. Each formation and each position has its own numeric ID; 9 defensive positions appear in both defensive formations.
- **Coaches and referees** appear on games as names only, with no IDs.
- **Teams:** nflverse's team file has one row per team code (36). Its `team_id` identifies the franchise and repeats across relocated codes (OAK and LV share `2520`).

## Decision

**Anything the source identifies with its own unique ID gets its own table: stadiums and depth-chart positions do; teams keep their team code as the key.**

- **`stadium`**, keyed by `stadium_id`, holds each stadium's current name. `game.stadium_id` has a foreign key to it, and `game.stadium` keeps the name the game was played under, taken from play-by-play where available.
- **`position_group`**, keyed by `pos_grp_id`, holds each depth-chart formation's name; **`position`**, keyed by `pos_id`, holds each position's name and abbreviation. Depth-chart rows keep the formation ID, slot, rank and position ID, with a foreign key to each table, and no longer repeat the names. No table links positions to formations: the depth-chart rows already record which positions appear in which formation.
- **Coaches and referees** stay as names on `game`, since the source gives them no IDs.
- **`team`** keeps the team code (`team_abbr`) as its key for now; `team_id` is the franchise identity used to group a franchise's codes.

## Options Considered

### Option A — Own tables for things with source IDs (chosen)
| Dimension | Assessment |
|---|---|
| Duplication | Each name stored once |
| History | A game keeps the stadium name it was played under |
| Load | Lookup rows are written before the rows that refer to them |

### Option B — Teams keyed by `team_id`, split into a franchise table and a code table
Deferred by the project owner ("for now").

### Option C — A table of formation–position pairs
Rejected by the project owner as redundant.

### Option D — `position` keyed by position and formation together
Not chosen: a position's name depends on the position alone, so the name would repeat for every formation (fails second normal form).

### Option E — Coach and referee tables
Not chosen: the source gives them no IDs.

## Consequences

**Easier:** stadium and position names maintained in one place; a franchise's history grouped by `team_id`.
**Harder / to revisit:** the database doesn't check that a depth-chart position belongs to its formation; stadium names for games before 2026 keep the schedule's names, since play-by-play starts in 2026 ([ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md)). Revisit the team key if per-franchise data is needed.

## Relationship to other decisions

- **Consistent with** [ADR-0022](ADR-0022-enforce-a-foreign-key-on-every-player-and-game-reference.md), [ADR-0026](ADR-0026-keep-descriptor-and-duplicate-columns-off-fact-tables.md) and [ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md).
