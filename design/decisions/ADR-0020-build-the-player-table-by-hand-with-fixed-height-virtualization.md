# ADR-0020: Build the player table by hand with fixed-height virtualization

**Status:** Accepted
**Date:** 2026-11-16
**Implementation started:** 2026-11-17 (added at the owner's direction: the hand-rolled virtualized player table committed in runpure-ff-frontend)
**Deciders:** William Sanchez
**Rules out:** TanStack Table; TanStack Virtual

## Context

The Players screen is one large interactive table: ~1,250 rows, click-to-sort on every column with direction defaults and a name tie-break, four position-specific column sets, a column chooser, and grouped category headers. The Player explorer PRD names it "the base for every other player table in the app". The Phase 1 prototype pages with a "Show 40 more" button and notes that production should render only the visible rows (virtualization). Rows have a fixed height (38 px, 30 px compact; [`design-language.md`](../design-language.md)), which reduces windowing to exact arithmetic. The owner's bar for the frontend: no dependency without significant benefit over building it ourselves.

## Decision

**The player table is hand-rolled — sorting, column sets, grouped headers and fixed-height row virtualization — with no table or virtualization library.**

The custom column model (position-specific sets, group header spans, per-column sort defaults) is the interesting code either way; a headless table library would store state around it without replacing it. Virtualization over fixed-height rows is ~80 owned lines, component-tested.

## Options Considered

### Option A — Fully hand-rolled (chosen)
| Dimension | Assessment |
|---|---|
| Dependencies | None |
| Fit to the custom column model | Exact: the position-set/group-header logic is bespoke in any option |
| Virtualization difficulty | Low with fixed-height rows: window = scrollTop arithmetic + overscan |
| Reuse (PRD mandate) | A factored table component reuses in later features the same as a library-backed one |

### Option B — Hand-rolled logic + TanStack Virtual for windowing
Keeps the one genuinely tricky part (scrollbar math, resize, overscan) in a small standard library (~10 kB). Not chosen by the project owner.

### Option C — TanStack Table + TanStack Virtual
Headless table state plus virtualization. Sorting and column visibility it manages are straightforward to write; the bespoke column model remains ours regardless, so the benefit did not clear the owner's dependency bar.

## Consequences

**Easier:** zero dependencies in the app's core surface; the table's behavior is exactly the spec's, with nothing imposed.
**Harder / to revisit:** sorting, column-set and windowing edge cases (scroll accuracy, resize, sticky header, keyboard focus into virtualized rows) are ours to test and maintain. Revisit if a later table needs variable row heights, column resizing/pinning or horizontal virtualization — the points where a library's benefit would clear the bar.

## Relationship to other decisions

- **Depends on** [ADR-0002](ADR-0002-build-the-phase-1-web-app-with-nextjs.md) (React/Next.js component model).
- **Consistent with** [ADR-0010](ADR-0010-map-database-rows-to-code-by-hand-without-an-orm.md), [ADR-0012](ADR-0012-transform-pipeline-data-in-typescript-and-mysql-with-no-transform-library.md) and [ADR-0019](ADR-0019-call-the-graphql-api-through-a-hand-written-request-layer-with-tanstack-query-for-caching.md): hand-written by default; a library only where it clearly wins.
