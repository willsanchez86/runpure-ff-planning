# ADR-0024: Load unidentifiable players' rows unlinked and exclude unknown roster players

**Status:** Accepted
**Date:** 2026-11-25 · recorded 2026-11-25
**Deciders:** William Sanchez

## Context

Some rows name a player that can't be tied to a `player` row. In nflverse's 2025 files: 54 snap-count rows (6 PFR IDs) and 5,577 depth-chart rows with no GSIS ID, of which 393 resolve by ESPN ID through `players.csv`. The other links tested were the roster's own ID columns, a third-party crosswalk (DynastyProcess) and name matching; each fails in at least one real case: 303 name matches contradict the ESPN ID. On the live database, 858 roster rows (806 players, 2022–2026) name players missing from `players.csv`. In 2025 they are mostly waived players, plus practice-squad and reserve ones, with no stats and no fantasy-platform IDs. 203 weekly-stat rows (2017–2026 profile) have no player ID ([review](../reviews/2026-11-24-schema-principles-review.md) §5.3, §5.4, Appendix C).

## Decision

**A snap-count or depth-chart row whose player can't be identified still loads, with an empty player reference, keeping the source's own key and name; roster rows whose player is not in `players.csv` are excluded.** Each load counts the unlinked rows. A row is linked only by an exact ID match through `player_source` ([ADR-0023](ADR-0023-store-player-and-game-ids-from-other-providers-in-mapping-tables.md)): a depth-chart row with no GSIS ID gets one from its ESPN ID. Nothing is matched by name or through a third-party crosswalk. Roster rows for players missing from `players.csv` are excluded in the transform step and counted, with no placeholder players. Weekly stat rows with no player ID keep being dropped and counted.

## Options Considered

### Option A — Unlinked rows load with an empty reference; unknown roster players excluded (chosen)
| Dimension | Assessment |
|---|---|
| Data kept | Every snap and depth-chart row, with its source key and name |
| Accuracy | No guessed links; a later mapping links the row |
| Roster | About 150–200 rows a season of cut players are dropped: an approved exception to [review](../reviews/2026-11-24-schema-principles-review.md) R16 (keep the fact, add the missing dimension member) |

### Option B — An "unknown player" row in `player`
Not chosen by the project owner.

### Option C — Placeholder `player` rows built from the roster rows
Claude's first recommendation (R16); not chosen by the project owner, who asked what such rows would be for and chose to exclude them.

### Option D — Skip unlinked snap and depth-chart rows
Not chosen by the project owner.

## Consequences

**Binding constraints:** players load before rosters; unlinked rows are re-linked after each run when a mapping appears ([implementation plan](../reviews/2026-11-25-schema-review-implementation-plan.md) §2). Every case is listed in the [review](../reviews/2026-11-24-schema-principles-review.md) §5.4 for its own later fix.

**Easier:** nothing wrong is linked; no fake players in lists.
**Harder / to revisit:** queries must allow an empty player reference on snap counts and depth charts. A past roster season keeps its gap even if `players.csv` later lists the player, because past rosters reload only when their file changes. Revisit the exclusion if roster history for cut players becomes a product need.

## Relationship to other decisions

- Depends on [ADR-0023](ADR-0023-store-player-and-game-ids-from-other-providers-in-mapping-tables.md).
- Makes possible [ADR-0022](ADR-0022-enforce-a-foreign-key-on-every-player-and-game-reference.md) (foreign keys accept an empty reference; excluded roster rows never reach the table).
- Consistent with [ADR-0006](ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md) (past-season files reload when their version changes).
