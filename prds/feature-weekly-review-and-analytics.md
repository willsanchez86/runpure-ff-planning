# Weekly review & analytics

**Explains why each team is winning or losing (luck, points left on the bench, weak positions, consistency) with views you can switch and configure, across every league.**

**Last updated:** 2026-11-09 · moved from the online PRD doc; links updated

## At a glance

|  |  |
| --- | --- |
| **Serves** | The weekly review: how did I do, how lucky was I, what did I leave on the bench |
| **Viewing data** | Viewing phase. A working version already exists on sample data |
| **Making changes** | None. This feature only reads |
| **Depends on** | [Player explorer](feature-player-explorer.md) (its player table is the base for the team and player tables here), [Platform connections](infra-platform-connections.md) and [Data ETL & storage](infra-data-etl-and-storage.md) |
| **Main work** | Moving the existing views onto real data, not designing new ones |

## The problem

Platform apps show standings and box scores but little about why a team wins or loses. You want deeper views than existing apps offer, switchable and configurable, across all your leagues.

The views already work on made-up data. This page defines them properly so they can run on real data.

## What success looks like

| Goal | Target |
| --- | --- |
| Every existing view runs on real data from every league, with that league's own scoring | All views, all leagues |
| Every calculated measure means the same thing everywhere it appears | One definition each, listed on the [Overview](00-overview.md) |
| Reviewing one league's week | Under 2 minutes |
| Your choices of columns, ranges and sorting | Remembered between visits |

## Not doing

| Not doing | Why not |
| --- | --- |
| Professional-grade projections | Starts with the simple formula; a better source is an open question |
| Past seasons | Current season only |
| Sharing or public league reports | It's a personal tool |
| Advanced NFL stats, such as how often a receiver runs routes | Not among the loaded datasets yet; parked under [Data ETL & storage](infra-data-etl-and-storage.md), Later |

## User stories

**Everyday**

- As the owner, I want standings with an all-play record and a luck score, so I know whether my record reflects my team's real strength.
- As the owner, I want to see the points I left on my bench each week, so I can make better lineup calls.
- As the owner, I want a team-by-week heatmap I can switch between points, margin, bench points and weekly rank, so I can spot patterns quickly.
- As the owner, I want each team's starter strength by position, ranked against the league, so I know where to improve and who to trade with.
- As the owner, I want to compare up to four players week by week, so I can make start, sit and trade decisions.
- As the owner, I want to choose which columns a player table shows and over what range (season, last 5 games, last 3 games), so I see what matters to me.

**When something's different**

- As the owner, I want weeks a player missed or had a bye to show as gaps, not zeros, so averages aren't misleading.

## Must have for launch

| Requirement | Done when |
| --- | --- |
| **League picker** across every connected league | Every view uses the selected league's scoring |
| **Standings and power** with all-play record, luck, bench points, power score and streak | Sortable by any column |
| **Weekly heatmap** switchable between points, margin, bench points and weekly rank | Shows a colour scale key and exact values on hover |
| **Positional strength**: starter points stacked by position, next to a league rank grid | Ranks match the positional strength definition on the [Overview](00-overview.md) |
| **Team and player tables** with a column chooser, range switch and sorting. The player table filters by position and by who owns the player | Every column's tooltip matches its definition on the [Overview](00-overview.md) |
| **Player comparison**: up to four players on one weekly chart, with next week's projection | Missed weeks show as breaks in the line |
| **Gaps, not zeros** for missed games and byes in every average, chart and small trend line | A player who missed week 3 has his average divided by games actually played |
| **Remembered settings**: columns, ranges, filters and selected league | Reopening the app restores them. Stored per user account, not in the browser only ([ADR-0001](../design/decisions/ADR-0001-design-for-multiple-users-from-day-one.md); system design §0, row 1) |

## Should have soon after

| Requirement | Done when |
| --- | --- |
| **Every league in one table**: record, place, power rank and luck per league | One row per league |
| **Scoring "what if"**: view any league under full point per reception, half point or standard scoring, as in the working version | Doesn't change the league's real settings |
| **Download any table** as a spreadsheet file | Opens correctly in Excel and Google Sheets |

## Later

| Idea | Why it's parked |
| --- | --- |
| A better projection source to replace the simple formula | Needs a source chosen first |
| Comparing this season with past ones | Needs more than one season stored |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |
| Time to review each league's week | Each week | Under 2 minutes |
| How often you open these views | Each week | At least once |
| Your points left on the bench per week | Across the season | Trending down |

## Open questions

| Question | Blocks building? | Who answers | Status |
| --- | --- | --- | --- |
| Do all three platforms give weekly points per player, or must the app recalculate them from raw stats using each league's scoring? Answered: recalculate. Data ETL & storage stores stats before scoring, and the app calculates each league's points from them ([ADR-0007](../design/decisions/ADR-0007-calculate-fantasy-points-in-the-app-from-stored-stats.md)) | Yes, answer first | Engineering | Answered |
| Is the power score's 60 / 25 / 15 weighting right, or should you be able to adjust it? | No, answer during build | You | Open |
| Is the simple projection good enough for win probability, or should win probability wait for a better source? | No, answer during build | Data | Open |

## Build order

1. Rebuild the working version's data layer on the shared data model
2. Connect the existing views to it, one at a time
3. Add the every-league table and spreadsheet downloads

This can run alongside the game-day lineup center once viewing data from each platform works.
