# Templates — Runpure FF

**Last updated:** 2026-11-09
**Purpose:** blank structures for the project's recurring documents, so every document of the same kind has the same shape. The documents themselves, and the rules governing them, are described in `design/documentation-suite.md`.

**Contents:**
1. Architecture Decision Record (ADR)
2. Product Requirements Document (PRD)
3. System Architecture & Design Document (SADD)
4. Master Test & Deployment Plan (MTDP)

---

## 1. Architecture Decision Record (ADR)

### What an ADR is

A short record of **one** architecturally significant decision: the context that forced it, the options considered, the decision, and its consequences. The ADRs together form the **decision log**; its index is `design/architecture-decisions.md`.

**Structure:** set by the project owner (2026-11-05). ADR-0005, ADR-0008 and ADR-0010 onward use it.

### When to write one

Write an ADR for a decision that affects (from [AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html)):
- structure (patterns, component boundaries);
- non-functional requirements (security, availability, fault tolerance);
- dependencies (coupling between components and external services);
- interfaces (APIs and published contracts);
- construction techniques (libraries, frameworks, tools, processes).

**Rules**
- **One decision per ADR.** A decision with phases (now / later) gets one ADR per phase.
- **The title is the decision**, phrased as a short statement ("Use MySQL for the app database"), not the topic ("Database").
- **Before implementation, ADRs are revised in place.** Until an ADR's implementation has started, the owner may change it directly. A decision that replaces it is merged into the original ADR, which gains a **Revised** line naming its earlier versions; the replacing ADR is deleted; the later ADRs are renumbered so there are no gaps; and every cross-reference across the planning documents is updated.
- **From implementation on, ADRs are never edited**, except to change the status line to "Superseded by ADR-NNNN" or "Deprecated". A changed decision is then a new ADR that supersedes the old one.
- **When implementation starts:** when the first code that carries out the ADR is committed to a code repository. The owner then adds the ADR's **Implementation started** line with that date. The planning repo's pre-commit check enforces the previous rule for every ADR that has this line, and only for those.
- **Only decisions the project owner has made** are recorded as Accepted. Open questions stay in the decision log's Open list until decided.

### Lifecycle

| Status | Meaning |
|---|---|
| Proposed | Written and ready for review; not yet decided |
| Accepted | Decided; in force |
| Rejected | Considered and turned down; kept so the question isn't reopened without new information |
| Deprecated | No longer relevant, with no replacement |
| Superseded by ADR-NNNN | Replaced by a later ADR, which is linked. Used only once implementation has started; before that, the replacing decision is merged into this ADR in place |

### Files and numbering

- Location: `design/decisions/ADR-NNNN-short-title.md`.
- Numbers are four digits and sequential, with no gaps.
- Before implementation, ADRs are renumbered when one is merged away (see Rules). Once an ADR's implementation has started, its number never changes and is never reused.
- Every ADR is listed in `design/architecture-decisions.md`.

### Blank template

```markdown
# ADR-NNNN: <The decision, as a short statement>

**Status:** Proposed / Accepted / Rejected / Deprecated / Superseded by ADR-NNNN
**Date:** YYYY-MM-DD (decided) · recorded YYYY-MM-DD
**Revised:** YYYY-MM-DD, in place, before implementation: <what changed; earlier versions> (only if revised)
**Implementation started:** YYYY-MM-DD (added by the owner when the first implementing code is committed)
**Deciders:** <who decided>

## Context

<The situation and the question that forced a decision. Facts only; no decision yet.>

## Decision

**<The decision in one bold line.>** <What it covers, in as much detail as needed: scope, parts, staging.>

## Options Considered

### Option A — <name> (chosen)
| Dimension | Assessment |
|---|---|
| <criterion that mattered> | <how this option scores> |

### Option B — <name> (rejected / not chosen)
<One short paragraph on why it lost.>

## Consequences

**<Binding constraints>** (optional): <rules this decision imposes on later work.>

**Easier:** <what this decision makes easier.>
**Harder / to revisit:** <what it makes harder, risks taken on, and what to revisit.>

## Relationship to other decisions

<Which ADRs this supersedes, depends on, or changes, and how they fit together.>
```

### Section guide

| Section | What to write |
|---|---|
| **Title** | `ADR-NNNN:` plus the decision as a short statement |
| **Status** | One value from the lifecycle table |
| **Date** | The date it was decided, and the date it was recorded if different |
| **Revised** | Only for an ADR changed in place before implementation: the date, what changed, and its earlier versions |
| **Implementation started** | Added by the owner on the date the first code carrying out the ADR is committed; from then on the ADR is frozen except for its status line |
| **Deciders** | Who made the decision |
| **Context** | The facts and forces that made a decision necessary |
| **Decision** | The decision in one bold line, then any detail it needs |
| **Options Considered** | Every option actually discussed. The chosen one gets a dimension table; the others get a short paragraph on why they lost |
| **Consequences** | Binding constraints (if any), what becomes easier, what becomes harder or needs revisiting. Downsides are never left out |
| **Relationship to other decisions** | Supersedes, depends on, or changes other ADRs, with links |

