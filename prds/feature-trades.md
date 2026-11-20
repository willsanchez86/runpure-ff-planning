# Trades

**Send, receive, accept and reject trade proposals from inside the app, judge every trade with the evaluator, and work a private buy/sell list that shows exactly which rosters hold the players you're hunting — with every trade move recorded in our database.**

**Last updated:** 2026-11-18 · created by splitting Waivers & trades (owner, 2026-11-18); [PRD review](../design/reviews/2026-11-18-chatgpt_PRD_Review_and_Recommendations.docx) applied the same day: live lookups replace snapshot lookups, settings recheck per evaluation, trade lifecycle states, deadline promoted to launch

## At a glance

|  |  |
| --- | --- |
| **Status** | **Requirements** — PRD created 2026-11-18 from the owner's restructure (split of Waivers & trades); builds in the Viewing/Changes phases; no spec yet |
| **Serves** | Weighing, hunting and executing trades across every league |
| **Viewing data** | Viewing phase: trade evaluator, buy/sell list, roster lookups, received proposals |
| **Making changes** | Changes phase: sending, accepting and rejecting proposals, synced to the platform |
| **Depends on** | [Player explorer](feature-player-explorer.md) (player identity and stats), [Platform connections](infra-platform-connections.md) (live roster and settings reads behind every current lookup and evaluation), [Data ETL & storage](infra-data-etl-and-storage.md), [Projections & rankings](feature-projections-and-rankings.md) (rest-of-season numbers behind evaluations); [Lineup management](feature-lineup-management.md)'s historical snapshots for past ownership only |
| **Biggest risk** | Trade quality rests on rest-of-season projections; and proposal actions must verifiably land on the platform |

## The problem

Trades are judged on gut feel, negotiated across platform apps, and leave no record. Finding a trade partner means opening every league and scanning every roster by hand to see who holds the player you want — and nothing tracks who you meant to buy or sell, or what offers came and went.

## What success looks like

| Goal | Target |
| --- | --- |
| A proposed trade evaluated | Under 1 minute, showing the effect on both teams |
| Finding every roster that holds a target player | One click from the buy list |
| Proposals handled (sent, accepted, rejected) from the app | In leagues whose platform supports it |
| Trade activity recorded | Every proposal and outcome stored in our database |

*Targets: **Owner-approved** (carried unchanged from the owner's Game-day lineup center and Waivers & trades PRDs, plus the owner's 2026-11-18 split instructions) · **Uncalibrated** — no formal measurements recorded; methods and observation windows are defined at calibration.*

## Not doing

| Not doing | Why not |
| --- | --- |
| In-app chat or negotiation messages with other managers | Conversation stays on each platform; the app handles proposals and decisions |
| A separate trade-value chart or dynasty rankings | Values come from [Projections & rankings](feature-projections-and-rankings.md), the same numbers used everywhere else |
| Advice on other managers' rosters | Beyond what a trade evaluation needs |
| Proposals sent without your confirmation | Every send, accept and reject is yours to approve |

## User stories

**Everyday**

- As the owner, I want to enter a proposed trade and see both teams' projected starter points and positional ranks before and after, so I can judge it quickly.
- As the owner, I want a private buy list and sell list per my account, so my trade targets are written down, not in my head.
- As the owner, I want to click a buy-list player and see every manager (and their roster) who holds him across my leagues, so I know exactly who to approach.
- As the owner, I want to click a sell-list player and see which of my own rosters hold him, so I know where I can offer him from.
- As the owner, I want to send a trade proposal from the app in leagues that support it, so the whole move happens in one place.
- As the owner, I want received proposals to appear here, each with an evaluation attached, so accepting or rejecting is an informed single step.

**When something's different**

- As the owner, I want a proposal involving an injured or bye-week player evaluated on rest-of-season numbers, so short-term noise doesn't decide a trade.

## Must have for launch

