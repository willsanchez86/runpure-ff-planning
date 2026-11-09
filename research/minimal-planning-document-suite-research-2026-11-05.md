# Run six governed documents, not twenty

For a solo-built Next.js app and ETL pipeline that will later serve many users, the suite you already have is close to the minimum that current standards and practitioner guidance support. It needs one addition and some rules, not more document types. The six documents are: (1) a product Overview carrying vision, a short outcome roadmap and tailoring notes, (2) per-feature PRD pages, (3) ADRs, (4) one system design doc, (5) component specs only where other code depends on a contract (your ETL/storage spec qualifies), and (6) the templates doc, extended with a status index. The standards back this size. ISO/IEC/IEEE 12207 (now the **2026 edition; the 2017 edition was withdrawn on 2026-04-29**) defines processes and outcomes, not documents. It hands document content to ISO/IEC/IEEE 15289, which says information items are "combined or subdivided" to suit the project ([ISO 12207 committee page](https://committee.iso.org/standard/63712.html); [VDE 15289 preview](https://assets.vde-verlag.de/iec-normen/preview-pdf/info_isoiecieee15289%7Bed4.0%7Den.pdf)). From the templates, take only the core sections. For PRDs that is problem, users, success criteria, prioritized requirements with acceptance criteria, non-goals, risks and open questions. For ADRs it is the four mandatory MADR 4.0.0 sections plus status and Confirmation. For the system design doc it is arc42's own "lean" subset with two C4 diagrams. Governance needs two change rules. Decision records are append-only and change only by supersession. Descriptive documents are edited in place, and a new document is opened only for significant divergence. Add an explicit precedence ladder (my inference; no source read defines one) and a reconciliation loop: stable requirement IDs referenced from tests, a "Confirmation" check on each ADR, and a milestone audit of each implemented document against the code.

**How to read the citations.** Each source's edition, date, authority type and access level is in the Sources list at the end. Most ISO/IEC/IEEE standard bodies are **paywalled**. For those, only official catalogue pages and preview PDFs (front matter and table of contents) were read, so claims about them are limited to scope statements and clause headings. Passages marked **Inference** are my synthesis, not sourced findings.

## Standards prescribe content, not a document count

The standards that govern software life-cycle documentation all decline to dictate a document list, and several are changing status right now.

**12207 (software life-cycle processes).** The 2017 edition said it "does not detail information items in terms of name, format, explicit content and recording media." It deferred to 15289 and offered only *example* artifacts in an informative annex ([iTeh 12207:2017 preview](https://cdn.standards.iteh.ai/samples/63712/0bc6d9107eeb46d88dbc7b628b12cf4b/ISO-IEC-IEEE-12207-2017.pdf)). The replacement, **12207:2026 (published 2026-04-29)**, keeps that stance. It says it applies to agile approaches and prescribes no life-cycle model ([Genorma 12207:2026](https://genorma.com/en/standards/iso-iec-ieee-12207-2026)). What changed between the two editions could not be found in any accessible source. Any project document that cites 12207:2017 should now cite the 2026 edition.

**15289 (content of information items, 2019, 4th edition).** It defines seven generic item types: description, plan, policy, procedure, report, request and specification. It lists **74 specific items** and puts presentation format and delivery media out of scope ([VDE preview](https://assets.vde-verlag.de/iec-normen/preview-pdf/info_isoiecieee15289%7Bed4.0%7Den.pdf)). Its 5th edition is in progress: **DIS 15289 was registered on 2026-10-23** ([ISO committee page 94699](https://committee.iso.org/standard/94699.html)).

**29148 (requirements engineering, 2018).** It defines four requirements items: the business, stakeholder, system and software requirements specifications (BRS, StRS, SyRS, SRS). It also has a normative tailoring annex (Annex C) and concept-of-operations annexes. The standard is formally "to be revised", and **its DIS ballot opened on 2026-09-14** ([iTeh 29148:2018](https://standards.iteh.ai/catalog/standards/iso/8cf2bc2b-8b5e-4907-a82a-d1c5676c9e85/iso-iec-ieee-29148-2018); [Genorma DIS 29148](https://genorma.com/en/standards/iso-iec-ieee-dis-29148)). The text of its requirement characteristics, attribute lists and Annex C was **not read**. Commonly repeated lists such as "necessary, unambiguous, verifiable" are therefore not attributed to it here.

**Inactive IEEE standards.** Two IEEE standards often used as templates are no longer maintained. **IEEE 1016-2009** (software design descriptions) has been **Inactive-Reserved since 2020-03-05** with no successor shown ([IEEE SA 1016](https://standards.ieee.org/standard/1016-2009.html)). **IEEE 828-2012** (configuration management) has been **Inactive-Reserved since 2023-03-30** ([IEEE SA 828](https://standards.ieee.org/standard/828-2012.html)). Their concepts are still useful, but neither should be adopted as a live template.

**Standards that address small teams.** Two current sources speak directly to small projects.

- **ISO/IEC 29110-5-1-2:2025.** Its Basic profile is for "very small entities" of up to 25 people. It has two processes, Project Management and Software Implementation. The 2025 edition replaces "optional" tasks with "conditional" ones. It also says VSEs that already know how to tailor 12207 "are encouraged to use those standards instead" ([ANSI preview](https://webstore.ansi.org/preview-pages/ISO/preview_ISO+IEC+29110-5-1-2-2025.pdf)). The 2025 work-product clause was not readable. The best accessible description of the profile's work products is an academic paper based on the 2011 edition. It lists a project plan, change requests, a version-controlled repository and baselined configuration, among others ([O'Connor, CORE](https://core.ac.uk/download/30934317.pdf)).
- **NASA NPR 7150.2D** (effective 2022-03-08, **expires 2027-03-08**). It requires certain *content*: plans, requirements, a recorded architecture, design, bidirectional traceability, test plans and reports, and version descriptions. But it says that planning "may be stand-alone or condensed into one or more project-level or software documents or electronic files." It records tailoring in a single Requirements Mapping Matrix, with justification for each requirement tailored out ([NPR 7150.2D](https://explorers.larc.nasa.gov/APSMEX25/SMEX/pdf_files/NASA21_NPR_7150_2D.pdf); [SWEHB 7.16](https://swehb.nasa.gov/display/SWEHBVD/7.16+-+Appendix+C.+Requirements+Mapping+and+Compliance+Matrix)). NASA rules apply to this project only by analogy.

**SWEBOK v4.0 (IEEE Computer Society, 2024).** Its requirements chapter explicitly allows specification to be "incremental" or "comprehensive", and in natural language, acceptance-criteria-based or model-based form. It treats architecture as "significant decisions" ([SWEBOK v4 topics](https://www.computer.org/education/bodies-of-knowledge/software-engineering/topics)). Only its headings were verified, not the body text.

**Inference: what this means for your suite.** The standards give you a checklist of *outcomes to cover*: stakeholder needs, requirements, architecture, design, implementation, verification and change control. They do not give you a list of files to create. Folding the BRS and StRS into a product Overview, and the SyRS and SRS into PRD pages plus the ETL spec, fits 15289's "combine or subdivide" clause. Folding the architecture description and design description into one system design doc fits it too. A one-paragraph tailoring note in the spirit of NASA's matrix documents that choice honestly.

| Standard | Current edition | Status (Nov 2026) |
|---|---|---|
| ISO/IEC/IEEE 12207 | 2026 (2026-04-29) | Current; **2017 withdrawn 2026-04-29** |
| ISO/IEC/IEEE 15289 | 2019 (4th ed.) | **DIS (5th ed.) registered 2026-10-23** |
| ISO/IEC/IEEE 29148 | 2018 (2nd ed.) | **Under revision; DIS ballot from 2026-09-14** |
| ISO/IEC/IEEE 42010 | 2022 (2nd ed.) | Current; no revision found |
| IEEE 1016 | 2009 | **Inactive-Reserved since 2020-03-05** |
| IEEE 828 | 2012 | **Inactive-Reserved since 2023-03-30** |
| ISO/IEC 29110-5-1-2 | 2025 (Feb 2025) | Current; replaces TR:2011 |
| NASA NPR 7150.2 | Rev D (2022-03-08) | Current; **expires 2027-03-08** |
| ISO/IEC/IEEE 15288 | 2023 | Exists; stage not verified |

## Each document answers one question and feeds the next

The practitioner chain runs from vision to strategy, roadmap, PRD and design. Marty Cagan (SVPG) describes the vision as a 2–5-year persuasive narrative that is "not in any sense a spec." Strategy is which problems to solve and why, and the roadmap is the tactics. He argues roadmaps should be framed as outcomes, not feature lists ([SVPG, Vision vs. Strategy, 2016](https://www.svpg.com/vision-vs-strategy/); [SVPG, Alternative to Roadmaps, 2015](https://www.svpg.com/the-alternative-to-roadmaps/)).

The boundary between PRD and design doc is drawn from both sides. Cagan's PRD guidance says to describe the problem, not the solution, and not to dictate internal system design ([SVPG PRD guide, ©2005](https://www.svpg.com/wp-content/uploads/2024/07/How-To-Write-a-Good-PRD.pdf)). Google's design doc "isn't a requirements doc" and treats its goals and non-goals as the requirements it designs against ([Ubl, Design Docs at Google, 2020](https://www.industrialempathy.com/posts/design-docs-at-google/)).

Microsoft draws the clearest official line between an ADR and a design doc: "Avoid making decision records design guides… the decision must be clear and stand alone." Microsoft also limits ADRs to choices affecting structure, key quality attributes, or that are hard to reverse ([Azure Well-Architected, updated 2026-04-13](https://learn.microsoft.com/en-gb/azure/well-architected/architect-role/architecture-decision-record)). On the engineering side, practitioners separate three things. A functional spec "evolves with the product". A design doc is a snapshot of an approach with trade-offs. A whole-system implementation spec is discouraged because the code is the most detailed spec ([Kashitsyn, mmapped.blog, 2024-09-15](https://mmapped.blog/posts/31-effective-design-docs)).

**Inference: the recommended suite.** It maps your existing files onto that chain. The only genuinely missing piece is a short vision/roadmap/tailoring block in the PRD Overview.

| # | Document (your file) | Question it answers | 15289 type / standard anchor | Feeds downstream |
|---|---|---|---|---|
| 1 | **Product Overview** (PRD Overview page): vision, principles, Now/Next/Later outcomes, multi-user intent, tailoring note, doc status index link | Why does this exist, for whom, what comes next? | Description + Plan; stands in for BRS/StRS ([29148](https://standards.iteh.ai/catalog/standards/iso/8cf2bc2b-8b5e-4907-a82a-d1c5676c9e85/iso-iec-ieee-29148-2018)); 29110 project plan ([O'Connor](https://core.ac.uk/download/30934317.pdf)) | Priorities and non-goals that each feature PRD must fit |
| 2 | **Feature PRD pages** | What must this feature do, how do we know it's done, what's out? | Specification; stands in for SRS functional content | Requirement IDs and acceptance criteria → ADRs, specs, tests, issues |
| 3 | **ADRs** (ADR-0001…0008 + `architecture-decisions.md` index) | Which significant choice did we make, and why? | 42010 §6.10 "decisions and rationale" ([42010:2022 preview](https://cdn.standards.iteh.ai/samples/74393/fc7b7f103d8446a4b87a3261e31370d3/ISO-IEC-IEEE-42010-2022.pdf)) | Constraints the system design and specs must honor; Confirmation checks |
| 4 | **System design doc** | How does the whole system fit together today? | Description; 42010 architecture description (replaces the inactive IEEE 1016 SDD) | Container boundaries and cross-cutting concepts that specs elaborate |
| 5 | **Component specs** (ETL/storage spec; add others only for real contracts) | What exact contract must this component meet? | Specification (interface/data) | Schemas, schedules and idempotency rules → code and tests |
| 6 | **Templates doc** (+ status index) | How do we write and govern the above? | Procedure/Policy | Consistent front matter for linting and audit |

**Inference: why Overview gets the roadmap.** For one person, Cagan's vision (a narrative plus principles) needs a few paragraphs, not a separate document. His outcome-based roadmap becomes an ordered Now/Next/Later list. Amazon's PR/FAQ is an optional upstream test for large bets: a press release written as if the product had launched, an external FAQ and an internal FAQ, about six pages in total. Its former VP notes "most PR/FAQs never launch," and that is the point ([Bryar, Coda](https://coda.io/@colin-bryar/working-backwards-how-write-an-amazon-pr-faq)). A one-paragraph version inside a PRD's problem section gives most of the benefit.

**Documents not to add.**

- **A separate SRS, SDD or CM plan.** These are what 15289 lets you merge, and NASA's documentation guidance itself lists them as content to cover, not mandatory files ([SWEHB 7.18](https://swehb.nasa.gov/spaces/SWEHBVD/pages/102695654/7.18+-+Documentation+Guidance)).
- **A standalone test plan.** The function NASA (SWE-065) and 29110 assign to test plans and reports is served at this scale by PRD acceptance criteria that become automated tests, plus CI results. This is an inference; neither standard's minimum-content text was read.
- **Spec-driven-development file trios as a permanent layer.** GitHub Spec Kit (constitution → spec → plan → tasks) and AWS Kiro (requirements → design → tasks) are **vendor conventions for AI coding agents, not standards** ([Microsoft Learn, Spec Kit module, updated 2026-07-03](https://learn.microsoft.com/en-us/training/modules/spec-driven-development-github-spec-kit-enterprise-developers/3-examine-github-spec-kit); [kiro.dev](https://kiro.dev/docs/specs/concepts)). Thoughtworks' Birgitta Böckeler found Spec Kit "like using a sledgehammer to crack a nut" for a small feature. She saw Kiro turn a bug fix into 4 user stories with 16 acceptance criteria, and found most tools are "spec-first" with vague maintenance ([martinfowler.com, 2025-10-15](https://www.martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)).

**Inference: if you use Claude Code heavily.** Let a feature's spec/plan/tasks files be disposable working files. Promote anything durable into a PRD page, an ADR or the system design doc. A Spec Kit-style "constitution" is just a pointer file to the ADR index and the system design doc.

## Adopt the core sections of five templates

**PRD pages.** Across Atlassian's Confluence template, Cagan's guide, Basecamp's Shape Up pitch, Intercom's problem statements and the PR/FAQ, the recurring sections are:

- problem/objective
- target users
- goals and success metrics
- prioritized requirements, often as user stories
- explicit out-of-scope items
- assumptions/risks
- open questions with dated answers

([Atlassian PRD template, vendor](https://www.atlassian.com/software/confluence/templates/product-requirements); [SVPG PRD guide](https://www.svpg.com/wp-content/uploads/2024/07/How-To-Write-a-Good-PRD.pdf); [Shape Up ch. 6, 2019](https://basecamp.com/shapeup/1.5-chapter-06); [Intercom, 2021-01-05](https://www.intercom.com/blog/how-to-write-problem-statements)).

Shape Up adds **appetite**: "how much time we want to spend and how that constrains the solution." It names exclusions **no-gos** and risks **rabbit holes**, and it deliberately avoids high-fidelity mocks ([Shape Up](https://basecamp.com/shapeup/1.5-chapter-06)). Cagan prioritizes requirements as must-have, high-want or nice-to-have, and puts non-functional "release criteria" in the PRD ([SVPG](https://www.svpg.com/wp-content/uploads/2024/07/How-To-Write-a-Good-PRD.pdf)). Addy Osmani recommends defining "success" as testable checks such as input/output examples, and keeping the spec in version control ([Osmani, DEV](https://dev.to/addyosmani/how-to-write-a-good-spec-for-ai-agents-31i9)). The year of that article is not shown on the page.

**Inference: minimal PRD page.** A status header (status, last-updated, links), followed by:

1. Problem and users, with one concrete story
2. Success criteria
3. Requirements with stable IDs and must/should/could priority, each with acceptance criteria written as Given/When/Then or input → expected output (for example, "given stored week-N stats, half-PPR score = X")
4. Non-goals
5. Appetite/phase
6. Risks and rabbit holes
7. Open questions (question, answer, date)

Release criteria that matter here, such as data freshness and scoring correctness, go under success criteria. Skip Atlassian's team and Jira fields and Cagan's schedule rationale.

**ADRs.** MADR **4.0.0 (released 2024-09-17, still the latest)** makes only four sections core: title, context and problem statement, considered options, and decision outcome. Decision drivers, consequences, **Confirmation**, pros and cons, and more information are optional. Status, date and decision-makers are optional front matter ([MADR](https://adr.github.io/madr/)).

Nygard's 2011 original is Title, Context, Decision, Status, Consequences ([arc42 FAQ C-9-3](https://faq.arc42.org/questions/C-9-3/)). This was read second-hand through arc42; the original Cognitect post was not fetched. Azure adds a confidence level to support later reconsideration ([Microsoft Learn](https://learn.microsoft.com/en-gb/azure/well-architected/architect-role/architecture-decision-record)). Google Cloud says to write an ADR when there is no existing basis for a decision or there are two or more options, and to store ADRs "close to your application code" ([Google Cloud, updated 2024-08-16](https://docs.cloud.google.com/architecture/architecture-decision-records)). Thoughtworks' Radar moved lightweight ADRs to **Adopt** in November 2017, preferring source control over a wiki. The entry has since aged off the current Radar ([Thoughtworks Radar](https://www.thoughtworks.com/en-us/radar/techniques/lightweight-architecture-decision-records)).

**Inference: minimal ADR.** Keep the four MADR core sections plus:

- front matter: status, date, supersedes/superseded-by
- Consequences
- one **Confirmation** line naming the check that proves compliance

Your ADR-0007 ("calculate fantasy points in the app from stored stats") and ADR-0008 (scheduled jobs inside the app server) are natural candidates for automated Confirmation tests. Drop the "consulted/informed" fields until there is more than one person.

**System design doc.** arc42 has 12 sections. Its own FAQ says "there is no general rule" for a minimum. It does recommend always covering:

- 3–5 central quality requirements as scenarios
- the context view and external interfaces
- a brief solution strategy with the most important decisions
- the building-block view, level 1
- the most important crosscutting concepts

([arc42 FAQ B-4](https://faq.arc42.org/questions/B-4/)). Section 9 (decisions) explicitly endorses one ADR per important decision because "smaller pieces of documentation are easier to read, create and maintain." It also says to avoid redundant text and refer back to section 4 instead ([arc42 section 9](https://docs.arc42.org/section-9/)).

Simon Brown's C4 guidance is that "the system context and container diagrams are sufficient for most software development teams" ([c4model.com](https://c4model.com/diagrams)). ISO/IEC/IEEE 42010:2022 clause 6 lists the elements a conformant architecture description records: stakeholders, concerns, viewpoints/views, correspondences, and decisions with rationale. It prescribes no format ([42010:2022 preview](https://cdn.standards.iteh.ai/samples/74393/fc7b7f103d8446a4b87a3261e31370d3/ISO-IEC-IEEE-42010-2022.pdf)). Only the clause headings were read; the "shall" text is paywalled.

**Inference: minimal system design doc.** Six headings:

1. Goals and 3–5 quality goals, including multi-user readiness
2. Constraints
3. Context and external interfaces (Sleeper and other data sources), with a C4 Context diagram
4. Solution strategy, with links to ADRs (not copies)
5. Building blocks level 1, with a C4 Container diagram (Next.js app, in-app scheduler, Postgres, bucket)
6. Crosscutting concepts (auth and tenancy, data retention, observability)

Add a small table mapping concerns to the ADRs and sections that address them. This is a lightweight version of 42010's "correspondences."

**Component specs.** No standard defines a minimal implementation spec. The Rust RFC template and Python PEPs both carry the specification *inside* the proposal: Rust as a "reference-level explanation", PEPs as a "Specification" section ([Rust RFC template](https://github.com/rust-lang/rfcs/blob/master/0000-template.md); [PEP 1 summary, second-hand](https://pynotes.bjdean.id.au/posts/pep-1-purpose/)). Google's design-doc core is context, goals and non-goals, design, alternatives and cross-cutting concerns. A 1–3 page "mini design doc" is acceptable, and Google advises not writing one when it would be "an implementation manual" without trade-offs ([Ubl](https://www.industrialempathy.com/posts/design-docs-at-google/)).

**Inference: minimal component spec.** Status header, then:

- context and goals/non-goals, linking the PRD and ADRs
- the contract (schemas, bucket layout, schedules, idempotency, error handling)
- requirement IDs with acceptance criteria
- open questions

Alternatives belong in ADRs, not in the spec. Create a new spec only where other code or people depend on a contract.

**Templates doc.** Its job is to hold the shared front-matter schema (id, status, last-updated, supersedes/superseded-by, links) and the five skeletons above. Uniform metadata is what makes the checks in the final section possible (inference).

## Two change rules and one precedence ladder

**Lifecycle states.** Mature proposal processes converge on a small set of states:

- **Kubernetes KEPs:** provisional → implementable → implemented, plus deferred, rejected, withdrawn and replaced. They carry paired `replaces`/`superseded-by` fields and a `last-updated` date ([KEP README](https://github.com/kubernetes/enhancements/blob/master/keps/sig-architecture/0000-kep-process/README.md)).
- **Python PEPs:** Draft, Accepted, Provisional, Final, Deferred, Rejected, Withdrawn, Superseded and Active, with `Replaces`/`Superseded-By` headers ([PEP 1 mirror](https://sphinx-locales.github.io/peps/pep-0001)). This was read via a mirror because peps.python.org was blocked.
- **Oxide RFDs:** prediscussion, ideation, discussion, published, committed and abandoned. A committed RFD "explains how the system works" ([Oxide RFD 1, 2020-07-24](https://oxide.computer/blog/rfd-1-requests-for-discussion)).
- **MADR:** proposed, rejected, accepted, deprecated and "superseded by ADR-0123" ([MADR](https://adr.github.io/madr/)).

**Inference: recommended states.** One shared set: **Draft → Accepted → Implemented → Superseded or Deprecated**, with **Rejected** for ADRs only. "Implemented" earns its place because it marks the point where a document becomes a description of reality that must be reconciled with the code. That is the role KEP "implemented", PEP "Final" and Oxide "committed" play.

**Two classes of document, two change rules.**

*Decision records are append-only.* AWS: "When the team accepts an ADR, it becomes immutable," and a change needs a new ADR that supersedes it ([AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html)). Azure: "The ADR serves as an append-only log. Don't go back and edit accepted records" ([Microsoft Learn](https://learn.microsoft.com/en-gb/azure/well-architected/architect-role/architecture-decision-record)). Two credible sources dissent:

- The UK government's ADR framework (DSIT/GDS, published 2025-11-04) ends its lifecycle with "Regularly review and update the ADR" ([GOV.UK](https://www.gov.uk/government/publications/architectural-decision-record-framework/architectural-decision-record-framework)).
- Google Cloud says to record the previous decision and the reason for the change, relying on source-control history ([Google Cloud](https://docs.cloud.google.com/architecture/architecture-decision-records)).

**Inference: resolving the dissent.** Edit an accepted ADR only for typos, status and links. Write a new ADR for any change to the decision itself. That keeps the GOV.UK "review" step without losing history.

*Descriptive documents are edited in place.* Oxide changes a published RFD by pull request. It expects edits to committed RFDs to be "infrequent," and a new RFD for "a significant divergence" ([Oxide](https://oxide.computer/blog/rfd-1-requests-for-discussion)). Google notes that people are bad at updating docs, so post-ship changes often become linked amendments ([Ubl](https://www.industrialempathy.com/posts/design-docs-at-google/)). Cagan keeps "one master version" and expects change to slow once engineering starts ([SVPG, Revisiting the Product Spec, 2006](https://www.svpg.com/revisiting-the-product-spec/)). Atlassian records dated answers to open questions as the change trail ([Atlassian](https://www.atlassian.com/software/confluence/templates/product-requirements)).

NASA's configuration-management handbook supplies the test for amend versus supersede. It distinguishes **major changes** (significant impact) from **minor changes** (documentation corrections that don't affect interchangeability). It also defines a **waiver** as "a documented agreement intentionally releasing a program or project from meeting a requirement" without changing the baseline ([NASA SEH 6.5](https://www.nasa.gov/seh/6-5-configuration-management)). The handbook page shows no revision label, and its scaling to one person is my inference.

**Inference: amend-vs-supersede rule.** For PRD pages, the system design doc, specs and templates, amend in place with a bumped `last-updated` and a commit message naming the document ID. Supersede, by opening a new document or new ADR, when the change:

- alters user-visible scope,
- alters a data contract,
- contradicts an accepted ADR, or
- reverses a non-goal.

Record a deliberate temporary deviation as a dated waiver note rather than silently diverging. Git history serves as the version record. No source read prescribes semantic versioning for planning documents.

**Precedence.** No source read defines a general precedence order between planning documents. The available patterns are:

- explicit supersession links make the newer record authoritative (PEP, KEP, MADR);
- Spec Kit treats its constitution as a rule set whose violations are automatically CRITICAL and block implementation ([instagit summary, aggregator; primary template blocked](https://instagit.com/github/spec-kit/how-speckit-analyze-command-performs-cross-artifact-consistency-analysis));
- PEP 1 makes the language reference the official record of behavior once a PEP is Final ([PEP 1 mirror](https://sphinx-locales.github.io/peps/pep-0001));
- NASA says that when design uncovers in-scope requirements, you "update the requirements documents too" ([NASA SWEHB SWE-059](https://swehb.nasa.gov/spaces/7150/pages/16449675/SWE-059+-+Bidirectional+Traceability+Between+Software+Requirements+and+Software+Design)).

**Inference: proposed precedence ladder.** For *intent*, authority runs: Overview (vision and non-goals) and accepted ADRs → feature PRDs → system design doc → component specs → templates → code. A newer accepted ADR beats an older one. A more specific document governs only inside the bounds its parent sets. For *current behavior* of anything marked Implemented, the code and tests are the truth and the document must be reconciled to them. Downstream artifacts never silently override upstream ones. Every conflict ends in one of three outcomes: fix the code, amend or supersede the document, or record a waiver.

| Class | Docs | States | Change rule |
|---|---|---|---|
| Decision record | ADRs | Draft/Proposed → Accepted → Superseded/Deprecated; Rejected | Append-only; new ADR supersedes, links both ways |
| Living description | Overview, PRD pages, system design, component specs, templates | Draft → Accepted → Implemented → Superseded/Deprecated | Edit in place for minor changes; new doc for major divergence; waiver for temporary deviation |

## Reconcile through IDs, Confirmation checks and milestone audits

**Why traceability.** Bidirectional traceability exists to catch requirements with no design or test, to find "orphan" elements with no source requirement, and to show which design, documentation, code and tests a change affects. NASA explicitly allows small projects to use a spreadsheet or text document, and "value-based tracing" of only the most important requirements. Its SWE-059 requirement is not imposed on non-safety-critical Class C–E software ([NASA SWEHB SWE-059](https://swehb.nasa.gov/spaces/7150/pages/16449675/SWE-059+-+Bidirectional+Traceability+Between+Software+Requirements+and+Software+Design)). NPR 7150.2D's SWE-052 lists the full chain: requirements ↔ design ↔ code ↔ verification ↔ nonconformances ([NPR 7150.2D](https://explorers.larc.nasa.gov/APSMEX25/SMEX/pdf_files/NASA21_NPR_7150_2D.pdf)). Per-class applicability of SWE-052 was not confirmed.

**Ways to keep documents and code in sync.**

- **Docs as code.** Write the Docs describes documentation written "with the same tools as code", including review and automated tests, with documentation required before merging features ([Write the Docs](https://writethedocs.org/guide/docs-as-code)). *Software Engineering at Google* reports that its "most successful efforts have been when documentation is treated like code" ([O'Reilly ch. 10 preview](https://www.oreilly.com/library/view/software-engineering-at/9781492082781/ch10.html)). Only the preview was readable, so its guidance on owners and freshness dates is not cited.
- **MADR's Confirmation section.** It asks whether "the chosen design and its implementation [are] in line with the decision," via review or a test such as ArchUnit ([MADR](https://adr.github.io/madr/)).
- **Fitness functions.** Thoughtworks defined an architectural fitness function as "an objective integrity assessment of some architectural characteristics." It was rated Trial in 2017–2018 and is no longer on the current Radar ([Thoughtworks Radar](https://thoughtworks.com/radar/techniques/architectural-fitness-function)).
- **Automated consistency passes.** Spec Kit's `/speckit.analyze` is a read-only pass checking duplication, ambiguity, coverage gaps and cross-artifact inconsistency ([instagit, aggregator](https://instagit.com/github/spec-kit/how-speckit-analyze-command-performs-cross-artifact-consistency-analysis)).
- **Audits.** NASA verifies configuration "by inspecting documents, products, and records," with functional and physical audits. It records how each discrepancy was resolved in status accounting ([NASA SEH 6.5](https://www.nasa.gov/seh/6-5-configuration-management)).

**Inference: a reconciliation kit for one developer.**

1. **Stable requirement IDs.** Give requirements IDs such as `PRD-scoring.R3` or `ETL-R12`. Put those IDs, plus ADR numbers, in test names and commit messages, so a grep can generate the trace matrix on demand instead of you maintaining one by hand. Trace only must-have requirements and data-contract or scoring rules.
2. **Definition of done.** Every change ships with its tests and its affected documents in the same commit, or states "no doc impact."
3. **A CI lint over front matter.** It checks that the status is in the allowed set, supersession links are bidirectional, referenced IDs exist, and no Accepted document depends on a Superseded ADR without a note.
4. **A read-only AI consistency pass.** Before building a non-trivial feature, have an assistant check PRD ↔ design ↔ spec coverage and contradictions.
5. **A milestone audit.** Walk the status index and check each Implemented document against the code and schema. Resolve each discrepancy as fix code, amend document, or waiver.

The status index in the templates doc (document, status, last-updated, superseded-by) doubles as NASA-style status accounting.

## Conclusion

What you lack is governance, not more documents. Your folder already covers every outcome the life-cycle standards ask for. The weak points are rules nobody has written down: what "Accepted" means for a PRD, when a design doc is opened anew rather than edited, and which document wins in a conflict. The sources split cleanly here. Decisions are records and should be immutable. Descriptions are living until shipped, then become claims about reality that must be checked. Building the suite on that split, rather than on any one template, keeps it small. It also survives the move to multiple users. When a second contributor arrives, the same state set and supersession links become the review process, with MADR's consulted/informed fields switched on and no new document types needed.

The standards picture is shifting while you build. 12207 was reissued in April 2026, and 15289 and 29148 both have DIS drafts circulating in late 2026, so new editions of the requirements and information-item standards will likely land in 2027. NASA's NPR 7150.2D expires in March 2027. Two IEEE templates people still copy (1016 and 828) are inactive. Cite standards by edition in your tailoring note, and treat them as checklists of outcomes rather than templates. That way, a revision will mean updating one line, not restructuring the suite.

## Sources

Authority types: **SB** = standards body; **GOV** = government agency guidance; **OV** = official vendor guidance; **VC** = vendor tool convention or template; **PR** = recognized practitioner; **AG** = secondary or aggregator. Access levels: **Full** = page read; **Preview** = front matter or table of contents only (body paywalled); **Catalogue** = listing or status page only; **Second-hand** = read via a mirror or summary.

| Source | Edition / date | Type | Access |
|---|---|---|---|
| [ISO/IEC/IEEE 12207 committee page (63712)](https://committee.iso.org/standard/63712.html) | 12207:2017 withdrawn 2026-04-29 | SB | Catalogue |
| [ISO/IEC/IEEE 12207:2017 preview (iTeh)](https://cdn.standards.iteh.ai/samples/63712/0bc6d9107eeb46d88dbc7b628b12cf4b/ISO-IEC-IEEE-12207-2017.pdf) | 2017 | SB | Preview |
| [ISO/IEC/IEEE 12207:2026 (Genorma)](https://genorma.com/en/standards/iso-iec-ieee-12207-2026) | 2026-04-29 | SB (reseller listing) | Catalogue |
| [ISO/IEC/IEEE 15289:2019 preview (VDE)](https://assets.vde-verlag.de/iec-normen/preview-pdf/info_isoiecieee15289%7Bed4.0%7Den.pdf) | 4th ed., 2019 | SB | Preview |
| [ISO DIS 15289 committee page (94699)](https://committee.iso.org/standard/94699.html) | Ed. 5 DIS, registered 2026-10-23 | SB | Catalogue |
| [ISO/IEC/IEEE 29148:2018 (iTeh)](https://standards.iteh.ai/catalog/standards/iso/8cf2bc2b-8b5e-4907-a82a-d1c5676c9e85/iso-iec-ieee-29148-2018) | 2nd ed., 2018-11-27; stage 90.92 | SB | Catalogue/ToC |
| [ISO/IEC/IEEE DIS 29148 (Genorma)](https://genorma.com/en/standards/iso-iec-ieee-dis-29148) | DIS ballot from 2026-09-14 | SB (reseller listing) | Catalogue |
| [ISO/IEC/IEEE 42010:2022 preview (iTeh)](https://cdn.standards.iteh.ai/samples/74393/fc7b7f103d8446a4b87a3261e31370d3/ISO-IEC-IEEE-42010-2022.pdf) | 2nd ed., 2022 | SB | Preview |
| [IEEE 1016-2009 (IEEE SA)](https://standards.ieee.org/standard/1016-2009.html) | 2009; Inactive-Reserved 2020-03-05 | SB | Catalogue |
| [IEEE 828-2012 (IEEE SA)](https://standards.ieee.org/standard/828-2012.html) | 2012; Inactive-Reserved 2023-03-30 | SB | Catalogue |
| [ISO/IEC 29110-5-1-2:2025 preview (ANSI)](https://webstore.ansi.org/preview-pages/ISO/preview_ISO+IEC+29110-5-1-2-2025.pdf) | 1st ed. IS, Feb 2025 | SB | Preview |
| [O'Connor, 29110 Basic profile paper (CORE)](https://core.ac.uk/download/30934317.pdf) | Based on TR 29110 2011 | PR (academic) | Full; describes the superseded TR |
| [SWEBOK v4.0 topics (IEEE CS)](https://www.computer.org/education/bodies-of-knowledge/software-engineering/topics) | v4.0, 2024 | SB (professional society) | Headings only |
| [NASA NPR 7150.2D](https://explorers.larc.nasa.gov/APSMEX25/SMEX/pdf_files/NASA21_NPR_7150_2D.pdf) | Rev D, eff. 2022-03-08, expires 2027-03-08 | GOV | Full (partially extracted) |
| [NASA SWEHB 7.16](https://swehb.nasa.gov/display/SWEHBVD/7.16+-+Appendix+C.+Requirements+Mapping+and+Compliance+Matrix) | Handbook vD, undated page | GOV | Full |
| [NASA SWEHB 7.18](https://swehb.nasa.gov/spaces/SWEHBVD/pages/102695654/7.18+-+Documentation+Guidance) | Handbook vD, undated page | GOV | Full (index only; 5.xx pages not read) |
| [NASA SWEHB SWE-059](https://swehb.nasa.gov/spaces/7150/pages/16449675/SWE-059+-+Bidirectional+Traceability+Between+Software+Requirements+and+Software+Design) | Undated page | GOV | Full |
| [NASA SE Handbook §6.5](https://www.nasa.gov/seh/6-5-configuration-management) | Web edition; no revision label shown | GOV | Full |
| [arc42 docs](https://docs.arc42.org/home/), [section 9](https://docs.arc42.org/section-9/), [tip 9-5](https://docs.arc42.org/tips/9-5/) | No version or date shown | PR (Starke/Hruschka) | Full |
| [arc42 FAQ B-4](https://faq.arc42.org/questions/B-4/), [C-9-3](https://faq.arc42.org/questions/C-9-3/) | Undated | PR | Full (C-9-3 is second-hand for Nygard 2011) |
| [C4 model diagrams](https://c4model.com/diagrams) | Undated | PR (Simon Brown) | Full |
| [MADR](https://adr.github.io/madr/) | 4.0.0, 2024-09-17 | PR / community convention | Full |
| [AWS Prescriptive Guidance, ADR process](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html) | Undated | OV | Full |
| [Microsoft Azure Well-Architected, ADR](https://learn.microsoft.com/en-gb/azure/well-architected/architect-role/architecture-decision-record) | Updated 2026-04-13 | OV | Full |
| [Google Cloud Architecture Center, ADRs](https://docs.cloud.google.com/architecture/architecture-decision-records) | Updated 2024-08-16 | OV | Full |
| [GOV.UK ADR framework (DSIT/GDS)](https://www.gov.uk/government/publications/architectural-decision-record-framework/architectural-decision-record-framework) | Published 2025-11-04 | GOV | Full |
| [Thoughtworks Radar, Lightweight ADRs](https://www.thoughtworks.com/en-us/radar/techniques/lightweight-architecture-decision-records) | Adopt Nov 2017 / May 2018; aged off | PR (consultancy) | Full |
| [Thoughtworks Radar, Architectural fitness function](https://thoughtworks.com/radar/techniques/architectural-fitness-function) | Trial Nov 2017 / May 2018; aged off | PR | Full |
| [Ubl, Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) | 2020-07-06 | PR | Full |
| [Orosz, RFCs and design docs](https://blog.pragmaticengineer.com/rfcs-and-design-docs/) | 2022-06-21, updated 2024-02-07 | PR (journalism; Uber template second-hand) | Full (read; not cited above) |
| [Kashitsyn, Effective design docs](https://mmapped.blog/posts/31-effective-design-docs) | 2024-09-15 | PR (individual blog) | Full |
| [Rust RFC template](https://github.com/rust-lang/rfcs/blob/master/0000-template.md) | Current master | PR (OSS project convention) | Full |
| [Kubernetes KEP process README](https://github.com/kubernetes/enhancements/blob/master/keps/sig-architecture/0000-kep-process/README.md) | Current master | PR (OSS project convention) | Full |
| [PEP 1 (Sphinx mirror)](https://sphinx-locales.github.io/peps/pep-0001) | Mirror; date unverified | PR (OSS project convention) | Second-hand (primary blocked) |
| [PEP 1 summary (pynotes)](https://pynotes.bjdean.id.au/posts/pep-1-purpose/) | Undated | AG | Second-hand |
| [Oxide RFD 1](https://oxide.computer/blog/rfd-1-requests-for-discussion) | 2020-07-24 | PR (company process) | Full |
| [Cagan, Vision vs. Strategy (SVPG)](https://www.svpg.com/vision-vs-strategy/) | 2016-07-15 | PR | Full |
| [Cagan, The Alternative to Roadmaps (SVPG)](https://www.svpg.com/the-alternative-to-roadmaps/) | 2015-09-07 | PR | Full |
| [Cagan, How to Write a Good PRD (SVPG PDF)](https://www.svpg.com/wp-content/uploads/2024/07/How-To-Write-a-Good-PRD.pdf) | ©2005 (classic) | PR | Full |
| [Cagan, Revisiting the Product Spec (SVPG)](https://www.svpg.com/revisiting-the-product-spec/) | 2006-10-12 (classic) | PR | Full |
| [Shape Up ch. 6 (Basecamp)](https://basecamp.com/shapeup/1.5-chapter-06) | 2019 | PR | Full |
| [Intercom, problem statements](https://www.intercom.com/blog/how-to-write-problem-statements) | 2021-01-05 | PR | Full |
| [Atlassian Confluence PRD template](https://www.atlassian.com/software/confluence/templates/product-requirements) | Undated | VC | Full |
| [Bryar, Working Backwards PR/FAQ (Coda)](https://coda.io/@colin-bryar/working-backwards-how-write-an-amazon-pr-faq) | Undated (images Aug 2021) | PR (ex-Amazon VP) | Full |
| [Osmani, spec for AI agents (DEV)](https://dev.to/addyosmani/how-to-write-a-good-spec-for-ai-agents-31i9) | "Mar 18", year not shown | PR | Full |
| [Microsoft Learn, GitHub Spec Kit module](https://learn.microsoft.com/en-us/training/modules/spec-driven-development-github-spec-kit-enterprise-developers/3-examine-github-spec-kit) | 2026-01-28, updated 2026-07-03 | VC | Full (Spec Kit repo itself not read) |
| [Kiro specs concepts](https://kiro.dev/docs/specs/concepts) | Undated | VC | Full |
| [Spec Kit analyze summary (instagit)](https://instagit.com/github/spec-kit/how-speckit-analyze-command-performs-cross-artifact-consistency-analysis) | Undated | AG | Second-hand (primary template blocked) |
| [Böckeler, SDD tools (martinfowler.com)](https://www.martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) | 2025-10-15 | PR (Thoughtworks) | Full |
| [Write the Docs, Docs as Code](https://writethedocs.org/guide/docs-as-code) | Undated | PR (community) | Full |
| [Software Engineering at Google, ch. 10 (O'Reilly)](https://www.oreilly.com/library/view/software-engineering-at/9781492082781/ch10.html) | 2020 book | PR | Preview only |

**Not read, so nothing above is attributed to them:**

- the body text of all ISO/IEC/IEEE standards, including 29148's attribute and characteristic lists, 15289's generic content and its 74-item list, and 12207 Annex B
- ISO/IEC/IEEE 15288:2023
- ISO 10007:2017
- SAE EIA-649C
- Martraire's *Living Documentation*
- Ford et al.'s *Building Evolutionary Architectures*, 2nd edition
- the c4model.com FAQ
- adr.github.io's home page
- Nygard's original 2011 post
- Lenny Rachitsky's paywalled PRD-examples post
