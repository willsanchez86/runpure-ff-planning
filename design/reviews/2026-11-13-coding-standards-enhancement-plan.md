# Coding Standards — Enhancement & Enforcement Plan

**Status:** Proposed — Claude's recommendation for owner review. Nothing here is Accepted (AGENTS.md rule 1).
**Date:** 2026-11-13
**Scope:** The `runpure-ff-backend` code repo and the `code-repo-kit/` that seeds it. The planning repo's own doc standards are in scope only where noted.
**Registered as:** open decision 8 in the decision log (`design/architecture-decisions.md`).

**How to resume this next session:** open with — *"Review design/reviews/2026-11-13-coding-standards-enhancement-plan.md and walk me through the four decisions in §6."*

---

## 0. TL;DR

- Today the code repo enforces **two** readability rules (strict TypeScript + JSDoc-on-exports). That's the whole standard.
- The gap is two whole **families** of standard: **security** (none) and **correctness/async safety** (none) — the ones that actually matter for an auth + hand-written-SQL + GraphQL backend.
- The fix is not "write more rules in prose." It is **move best-practice conventions into the linter/formatter/CI so they're machine-guaranteed**, and keep only the non-automatable ones (naming intent, "why" comments) as written rules.
- One prerequisite, unrelated to style but blocking: **your `planning-refs` gate would reject a real backend PR today** (see §1.1). Reconcile first.

**Four decisions needed from you** — details in §6:

| # | Decision | Default recommendation |
|---|----------|------------------------|
| D1 | Adopt the three-family standard (readability + security + correctness)? | Yes |
| D2 | Readability base: Google TypeScript guide, or a minimal `typescript-eslint` set? | `typescript-eslint` strict-type-checked (less to maintain) |
| D3 | Adopt MISRA-style rule tiers (Mandatory / Required+deviation / Advisory)? | Yes — it matches your existing "owner decides" rigor |
| D4 | Reconcile the "Implementation started" gate now (prerequisite)? | Yes — 15-minute owner action |

---

## 1. Current state (honest audit)

### What is enforced today

| Rule | Mechanism | Verdict |
|------|-----------|---------|
| `strict: true` TypeScript | `npm run typecheck` (pre-commit + CI) | In force |
| JSDoc on every export | `eslint` single rule (pre-commit + CI) | In force |
| Commit safety (no `--no-verify`, no push to `main`) | AGENTS.md rule + planning repo settings | In force |
| Per-module provenance header (names its ADR/spec) | AGENTS.md rule 5, human-checked | In force (convention) |

Everything above is the **readability** family only. ESLint currently carries exactly **one** rule (JSDoc). There is no formatter, no type-aware lint, no security lint, no file-size limit.

### What is NOT enforced (the gaps)

