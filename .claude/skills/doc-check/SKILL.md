---
name: doc-check
description: Reconcile the planning documents - ADR files, the decision log, supersession links, and downstream references - and report problems without changing anything. Use when the owner asks to check or audit the docs, before committing planning changes, and at the end of adr-new and adr-supersede.
---

# Check the documentation suite

This skill **reports only**. It never edits a file. The owner decides what to fix.

## 1. Run the mechanical checks

From the repository root:

```
node .claude/skills/doc-check/check.mjs
```

It checks:

- every ADR file has a log row, every log row points to an existing file, and the statuses match;
- numbers are four digits, sequential, with no gaps or duplicates, and match each file's title;
- each ADR has its template's sections, in order;
- each superseded ADR names a successor that exists and links back to it;
- relative links inside ADRs resolve;
- downstream documents (`README.md`, `design/*.md` other than the log, `governance/` other than the templates, `design/reviews/`, `prds/` and `specs/`) that mention superseded, deprecated or missing ADRs (reported as warnings).

Exit code 1 means errors; 0 means none (warnings may remain).

## 2. Check what a script can't

Read each downstream document the script lists (the PRDs in `prds/`, `design/system-design.md`, `governance/documentation-suite.md` and everything in `specs/`) against the **accepted** ADRs. Report statements that contradict an accepted decision (for example, naming a tool or store an ADR ruled out), as `file:line — says X — conflicts with ADR-NNNN (Y)`.

Only report contradictions of recorded decisions. Don't report style, wording, or anything that is merely undecided.

## 3. Report

Group the output as **Errors**, **Warnings**, and **Downstream conflicts**. For each, give the file, the line where known, and the rule broken. Don't propose rewrites unless the owner asks.
