# ADR-0025: Give stadiums and depth-chart positions their own tables

**Status:** Accepted
**Date:** 2026-11-25 · recorded 2026-11-25
**Deciders:** William Sanchez

## Context

`game` holds a stadium ID and name; `depth_chart` repeats ESPN's position-group and position names on every row (about 550,000 a season). Coaches and referees appear on `game` as names only. The team file has 36 rows, one per team code. Its `team_id` identifies the franchise and repeats across relocated codes (OAK/LV, SD/LAC, STL/LA/LAR). In games.csv, 24 of 67 stadium IDs have carried more than one name, and play-by-play's names are current where games.csv's are outdated (58 of 285 games in 2025). Nine depth-chart positions belong to both defensive groups ([review](../reviews/2026-11-24-schema-principles-review.md) §5.1, Appendix B).

## Decision

**A thing gets its own table where the source gives it a unique key: stadiums and depth-chart positions do; teams keep `team_abbr` as their key.** `stadium` (key `stadium_id`) holds each stadium's current name; `game.stadium_id` has a foreign key to it, and `game.stadium` keeps the name the game was played under. `position_group` (key `pos_grp_id`) and `position` (key `pos_id`) hold the depth-chart names; `depth_chart` keeps `pos_grp_id`, `pos_slot`, `pos_rank` and `pos_id`, with a foreign key to each table. There is no table linking positions to groups. Coaches and referees, which have no IDs in the source, stay as names on `game`. `team` keeps `team_abbr` as its key for now; `team_id` is the franchise identity used to group a franchise's codes.

## Options Considered

### Option A — Tables for keyed things only (chosen)
| Dimension | Assessment |
|---|---|
| Normalization | Each name stored once ([review](../reviews/2026-11-24-schema-principles-review.md) R11, R12) |
| History | A game keeps the stadium name it was played under |
| Load | Lookups fill before the rows that reference them |

### Option B — `team` keyed by `team_id`, split into a franchise table and a code table
Considered and deferred by the project owner ("for now just keep `team_abbr`").

### Option C — A bridge table of group–position pairs
Rejected by the project owner as redundant: the depth-chart rows already record which positions appear in which group.

### Option D — `position` keyed by `(pos_id, pos_grp_id)`
Not chosen: it fails second normal form, since a position's name depends on `pos_id` alone ([review](../reviews/2026-11-24-schema-principles-review.md) R10).

### Option E — Coach and referee tables
Not chosen: the source gives them no IDs, which the owner's rule requires.

## Consequences

**Easier:** stadium and position names maintained once; a franchise's codes grouped by `team_id`.
**Harder / to revisit:** nothing in the database checks that a depth-chart position belongs to its group. `game.stadium` for 2022–2025 keeps games.csv's names, because play-by-play is kept for the current season only ([ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md)). Revisit the team key if per-franchise attributes are needed.

## Relationship to other decisions

- Consistent with [ADR-0022](ADR-0022-enforce-a-foreign-key-on-every-player-and-game-reference.md) and [ADR-0026](ADR-0026-keep-descriptor-and-duplicate-columns-off-fact-tables.md).
- Consistent with [ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md) (current-season play-by-play and depth charts).