1. **Security standard** — none. No input-validation, query-safety, auth, or crypto rules. Most important gap given the backend's surface.
2. **Correctness / async safety** — none. No `no-floating-promises` / `no-misused-promises`, despite async DB transactions and GraphQL resolvers where an unawaited promise is a silent data-corruption or crash bug.
3. **Formatting** — no Prettier (or equivalent). Style is unmanaged and therefore review-debatable.
4. **Modularization** — no file-size limit, in either repo. (The article's one explicit "must-have.")
5. **The enforcement scripts are themselves untested** — `doc-check/check.mjs` (~257 lines) and `check-planning-refs.mjs` gate everything and have no tests.

### 1.1 Prerequisite finding — the gate is out of sync with reality

`code-repo-kit/scripts/check-planning-refs.mjs` fails any PR whose `Implements:` list names an ADR that lacks an **"Implementation started"** line. A grep of `design/decisions/` shows **zero of the 17 ADRs carry that line**, yet `init-runpure-backend.ps1` declares `Implements: ADR-0001, 0005 ... 0017` and the ETL spec is mid-implementation (v2.17).

**Consequence:** a real backend PR naming those ADRs would be **rejected by your own gate**. Either the ADRs need their "Implementation started" lines added (owner action, which also freezes them per AGENTS.md rule 2), or backend work is bypassing the gate. Reconcile before layering more enforcement on top.

---

## 2. Target model — three families + tiers

A complete coding standard for this project draws one standard from each family and assigns every rule a tier.

### The three families

| Family | Purpose | Authoritative source to anchor on |
|--------|---------|-----------------------------------|
| Readability / consistency | One consistent style; stop debating it | Google TypeScript Style Guide; `typescript-eslint` |
| Correctness / safety | Ban error-prone constructs | `typescript-eslint` type-checked rules (the TS analogue of MISRA's "safe subset") |
| Security | Prevent vulnerability classes | OWASP Secure Coding Practices; SEI CERT (Carnegie Mellon) |

### The tier model (borrowed from MISRA C)

MISRA classifies every guideline as Mandatory / Required / Advisory. Adopt the same, because it matches how this project already works (owner decides what's binding):

- **Mandatory** — never violated; CI blocks. (Security rules, async-safety, type-safety.)
- **Required** — violated only with a logged deviation in the PR. (Most lint rules.)
- **Advisory** — good practice, not blocking. (Pure style the formatter already handles.)

This prevents the "every rule is equally sacred" failure mode and gives a sanctioned escape hatch (deviation) instead of `--no-verify`.

---

## 3. The enforcement surface

Each rule type is enforced at the cheapest gate that can catch it. Nothing valuable is left to memory.

| Gate | Enforces | Status |
|------|----------|--------|
| Editor on save | Formatting, lint autofix | Not set up — add Prettier + ESLint editor config |
| Pre-commit hook | Format check, lint, typecheck, tests | Partial — add format + security lint + tests |
| CI required check | Everything above + `planning-refs` | Partial — mirror the pre-commit additions |

Guiding principle (per Google's own consistency rationale and standard practice): **anything a tool can check is enforced by the tool, never raised in code review.** Code review is for logic. The written standard holds only what no tool can check.

---

## 4. Recommendations

Ordered by priority. Each: what, why (benefit), how (concrete change), tier, effort, success criteria.

### R0 — Reconcile the "Implementation started" gate (prerequisite)

- **Why:** your own CI gate would reject real backend PRs (§1.1).
- **How:** owner adds the `**Implementation started:** <date>` line to each ADR whose code has begun; those ADRs become frozen (status-line edits only thereafter).
- **Effort:** ~15 min. **Tier:** n/a (process).
- **Success:** `check-planning-refs.mjs` passes for a backend PR naming a started ADR; `check-adr-immutability.mjs` now guards those ADRs.

### R1 — Add a formatter (Prettier)

- **Why:** removes 100% of style debate; the single highest-leverage, lowest-risk change. Formatting stops being a review topic.
- **How:** add `prettier` + `.prettierrc`; `lint` script runs `prettier --check src`; editor formats on save.
- **Effort:** ~30 min. **Tier:** Advisory (auto-fixed, never blocks a human).
- **Success:** `npm run format` rewrites the tree idempotently; CI fails on an unformatted file; no style comments appear in the next PR review.

### R2 — Add type-aware correctness lint (`typescript-eslint`)

- **Why:** catches real bug classes your current single-rule ESLint cannot — unawaited promises in DB transactions, misused promises in Express handlers, floating rejections.
- **How:** extend `eslint.config.js` with `typescript-eslint` `strict-type-checked`; explicitly enable `no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-explicit-any`.
- **Effort:** ~1–2 hr (fixing what it surfaces). **Tier:** Mandatory (async-safety) / Required (rest).
- **Success:** lint fails on a deliberately unawaited `pool.query(...)`; CI green after fixes.

### R3 — Adopt a security standard (OWASP SCP + static analysis)

- **Why:** the backend does Firebase auth, hand-written SQL with no ORM, and a public GraphQL endpoint — the exact surface OWASP SCP and SEI CERT exist to govern. No security rule is enforced today.
- **How:**
  1. Add an AGENTS.md "Security" subsection: the OWASP SCP categories that apply (input validation, DB security, auth/session, error handling, crypto), each as a one-line binding rule.
  2. Add `eslint-plugin-security` (or a SAST step) to flag injection-prone patterns.
  3. Add a required Security checkbox block to the PR template (see R6).
- **Effort:** ~2–3 hr. **Tier:** Mandatory.
- **Success:** a PR that interpolates a variable into a SQL string is flagged by lint or review checklist before merge; OWASP SCP categories mapped to code areas (see §5).

### R4 — Add a modularization limit

- **Why:** the article's explicit must-have; large files hurt both human and AI comprehension.
- **How:** ESLint `max-lines` (~400–500 warn / hard cap by judgement) + a one-line AGENTS.md rule: "no source file over ~500 lines without a noted reason; refactor or justify."
- **Effort:** ~15 min. **Tier:** Required (deviation allowed with a reason).
- **Success:** lint warns past the threshold; the rule is cited in the next refactor.

### R5 — Write the AGENTS.md "Coding standards" section (prose = only the non-automatable)

- **Why:** avoid the well-documented pitfall of prose that merely restates the linter (redundant, drifts). The written standard should hold only what tools cannot check.
- **How:** a short section covering: naming for intent, comment the *why*, error-handling convention, the tier definitions, and the deviation procedure. It links to the ESLint/Prettier config as the source of truth rather than repeating rules.
- **Effort:** ~45 min. **Tier:** mixed (stated per rule).
- **Success:** no rule appears in both the linter config and the prose; the section is under ~1 page.

### R6 — Make the merge gate demand verification (ties to the earlier review plan)

- **Why:** the current gate checks provenance, not correctness. A security + test claim should be required at the gate.
- **How:** add to `pull_request_template.md` a required Verification block (self-review done, security checklist considered, tests added); extend `check-planning-refs.mjs` to fail if it's empty.
- **Effort:** ~45 min. **Tier:** Mandatory.
- **Success:** a PR with an empty Verification block fails CI.

### R7 — Test the enforcement scripts

- **Why:** `check.mjs` and `check-planning-refs.mjs` gate the entire suite and are unverified — ironic for a mechanically-enforced repo.
- **How:** add a minimal test runner + fixtures (a known-bad ADR set that must fail, a known-good set that must pass).
- **Effort:** ~2 hr. **Tier:** Required.
- **Success:** `npm test` in the planning repo exercises both scripts against pass/fail fixtures.

> Note: a general backend test mandate (test runner + per-change regression test + pre-commit wiring) is covered in the earlier implementation plan and is a dependency of R6. Assumed alongside this plan, not repeated here.

---

## 5. OWASP SCP mapped to this backend (for R3)

| OWASP SCP category | Where it applies here | Concrete rule |
|--------------------|------------------------|---------------|
| Input validation | GraphQL args, CSV ingest | Validate/parse all external input; cap list/limit args (already partly done: `limit` clamp) |
| Database security | Hand-written SQL, no ORM | Parameterized queries only; never string-interpolate values. Enforce by lint + review |
| Authentication/session | Firebase token middleware | Keep auth in middleware before resolvers; never trust client-supplied identity |
| Error handling & logging | Error handler, request log | No secrets/tokens/PII in logs (already a stated rule — make it a lint/review check) |
| Cryptographic practices | Credential handling | Keys stay outside the repo (already enforced via `.gitignore` + `.env.example`) |

Several rows are already partly satisfied — R3 is mostly about making the implicit rules explicit and checkable, not new architecture.

---

## 6. Decisions needed (expanded)

- **D1 — Adopt the three-family model?** If no, say which families to skip. *Recommendation: adopt all three; security is non-optional for this surface.*
- **D2 — Readability base.** Google TS guide (comprehensive, more to adopt) vs. `typescript-eslint` strict-type-checked (lean, self-maintaining). *Recommendation: `typescript-eslint`; add Google's guide as a reference, not a hard dependency.*
- **D3 — Tiering.** Adopt Mandatory/Required/Advisory + a deviation log? *Recommendation: yes; it replaces the `--no-verify` temptation with a sanctioned escape hatch.*
- **D4 — Reconcile R0 now?** *Recommendation: yes, it's blocking and 15 minutes.*

**Governance note:** if accepted, R2/R3/R4 (new dependencies + construction techniques) likely warrant their own ADR(s) per `governance/documentation-suite.md` §2.2 — e.g. "Adopt `typescript-eslint` + OWASP SCP as the backend coding standard." This plan is the input to that decision, not the decision itself.

---

## 7. Suggested phasing

| Phase | Items | Effort | Gate after |
|-------|-------|--------|------------|
| 0 (prereq) | R0 | 15 min | backend PR passes `planning-refs` |
| 1 | R1, R2, R4 | ~2–3 hr | formatter + correctness lint green in CI |
| 2 | R3, R6 | ~3–4 hr | security rules live; PR gate demands verification |
| 3 | R5, R7 | ~3 hr | prose standard written; enforcement scripts tested |

---

## 8. Sources

- Coding conventions — definition and the conventions→standards distinction: https://en.wikipedia.org/wiki/Coding_conventions
- PEP 8, official Python style guide (coverage model): https://peps.python.org/pep-0008/
- Google Style Guides (25 languages, incl. TypeScript): https://google.github.io/styleguide/
- MISRA C — Mandatory/Required/Advisory tiers: https://en.wikipedia.org/wiki/MISRA_C · https://misra.org.uk/
- SEI CERT Secure Coding Standards (Carnegie Mellon): https://wiki.sei.cmu.edu/confluence/display/seccode
- OWASP Secure Coding Practices — Quick Reference Guide: https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/
- OWASP ASVS (verification requirements): https://owasp.org/www-project-application-security-verification-standard/
- MITRE CWE (weakness taxonomy): https://cwe.mitre.org/
- Law of Triviality (bikeshedding pitfall): https://en.wikipedia.org/wiki/Law_of_triviality

---

*This document is a recommendation for owner review. To act on it, the owner decides per item; accepted items that change dependencies or construction techniques become ADR(s) via the `adr-new` skill.*
