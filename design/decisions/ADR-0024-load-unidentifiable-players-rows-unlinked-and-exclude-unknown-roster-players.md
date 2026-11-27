# ADR-0024: Load unidentifiable players' rows unlinked and exclude unknown roster players

**Status:** Accepted
**Date:** 2026-11-25
**Revised:** 2026-11-27, in place, at the owner's direction (not finalized): rewritten to stand on its own, without references to the review's numbering; the decision is unchanged.
**Deciders:** William Sanchez

## Context

Some nflverse rows name a player who can't be matched to the app's `player` table, which is filled from nflverse's player file:
- **Snap counts** name players by Pro Football Reference ID. In the 2025 file, 54 rows (6 IDs) match no player: some players exist but have no Pro Football Reference ID recorded; others appear in no nflverse player file at all.
- **Depth charts** carry ESPN's ID, plus the NFL GSIS ID when nflverse knows it. In the 2025 file, 5,577 rows lack a GSIS ID; 393 of them match a player by ESPN ID.
- **Season rosters** list 858 rows (806 players, 2022–2026, live database 2026-11-25) for players missing from the player file. In 2025 these are mostly waived players, plus practice-squad and reserve players: no stats, no plays, no fantasy-platform IDs.
- **Weekly stats** have 203 rows with no player ID at all (2017–2026 profile).

Other ways of matching these rows were tested on 2026-11-25: the roster's own ID columns, a third-party ID crosswalk (DynastyProcess), and matching by name. Each fails in real cases; for example, 303 depth-chart rows would be matched by name to the wrong player.

## Decision

**A snap-count or depth-chart row whose player can't be identified is still loaded, with its player reference left empty and its own ID and name kept; roster rows for players missing from the player file are left out.**

- Rows are linked to a player only by an exact ID match: a depth-chart row with no GSIS ID gets one from its ESPN ID through `player_source` ([ADR-0023](ADR-0023-store-player-and-game-ids-from-other-providers-in-mapping-tables.md)). No matching by name, no third-party crosswalk.
- Each load counts the unlinked rows; rows loaded earlier are linked automatically once the matching ID becomes known.
- Roster rows whose player is not in the player file are dropped during the load and counted. No placeholder players are created.
- Weekly stat rows with no player ID are dropped and counted.

## Options Considered

### Option A — Load unlinked; exclude unknown roster players (chosen)
| Dimension | Assessment |
|---|---|
| Data kept | Every snap and depth-chart row, with its source ID and name |
| Accuracy | No guessed links |
| Roster | About 150–200 rows a season of players who never played are left out |

### Option B — An "unknown player" row that unlinked rows point to
Not chosen by the project owner.

### Option C — Placeholder players built from the roster rows
Not chosen by the project owner, who asked what such rows would be for and chose to leave them out.

### Option D — Skip unlinked snap and depth-chart rows
Not chosen by the project owner.

## Consequences

**Binding constraints:** the player file loads before rosters; every load reports its unlinked and excluded counts.

**Easier:** nothing is linked to the wrong player; player lists contain no fake players.
**Harder / to revisit:** queries must allow an empty player on snap counts and depth charts; a roster row excluded for a past season returns only if that season's roster file is republished after the player appears. Each known case is listed in the schema principles review's edge-case register for a later fix.

## Relationship to other decisions

- **Depends on** [ADR-0023](ADR-0023-store-player-and-game-ids-from-other-providers-in-mapping-tables.md).
- **Consistent with** [ADR-0022](ADR-0022-enforce-a-foreign-key-on-every-player-and-game-reference.md) (an empty reference passes the foreign key) and [ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md) (later loads link rows when the ID becomes known).
