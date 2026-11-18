# Implementation Spec — Player Explorer

**The Players screen, the Player card and Compare: the app's core surface, built as the reusable player table the later features inherit.**

**Date:** 2026-11-16 · **Version:** v1.0 · **Status:** Draft for owner review. No code exists yet.
**Companion to:** [`prds/feature-player-explorer.md`](../prds/feature-player-explorer.md) (the PRD this implements).
**Builds on:** [`specs/ff-frontend-foundation-spec.md`](ff-frontend-foundation-spec.md) — shell, auth, data layer, settings, styling, scoring engine. Decisions F1–F8 and proposals P1–P8 there apply here and are not repeated.
**Reference implementation:** [`prototypes/phase1/`](../prototypes/phase1/). This spec rebuilds its behavior exactly except where §12 says otherwise.

---

## 0. Decisions

### 0.1 ADRs and foundation decisions this spec implements

| Source | What it means here |
|---|---|
| [ADR-0006](../design/decisions/ADR-0006-backfill-2022-2026-once-then-load-only-data-that-can-still-change.md) | The card's season selector covers 2022 → current; the list stays on the current season |
| [ADR-0007](../design/decisions/ADR-0007-calculate-fantasy-points-in-the-app-from-stored-stats.md) | Every number on this screen is computed by the foundation's scoring engine from raw stat lines (§8) |
| [ADR-0016](../design/decisions/ADR-0016-define-the-api-contract-in-the-graphql-schema.md), [ADR-0017](../design/decisions/ADR-0017-use-graphql-for-the-backend-api.md) | The fields in §9 are contract additions the backend authors; operations here become persisted documents |
| Foundation F5, F6 ([ADR-0019](../design/decisions/ADR-0019-call-the-graphql-api-through-a-hand-written-request-layer-with-tanstack-query-for-caching.md), [ADR-0020](../design/decisions/ADR-0020-build-the-player-table-by-hand-with-fixed-height-virtualization.md)) | Hand-written request layer with TanStack Query caching; hand-rolled table with fixed-height virtualization (§4.4) |
| Foundation F7 | Every control in §3 persists through the settings model |

### 0.2 Decisions (owner, 2026-11-16)

