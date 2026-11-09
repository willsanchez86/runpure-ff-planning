# ADR-0002: Build the Phase 1 web app with Next.js

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-11-05 |
| Decision-makers | Project owner |
| Consulted | None |
| Confidence | High: stated by the project owner as the Phase 1 plan |
| Supersedes | None |
| Revised | 2026-11-09, in place, at the owner's direction (not finalized): consequences and open-question notes updated: ADR-0008 answered open questions 2 and 3, and the screens get their data from the Express API |
| Related | Overview PRD (Phase 1 scope); ADR-0008 (backend: API, pipeline and scheduler); ADR-0014 (browser calls the API directly); [`design/system-design.md`](../system-design.md) §3 |

## Context and problem statement
Phase 1 is a deployed web app that recreates Sleeper's screens. The screens need heavy in-browser interactivity: sorting and filtering the full player list, a scoring toggle, and player cards.

## Decision drivers
- Fit for highly interactive screens.
- Deployable as the Phase 1 product.

## Considered options
### Option 1: Next.js
- Good: a full-stack React framework; can be deployed as a Node.js server, a Docker container or a static export ([Next.js](https://nextjs.org/docs/pages/building-your-application/deploying)).
- Bad: ties the web app to JavaScript/TypeScript and the framework's release cycle.

### Option 2: A TypeScript single-page app served by a separate backend
- Good: frontend and backend fully separate.
- Bad: two deploys from the start.

### Option 3: Server-rendered pages with light JavaScript (e.g. htmx)
- Good: simpler builds.
- Bad: client-side sorting and toggles at this level of interactivity get awkward.

## Decision outcome
Chosen option: **Option 1**, the project owner's stated plan for Phase 1.

We will build the Phase 1 web app with Next.js.

## Consequences
- Good: one framework for the screens. Their data comes from the Express API, which the browser calls directly (ADR-0008, ADR-0014).
- Bad: hosting must support Next.js. Next.js is the frontend; the always-on Node server requirement belongs to the Express backend (ADR-0008).
- Neutral: this decides the web app's language (JavaScript/TypeScript). The server-side language was decided later: Node.js (ADR-0008), with the pipeline in TypeScript (ADR-0009); open question 3 is answered.

## Confirmation
The web app's repository builds with `next build` and runs with `next start`.

## More information
Open question 2 (one full-stack app vs separate frontend and backend) was answered by ADR-0008: Next.js frontend, separate Express backend.
