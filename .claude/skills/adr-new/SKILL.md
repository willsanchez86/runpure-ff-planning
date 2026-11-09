---
name: adr-new
description: Record an architecture decision the project owner has made as a new ADR in design/decisions/ and add it to the decision log. Use when the owner states a decision ("use X", "no Y", "keep Z for the current season only") or asks to record one. Not for open questions or for Claude's own recommendations.
---

# Record a new ADR

The rules live in `governance/templates.md` §1 and `governance/documentation-suite.md`. Read them every time; this skill only sequences them. If this file and `templates.md` disagree, `templates.md` wins.

## 1. Before writing

1. **Confirm the decision is the owner's.** If it was inferred, implied by other ADRs, or only discussed, ask one question before writing. Never record Claude's recommendation as Accepted.
2. **Read** `governance/templates.md` §1 (structure, rules, lifecycle, numbering).
3. **Number:** the highest number among the files in `design/decisions/`, plus one. Four digits, no gaps. Check the files, not only the log.
4. **Find every ADR the decision touches.** Search `design/decisions/` for the topic and read each candidate in full. Note whether each has an **Implementation started** line. Classify each:
   - **Replaces it in full:** run `adr-supersede` instead of writing a new file if the old ADR's implementation hasn't started (it is revised in place); otherwise write the new ADR, then run `adr-supersede`.
   - **Narrows / changes part of:** implementation not started → revise the old ADR in place at the owner's direction, with a **Revised** line, instead of a new ADR. Implementation started → write the new ADR and annotate the old one's log row (step 3); never edit the old ADR.
   - **Depends on / consistent with:** link only.
5. **Flag conflicts first.** If the decision contradicts an accepted ADR the owner didn't mention, say so and ask before writing.

## 2. Write the file

`design/decisions/ADR-NNNN-<slug>.md`, where the slug is the title in lowercase with hyphens. Follow the template's section order exactly.

- **Title:** `ADR-NNNN:` plus the decision as a short statement, not the topic.
- **Status:** `Accepted` if the owner decided it; otherwise `Proposed`.
- **Date:** today, in `YYYY-MM-DD`. **Deciders:** the owner, named as in the existing ADRs.
- **Context:** facts only. Measured figures say when and how they were measured.
- **Decision:** one bold line, as the owner stated it, then detail. Don't add parts the owner didn't decide. Anything that follows from other ADRs says which ADR it follows from.
- **Options Considered:** only options actually discussed. The chosen one gets a dimension table; the others a short paragraph. If the owner gave no reason for rejecting an option, write "Not chosen by the project owner." Never invent a reason.
- **Consequences:** downsides are never left out. "Harder / to revisit" names what would trigger a revisit.
- **Relationship to other decisions:** every touched ADR, with a verb (Supersedes, Narrows, Changes an assumption in, Depends on, Consistent with, Answers open question N) and a relative link: `[ADR-NNNN](ADR-NNNN-slug.md)`.
- **Sources:** only pages verified in this session. No verified source means no citation, never an invented one.
- **Links:** ordinary Markdown links in the body, not `[[wikilinks]]`, so they work on GitHub too.

## 3. Update the decision log

In `design/architecture-decisions.md`:

- Add a row: `| [ADR-NNNN](decisions/<file>) | <title without the ADR-NNNN: prefix> | <status> | <date> |`.
- For each narrowed or changed ADR, append to its status cell: `(<what changed>, per ADR-NNNN)`.
- In the Open list, annotate any question this answers: `*(Decided in ADR-NNNN: <short answer>.)*`. Don't add open questions the owner didn't list.
- Update **Last updated**.
- Never add options, recommendations or outcomes the owner didn't decide.

If the new ADR supersedes another, run `adr-supersede` now.

## 4. Never

- Change an ADR that has an **Implementation started** line beyond its status line. The pre-commit check blocks it.
- Leave a downstream document contradicting the new ADR. Downstream documents (`prds/`, `design/system-design.md`, `specs/`) are updated in the same change (`governance/documentation-suite.md` §2.2).

## 5. Finish

Run `node .claude/skills/doc-check/check.mjs` and fix any error it reports in the files written in this task. Report to the owner: the file created, the log changes, and each downstream document updated to match.
