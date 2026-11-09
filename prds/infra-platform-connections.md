# Platform connections

**Brings every league from Sleeper, Yahoo and ESPN into one place, and tells you exactly what the app can and can't do in each one.**

**Last updated:** 2026-11-09 · moved from the online PRD doc; links updated. Shared platform facts and terms: [Overview](00-overview.md).

## At a glance

|  |  |
| --- | --- |
| **Serves** | Every league-based journey. No league feature works until this does |
| **Viewing data** | Viewing phase (after Phase 1) |
| **Making changes** | Changes phase: Yahoo first, then Sleeper |
| **Depends on** | [Data ETL & storage](infra-data-etl-and-storage.md): the nflverse `player` table the player crosswalk maps to |
| **Biggest risk** | Sleeper and ESPN changes rely on unofficial methods that can break without warning |

## The problem

Your leagues are split across three apps, each with its own sign-in and its own way of describing a league. Every other feature needs them in one place.

Each platform also allows different things. Without a layer that knows those limits, the app would either show out-of-date data or offer buttons that silently fail.

## What success looks like

| Goal | Target |
| --- | --- |
| All current-season leagues on all three platforms load | 100% in the first week of use |
| Data is fresh during live games | No more than 60 seconds old |
| Data is fresh the rest of the week | No more than 15 minutes old |
| A broken connection is never shown as current data | Flagged within one refresh |
| Changes you make appear in each platform's own app | Every change checked against the platform afterwards |

## Not doing

| Not doing | Why not |
| --- | --- |
| Other users or shared accounts in Phase 1 | Phase 1 has one user. The design still supports multiple users from the start, per the multi-user guardrail in the system design |
| Other platforms (CBS, NFL.com, Fleaflicker) | You don't play there. The design shouldn't rule them out later |
| Commissioner actions, like editing league settings | You act as a manager here; commissioner tools stay on each platform |
| Storing any password | Sleeper uses a username and later a token, Yahoo its own login page, ESPN two browser cookies |
| Past seasons | Current season only for now |
| Connecting leagues in Phase 1 | Phase 1 recreates Sleeper's screens with no leagues connected, so it needs no platform sign-ins. This page's work starts in a later phase |

## User stories

**Everyday**

- As the owner, I want to connect Sleeper by typing my username, so my leagues appear without handing over a password.
- As the owner, I want to sign in to Yahoo once on Yahoo's own page, so my leagues stay connected without weekly re-entry.
- As the owner, I want to paste my ESPN cookies once, so my private ESPN leagues load.
- As the owner, I want to see what the app can do in each league, so I know when I still need the platform's own app.
- As the owner, I want my lineup and roster changes to show up in each platform's own app, so this is the only place I need.

**When something goes wrong**

- As the owner, I want a clear warning when a connection breaks or a sign-in expires, so I never act on stale data.
- As the owner, I want a league where changes aren't possible to show as view-only, not disappear.

## Must have for launch

| Requirement | Done when |
| --- | --- |
| **One shared data model** for leagues, teams, roster slots, players, matchups, transactions, scoring rules and what each league allows | Every screen reads from this model only, never from a platform directly |
| **Sleeper: view data** using your username and Sleeper's official public API | Typing a username loads every current-season league with rosters, matchups and settings. The full player list is fetched at most once a day. Requests stay under Sleeper's limit of 1,000 a minute |
| **Yahoo: view data** through Yahoo's official sign-in | After approving access on Yahoo's page, leagues load and stay connected without asking again |
| **ESPN: view data** using your two ESPN cookies | Valid cookies load your private leagues. Expired cookies show "Reconnect needed" on the league |
| **One record per real player** across all three platforms | A player on two platforms shows once, with both rosters listed. Unmatched players are listed for you to match by hand, never dropped |
| **Connection health** for each platform | Each shows its last successful update and a status: OK, Out of date, Broken or Reconnect needed. Out-of-date data is visibly marked |
| **Sign-ins held by the Express backend** ([ADR-0008](../design/decisions/ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md)), per user | Sign-ins are stored encrypted, with the key outside the database (system design §0, row 4), and never sent to the browser |
| Live game-day refresh: during game windows, poll each connected league's live matchups and scores on all three platforms; set lock status from kickoff times; refresh game-day player status. Moved here from Data ETL & storage | Live values no more than 60 seconds old during games; each platform's rate limit respected; replaced by final data once games end |

## Should have soon after

| Requirement | Done when |
| --- | --- |
| **Yahoo: make changes** (set lineup, add and drop players) | After you confirm, the app sends the change, re-reads the roster from Yahoo, and shows success only if Yahoo matches |
| **Sleeper: make changes** using a pasted Sleeper sign-in token, behind an "Allow changes" switch | Every change shows a confirmation listing exactly what will change |
| **Change history** | Every attempted change is logged with time, league, what changed and whether it worked |

## Later

| Idea | Why it's parked |
| --- | --- |
| ESPN: make changes | No reliable method known yet |
| More platforms | Only if you join leagues elsewhere |
| Instant updates instead of checking every 60 seconds | Only where a platform offers it |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |
| Leagues connected | First week | All of them |
| Times out-of-date data was shown without a warning | Ongoing | Zero |
| Weeks with a connection broken for over 24 hours | Across the season | Fewer than 2 |
| Confirmed changes that matched the platform afterwards | Across the season | All of them |

## Open questions

| Question | Blocks building? | Who answers | Status |
| --- | --- | --- | --- |
| Do Sleeper's and ESPN's terms of service allow automated use of their private systems and your cookies? Read before building any way to make changes. Moved from Data ETL & storage (Q2) | Yes, answer first | You | Open |
| Which shared player-ID list is current and covers all three platforms? Answered: one player crosswalk maps Sleeper, Yahoo and ESPN IDs to the nflverse player ID; built with this page's work, since Phase 1 uses nflverse IDs only | Yes, answer first | Engineering | Answered |
| Does Yahoo's official API allow lineup changes for football leagues, or only adding and dropping players? | No, answer during build | Engineering | Open |
| How long do ESPN cookies last before you have to paste them again? Moved from Data ETL & storage (Q3) | No, answer during build | Engineering | Open |
| Where will the backend that holds sign-ins run: your own computer or a small hosted server? Answered: it's the Express backend ([ADR-0008](../design/decisions/ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md)); its host is a deployment-phase decision | No, answer during build | You | Answered |
| What are Yahoo's API rate limits, and does it expose waiver type, budget remaining and priority? Moved from Data ETL & storage (Q4) | Yes, answer first | Engineering | Open |
| Where do late inactives come from on game day? nflverse injuries are weekly and Sleeper's player list is meant to be fetched at most once a day. Blocks the live game-day refresh. Moved from Data ETL & storage (Q5) | Yes, answer first | Engineering | Open |
| Does the live game-day refresh run inside the always-on Express backend ([ADR-0008](../design/decisions/ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md)) or in a separate worker? Moved from Data ETL & storage (Q6) | Yes, answer first | You | Open |
| How complete are Sleeper's espn\_id and yahoo\_id fields compared with nflverse's ID table? Moved from Data ETL & storage (Q7) | No, answer during build | Engineering | Open |

Moved here from Data ETL & storage (2026-11-08): league data from all three platforms, the live game-day refresh and connection health. That also answers who turns the three platforms' league data into one shared league model: this page's work, in the Express backend.

## Build order

1. Sleeper: view data
2. Yahoo: view data
3. ESPN: view data
4. Yahoo: make changes. Test during the regular season, when a failed change costs less than in the playoffs
5. Sleeper: make changes
