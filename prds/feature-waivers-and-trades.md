# Waivers & trades

**For each league, shows which free agents would actually improve your roster, keeps every waiver deadline in view, and tells you what a trade does to both teams.**

**Last updated:** 2026-11-09 · moved from the online PRD doc; links updated

## At a glance

|  |  |
| --- | --- |
| **Serves** | Waiver night, and weighing a trade |
| **Viewing data** | Viewing phase: the finder, waiver calendar and trade evaluator |
| **Making changes** | Changes phase: submitting claims and drops |
| **Depends on** | [Player explorer](feature-player-explorer.md) (its player table is the base for the free-agent finder), [Platform connections](infra-platform-connections.md), [Data ETL & storage](infra-data-etl-and-storage.md), and the shared terms on the [Overview](00-overview.md) |
| **Biggest risk** | Trade decisions need better rest-of-season projections than the simple formula |

## The problem

Every week you decide waiver claims and trades in each league, under different waiver rules (a bidding budget or a priority order), different scoring and different roster needs.

Today that means checking each league's free agents separately, with no view of where each team is weak. Good pickups get missed and trades are judged on gut feel.

## What success looks like

| Goal | Target |
| --- | --- |
| A ranked list of free agents who'd improve each roster | Ready before each league's waiver deadline |
| Claims or bids for every league prepared | Under 10 minutes a week |
| A proposed trade evaluated | Under 1 minute, showing the effect on both rosters |
| Waiver deadlines missed | Zero over the season |

## Not doing

| Not doing | Why not |
| --- | --- |
| Sending trade offers or messages to other managers | Negotiating stays on each platform |
| A separate trade-value chart or dynasty rankings | Values come from the same projections used everywhere else |
| Claims made without your confirmation | Every claim is yours to approve |
| Advice on other managers' rosters | Beyond what a trade evaluation needs |

## User stories

**Everyday**

- As the owner, I want each league's weakest starting positions pointed out, so I know what to look for on waivers.
- As the owner, I want free agents ranked by how much they'd add to my starting lineup in that league, so I claim the right player.
- As the owner, I want a suggested bid range in leagues with a bidding budget, so I neither overpay nor lose a key player.
- As the owner, I want every league's waiver deadline and my claims in one place, so I never miss one.
- As the owner, I want to know who to drop when I claim someone, so my roster stays legal and I keep my best depth.
- As the owner, I want to enter a proposed trade and see both teams' projected starter points before and after, so I can judge it quickly.

**When something's different**

- As the owner, I want a free agent who's on bye or injured this week to show when he becomes useful, not be ranked as worthless.

## Must have for launch

| Requirement | Done when |
| --- | --- |
| **Team needs** in each league: every starting position ranked against the rest of that league | Uses the positional strength measure defined on the [Overview](00-overview.md) |
| **Free-agent finder** in each league: available players ranked by how many points they'd add over your weakest starter they could replace. Switch between this week and rest of season | Rankings use that league's own scoring, not a default. Players already rostered in that league never appear |
| **Waiver calendar**: every league's next waiver run, its type (bidding budget or priority order), your remaining budget and current priority | A league with a deadline within 24 hours and no claim set is flagged |
| **Trade evaluator**: pick players from both sides and see each team's projected starter points per week and positional ranks, before and after | Shows the change for both teams, not just yours. Bye weeks and current injuries are reflected in rest-of-season numbers |

## Should have soon after

| Requirement | Done when |
| --- | --- |
| **Submit claims and drops** in leagues where changes are possible | Every claim shows a confirmation step first |
| **Suggested bid range** in leagues with a bidding budget | Based on the player's projected gain and the league's remaining budgets |
| **Drop suggestions** | Suggests the lowest-value bench player, protecting players coming back from injury or bye |
| **Trending pickups** across platforms | Shown as a signal beside each free agent (Sleeper's public API lists trending players) |

## Later

| Idea | Why it's parked |
| --- | --- |
| Trade offers suggested that help both teams | Needs the trade evaluator proven first |
| How many of your teams depend on the same NFL player | Useful across leagues, but not needed for weekly decisions |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |
| Time spent on waivers across all leagues | Each week | Under 10 minutes |
| Points per week added by pickups, compared with the players they replaced | Across the season | Positive in every league |
| Waiver deadlines missed | Across the season | Zero |

## Open questions

| Question | Blocks building? | Who answers | Status |
| --- | --- | --- | --- |
| Where will rest-of-season projections come from? The simple formula may be too weak for trade decisions | Yes, answer first | Engineering | Open |
| Do all three platforms give waiver deadlines, bidding budgets and priority order through their APIs? | Yes, answer first | Engineering | Open |
| Should the trade evaluator count bench depth, or starters only? | No, answer during build | You | Open |
| Can claims be submitted on Sleeper and Yahoo, or only immediate free-agent adds? | No, answer during build | Engineering | Open |

## Build order

1. Waiver calendar
2. Team needs and free-agent finder
3. Trade evaluator
4. Submitting claims and drops, once each platform supports changes
