# ADR-0004: Record Sleeper's injury and depth-chart status as change history in the database

**Status:** Accepted
**Date:** 2026-11-05 · rewritten 2026-11-27
**Revised:** 2026-11-09, in place: copies kept as dated rows in MySQL, not files; parked with Sleeper. 2026-11-27, in place, at the owner's direction (not finalized): the first version kept a full dated copy of Sleeper's player list on every pull; replaced by modeled change history.
**Deciders:** William Sanchez

## Context

Sleeper publishes one documented player list (`GET /v1/players/nfl`): about 5 MB of JSON covering every NFL player. Sleeper's documentation says to store it yourself and that "you do not need to call this endpoint more than once per day." Each player object carries Sleeper's player ID, cross-platform IDs (ESPN, Yahoo and others), and the player's **current** injury status, injured body part, practice participation and depth-chart position and order. Sleeper keeps no history: each call returns only today's state, so a state that isn't recorded while it is current is lost.

nflverse already supplies the official weekly injury reports (back to 2009) and dated depth charts (since 2025). Sleeper adds a daily view between official reports.

Sleeper is not used in the first release: the owner set it aside on 2026-11-06 to focus the first release on nflverse. This decision fixes how Sleeper's status data is stored once Sleeper is turned on.

## Decision

**Store Sleeper's injury and depth-chart status in the database as modeled history: one row per player for each period in which the status stayed the same, loaded by upsert with foreign keys, never as stacked copies of the raw list.**

- One pull a day. A row is written only when a player's status **changes**: the open row is closed with the date the status ended, and a new row opens with the date it took effect. A day with no change writes nothing.
- Re-running a pull on the same day changes nothing.
- The player is identified by Sleeper's ID and linked to `player` through `player_source` (provider `sleeper`), with a foreign key. A Sleeper ID with no known player loads unlinked and is counted.
- Like every table: declared keys and foreign keys, upsert loads ([ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md)), `created_at` and `updated_at` ([ADR-0029](ADR-0029-give-every-table-created-at-and-updated-at-columns-set-by-the-database.md)). History rows are never deleted.
- The raw player list is not kept.

*Proposed table shape (Claude, for the build; owner to confirm):* `player_status_history` with Sleeper player ID, provider code, injury status, body part, practice participation, depth-chart position and order, `valid_from`, `valid_to` (empty while current); key (Sleeper player ID, `valid_from`).

## Options Considered

### Option A — Change history in a modeled table (chosen)
| Dimension | Assessment |
|---|---|
| History | Every status change kept, dated, from the first pull |
| Storage | Grows only with changes, not with every daily pull |
| Integrity | Keys and foreign keys like every other table |
| Load | Each pull compared with the open rows; a little more logic than a plain upsert |

### Option B — A full dated copy of the list on every pull
The first version of this ADR. Rejected by the project owner: an unmodeled copy that keeps stacking (about 5 MB a day, roughly 1.8 GB a year) instead of recorded data.

### Option C — Keep only the current status
Not chosen: past states are lost for good.

## Consequences

**Easier:** "what was his status on a given date" is one query; the history is small and joins to everything else through the player.
**Harder / to revisit:** history starts at the first pull, so nothing before Sleeper is turned on can be recovered; the status fields must be confirmed against the live endpoint before the build; a day with a failed pull goes unseen, and the next pull records the state from then on.

## Relationship to other decisions

- **Depends on** [ADR-0003](ADR-0003-use-independent-sources-with-sleeper-filling-specific-gaps.md) (Sleeper as a source for injury and depth-chart status), [ADR-0023](ADR-0023-store-player-and-game-ids-from-other-providers-in-mapping-tables.md) (Sleeper IDs in `player_source`) and [ADR-0024](ADR-0024-load-unidentifiable-players-rows-unlinked-and-exclude-unknown-roster-players.md) (unlinked rows).
- **Consistent with** [ADR-0005](ADR-0005-store-all-pipeline-data-in-mysql-with-no-bucket.md) (MySQL is the only store; no raw downloads kept), [ADR-0028](ADR-0028-load-every-table-by-upsert-and-reconcile-removed-rows-quarterly.md) and [ADR-0029](ADR-0029-give-every-table-created-at-and-updated-at-columns-set-by-the-database.md).

## Sources

- [Sleeper API docs](https://docs.sleeper.com)
