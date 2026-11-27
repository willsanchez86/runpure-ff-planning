# ADR-0023: Store player and game IDs from other providers in mapping tables

**Status:** Accepted
**Date:** 2026-11-25
**Revised:** 2026-11-27, in place, at the owner's direction (not finalized): rewritten to stand on its own, without references to the review's numbering; the decision is unchanged.
**Deciders:** William Sanchez

## Context

The app identifies players by their NFL GSIS ID and games by nflverse's `game_id`. nflverse's files also carry each player's and game's ID at other providers, as separate columns:
- **Players:** 7 ID columns in the player file (Elias, NFL, Pro Football Reference, PFF, Over The Cap, ESPN, NFL Smart) and 11 in the season rosters (adding Sleeper, Yahoo, Sportradar, RotoWire and FantasyData, which appear nowhere else). The roster's `gsis_it_id` and the player file's `nfl_id` are the same ID under two names: equal for all 2,979 players in both 2025 files.
- **Games:** 7 ID columns in the schedule (NFL legacy, NFL GSIS game ID, NFL Detail, Pro Football Reference, PFF, ESPN, FTN), plus an NFL API ID in play-by-play.
- **Snap counts** identify players only by Pro Football Reference ID.

Fantasy-league imports (Sleeper, Yahoo, ESPN) will need to find players by those providers' IDs. In the 2025 files, 6 of about 15,500 player IDs shared by the player file and the roster differ; 3 of those are clearly roster errors. 8 unplayed 2026 games share a legacy game ID with another game, because the NFL assigns placeholder IDs before kickoff times are final.

## Decision

**A player's or game's ID at another provider is stored as a row in a mapping table, one row per provider, not as a column per provider.**

- **`source`** lists the ID providers, keyed by a short code: `pfr`, `espn`, `sleeper`, `yahoo`, `sportradar`, `rotowire`, `fantasy_data`, `pff`, `otc`, `esb`, `smart`, `nfl`, `gsis`, `nfl_detail`, `nfl_old`, `ftn`, `nfl_api`.
- **`player_source`** holds one player's ID at one provider: the player's GSIS ID (foreign key to `player`), the provider code (foreign key to `source`) and the provider's ID. A player has at most one ID per provider, and one provider ID belongs to at most one player.
- **`game_source`** does the same for games, keyed to `game.game_id`.
- **Conflicts:** where the player file and the roster give different IDs for the same player and provider, the player file's value is stored and the roster's is logged. A provider ID shared by two players or two games is not stored, and is logged.
- **Snap counts** keep the Pro Football Reference ID as their player reference, plus a provider code (`pfr`, or empty when the ID is unknown), with a foreign key to `player_source`; queries reach the player by joining through `player_source`.
- The provider-ID columns are removed from `player`, `roster`, `game` and `play`.

*Build details proposed by Claude and accepted by the owner on 2026-11-25:* `player_source` is keyed (GSIS ID, provider), with a unique key on (provider, provider ID); every column is required; the provider ID is text, up to 64 characters.

## Options Considered

### Option A — Mapping tables (chosen)
| Dimension | Assessment |
|---|---|
| Structure | A provider is a value, not a column name; one rule enforces "one player per provider ID" for every provider |
| Growth | A new provider is a row in `source`, not a schema change |
| Queries | One join to reach a provider's ID |

### Option B — One column per provider on `player`, `roster` and `game`
Not chosen by the project owner, who called the mapping table the commonly accepted pattern.

### Option C — `source` keyed by a number instead of its code
Not chosen by the project owner.

### Option D — Snap counts store the GSIS ID looked up during the load
Not chosen by the project owner, who chose to keep the Pro Football Reference ID and join through `player_source`.

### Option E — Several IDs per player per provider
Not chosen by the project owner.

## Consequences

**Binding constraints:** loads write provider IDs as rows and never store a conflicting or shared ID. If a player's Pro Football Reference ID changes, the snap rows that point at the old one are unlinked first, because the foreign key would block the change.

**Easier:** finding a player by any provider's ID; a provider ID can't silently belong to two players.
**Harder / to revisit:** when the player file is wrong and the roster right, the right ID is logged, not stored. Known case: ESPN's depth chart uses Chris Manhertz's roster ESPN ID, so 221 depth-chart rows stay unlinked. Revisit "one ID per provider" if a provider is seen reissuing IDs.

## Relationship to other decisions

- **Consistent with** [ADR-0022](ADR-0022-enforce-a-foreign-key-on-every-player-and-game-reference.md) (foreign keys), [ADR-0024](ADR-0024-load-unidentifiable-players-rows-unlinked-and-exclude-unknown-roster-players.md) (rows link only by exact ID) and [ADR-0010](ADR-0010-map-database-rows-to-code-by-hand-without-an-orm.md) (hand-written mappings).

Sources: [Kimball Design Tip #147: durable "super-natural" keys](https://www.kimballgroup.com/2012/07/design-tip-147-durable-super-natural-keys/); [Codd's rules (Celko, Simple Talk)](https://www.red-gate.com/simple-talk/databases/theory-and-design/codds-twelve-rules/).