| ID | Section | Decision |
|---|---|---|
| PE1 | §4.4 | The prototype's "Show 40 more" pagination is replaced by virtualized scrolling of the full filtered list (the prototype README's own production note). The match count remains |
| PE2 | §6.3, §9.3 | Prior seasons use **real data fetched on demand** (one request per season, cached). This lifts the PRD's two recorded prototype limits — prior-season ranks are exact and follow the scoring switch, and prior-season results show real scores. The PRD's "Known Phase 1 limits" sentence is updated in the same change |
| PE3 | §3, §4.7 | **The list itself is season-switchable, 2022 → current** (the owner widened this beyond the prototype and the PRD, which kept the list current-season-only). Switching seasons reuses PE2's per-season fetch; prior-season list behavior is §4.7. The PRD's scope sentence and the interface design brief's control list are updated in the same change |
| PE5 | §3, §4.2, §9.2 | **Individual defensive players (DB/DL/LB) are removed from Phase 1** (owner, 2026-11-17, during cut-over testing: they tripled the list to 11,608 rows for a format the owner doesn't play). The IDP pills, column set and IdpStatLine serving are dropped; the IDP scoring definition stays in the Overview for a later phase. PRD and brief updated in the same change |
| PE4 | §9.2 | Stat lines ship as **per-position types** (the owner chose these over one wide nullable type). Implemented in GraphQL's idiom for that choice: one paged query returning a `StatLine` interface with six concrete per-position types, so pagination exists once and each position's fields live on its own type. Payload measured at contract cut-over with the 5,000-row page cap |

## 1. Scope and boundary

**Covers:** the `/players` route — control strip, the player table, and its three overlays (Player card, Compare, Columns & filters) — plus the GraphQL contract additions they need.

**Does not cover:** the shell, auth, settings plumbing, scoring math (foundation spec); the NFL screen (sibling spec). Post-Phase-1 PRD items — saved views, export/download, projections column with real data, free-agent/watchlist filters — appear only as the prototype's visible disabled stubs, never as silent failures.

## 2. Screen structure

```
/players
├─ View head: "Players" + season subline
├─ Control strip row 1: search · season selector (2026) · ⋯ menu (stubs)
├─ Control strip row 2: position pills · Scoring ▾ · Range ▾ · ⚙ Columns & filters (badge)
├─ Result line: "N players match" (aria-live) · Clear all (when filters active)
├─ Player table (virtualized; group headers + sortable column headers)
├─ Compare tray (when ≥1 player ticked)
└─ Overlays (one at a time): Player card · Compare · Columns & filters
```

Components live in `features/players/`, `features/player-card/`, `features/compare/` per the foundation's layout; each with its own `*.module.css` ported from the prototype.

## 3. Controls

All control state persists per account through the settings model (foundation §8) unless marked *session*.

| Control | Behavior (= prototype unless noted) |
|---|---|
| **Search** | Partial name match, case/diacritic-insensitive; OR exact team-code match. Input keeps focus and caret across re-renders |
| **Season selector** | **All seasons 2022 → current selectable** (PE3). Switching fetches that season's players, stat lines, teams and games on demand (shared with the card's per-season cache, §6.3). *Session state*: the app always opens on the current season. Prior-season list behavior: §4.7 |
| **⋯ menu** | Saved views, Export — visible, disabled, "soon" (PRD: post-Phase-1) |
| **Position pills** | All · QB · RB · WR · TE · K · DEF · More ▾ (FLEX RB/WR/TE · IDP DB/DL/LB · DB · DL · LB). Changing position swaps the active column set (§4.2). `aria-pressed` |
| **Scoring ▾** | Radios Full PPR / Half PPR / Standard; checkboxes TE premium (+0.5/rec for TE), 6-pt pass TD. Any change recomputes every number on the page together (PRD must-have). Label shows the current config |
| **Range ▾** | Radios Season / Custom weeks (From/To, 1..played); checkbox Per game (counting stats become per-game). Applies to totals, averages, highs, lows, volatility |
| **⚙ Columns & filters** | Opens the modal (§7); badge = count of active filters (team, injury, bye, min games, rookies — position and range not counted) |
| **Clear all** | Resets every filter and search; shown only when a filter is active; repeated in the no-matches empty state |

Match count updates live (`aria-live="polite"`).

## 4. The player table (hand-rolled, F6)

### 4.1 Columns

One catalog; each column has a key, header, tooltip (naming its Overview definition), alignment (numeric right + tabular), sort accessor, and formatter. Counting-stat columns respect the per-game toggle.

| Group | Columns |
|---|---|
| Fantasy | `total` · `avg` (PPG, rendered `14.2 · 11 GP`) · `high` · `low` · `sd` (volatility; — under 3 GP) · `gp` · `rank` (pos rank, e.g. QB4) · `tier` (T1–T5) · `opp` (next matchup + difficulty chip) · `bye` · `trend` (weekly sparkline) · `proj` (muted stub, "est") |
| Usage | `snap` (SNP% bar) · `tgt` (TGT%) · `tgtsh` · `aysh` · `wopr` |
| Receiving | `tgt_c` · `rec_c` · `recyd` · `catch` (Catch%) · `ypt` |
| Rushing | `car_c` · `ryd_c` · `ypc` · `fd` (1D) |
| Passing | `pyd_c` · `ptd_c` |
| Kicking | `k_fgm` · `k_fga` · `k_fgpct` · `k_lng50` · `k_xpm` |
| Team defense | `d_sk` · `d_int` · `d_fr` · `d_td` · `d_pa` (PA/g) · `d_ya` (Yds/g) |
| IDP | `i_tkl` · `i_sk` · `i_int` · `i_pd` |
| Splits | `split_ha` (Home/Away PPG pair) · `split_te` (vs Tough/Easy pair) |

A group-header row spans the active columns by category (FANTASY / PASSING / … / MATCHUP), as in the prototype.

### 4.2 Position-specific column sets

Four independent sets, each with its own persisted selection and defaults (PRD: K, DEF and IDP swap in their own stat columns):

