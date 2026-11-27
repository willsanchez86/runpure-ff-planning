# ADR-0027: Keep play-by-play's numbered player columns, with a foreign key on each player column

**Status:** Accepted
**Date:** 2026-11-27 · recorded 2026-11-27
**Revised:** 2026-11-27, in place, at the owner's direction (not finalized): the first version (2026-11-25) moved these columns into a separate `play_participant` table with one row per player per role; replaced by keeping the columns, after the load method became upsert and MySQL's index limit was found.
**Deciders:** William Sanchez

## Context

nflverse's play-by-play file lists the defensive and turnover players of each play in fixed, numbered columns: up to two players per role, four for assisted tackles, across ten roles (solo tackle, assisted tackle, tackle with assist, tackle for loss, QB hit, pass defended, half sack, forced fumble, fumbled, fumble recovery). Each slot has a player-ID column holding the player's GSIS ID (for example `solo_tackle_1_player_id = '00-0027962'`), most have a team-code column, and fumble recoveries add yards: 60 columns in all, 22 of them player IDs and 14 team codes. The file never carries more slots than these.

Every load upserts (no row is deleted except by the quarterly reconciliation), and every player reference carries a foreign key to `player` ([ADR-0022](ADR-0022-enforce-a-foreign-key-on-every-player-and-game-reference.md)).

MySQL allows at most 64 indexes on a table, and every foreign key needs one. Measured on MySQL 8.4 on 2026-11-27 with the migration: a foreign key on every player-ID and team-code column of `play` would need 69 indexes, and MySQL refused with "Too many keys specified; max 64 keys allowed".

## Decision

**Keep the play-by-play file's numbered player columns on `play` as they are, and give each of the 22 numbered player-ID columns a foreign key to `player`; the 14 numbered team-code columns keep their values but carry no foreign key.**

- With these keys, `play` has 55 indexes: the primary key, 6 team-code foreign keys (`posteam`, `defteam`, `timeout_team`, `td_team`, `return_team`, `penalty_team`), 26 single-role player foreign keys ([ADR-0022](ADR-0022-enforce-a-foreign-key-on-every-player-and-game-reference.md)) and these 22.
- A correction in the source (for example three tacklers corrected to two) reaches the database through the normal upsert: the emptied slot becomes empty.
- The 22 numbered player-name columns are not stored ([ADR-0026](ADR-0026-keep-descriptor-and-duplicate-columns-off-fact-tables.md)).

## Options Considered

### Option A — Keep the numbered columns; foreign keys on the player columns only (chosen)
| Dimension | Assessment |
|---|---|
| Integrity | Every player reference checked; the 14 slot team codes are not |
| Upsert | Corrections apply on the next load |
| Fit with the source | Same shape as the file; nothing the source sends is lost |
| Engine limit | 55 of MySQL's 64 indexes |
| Queries | "Every play a player was in" checks 48 player columns (a view can present them as rows) |

### Option B — A `play_participant` table, one row per player per role
The first version of this decision (2026-11-25). Not kept by the project owner: under upsert-only loads a participant removed by a correction would stay until the quarterly reconciliation, and the file's slots already cap the number of players, so the table adds no capacity.

### Option C — Keep the columns; foreign keys on the team columns, none on the 22 slot player columns
Not chosen by the project owner: player references must carry foreign keys.

## Consequences

**Binding constraints:** the 14 numbered team-code columns of `play` are the recorded exception to "every team-code column has a foreign key to `team`". A new foreign key on `play` must fit within the 9 indexes left.

**Easier:** the load writes the file's shape directly; corrections need no extra cleanup.
**Harder / to revisit:** a wrong team code in a slot is not caught by the database; player-centric play queries are wider. Revisit if nflverse adds slots, or if a play-level feature needs participants as rows (a view first).

## Relationship to other decisions

- Depends on [ADR-0022](ADR-0022-enforce-a-foreign-key-on-every-player-and-game-reference.md) (foreign keys on player references).
- Consistent with [ADR-0026](ADR-0026-keep-descriptor-and-duplicate-columns-off-fact-tables.md) (the slot name columns are dropped) and [ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md) (which seasons of play-by-play are kept).

## Sources

- MySQL 8.4 error 1069, "Too many keys specified; max 64 keys allowed", observed when applying the migration on 2026-11-27.
