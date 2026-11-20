# Platform integration — open decisions for the owner (2026-11-18)

**Status: all four OPEN. Nothing here is decided.** Each section states the question, the requirements any answer must satisfy (from the PRDs, the system-design guardrail and the Overview's shared terms), the constraints research established, and candidate approaches to check against those requirements. Claude's notes are analysis, not decisions; the owner's answer gets recorded where each section says.
**Evidence base:** [`research/platform-apis-sleeper-yahoo-espn-research-2026-11-18.md`](../../research/platform-apis-sleeper-yahoo-espn-research-2026-11-18.md) (every platform fact below cites a section of it). Listed as items 11–15 in the [decision log](../architecture-decisions.md) (the Yahoo access application is item 12, context for OD1/OD2 rather than its own section; Sleeper writes is item 15).
**Engineering questions are deliberately absent.** Late-inactives source, kickoff/lock source, injury-label normalization, waiver-schedule modeling, trade-state mapping, GraphQL field additions, token-refresh locking and the players-map job placement are spec work (the Platform connections spec answers them, with build-time probes); they need no owner input and are tracked in the spec plan.

---

## OD1 — ESPN posture: integrate under Disney's terms, or not?

**The question.** Disney's Terms of Use §2.B.x prohibits automated access to ESPN on its face — reads included. There is no official API and no permitted path. Do we integrate ESPN, and at what level? (This is the PRD's blocking ToS question, now decision-ready for ESPN.)

**Requirements an answer must satisfy**
- Platform connections PRD success target: "All current-season leagues on all three platforms load — 100% in the first week" — an ESPN-less answer fails this as written and requires the owner to revise the PRD target in the same change (AGENTS rule 4).
- Must-haves if integrated: ESPN view data via the two cookies; "Reconnect needed" on expiry; connection health; broken connections never shown as current; sign-ins encrypted server-side, never in the browser.
- Overview capability contract: reading never implies writing; unsupported capabilities degrade to a link-out, fail closed.

**Constraints (research §3)**
- Reads: unofficial but stable and well-mapped (`lm-api-reads` + views; league discovery via the fan API). One structural break roughly every 5 years; community adapts in days-to-weeks.
- Cookies (`espn_s2` + `SWID`) authenticate the **entire ESPN/Disney account**, not just fantasy; lifetime months-but-revocable, no official number; "sign out everywhere" kills them.
- Writes: reverse-engineered `lm-api-writes`, undocumented payloads, working community tools, extra fragility.
- Enforcement: no documented account action against fantasy automation was found (absence of evidence, not a guarantee). Worst case per ToS: account termination.

**Candidate approaches**

| | Approach | Checks against requirements | Exposure |
| --- | --- | --- | --- |
| A | Reads via cookies, writes excluded; revisit writes only after reads prove stable | Meets every view-phase requirement; write capability recorded "unsupported" with link-out | ToS risk accepted for reads; smallest useful surface |
| B | Reads and (later) writes, both accepting the risk, writes behind kill switch + dry-run + the write-gate suite | Meets view and changes requirements | Highest exposure; write payloads are the most fragile surface on any platform |
| C | Exclude ESPN; leagues stay on ESPN's app with a link-out | Fails the "all three platforms" success target → PRD revision required; everything else unaffected | Zero |

**Decided:** *(open — owner records here; outcome becomes an ADR via `adr-new` and updates the Overview table, the Platform connections PRD and the build order in the same change)*

## OD2 — Sleeper writes: unofficial path, defer, or never?

**The question.** Sleeper has no official write API. The PRD's should-have ("Sleeper: make changes using a pasted Sleeper sign-in token") is implementable only through the reverse-engineered GraphQL endpoint. Plan it, defer the call, or drop it?

**Requirements an answer must satisfy**
- PRD should-have: changes behind an "Allow changes" switch, confirmation listing exactly what will change; verified-platform-action lifecycle; no auto-retry; change history.
- Capability contract: write capabilities marked unsupported/temporarily-unavailable must degrade to link-out, fail closed.
- Lineup management build order #5: writes enabled only after the repeatable gate suite passes.

**Constraints (research §1)**
- Official API is explicitly read-only; reads are unaffected by this decision and fully covered.
- Unofficial endpoint: ~350 mutations exist (lineups, claims with FAAB, add/drop, trades), **mutation names and argument shapes have churned without notice**, breaking community SDKs.
- Token: a browser-captured JWT, no refresh endpoint, manual re-capture on expiry; lifetime unverified.
- ToS §9.2 prohibits reverse engineering; the ToU was updated 2026-11-17 — re-read before deciding. Official-API reads for personal, non-commercial use are fine.

**Candidate approaches**

