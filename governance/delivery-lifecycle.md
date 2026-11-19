# Delivery Lifecycle

**Status:** Owner-approved (2026-11-19) — governing once this change is baselined to `main`

**Last drafted:** 2026-11-18

**Purpose:** Define a reusable path from an idea to an accepted, released, and maintained change, with clear handoffs and evidence. This process applies to features, infrastructure, fixes, and documentation changes; use only the stages and artifacts relevant to the work.

## 1. Scope and authority

- **This document governs the workflow, not the product.** Product requirements, release scope, architecture, and technology choices belong in their respective authoritative records. No example in this document creates a product requirement.
- **Project bindings stay local.** Repository-specific checks, merge order, deployment commands, and technology-dependent procedures remain in project-owned implementation or operating records; reference them from the project entry point instead of copying them into this reusable lifecycle.
- **Use existing governance.** [`documentation-suite.md`](documentation-suite.md) defines document ownership, approval, baselining, ADR handling, and change propagation; [`templates.md`](templates.md) defines document structures. This lifecycle supplies stage transitions and checklists, not competing rules.
- **Approval is explicit.** Contributors may propose and research; only the designated approver may accept requirements, decisions, exceptions, or release readiness. Silence, implementation, and prior recommendations are not approval. Proposed resolutions remain open until explicitly approved; downstream work must not treat them as decided.
- **Maintain traceability without duplication.** Link an issue or change request to the applicable requirements, decisions, design, specification, implementation, checks, and release evidence. Keep each authoritative statement in one place; use [`work-tracking-and-completion.md`](work-tracking-and-completion.md) for the proposed approach to remaining work and closure.
- **Apply proportional rigor.** Small corrections can use a shortened path; material changes, external dependencies, security risks, or altered contracts require the relevant design and verification steps. Existing mandatory gates still apply.
- **Mandatory gates are not waivable through this lifecycle.** The governing rules require owner-approved Must-have scope before the corresponding implementation spec, committed PRD and relied-on system-design baselines before feature code, and approved ADRs wherever the ADR rule applies. The existing MTDP template requires that no production deployment proceed while an applicable Must-have acceptance check fails; the MTDP itself is required before the first hosted deployment. Any change to those gates must follow its own governing approval/change process; a lifecycle exception does not override them.
- **Reconcile continuously.** When evidence or implementation conflicts with the approved baseline, correct the work or propose a change for approval; do not silently update the source of truth by building something different.

## 2. Lifecycle stages and handoff gates

Each stage has an **exit condition**; its output is the next stage's input. A stage can be combined with another when the work is small, provided no required decision, review, or test is skipped.

| Stage | Output or evidence | Exit condition / handoff checklist |
| --- | --- | --- |
| **1. Intake & triage** | Issue, request, or short brief | Problem and desired outcome are clear; affected area, urgency, owner, and next step are identified. Decide whether research and fuller requirements are needed. |
| **2. Discovery & research** *(conditional)* | Research note, prototype findings, or decision review | Material unknowns, options, evidence, risks, and sources are recorded; unresolved questions have owners and are not represented as decisions. |
| **3. Requirements & scope** | PRD or an appropriately scoped change request | Users or stakeholders, intended behavior, boundaries, dependencies, acceptance criteria (including relevant failure behavior), and success measures are clear. Any implementation-blocking questions are identified. For a feature PRD, its Must-have scope is owner-approved before specification and its required baseline is committed before feature code. |
| **4. Design & decisions** *(when needed)* | Design updates and decision records | Interfaces, data ownership, constraints, security/privacy, operational concerns, and material trade-offs are considered as applicable. Required decisions are explicitly approved and linked. |
| **5. Implementation planning & handoff** | Implementation specification or linked work plan | The implementer can identify approved Must-have scope, committed PRD and applicable system-design baselines, required accepted ADRs, dependencies, **tracked remaining work**, contracts, migration/rollback needs where relevant, verification approach, and unresolved blockers. No unapproved assumption is silently treated as settled. |
| **6. Build & review** | Code/configuration/documentation change with review record | Changes implement approved scope; appropriate checks pass; reviewers can trace work to the governing records. Any discovered deviation is reconciled or escalated before acceptance. |
| **7. Verification** | Test results and acceptance evidence | Each applicable must-have has a reproducible pass/fail check; important success, error, edge, authorization, and recovery scenarios are covered; gaps and limitations are visible. Targets and observed results are not conflated. |
| **8. Acceptance & reconciliation** | Acceptance evidence; updated affected docs and work items | Requirements, decisions, design, specs, implementation, and evidence agree. The designated approver dispositions any material deviation or exception allowed by existing policy; mandatory gates cannot be bypassed. Outstanding follow-ups remain visible. Acceptance for limited use does not imply release authorization. |
| **9. Release readiness** *(when releasing)* | Release checklist or release plan | Required acceptance and quality gates pass; before the first hosted deployment, the MTDP exists as required by governance. No production deployment proceeds with a failed applicable Must-have check. Scope and known limitations are communicated; deployment, monitoring, recovery, rollback, and release authorization are ready where applicable. |
| **10. Release / deploy & validate** *(when releasing)* | Release record and post-release checks | Released version and configuration are identifiable; smoke checks and critical signals are reviewed; failure triggers an established hold, rollback, or recovery path. |
| **11. Operate, measure & improve** | Monitoring evidence, incidents, issues, or improvement requests | Performance and outcomes are reviewed; defects and new ideas re-enter the lifecycle at the earliest appropriate stage; affected records remain current. |

