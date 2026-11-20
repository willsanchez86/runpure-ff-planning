# NFL scores and schedule

**Every NFL game by week — schedule, final scores and game detail — from public data, no league needed. One of the three Phase 1 screens, and a read-only companion to the [Player explorer](feature-player-explorer.md).**

**Created:** 2026-11-15 · **Owner:** William Sanchez

**Last updated:** 2026-11-16 — reconciled to the frontend implementation spec ([`specs/ff-nfl-scores-and-schedule-spec.md`](../specs/ff-nfl-scores-and-schedule-spec.md), owner decisions NS1–NS3): the screen opens on the regular season at the current week, preseason only on request (open question answered); rest days and the division-game marker ship in Phase 1. Earlier 2026-11-15 — written during the prototype→PRD reconciliation; the owed PRD section the [interface design brief](../design/interface-design-brief.md) flagged. The Phase 1 prototype at [`../prototypes/phase1/`](../prototypes/phase1/) is the reference implementation.

## At a glance

|  |  |
| --- | --- |
| **Status** | **In use (local)** — spec implemented on the live contract with real team logos (2026-11-17). Hosted deployment deferred ([Overview](00-overview.md)) |
| **Serves** | Seeing the week's games, final scores and matchups, and jumping from a game to that team's players, before or without connecting a league |
| **Viewing data** | Phase 1: one of the first three screens, before any league is connected |
| **Making changes** | None. View only |
| **Depends on** | [Data ETL & storage](infra-data-etl-and-storage.md), for the schedule/game data (teams, kickoff times, final scores, venue, weather, betting line, starting QBs and coaches). No league needed. Signing in is required, as for every screen ([ADR-0015](../design/decisions/ADR-0015-authenticate-users-with-firebase-authentication.md)) |
| **Becomes** | The schedule and matchup source the league screens (Game-day, Weekly review) build on later |

## The problem

Without a connected league, you still want the week at a glance: who plays whom, when, the final scores, and the matchup detail behind a game. Platform apps show this only through your league; stats sites scatter it across pages. And until a league is connected, the app needs its own schedule surface.

## What success looks like

| Goal | Target |
| --- | --- |
| Every game of the selected week listed | All of them, for preseason, regular season and postseason |
| Final scores after game nights | Loaded by the 06:00 Eastern daily run, once nflverse has published them |
| Reading a game's detail | One click on the game opens stadium, roof, surface, weather, line and starters |
| Getting from a game to its players | One click on a team code filters the Player list to that team |

*Targets: **Owner-approved** (baselined 2026-11-15/16; freshness follows the owner's daily-run decision, ETL D7) · **Uncalibrated** — no formal measurements recorded; methods and observation windows are defined at calibration.*

## Not doing

| Not doing | Why not |
| --- | --- |
| Live, in-game scores and play-by-play on this screen | Phase 1 refreshes once a day; nothing is live. In-game states arrive with the Game-day live board in a later phase |
| Odds beyond the stored pregame line and total | The feed carries the pregame line/total only; live or historical odds movement needs a separate source |
| Standings and playoff pictures | A league/analytics concern; comes with Weekly review |

## User stories

- As the owner, I want to pick a week and see every game, so I know the slate at a glance.
- As the owner, I want final scores with overtime marked, so I can see how games ended.
- As the owner, I want to open a game for its stadium, roof, surface, weather, betting line, starting QBs and coaches, so I understand the context.
- As the owner, I want to see which teams are on bye that week, so I can account for missing players.
- As the owner, I want to click a team and land on the Player list filtered to that team, so I can move from a game to its players.

## Must have for launch

| Requirement | Done when |
| --- | --- |
| **Week picker** across preseason, regular season and postseason | Picking a week lists that week's games |
| **Game list**: away and home team, kickoff day and time, final score with overtime marked, and the teams on bye that week | Scores appear once played; unplayed games show kickoff only; byes are listed |
| **Game detail** on a game: stadium, roof, surface, temperature, wind, betting line and total, starting QBs, head coaches | Opening a game shows every detail the feed carries; missing values read as gaps, never zeros |
| **Team → Player list**: a team code filters the Player list to that team | Clicking a team code opens the Player list already filtered |
| **Freshness** | The screen shows when its data last loaded; data older than 24 hours in season is marked |

## Should have soon after

| Requirement | Done when |
| --- | --- |
| **Rest days and division-game marker** on the game detail — *ships in Phase 1* (owner, 2026-11-16; spec NS2: the feed already carries both) | Shown where the feed carries them |
| **Jump from a game to either team's upcoming schedule** | One click opens that team's remaining games |

## Later

| Idea | Why it's parked |
| --- | --- |
| Live in-game scores and a game-tracker | Needs a live source and in-game states; arrives with the Game-day live board |
| Weather forecasts for upcoming games | The feed carries played-game conditions, not forecasts. Forecasts are their own PRD ([Weather](feature-weather.md)); its provider and phase are open questions there |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |
| Age of scores and schedule | Daily | Never more than 24 hours old in season |
| Getting from a game to a team's players | Each use | One click |

*Targets: **Owner-approved** (baselined 2026-11-15/16; freshness follows the owner's daily-run decision, ETL D7) · **Uncalibrated** — no formal measurements recorded; methods and observation windows are defined at calibration.*

## Open questions

| Question | Blocks building? | Who answers | Status |
| --- | --- | --- | --- |
| How soon after each game do final scores become final in nflverse? | No, answer during build | Engineering | Open (shared with the Player explorer) |
| Should preseason be shown by default, or only on request? Answered (owner, 2026-11-16; spec NS1): only on request — the screen opens on the regular season at the current week, then the postseason once it starts | No, answer during build | You | Answered |

## Build order

1. Week picker and the game list with scores and byes
2. Game detail (venue, weather, line, starters, coaches)
3. Team code → filtered Player list
