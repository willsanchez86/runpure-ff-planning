# Lineup management

**Every roster decision in every league from one place — game-day problems and the live board, waiver pickups, adds and drops, starts and sits — with decisions made here syncing to the actual league, and a weekly snapshot of every team recorded in our database.**

**Last updated:** 2026-11-18 · created by splitting Waivers & trades (owner, 2026-11-18) and absorbing the Game-day lineup center PRD into it (owner, 2026-11-18); [PRD review](../design/reviews/2026-11-18-chatgpt_PRD_Review_and_Recommendations.docx) applied the same day: live-data rule, legal-action validation, transaction states, waiver semantics, settings snapshots

*Reconciled 2026-11-27 with ADR-0006 and ADR-0008 as revised in place (no run lock; every table upserted; past seasons version-checked; quarterly reconciliation): no change needed here.*

## At a glance

|  |  |
| --- | --- |
| **Status** | **Requirements** — PRD created 2026-11-18 from the owner's restructure (split of Waivers & trades, absorbing Game-day lineup center); builds in the Viewing/Changes phases; no spec yet |
| **Serves** | The weekly roster loop: waivers, adds/drops, starts/sits — and the game-day check and live board |
| **Viewing data** | Viewing phase: problem list, live board, team needs, free-agent finder, waiver calendar |
| **Making changes** | Changes phase: swaps, claims, adds/drops made here and synced to the platform |
| **Depends on** | [Player explorer](feature-player-explorer.md) (its table is the base for the free-agent finder), [Platform connections](infra-platform-connections.md), [Data ETL & storage](infra-data-etl-and-storage.md), [Projections & rankings](feature-projections-and-rankings.md) (projections behind suggestions), and the shared terms on the [Overview](00-overview.md) |
| **Biggest risk** | A change made here must verifiably land on the platform; a silent failure is worse than no feature |

## The problem

The weekly loop — check lineups before kickoff, claim the right free agents, drop the right depth, start the right players — runs separately in every league, under different rules, on different platform apps. Problems get missed, deadlines pass, and nothing records what your teams looked like week to week, so there's no history to learn from.

## What success looks like

| Goal | Target |
| --- | --- |
| Starters left in a lineup who are out, on bye or inactive at kickoff | Zero, across all leagues |
| Time to see every lineup problem in every league | Under 10 seconds after opening the app |
| Claims or bids for every league prepared | Under 10 minutes a week |
| Waiver deadlines missed | Zero over the season |
| A change made here | Confirmed against the platform before it's marked done |
| Every team's weekly state | Snapshotted in our database, every week, every league |

*Targets: **Owner-approved** (carried unchanged from the owner's Game-day lineup center and Waivers & trades PRDs, plus the owner's 2026-11-18 split instructions) · **Uncalibrated** — no formal measurements recorded; methods and observation windows are defined at calibration.*

## Not doing

| Not doing | Why not |
| --- | --- |
| Changes made without your confirmation | Every swap, claim and drop is yours to approve. Automation is the deferred Agentic lineup management feature (see the [Overview](00-overview.md)) |
| Phone notifications | Deferred feature (Overview); needs a delivery channel |
| Its own injury news gathering | Shows platform-reported status; the News & updates feature covers news |
| Trades | Split into their own PRD: [Trades](feature-trades.md) |
| Daily fantasy or pick'em contests | Season-long leagues only |

## User stories

**Game day**

- As the owner, I want one list of every lineup problem in every league, so I can fix them all before kickoff.
- As the owner, I want each problem to suggest a replacement from my bench, so I can decide quickly.
- As the owner, I want to make the swap from this screen and see it confirmed against the platform, so I don't open each platform's app.
- As the owner, I want locked players (game started) shown as locked, so I don't plan impossible swaps.
- As the owner, I want a live board of all my matchups on Sunday, so I can follow every league at once.

**During the week**

- As the owner, I want each league's weakest starting positions pointed out, so I know what to look for on waivers.
- As the owner, I want free agents ranked by how much they'd add to my starting lineup in that league, so I claim the right player.
- As the owner, I want every league's waiver deadline, type, budget and priority in one calendar, so I never miss one.
- As the owner, I want to know who to drop when I claim someone, so my roster stays legal.
- As the owner, I want starts/sits decided here with projections, matchup difficulty and volatility side by side, so close calls are informed.

**History**

- As the owner, I want every team's roster, matchup and score recorded weekly, so season history is queryable later (reviews, the projections model, trade context).

**When something's different**

- As the owner, in a league where changes aren't possible, I want a direct link to that league on its platform.
- As the owner, I want a player ruled out after his game started to show as "too late", not offered for a swap.
- As the owner, I want a free agent on bye or injured this week ranked by when he becomes useful, not as worthless.

## Must have for launch

