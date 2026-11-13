# Runpure FF — planning

Every planning document for Runpure FF (Fantasy Workbench): PRDs, system design, architecture decisions, implementation specs, research, templates and the rules that govern them. This repository is each document's only home. Code lives in separate repositories (`runpure-ff-backend`, `runpure-ff-frontend`; ADR-0008).

## Contents

| Path | What it is |
|---|---|
| `prds/` | Product requirements: the Overview, four feature PRDs and two technical PRDs (Platform connections, Data ETL & storage) |
| [`design/system-design.md`](design/system-design.md) | How the parts fit together; points to the ADR behind every choice |
| [`design/architecture-decisions.md`](design/architecture-decisions.md) | Decision log: every ADR with its status, plus open questions |
| `design/decisions/` | One file per architecture decision (ADR-0001 to ADR-0017) |
| [`design/interface-design-brief.md`](design/interface-design-brief.md), [`design/design-language.md`](design/design-language.md), [`design/tokens.css`](design/tokens.css) | The design direction (how it should look, behave and flow) and the visual system: design tokens, colour, type, accessibility |
| [`governance/documentation-suite.md`](governance/documentation-suite.md) | Which documents exist, where they live, and how they change |
| [`governance/templates.md`](governance/templates.md) | Templates for ADRs, PRDs, the system design and the test & deployment plan; ADR rules and lifecycle |
| `design/reviews/` | Dated records of decision reviews (the 2026-11-08 open-decisions review) |
| `specs/` | Implementation specs: the Data ETL & storage spec and its data dictionary (Appendix A) |
| `research/` | Research behind the decisions, with sources |
| `prototypes/` | Working mock-ups on sample data; `ff-workbench-sample-data.html` is the Weekly review & analytics working version (open it in a browser) |
| [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md) | The rules every agent follows here (CLAUDE.md imports AGENTS.md) |
| `.claude/skills/` | Claude Code skills: `adr-new`, `adr-supersede`, `doc-check` (its `check.mjs` is the doc check) |
| `.claude/settings.json`, `.claude/hooks/guard.mjs` | Claude Code hooks: block edits to frozen ADRs; run the doc check after each edit and before finishing |
| `scripts/check-adr-immutability.mjs`, `.githooks/pre-commit` | Commit check: frozen ADRs unchanged, then the doc check |
| `.github/workflows/docs.yml` | The same checks on every pull request and push to `main`; can't be skipped |
| `code-repo-kit/` | Files to copy into the backend and frontend repos so their pull requests must cite planning files, and `init-runpure-backend.ps1`, which creates the backend repo |

Not written yet: the Master Test & Deployment Plan (`design/mtdp.md`), due before the first hosted deploy; implementation specs for the other PRDs, each written just before that piece is built.

## Setup (once per clone)

Requires Git and Node.js.

```
npm install            # sets the hooks path
git update-index --chmod=+x .githooks/pre-commit
npm run check
```

On GitHub, protect `main`: require the `docs` check and your approval on every pull request.

## Rules in brief

- A decision is recorded as a new ADR, using [`governance/templates.md`](governance/templates.md) §1, and listed in the decision log. PRDs, the system design and specs that it affects are updated in the same change.
- Before an ADR's implementation starts, it is revised in place: a replacing decision is merged into it, the replacing ADR is deleted, later ADRs are renumbered and cross-references updated.
- Once implementation has started (the ADR's **Implementation started** line is set), it is never edited except for its status line. A changed decision is then a new ADR that supersedes the old one.
- `git commit --no-verify` skips the commit check; use it only on purpose.
