# Fantasy Workbench — Phase 1 prototype

A self-contained, click-through prototype of the Phase 1 screens for **Runpure FF — Fantasy Workbench**:
a fast, dense, configurable data tool that shows every NFL player and every game from public data,
refreshed once a day. **Phase 1 connects no leagues.** Everything here is **sample data** (fictional
players, real NFL team names) — it is a design prototype, not a working product.

## What's in it

| File | Purpose |
|---|---|
| `index.html` | App shell. Open this file. |
| `styles.css` | Dark visual system, dense table, all screen/state styling. |
| `data.js` | Deterministic sample data: 32 teams, **640 players** across QB/RB/WR/TE/K/DEF + IDP (DB/DL/LB), weekly stat lines with real bye/missed-week **gaps**, per-line **context** (opponent, home/away, roof/surface/weather, month, division flag, rest days) and **advanced/usage** fields (target share, air-yards share, WOPR, first downs, snap share), a full NFL schedule, and a **lazy five-season history** (2022–2026) built on demand. |
| `app.js` | Client-side nav, scoring/range engine, the reusable player table, the **single-scroll player card** (with multi-player tabs), the **Compare modal**, the **Columns &amp; filters modal**, NFL screen, and the dev state switcher. |

**No build step, no network.** No external fonts, scripts, or images — placeholder headshots are
CSS initial-discs. Just **open `index.html` from disk** in any modern browser. (Scripts are plain
`<script src>` in order — not ES modules — specifically so `file://` works.)

## How to move around

- **Left nav** — two live screens, **Players** and **NFL**. The four future areas (Game day,
  Waivers & trades, Weekly review, Leagues) appear as non-clickable *"soon"* affordances so the
  shell is sized for them without creating dead ends. A dashed **league-picker placeholder** marks
  where league switching will live.
- **Top bar** — the always-visible **data-freshness note**, the **account menu** (who's signed in /
  Sign out), and the **Preview state** switcher (below).
- **Players** — search, filters, scoring switch, range switch, column chooser, sortable columns,
  compare ticks. **Click any row** to open the **Player card** (slide-over). Press **Esc** or click
  the scrim to close.
- **NFL** — phase + week picker, game cards; **click a game** for stadium/roof/surface/weather/line/QBs/coaches;
  **click a team code** to jump to the Players list filtered to that team.

### Previewing the 7 states
Use the **"Preview state"** dropdown in the top bar. It maps 1:1 to the brief's required states:

