# ADR-0022: Enforce a foreign key on every player and game reference

**Status:** Accepted
**Date:** 2026-11-23 and 2026-11-25 · recorded 2026-11-25
**Deciders:** William Sanchez

## Context

The ten data tables loaded from nflverse reference players by GSIS ID and games by `game_id`. Until now only team codes carried database foreign keys; player and game references were checked by the load and only warned ([ETL spec](../../specs/ff-data-etl-storage-spec.md) §7.2.3, §8). That choice entered the spec in v2.11 without an owner decision. Its two reasons were that roster rows reference players missing from `players.csv`, and that `player` and `game` were replaced whole on each load. The second no longer holds: `player` and `game` load by upsert and keep rows absent from later files ([ADR-0006](ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md), revised 2026-11-24). The first is settled by [ADR-0024](ADR-0024-load-unidentifiable-players-rows-unlinked-and-exclude-unknown-roster-players.md).

On the live database (diagnostics run by the owner, 2026-11-25), every player and game reference had a matching parent row except 858 roster rows for 806 players missing from `players.csv` ([review](../reviews/2026-11-24-schema-principles-review.md) §5.3).

## Decision

**Every column that references a player or a game carries a database foreign key.** Player references point to `player.gsis_id`: `player_week_stat.player_id`, `roster.gsis_id`, `injury_report.gsis_id`, `depth_chart.gsis_id`, `game.away_qb_id` and `home_qb_id`, all 26 single-role player-ID columns on `play` (`passer_player_id` … `id`), `play_participant.player_id` ([ADR-0027](ADR-0027-store-play-participants-as-rows-in-a-play-participant-table.md)) and `player_source.gsis_id` ([ADR-0023](ADR-0023-store-player-and-game-ids-from-other-providers-in-mapping-tables.md)). Game references point to `game.game_id`: `play`, `player_week_stat`, `team_week_stat`, `snap_count` and `game_source`. Snap counts reach `player` through `player_source` (ADR-0023). Owner, 2026-11-23 ("player and game references must carry foreign keys") and 2026-11-25 (every `play` and `game` player column).

## Options Considered

### Option A — Foreign keys on every player and game reference (chosen)
| Dimension | Assessment |
|---|---|
| Integrity | The database rejects a reference to a missing player or game ([review](../reviews/2026-11-24-schema-principles-review.md) R3, R4, R8) |
| Live data | Zero orphans outside the roster rows ADR-0024 excludes |
| Load | Parents must load before children; an orphan fails the whole piece instead of warning |
| Cost | About 27 new indexes on `play`; slower play loads |

### Option B — Keep player and game references warn-only
Rejected by the project owner on 2026-11-23: leaving them without foreign keys "does not meet best practice".

### Option C — Foreign keys only on the columns the app reads (`game`'s QB IDs; `play`'s passer, rusher, receiver)
Not chosen by the project owner, who chose every column on 2026-11-25.

## Consequences

**Binding constraints:** datasets load parents first (teams, players, schedules, then facts; [implementation plan](../reviews/2026-11-25-schema-review-implementation-plan.md) §3). `team`, `player` and `game` are never deleted by a load ([ADR-0006](ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md)).

**Easier:** no orphaned player or game references; player-led indexes come with the foreign keys ([review](../reviews/2026-11-24-schema-principles-review.md) F4, P5).
**Harder / to revisit:** one bad reference blocks a whole piece until the parent loads; `play` loads get slower. Revisit if play loads exceed the run window.

## Relationship to other decisions

- Depends on [ADR-0006](ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md) (upserted `player` and `game`, never deleted).
- Depends on [ADR-0024](ADR-0024-load-unidentifiable-players-rows-unlinked-and-exclude-unknown-roster-players.md) (rows whose player can't be identified) and [ADR-0023](ADR-0023-store-player-and-game-ids-from-other-providers-in-mapping-tables.md) (snap counts through `player_source`).
- Consistent with [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) (MySQL holds all pipeline data), [ADR-0011](ADR-0011-apply-schema-changes-by-hand-with-no-migration-tool.md) (schema changes applied by hand from `sql/`).

## Sources

- [MySQL 8.4: FOREIGN KEY constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html); [PostgreSQL: constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) — quoted in the [review](../reviews/2026-11-24-schema-principles-review.md) §1.1.
