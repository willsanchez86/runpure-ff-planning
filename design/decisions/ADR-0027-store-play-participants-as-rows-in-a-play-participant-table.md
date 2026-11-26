# ADR-0027: Store play participants as rows in a play_participant table

**Status:** Accepted
**Date:** 2026-11-25 · recorded 2026-11-25
**Deciders:** William Sanchez

## Context

`play` stores several players in one role as numbered column slots: 10 roles, 60 columns (for example `assist_tackle_1_player_id` to `_4_`, each with a name and a team). A play with fewer players leaves slots empty; a fifth assisting tackler has no slot; "every play this player was in" needs 22 player columns checked. Example (2025, ARI at NO, play 3024): a split sack fills six slot columns for two players ([review](../reviews/2026-11-24-schema-principles-review.md) W1, Appendix A).

## Decision

**`play_participant` replaces `play`'s 60 numbered slot columns: one row per player per role per play.** Key `(game_id, play_id, role, seq)`; columns `player_id`, `team`, `yards` (fumble recoveries); foreign keys to `play`, `player` and `team`. Mapping from each slot column: the [review](../reviews/2026-11-24-schema-principles-review.md) Appendix A.

## Options Considered

### Option A — `play_participant` rows (chosen)
| Dimension | Assessment |
|---|---|
| Structure | Kimball's bridge for a many-to-many between a fact and a dimension ([review](../reviews/2026-11-24-schema-principles-review.md) R15) |
| Queries | "Plays this player was in" is one filter |
| Foreign keys | One on `player_id` instead of 22 |
| Load | The play load writes two tables; deleting a play deletes its participants |

### Option B — Keep the numbered slot columns
Not chosen by the project owner.

## Consequences

**Binding constraints:** `play_participant` rows go with their play (`ON DELETE CASCADE`, build detail), so the current-season play table can still be replaced whole ([ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md)).

**Easier:** no cap on participants; simpler player queries.
**Harder / to revisit:** play data spans two tables; the load emits participant rows from the slot columns.

## Relationship to other decisions

- Depends on [ADR-0022](ADR-0022-enforce-a-foreign-key-on-every-player-and-game-reference.md).
- Consistent with [ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md) and [ADR-0026](ADR-0026-keep-descriptor-and-duplicate-columns-off-fact-tables.md).

## Sources

- [Kimball: multivalued dimensions and bridge tables](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/multivalued-dimension-bridge-table) — quoted in the [review](../reviews/2026-11-24-schema-principles-review.md) §1.2.
