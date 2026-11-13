# Fantasy Workbench — Interface design brief (Phase 1)

**The design direction for the three Phase 1 screens, inside an app shell with room for the league features that follow. The bridge between the PRDs (what and why) and the build.**

**Last updated:** 2026-11-12 · open questions resolved (devices, accessibility, visual language); player-detail scope expanded and recorded in [`../prds/feature-player-explorer.md`](../prds/feature-player-explorer.md). Original brief dated 2026-11-10.

> Where this brief and a PRD disagree, the PRD wins. The visual *system* (token values and rules) lives in [`design-language.md`](design-language.md); the working reference implementation is the prototype at [`../prototypes/phase1/`](../prototypes/phase1/).

## What to design

Design the three Phase 1 screens of Fantasy Workbench — **Player list, Player card, NFL scores and schedule** — inside an app shell that already has room for the league features that follow.

**The product.** A web app that brings one person's fantasy football leagues on Sleeper, Yahoo and ESPN into one place: lineups, waivers, trades and weekly analytics. Phase 1 connects no leagues. It shows every NFL player and every game from nflverse's public data, refreshed once a day at 06:00 Eastern.

**The user.** One person at launch — the owner, who plays in several leagues and checks them most on Sunday and waiver night. The app has real sign-in from day one and must work for more users later without a redesign; nothing in the interface assumes a single account (ADR-0001).

**Sources.** Every requirement comes from the planning repo: [`../prds/00-overview.md`](../prds/00-overview.md), [`../prds/feature-player-explorer.md`](../prds/feature-player-explorer.md) and the other PRDs.

## Design principles

The interface is a fast, dense, configurable data tool for someone who knows fantasy football, not a marketing site.

| Principle | What it means on screen | Source |
|---|---|---|
| Fast to answer | Find a player by name in under 5 seconds; re-sorting or re-filtering updates in under half a second | Player explorer PRD |
| Gaps, not zeros | A missed week or bye shows as a gap in tables, charts and trend lines; averages divide by games actually played | Player explorer, Weekly review PRDs |
| Show the sample size | Games played sits next to every average, so two big games don't look like a star | Player explorer PRD |
| One meaning per number | Every calculated measure uses the Overview's shared definition, and its tooltip says so | Overview PRD |
| Freshness is visible | Every data screen shows when its data last updated; out-of-date data is marked, never shown as current | Platform connections, Game-day PRDs |
| Settings stick | Sort, filters, columns, range and scoring are restored on the next visit, stored per account | Player explorer PRD; ADR-0001 |
| Familiar first | Phase 1 follows Sleeper's screens and interactions, in a look of its own | Overview PRD |

**Using Sleeper as the reference.** Sleeper's web app is the model for what each screen *does*, not for how it *looks*.

| | What it covers |
|---|---|
| **Borrow** | Which screens exist, what each shows, how you use them: flows, controls, interactions, information layout |
| **Make our own** | All styling (colour, type, icons, spacing), on-screen wording, and the overall look, so the app is clearly not Sleeper |
| **Never use** | Sleeper's name, logo, icons, images or branding, or a pixel-level copy of any screen |

Interaction and layout conventions are common ground; a distinctive visual design and branding belong to Sleeper. Before the app is sold or made public, get legal advice on this line.

**Existing visual language — kept.** The dark system (`#0e1117` background, `#161a22` panels, `#3987e5` accent, a colour per position, separate status colours) is the design language. Full values and rules are in [`design-language.md`](design-language.md). Position and status colours must never be the only cue — always paired with a text label.

## App shell and navigation

One shell holds every screen: navigation, the signed-in account, and a data-freshness note. Phase 1 fills two navigation items; the shell must take four more without a redesign.

| Navigation item | Screens | Arrives |
|---|---|---|
| Players | Player list; Player card | Phase 1 |
| NFL | Scores and schedule, by week | Phase 1 |
| Game day | Lineup problems across every league; live board | Viewing phase |
| Waivers & trades | Team needs, free-agent finder, waiver calendar, trade evaluator | Viewing phase |
| Weekly review | Standings and power, heatmap, positional strength, tables, player comparison | Viewing phase |
| Leagues | Connect Sleeper, Yahoo, ESPN; connection health; what each league allows | Viewing phase |

- **Sign-in.** Every screen needs a signed-in account (Firebase Authentication, ADR-0015). Design the sign-in screen and the account menu (who is signed in, sign out).
- **No dead ends.** Features that don't exist yet are not shown as clickable items that silently fail.
- **League context, later.** Leave a place in the shell for a future league picker; Phase 1 shows none.
- **Freshness.** A small, always-visible note says when NFL data last loaded (the daily run lands by 06:00 Eastern).

## Screen: Player list

Every active NFL player in one sortable, filterable, configurable table, with no league needed. It is the first screen built and the base for the player tables in Waivers & trades and Weekly review, so design it as a **reusable table**.

**Rows.** ~1,250 players: QB, RB, WR, TE, K, team defense, and individual defensive players (DB, DL, LB). Practice-squad players appear only once they have played. Each row shows NFL team, position, age, bye week and injury status.