| Set | Applies when filtered to | Default columns |
|---|---|---|
| `cols` | All/QB/RB/WR/TE/FLEX | total, avg, sd, snap, tgt, opp, trend |
| `colsK` | K | total, avg, k_fgm, k_fgpct, k_lng50, k_xpm, opp |
| `colsDEF` | DEF | total, avg, d_sk, d_int, d_fr, d_td, d_pa, opp |
| `colsIDP` | IDP/DB/DL/LB | total, avg, i_tkl, i_sk, i_int, i_pd, snap, opp |

Default sort: `avg` descending. Toggling a column never resets sort or filters (PRD must-have).

### 4.3 Sorting

Click a header to sort; second click reverses; ties broken by name (PRD). Default direction is descending except `opp`, `bye`, `rank`, `tier` (ascending — lower is better/earlier). `aria-sort` on the active header; ▲/▼ caret.

### 4.4 Virtualization (PE1)

Rows are fixed height (`--row`: 38 px, 30 px compact), so windowing is exact arithmetic: render visible rows ± overscan inside a spacer sized `rowCount × rowHeight`; sticky header; keyboard focus scrolls its row into view. ~80 lines, owned here, component-tested. The full filtered list is always scrollable — no pagination.

### 4.5 Row anatomy

Tick checkbox (compare, cap 4, excluded from row-click) · disabled **+** and **★** stubs · initials avatar disc · name with inline injury word (QUES/OUT/IR + practice-status tooltip) · subline `POS - TEAM(bye)` + next kickoff/opponent · position tag (colour + label) · stat cells per the active set. Row click opens the Player card.

### 4.6 Compare tray

Appears at ≥1 tick: "Compare N/4", a chip per player (remove ×), **Compare** button (enabled at 2–4), Clear. Ticks are session state.

### 4.7 Prior-season list mode (PE3)

When the list shows a prior season:

- The subline reads "{season} season · final" instead of "through Week N".
- `opp` (next matchup) renders "—" — there is no upcoming game; matchup-difficulty cues elsewhere (splits, card) use **that season's** fantasy-points-allowed ranks.
- Bye-week column and filter use that season's byes; the Rookies filter means that season's rookies (`rookieYear == season`); min-games and custom-week ranges run 1 to that season's final week.
- Injury and practice status are **current-only data** and are not shown for prior seasons (no fake history).
- Sort, filters, columns, scoring and range all work identically; settings persist once, not per season.

## 5. States

The foundation's seven states apply; screen-specific renderings: loading = skeleton rows under the real header; no matches = "0 players match" + Clear all; a rookie with no games shows "No games yet" and gaps, never zeros.

## 6. The Player card

A modal over the list (foundation overlay manager). Follows the list's scoring and range controls; its own season context does not change the list (PE3).

### 6.1 Persistent header

- **Player tabs:** one tab per open card, cap 6, arrow-key navigable, each closable; opening another player from anywhere adds a tab. *Session state.*
- **Hero:** avatar, name, position tag, team · #jersey; disabled ★ and ADD stubs.
- **Bio strip:** AGE · HT · WT · EXP · COLLEGE · DRAFT (or Undrafted). DEF variant: TEAM · DIVISION · STADIUM.
- **Rankings strip:** positional and overall rank (computed, §8); % rostered / % started as muted "no league" stubs.
- **Status row:** injury status chip, practice chip, next-matchup chip with difficulty (or Bye), and a team link that closes the card and opens `/players?team=XXX`.
- **News rail:** status-only synthesis, labelled as such (PRD: no news provider in Phase 1).

### 6.2 Sections (tabs that swap content — PRD)