| Requirement | Done when |
| --- | --- |
| **Trade evaluator**: pick players from both sides, see each team's projected starter points per week and positional ranks before and after | Each evaluation reads or revalidates the league's current scoring, lineup slots, flex/superflex and any supported IDP rules, roster limits, deadline and rosters — then shows each team's **best legal starting lineup** before and after. Byes and short injuries count against this week, not rest-of-season value. How bench depth and unequal trades (e.g. 2-for-1) are counted is decided and shown (open questions below). Draft-pick trades are unsupported at launch |
| **Buy/sell list**, private to each user account, stored in MySQL | Players can be added/removed to either list from anywhere a player is shown; the list persists per user |
| **Buy-side lookup**: a buy-list player opens every manager and roster holding him across your connected leagues | Uses live, revalidated [Platform connections](infra-platform-connections.md) reads, showing each roster's last-verified time; [Lineup management](feature-lineup-management.md)'s weekly snapshots serve historical ownership only |
| **Sell-side lookup**: a sell-list player opens your own rosters that hold him | Same live source, scoped to your teams |
| **Received proposals** shown per league with an evaluation attached | Visible in the Viewing phase even before actions are possible |
| **Send / accept / reject proposals** in leagues whose platform supports it | Confirmation step first, settings and rosters revalidated at that moment; the proposal then follows its observed lifecycle (pending, accepted, awaiting league review, completed, rejected, canceled, expired, vetoed — as the platform supports). "Accepted" is never shown as "rosters changed" until the platform confirms completion; ambiguous outcomes stay visibly unresolved (the Overview's **verified platform action** term). Reading proposals and acting on them are independent capabilities — where action isn't supported, the app links to the platform |
| **Trade activity recorded** in MySQL | Every proposal and state transition the integration observes is persisted — league, teams, assets, source IDs, timestamps, original terms, observed outcome — and a change between polls never silently overwrites the prior state. Completeness is promised only for what the platform exposes |
| **Trade deadline**, verified, shown in the evaluator and the proposal inbox | Visible before any action is attempted |

## Should have soon after

| Requirement | Done when |
| --- | --- |
| **Deadline urgency** | Proposals and evaluations near a verified deadline are visually flagged |
| **Buy/sell list signals** | A listed player's injury status, role or projection change is surfaced on the list |

## Later

| Idea | Why it's parked |
| --- | --- |
| Trade offers suggested that help both teams | The deferred Data-driven recommendations feature (see the [Overview](00-overview.md)); needs the evaluator and the projections model proven |
| Cross-league trade exposure (how many teams depend on the same player) | Useful, not needed to execute trades |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |
| Time to evaluate a proposed trade | Each use | Under 1 minute |
| Proposal actions (send / accept / reject) offered in-app wherever the league's platform supports them | Each league | The capability matrix reflects reality; whether to act in-app or on the platform stays the user's choice (owner, 2026-11-18) |
| Trades recorded with full context | Across the season | Every one the integration observes, in every connected league |

*Targets: **Owner-approved** (carried unchanged from the owner's Game-day lineup center and Waivers & trades PRDs, plus the owner's 2026-11-18 split instructions) · **Uncalibrated** — no formal measurements recorded; methods and observation windows are defined at calibration.*

Proposed reliability targets from the [2026-11-18 PRD review](../design/reviews/2026-11-18-chatgpt_PRD_Review_and_Recommendations.docx) — **uncalibrated; validate against the first live integration before treating any as a release gate**: p95 ≤ 2 s to compute an evaluation after validation succeeds; 100% of ownership lookups from current verified reads (zero served quietly from snapshots); fixture-suite pass on scoring, eligibility, flex/superflex and unequal trades; zero false "completed" states.

## Open questions

| Question | Blocks building? | Who answers | Status |
| --- | --- | --- | --- |
| Which platforms expose trade proposals through their APIs — reading them, sending, accepting, rejecting? (Yahoo documents transactions; Sleeper and ESPN need verification) | Yes, answer first | Engineering | Open |
| Should the evaluator count bench depth, or starters only? | No, answer during build | You | Open |
| Does the buy/sell list carry notes or target prices per player? | No, answer during build | You | Open |
| Do any platforms expose draft-pick trades, and do we support them in a later phase? | No, answer during build | Engineering (support), you (scope) | Open |
| Do recorded trades include other managers' trades in your leagues, or only your own? | No, answer during build | You | Open |

## Build order

1. Trade evaluator (Viewing phase; needs projections and league rosters)
2. Buy/sell list with both roster lookups
3. Received proposals, with evaluations attached
4. Sending, accepting and rejecting, per platform support; activity recording throughout
