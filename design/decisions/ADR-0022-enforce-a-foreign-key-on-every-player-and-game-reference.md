# ADR-0022: Enforce a foreign key on every player and game reference

**Status:** Accepted
**Date:** 2026-11-23 and 2026-11-25 · recorded 2026-11-25
**Revised:** 2026-11-27, in place, at the owner's direction (not finalized): rewritten to stand on its own, without references to the review's numbering; the decision is unchanged.
**Deciders:** William Sanchez

## Context

The pipeline loads nflverse's NFL data into MySQL. Players are identified by their NFL GSIS ID (`player.gsis_id`, for example `00-0033873`), games by nflverse's `game_id` (for example `2025_01_DAL_PHI`). Fact tables (weekly stats, rosters, injuries, snap counts, depth charts, play-by-play) refer to players and games by those IDs.

Until this decision only team codes were enforced by the database. Player and game references were only checked by the load, which counted rows with no matching player or game and warned. That arrangement had two reasons: some roster rows name players missing from nflverse's player file, and `player` and `game` were emptied and reloaded on every load, which a foreign key would block. Both are now resolved: those roster rows are excluded ([ADR-0024](ADR-0024-load-unidentifiable-players-rows-unlinked-and-exclude-unknown-roster-players.md)), and `player` and `game` are never deleted by a load ([ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md)).

Checked on the live database on 2026-11-25: every player and game reference matched an existing row, except 858 roster rows for 806 players missing from the player file.

## Decision

**Every column that refers to a player or a game has a database foreign key, so the database rejects a reference to a player or game that doesn't exist.**

- **To `player.gsis_id`:** `player_week_stat.player_id`; `roster.gsis_id`; `injury_report.gsis_id`; `depth_chart.gsis_id`; `game.away_qb_id` and `game.home_qb_id`; on `play`, the 26 single-role player columns (`passer_player_id`, `receiver_player_id`, `rusher_player_id`, `kicker_player_id`, `punter_player_id`, `sack_player_id`, `interception_player_id`, `penalty_player_id`, `td_player_id`, `safety_player_id`, `blocked_player_id`, the kick and punt returner columns, the seven `lateral_*` columns, `own_kickoff_recovery_player_id`, `fantasy_player_id`, `passer_id`, `rusher_id`, `receiver_id`, `fantasy_id`, `id`) and the 22 numbered defensive and turnover player columns ([ADR-0027](ADR-0027-keep-play-by-play-numbered-player-columns-with-a-foreign-key-on-each-player-column.md)); `player_source.gsis_id` ([ADR-0023](ADR-0023-store-player-and-game-ids-from-other-providers-in-mapping-tables.md)).
- **To `game.game_id`:** `game_id` on `play`, `player_week_stat`, `team_week_stat`, `snap_count` and `game_source`.
- Snap counts identify players by Pro Football Reference ID and reach `player` through `player_source` ([ADR-0023](ADR-0023-store-player-and-game-ids-from-other-providers-in-mapping-tables.md)).
- A row whose player can't be identified loads with an empty reference, which the foreign key allows ([ADR-0024](ADR-0024-load-unidentifiable-players-rows-unlinked-and-exclude-unknown-roster-players.md)).
- Parent tables load before the tables that refer to them: teams, then players, then games, then the fact tables.

## Options Considered

### Option A — A foreign key on every player and game reference (chosen)
| Dimension | Assessment |
|---|---|
| Integrity | A reference to a missing player or game can't be stored |
| Live data | No existing reference fails, apart from the roster rows excluded by ADR-0024 |
| Load | A bad reference fails its whole file load instead of warning |
| Cost | About 50 more indexes on `play` (within MySQL's 64-per-table limit) |

### Option B — Keep player and game references unenforced, with load warnings
Rejected by the project owner on 2026-11-23: it does not meet best practice.

### Option C — Foreign keys only on the columns the app reads today
Not chosen by the project owner, who chose every column on 2026-11-25.

## Consequences

**Binding constraints:** datasets load parents first; `player` and `game` rows are never deleted by a load.

**Easier:** no reference to a non-existent player or game; each foreign key also gives the column an index, which speeds player and game lookups.
**Harder / to revisit:** one bad reference blocks a file's load until its parent row exists; `play` loads are slower. Revisit if play loads exceed the run window.

## Relationship to other decisions

- **Depends on** [ADR-0023](ADR-0023-store-player-and-game-ids-from-other-providers-in-mapping-tables.md), [ADR-0024](ADR-0024-load-unidentifiable-players-rows-unlinked-and-exclude-unknown-roster-players.md), [ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md).
- **Consistent with** [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) (MySQL) and [ADR-0011](ADR-0011-apply-schema-changes-by-hand-with-no-migration-tool.md) (schema changes applied by hand).

Sources: [MySQL 8.4: FOREIGN KEY constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html); [PostgreSQL: constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).
