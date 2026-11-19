# News & updates

**Player news and NFL updates inside the app, so lineup and waiver decisions never require leaving for another site or feed.**

**Last updated:** 2026-11-18 · created at the owner's direction; [PRD review](../design/reviews/2026-11-18-chatgpt_PRD_Review_and_Recommendations.docx) applied the same day: source-authorization gate, tagging/dedup rules, honest staleness

## At a glance

|  |  |
| --- | --- |
| **Status** | **Requirements** — PRD created 2026-11-18; not yet scheduled (phase and source are open questions) |
| **Serves** | Staying current on the players you manage, while deciding |
| **Viewing data** | Not yet scheduled — after Phase 1; exact phase is an open question below |
| **Making changes** | None. View only |
| **Depends on** | [Data ETL & storage](infra-data-etl-and-storage.md) (player identity to tag news against), [Player explorer](feature-player-explorer.md) (the player card is the first surface) |
| **Biggest risk** | Finding a news source that is licensed for this use, reliable, and tags players well |

## The problem

The data pipeline carries stats and injury designations, but the *why* behind them — a benching, a trade, a coach's comment, a late scratch — lives on Twitter, platform apps and news sites. Every decision in the app today sends you somewhere else to check what happened.

## What success looks like

| Goal | Target |
| --- | --- |
| News relevant to a player visible where he's shown | On the player card, without leaving the app |
| Time from a story breaking to it appearing in the app | Within the refresh cadence chosen for the source |
| Checking "did anything happen?" across your players | One feed, one glance |

*Targets: **Owner-approved** (2026-11-18) · **Uncalibrated** — no formal measurements recorded; methods and observation windows are defined at calibration.*

## Not doing

| Not doing | Why not |
| --- | --- |
| **Notifications** (push/email when news breaks) | Deferred, high priority — see Deferred features on the [Overview](00-overview.md). Needs a delivery channel; the in-app surfaces come first |
| **AI-generated articles** | Deferred — see Deferred features on the [Overview](00-overview.md) |
| Our own reporting or scraping sites that forbid it | Source must permit the use |
| Rumor aggregation or fantasy "hot takes" | Facts and reported news only |

## User stories

**Everyday**

- As the owner, I want recent news on a player's card, so I see the story behind a stat line or injury tag.
- As the owner, I want one feed of league-wide NFL news, so I can catch up in one place.
- As the owner, I want each item timestamped and sourced, so I know how fresh and trustworthy it is.

**When something's different**

- As the owner, I want late-breaking inactive news close to kickoff surfaced prominently, so I can react before lock.

## Must have for launch

| Requirement | Done when |
| --- | --- |
| **Source authorization gate** | The provider is selected only after display/reuse rights, timeliness, rate limits, player identifiers and link-back ability are verified and recorded in the spec; no content ships from a source whose redistribution terms aren't confirmed |
| **Player-tagged news** on the player card | The card shows that player's recent items, newest first, each with source and timestamp |
| **Tagging, dedup and provenance** | Items map to canonical player IDs with same-name players disambiguated; syndicated duplicates are collapsed; original publication time is shown distinct from ingestion time; unmatched items are logged, never attached to the wrong player |
| **News feed** screen or panel: league-wide items, newest first | Filterable to a position; every item links to its source |
| **Freshness** | The feed shows when it last *successfully* refreshed (not last attempted); a source outage is visible, and the feed never implies completeness it doesn't have |

## Should have soon after

| Requirement | Done when |
| --- | --- |
| **"My players" filter** | Once leagues are connected (Viewing phase), the feed filters to players on your rosters |
| **Injury-news pairing** | A player whose injury designation changed shows the news item that explains it, when one exists |
| **Lineup problem link** | A confirmed status change (ruled out, moved to injured reserve) links into [Lineup management](feature-lineup-management.md)'s problem list; the platform's current roster and status data still governs whether a swap is legal |

## Later

| Idea | Why it's parked |
| --- | --- |
| Notifications when news breaks on a rostered player | Deferred feature (Overview); needs a delivery channel and quiet-hours rules |
| AI summaries of a player's news week | Deferred feature (Overview) |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |
| Decisions made without leaving the app for news | Weekly, once live | Most of them |
| Staleness: oldest "new" item age vs. source publish time | Continuous | Within one refresh cycle |

*Targets: **Owner-approved** (2026-11-18) · **Uncalibrated** — no formal measurements recorded; methods and observation windows are defined at calibration.*

Proposed reliability targets from the [2026-11-18 PRD review](../design/reviews/2026-11-18-chatgpt_PRD_Review_and_Recommendations.docx) — **uncalibrated; validate against the chosen source before treating any as a release gate**: ≥ 98% tagging precision on a manually reviewed sample; items displayed within the source-cadence SLA; 100% of items attributed with source link and publish time.

## Open questions

| Question | Blocks building? | Who answers | Status |
| --- | --- | --- | --- |
| Which news source? (candidates to evaluate: Sleeper's public player-news data, ESPN news API, RSS from major outlets; licensing and player-tagging quality decide) | Yes, answer first | Engineering | Open |
| Which phase does this land in? | Yes — scheduling | You | Open |
| How long are items retained in our database, and are they stored at all or fetched live? | No, answer during build | Engineering | Open |

## Build order

1. Source chosen and verified (licensing, tagging, cadence)
2. Player-tagged items on the player card
3. The league-wide feed
4. "My players" filter, once leagues are connected