**Controls.** Name search (partial, case/accent-insensitive); filters (position incl. a combined RB/WR/TE option, NFL team, injury status, bye week, minimum games played — they combine, the matching count is always shown, one "Clear all"); sort (any column, one click sorts, a second reverses, ties by name); scoring switch (full PPR / half / standard, plus tight-end premium and 6-point passing TDs — every number updates together); **range switch (season, or a custom range of weeks)**; column chooser (total points, points per game, high, low, volatility, games played, snap share, target share, next opponent and its difficulty, bye week, weekly trend line — toggling a column keeps sort and filters).

> The control surface follows progressive disclosure: a small default set of controls is visible, with advanced columns and filters behind a columns-and-filters panel (minimalist design; Hick's Law; no scattered disabled "coming soon" controls).

**Position-specific columns.** Kickers and team defenses stay in the same table; filtering to K or team defense swaps in their own stat columns. Individual defensive players likewise.

**Opens.** Clicking a player opens the Player card.

**Design for, not built at launch:** saved views, ticking up to four players to compare, a next-week projection column, downloading the current view, and — once leagues connect — "free agents in my league" and "on my teams" filters.

## Screen: Player card

One player's profile and record, so the owner can see how his points were made. Following Sleeper's actual layout, the card opens as a **single-scroll modal** with a persistent header (headshot, bio, player rankings, injury status, next-matchup) and section tabs. It follows the list's scoring and range controls.

- **Header** — headshot, name, position, NFL team, jersey, age, height/weight, college, draft year/round/pick, experience; player rankings (positional and overall); injury status; the next matchup with its difficulty.
- **Game log** — one row per week: opponent, final score and win/loss, the position's stat line, fantasy points, snap share. Byes and missed weeks are gaps, not zeros. Upcoming (unplayed) weeks appear in the same table with blank stats and their matchup difficulty. Traded players show the current team in the header and the team they played for in each past week. Cells are heat-mapped (production green, negative plays red; the number is always shown).
- **Beyond the game log** — season summary over the selected range; splits; usage and advanced-stat trends; a consistency view; position rank over time; a season-by-season career table; a season selector 2022→current (ADR-0006).

The PRD requires only the weekly record at launch; the richer views are recorded under *Should have soon* in the Player explorer PRD.

## Screen: NFL scores and schedule

Every game by week, with final scores once played. A week picker (preseason, regular, postseason) lists each game: away and home team, kickoff day and time, the final score with overtime marked; the teams on bye that week; optional game detail (stadium, roof, surface, temperature, wind, betting line and total, starting QBs and head coaches). Not live — scores update once a day; don't design in-game states. A team's name can filter the Player list to that team.

## States every screen needs

Design each Phase 1 screen in these states, not only the full one.

| State | When | What the screen shows |
|---|---|---|
| Signed out | No session | The sign-in screen |
| No account | Signed in via Firebase, but no app account yet | A plain "account isn't set up" message; no data |
| Loading | First load, or a scoring/range change waiting on the server | Layout with placeholders; existing rows stay visible while re-sorting |
| No matches | Filters or search exclude every player | "0 players", with "Clear all" in reach |
| Little or no data | A rookie with no games, an injured player, the off-season | Gaps and "no games yet", never zeros |
| Stale | Data older than 24 hours during the season | A visible warning beside the last-updated time |
| Error | The API can't be reached or errors | What failed and a retry; never an empty table that looks like real data |

## Numbers and terms

A number always means its Overview definition; headers and tooltips use these names and say so. Matchup difficulty, volatility and projection are defined in [`design-language.md`](design-language.md). Formatting: averages sit beside games played; the rank carries its Easy/Tough cue; fantasy points to one decimal.

## Later screens the design must not rule out

The shell, the reusable table, and the visual language must carry (without being designed now): the Game-day problem list and live board, free-agent finder / waiver calendar / trade evaluator, Weekly review views, Leagues and connection health, and the change-confirmation flow. The prototype already covers the Weekly review views on sample data.

## Constraints and resolved questions

**Fixed constraints.** Built in Next.js (ADR-0002), calling one GraphQL API from the browser (ADR-0014, ADR-0017). Sign-in through Firebase Authentication (ADR-0015); no public sign-up yet. Data refreshes once a day; nothing in Phase 1 is live. One user at launch, but no single-user shortcuts (ADR-0001). See the [decision log](architecture-decisions.md).

**Resolved design questions (owner, 2026-11):**

| Question | Resolution |
|---|---|
| Which devices does Phase 1 target? | **Desktop-first, fully responsive.** Build desktop first; it must collapse gracefully to tablet and phone. Expansion to smaller breakpoints is reviewed and approved by the owner. |
| What accessibility standard applies? | **WCAG 2.2 AA.** Colour is never the only cue. |
| Keep the prototype's dark visual language? | **Yes** — it is the design language ([`design-language.md`](design-language.md)). |
| What must the NFL scores and schedule screen show? | The proposal above stands (no PRD yet defines it; a PRD section is owed). |
| How much of the Player card beyond the weekly record? | The expanded profile above; recorded under *Should have soon* in the Player explorer PRD. |
