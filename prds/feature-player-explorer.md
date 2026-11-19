# Player explorer

**Every NFL player in one table you can sort, filter and configure, with no league needed. It's the first feature to build (after Data ETL & storage), and the base for every other player table in the app.**

**Last updated:** 2026-11-18 · governance correction: open question Q3, closed in 2026-11-08 on Claude's recommendation, is ratified via the owner's PE3/PE4 decisions. Earlier 2026-11-17 · IDP removed from Phase 1 (owner, during cut-over testing; spec PE5): the list covers QB/RB/WR/TE/K and team defenses; individual defensive players return in a later phase if an IDP league needs them. Earlier 2026-11-16 · reconciled to the frontend implementation specs (owner decisions PE1–PE4, [`specs/ff-player-explorer-spec.md`](../specs/ff-player-explorer-spec.md)): the list gains its own season selector covering 2022 to the current season; prior seasons load real stored data on demand, so the previously recorded prior-season limits (estimated ranks, blank results) no longer apply; incremental "show more" paging is replaced by virtualized scrolling of the full list. Earlier (2026-11-15): reconciled to the Phase 1 prototype (the as-built design is the Phase 1 spec): dropped the "last 3 games" column, added a combined IDP position filter, a per-game/totals toggle and a Rookies filter, noted the Expanded profile and Compare as realized in Phase 1, and recorded the prior-season limits. Earlier (2026-11-12): range switch set to the full season or a custom range of weeks; player-detail scope expanded under Should have soon. Earlier (2026-11-09): sign-in requirement (ADR-0015), game-night stats timing (ETL spec D7) and per-account settings (ADR-0001) aligned with decisions

## At a glance

|  |  |
| --- | --- |
| **Status** | **In use (local)** — spec implemented ([ff-player-explorer-spec](../specs/ff-player-explorer-spec.md)), integration-tested on real data and polished (2026-11-17); running locally daily. Hosted deployment deferred ([Overview](00-overview.md)) |
| **Serves** | Looking up and comparing any player, any time, before or without connecting a league |
| **Viewing data** | Phase 1: the first feature built, before any league is connected |
| **Making changes** | None. View only |
| **Depends on** | [Data ETL & storage](infra-data-etl-and-storage.md), for NFL player data and weekly stats. No league needed. Signing in to the app is required, as for every screen ([ADR-0015](../design/decisions/ADR-0015-authenticate-users-with-firebase-authentication.md)) |
| **Becomes** | The base for the player tables in [Lineup management](feature-lineup-management.md), [Trades](feature-trades.md) and [Weekly review & analytics](feature-weekly-review-and-analytics.md) |

## The problem

Platform apps mostly show players through your league: your roster, other rosters, free agents. Looking across every player, sorted and filtered the way you want, means going to separate stats sites with fixed views.

And until a league is connected, the app has nothing to show.

## What success looks like

| Goal | Target |
| --- | --- |
| Every active NFL player listed | All of them, refreshed at least once a day |
| Finding a specific player by name | Under 5 seconds |
| Re-sorting or re-filtering the full list | Results update in under half a second |
| Your sorting, filters, columns and scoring | Remembered between visits |
| Stats after game nights | Loaded by the 06:00 Eastern daily run after each game (ETL spec D7), once nflverse has published them (open question below) |

*Targets: **Owner-approved** (original PRD, baselined 2026-11-09) · **Uncalibrated** — no formal measurements recorded; methods and observation windows are defined at calibration.*

## Not doing

| Not doing | Why not |
| --- | --- |
| Who owns a player, or whether he's a free agent | Needs a connected league; arrives with [Lineup management](feature-lineup-management.md) |
| Your league's exact custom scoring | No league yet; standard scoring options until one is connected |
| News articles in Phase 1 | Phase 1 shows each player's injury status only. News is its own PRD ([News & updates](feature-news-and-updates.md)); its provider is an open question there |
| Projections in Phase 1 | No projection source in Phase 1: nflverse has none, and Sleeper's come only from an undocumented endpoint. The [Projections & rankings](feature-projections-and-rankings.md) model replaces the placeholder in its own phase |

## User stories

**Everyday**

- As the owner, I want to see every player in one list without connecting a league, so I can use the app from day one.
- As the owner, I want to sort by any column (total points, points per game, recent form, consistency), so the players that matter to me rise to the top.
- As the owner, I want to filter by position, NFL team, injury status and bye week, so I can narrow the list quickly.
- As the owner, I want to search by name, so I can jump straight to a player.
- As the owner, I want to switch between full point per reception, half point and standard scoring, so the numbers match how I play.
- As the owner, I want to choose which columns appear and over what range (the full season, or a custom range of weeks), so I see what matters to me.
- As the owner, I want to open a player and see his week-by-week numbers, so I understand how his points were made.

**When something's different**

- As the owner, I want games played shown next to averages, so a rookie with two big games doesn't look like a star.
- As the owner, I want missed weeks and byes shown as gaps, not zeros, so averages aren't dragged down.
- As the owner, I want a player traded mid-season to show his current team, with each past week showing the team he played for then.

## Must have for launch