**Parallel and iterative work:** Discovery, design, specification, and implementation can iterate, and verification begins before the end of build. Approval and baseline constraints still apply at each handoff. These 11 workflow stages describe activities and handoffs; they do **not** replace document-level SDLC status fields.

## 3. Document-to-lifecycle mapping

This table routes **existing document types** into the stages above; it does not create new templates or require a separate file for every stage. [`documentation-suite.md`](documentation-suite.md) remains authoritative for each document's purpose, ownership, location, and approval rules. A handoff may be a link to an existing record, not a new document.

| Document type | Role | Stage(s) | Required / conditional | Primary handoff |
| --- | --- | --- | --- | --- |
| **Documentation suite & templates** | Define governing rules and document structures | 1–11 (reference) | **Required:** standing governance references | Authors and reviewers apply the relevant rules and format. |
| **Delivery lifecycle** | Defines transitions, checks, and stage handoffs | 1–11 (reference) | **Required once approved:** standing workflow reference | Each stage owner hands on its exit evidence. |
| **Work tracking & completion procedure** | Defines how outstanding work and completion evidence are tracked | 1–11 (reference) | **Required once approved:** standing tracking guidance; no tool selected here | Stage owners update the chosen tracker and link source records and evidence. |
| **PRDs** (overview, feature, technical) | Establish approved scope, behavior, and acceptance | 3, 5, 7, 8 | **Required for feature work;** update when approved scope changes | Design, specification, and acceptance checks reference the PRD. |
| **System design (SADD)** | Describes system boundaries and architectural relationships | 4, 5, 8 | **Required where the feature relies on it;** affected portions baselined before code | Implementation spec and build link the relevant design. |
| **Interface design brief** | Defines interface behavior and user flows | 4, 5, 8 | **Conditional:** interface work | Implementation and reconciliation reference approved interface behavior. |
| **Design language & tokens** | Define reusable visual conventions and tokens | 4, 6, 8 | **Conditional:** design-system changes or relevant UI work | Implementation and design review use the current visual system. |
| **ADRs** | Record architecture-significant decisions and consequences | 4, 5, 8 | **Required when the ADR rule applies** | Design, specs, and code reference accepted decisions. |
| **Architecture decision log** | Indexes ADRs and tracks unresolved architecture questions | 2, 4, 8 | **Required:** standing decision register | Decision reviews and ADRs update the index/open items. |
| **Implementation specs** | Translate approved requirements/design into an implementation plan | 5, 6, 8 | **Required for PRD implementation per existing governance** | Implementers and verifiers use the spec and its links. |
| **Master Test & Deployment Plan (MTDP)** | Maps Must-haves to tests; governs release and rollback checks | 7, 9, 10, 11 | **Required before first hosted deploy;** maintained per release | Verification evidence and release/rollback operators use the plan. |
| **Research** | Records evidence, sources, and alternatives | 2, 3, 4 | **Conditional:** material unknowns need investigation | Requirements and decisions cite supporting findings. |
| **Decision reviews** | Preserve dated assessment of open decisions | 2, 4, 8 | **Conditional:** a formal decision review occurs | Open items and approved outcomes flow to their authoritative records. |
| **Prototypes** | Explore design options without becoming the source of truth | 2, 4, 8 | **Conditional:** prototype work is undertaken | Observations are reconciled into approved PRDs/design/specs as applicable. |

**Stage evidence is not necessarily a document type.** Issues, change requests, test results, review records, and release logs may live in a selected work-tracking tool and be linked rather than duplicated in this repository. The proposed tracking procedure describes this relationship but does not itself select a tool or create a tracker.

## 4. Document finalization, reconciliation, and reusable checklists

### Finalization and reconciliation at handoffs

A document is **drafted** when its content is proposed, **approved** only by the designated authority, and **baselined** when the approved version is committed under [`documentation-suite.md`](documentation-suite.md). These are separate from a target's observed measurement baseline. A review, prototype, tool result, or implemented behavior never authorizes a document change by itself.

