# Templates — Runpure FF

**Last updated:** 2026-11-18
**Purpose:** blank structures for the project's recurring documents, so every document of the same kind has the same shape. Document authority, ownership and change rules are in [`documentation-suite.md`](documentation-suite.md); lifecycle stages and handoffs are in [`delivery-lifecycle.md`](delivery-lifecycle.md).

**Contents:**
1. Architecture Decision Record (ADR)
2. Product Requirements Document (PRD)
3. System Architecture & Design Document (SADD)
4. Master Test & Deployment Plan (MTDP)

---

## 1. Architecture Decision Record (ADR)

### What an ADR is

A short record of **one** architecturally significant decision: the context that forced it, the options considered, the decision, and its consequences. The ADRs together form the **decision log**; its index is [`design/architecture-decisions.md`](../design/architecture-decisions.md).

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
- **From implementation on, ADRs are never edited**, except to change the status line to "Superseded by ADR-NNNN" or "Deprecated". A changed decision is then a new ADR that supersedes the old one. A decision that only narrows or changes part of an implemented ADR is a new ADR that links to it; the old ADR stays Accepted, and its decision-log row is annotated with what changed and by which ADR.
- **When implementation starts:** when the first code that carries out the ADR is committed to a code repository. The owner then adds the ADR's **Implementation started** line with that date. Only an Accepted ADR gets this line. The planning repo's pre-commit check enforces the previous rule for every ADR that has this line, and only for those.
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
- Every ADR is listed in [`design/architecture-decisions.md`](../design/architecture-decisions.md).

### Blank template

