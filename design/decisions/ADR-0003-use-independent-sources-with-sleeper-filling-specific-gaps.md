# ADR-0003: Use independent sources as the base, with Sleeper filling specific gaps

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-11-05 |
| Decision-makers | Project owner |
| Consulted | Claude (API research) |
| Confidence | High |
| Supersedes | None |
| Revised | 2026-11-09, in place, at the owner's direction (not finalized): Sleeper's set-aside status recorded; spec section reference corrected |
| Related | ADR-0004 (dated copies); Player explorer PRD (projections out of Phase 1); [`specs/ff-data-etl-storage-spec.md`](../../specs/ff-data-etl-storage-spec.md) §4.1, §4.3 |

## Context and problem statement
Phase 1 must populate the Player list, Player card and NFL scores and schedule screens with the data Sleeper shows. That data can come from Sleeper's own API, from independent sources such as nflverse, or from a mix. Parts of Sleeper's API (stats, projections) are undocumented. Its documented player list, `/players/nfl`, carries injury status, body part, practice participation and depth-chart order.

## Decision drivers
- Data close to what Sleeper's screens show.
- Avoid depending on undocumented endpoints for core data.
- Every source's terms and stability are known.

## Considered options
### Option 1: Sleeper's own API first
- Good: closest match to Sleeper's screens.
- Bad: core data would depend on undocumented endpoints that can change or disappear; whether Sleeper's terms allow automated use is unanswered.

### Option 2: Independent sources first, Sleeper's documented endpoints only
- Good: no undocumented dependencies.
- Bad: values may not match Sleeper's exactly, and no projections.

### Option 3: Independent sources as the base, Sleeper filling specific gaps
- Good: core data is independent, and Sleeper's documented player list adds what nflverse lacks.
- Bad: each gap Sleeper fills is a dependency to track.

## Decision outcome
Chosen option: **Option 3**, because it keeps core data independent while filling known gaps.

We will use nflverse as the base for stats, game logs, schedules, scores, rosters and player bios. We will use Sleeper's documented player list for injury status, body part, practice participation and depth-chart order. We will show player news from a separate provider, chosen later. We will not use Sleeper's undocumented endpoints.

The owner set Sleeper aside on 2026-11-06: it is not in Phase 1, which uses nflverse only (ETL spec D4, §4.3). Until Sleeper is enabled, injury status and depth-chart order come from nflverse.

## Consequences
- Good: core data doesn't depend on undocumented endpoints.
- Bad: some values may differ slightly from Sleeper's own screens.
- Neutral:
  - The news provider is an open decision.
  - Sleeper asks that the player list be pulled at most once a day.

## Confirmation
Every pipeline source module maps to a source named in this ADR. No calls go to undocumented Sleeper endpoints.

## More information
- [Sleeper API docs](https://docs.sleeper.com)
- Revisit if nflverse stops publishing a needed dataset, or if Sleeper documents its stats or projections endpoints.
