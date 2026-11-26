# ADR-0023: Store player and game IDs from other providers in mapping tables

**Status:** Accepted
**Date:** 2026-11-25 · recorded 2026-11-25
**Deciders:** William Sanchez

## Context

nflverse's files carry each player's ID at other providers as columns: 7 on `players.csv` (`esb_id`, `nfl_id`, `pfr_id`, `pff_id`, `otc_id`, `espn_id`, `smart_id`) and 11 on the season rosters, including Sleeper, Yahoo and Sportradar IDs found nowhere else. `nfl_id` and the roster's `gsis_it_id` are one ID system under two names: equal for all 2,979 players in both 2025 files (checked 2026-11-25). Games likewise carry 7 provider IDs, and play-by-play adds `nfl_api_id`. Snap counts identify players only by Pro Football Reference ID. Between `players.csv` and the 2025 roster file, 6 of about 15,500 shared player IDs differ; 3 are provably roster errors. In the schedule, 8 unplayed 2026 games share a legacy `old_game_id` with another game ([review](../reviews/2026-11-24-schema-principles-review.md) §5.2–§5.4, Appendix C).

## Decision

**A player's or game's ID at another provider is a row in a mapping table, not a column.** `source` lists the providers, keyed by `source_code` (17: `pfr`, `espn`, `sleeper`, `yahoo`, `sportradar`, `rotowire`, `fantasy_data`, `pff`, `otc`, `esb`, `smart`, `nfl`, `gsis`, `nfl_detail`, `nfl_old`, `ftn`, `nfl_api`). `player_source (gsis_id, source_code, source_player_id)` has foreign keys to `player.gsis_id` and `source.source_code`. Each player has one ID per provider. Where `players.csv` and the roster disagree, `players.csv` wins, and the conflict is logged, not stored. `game_source (game_id, source_code, source_game_id)` follows the same pattern; an ID shared by two games is skipped and logged. Snap counts keep `pfr_player_id` as their player reference, with a foreign key through `player_source`; queries join through it.

Build details accepted by the owner on 2026-11-25: `player_source` is keyed `(gsis_id, source_code)` with `UNIQUE (source_code, source_player_id)`; `snap_count` gains `source_code`, holding `pfr`, or left empty when the PFR ID is unknown, and the foreign key is `(source_code, pfr_player_id)` → `player_source`. Column-by-column definition: the [migration script](../reviews/2026-11-24-schema-principles-review-migration.sql).

## Options Considered

### Option A — Mapping tables keyed by `source_code` (chosen)
| Dimension | Assessment |
|---|---|
| Structure | Provider is a value, not a column name; one constraint enforces one-player-per-ID for every provider ([review](../reviews/2026-11-24-schema-principles-review.md) R33–R35, Kimball Design Tip #147, Codd rule 1) |
| Growth | A new provider is a row in `source`, not a schema change |
| Upsert | Two unique keys on `player_source`, so it is not loaded with `ON DUPLICATE KEY UPDATE` (R32) |
| Queries | A join to reach an ID |

### Option B — Provider IDs as columns on `player` (and `game`)
Not chosen by the project owner, who called the mapping table the commonly accepted pattern.

### Option C — `source` keyed by a numeric `source_id`
Not chosen by the project owner, who keyed `source` by `source_code`.

### Option D — Snap counts store the `gsis_id` looked up at load
Claude's recommendation; not chosen by the project owner, who chose to keep the PFR ID and join through `player_source`.

### Option E — Several IDs per player per provider
Not chosen by the project owner: one ID per provider, `players.csv` winning conflicts.

## Consequences

**Binding constraints:** the loads write provider IDs as rows; conflicts and shared IDs are logged, never stored. A changed PFR ID first unlinks the snap rows pointing at the old one ([implementation plan](../reviews/2026-11-25-schema-review-implementation-plan.md) §2).

**Easier:** one place to find a player by any provider's ID (league imports); a provider ID can't silently belong to two players.
**Harder / to revisit:** one rejected case: ESPN's depth chart uses Chris Manhertz's roster ESPN ID, which `players.csv` overrides, so 221 depth-chart rows stay unlinked ([review](../reviews/2026-11-24-schema-principles-review.md) §5.4, E5). Revisit one ID per provider if providers are seen reissuing IDs. Whether `player_source` is the player crosswalk of the Platform connections PRD is not decided.

## Relationship to other decisions

- Depends on [ADR-0022](ADR-0022-enforce-a-foreign-key-on-every-player-and-game-reference.md) (foreign keys).
- Consistent with [ADR-0024](ADR-0024-load-unidentifiable-players-rows-unlinked-and-exclude-unknown-roster-players.md) (rows link only by exact ID through `player_source`).
- Consistent with [ADR-0010](ADR-0010-map-database-rows-to-code-by-hand-without-an-orm.md) (rows mapped to code by hand).

## Sources

- [Kimball Design Tip #147: durable "super-natural" keys](https://www.kimballgroup.com/2012/07/design-tip-147-durable-super-natural-keys/); [Codd's rules (Celko, Simple Talk)](https://www.red-gate.com/simple-talk/databases/theory-and-design/codds-twelve-rules/) — quoted in the [review](../reviews/2026-11-24-schema-principles-review.md) §1.7.