| | Approach | Checks against requirements | Exposure |
| --- | --- | --- | --- |
| A | Defer the decision to the changes phase; spec designs only the adapter interface a Sleeper write adapter would slot into | Viewing phase fully delivered; no PRD change; decision made with a season of read-path experience | None now; decision debt |
| B | Plan the unofficial path in the spec now: token-paste UX with decoded expiry, kill switch, dry-run, drift detection (schema snapshot diff), gate suite | Meets the PRD should-have as written | ToS risk accepted now; adapter is VOLATILE by design |
| C | Sleeper stays view-only permanently; changes link out | PRD should-have removed → owner PRD revision; capability contract handles the rest | Zero |

**Decided:** *(open — owner records here; outcome → ADR + PRD reconciliation as in OD1)*

## OD3 — Live game-day tier: inside the Express backend, or a separate worker?

**The question.** Already a blocking PRD open question, "Who answers: You." The ≥60-second game-window poller has to run somewhere always-on. In-process with the API (as the pipeline scheduler does) or as a separate worker process?

**Requirements an answer must satisfy**
- Freshness: live values ≤60 s old during games; ≤15 min otherwise (Platform connections PRD).
- Guardrail row 6: background work runs as jobs separate from the web request path, keyed by league, each with its own entry point so it "can move to a worker without a rewrite" (ADR-0008's upgrade trigger).
- Guardrail rows 5/7: stateless app process, job state in MySQL, safe under more than one process.
- Launch allowance: one host, one instance is acceptable (system design §0).

**Constraints (research §4)**
- All three platforms are poll-only (no webhooks/push), so the tier is pure scheduled HTTP work.
- Rate budgets bound the fan-out: Yahoo ~1 req/s is the tightest — at 2–3 calls per league per cycle, a 60 s cadence supports roughly 20+ leagues before the budget bites; Sleeper (<1,000/min) and ESPN (human-scale + caching) are looser.
- ADR-0008 already accepts the trade-off that a heavy job can affect API latency until jobs move out.

**Candidate approaches**

| | Approach | Checks against requirements | Cost |
| --- | --- | --- | --- |
| A | In-process: the existing node-cron scheduler starts the live tier during game windows, same pattern as the pipeline; entry point kept worker-movable per row 6 | Meets every requirement at launch scale; one process to run | Poller load shares the API process; the ADR-0008 trade-off, now exercised on game days |
| B | Separate worker process from day one, reading the same MySQL | Isolation; exercises the multi-process guardrail early | A second always-on process to deploy, supervise and keep schema-compatible — before deployment hosting is even decided |
| C | A: in-process at launch, with the extraction trigger named in the spec (e.g. observed API p95 degradation during games) | As A, plus a defined exit | Same as A until the trigger fires |

**Decided:** *(open — owner records here; closes the PRD's blocking row and shapes spec §4)*

## OD4 — Credential and disconnect policy

**The question.** What exactly happens when the owner disconnects a platform — to the stored credentials, and to the league data already synced? (The residue of the credential-lifecycle question after research turned the rest into facts.)

**Requirements an answer must satisfy**
- Guardrail row 4: sign-ins per user, encrypted, key outside the database; PRD: never sent to the browser, never logged.
- Overview historical-snapshots term: snapshots are history for analytics/audit — which argues their value survives a disconnect.
- Shared-league rule (guardrail row 6): a league is polled once with *some* user's credential — the policy must say what happens to sync when the credential it uses is removed.

**Constraints (research §§1–3)**
- Three credential shapes with three failure modes: Yahoo OAuth tokens (app-side delete; user can also revoke at Yahoo), Sleeper write-JWT (app-side delete only), ESPN cookies (app-side delete; cookies remain valid at ESPN until the user signs out everywhere — worth surfacing in the UX).
- No platform offers a server-side revocation API we can rely on for all three; deletion on our side is the only uniform control.

**Candidate approaches**

| | Approach | Checks against requirements | Trade-off |
| --- | --- | --- | --- |
| A | Disconnect hard-deletes the credential row; synced league data and snapshots are kept, marked disconnected (stale, non-actionable); league sync stops unless another user's credential covers it | Satisfies encryption/minimal-retention and preserves snapshot history | Disconnected data lingers; needs a visible "disconnected as of" marker |
| B | Hard-delete credentials and all synced data for leagues only that user connected | Cleanest privacy story | Destroys the season history the snapshots exist for; harder in shared leagues |
| C | Keep credentials, flag inactive | — | Retains secrets with no use; conflicts with the spirit of row 4. Listed for completeness |

**Decided:** *(open — owner records here; outcome becomes spec §2 content and a PRD open-question closure)*

---

## Downstream once decided

- OD1 + OD2 together re-open the **changes-phase ordering** ("Yahoo first, then Sleeper") — also contingent on the Yahoo access application outcome (decision log item 12): new Yahoo apps are read-only; only legacy write-scope credentials restore the official Yahoo write path (research §2.1).
- Each decision is recorded via `adr-new` when made; the Overview's "What each platform allows" table, the Platform connections PRD (targets, Must/Should-have rows, build order) and the Lineup management / Trades PRDs reconcile in the same change (AGENTS rule 4).
