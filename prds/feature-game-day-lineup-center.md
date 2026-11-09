# Game-day lineup center

**One screen that shows every lineup problem in every league before kickoff, lets you fix it, and then follows all your matchups live.**

**Last updated:** 2026-11-09 · live-tier ownership (ETL spec D15) and live-board polling (ADR-0017) aligned with decisions

## At a glance

|  |  |
| --- | --- |
| **Serves** | Game-day lineup check, and following every matchup live on Sunday |
| **Viewing data** | Viewing phase: the problem list and live board |
| **Making changes** | Changes phase: fixing lineups from this screen |
| **Depends on** | [Platform connections](infra-platform-connections.md) and [Data ETL & storage](infra-data-etl-and-storage.md) |
| **Why it's the first league feature** | It's the journey you repeat every week, in every league |

## The problem

Before each kickoff you have to open every league separately and look for starters who are out, on bye or questionable. Across several leagues that takes many minutes and is easy to get wrong, especially with late news before the 1pm ET Sunday games.

One missed starter can cost a matchup.

## What success looks like

| Goal | Target |
| --- | --- |
| Starters left in a lineup who are out, on bye or inactive at kickoff | Zero, across all leagues |
| Time to see every lineup problem in every league | Under 10 seconds after opening the app |
| Effort to fix a problem, where the platform allows changes | No more than 2 clicks |
| Following games live | Every matchup in every league on one screen |

## Not doing

| Not doing | Why not |
| --- | --- |
| Setting lineups automatically | You make the call; the app suggests and applies only when you confirm |
| Phone notifications | Needs a delivery channel; revisit once the core screen works |
| Its own injury news | Shows the status each platform reports; no news gathering |
| Daily fantasy or pick'em contests | Season-long leagues only |
| Live scores in Phase 1 | A later phase. Phase 1's pipeline runs once a day (ETL spec D7); live polling arrives with Platform connections' live tier |

## User stories

**Everyday**

- As the owner, I want one list of every lineup problem in every league, so I can fix them all before kickoff.
- As the owner, I want each problem to suggest a replacement from my bench, so I can decide quickly.
- As the owner, I want to make the swap from this screen, so I don't open each platform's app.
- As the owner, I want to see which games have already started, so I don't plan swaps for locked players.
- As the owner, I want a live board of all my matchups on Sunday, so I can follow every league at once.

**When something's different**

- As the owner, in a league where changes aren't possible, I want a direct link to that league on its platform, so I can make the change there.
- As the owner, I want a player ruled out after his game has started to show as "too late", not be offered for a swap.

## Must have for launch

| Requirement | Done when |
| --- | --- |
| **Problem list** across all leagues, soonest kickoff first: starters who are out or on injured reserve, on bye, questionable, plus empty starting slots | A starter on bye appears with his league, slot and the reason "Bye". With no problems, the screen says "All lineups set" and when it last updated |
| **Suggested swap** for each problem: the highest-projected bench player who can fill that slot and hasn't played yet | A suggestion is never a player who is out, on bye or already locked |
| **Make the swap** in leagues where changes are possible | After you confirm, the app sends the change, re-reads the lineup and marks the problem fixed only once the platform matches. In view-only leagues the button reads "Open in Sleeper", "Open in Yahoo" or "Open in ESPN" |
| **Locked players**: anyone whose game has started | Shown as locked and can't be moved |
| **Live board**: one card per league with your score, your opponent's, the projected final and who's still to play | Refreshes at least every 60 seconds during games |

## Should have soon after

| Requirement | Done when |
| --- | --- |
| **Start or sit help** for close calls | Projection, matchup difficulty and volatility shown side by side, using the definitions on the [Overview](00-overview.md) |
| **One news item, every league** | A player ruled out shows as one grouped item covering every league where he starts |
| **Best-lineup check** | Any league whose lineup isn't the highest-projected one is flagged |

## Later

| Idea | Why it's parked |
| --- | --- |
| Phone notifications for new problems | Needs a delivery channel |
| Automatic swap rules, such as "always replace a player ruled out if a bench player projects within 2 points" | Only once manual swaps have proven reliable |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |
| Time from opening the app to all lineups set | Each game day | Under 3 minutes for all leagues |
| Share of problems fixed from this screen rather than a platform app | Each game day | Most of them, once changes are possible |
| Starters who scored zero because they were out or on bye | Across the season | Zero |

## Open questions

| Question | Blocks building? | Who answers | Status |
| --- | --- | --- | --- |
| Which source gives reliable kickoff times and lock status for all three platforms? | Yes, answer first | Engineering | Open |
| Do all three platforms use the same injury labels, or does the app need to translate them? | Yes, answer first | Engineering | Open |
| Should questionable players count as problems by default, or only when a healthy bench player projects higher? | No, answer during build | You | Open |
| What should the live board look like on a phone? | No, answer during build | Design | Open |

Also open, tracked on [Platform connections](infra-platform-connections.md): where late inactives come from on game day, and whether the live tier runs inside the always-on backend or a separate worker ([ADR-0008](../design/decisions/ADR-0008-run-the-api-and-pipeline-in-a-separate-express-backend.md); ETL spec D15). The hosting provider is open in the decision log (item 4). All block the live board. At launch the board polls the API every 30–60 seconds ([ADR-0017](../design/decisions/ADR-0017-use-graphql-for-the-backend-api.md)).

## Build order

1. Problem list and live board, view only. Needs only the ability to view data from each platform
2. Suggested swaps
3. Making the swap, once each platform supports changes