1. **Signed out** → the full **Sign-in** screen (email/password + Google/Apple). Submitting signs you in.
2. **No account** → signed in via Firebase but no app account: a plain "your account isn't set up" message, no data.
3. **Loading** → the real layout with shimmer skeletons (existing rows would stay put on a live re-sort; here the first paint shows placeholders).
4. **No matches** → forces "0 players match", with **Clear all** within reach.
5. **Little / no data** → opens the card of a **rookie with no games** (and there's an injured star on IR in the list) — everything reads as **gaps / "no games yet"**, never zeros.
6. **Stale data** → the freshness note turns amber and a warning banner sits beside the last-updated time.
7. **Error** → "what failed + Retry", shown *instead of* an empty table so it never looks like real, complete data.

## Design system (the short version)

- **Color** — the brief's dark palette is locked: base `#0e1117`, panels `#161a22`, accent `#3987e5`;
  position colors QB `#3987e5` · RB `#d95926` · WR `#199e70` · TE `#c98500` · K `#9085e9` · DEF `#d55181`;
  separate status colors for good / warning / serious / critical. **Extension:** the individual
  defensive positions (DB/DL/LB) share one slate `#7c8aa5` so they read as a single "IDP" family
  distinct from the six skill hues. **Every position/status color is always paired with a text label**
  (the tag text, "Easy/Tough", "Questionable") — never color alone.
- **Type** — a system sans stack (no web fonts, so it opens from disk), a dense scale, and
  `tabular-nums` on every number so columns align. Numeric columns are right-aligned.
- **Shadows** are reserved for things that float (menus, the card, tooltips) — not dropped under every
  card — to avoid the "identical SaaS cards" look. Hierarchy comes from the panel/line tiers instead.
- **De-genericized deliberately:** no tracked-out ALL-CAPS eyebrows (stat headers are real domain
  abbreviations — PPG, GP, SNP%); no `→` on buttons; no monospace for data labels. The middle-dot
  compound (`14.2 · 11 GP`) is used **only** where the brief mandates it — the domain convention here, not
  decoration. (The matchup chip now shows the **rank + a coloured difficulty dot**; the Easy/Tough word
  moved to the dot's `aria-label`/`title` rather than being printed inline.)

## The number definitions (as implemented, with tooltips)

- **PPG** divides by **games actually played** and always shows the sample size beside it: `14.2 · 11 GP`.
- **Matchup difficulty** = the opponent's rank in fantasy points allowed per game to that position
  (1st = fewest allowed, 32nd = most). **25th-or-worse = Easy, 8th-or-better = Tough**. The chip shows
  the **rank number with a coloured difficulty dot** (green = Easy, red = Tough, grey = Even); the
  difficulty **word is not printed** but is carried on the dot's `aria-label` + the chip `title`, so it
  reaches hover and assistive tech (never colour-only). Recomputes when you change scoring.
- **Volatility** = standard deviation of weekly points over games played, requiring **3+ games**
  (shows "—" otherwise, with a tooltip saying why).
- **Gaps not zeros** — byes and missed weeks are gaps in tables, the sparkline, and the trend chart;
  averages never divide by them.
- Changing **scoring** (Full/Half/Standard PPR, TE-premium, 6-pt pass TD) or **range** (**Season** or an
  arbitrary **Custom** week span X–Y — the fixed Last-5/Last-3 windows were removed) updates every number
  together. Sort, filters, columns, scoring and range persist per browser (`localStorage`) — standing in
  for "settings stick per account". The whole **last-N concept is gone**: the fixed Last-5/Last-3 *range*
  windows and the **"Last 3" *column*** were both removed. On load, persisted state is **sanitized** —
  legacy `last5`/`last3`/`week` range falls back to Season, and any unknown/removed **column key** (e.g.
  `last3`) is dropped from every saved column set (falling back to defaults if a set empties), and an
  invalid saved **sort** key resets to the default — so an old saved layout never breaks the render.

## We borrow Sleeper's layout, not its look

This surface **mirrors Sleeper's real research-tool layout, components and flows** (observed
from two league-connected screenshots) rendered entirely in **our** design system — base
`#0e1117`, panels `#161a22`, accent `#3987e5`, our type and spacing. **No Sleeper teal, no
logos, no branding, no pixel copy.** Because Sleeper's screens are **league-connected (12-Team
PPR)** and Phase 1 connects **no league**, every league-dependent element is a clearly-labelled
**designed-for stub** — visibly disabled, never a control that silently fails (see the stubs
list below).

## Player card — Sleeper's modal with real tabs