| Handoff | What must be reconciled or finalized |
| --- | --- |
| **Requirements → design/specification** | The feature PRD's Must-have scope is explicitly owner-approved before its spec is written; required PRD and applicable system-design baselines are committed before feature code. Unresolved questions retain their actual status. |
| **Design → implementation** | Required architectural choices are recorded and accepted under the ADR rules; affected design, interfaces, and specification agree with approved requirements. Spec readiness is not permission to adopt an unapproved decision. |
| **Implementation → acceptance** | Compare implemented behavior and tests against PRDs, decisions, design, interface guidance, and specs. Correct mismatches or seek the necessary approval, then update affected records together and retain review/test evidence. Follow the special ADR and prototype reconciliation rules in the documentation suite. |
| **Acceptance → release/operations** | The accepted scope and tests are traceable; known gaps and remaining work are linked to the tracker. Release authorization and applicable MTDP checks are separate from acceptance. Post-release findings re-enter the lifecycle without silently rewriting baselines. |

Finalization is **per affected document and stage**, not a declaration that every document is permanently finished. Reopen an approved record only through its existing change rules; record outstanding actions in the selected tracker rather than treating a checklist as a substitute for work tracking.

### Before implementation

- [ ] Approved scope and applicable source records are linked.
- [ ] Required decisions are approved; unresolved questions that affect this work are tracked as blockers, not silently assumed away.
- [ ] Acceptance criteria include observable outcomes and material failure/edge cases.
- [ ] Dependencies, responsibilities, implementation approach, and verification plan are understood.
- [ ] Any required baseline and design/specification gates in existing governance are satisfied; feature code has not started before its PRD and relied-on system design were committed.

### Before accepting the change

- [ ] Implementation and applicable documentation match the approved scope and decisions.
- [ ] Relevant automated and manual checks have reproducible evidence.
- [ ] Security, access, reliability, compatibility, and recovery risks have been evaluated where applicable.
- [ ] Unmet criteria, exceptions, known limitations, and follow-up work are recorded and explicitly dispositioned by the appropriate authority.
- [ ] Traceability links and impacted records are updated together.
- [ ] Remaining work, blockers, and unresolved proposals are visible in the selected tracker; no dependent item was silently closed or approved.

### Before release and after release *(when applicable)*

- [ ] Release approval, target environment, version, and responsible party are known; the required MTDP is available before first hosted deployment and no production release has a failing Must-have acceptance check.
- [ ] Release/rollback procedures, smoke tests, monitoring, and incident contacts are ready.
- [ ] Post-release checks pass; unexpected outcomes are investigated and escalated.
- [ ] Observations feed maintenance, calibration, or new change requests.

## 5. Measurement and evidence

Define a measure with its **metric, target, method, population, and observation window** when it is used to judge success. Keep two distinct labels:

- **Approval:** *Proposed* or *Owner-approved* (who authorized the target).
- **Measurement:** *Uncalibrated* or *Baselined* (whether supported by actual observed data).

An approved target may be uncalibrated. Instrumentation or the existence of a data source does not by itself establish an observed baseline. Report actual results separately from target values, and route material target changes through the normal approval process.

## 6. Changes, exceptions, and reconciliation

| Situation | Required routing |
| --- | --- |
| **New or changed requirement** | Propose a change to the authoritative requirements record; obtain the required approval before treating it as baseline; update dependent records and tests. |
| **Architectural or cross-cutting choice** | Follow the existing decision-record policy, including the rule for changing an already-implemented decision. |
| **Prototype, test, or implementation reveals a different behavior** | Record the difference, restore alignment or seek approval for the change, and reconcile affected records. Discovery is not authorization. |
| **Defect within approved behavior** | Correct, review, and verify the defect through the appropriate work item; update governing records only if the approved contract changes. |
| **Urgent containment or repair** | Take the safety/recovery action permitted by existing policy, document the exception and impact, obtain required review, and reconcile records promptly. An emergency does not become retroactive blanket approval. |
| **Evidence changes a target, risk, or assumption** | Preserve the observation and propose any resulting requirement or decision change through normal governance. |

**Document ownership and approval precedence remain those of `documentation-suite.md`.** This document creates no new mandatory folder, document type, technology, product dependency, or release condition. Adopt it only after approval through the existing governance process.

## 7. Using and improving the workflow

Use the mapped documents as references rather than producing a new artifact at every stage. Start at the earliest affected stage, combine conditional stages when appropriate, and preserve all mandatory approval and release gates. Review the following signals periodically; they are **operational guidance, not additional gates**.

| Warning sign | Response |
| --- | --- |
| Documentation or approval effort outweighs the size of routine changes | Simplify conditional work and reuse existing records; do not bypass mandatory gates. |
| No reliable view of remaining work exists | Reconcile the chosen tracker against approved requirements, known blockers, defects, deferred work, and release follow-ups; avoid duplicate status lists. |
| Work waits on unresolved proposals | Surface the specific decision, owner and dependent work instead of assuming approval. |
| Implementation and documentation disagree | Reconcile as soon as detected, and verify alignment before acceptance. |
| Automated checks pass despite a substantive inconsistency | Add a human review of requirements, design, evidence and actual behavior. |
| Targets are marked validated without observations | Keep them Uncalibrated until supported by a recorded measurement window and method. |
