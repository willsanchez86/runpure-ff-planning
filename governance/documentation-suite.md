# Documentation Suite — Runpure FF

**Last updated:** 2026-11-09
**Purpose:** which planning documents exist, what each is for, where it lives, and how it changes. Blank structures for each are in [`governance/templates.md`](templates.md). Background research: [`research/minimal-planning-document-suite-research-2026-11-05.md`](../research/minimal-planning-document-suite-research-2026-11-05.md).

---

## 1. Where documents live

**One home per document.** Every planning document lives in this repository (`runpure-ff-planning`), as markdown, under version control and the doc check. Code lives in separate repositories (`runpure-ff-backend`, `runpure-ff-frontend`; ADR-0008); a code repo may link to a planning document but never keeps its own copy.

Earlier copies of the PRDs and the 2026-11-08 open-decisions review were online documents; they were moved here on 2026-11-09 and the online copies are no longer maintained.

## 2. Governance and change rules

```
[Draft] -> [Owner review] -> [Committed to main = Baselined]
                                     |
                      [ADR required for any decision listed in §2.2]
```

The project owner (William Sanchez) is the only approver. Claude may draft and propose, but records as decided only what the owner has decided.

### 2.1 The Baseline Rule
- No code is written for a feature until its PRD and the parts of the system design it relies on are committed to `main`.
- Minor adjustments (UI tweaks, variable naming) don't require document updates.

### 2.2 The ADR Rule
- Any decision affecting structure, non-functional requirements, dependencies, interfaces (including the API contract and database schema) or construction techniques requires an ADR in `design/decisions/`, listed in [`design/architecture-decisions.md`](../design/architecture-decisions.md) ([`governance/templates.md`](templates.md) §1).
- Before an ADR's implementation starts, it is revised in place: a replacing decision is merged into it, the replacing ADR is deleted, later ADRs are renumbered, and cross-references are updated.
- Once implementation has started (the ADR's **Implementation started** line is set), the ADR is never edited except for its status line. A changed decision then gets a new ADR that supersedes the old one. The pre-commit hook enforces this.
- Downstream documents (PRDs, system design, specs) are updated in the same change as the ADR that affects them. `node .claude/skills/doc-check/check.mjs` checks the mechanical links; the `doc-check` skill reviews content against accepted ADRs.

---

## 3. The documents

| Document | Answers | Location | Template |
|---|---|---|---|
| **PRDs** (Overview; feature PRDs; technical PRDs for infrastructure) | What is built and why; scope; acceptance; open product questions | `prds/` | [`governance/templates.md`](templates.md) §2 |
| **System design** (the SADD) | How the parts fit together; boundaries; data flow; how the multi-user guardrail is met | [`design/system-design.md`](../design/system-design.md) | §3 |
| **ADRs** and the decision log | One architectural decision each, with options and consequences; the log indexes them and holds open questions | `design/decisions/`, [`design/architecture-decisions.md`](../design/architecture-decisions.md) | §1 |
| **Implementation specs** | How one piece is built: sources, schema, jobs, sequencing | `specs/` (the ETL spec now; one per other PRD, written just before that piece is built) | — (follows the ETL spec's shape) |
| **Master Test & Deployment Plan** (MTDP) | Acceptance matrix, CI/CD, rollback | `design/mtdp.md`; not written yet, required before the first hosted deploy | §4 |
| **Research** | Evidence behind decisions, with sources | `research/<topic>-research-YYYY-MM-DD.md` | — |
| **Decision reviews** | Dated working records of a review of open decisions | `design/reviews/` | — |

### Document A: PRDs
- **Purpose:** what is built and why, with scope boundaries so the project doesn't creep.
- **Rule:** owned by the project owner. A feature PRD's Must-have scope is settled before its spec is written.
- **Required sections, in this order:** at a glance; the problem; what success looks like; not doing; user stories; must have for launch; should have soon after; later; how we'll measure it; open questions; build order ([`governance/templates.md`](templates.md) §2). A section with nothing in it says "None"; a technical PRD may add sections of its own.

### Document B: System design (SADD)
- **Purpose:** how the system is built so it scales without a rewrite (ADR-0001).
- **Rule:** decides nothing itself; every choice in it points to an ADR. Updated in the same change as any ADR that alters it.
- **Required sections:** guardrail; requirements; high-level design with a diagram; decisions it rests on; data ownership and API; reliability; repositories; trade-offs; revisit as it grows.

### Document C: Master Test & Deployment Plan (MTDP)
- **Purpose:** the application is verifiable and deployable the same way every time.
- **Rule:** written before the first hosted deploy, once the host is chosen (decision log, open item 4).
- **Required sections:** acceptance criteria matrix tied to PRD Must-haves; CI/CD pipeline; rollback runbook.

---

## 4. Maintenance matrix

| Document | Owner | Reviewed | Location |
|---|---|---|---|
| PRDs | Project owner | Per feature cycle | `prds/` |
| System design | Project owner | With every ADR that changes it | [`design/system-design.md`](../design/system-design.md) |
| ADRs and decision log | Project owner | Per decision | `design/decisions/`, [`design/architecture-decisions.md`](../design/architecture-decisions.md) |
| Implementation specs | Project owner | Per change to that piece | `specs/` |
| MTDP | Project owner | Per release | `design/mtdp.md` (not yet written) |
| Research | Claude, for the owner | When its decision is revisited | `research/` |
| Templates and this document | Project owner | When a rule changes | `governance/` |
