# Work Tracking & Completion

**Status:** Owner-approved (2026-11-19) — governing once this change is baselined to `main`. Designated tracker (owner, 2026-11-19): **GitHub Issues in `runpure-ff-planning`** is the single source of truth for actionable work; `design/reviews/` records remain historical. The procedure itself stays tool-agnostic

**Last drafted:** 2026-11-18

**Purpose:** Keep outstanding work, dependencies, and completion evidence visible from intake through maintenance without turning the tracker into a second source of requirements or decisions. This procedure is product- and tool-agnostic.

## 1. Authority and boundaries

- **One accountable view of remaining work.** Use an owner-designated tracker or a single indexed view over linked trackers. If work spans repositories, link related items instead of maintaining conflicting copies of their status. **The tool and location are not selected by this proposal**; the owner chooses them through applicable governance.
- **The tracker records execution, not authority.** PRDs govern approved scope and acceptance; the architecture decision log and accepted ADRs govern architecture decisions; design/specification documents govern their respective detail; the delivery lifecycle governs handoffs. A task, issue comment, checked box, or merged pull request never approves a proposal or closes an open decision.
- **Proportional detail.** A small correction may need one item. Larger efforts may use a parent item and linked tasks. Do not create a task per sentence, a duplicate status register, or a new file for each stage.
- **Approval remains explicit.** Track unapproved decisions as awaiting owner action, with a link to the authoritative Proposed item. An agent cannot close, accept, or implement a proposal merely by updating its tracker status. Follow [`documentation-suite.md`](documentation-suite.md) for approval and change rules.

## 2. What must remain visible

Capture or link work needed to fulfill approved requirements and their acceptance checks, implementation and documentation changes, verification, defects, risks, blockers, owner decisions awaiting approval, release prerequisites, and post-release follow-ups. Include deferred work when it is intentionally retained for a later decision; a PRD's “Should have soon after” or “Later” item is **not** automatically approved for implementation.

The tracker should support a live **remaining-work view** showing unfinished in-scope items, blockers and their owners, dependencies, upcoming release prerequisites, unresolved defects, and deferred work separately. Compare that view with the applicable PRDs, implementation specs, verification evidence, and the architecture decision log at handoffs so omissions become visible.

## 3. Minimum work-item information

Use fields, labels, or structured descriptions in the chosen tool; not every item needs a separate form.

| Field | Minimum expectation |
| --- | --- |
| **Identifier and outcome** | Stable link or ID; a short statement of what completion means. |
| **Type and scope** | Feature/task, defect, documentation, verification, decision follow-up, dependency, or other useful classification; affected component or deliverable. |
| **Owner and priority** | One accountable owner and a priority appropriate to the work; target milestone or date only when relevant. |
| **Status and blocker** | Current work status; if blocked, the reason, owner of the unblock, and related item. |
| **Authority links** | Relevant PRD requirement, approved ADR/decision, design/spec, or explicitly Proposed question. Distinguish authorized work from unapproved proposals. |
| **Dependencies and evidence** | Linked prerequisites and, before closure, applicable review, test, documentation/reconciliation, or release evidence. |

## 4. Work status and transitions

| Status | Meaning / next action |
| --- | --- |
| **Captured** | Recorded but not yet triaged; no implementation authorization implied. |
| **Ready** | Scope and prerequisites are understood, required approvals and baseline gates are met for the *next action*, and an owner is assigned. |
| **In progress** | Authorized work is underway; new blockers and scope changes are surfaced. |
| **Blocked** | Cannot proceed because a prerequisite, approval, dependency, or defect is unresolved; the unblock action is linked. |
| **In review / verification** | Deliverable exists and is being reviewed, tested, or reconciled against its governing source. |
| **Done** | Applicable acceptance conditions and required approvals are satisfied; evidence and affected records are linked. |
| **Deferred / canceled** | Not currently proceeding; record the reason, decision authority where needed, and a revisit trigger for deferred work. Do not silently remove approved scope. |

These are **work execution states**, not document SDLC stages, ADR statuses, owner approval labels, or metric calibration labels. A work item can be “Done” because it delivered research while the resulting decision remains **Proposed**. Moving a work item to Ready does not waive any governance gate.

## 5. Handoff and completion checks

At each applicable lifecycle handoff, the responsible contributor:

1. Links the output and evidence to its work item, updates status, ownership, dependencies, and blockers, and identifies any newly discovered follow-up work.
2. Confirms the current work matches its approved scope; records discrepancies as a proposed change or corrective item rather than silently editing the approved baseline.
3. Checks required reviews and tests, affected-document reconciliation, and owner sign-off **where existing governance requires it**; a merged PR alone is insufficient evidence of overall completion.
4. Marks **Done** only for the stated item's acceptance conditions and records unfinished work separately; acceptance of a feature is distinct from authorization to deploy.

Before declaring a milestone, feature, or release complete, review the remaining-work view against its approved scope and Must-have acceptance evidence. Every requirement must be satisfied or have a visible, explicitly authorized disposition under existing policy; no failed Must-have may be waived for production deployment. Record known limitations, release follow-ups, and unresolved deferred items without claiming the entire backlog is complete.

## 6. Review and maintenance

Review active items at meaningful handoffs and before an acceptance or release decision; periodically revisit blocked and deferred items. Use lightweight saved filters or a dashboard rather than a second manually maintained spreadsheet. Watch for orphaned requirements without tasks or tests, tasks without approved source requirements, unowned blockers, stale status, and “Done” items missing evidence; route corrections to the authoritative source.

This document does not prescribe a vendor, reporting cadence, repository structure, new approval power, or additional mandatory release gate. Apply it only after owner approval and baselining, and use it with [`delivery-lifecycle.md`](delivery-lifecycle.md), [`documentation-suite.md`](documentation-suite.md), and [`templates.md`](templates.md).