| Requirement | Done when |
| --- | --- |
| **Full player list**: every active player at QB, RB, WR, TE, K and team defense, with NFL team, position, age, bye week and injury status *(individual defensive positions removed from Phase 1 — owner, 2026-11-17, spec PE5)* | Refreshed at least once a day. The full list loads and scrolls smoothly |
| **Weekly stats and fantasy points** for every week each player has played | Points recalculate instantly when the scoring switch changes |
| **Sorting** on any column | One click sorts, a second click reverses. Ties are broken by name |
| **Filters**: position (including a combined running back, receiver and tight end option), NFL team, injury status, bye week, minimum games played, rookies *(the combined IDP option left with IDP — spec PE5)* | Filters combine. The number of matching players is always shown. One "Clear all" resets them |
| **Name search** | Finds partial names and ignores capitals and accents |
| **Scoring switch**: full point per reception, half point, standard, plus tight end premium and 6-point passing touchdowns | Every number on the page updates together |
| **Range switch**: the full season, or a custom range of weeks (for example weeks 4–9), with a per-game or totals toggle for counting stats | Applies to averages, totals, highs, lows and volatility. Fixed last-5 and last-3 windows were removed (owner, 2026-11-12) as they don't match how the list is used |
| **Column chooser**: total points, points per game, high, low, volatility, games played, snap share, target share, next opponent and its difficulty, bye week, weekly trend line | Turning a column on or off doesn't reset the sort or filters |
| **Player detail** | Clicking a player shows his stats and points for each week |
| **Remembered settings** | Reopening the app restores sort, filters, columns, range and scoring. Stored per user account, not in the browser only ([ADR-0001](../design/decisions/ADR-0001-design-for-multiple-users-from-day-one.md); system design §0, row 1). When the server can't be reached, the local mirror serves and changes sync when it returns (foundation spec F7) |

## Should have soon after

*The Phase 1 prototype already realizes the **Expanded player profile** and **Compare from the list** below; they ship in Phase 1 rather than after. The rest remain post-Phase-1.*

| Requirement | Done when |
| --- | --- |
| **Saved views**: name a combination of filters, sort and columns, such as "Waiver running backs" | One click restores it |
| **Compare from the list**: tick up to four players and open them side by side; keep several player profiles open as tabs | The comparison opens with those players loaded; each tab holds one profile |
| **Expanded player profile**: the player detail opens as a profile with a game log (the position's stat line, fantasy points, snap share, final score and win/loss, byes and missed weeks as gaps, and upcoming weeks shown with their matchup difficulty), plus splits, usage and advanced-stat trends, a consistency view, position rank over time, and a season-by-season career table. The profile's sections are tabs that swap content (not one long scroll) | Each view follows the scoring and range controls; a season selector on the profile covers 2022 to the current season ([ADR-0006](../design/decisions/ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md)), and the list has its own season selector over the same range (owner, 2026-11-16; [`specs/ff-player-explorer-spec.md`](../specs/ff-player-explorer-spec.md) PE3). Prior seasons load on demand from stored data, so prior-season ranks follow the scoring switch and past results show real scores — the prototype's estimate/blank limits do not apply to the build (spec PE2) |
| **Grouped columns, view presets and advanced columns** (air-yards share, usage, efficiency), configured in a columns-and-filters panel | Choosing a preset or toggling columns keeps the sort and filters |
| **Next week's projection** as a column, after Phase 1 | Uses the projection definition on the [Overview](00-overview.md) |
| **Download the current view** as a spreadsheet file | Opens correctly in Excel and Google Sheets |

## Later

| Idea | Why it's parked |
| --- | --- |
| Filters for "free agents in my league" and "on my teams" | Need connected leagues; come with [Lineup management](feature-lineup-management.md) |
| Your league's exact scoring applied to the whole list | Needs a connected league |
| A watchlist that flags changes in status or role | Useful, but not needed to browse and sort |
| Individual defensive players (DB, DL, LB) | Removed from Phase 1 (owner, 2026-11-17, spec PE5); return with an IDP league in a later phase |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |
| Time to find a specific player | Each use | Under 5 seconds |
| Age of the player list and stats | Daily | Never more than 24 hours old |
| How often you open the explorer | Each week | At least once |

*Targets: **Owner-approved** (original PRD, baselined 2026-11-09) · **Uncalibrated** — no formal measurements recorded; methods and observation windows are defined at calibration.*

## Open questions

| Question | Blocks building? | Who answers | Status |
| --- | --- | --- | --- |
| Which source gives every player's weekly stats? Answered: nflverse weekly player stats, team stats and snap counts, loaded by Data ETL & storage | Yes, answer first | Engineering | Answered |
| How soon after each game do that source's stats become final? | No, answer during build | Engineering | Open |
| Should kickers and team defenses share the main table, or get their own view, since their stats differ? Claude's 2026-11-08 proposal: one main table with a position filter; filtering to K or team defense shows their own stat columns. Ratified by the owner's PE3/PE4 decisions (2026-11-16, [player spec](../specs/ff-player-explorer-spec.md) §0.2), which explicitly approved the single season-switchable list with per-position column sets | No, answer during build | You | Approved (owner, via PE3/PE4) |
| Should players outside active rosters (practice squad, unsigned) be included? Answered: no, unless they play (a player appears once he has a weekly stats row) | No, answer during build | You | Answered |

## Build order

1. Player list with search, filters and sorting
2. Weekly stats and the scoring switch
3. Column chooser, range switch and player detail
4. Saved views, compare, projections and download