---

The templates in sections 2–4 are kept short. Where each document lives is set in `design/documentation-suite.md` §3.

## 2. Product Requirements Document (PRD)

File: `prds/feature-<name>.md` for a feature, `prds/infra-<name>.md` for a technical PRD. Shared context (how the pages fit together, what each platform allows, shared terms) lives once in `prds/00-overview.md`; a PRD links to it instead of repeating it. Every PRD uses the sections below in this order. A technical PRD may add sections of its own (Data ETL & storage adds scope, sources, outputs and risks).

````markdown
# [Feature name]

**[One bold sentence: what it is and why it matters.]**

**Last updated:** YYYY-MM-DD

## At a glance

|  |  |
| --- | --- |
| **Serves** | [The journey it serves] |
| **Viewing data** | [Which phase] |
| **Making changes** | [Which phase, or "None. View only"] |
| **Depends on** | [Other PRDs, with links] |

## The problem

[2–3 sentences: what's hard today, for whom.]

## What success looks like

| Goal | Target |
| --- | --- |

## Not doing

| Not doing | Why not |
| --- | --- |

## User stories

- As the owner, I want [capability], so [benefit].

## Must have for launch

| Requirement | Done when |
| --- | --- |

## Should have soon after

| Requirement | Done when |
| --- | --- |

## Later

| Idea | Why it's parked |
| --- | --- |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |

## Open questions

| Question | Blocks building? | Who answers | Status |
| --- | --- | --- | --- |

## Build order

1. [First slice]
````

## 3. System Architecture & Design Document (SADD)

File: `design/system-design.md` (one per system). It records how the parts fit together and points to the ADR behind every choice; it decides nothing itself.

````markdown
# System Design — [Project Name]

**Status:** Draft vN.N · **Owner:** [Name] · **Date:** YYYY-MM-DD
**vN.N (YYYY-MM-DD):** [what changed]
**Purpose:** [one line]
**Inputs:** [PRDs, specs, decision log]

## 0. Guardrail
| # | Requirement | Why it avoids rework | How it's met (ADR) |
|---|---|---|---|

## 1. Requirements
[Functional scope from the PRDs; non-functional targets with their sources; constraints; load estimate]

## 2. High-level design
[Diagram (Mermaid); component table with the ADR that decides each; boundary rule; numbered data flow]

## 3. Decisions this design rests on
| Question | Answer | ADR |
|---|---|---|
[Then: what is not decided yet, and where it's tracked]

## 4. Deep dive
[Data ownership table; API (style, contract, auth, limits); error handling]

## 5. Reliability and monitoring

## 6. Repositories
| Repository | Holds | Deploys |
|---|---|---|

## 7. Trade-offs accepted
| Choice | Gives up | ADR |
|---|---|---|

## 8. Revisit as it grows
````

## 4. Master Test & Deployment Plan (MTDP)

File: `design/mtdp.md`. Written before the first hosted deploy. The deployment steps follow the accepted ADRs: schema changes are hand-applied statements from `sql/` (ADR-0011), not a migration tool.

````markdown
# Master Test & Deployment Plan (MTDP)

## 1. Document control
*   **Status:** [Draft / Baseline]
*   **Owner:** [Name]
*   **Last updated:** [YYYY-MM-DD]
*   **Rule:** no production deploy while any Must-have check in section 2 fails.

## 2. Acceptance matrix
*Maps each PRD Must-have to a check.*

| Requirement | Check | Test type | When it runs | Pass condition |
| :--- | :--- | :--- | :--- | :--- |
| [PRD page, Must-have item] | [What is verified] | [Unit / Integration / E2E / Load] | [Pre-commit / CI / Pre-deploy] | [Observable result] |

## 3. CI/CD pipeline
*   **CI host:** [e.g. GitHub Actions]
*   **On every pull request:** [lint; tests; GraphQL breaking-change check (ADR-0016); doc links]
*   **On merge to main:** [build; deploy to staging, then production]

## 4. Release runbook
1.  **Schema:** apply any new statements from `sql/`, in order, to the target database (ADR-0011). Additive changes first.
2.  **Backend:** deploy the backend before the frontend, so new persisted queries are registered first (ADR-0016).
3.  **Frontend:** deploy the frontend.
4.  **Verify:** [smoke checks]

## 5. Rollback
*   **Trigger:** [e.g. error rate or failed smoke check after deploy]
*   **Steps:**
    1.  Redeploy the previous frontend, then the previous backend.
    2.  Reverse any schema change with its prepared reverse statement, if one was applied.
    3.  [Record what happened]
````
