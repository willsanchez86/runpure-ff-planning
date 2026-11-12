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
| `data.js` | Deterministic sample data: 32 teams, **640 players** across QB/RB/WR/TE/K/DEF + IDP (DB/DL/LB), weekly stat lines with real bye/missed-week **gaps**, and a full NFL schedule with scores, byes and game detail. |
| `app.js` | Client-side nav, scoring/range engine, the reusable player table, player card, NFL screen, and the dev state switcher. |

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
  compounds (`14.2 · 11 GP`, `28th · Easy`) are used **only** where the brief mandates them — they're
  the domain convention here, not decoration.

## The number definitions (as implemented, with tooltips)

- **PPG** divides by **games actually played** and always shows the sample size beside it: `14.2 · 11 GP`.
- **Matchup difficulty** = the opponent's rank in fantasy points allowed per game to that position
  (1st = fewest allowed, 32nd = most). **25th-or-worse = Easy, 8th-or-better = Tough**, shown as
  `28th · Easy`. Recomputes when you change scoring.
- **Volatility** = standard deviation of weekly points over games played, requiring **3+ games**
  (shows "—" otherwise, with a tooltip saying why).
- **Gaps not zeros** — byes and missed weeks are gaps in tables, the sparkline, and the trend chart;
  averages never divide by them.
- Changing **scoring** (Full/Half/Standard PPR, TE-premium, 6-pt pass TD) or **range** (Season / Last 5
  / Last 3) updates every number together. Sort, filters, columns, scoring and range persist per browser
  (`localStorage`) — standing in for "settings stick per account".

## What is "designed-for, not built"
These show they have a home but intentionally don't function:

- **Saved views** and **Export** — disabled buttons with a "soon" tag and an explaining tooltip.
- **Compare up to 4** — you *can* tick up to four players and they collect in a sticky tray; the
  **Compare** action itself is the disabled "soon" affordance.
- **Next-week projection** — a toggleable column labeled **"Proj (est)"**, rendered muted with an "est"
  marker and a tooltip stating it's a placeholder for a later phase.
- **Seasons 2022–2026** — the card's season selector is live, but only 2026 is populated in the sample;
  older seasons show a clear "not loaded in this prototype" note.

## Accessibility (targeting WCAG 2.2 AA)
Semantic landmarks and one `<h1>` per screen; a skip link; visible focus rings; `aria-sort` on sortable
headers and `aria-pressed` on segmented toggles; `aria-live` on the match count and tooltip; the dialog
uses `role="dialog"`/`aria-modal`; tooltips open on **focus** as well as hover and dismiss on **Esc**;
color is never the only signal; `prefers-reduced-motion` disables the shimmer and slide-in.

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