| Tab | Content |
|---|---|
| **Overview** | Season-summary tiles (Total, PPG+GP, High, Low, Volatility) over the active range; range control (mirrors the global range); usage snapshot tiles (skill positions); weekly trend chart (inline SVG, gaps break the line, per-point tooltip); consistency floor–median–ceiling strip with start-threshold line |
| **Game log** | Season pills 2026→2022. One row per week: WK · RESULT (final score + W/L, OT tag) · OPP · the position's stat groups (QB passing/rushing/sacked/fumbles; RB rushing/receiving; WR/TE receiving/usage; K kicking; DEF defense/scoring; IDP tackles/impact) · FPTS · SNP%. Cells heat-mapped by magnitude within their column, polarity position-aware (interceptions, fumbles, sacks taken, points/yards allowed shade red; production green; the number always printed). Byes and missed weeks are gap rows; traded weeks show the team played for; upcoming weeks are same-table rows with blank stats and the matchup-difficulty chip |
| **Splits** | PPG bar rows with game counts: Home/Away · Indoor/Outdoor · Surface · vs Tough/Even/Easy · Division/Non · By month — across all loaded seasons |
| **Trends** | Usage small-multiples (Snap% · Target share · Air-yards share · WOPR) with a season selector; positional-rank-over-time line (lower is better) |
| **History** | Season-by-season career table (Season, Team, GP, Total, PPG, High, Low, Vol, Pos rank; current season tagged "partial"; pre-entry years "Not in the league yet"); transaction-history and projections-vs-actual stubs |

### 6.3 Prior seasons (PE2)

Opening a prior season (game-log pill, trends selector, or History) fetches that season's data on demand — the player list, stat lines and games for that season — cached per season for the session. Ranks, splits and results for prior seasons are then computed exactly like the current season's, and follow the scoring switch. Charts and tables mix seasons only where the prototype does (Splits, History).

## 7. Columns & filters modal

Draft-based: edits stage into a draft; **Apply** commits (sort preserved), **Reset** restores defaults, Cancel/ESC discards.

- **Filters:** Position (swaps the draft column set) · Team (32) · Injury (Any/Healthy/Questionable/Out/IR) · Bye week · Min games (0..played) · Week range (mirrors Range control) · Rookies only. Free agents and Watchlist: visible, disabled, "needs a connected league — later".
- **Display:** Compact rows (38→30 px).
- **Columns:** view-preset pills (Fantasy / Receiving / Rushing / Efficiency / Usage) staging a column set, then every column offered for the active position, grouped by category, as checkboxes.

## 8. Derived data

All computed by the foundation's scoring engine (§11 there) over the fetched stat lines, memoized by (scoring config, range): weekly points, range aggregates, positional/overall ranks (IDP ranked within IDP), fantasy-points-allowed → matchup difficulty, placeholder projection (muted column), trend, volatility. Nothing on this screen asks the server for a computed number.

## 9. Required GraphQL contract

Additions the backend authors (code-first; additive; lists capped — system design §4). Field names are indicative; the committed SDL wins.

### 9.1 Players and teams

```graphql
type Query {
  "Every fantasy-relevant player for a season (has a stat line, or is on an active roster)."
  players(season: Int!): [Player!]!
  "All 32 teams with venue and the season's bye week."
  teams(season: Int!): [Team!]!
}
type Player {
  id: ID!            # nflverse gsis id
  name: String!      position: String!   team: String
  jerseyNumber: Int  birthDate: String   heightIn: Int   weightLb: Int
  college: String    rookieYear: Int     yearsExp: Int
  draftYear: Int     draftRound: Int     draftPick: Int
  injuryStatus: String      # latest report: Questionable / Out / IR …
  practiceStatus: String
}
type Team {
  abbr: String!  city: String!  nickname: String!
  conference: String!  division: String!
  stadium: String  roof: String  surface: String  headCoach: String
  byeWeek: Int
}
```

### 9.2 Stat lines (PE4 — per-position types)