| Requirement | Done when |
| --- | --- |
| **Problem list** across all leagues, soonest kickoff first | Definite problems (out, injured reserve, bye, empty slot, locked) are separated from risk indicators (questionable — its threshold is a product decision, open question below). A starter on bye appears with his league, slot and reason. With no problems: "All lineups set" and when it last updated |
| **Suggested swap** per problem: highest-projected eligible bench player who hasn't played | Eligibility uses the league's actual roster rules (flex/superflex included); never suggests a player who is out, on bye or locked |
| **Live data for every decision** | Problem detection, locks, suggestions, free-agent availability, claims and deadlines read the league's current rosters, settings and player/game status (the Overview's **live league data** term). Every decision surface shows its last-verified time; unverifiable data is marked stale and non-actionable, never silently served from a snapshot |
| **Legal-action validation** before any submission | The app rechecks that the player is rostered/available, the slot is eligible under the league's actual rules, the game hasn't locked, roster limits and transaction rules permit the move, and any budget/priority/deadline still holds — and blocks an illegal action itself rather than relying on the platform to reject it |
| **Make the change** (swap, add/drop, claim) in leagues where changes are possible | Confirmation step first; the change then follows the Overview's **verified platform action** states — only a matching read-back marks it done; an ambiguous or timed-out outcome stays visibly unresolved and is never retried automatically. View-only leagues get "Open in Sleeper/Yahoo/ESPN" |
| **Locked players** | Anyone whose game has started is shown locked and can't be moved |
| **Live board**: one card per league — your score, opponent's, projected final, players still to play | Refreshes at least every 60 seconds during games |
| **Team needs** per league: every starting position ranked against the rest of that league | Uses the positional strength measure on the [Overview](00-overview.md) |
| **Free-agent finder** per league: available players ranked by points added over your weakest replaceable starter; this-week and rest-of-season views | Uses that league's own scoring and actual roster/eligibility rules; rostered players never appear; a current bye or short injury affects this week, not rest-of-season value |
| **Waiver calendar**: every league's next waiver run, type (bidding budget or priority order), remaining budget, current priority | Captures the league's actual run schedule and time zone, and whether a claim is submitted on the platform or only drafted here. "No claim entered" is shown as a choice, distinct from a missed deadline. A league with a verified deadline within 24 hours and no claim set is flagged — flags fire on verified data only |
| **Weekly team snapshot**: every team's roster, matchup and score in every connected league, recorded weekly in MySQL — plus **league-settings snapshots** at least daily while a league is active and on any detected change (the Overview's **historical snapshots** term) | Snapshots carry source and capture timestamps and are queryable per league/team/week; a missed week is visible, not silently absent, with a defined repair path. Snapshots are never a fallback for a current decision |

## Should have soon after

| Requirement | Done when |
| --- | --- |
| **Suggested bid range** in bidding-budget leagues | Based on projected gain and remaining budgets across the league |
| **Drop suggestions** | Lowest-value bench player, protecting players returning from injury or bye |
| **Trending pickups** across platforms | Shown as a signal beside each free agent (Sleeper's public API lists trending players) |
| **Best-lineup check** | Any league whose lineup isn't its highest-projected one is flagged |
| **One news item, every league** | A player ruled out shows as one grouped item covering every league where he starts |

## Later

| Idea | Why it's parked |
| --- | --- |
| Automatic changes under rules you set | The deferred Agentic lineup management feature (Overview); only after manual changes are proven reliable |
| How many of your teams depend on the same NFL player | Useful across leagues, not needed for weekly decisions |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |
| Time from opening the app to all lineups set | Each game day | Under 3 minutes for all leagues |
| Time spent on waivers across all leagues | Each week | Under 10 minutes |
| Points per week added by pickups vs. the players they replaced | Across the season | Positive in every league |
| Starters who scored zero because out or on bye | Across the season | Zero |
| Weekly snapshots recorded | Each week | Every team in every connected league |

*Targets: **Owner-approved** (carried unchanged from the owner's Game-day lineup center and Waivers & trades PRDs, plus the owner's 2026-11-18 split instructions) · **Uncalibrated** — no formal measurements recorded; methods and observation windows are defined at calibration.*

Proposed reliability targets from the [2026-11-18 PRD review](../design/reviews/2026-11-18-chatgpt_PRD_Review_and_Recommendations.docx) — **uncalibrated; validate against the first live integration before treating any as a release gate**: p95 ≤ 10 s to a complete, timestamped problem list; ≥ 99% precision and recall on a curated problem-detection fixture set; 100% of writes revalidated with zero falsely-confirmed transactions; 100% of expected snapshots present or explicitly marked missing.

## Open questions

| Question | Blocks building? | Who answers | Status |
| --- | --- | --- | --- |
| Which source gives reliable kickoff times and lock status for all three platforms? | Yes, answer first | Engineering | Open |
| Do all three platforms give waiver deadlines, bidding budgets and priority order through their APIs? | Yes, answer first | Engineering | Open |
| Do all three platforms use the same injury labels, or does the app translate? | Yes, answer first | Engineering | Open |
| Can claims be submitted on Sleeper and Yahoo, or only immediate free-agent adds? | No, answer during build | Engineering | Open |
| Should questionable players count as problems by default, or only when a healthy bench player projects higher? | No, answer during build | You | Open |
| Snapshot timing: after the last game of the week, before waivers run, or both? | No, answer during build | You | Open |
| What should the live board look like on a phone? | No, answer during build | Design | Open |

Also open, tracked on [Platform connections](infra-platform-connections.md): where late inactives come from on game day, and whether the live tier runs inside the always-on backend or a separate worker ([ADR-0008](../design/decisions/ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md); ETL spec D15). At launch the live board polls the API every 30–60 seconds ([ADR-0017](../design/decisions/ADR-0017-use-graphql-for-the-backend-api.md)).

## Build order

1. Problem list and live board, view only
2. Weekly team snapshots (start recording as soon as leagues are readable)
3. Waiver calendar, team needs, free-agent finder
4. Suggested swaps and starts/sits help
5. Making changes — swaps, adds/drops, claims — once each platform supports them. A platform's write control is enabled only after its actions pass a repeatable suite: valid moves, locked players, roster-limit violations, expired deadlines, timeouts, duplicate prevention, read-back verification
