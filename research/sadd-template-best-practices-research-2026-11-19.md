# SADD template best practices — research (2026-11-19)

**Question:** the owner restructured the system design (v2.5) into an engineer-reference shape and asked whether the SADD template ([`governance/templates.md`](../governance/templates.md) §3) should be reconsidered against best practice.

## 1. The field

Three families dominate current practice:

- **arc42** — the de-facto open standard template: **12 sections** (1 Introduction & goals · 2 Constraints · 3 Context & scope · 4 Solution strategy · 5 Building-block view · 6 Runtime view · 7 Deployment view · 8 Crosscutting concepts · 9 Architecture decisions · 10 Quality requirements · 11 Risks & technical debt · 12 Glossary). Explicitly tailorable — practice guidance says start with 1, 3, 5, 9, and treats quality goals (1.2 + 10) as the backbone. Notation-agnostic. ([arc42.org/overview](https://arc42.org/overview/), [docs.arc42.org](https://docs.arc42.org/home/), [practical series 2026](https://blog.hompus.nl/2026/02/01/arc42-practical-series/))
- **C4 model** — not a template but a **diagram notation** (Context → Containers → Components → Code); commonly used *inside* arc42 §3/§5. Covers structure only — no quality requirements, risks, or decisions. ([arc42 FAQ B-17](https://faq.arc42.org/questions/B-17/), [arc42 vs C4](https://www.archyl.com/blog/arc42-vs-c4-model))
- **Google-style design docs / SEI "Views and Beyond"** — the former is free-form prose (context/goals/design/alternatives) suited to one-off project docs, not a living reference; the latter is heavyweight multi-view documentation for large organizations. Neither fits a one-engineer living reference better than arc42's tailored subset. ([comparison](https://dev.to/adityasatrio/comparing-software-architecture-documentation-models-and-when-to-use-them-495n))

## 2. Mapping arc42 onto our v2.5 structure

| arc42 section | Our v2.5 home | Verdict |
| --- | --- | --- |
| 1 Introduction & goals | §1 overview + §2 requirements | Covered |
| 2 Constraints | §2 constraints | Covered |
| 3 Context & scope | §1 diagram (context boundary: nflverse, Firebase, browser) | Covered |
| 4 Solution strategy | §4 technology decisions | Covered |
| 5 Building-block view | §1 components table | Covered |
| 6 Runtime view | §1 data flow | Covered |
| 7 Deployment view | §6 hosting & deployment requirements; §8 repositories | Covered |
| 8 Crosscutting concepts | §3 guardrail + §5 API design/error handling | Covered |
| 9 Architecture decisions | §4 table citing the ADR log | Covered — our ADR discipline exceeds the baseline |
| 10 Quality requirements | §2 non-functional table (detailed targets live in the PRDs, by design — document-once) | Covered by reference |
| 11 **Risks & technical debt** | §9 trade-offs covers *accepted* trade-offs only | **Gap** — no home for known risks and accumulated debt (e.g. single-host SPOF is in §7, but there is no consolidated risk/debt register) |
| 12 Glossary | Overview PRD's Shared terms (document-once rule) | Covered by reference |

## 2.5 Canonical guidance verified

arc42's official per-section **Contents / Motivation / Form** pages were fetched directly (not relied on via summaries): the [section index](https://docs.arc42.org/home/), [§7 Deployment view](https://docs.arc42.org/section-7/) (infrastructure **and** the software-to-infrastructure mapping belong there), and [§11 Risks & technical debt](https://docs.arc42.org/section-11/) (a **prioritized** list, each item ideally with a suggested measure to minimize/mitigate/avoid). Both details are carried into the template's §6 and §10 rules.

## 3. Conclusions

1. The owner's v2.5 restructure independently converged on arc42's shape — every arc42 section except **11 (Risks & technical debt)** has a clear home. The structure is sound; the template should codify it rather than the pre-restructure section order it still shows.
2. Worth adopting from arc42: an explicit **Risks and technical debt** section (distinct from accepted trade-offs: risks are open, debt is owed work), and the practice note that quality goals drive the document.
3. Worth keeping against arc42: our inline-ADR citation style (arc42 §9 is often a list; our per-question decision table citing frozen ADRs is stronger), the owner's guardrail as a named crosscutting section, and document-once references to the Overview's shared terms instead of a duplicated glossary.
4. C4 is a notation choice, not a structure choice; the existing Mermaid context diagram serves the C4 "context/container" role adequately at this scale.
