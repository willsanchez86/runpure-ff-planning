# Projections & rankings

**A private analytical model that produces our own player projections and rankings — replacing the placeholder formula and every reliance on consensus or platform numbers — and powering the recommendation features that come after it.**

**Last updated:** 2026-11-18 · created at the owner's direction (owner decisions of 2026-11-18: own model, own phase)

## At a glance

|  |  |
| --- | --- |
| **Status** | **Requirements** — PRD created 2026-11-18; scheduled as the Projections phase (after Phase 1, alongside the Viewing phase); modeling approach and error metric are open |
| **Serves** | Every number the app shows or recommends: projections, ranks, and later the recommendation features built on them |
| **Viewing data** | **Projections phase** — after Phase 1, running alongside the Viewing phase (the model needs no league data) |
| **Making changes** | None. View only — its output feeds other features |
| **Depends on** | [Data ETL & storage](infra-data-etl-and-storage.md) (stats, snaps, schedules, play-by-play as inputs) |
| **Biggest risk** | Model quality: a projection worse than free consensus numbers is worse than no model |

## The problem

Every projection in the app today is the Overview's placeholder formula — honest, but weak — and the PROJ column, ranks and trade/waiver judgments all inherit that weakness. Relying on consensus or platform projections instead would tie the app's core numbers to sources it doesn't control and can't improve.

This feature builds the alternative: our own model, iterated privately, measured against actuals, owned end to end.

## What success looks like

| Goal | Target |
| --- | --- |
| Projection accuracy | Backtest error against actual results (stored seasons, 2022 →) improves version over version, by the harness's error metric (open question below) |
| One model behind every number | The PROJ column, the positional and overall ranks, and (when built) the waiver and trade calculations read this model's stored output; no surface computes or imports a different projection |

*Targets: "One model behind every number" — **Owner-approved** (2026-11-18); "Projection accuracy" — **Proposed** (Claude, 2026-11-18, pending owner approval alongside the error metric). Both **Uncalibrated** — methods and observation windows are defined at calibration. Placeholder comparisons and all consensus benchmarking were removed at the owner's direction (2026-11-18): the model is judged only against actual results, and no third-party projection data is fetched.*

## Not doing

| Not doing | Why not |
| --- | --- |
| Publishing or exposing the model's internals | The model is private; only its outputs ship |
| Consensus or expert projection data — pulled, aggregated or benchmarked against | The model is built and judged on our own stored data against actual results (owner, 2026-11-18); no third-party projection data is fetched |
| Daily-fantasy-style salary values | Season-long leagues only |
| Recommendations themselves (waivers, trades, lineups) | Separate deferred features that consume this model — see Deferred features on the [Overview](00-overview.md) |

## User stories

**Everyday**

- As the owner, I want weekly projections for every relevant player from our own model, so the PROJ column means something I can trust and improve.
- As the owner, I want rest-of-season projections, so trade and waiver judgments look past this week.
- As the owner, I want positional and overall rankings derived from the projections, so every list in the app can rank players consistently.
- As the owner, I want to see how accurate the model has been, so I know how much weight to give it.

**When something's different**

- As the owner, I want a player with little or no history (rookie, role change) to get a defensible projection, not a zero or a wild guess.

## Must have for launch

| Requirement | Done when |
| --- | --- |
| **Weekly projections** per player, per scoring format, for the current week onward | Stored in MySQL; served through the existing GraphQL contract; the frontend's PROJ column reads them in place of the placeholder |
| **Rest-of-season projections** | Weekly projections aggregated over remaining games, bye- and injury-aware |
| **Rankings**: positional and overall, derived from the projections | Replace the current computed-from-placeholder ranks |
| **Backtesting harness** | Any model version can be scored against stored historical seasons (2022 →) with a defined error metric, before it ships |
| **Versioning** | Every published projection records which model version produced it; versions are comparable in the backtest |
| **Placeholder retirement** | The Overview's placeholder Projection definition is marked superseded by this model on the surfaces that use it |

## Should have soon after

| Requirement | Done when |
| --- | --- |
| **Accuracy display** | The app can show model error vs. actuals per position, per week |
| **Input expansion** | Snap share, usage trends, play-by-play-derived features, and (when built) [Weather](feature-weather.md) feed the model |

## Later

| Idea | Why it's parked |
| --- | --- |
| Powering data-driven waiver and trade recommendations | Deferred feature (Overview); needs leagues connected and this model proven |
| Powering matchup analysis reports and agentic lineup management | Deferred features (Overview); same dependency |
| Uncertainty ranges (floor/ceiling) per projection | Valuable, but a point estimate that beats the placeholder comes first |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |
| Backtest error against actual results | Every model version, by the harness's error metric (open question below) | Lower than the previous version's |

*Target: **Proposed** (Claude, 2026-11-18) · **Uncalibrated** — pending owner approval together with the error metric it depends on; methods and observation windows are defined at calibration.*

## Open questions

| Question | Blocks building? | Who answers | Status |
| --- | --- | --- | --- |
| Modeling approach for the first version (regression on recent usage/efficiency? gradient boosting? simple hierarchical averages?) | Yes, answer first | Engineering (proposal), you (accept) | Open |
| The error metric that defines "better" (MAE per game? rank correlation?) | Yes, answer first | Engineering (proposal), you (accept) | Open |
| Retrain/refresh cadence (weekly after games load?) | No, answer during build | Engineering | Open |
| Do DEF and K get modeled in version 1, or keep the placeholder longer? | No, answer during build | You | Open |

## Build order

1. Backtesting harness and error metric over stored 2022 → history
2. First model version; beat the placeholder in backtest
3. Serve projections/ranks through the contract; retire the placeholder on the Phase 1 screens
4. Iterate: input expansion, benchmarking, accuracy display
