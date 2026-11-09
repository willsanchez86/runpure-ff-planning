# ADR-0004: Keep dated copies of every Sleeper player-list pull

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-11-05 |
| Decision-makers | Project owner |
| Consulted | Claude (analysis) |
| Confidence | High |
| Supersedes | None |
| Revised | 2026-11-09, in place, at the owner's direction (not finalized): copies are dated rows in MySQL (ADR-0005), not files; the deletion-protection note removed because the current spec has no such requirement; parked with Sleeper; spec reference corrected |
| Related | ADR-0003 (data sources); ADR-0005 (storage); [`specs/ff-data-etl-storage-spec.md`](../../specs/ff-data-etl-storage-spec.md) §4.3 |

## Context and problem statement
Sleeper's player list returns only the **current** injury status and depth chart; it keeps no history. If each pull overwrites the last, past injury and depth-chart states are lost for good. nflverse stats, schedules and scores can always be downloaded again, so they don't have this problem.

## Decision drivers
- Past injury and depth-chart states can be looked up later.
- Data that can't be recreated is never lost.

## Considered options
### Option 1: Keep a dated copy of every pull
- Good: a complete history from the first run onward.
- Bad: storage grows with every pull.

### Option 2: Keep only the current state
- Good: minimal storage.
- Bad: history is lost permanently.

## Decision outcome
Chosen option: **Option 1**, because history that isn't saved can never be recovered.

We will save every Sleeper player-list pull as a dated copy and never overwrite it. History begins at the first run.

## Consequences
- Good: past injury and depth-chart states can be queried by date.
- Bad: storage grows with each daily pull. Sleeper's docs describe the full list as about 5 MB, so roughly 1.8 GB a year before compression.
- Neutral:
  - History before the first run can't be recovered.
  - Parked with Sleeper, which the owner set aside on 2026-11-06 (ETL spec D4): no copies are taken in Phase 1.

## Confirmation
MySQL holds one dated set of rows per pull (ADR-0005), with no gaps between consecutive days once Sleeper is enabled.

## More information
- [Sleeper API docs](https://docs.sleeper.com)
