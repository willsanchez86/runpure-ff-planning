# Weather

**Forecast weather for upcoming games, so wind, rain and cold inform start/sit and waiver calls before kickoff — not after.**

**Last updated:** 2026-11-18 · created at the owner's direction; [PRD review](../design/reviews/2026-11-18-chatgpt_PRD_Review_and_Recommendations.docx) applied the same day: roof states, one forecast record per game, proposed thresholds and cadence

## At a glance

|  |  |
| --- | --- |
| **Status** | **Requirements** — PRD created 2026-11-18; not yet scheduled (phase and source are open questions) |
| **Serves** | Judging how conditions affect upcoming games and the players in them |
| **Viewing data** | Not yet scheduled — after Phase 1; exact phase is an open question below |
| **Making changes** | None. View only |
| **Depends on** | [Data ETL & storage](infra-data-etl-and-storage.md) (schedule, stadium and roof per game), [NFL scores & schedule](feature-nfl-scores-and-schedule.md) (game cards are the first surface) |
| **Biggest risk** | Forecast accuracy more than ~3 days out; showing stale forecasts as if current |

## The problem

The app already stores and shows game-day temperature and wind — but only as the feed records them, which is reliable *after* a game. Decisions happen *before*: a 25 mph wind forecast matters to a kicker or a deep-ball passing game on Thursday, when lineups are being set.

## What success looks like

| Goal | Target |
| --- | --- |
| Forecast visible for every upcoming outdoor game | On the game card and the player card's next matchup |
| Forecast age always visible | Never presented as live when it isn't |
| Domes never show weather noise | Indoor games say indoor, nothing else |

*Targets: **Owner-approved** (2026-11-18) · **Uncalibrated** — no formal measurements recorded; methods and observation windows are defined at calibration.*

## Not doing

| Not doing | Why not |
| --- | --- |
| Hour-by-hour or radar views | A kickoff-window summary is what decisions need |
| Severe-weather alerts pushed to you | Notifications are a deferred feature (see the [Overview](00-overview.md)) |
| Weather-adjusted projections | The projections model may consume weather later ([Projections & rankings](feature-projections-and-rankings.md)); this PRD only shows conditions |

## User stories

**Everyday**

- As the owner, I want the forecast on each upcoming game's card (temperature, wind, precipitation), so I can factor conditions into starts and sits.
- As the owner, I want a player's next matchup to show the forecast, so the context is where the decision is made.
- As the owner, I want dome games clearly marked indoor, so I never discount a player for weather that can't happen.

**When something's different**

- As the owner, I want an extreme forecast (high wind, heavy precipitation, severe cold) visually flagged, so it can't be missed.

## Must have for launch

| Requirement | Done when |
| --- | --- |
| **Per-game forecast** for upcoming outdoor-exposed games: temperature, sustained wind, precipitation chance at kickoff (gusts and intensity where the source carries them) | Shown on the NFL screen game card. Roof state is explicit: fixed domes and roofs confirmed closed show "Indoor"; confirmed open shows the forecast; an unknown/TBD retractable roof shows the outdoor forecast with an uncertainty label and is **never** labeled Indoor |
| **One forecast record per game**, keyed by game and venue, carrying provider, forecast valid time near kickoff, fetched time and roof status | The game card and the player card render the same record with the same freshness — never two inconsistent requests |
| **Forecast on the player card's next matchup** | Same values, same freshness, beside the opponent |
| **Forecast age** | Every forecast shows when it was fetched; refreshed on the cadence chosen below |
| **Gaps stay gaps** | A game with no forecast yet (too far out, source gap) shows "—", never zeros — the app-wide convention |

## Should have soon after

| Requirement | Done when |
| --- | --- |
| **Extreme-conditions flag** | Thresholds are published and adjustable, shown as a visible tag on the game card. Proposed starting candidates (uncalibrated): sustained wind ≥ 20 mph, gusts ≥ 30 mph, temperature ≤ 20°F, precipitation probability ≥ 70% |
| **Recorded vs. forecast** | Once a game is final, explicitly labeled recorded conditions replace the forecast; the forecast and its timestamps are preserved for later accuracy analysis. Observed and forecast values are never presented as the same thing |

## Later

| Idea | Why it's parked |
| --- | --- |
| Weather as a model input | Belongs to [Projections & rankings](feature-projections-and-rankings.md) once that model exists |
| Historical weather splits per player ("in wind over 15 mph…") | Analytics value unproven; needs seasons of joined data |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |
| Upcoming outdoor games with a forecast shown | Weekly | All, within the forecast window |
| Forecast staleness at kickoff | Each game | Last refresh within the chosen cadence |

*Targets: **Owner-approved** (2026-11-18) · **Uncalibrated** — no formal measurements recorded; methods and observation windows are defined at calibration.*

Proposed reliability targets from the [2026-11-18 PRD review](../design/reviews/2026-11-18-chatgpt_PRD_Review_and_Recommendations.docx) — **uncalibrated; validate against the chosen source before treating any as a release gate**: ≥ 98% of upcoming outdoor games within 72 hours show a forecast when the source provides one; 100% roof-state correctness on a verified fixture set (zero unknown-roof games labeled Indoor); 100% card consistency on the shared forecast record; zero missing values rendered as zeros.

## Open questions

| Question | Blocks building? | Who answers | Status |
| --- | --- | --- | --- |
| Which forecast source? (candidate: the US National Weather Service API, free and keyless, US-only — which covers NFL stadiums; verify per-stadium coordinates) | Yes, answer first | Engineering | Open |
| Which phase does this land in? | Yes — scheduling | You | Open |
| Refresh cadence, and how far out a forecast is worth showing (proposed starting policy, uncalibrated: periodic refreshes for games 2–7 days out, at least hourly in the final 24 hours, a final refresh close to kickoff; beyond the horizon show "forecast unavailable", never zero) | No, answer during build | Engineering | Open |
| Are forecasts stored in MySQL (history for later analytics) or fetched and discarded? | No, answer during build | Engineering | Open |

## Build order

1. Source chosen; stadium coordinates mapped
2. Forecast on the NFL screen's upcoming game cards
3. Player card next-matchup forecast
4. Extreme-conditions flag and recorded-weather handoff
