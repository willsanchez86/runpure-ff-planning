---
name: adr-supersede
description: Replace or deprecate an existing ADR after the owner decides it no longer holds. Before the ADR's implementation has started, merge the new decision into it in place, delete any replacing ADR, renumber and update every cross-reference; after, mark it superseded and link both ways. Use when the owner says to supersede, replace, merge or deprecate an ADR, or after adr-new writes a replacing ADR.
---

# Supersede, merge or deprecate an ADR

Lifecycle rules are in `governance/templates.md` §1. Only the owner decides that an ADR is replaced or deprecated. First check the old ADR for an **Implementation started** line: it decides which path applies.

## Path A — implementation not started: revise in place

1. **Merge.** Rewrite the old ADR so it states the current decision. Keep its number and original **Date**; add or extend its **Revised** line: `YYYY-MM-DD, in place, at the owner's direction (not finalized): <earlier versions, oldest first>`. Keep the earlier versions as options in **Options Considered** ("the first version; not chosen"). Rename the file if its title changed.
2. **Delete** the replacing ADR, if one was written.
3. **Renumber** the ADRs after any deleted number so there are no gaps. Check that none of them has an **Implementation started** line; if one does, stop and ask the owner.
4. **Update every cross-reference** to the merged, deleted and renumbered ADRs: other ADRs, the decision log, `governance/templates.md`, `design/system-design.md`, `governance/documentation-suite.md`, `README.md`, `prds/`, `design/reviews/` and `specs/`. Where a document described the old content, say "the earlier version of ADR-NNNN".
5. **Decision log:** one row per remaining ADR; status cell `Accepted (revised in place YYYY-MM-DD)`; add a renumbering note (old → new) under the intro.

## Path B — implementation started: supersede

1. **Change the old ADR's status line, and nothing else.** Use the format the file already uses:
   - `**Status:** Superseded by [ADR-NNNN](ADR-NNNN-slug.md)`
   - Table format: `| Status | Superseded by [ADR-NNNN](ADR-NNNN-slug.md) |`
   - Deprecated: `**Status:** Deprecated` (or `| Status | Deprecated |`)

   Don't fix typos, links or anything else in the old file. Change it only once the new ADR is `Accepted`.
2. **Make the new ADR point back:** its **Relationship to other decisions** says `Supersedes [ADR-XXXX](ADR-XXXX-slug.md) in full`, and what it keeps and changes.
3. **Decision log:** set the old row's status to `Superseded by ADR-NNNN` (or `Deprecated`) and drop its earlier annotations. For each ADR that depended on the old one: still holds → append `(<what changed>, per ADR-NNNN)`; no longer holds → ask the owner.

## Verify

1. Path B only: `git diff -- <old ADR file>` shows exactly one changed line, the status line.
2. `node scripts/check-adr-immutability.mjs` passes (it checks staged changes; stage first).
3. `node .claude/skills/doc-check/check.mjs` passes: no broken links, no numbering gaps, log matches files.

Report what changed: files merged, deleted and renamed, the old → new numbers, the log rows, and any document you couldn't update.