```graphql
type Query {
  "Weekly stat lines for every player in a season, paged with a hard cap."
  statLines(season: Int!, after: String, limit: Int = 5000): StatLinePage!
  "Weekly team-level stats (points/yards allowed) for DEF scoring and FPA ranks."
  teamWeekStats(season: Int!): [TeamWeekStat!]!
}

"Shared identity; concrete type per position family (PE4)."
interface StatLine {
  playerId: ID!  week: Int!  teamPlayedFor: String!  opponent: String
  home: Boolean!  snapPct: Float
}
type QbStatLine  implements StatLine { ... }  # attempts, completions, passYards, passTds,
                                              # interceptions, sacksTaken, sackYards, carries,
                                              # rushYards, rushTds, fumbles, fumblesLost, firstDowns
type RbStatLine  implements StatLine { ... }  # carries, rushYards, rushTds, targets, receptions,
                                              # recYards, recTds, fumbles, firstDowns
type WrTeStatLine implements StatLine { ... } # targets, receptions, recYards, recTds, carries,
                                              # rushYards, targetShare, airYardsShare, wopr,
                                              # firstDowns, fumbles
type KStatLine   implements StatLine { ... }  # fgMade, fgAtt, fg50Plus, xpMade, xpMissed
type DefStatLine implements StatLine { ... }  # pointsAllowed, yardsAllowed, sacks, interceptions,
                                              # fumbleRecoveries, tds, safeties
type IdpStatLine implements StatLine { ... }  # soloTackles, assistTackles, sacks, tacklesForLoss,
                                              # interceptions, passesDefended, forcedFumbles,
                                              # fumbleRecoveries, qbHits, tds
type StatLinePage { items: [StatLine!]!  nextCursor: String }
```

Per-position types are the owner's PE4 decision; the single paged query with a `StatLine` interface is GraphQL's idiom for it — pagination exists once, each family's fields live on its own concrete type, and the client selects them with inline fragments. Sourced from the ETL's weekly player stats and snap counts. `teamPlayedFor` per week makes traded players render correctly. The client computes everything else (§8).

### 9.3 Prior seasons (PE2, PE3)

The same queries with a prior `season` argument serve both the card's on-demand history and the list's season switch; no extra fields needed. History depth is 2022+ (ADR-0006). Each season is fetched once per session (TanStack Query cache), whichever surface asks first.

Games/results come from the NFL spec's `games(season)` query — shared, fetched once.

## 10. Accessibility

As the prototype, binding: `aria-sort`, `aria-pressed` pills, `aria-live` match count, dialog semantics + focus trap on all three overlays, `role=tablist` + arrow keys for player tabs and section tabs, `menuitemradio` dropdowns, tooltips on hover+focus ESC-dismissable, every chart `role=img` with a text alternative, colour never the only cue. WCAG 2.2 AA.

## 11. Testing

| Area | Cases |
|---|---|
| Table | Sort toggle + direction defaults + name tie-break; filter combinations + match count; column-set swap preserves sort/filters; virtualization renders correct window at both row heights |
| Scoring integration | Scoring/range change updates list, card and compare together; per-game toggle on counting columns |
| Card | Tab cap 6; gap rows for bye/missed; heat-map polarity (red keys); upcoming-week rows; traded-week team tag |
| Compare | Cap 4; leader highlight direction-aware (volatility low wins); mixed-position note; drop below 2 closes |
| Modal | Draft apply/cancel/reset semantics; filter badge count |

## 12. Known limits and prototype divergences

| Item | Status |
|---|---|
| Prior-season ranks and results: real and exact via PE2 | **Lifts the PRD's two recorded limits — PRD sentence updated in the same change** |
| List season selector live for 2022→current (PE3) | **Expands the PRD's Phase 1 scope (owner, 2026-11-16); PRD and brief updated in the same change.** Divergence from the prototype, whose prior options are disabled |
| "Show 40 more" → virtualized full list (PE1) | Divergence, recorded here |
| Saved views, Export, projections, free agents, watchlist, % rostered/started, +/★, news | Disabled stubs, as prototype and PRD |
| IDP in default columns | Overview PRD marks the IDP default-scoring question open; the list ships IDP as the prototype does |

## 13. Build order (PRD build order, refined)

1. Table core: columns catalog, sorting, virtualization, row anatomy — on sample data
2. Control strip: search, position pills (column-set swap), filters + match count + clear
3. Scoring + range switches wired through the engine
4. Columns & filters modal; settings persistence of every control
5. Player card: header + Overview + Game log (current season)
6. Card: Splits, Trends, History + prior-season on-demand fetch (PE2) + the list's season switch (PE3)
7. Compare modal + tray
8. Contract cut-over (foundation §13 step 7)
