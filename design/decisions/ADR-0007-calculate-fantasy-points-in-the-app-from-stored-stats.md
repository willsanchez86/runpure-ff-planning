# ADR-0007: Calculate fantasy points in the app from stored stats

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-11-05 |
| Decision-makers | Project owner |
| Consulted | None |
| Confidence | High |
| Supersedes | None |
| Related | ADR-0002 (Next.js); Player explorer PRD (scoring switch); [`specs/ff-data-etl-storage-spec.md`](../../specs/ff-data-etl-storage-spec.md) §6 |

## Context and problem statement
With no league connected, the player list and player card still show fantasy points. Users choose the scoring format with a toggle. Points can be calculated ahead of time by the pipeline, or by the app from the stored stats.

## Decision drivers
- Users choose any scoring format.
- Changing the toggle never needs a data reload.

## Considered options
### Option 1: The app calculates points from stored stats when the user chooses a format
- Good: any format; nothing to reload.
- Bad: the app needs scoring logic.

### Option 2: The pipeline pre-calculates points for a fixed set of formats
- Good: the app only reads numbers.
- Bad: limited to the formats calculated ahead of time; more stored columns.

## Decision outcome
Chosen option: **Option 1**, the project owner's choice.

We will store stat lines only, with no fantasy points, in the pipeline's output. The app calculates points for the scoring format the user selects.

## Consequences
- Good: the pipeline stays independent of scoring rules; toggling formats needs no reload.
- Bad: the app holds and tests scoring logic.
- Neutral: the formats the toggle offers are set in the Player explorer PRD (scoring switch).

## Confirmation
The pipeline's tables contain no fantasy-point columns.

## More information
None.