The card is a **centered overlay modal**. A **persistent header** (title bar with multi-player
tabs; hero headshot over a faint team-colour watermark + ★ watchlist / ADD stubs; bio strip AGE ·
HT · WT · EXP · COLLEGE · DRAFT year/round/**pick**; the four-stat **rankings** strip — `#{n} {POS}`
and `#{n} OVERALL` our estimates, `% ROSTERED` / `% STARTED` ownership stubs; status row) stays
visible across tabs, as does the **Latest news rail** (right column on desktop, stacked on mobile —
a designed-for stub synthesized from injury status only, labelled “status only”).

Below that, a **section tab bar (Overview · Game log · Splits · Trends · History)** are **real tabs**:
clicking one **swaps the main-column content** (only the active section renders). Tabs are
`role="tab"` buttons, `aria-selected`, **arrow-key** navigable.

| Tab | Content |
|---|---|
| **Overview** | Season summary tiles over the active **range** (Season or an **arbitrary Custom week span**), a usage snapshot (snap% · target% · tgt share · AY% · WOPR), the weekly **trend** chart, and the **consistency floor–ceiling** strip. |
| **Game log** | Sleeper's signature **heat-mapped, grouped table** with **season pills** (2026 … 2022). Columns: **WK · RESULT · OPP** then Sleeper's **exact per-position stat set** — QB: FANTASY `PROJ FPTS` · SNP% · PASSING `ATT CMP YD TD INT` · RUSHING `ATT YD YPC TD` · SACKED `SK YDS` · FUMBLE `FUM LOST`; RB: FANTASY · SNP% · RUSHING · RECEIVING · FUMBLE; WR/TE: FANTASY · SNP% · RECEIVING(+USAGE) · FUMBLE; K: FANTASY · KICKING; DEF: FANTASY · DEFENSE · SCORING `PA YDA`; IDP: FANTASY · SNP% · TACKLES · IMPACT. **RESULT** shows the team's final score and **W/L** that week (e.g. `W 27–20` / `L 17–24`), joined from the sample schedule by team + week — the W/L letter is text so colour isn't the only cue (current season only; prior seasons show `—`). **Each stat cell is shaded by its value within its column**, with **position-aware polarity** — green for production, **red** for negative plays (a QB's INT/sacks-taken/fumbles, a DEF's points/yards allowed) — and the **number is always shown**. **PROJ** is a muted designed-for stub. Byes/missed weeks are **gap rows**; traded players show the **team they played for that week**; the **upcoming (unplayed) weeks stay rows in the same table with the same columns** — **blank stat cells** (no projection number) and the opponent's **rank with a coloured matchup-difficulty dot** (the Easy/Even/Tough word lives on the dot's `aria-label` + chip `title`, not printed), with a light left-border tint (no "next" label). |
| **Splits** | PPG by home/away · indoor/outdoor · surface · Tough/Even/Easy · division · month, each showing games played. |
| **Trends** | Usage small-multiples (snap% · target share · air-yards share · WOPR) + positional-rank-over-time. |
| **History** | Year-over-year career table (position rank per season; current season *partial*), a **Transaction-history** designed-for stub, and the **Projections vs actual** designed-for stub. |

All charts are hand-rolled inline SVG, theme-aware, `role="img"`-labelled, and never colour-only.

**Scrubbed per owner direction:** the Depth-chart rail block **and** the "Depth {slot}" chip that
remained in the card-header status row — **all depth-chart references are gone from every interface**
(card header, tabs, player list, column/filter modal, compare modal, tooltips, columns). The `depth`
field survives only in `data.js` as internal logic to identify a team's starter (`depth===1`) for
target-share and starting-QB lookups — it is never shown. Also fully removed earlier: the
Scoring-composition chart and the Opponent-history table (no remaining references in any section,
column, preset or modal), and the standalone rest-of-season schedule (upcoming weeks now live inside
the game log). The status row keeps only the **injury Status** chip (+ Practice) and the **upcoming
Week-{CUR} matchup** chip.

## Three player modals (one shared shell)

All three reuse the **same overlay mechanics** as the player card — a single `#scrim`
`role="dialog"` with ESC-to-close, click-outside-to-close, and a × button (`mountModal()` /
`removeScrim()` keep it DRY). Only one overlay is open at a time.

**1. Multi-player tabs** — opening another player while a card is open **adds a tab** (it no longer
replaces). The modal header shows a stacked, horizontally-scrolling tab strip (`{LastName} {TEAM} ×`);
each tab has its own ×, switching tabs swaps the body, and closing the last tab closes
the modal. Capped at **6** tabs. Tabs are `role="tab"` buttons, **arrow-key** navigable and focusable.
*(This refactor also fixed a latent bug: `renderCard()` used to call `closeCard()`, which nulled the
active id before the render guard, so the card rendered nothing — it now separates DOM teardown
(`removeScrim`) from state-clearing (`closeCard`).)*

**2. Compare modal** — the tick-to-compare tray's action is now **functional** (ticking 2–4 players
enables **Compare**). Columns are the ticked players (headshot chip, name → opens their card, remove
×); rows are **shared** fantasy metrics first (total, points/game, high, low, volatility, GP, snap%,
target%, position rank), then **position-appropriate** rows when the ticked players share a position
(mixed selections show a note instead). A **weekly-trend sparkline** sits in each player's column. The
**leader in each row is highlighted** with a soft fill **and an explicit “▲ best” tag** (never
colour-only; volatility, INT and points-allowed correctly treat *lower* as better). It **follows the
list's active scoring + range**, and players can be removed or cleared from inside the modal.

**3. Columns &amp; filters modal** — the **sliders** icon opens a power-user modal (upgrading the old
inline dropdown; the quick inline pills/dropdowns/filter-bar stay on the list). Left: all **filters** in
one place — position, team, injury, bye, min games, Rookies, and a custom week range (Free agents /
Watchlist remain labelled stubs). Right: **every available column grouped by category** — Fantasy,
Passing, Rushing, Receiving, Usage, Efficiency, Defense/IDP, Kicking, Splits — each a checkbox.
Changes stage in a **draft**; **Apply** commits (and **preserves the current sort**), **Reset** returns
to defaults, **Cancel/ESC** discards. Changing position in the modal swaps to that position's column set.

## Players list — a minimalist 2-row control strip

The top strip was reorganised (minimalism · progressive disclosure · Hick's Law · no disabled
clutter) from **~40 scattered affordances down to ~8 controls in two rows**, with every advanced
option ≤2 clicks away. The **Players / "refreshed daily · 2026 · through Week 9"** title is info, not
a control.

- **Row 1** — the **wide Search** field (keeps the `Ctrl +` hint); right-aligned **Season 2026 ▾**
  (older years *card only*) and a small **overflow ⋯ menu** holding **Saved views** and **Export**
  (both "soon", disclosed in one menu — not scattered grey buttons).
- **Row 2** — the **position pills** `All · QB · RB · WR · TE · K · DEF · More ▾` (More opens
  FLEX / IDP / DB / DL / LB) · **Scoring ▾** · **Range ▾** · **⚙ Columns & filters · N** (N = active-filter count).

Two controls consolidated into **keyboard-accessible menus** (button + `role="menu"`, `aria-expanded`,
Esc/outside-click close, state in `U.openDD` so the menu stays open while you toggle several things):
- **Scoring ▾** — format (Full PPR / Half PPR / Standard) + TE-premium + 6-pt pass TD; live-updates every number.
- **Range ▾** — **Season** or an arbitrary **Custom weeks (X–Y)** span + a **Per-game vs Totals** toggle.
  (The fixed Last-5 / Last-3 windows were removed — they don't fit this tool; a single week is Custom with
  X = Y. Legacy persisted `last5`/`last3`/`week` state migrates to Season on load.)

Everything else lives behind the **Columns & filters modal** (the "door"):
- A **View selector** = the presets (*Fantasy · Receiving · Rushing · Efficiency · Usage*) — the inline preset row is gone.
- **Filters**: Team · Injury · Bye · Min games · **Rookies** (real). Position is still driven by the pills.
- **Free agents** + **Watchlist** sit inside the filters, clearly labelled **"needs a connected league — later"** (off the strip).
- **Display**: the **Compact** toggle, plus a **"Projections — coming later"** note.
- **Apply** preserves sort; **Reset** restores defaults; **Cancel/Esc** discards.

**Removed from the strip** (hidden until functional, per inactive-control guidance): the Stats|Projection
toggle (Stats is the only mode — projections are noted in the modal), the standalone Projections-mode
control, the inline Free-agents/Watchlist checkboxes (now in the modal), and the Trending ticker stub;
Saved views/Export moved to the ⋯ menu. A slim **results line** (live "N players match" + contextual
**Clear all**) sits just above the table.

**Row anatomy** is unchanged (Sleeper-style): a green **+** add stub · a **★** watchlist stub · bold
**Name** with inline **QUES/OUT/IR** · subline `{POS} - {TEAM}({bye})` · **next kickoff + opponent** ·
left **news chip**; DEF rows show the team name. Nothing functional was lost — this is reorganisation.

## Lazy multi-season architecture

The current season (2026, weeks 1–9) is generated **eagerly** for all 640 players — the list
needs it. Each player's **prior seasons (2022–2025) are generated lazily the first time their
card opens** and cached on the player (`ensureSeason(player, year)`), so initial page load stays
fast. Prior seasons are built from an **independent RNG stream seeded by `(player id, year)`**
(the data module swaps a module-level stream via `withSeed`), so a player's history is **identical
regardless of when — or whether — any other card is opened**. Career arcs are honoured: rookies
have no seasons before their entry year (`ensureSeason` returns `notInLeague`), a gentle aging
curve scales talent by season, byes and injury gaps recur, free-agency changes a player's team in
older seasons, and some seasons carry a **mid-season trade** (weeks after the trade show the second
team). Current-season **positional ranks** (cumulative and week-by-week) are computed for real from
the eager data; **prior-season ranks** are a deterministic production-percentile mapping (they do
not shift with the scoring switch — see open questions).

## What is "designed-for, not built"
These show they have a home but intentionally don't function:

**All designed-for stubs are now disclosed inside menus/modals, never scattered on the strip**
(the Sleeper screenshots were league-connected; Phase 1 has no league):

- **Saved views** and **Export** — in the Row-1 **⋯ overflow menu**, disabled with a "soon" tag.
- **Compare up to 4** — **functional**: tick up to four players and open the Compare modal (see the modals section).
- **Projection** everywhere — the card's **PROJ** game-log column, the **Projections vs actual** panel,
  the next-week **Proj (est)** list column, and the **"Projections — coming later"** note in the modal.
  No Phase 1 source, so all are muted/disabled and labelled — never real data. *(The old list
  Stats|Projection strip toggle was removed — Stats is the only mode.)*
- **Free agents** and **Watchlist** — now **inside the Columns & filters modal**, labelled
  "needs a connected league — later" (removed from the strip).
- **% ROSTERED** and **% STARTED** in the card's rankings strip — ownership stats; muted with a "no league" tooltip.
- **ADD** button and **★ watchlist** (card hero) and the row-level green **+** / **★** — roster actions; disabled stubs.
- **Latest news rail** — Phase 1 has no article feed; synthesized from injury status only and labelled “status only”.
- **News chip** (list rows) — highlighted = unread, muted = none; driven only by injury status in Phase 1.
- **Trending adds/drops ticker** — **removed** from the strip (needs ownership data; deferred).
- **Seasons 2022–2026** are all populated on the sample data (lazily); the list stays on 2026 (older
  years are *card only*). The real app would serve every season from the daily public feed.

## Accessibility (targeting WCAG 2.2 AA)
Semantic landmarks and one `<h1>` per screen; a skip link; visible focus rings; `aria-sort` on sortable
headers and `aria-pressed` on segmented toggles; `aria-live` on the match count and tooltip; the dialog
uses `role="dialog"`/`aria-modal`; tooltips open on **focus** as well as hover and dismiss on **Esc**;
color is never the only signal; `prefers-reduced-motion` disables the shimmer and slide-in.
The strip's **Scoring ▾ / Range ▾ / ⋯** menus are button + `role="menu"` with `aria-haspopup` and
`aria-expanded`, open/close by keyboard, close on Esc / outside-click, and use `role="menuitemradio"`
with `aria-checked` for the format/range options.
The card's **section tabs** and **player tabs** are both `role="tab"`/`role="tablist"` with
`aria-selected`, arrow-key navigable and focusable; switching a section swaps content (no scroll). The
Compare leader is marked with a **text “▲ best” tag**, not colour alone; the Compare leader is marked with a **text “▲ best” tag**, not colour alone; all three modals
share the dialog's ESC / click-outside / focusable-close mechanics. The **heat-mapped game log encodes magnitude as a redundant cue** — the
number is always printed in the cell, so colour is never the only signal. Every hand-rolled SVG chart
carries a descriptive `role="img"` label and labels its markers in text (floor/median/ceiling,
Tough/Easy, ranks) so none depends on colour alone.

## Open questions / notes for the team
- **Injury shorthand (Q/O/IR)** in the dense table leans on a tooltip + the full word on the card. If
  the audience is less fantasy-fluent we may want the word inline, at a density cost.
- **IDP scoring** (DB/DL/LB) uses a common default (tackle 1 / assist 0.5 / sack 2 / INT 3 / PD 1 /
  FF 2 / TD 6). Phase 1 has no league, so there's no "real" scoring to honor yet — confirm whether IDP
  even belongs in the default column set or should be opt-in.
- **Matchup difficulty** is defined against *this* season's points-allowed. Early in a season that's a
  tiny sample; we may want to blend prior-season data or hide the label until N games.
- **Compare** and **Saved views** need a home in the shell once built — the tray and the toolbar group
  are placed assuming they stay there.
- Real data will be ~1,250 players; the table paginates at 40 with "Show more". For the production React
  build this becomes virtualized rows, but the markup/column model here is meant to port directly.
- **Prior-season positional rank** is a deterministic production-percentile estimate (it does not move
  with the scoring switch), because full cross-player prior seasons aren't built eagerly. With real data
  these would be computed from actual league-wide season totals under the active scoring.
- **Tough/Easy in splits & opponent history** use the opponent's *current-season* defensive rank applied
  to historical games (we don't retain a per-season fantasy-points-allowed table). Fine as a prototype
  proxy; real data would rank per season.
- **Usage trends & consistency scope** — usage small-multiples show one selectable season; the consistency
  strip uses the current season (9 games is a small sample this early). Confirm whether these should blend
  multiple seasons by default.
- **Card sections are now real tabs** (swap content), so the modal is no longer one long scroll; if any
  single tab (e.g. Trends) feels heavy we can sub-divide it.
- **Heat-map polarity** is now **position-aware** — a QB's INT/sacks-taken/fumbles and a DEF's
  points/yards allowed shade **red** (negative), everything else green. Edge cases (e.g. is a high
  target count ever "bad"?) can be tuned via the `BADKEYS` map.
- **Upcoming weeks in the game log** are same-table rows with blank stat cells and a matchup-difficulty
  chip (no projection number — no Phase 1 source). Confirm the blank-row + chip treatment reads clearly,
  or whether to add a projected-points column once a projection source exists.
- **RESULT (W/L + score)** is real only for the current season (the sample `SCHEDULE` holds 2026 scores);
  prior-season game logs show `—` in RESULT because lazy history doesn't generate full game scores. A real
  backend would carry every season's scores.
- **List season selector** is 2026-only (older years are card-only) because prior seasons are built
  lazily per player, not eagerly across the pool; a real backend would make any season listable.
- **Test hook** — `app.js` ends with a guarded `window.__ffwtest = {U,S,D}` (no effect on the browser UI)
  so the offline DOM-stub harness can reach ephemeral state; can be stripped for production.
