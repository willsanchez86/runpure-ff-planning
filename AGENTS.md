# Rules for agents in this repo

1. Record as Accepted only what the owner decided. Your own recommendations stay Proposed or in chat. "Decided", "Answered" and "Closed" statuses require the owner's explicit approval; "closed by default" is not a status.
2. An ADR with an **Implementation started** line is frozen except its status line. A changed decision is a new ADR.
3. An ADR without that line is revised in place (`adr-supersede` skill, Path A).
4. When an ADR changes, update every PRD, design doc and spec that mentions it in the same change. The reverse also holds: when a decision is made or discovered while building a prototype (or any downstream artifact), reconcile it back into the PRDs, design brief and specs it affects in the same change — a prototype is never a silent newer source of truth.
5. Run `node .claude/skills/doc-check/check.mjs` and fix every error before you finish.
6. Never commit with `--no-verify`. Never push to `main`; open a pull request.
7. Follow `governance/delivery-lifecycle.md` (owner-approved 2026-11-19): its applicable stages, gates, handoffs and verification/reconciliation checks apply to each change. It governs the workflow, never overrides the suite's authority rules.
8. Follow `governance/work-tracking-and-completion.md` (owner-approved 2026-11-19): keep work items, blockers, handoffs and closure evidence current in the designated tracker — GitHub Issues in this repository (owner, 2026-11-19). Tracker status is never approval.

Details: `governance/documentation-suite.md`, `governance/templates.md` §1, `governance/delivery-lifecycle.md`, `governance/work-tracking-and-completion.md`.