```markdown
# ADR-NNNN: <The decision, as a short statement>

**Status:** Proposed / Accepted / Rejected / Deprecated / Superseded by ADR-NNNN
**Date:** YYYY-MM-DD (decided) · recorded YYYY-MM-DD
**Revised:** YYYY-MM-DD, in place, at the owner's direction (not finalized): <what changed; earlier versions> (only if revised before implementation)
**Implementation started:** YYYY-MM-DD (dated to the first implementing commit; added under the owner's standing authorization of 2026-11-17, reviewed in the planning PR)
**Deciders:** <who decided>
**Rules out:** <term>; <term> (optional: tools or approaches this decision excludes; the doc check fails any PRD, design doc or spec that names one without citing this ADR)

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
| **Implementation started** | Dated to the first commit carrying out the ADR. Added by Claude under the owner's standing authorization (2026-11-17) in the same change set as the gating pull request, and reviewed by the owner in the planning PR; from then on the ADR is frozen except for its status line |
| **Deciders** | Who made the decision |
| **Rules out** | Optional. Terms the decision excludes, separated by semicolons. The doc check reports any current document that names one, unless the line also negates it or cites this ADR |
| **Context** | The facts and forces that made a decision necessary |
| **Decision** | The decision in one bold line, then any detail it needs |
| **Options Considered** | Every option actually discussed. The chosen one gets a dimension table; the others get a short paragraph on why they lost |
| **Consequences** | Binding constraints (if any), what becomes easier, what becomes harder or needs revisiting. Downsides are never left out |
| **Relationship to other decisions** | Supersedes, depends on, or changes other ADRs, with links |

---

The templates in sections 2–4 are kept short. Where each document lives is set in [`governance/documentation-suite.md`](documentation-suite.md) §3.

## 2. Product Requirements Document (PRD)

File: `prds/feature-<name>.md` for a feature, `prds/infra-<name>.md` for a technical PRD. Shared context (how the pages fit together, what each platform allows, shared terms) lives once in [`prds/00-overview.md`](../prds/00-overview.md); a PRD links to it instead of repeating it. Every PRD uses the sections below in this order. A technical PRD may add sections of its own (Data ETL & storage adds scope, sources, outputs and risks).

**Rules for the sections** (owner, 2026-11-18):

- **Targets carry two independent labels** (owner, 2026-11-18). Approval: **Proposed** or **Owner-approved** — who set the target. Measurement: **Uncalibrated** or **Baselined** — whether actual observations support it, stated with when, how and what was observed. The dimensions never mix: instrumentation existing does not make a target Baselined (only real observations do); an Owner-approved target stays Owner-approved while Uncalibrated; calibrating a number never changes who approved it. Every figure in "What success looks like" and "How we'll measure it" carries both labels and says how it is measured, **for which population**, and over what window; an unlabeled number is an error, not a default.
- **"Done when" includes the key failure behavior.** A must-have's acceptance criterion states what happens when its data is missing, stale or unverifiable (gaps stay gaps; writes fail closed), not only the success path.
- **Assumptions are open questions.** An assumption that could invalidate the PRD is recorded in "Open questions" with who validates it and whether it blocks building — never left implicit.

````markdown
# [Feature name]

**[One bold sentence: what it is and why it matters.]**

**Last updated:** YYYY-MM-DD

## At a glance

|  |  |
| --- | --- |
| **Status** | [SDLC stage — vocabulary in `prds/00-overview.md` "How to read each page" — plus one line of detail, dated] |
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

File: [`design/system-design.md`](../design/system-design.md) (one per system). It records how the parts fit together and cites the ADR behind every choice; it decides nothing itself. Structure revised 2026-11-19 (owner-approved), informed by arc42's canonical per-section guidance (Contents/Motivation/Form at [docs.arc42.org](https://docs.arc42.org/home/)) tailored to this project — tailoring is arc42's own advice; mapping and gap analysis: [`research/sadd-template-best-practices-research-2026-11-19.md`](../research/sadd-template-best-practices-research-2026-11-19.md).

**Document rules**

- **Table of contents required**, linking to every section; **change log at the end**, newest entry first.
- **Readable in isolation:** every statement carries its content inline, with the deciding record as a parenthetical citation — a reader must never need to open a link to understand a sentence.
- **Document-once:** shared terms and the glossary live on the PRD Overview; feature behaviour lives in PRDs; build detail lives in specs. This document links to them and never restates them.
- **It decides nothing:** every choice cites its ADR (or names where the open question is tracked). Targets carry the two labels from §2's PRD rules (Approval × Measurement).

Each section below states what it contains and what it must **not** contain (and where that content lives instead).

| § | Section | Contains | Does **not** contain |
|---|---|---|---|
| — | Contents | Linked TOC, one line per section | Prose |
| 1 | **System overview** | A one-paragraph summary a newcomer can read first; the context diagram (every deployable and external service); a component table (one-line responsibility + deciding ADR each); the numbered runtime data flow; any boundary rules between components | Requirements; justifications or rejected alternatives (ADRs); configuration and code detail (specs) |
| 2 | **Requirements** | Functional scope summarised from the PRDs; the non-functional table with a source per row — quality goals drive the document; constraints; the load estimate with measurement provenance | Feature acceptance criteria (PRDs); unlabeled or unsourced targets; aspirations with no owning record |
| 3 | **Design guardrails** | Firm crosscutting rules the owner set, each with why it avoids rework, how it is met (cited), and the exception process | Aspirational principles not actually binding; implementation detail; anything without an owner decision behind it |
| 4 | **Technology decisions** | One row per decided question: question → answer → ADR; then the "not decided" list naming where each open item is tracked | Rationale and rejected options (the ADR owns those); any decision lacking an ADR where the ADR rule applies; product scope (PRDs) |
| 5 | **Data ownership and API design** | Which component owns and writes each data family, and its store; API rules that bind across features (auth, contract, limits, deprecation); error-handling conventions | Table schemas and column lists (specs); per-field API documentation (the committed schema is the contract); screen behaviour (PRDs) |
| 6 | **Hosting and deployment requirements** | What any hosting option must satisfy, derived from the architecture; the workload profile with measurement provenance; the owner's dated selection constraints; once hosting is decided, the deployment topology — which building block runs on which infrastructure (arc42 §7's software-to-infrastructure mapping) | Provider comparisons (research documents); the chosen provider's rationale (its ADR); deployment steps (the MTDP) |
| 7 | **Reliability and operations** | Failure modes with their recovery paths; monitoring posture; backup posture; the pre-deployment hardening checklist | Test plans and release checks (MTDP); incident history and work items (the designated tracker) |
| 8 | **Repositories and shared artifacts** | The repository table (holds / deploys) and every artifact shared between repos, with its synchronisation rule | Directory layouts and build commands (each repo's README) |
| 9 | **Trade-offs accepted** | The closed list: what was consciously given up, citing the deciding ADR | Open risks (§10); regrets without a deciding record |
| 10 | **Risks and technical debt** | The open register, prioritized (arc42 §11 form): known risks and owed work — each with impact, a suggested mitigation or measure, the trigger to act, and where it is tracked | Accepted trade-offs (§9); the work items themselves (the tracker owns execution); product backlog (PRDs) |
| 11 | **Growth triggers** | Condition → response pairs: what change in scale or need activates what prepared path | Speculative features (PRD "Later" tables); dates or commitments |
| 12 | **Change log** | Dated, versioned entries, newest first, each saying what changed and why | Content that exists only here — a change is made in its section and recorded here, never only logged; future plans |

**Optional elements (include only on owner request — arc42 canon, verbatim form)**

- **Stakeholders table** (arc42 §1.3), added under §2 Requirements when the project has more than one party: columns **Role/Name | Contact | Expectations** — "all person, roles or organizations that should know the architecture, need convincing of it, work with the code, require documentation for their work, or make decisions about the system." Omitted by default here because there is one stakeholder, the owner. ([docs.arc42.org/section-1](https://docs.arc42.org/section-1/))
- **Multi-level building-block view** (arc42 §5), replacing §1's flat component table when the system outgrows it: Level 1 = "the white box description of the overall system together with black box descriptions of all contained building blocks"; Level 2 zooms into selected level-1 blocks; Level 3 onward likewise. A **white box** carries an overview diagram, the motivation for the decomposition, and black-box descriptions of its contained blocks; a **black box** carries Purpose/Responsibility, Interface(s), and optionally quality characteristics, location, fulfilled requirements, open issues. arc42's own advice: "relevance over completeness." ([docs.arc42.org/section-5](https://docs.arc42.org/section-5/))
- **Multi-level deployment view** (arc42 §7), extending §6 when infrastructure nests: Infrastructure Level 1 (overall topology: locations, environments, nodes, channels) and Level 2 zooms into selected nodes; include the software-to-infrastructure mapping at each level. ([docs.arc42.org/section-7](https://docs.arc42.org/section-7/))

**Blank skeleton**

````markdown
# System Design — [Project Name]

**Status:** Draft vN.N · **Owner:** [Name] · **Date:** YYYY-MM-DD
**Purpose:** [one line] **Inputs:** [PRDs, specs, decision log]

## Contents
[Linked TOC]

## 1. System overview
[Summary paragraph; context diagram; component table (| Component | What it does | Decided in |); boundary rules; numbered data flow]

## 2. Requirements
[Functional summary; non-functional table (| Requirement | Target | Source |); constraints; load estimate with provenance]

## 3. Design guardrails
[| # | Requirement | Why it avoids rework | How it's met (ADR) | — plus allowances and the exception process]

## 4. Technology decisions
[| Question | Answer | ADR | — then "Not decided (tracked elsewhere)"]

## 5. Data ownership and API design
[| Data | Owner | Store | — then API rules; error-handling conventions]

## 6. Hosting and deployment requirements
[Stack; deployables; hard requirements; workload profile; owner constraints (dated)]

## 7. Reliability and operations
[Failure handling; monitoring; backups; pre-deployment hardening list]

## 8. Repositories and shared artifacts
[| Repository | Holds | Deploys | — then shared artifacts and their sync rules]

## 9. Trade-offs accepted
[| Choice | Gives up | ADR |]

## 10. Risks and technical debt
[| Item | Type (risk/debt) | Impact | Mitigation / measure | Trigger to act · tracked where | — prioritized, worst first]

## 11. Growth triggers
[Condition → response pairs]

## 12. Change log
[- **vN.N (YYYY-MM-DD):** what changed and why — newest first]
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
