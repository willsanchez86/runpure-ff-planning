# Rules for agents in this repo

1. Record as Accepted only what the owner decided. Your own recommendations stay Proposed or in chat.
2. An ADR with an **Implementation started** line is frozen except its status line. A changed decision is a new ADR.
3. An ADR without that line is revised in place (`adr-supersede` skill, Path A).
4. When an ADR changes, update every PRD, design doc and spec that mentions it in the same change.
5. Run `node .claude/skills/doc-check/check.mjs` and fix every error before you finish.
6. Never commit with `--no-verify`. Never push to `main`; open a pull request.

Details: `governance/documentation-suite.md`, `governance/templates.md` §1.
