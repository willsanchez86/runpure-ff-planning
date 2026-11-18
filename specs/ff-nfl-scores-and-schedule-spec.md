# Implementation Spec — NFL Scores and Schedule

**The NFL screen: every game by week with final scores, byes and game detail, and the one-click jump from a team to its players.**

**Date:** 2026-11-16 · **Version:** v1.0 · **Status:** Implemented (frontend `features/nfl/`, 2026-11-17). Built directly against the live contract — the cut-over (foundation §13 step 7) landed before this screen, so §10's sample-source step and step 4 collapsed into one build.
**Companion to:** [`prds/feature-nfl-scores-and-schedule.md`](../prds/feature-nfl-scores-and-schedule.md) (the PRD this implements).
**Builds on:** [`specs/ff-frontend-foundation-spec.md`](ff-frontend-foundation-spec.md) — shell, auth, data layer, styling, states. Decisions F1–F8 / P1–P8 there apply here.
**Reference implementation:** [`prototypes/phase1/`](../prototypes/phase1/) (`viewNFL`, `gameCard`).

---

## 0. Decisions

### 0.1 ADRs and foundation decisions this spec implements

| Source | What it means here |
|---|---|
| [ADR-0006](../design/decisions/ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md) | Schedule data exists 2022 → current; Phase 1 shows the current season (the PRD scopes this screen to the week slate, not history) |
| [ADR-0016](../design/decisions/ADR-0016-define-the-api-contract-in-the-graphql-schema.md), [ADR-0017](../design/decisions/ADR-0017-use-graphql-for-the-backend-api.md) | `games(season)` in §6 is a contract addition the backend authors; shared with the Player explorer (results, next opponents) |
| Foundation F5 ([ADR-0019](../design/decisions/ADR-0019-call-the-graphql-api-through-a-hand-written-request-layer-with-tanstack-query-for-caching.md)) | Fetched through the hand-written request layer + TanStack Query, once per session |

### 0.2 Decisions (owner, 2026-11-16)

| ID | Section | Decision |
|---|---|---|
| NS1 | §3 | **Default view: regular season, current week** (next upcoming week once the regular season ends; postseason once it starts). Preseason is shown only when picked — answers the PRD's open question "Should preseason be shown by default?"; the PRD row is marked answered in the same change |
| NS2 | §4 | Game detail also shows **rest days and the division-game marker** — the PRD's first "Should have soon after", shipped in Phase 1 because the feed already carries both (`away_rest`/`home_rest`, `div_game`) and the cost is two rows in an existing panel |
| NS3 | §5 | Byes come from `teams(season).byeWeek` (already in the Player explorer contract) — no separate query; the byes block derives client-side |

## 1. Scope and boundary

**Covers:** the `/nfl` route — phase and week pickers, the game grid, game detail, byes — and the `games` contract addition. **Does not cover:** live/in-game states (nothing in Phase 1 is live; the PRD's "Not doing"), odds beyond the stored pregame line/total, standings.

## 2. Screen structure

```
/nfl
├─ View head: "NFL" + season subline
├─ Controls: phase segmented control (Preseason · Regular · Postseason) · week select · ‹ Prev / Next ›
├─ Game grid (one card per game)
├─ Byes block: "On bye — Week W (N teams)" with team chips
└─ Footer note: freshness/convention text
```

Components live in `features/nfl/`, styles ported from the prototype.

## 3. Controls

| Control | Behavior |
|---|---|
| **Phase** | Segmented control: Preseason / Regular / Postseason. All three phases carry real data (nflverse schedules include `game_type`); the prototype's "isn't in this sample" message disappears |
| **Week picker** | A select listing that phase's weeks, labelled with current/upcoming where applicable; ‹ Prev / Next › buttons, disabled at the bounds, crossing into the adjacent phase is **not** done (phase is explicit) |
| **Defaults** | NS1: regular season, current week, computed from the schedule data (first week with an unplayed game; last week once the season ends) |

Phase and week are *session state* — the screen always opens on the default (no persistence; a schedule screen should open on "now").

## 4. Game cards

Each game renders as a card, ported from the prototype:

- **Header:** kickoff day + time (Eastern) · status: `Final`, `Final OT`, or upcoming (kickoff time).
- **Team rows** (away, then home): team chip · team-name **link that opens `/players?team=XXX`** (the PRD's one-click must-have) · division · final score (winner styled, OT tagged) or kickoff time for unplayed games.
- **Game line:** stadium · favorite with spread (e.g. `KC −3.5`) · over/under total.
- **Game detail** (expand toggle, `aria-expanded`): stadium and city, roof, surface, temperature, wind, betting line and total, starting QBs, head coaches — plus rest days and the division-game marker (NS2). **Missing values render as gaps ("—"), never zeros** (PRD must-have: domes have no wind; the feed's gaps stay gaps).

## 5. Byes

The byes block lists the week's bye teams as chips (tooltip = full team name), derived from `teams(season).byeWeek` (NS3). Weeks with no byes show nothing.

## 6. Required GraphQL contract

One addition; `teams(season)` is already defined in the Player explorer spec §9.1.

```graphql
type Query {
  "Every game of a season, all phases, from the ETL schedules dataset."
  games(season: Int!): [Game!]!
}
type Game {
  id: ID!            # nflverse game id
  season: Int!  phase: String!  week: Int!        # phase: PRE / REG / POST
  kickoff: String!                                 # ISO instant; rendered Eastern
  homeTeam: String!  awayTeam: String!
  homeScore: Int  awayScore: Int  overtime: Boolean  final: Boolean
  stadium: String  roof: String  surface: String
  temperature: Int  wind: Int
  spreadLine: Float  totalLine: Float  favorite: String
  homeQb: String  awayQb: String  homeCoach: String  awayCoach: String
  homeRestDays: Int  awayRestDays: Int  divisionGame: Boolean
}
```

Fetched once per session for the season (TanStack Query); the Player explorer reads the same cached result for game results (card RESULT column) and next opponents — one fetch serves both screens.

## 7. States

The foundation's seven states apply: loading = skeleton game cards; stale = freshness banner above the grid; error = what failed + retry. An empty phase/week combination (e.g. a bye-less preseason week structure) shows the game grid empty with the byes block only if real.

## 8. Accessibility

As the prototype, binding: the phase control is a `radiogroup` (or `aria-pressed` buttons); the detail toggle carries `aria-expanded`; team links are real links; scores carry W/L in text (winner styling is never the only cue); tooltips on hover+focus. WCAG 2.2 AA.

## 9. Testing

| Area | Cases |
|---|---|
| Defaults | Current-week computation: mid-season, season end, postseason, off-season |
| Cards | Final vs Final OT vs upcoming rendering; winner styling + text cue; missing detail values render as gaps |
| Navigation | Prev/Next bounds per phase; team link lands on `/players?team=XXX` with the filter applied |
| Byes | Correct teams per week; empty-bye weeks |

## 10. Build order (PRD build order)

1. Week picker + game list with scores and byes (sample source)
2. Game detail expand (venue, weather, line, starters, coaches, rest/division — NS2)
3. Team link → filtered Player list
4. Contract cut-over with `games(season)` (foundation §13 step 7)
