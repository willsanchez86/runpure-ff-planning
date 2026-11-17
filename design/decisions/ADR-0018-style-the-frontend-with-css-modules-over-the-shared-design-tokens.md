# ADR-0018: Style the frontend with CSS Modules over the shared design tokens

**Status:** Accepted
**Date:** 2026-11-16
**Deciders:** William Sanchez
**Rules out:** Tailwind

## Context

The frontend repository is being specified ([`specs/ff-frontend-foundation-spec.md`](../../specs/ff-frontend-foundation-spec.md)). The visual system's canonical values live in [`design/tokens.css`](../tokens.css) as CSS custom properties, which [`design-language.md`](../design-language.md) names the source of truth any screen consumes. The Phase 1 prototype implements the design as one global stylesheet (~45 KB). Next.js supports CSS Modules natively, with no runtime dependency.

## Decision

**The frontend is styled with CSS Modules per component, consuming the shared `design/tokens.css` custom properties. No styling framework.**

- `tokens.css` is imported once at the app root as the global custom-property layer; a small `globals.css` carries the reset, base type scale and accessibility primitives.
- Every component owns a `*.module.css`, ported from the prototype's stylesheet section by section as that component is built.
- How the token file crosses repos (verbatim copy with a CI drift check) is spec detail (foundation spec P4), not part of this decision.

## Options Considered

### Option A — CSS Modules + tokens.css (chosen)
| Dimension | Assessment |
|---|---|
| Runtime dependencies | None; CSS Modules are built into Next.js |
| Fidelity to the design language | Consumes `tokens.css` directly, as `design-language.md` requires |
| Port cost from the prototype | Low: existing CSS moves into per-component files largely unchanged |
| Scoping | Class names scoped per component; no collision or dead-CSS growth |

### Option B — Tailwind mapped to the tokens (not chosen)
Faster iteration later, but every prototype style would be translated to utility classes and the token file would no longer be consumed directly. Not chosen by the project owner.

### Option C — Keep one global stylesheet (not chosen)
The fastest port, but class-name collisions and dead-CSS risk grow with every later screen. Not chosen by the project owner.

## Consequences

**Easier:** zero styling dependencies to track; the design language's source of truth is consumed as-is; styles live beside the component they serve.
**Harder / to revisit:** porting the prototype's stylesheet is manual work spread across every component build; no utility-class shorthand for one-off layouts. Revisit if a later phase's screen volume makes per-component CSS maintenance heavier than a utility system would be.

## Relationship to other decisions

- **Depends on** [ADR-0002](ADR-0002-build-the-phase-1-web-app-with-nextjs.md) (Next.js provides CSS Modules).
- **Consistent with** [ADR-0001](ADR-0001-design-for-multiple-users-from-day-one.md) (nothing visual assumes one user) and the design language ([`design/design-language.md`](../design-language.md)).
