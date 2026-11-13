# Design language — Fantasy Workbench

**The visual system for every screen: the token values, how they are used, and the rules that keep the interface consistent and accessible.**

**Last updated:** 2026-11-12 · distilled from the Phase 1 prototype ([`../prototypes/phase1/`](../prototypes/phase1/))

This document records the *values and rules*. The design *direction and intent* live in [`interface-design-brief.md`](interface-design-brief.md); feature *requirements* live in the PRDs ([`../prds/`](../prds/)); the machine-readable tokens live in [`tokens.css`](tokens.css), which is the source of truth any screen consumes.

## Foundations

- **Dark, data-dense tool**, not a marketing site. The interface is for someone who knows fantasy football and wants to answer questions fast.
- **Colour is never the only cue.** Every position and status colour is always paired with a text label. (Accessibility target: **WCAG 2.2 AA**.)
- **Desktop-first, fully responsive.** Designed for desktop first; collapses gracefully to tablet and phone (tables scroll or stack; controls wrap). Expansion to smaller breakpoints is reviewed and approved by the owner.

## Colour

### Surfaces and text
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0e1117` | App background |
| `--panel` | `#161a22` | Primary panel |
| `--panel-2` / `--panel-3` | `#1c212b` / `#232937` | Raised control / highest surface |
| `--line` / `--line-2` | `#2a3140` / `#343c4d` | Hairline / stronger border |
| `--text` / `--text-2` / `--muted` | `#eef0f4` / `#aab1be` / `#727b8a` | Primary / secondary / caption-disabled |
| `--accent` | `#3987e5` | Links, active state, primary accent |

### Position colours — **always with a text label**
| Position | Token | Hex |
|---|---|---|
| QB | `--qb` | `#3987e5` |
| RB | `--rb` | `#d95926` |
| WR | `--wr` | `#199e70` |
| TE | `--te` | `#c98500` |
| K | `--k` | `#9085e9` |
| Team defense (DEF) | `--def` | `#d55181` |
| Individual defense (DB/DL/LB) | `--idp` | `#7c8aa5` |

### Status colours — good / warning / serious / critical
`--good #2fae5f` · `--warn #e3a92b` · `--serious #e07a4b` · `--crit #e0514e`, each with a `*-soft` tint for backgrounds. Used for injury status, freshness/stale warnings, and error states — always with a text label beside the colour.

## Typography

- **One family:** a system sans stack (`--sans`); no web-font dependency.
- **Numerals:** every numeric table column uses `font-variant-numeric: tabular-nums` and is **right-aligned**, so figures line up in dense tables.
- **Scale:** hero `23px` (player name) · section heading `14px` · body/cell `13px` · dense secondary `12.5px` · hint/label `11.5px`.
- Avoid the generated-page tells called out in the brief: no ALL-CAPS eyebrows, no middle-dot meta strings except where the brief mandates them (`14.2 · 11 GP`, `28th`), no `→` appended to buttons, no monospace for data labels.

## Geometry & elevation

- Dense table row `--row: 38px`; panel radius `--r: 10px`; control radius `--r-sm: 7px`; base padding `--pad: 12px`.
- **Shadows are reserved for floating elements only** (modals, popovers: `--shadow-pop`) — not under every card.

## Data visualisation

- **Game-log heatmap:** stat cells are shaded by magnitude within each column. Polarity is **position-aware**: production shades **green** (`--heat-good`); negative plays — interceptions thrown, fumbles lost, sacks taken, points allowed — shade **red** (`--heat-bad`). The number is always printed, so colour is never the only cue.
- **Sparklines / trend lines** use the accent colour; byes and missed weeks are **gaps**, never zero points.
- Sequential and categorical scales must stay accessible in dark mode and never rely on colour alone.

## Numbers & terms (as shown on screen)

Every calculated measure uses its shared definition from the [Overview PRD](../prds/00-overview.md), and its tooltip says so.

- **Matchup difficulty** — the opponent's rank for fantasy points allowed per game to that position (1st = fewest allowed, 32nd = most). 25th or worse is *Easy*; 8th or better is *Tough*. Shown as the rank with a colour-coded dot; the Easy/Even/Tough word is carried in the label/tooltip for assistive tech.
- **Volatility** — standard deviation of weekly points over games actually played, minimum 3 games.
- **Projection** — a placeholder only, labelled as an estimate; no Phase 1 data source.

**Formatting rules:** fantasy points to one decimal; an average always sits beside games played (`14.2 · 11 GP`); the matchup rank is shown with its difficulty cue; byes and missed weeks are gaps, not zeros; averages divide by games actually played.

## Accessibility

- **WCAG 2.2 AA** target. Colour is never the sole cue (position, status, and matchup-difficulty colours are always paired with text or a label/tooltip).
- Visible keyboard focus; menus and modals are keyboard-operable (open/close, `Esc`, focus management).
- `prefers-reduced-motion` is respected (tab underline slide, any non-essential motion).

## Source of truth

[`tokens.css`](tokens.css) holds the canonical values; this document explains them; the Phase 1 prototype ([`../prototypes/phase1/`](../prototypes/phase1/)) is the working reference implementation. When a value changes, change it in `tokens.css` and reflect it here in the same edit.
