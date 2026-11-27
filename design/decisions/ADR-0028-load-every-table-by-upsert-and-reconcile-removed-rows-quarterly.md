# ADR-0028: Load every table by upsert, and remove rows nflverse has removed in a quarterly reconciliation

**Status:** Accepted
**Date:** 2026-11-27
**Deciders:** William Sanchez

## Context

The pipeline loads nflverse's files into MySQL piece by piece: one file per dataset and season, or one file for datasets without seasons. Each scheduled run (daily at 06:00 Eastern) loads the current season's files and every single-file dataset, and checks the published version of each past-season file, reloading a file only when nflverse has republished it.

Until now, `team`, `player` and `game` were loaded by upsert (insert new rows, update changed rows, delete none), and every other table by delete-and-replace: delete the piece's rows, then insert the whole file. Delete-and-replace rewrites every row on every load, resets any row timestamps, and empties a table before refilling it.

An upsert alone never removes a row. Cases where that leaves the database different from nflverse, found on 2026-11-27: a row nflverse deletes (for example a duplicated stat line); a row whose key changes (a stat line moved to another player, a game rescheduled to another week, whose `game_id` contains the week); a season change for a dataset that keeps only some seasons.

## Decision

**Every table is loaded by upsert, never by delete-and-replace; rows that nflverse has removed from its files are deleted only by a reconciliation run four times a year.**

- **Every load** inserts rows that are new and updates rows that changed, matched on each table's primary key; rows that didn't change are left untouched. No load deletes rows or empties a table.
- **Reconciliation** runs on January 1, April 1, July 1 and October 1, after the 06:00 Eastern run. For each piece already loaded, it reads nflverse's current file and deletes the rows of that piece whose key is no longer in the file. Each deletion count is logged like a normal run.
- **Kept out of reconciliation:** `team`, `player` and `game` rows missing from a later file are kept, never deleted (owner, 2026-11-24): other tables reference them.
- Child rows are deleted before the rows they reference, so foreign keys hold throughout.

## Options Considered

### Option A — Upsert every load, quarterly reconciliation of removed rows (chosen)
| Dimension | Assessment |
|---|---|
| Rows written per load | Only new and changed rows |
| Row timestamps | Meaningful: `created_at` is when a row first arrived, `updated_at` when it last changed ([ADR-0029](ADR-0029-give-every-table-created-at-and-updated-at-columns-set-by-the-database.md)) |
| Rows nflverse removed | Remain until the next reconciliation, up to three months |
| Tables never emptied | Yes; a failed load never leaves a table empty |

### Option B — Delete-and-replace for fact tables (the previous method)
Rejected by the project owner: never delete and replace.

### Option C — Upsert, then delete rows of the loaded piece that the file no longer has, on every load
Not chosen by the project owner, who chose deletion only in the quarterly reconciliation.

## Consequences

**Binding constraints:** no load statement deletes rows; only the reconciliation job does, and only rows absent from nflverse's current file. Every table has a primary key that identifies the same row across loads.

**Easier:** corrections update rows in place; history is never wiped by a load; timestamps show what changed and when.
**Harder / to revisit:** for up to three months a row nflverse removed (or a row under an old key after a key change, such as a rescheduled game's old `game_id`) can still be read, and totals that include it can be off. Revisit the schedule if a removed row causes a visible error.

## Relationship to other decisions

- **Consistent with** [ADR-0006](ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md), which carries the rest of the load policy (backfill, daily schedule, past-season checks, ledger, retries). This decision replaced the delete-and-replace method of ADR-0006, which ADR-0006 supersedes.
- **Depends on** [ADR-0022](ADR-0022-enforce-a-foreign-key-on-every-player-and-game-reference.md) (foreign keys, so deletions run children first).
- **Consistent with** [ADR-0013](ADR-0013-keep-play-by-play-and-depth-charts-for-the-current-season-only.md) (play-by-play and depth charts keep every season from 2026) and [ADR-0029](ADR-0029-give-every-table-created-at-and-updated-at-columns-set-by-the-database.md) (row timestamps).
