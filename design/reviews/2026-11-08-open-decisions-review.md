# Runpure FF — Open decisions review (2026-11-08): trade-offs and recommendations

**Review date:** 2026-11-08 · **Owner:** William Sanchez · **Status:** Closed 2026-11-09. Every item below is decided, deferred or removed, as the Summary shows; Q6 was decided as GraphQL. The decisions themselves are recorded in the ETL spec §0.2 ([`specs/ff-data-etl-storage-spec.md`](../../specs/ff-data-etl-storage-spec.md)), the ADRs and the decision log ([`design/architecture-decisions.md`](../architecture-decisions.md)), which outrank this record.

**Moved 2026-11-09** from the online open-decisions doc into the planning repo; the online copy is no longer maintained. Its "Data dictionary" tab, a copy marked unmaintained since 2026-11-08, wasn't brought over: the maintained version is the ETL spec's Appendix A.

## How to read this

Every open decision in the ETL spec (v2.0, D1–D15) gets one page, plus D16 for backup and recovery, the gap found on review. Each page has the decision, a trade-off table, a recommendation, why, and what it changes in numbers.

- **Evidence:** every row in a trade-off table links its source. A row with no source says so; reasoning that isn't from a source is marked *inference*.
- **Quantified difference:** megabytes, dollars a month, runs a week, minutes of staleness, files to maintain. Where a choice has no honest number, the page says so rather than inventing one.
- **Authority:** accepted ADRs outrank everything here. A recommendation that would contradict one says it needs a superseding ADR.
- **Recommendations are not decisions.** Nothing here is recorded until you decide it.

## Summary

| # | Status | Outcome | Needed before |
| --- | --- | --- | --- |
| D1 | Decided | Spec stays with the ADRs, planning repo `specs/` | — |
| D2 | Decided | Seven datasets plus play-by-play and depth charts; no practice squad unless they play; kickers, team defense and defensive players included | — |
| D3 | Decided | Keep current-season play-by-play for later analytics (recommendation not taken) | — |
| D4 | Already decided 2026-11-06 | Sleeper set aside | — |
| D5 | Decided | Ledger per dataset × season | — |
| D6 | Decided | Season in progress on today's date; nflverse's switch dates between seasons | — |
| D7 | Decided | Daily at 06:00 ET only | — |
| D8 | Out of scope | Monitoring and alerting get their own PRD later; in the decision log's open list | Later phase |
| D9 | Rewritten | Moved to ETL spec §7.2 and Appendix A; team table loaded (D9a, your decision) | Each table's `CREATE TABLE` |
| D10 | Closed (Claude's recommendation) | Structural checks block, value checks warn | — |
| D11 | Removed | Play-by-play was never meant for reconciliation | — |
| D12 | Closed (default) | node-cron, already in the scaffold | — |
| D13 | Deployment phase | Local MySQL 8.4 in Docker only for now; hosting research moved to `research/` | Deploy |
| D14 | Decided | No archiver in Phase 1 | — |
| D15 | Decided | League data, live tier and source health move to platform connections | — |
| D16 | Deployment phase | Not decided now | Deploy |

## D1 — Where the ETL spec lives

> **Your decision (2026-11-08): keep the spec with the ADRs, in the planning repo's `specs/`.**

**Recommendation: the planning repo's `specs/` folder.** It keeps the spec's 12 links to ADRs working and puts it under the automated reference check.

**The decision.** The spec is a living description that implements the ADRs. It can sit with the ADRs in `runpure-ff-planning`, or with the code in `runpure-ff-backend` under `docs/specs/`.

| Factor | Planning repo `specs/` | Backend repo `docs/specs/` | Evidence |
| --- | --- | --- | --- |
| Links to ADRs | 12 relative links (`../design/decisions/…`) resolve as written | All 12 break; each becomes a full GitHub URL | The spec's §0.1 table; relative links resolve only inside one repo (inference) |
| Automated check | `doc-check` already scans `specs/` for references to superseded ADRs | Not scanned unless the script is copied to the backend repo | `.claude/skills/doc-check/check.mjs` (scans `design/*.md` and `specs/`) |
| Matches the suite's own rule | Yes: the maintenance matrix lists the ETL spec under "Repo `specs/`" | Matches the PRD's older line, "lives in the code repository at `docs/specs/`" | [`governance/documentation-suite.md`](../../governance/documentation-suite.md) §3; PRD, Data ETL & storage tab |
| Next to the code it describes | No: a spec change and its code change are separate commits in separate repos | Yes: one commit can change both | [Google Cloud](https://docs.cloud.google.com/architecture/architecture-decision-records) advises storing ADRs "close to your application code"; [Write the Docs](https://writethedocs.org/guide/docs-as-code) treats docs with the same tools as code |
| Edits needed now | 1: the PRD's location line | 1: the documentation suite's matrix row, plus 12 links | Same sources as above |

**Why.** Proximity to code is the stronger argument in general, but here the spec's main job is to trace ADRs to implementation. Keeping it beside the ADRs keeps that tracing machine-checked. *Inference:* the backend repo will hold the spec's concrete counterpart anyway (`sql/`, `datasets.ts`), so code-level detail stays with the code.

**Quantified difference.** 12 links kept working instead of rewritten, 1 automated check kept instead of duplicated, and 1 line to edit (the PRD) instead of 13.

*Keep with ADRs*

## D2 — Which nflverse datasets Phase 1 loads

> **Your decision (2026-11-08): the seven datasets, plus play-by-play (D3) and current-season depth charts (ADR-0013), which nflverse publishes.** Practice-squad players are left out unless they play. Kickers, team defenses and individual defensive players are all included.
>
> What that means in the data. Kicking and individual defensive stats are already columns in weekly player stats (positions K, DB, DL and LB), and team defense comes from weekly team stats, so no extra dataset is needed. A practice-squad player is included once he has a weekly stats row; season rosters mark practice squad as status `DEV` (*inference* from the code; the profiled status values are now in the ETL spec's Appendix A, section A6). Including individual defensive players widens the Player explorer PRD, which lists QB, RB, WR, TE, K and team defense (PRD since updated to include DB, DL and LB).

**Recommendation: seven datasets — weekly player stats, weekly team stats, schedules, players, season rosters, injuries and snap counts.** Together they cover every Player explorer requirement for about 127 MB of CSV, against about 593 MB for everything.

**The decision.** The spec lists nine nflverse datasets. The [Player explorer PRD](../../prds/feature-player-explorer.md) requires: every active QB, RB, WR, TE, K and team defense with team, position, age, bye week and injury status; weekly stats for every week played; snap share, target share, and next opponent with its difficulty; a traded player's team shown per week.

| Dataset | Serves (PRD requirement) | CSV 2017–2026 | Recommend | Evidence |
| --- | --- | --- | --- | --- |
| Weekly player stats (`stats_player`) | Weekly stats and points for QB, RB, WR, TE and K; target share; per-week team and opponent | \~77 MB | Load | Header read 2026-11-08 has `team`, `opponent_team`, `target_share` and kicking columns |
| Weekly team stats (`stats_team`) | Team defense scoring (not in the spec's list until now) | \~2 MB (about 0.22 MB a season) | Load | [nflverse releases](https://github.com/nflverse/nflverse-data/releases): team stats "created with nflfastR::calculate\_stats()"; sizes measured 2026-11-08 |
| Schedules | Bye week, next opponent, scores (points allowed) | \~2 MB | Load | Measured 2026-11-06 |
| Players | Name, position, age (`birth_date`), `latest_team`, `status` | \~7 MB | Load | Header read 2026-11-08 |
| Season rosters | Which players were on a roster each season ("active") | \~10 MB | Load | Measured 2026-11-06 |
| Injuries | Injury status | \~7 MB | Load | Official report status per [nflreadr dictionary](https://cloud.r-project.org/web/packages/nflreadr/vignettes/dictionary_injuries.html) |
| Snap counts | Snap share | \~22 MB | Load | Measured 2026-11-06 |
| Weekly rosters | No requirement: a missing week is already a gap, and byes come from schedules | \~146 MB | Skip | PRD "missed weeks and byes shown as gaps" |
| Depth charts | No Phase 1 requirement | 71 MB (2026 so far) | Skip | PRD has no depth-chart column |
| Play-by-play | See D3 | \~100 MB (one season) | Skip (D3) | ADR-0013 |

**Why.** Every PRD column maps to one of the seven. Weekly team stats are the one addition: team defense is a Phase 1 position, and `stats_player` carries no team-defense lines. *Inference:* matchup difficulty can be computed by grouping `stats_player` by `opponent_team`, so no extra dataset is needed for it.

**Quantified difference.** About 127 MB of CSV instead of about 593 MB: 79% less to back-fill and store, which keeps the database small. Seven tables to design (D9) instead of ten. Two PRD open questions stay open and could add one dataset: whether practice-squad players are included, and whether kickers and defenses share the main table.

*I accept your reco. No practice sq**uad players should be included unless they play. *

*Idk how tables should be structured, but kickers and defend and defensive players data should be included.*

## D3 — What the current season's play-by-play is for

> **Your decision (2026-11-08): keep play-by-play, for the current season (ADR-0013), to enable analytics later.** The recommendation below was not taken. ADR-0013 stands as written, so no new ADR is needed.

**Recommendation: don't load play-by-play in Phase 1.** Nothing in the Player explorer PRD needs it, and the weekly stats you do load are already computed from it.

**The decision.** ADR-0013 caps play-by-play at the current season. It doesn't say what Phase 1 uses it for. The options are to skip it, load it for later features, or load it to cross-check weekly stats (D11).

| Factor | Skip in Phase 1 | Load the current season | Evidence |
| --- | --- | --- | --- |
| PRD columns it would serve | None: every column is covered by D2's seven datasets | Same columns; nothing new until a later feature asks for splits | [Player explorer PRD](../../prds/feature-player-explorer.md) column chooser |
| Relation to weekly stats | Weekly player and team stats are derived from play-by-play by nflverse | Loading both stores the same facts twice | [nflfastR `calculate_stats`](https://rdrr.io/cran/nflfastR/src/R/calculate_stats.R): "Compute various NFL stats based off nflverse Play-by-Play data" |
| Size | 0 MB | \~100 MB of CSV a season, about 50,000 rows | Measured 2026-11-06; [nflreadr README](https://cran.nics.utk.edu/cran/web/packages/nflreadr/readme/README.html) shows 2021 as 49,922 rows × 372 columns |
| Mapping work | 0 columns | 372 columns to type and map by hand (ADR-0010) | Same README |
| Later features | Load it then, for one season, in one run (ADR-0006 pieces are resumable) | Ready in advance | ADR-0013; *inference* on effort |

**Why.** Play-by-play is the biggest single dataset and the widest table. Its only Phase 1 use would be cross-checking stats that nflverse already computes from it, which D11 shows adds little. Loading it later costs one run, because only the current season is ever kept.

**Quantified difference.** About 100 MB less storage and 372 fewer columns to map in Phase 1. Since ADR-0013 says "keep" the current season, skipping it entirely should be recorded as a new ADR that narrows ADR-0013, rather than left implicit.

*Keep play by play. It’**s essential for enabling robust analytics later. *

## D4 — The Sleeper player list in Phase 1

> **Already decided (2026-11-06), not an open decision:** you set Sleeper aside to focus on nflverse. The page below is kept for reference only.

**Recommendation: leave Sleeper out of Phase 1, as you already directed, and take injury status from nflverse.** When Sleeper comes back, store one row per player per change, not a full copy of every pull.

**The decision.** ADR-0004 keeps a dated copy of every Sleeper player-list pull. You set Sleeper aside to focus on nflverse. What's open is whether anything in Phase 1 still needs it, and how its copies are stored when it returns.

| Factor | Exclude now; nflverse injuries | Include; full copy per pull | Include; one row per change | Evidence |
| --- | --- | --- | --- | --- |
| Injury status for the PRD | Official weekly report status | Sleeper's daily `injury_status` and `practice_participation` | Same as full copy | [nflreadr load\_injuries](https://search.r-project.org/CRAN/refmans/nflreadr/html/load_injuries.html) (weekly reports since 2009); [Sleeper API docs](https://docs.sleeper.com/) sample player |
| Pull size and frequency | 0 | About 5 MB, at most once a day | Same pull; only changed players kept | [Sleeper API docs](https://docs.sleeper.com/): "average size of this query is 5MB", once a day at most |
| Storage a year | 0 | About 1.8 GB uncompressed (5 MB × 365) | Not measured; depends on how many players change a day | Arithmetic from Sleeper's figure; MySQL JSON takes about the same space as `LONGTEXT` ([MySQL 8.4 JSON](https://dev.mysql.com/doc/refman/8.4/en/json.html)) |
| Can you recreate a missed day | Yes (nflverse keeps history) | No | No | Sleeper serves only the current list (*inference* from the docs; no dated endpoint is listed) |
| Fits ADR-0004 as written | Dormant until Sleeper returns | Yes | Reconstructs every pull, but stores changes, not copies: needs a narrowing ADR | ADR-0004; [Kimball Type 2](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-2/): "add a new row … with the updated attribute values" |
| Terms | n/a | Free only for non-commercial use | Same | [Sleeper API docs](https://docs.sleeper.com/): "free to use for non-commercial purposes" |

**Why.** Phase 1 has no leagues connected, so the only Sleeper field the PRD uses is injury status, and nflverse's injuries dataset (already in D2) covers it from official reports. The cost is resolution: weekly report status instead of Sleeper's daily practice participation. When Sleeper returns, per-change rows keep every pull reconstructable without storing roughly 3,000 unchanged players a day. *Inference:* most players don't change on a given day.

**Quantified difference.** 0 MB and no extra job in Phase 1, against about 1.8 GB a year for full daily copies. The trade-off is that every day Sleeper isn't pulled is a day of Sleeper statuses you can't get back. If daily practice participation matters before leagues arrive, that's the reason to include it now. Sleeper's non-commercial term matters if Runpure FF is ever sold; it doesn't matter for personal use.

*Ok….didnt I already agree to this? *

## D5 — Ledger grain

> **Your decision (2026-11-08): one ledger piece per dataset × season, the more efficient method.**
>
> What a ledger piece is: one unit of work the pipeline tracks, such as "weekly player stats, 2024". The `ingest_ledger` table keeps one row per piece saying whether it loaded, when, and from which version of the source file. That lets a crashed run resume where it stopped and lets later runs skip files that haven't changed. No data is lost with either grain: both load exactly the same rows, and only the bookkeeping differs. ADR-0006 describes pieces as source × season × week, so this narrows its wording.

**Recommendation: one ledger piece per dataset × season, as the scaffold does.** The source publishes one file per season, so a per-week piece adds rows without saving any download.

**The decision.** ADR-0006 describes pieces as "source × season × week". The backend scaffold records one piece per dataset and season (season 0 for single files).

| Factor | Dataset × season | Dataset × season × week | Evidence |
| --- | --- | --- | --- |
| Matches how the source publishes | Yes: one file per season, e.g. `stats_player_week_2025.csv` | No: a week isn't a separate file | [nflverse-data releases](https://github.com/nflverse/nflverse-data/releases); paths verified 2026-11-06 |
| Download per incremental run | One file per dataset | The same file, then split by week | *Inference*: no per-week file exists |
| Change detection | One version check per file | Still one check per file; a changed file doesn't say which weeks changed | Spec §4.2 (ETag / Last-Modified per file) |
| Ledger rows, 7 datasets, 2017–2026 | \~62 | \~1,100 (5 seasonal datasets × 10 seasons × \~22 weeks) | Arithmetic from D2 |
| Rows replaced per load | A whole season (\~6,000 weekly stat rows) | One week (\~300) | *Inference* from the 2021 file's 18,969 rows over 3 types; [nflreadr README](https://cran.nics.utk.edu/cran/web/packages/nflreadr/readme/README.html) |
| Fits ADR-0006 wording | Narrows it (needs an ADR note) | Matches it | ADR-0006 |

**Why.** Resume and retry work at the level of a download. A season-sized transaction of a few thousand rows is small for MySQL. Per-week pieces would only pay off if a source published per-week files, which nflverse doesn't.

**Quantified difference.** About 62 ledger rows instead of about 1,100, with identical downloads. It deviates from ADR-0006's wording, so record it as a short ADR that narrows ADR-0006.

*I don’t even know what this ledger piece is. If no data is lost, then use the more efficient method…*

## D6 — The rule for the current season

> **Your decision (2026-11-08): focus on today's date and the season we're currently in.** Recorded as: the current season is the NFL season in progress on today's date (2026 now). Between seasons, each dataset switches when nflverse starts publishing the new season: rosters on March 15; stats, snap counts, injuries, depth charts and play-by-play on the Wednesday after Labor Day. `CURRENT_SEASON` overrides it. The switch dates are Claude's call on the detail; change them if you want one date.

**Recommendation: copy nflreadr's two dates.** Roster-type files (season rosters) switch to the new season on March 15. Stats, snap counts and injuries switch on the Wednesday after Labor Day. Keep the `CURRENT_SEASON` override.

**The decision.** Incremental runs read only the current season's files (ADR-0006). The scaffold's placeholder switches every dataset in September, so a new season's rosters published in spring aren't read until September.

| Factor | One switch in September (scaffold) | Two dates, as nflreadr | Evidence |
| --- | --- | --- | --- |
| Matches the source's own rule | No | Yes: rosters "after March 15th"; other data on the season-opener week | [nflreadr most\_recent\_season](https://www.rdocumentation.org/packages/nflreadr/versions/1.4.1/topics/most_recent_season) |
| Opener date in 2026 | n/a | nflreadr moved the switch to the Wednesday after Labor Day because the 2026 season kicked off on a Wednesday | [nflreadr NEWS](https://mirror.uned.ac.cr/cran/web/packages/nflreadr/news/news.html) |
| New-season rosters seen | September | March 15 | Same sources |
| Requests for files that don't exist yet | From September 1 until the opener (stats files 404) | None | 2026: Labor Day was September 7, so September 1–8 (*inference* from the calendar) |
| Code | One date | Two dates and a per-dataset flag in `datasets.ts` | Scaffold `season.ts`; *inference* on effort |

**Why.** nflverse publishes on these two schedules, so following its rule means incremental runs read exactly the files it is updating. The one-date rule is wrong in two directions: too late for rosters and too early for stats.

**Quantified difference.** New-season rosters arrive about 5½ months earlier (March 15 instead of September), and about 8 days of 404s on stats files at the start of each season go away. One extra date and a flag per dataset in the registry. The opener date can move again, as it did in 2026, so the override stays.

## D7 — Scheduled run times

> **Your decision (2026-11-08): one run a day at 06:00 Eastern.**

**Recommendation: one run a day at 06:00 Eastern, the scaffold's default.** No extra runs after games: nflverse doesn't publish new player stats until its nightly build, so a run at 11 p.m. on game night finds nothing new.

**The decision.** v1.3 and the earlier version of ADR-0008 described a daily run plus runs after Thursday, Sunday and Monday games. The PRD asks for data "never more than 24 h old" and updated soon after those games.

| Factor | Daily 06:00 ET | Daily plus game-night runs | Evidence |
| --- | --- | --- | --- |
| When nflverse publishes player stats | Nightly, 3–5 a.m. ET; the 06:00 run picks them up | Game-night runs come before the build, so they get nothing new | [nflverse data schedule](https://rdrr.io/github/nflverse/nflreadr/f/vignettes/articles/nflverse_data_schedule.Rmd) (page built November 2024) |
| Snap counts | Built at 00, 06, 12 and 18 UTC; the 06:00 ET run (10–11 UTC) picks up the 06 UTC build (*inference*) | No better | Same page |
| Schedules and scores | Every 5 minutes at the source; read once a day | Read a few more times a week | Same page |
| Stat corrections | Re-read daily, so Thursday corrections arrive Friday morning | Same | Corrections land by Thursday: [Yahoo help](https://help.yahoo.com/kb/SLN6137.html); nflfastR recommends rebuilding the current season every Thursday ([nflfastR NEWS](https://ftp.eenet.ee/pub/cran/web/packages/nflfastR/news/news.html)) |
| Meets the PRD's 24 h | Yes: a Sunday-night game ending near midnight is loaded by 06:00 Monday | Yes | *Inference* from the publish times above |
| Runs a week | 7 | 10 | Count |

**Why.** The pipeline can't be fresher than its source, and the source updates player stats once a night. A single run timed just after that build gets everything the extra runs would, and stat corrections are caught by the same daily run.

**Quantified difference.** 7 runs a week instead of 10, with the same freshness: game stats loaded about 6 hours after a late game ends, well inside 24 hours. Snap counts can lag the source's latest build by most of a day; if that matters, a second run at 15:00 ET (19–20 UTC) catches the 18 UTC build. The nflverse schedule page dates from November 2024; check its current times before relying on 06:00.

## D8 — How a failed run alerts

> **Your decision (2026-11-08): out of scope.** Monitoring and alerting get their own PRD in a later phase. Recorded in the decision log's open list ([`design/architecture-decisions.md`](../architecture-decisions.md)), which is reviewed when the project moves on. The page below is kept for reference.

**Recommendation: a free Healthchecks.io check that each successful run pings.** If a ping doesn't arrive in time, it emails you. This catches the failure an in-process alert can't: the server is down and nothing runs at all.

**The decision.** Today a failure is visible only in `job_run` and the logs, so you find out only by looking.

| Factor | `job_run` only (today) | Push or chat message from the server on failure | Dead-man's switch (Healthchecks.io) | Evidence |
| --- | --- | --- | --- | --- |
| A run fails with an error | Silent | Alerts | Alerts (no success ping) | *Inference* from how each works |
| The server is down or the scheduler stops | Silent | Silent: nothing is running to send it | Alerts after the grace time | [Healthchecks.io docs](https://healthchecks.io/docs): a check goes down when the grace time passes with no ping |
| Cost | $0 | $0 (ntfy.sh with no account; Discord or Slack webhook) | $0 for up to 20 jobs | [Healthchecks.io pricing](https://healthchecks.io/pricing); [ntfy terms](https://docs.ntfy.sh/terms/); [Discord webhooks](https://docs.discord.com/developers/resources/webhook) |
| Reliability caveat | n/a | ntfy.sh promises no uptime | A check never pinged sits in "New"; whether that alerts is unverified, so ping once at setup | Same sources |
| Code | 0 | One HTTP call in the failure path | One HTTP call after a successful run | *Inference* |
| Free alternatives | n/a | n/a | Cronitor (5 monitors), Better Stack (10) | [Cronitor pricing](https://cronitor.io/pricing); [Better Stack pricing](https://betterstack.com/pricing.md) |

**Why.** The pipeline runs once a day unattended, so the costly failure is the quiet one: the process stopped, and stale data is served for days before anyone notices. Only an outside check that expects a ping can see that. One success ping covers both cases, because a failed run doesn't ping either.

**Quantified difference.** $0 and one HTTP call. With a 24-hour period and a 2-hour grace, you hear about any missed or failed run within 26 hours, instead of whenever you next open `job_run`. Adding an ntfy or Discord message on failure gets the error text to you within minutes, at the same cost.

*Out of scope: monitoring and alerts should have its own PRD in a later phase. Record this somewhere which we would naturally review again when moving on at later time *

## D9 — Table design for each dataset

> **Moved 2026-11-08 at your direction:** the schema now lives in the ETL implementation spec, §7.2 (tables, rules, profiling findings, size), with the full column-by-column data dictionary as its Appendix A ([`specs/ff-data-etl-storage-spec-data-dictionary.md`](../../specs/ff-data-etl-storage-spec-data-dictionary.md); five part files until 2026-11-09). Depth charts were added there. D9a, your decision (2026-11-08): load nflverse's team file as a team table.

*This needs to be recorded with sql best practice for relational db schema. You need to perform a thorough search with authoritative findin**gs for the object schema and **data ontology mappi**ng for o**ptimal storage and retrieval. *

*We need to start by confirming every data point from all sources that we’**re ingesting, with the rele**vant* *data type. ** *

## D10 — Which checks block a load

> **Closed by Claude's recommendation (2026-11-08), because you didn't know: structural checks block a load, value checks only warn.** Change it any time; the checks are listed in the ETL spec §8.

**Recommendation: structural checks block; value checks warn.** A load is blocked if the header doesn't match the mapping, a natural key repeats or is empty, or the row count falls sharply against the same piece's last load. Out-of-range values only warn.

**The decision.** The staging-then-swap load means a blocking check leaves yesterday's good data in place. A warning swaps the new data in and records the problem.

| Factor | Every check blocks | Structural block, value warn | Every check warns | Evidence |
| --- | --- | --- | --- | --- |
| Tool defaults | n/a | dbt and Great Expectations both default to blocking and let a check be marked as a warning | n/a | [dbt severity](https://docs.getdbt.com/reference/resource-configs/severity.md) (default `error`); [GX Cloud](https://docs.greatexpectations.io/docs/cloud/expectations/manage_expectations/) (default critical) |
| Graded thresholds | n/a | Supported: warn above 10 failing rows, block above 1,000 | n/a | dbt `warn_if` and `error_if` example, same page |
| A malformed file | Blocked | Blocked | Replaces good data | Spec §5 staging and swap |
| One odd value (e.g. a stat correction) | Blocks the whole season's load | Loads, with a warning | Loads | *Inference* |
| Starter checks | n/a | `unique`, `not_null`, `accepted_values`, `relationships` | n/a | [dbt data tests](https://docs.getdbt.com/docs/build/data-tests) |

**Why.** Structural failures mean the file can't be trusted at all, so serving yesterday's data is better. Value checks fail on real football too: a stat correction or an unusual game shouldn't hold back an entire season. Warnings go to `job_run` and, with D8, to you.

**Quantified difference.** A bad file costs at most one day of staleness (until the next run) instead of up to a day of wrong data served. A single odd value costs nothing instead of a day's delay for every row in that season, about 6,000 weekly stat rows.

## D11 — Reconciling play-by-play against weekly stats

> **Removed (2026-11-08, owner):** see your note below; recorded as D11 in the ETL spec §0.2.

*This is false inference - play by play was never intended for reconciliation. That step or decision was likely inf**erred and should be removed completely*

## D12 — Scheduler library

> **Closed by default (2026-11-08): node-cron, which the scaffold already uses.** Change it any time.

**Recommendation: node-cron, as the scaffold already uses.** It is maintained, ships its own TypeScript types, and handles time zones and overlapping runs. node-schedule hasn't been released since January 2023.

**The decision.** The scaffold uses node-cron. The earlier version of ADR-0008 named node-schedule. ADR-0008 now names no scheduler library, so choosing node-cron contradicts no accepted ADR.

| Factor | node-cron | node-schedule | croner (for reference) | Evidence |
| --- | --- | --- | --- | --- |
| Latest release | 4.2.1 or 4.6.0 (sources disagree); last publish about 3 months ago | 2.1.1, January 2023 | 11.0.0, October 26, 2026 | [npm node-cron](https://npmjs.com/package/node-cron); [jsdelivr 4.6.0](https://cdn.jsdelivr.net/npm/node-cron@4.6.0/README.md); [npm-compare](https://npm-compare.com/node-cron); [depscope](https://depscope.dev/pkg/npm/node-schedule); [releasealert](https://releasealert.dev/github/Hexagon/croner) |
| Open issues | 9 | 170 | 1 | [npm-compare](https://npm-compare.com/node-cron); [ecosyste.ms](https://awesome.ecosyste.ms/api/v1/projects/github.com%2Fnode-schedule%2Fnode-schedule); [croner GitHub](https://github.com/Hexagon/croner) |
| Weekly downloads | About 1.6 million | About 1.6 million | Unverified | npm pages above |
| TypeScript types | Bundled | Separate `@types/node-schedule` | Bundled | Same |
| Time zones and daylight saving | Wall-clock time in a named zone; a repeated hour runs once | Supported (`tz`) | Supported | node-cron README; node-schedule npm page |
| Skip a run if the last is still going | `noOverlap` | Not mentioned | `protect` | [nodecron.com](https://www.nodecron.com/prevent-overlapping-cron-jobs.html); croner README |
| Licence | ISC | MIT | MIT | Package pages |

**Why.** Download counts are equal, so the difference is maintenance: node-cron is active and node-schedule has 170 open issues and no release in almost four years. The scaffold's `GET_LOCK` already prevents overlapping runs, so `noOverlap` is a second guard, not a requirement.

**Quantified difference.** No code change (the scaffold already uses node-cron), one fewer dependency for types, and a library released in the last few months instead of one about 3 years and 10 months old. Run `npm view node-cron time` to confirm the current version, since the sources disagree.

## D13 — Local MySQL setup

> **Your decision (2026-11-08): hosting is a deployment-phase decision.** For now the only requirement is that local MySQL and development work before deployment. The hosting options researched are kept in [`research/mysql-hosting-options-research-2026-11-08.md`](../../research/mysql-hosting-options-research-2026-11-08.md) only.

**What local needs.** The backend scaffold already runs Docker's `mysql:lts` image (MySQL 8.4) from `docker-compose.yml`. Local development works when: the container starts; `sql/0001_pipeline_tables.sql` and each table's `CREATE TABLE` (D9) apply cleanly in Workbench; `npm run headers` reads every dataset; and `npm run ingest -- --dataset <name>` loads one season of each. The host chosen later has to run the same major version, 8.4, or the local image changes with it.

*Again- hosting decisions are a later phase. We just need to ensure local mysql setup and development works before deployment. Anything you listed for hosting options needs to be stored in research ONLY and ne removed from any planning docs*

## D14 — The snapshot archiver

> **Your decision (2026-11-08): agreed, don't run the archiver in Phase 1.**

**Recommendation: don't run the archiver in Phase 1; when it starts, store snapshots as MySQL rows, as ADR-0005 does for other dated copies.** Most of what v1.3 planned to archive can now be recovered or bought later. What can't be recovered has no Phase 1 consumer.

**The decision.** v1.3 planned twice-weekly point-in-time snapshots of odds and player props, ADP, injuries, depth charts and rankings, stored as files in the bucket that ADR-0005 removed.

| What v1.3 archived | Recoverable later? | Evidence |
| --- | --- | --- |
| Game odds and player props | Yes, for a fee: game lines from June 2020, props from May 2023, every 5–10 minutes | [The Odds API historical data](https://the-odds-api.com/historical-odds-data/) (paid plans only; 10 credits per region per market) |
| Rankings | Yes: nflverse keeps weekly archives since 2019; 2012–2020 weekly position ranks are also in ffsimulator | [nflreadr NEWS](https://cloud.r-project.org/web/packages/nflreadr/news/news.html); [load\_ff\_rankings](https://search.r-project.org/CRAN/refmans/nflreadr/html/load_ff_rankings.html); [ffsimulator](https://rdrr.io/github/ffverse/ffsimulator/man/fp_rankings_history_week.html) |
| Depth charts | Yes from 2025: nflverse keeps them by date, including the preseason; snapshot frequency unverified | [nflreadr NEWS](https://cloud.r-project.org/web/packages/nflreadr/news/news.html); [depth chart dictionary](https://ftp.fau.de/cran/web/packages/nflreadr/vignettes/dictionary_depth_charts.html) |
| Injuries | Official weekly reports: yes, since 2009. Sleeper's daily statuses: no | [load\_injuries](https://search.r-project.org/CRAN/refmans/nflreadr/html/load_injuries.html); D4 |
| ADP | Partly: past-season ADP pages exist; week-by-week ADP and bulk history only on FantasyPros' commercial tier | [FantasyPros API](https://www.fantasypros.com/api-data/); [2023 ADP page](https://www.fantasypros.com/nfl/adp/overall.php?year=2023) |

**Why.** The archiver existed because v1.3 assumed this data was gone once a week passed. For rankings, depth charts and official injuries that's no longer true, and odds can be bought back. The genuinely unrecoverable pieces are Sleeper's daily statuses and in-season ADP, and Phase 1 has no screen that uses either. Storing snapshots as MySQL rows when the archiver starts keeps to ADR-0005 with no new store.

**Quantified difference.** One job and its tables not built in Phase 1. The cost is concrete: every week it doesn't run loses that week's in-season ADP and Sleeper statuses for good, and makes odds a paid back-fill rather than a free pull. If a model will need in-season ADP history, that's the reason to start the archiver now.

*Agreed-don’t run archives *

## D15 — Later-phase items: this spec or the backend's platform connections

> **Your decision (2026-11-08): agreed.** League data, the live game-day tier and source health move to platform connections; odds, rankings and the snapshot archiver stay in the ETL spec.

**Recommendation: move league data, the live game-day tier and source health to a platform-connections spec. Keep odds, rankings and the snapshot archiver here.** The split follows what each item needs: user credentials and always-on polling, or a scheduled batch pull into MySQL.

**The decision.** Spec §11 keeps six later-phase items from v1.1–v1.3. v1.3 already noted that league extract and platform connections describe the same work.

| Item | Needs user credentials | Runs as | Recommend | Evidence |
| --- | --- | --- | --- | --- |
| League data (Sleeper, Yahoo, ESPN) | Yahoo OAuth 2.0; ESPN `SWID` and `espn_s2` cookies | Per-user pulls | Move | [Yahoo developer](https://sports.yahoo.com/developer/); [ESPN v3 notes](https://stmorse.github.io/journal/espn-fantasy-v3.html) (community, not official) |
| Live game-day tier | No | Always-on polling at least every 60 s | Move | Spec §11.2; ETL PRD freshness targets |
| Source health | Per connected platform | Status table | Move | Spec §11.6: belongs with platform connections |
| Odds | One API key | Scheduled batch | Keep | Spec §11.3 |
| Rankings | None (nflverse) or one key (FantasyPros) | Scheduled batch | Keep | Spec §11.4 |
| Snapshot archiver | None | Scheduled batch | Keep | Spec §11.5; D14 |

**Why.** The three items that move share concerns this spec doesn't have: storing credentials per user, refreshing tokens, and running continuously. The three that stay work exactly like the nflverse pipeline: a scheduled pull, a staging table, and a swap. Both specs describe the same Express backend (ADR-0008), so nothing about deployment changes.

**Quantified difference.** Three of six later-phase sections leave this spec, and none of them touches Phase 1. There's no honest number beyond that; the gain is that each spec describes one kind of job.

*Agreed*

## D16 — Backup and recovery

> **Your decision (2026-11-08): a deployment-phase decision.** Not decided now. The host-specific backup facts are in [`research/mysql-hosting-options-research-2026-11-08.md`](../../research/mysql-hosting-options-research-2026-11-08.md).

*Again-this is a deployment phase decision *


## Q6 — API style: REST, tRPC or GraphQL

> **Decided 2026-11-09: GraphQL** (owner). Recorded in ADR-0017; ADR-0016 revised in place so the contract is the GraphQL schema, written code-first and committed as `schema.graphql`, with frontend types from GraphQL Code Generator. Server stack decided the same day, accepting Claude's recommendations: GraphQL Yoga v6 (an Express 5 spike comes first, with Apollo Server 5 as the fallback), code-first with Pothos, trusted documents only, polling for the live board; the operator endpoints become the GraphQL fields `pipelineRuns` and `ingestLedger`. Full sourced research: [`research/api-style-rest-trpc-graphql-research-2026-11-08.md`](../../research/api-style-rest-trpc-graphql-research-2026-11-08.md). The comparison below is kept as it stood before the decision.

**Correction.** The first version of this page called the API "a handful of read-only endpoints over fixed tables". That came from Phase 1 alone and wasn't checked against the PRDs. The inventory below replaces it.

### What the API has to serve, from the PRDs

| Feature | Phase | Reads | Writes | Live | Notes |
| --- | --- | --- | --- | --- | --- |
| Player explorer | 1 | Every player at QB, RB, WR, TE, K, DB, DL, LB and team defense: about 1,250 rows (1,216 active players on nflverse's 2025 season rosters, plus 32 defenses). Aggregates under 3 scoring formats plus 2 toggles (tight end premium, 6-point passing touchdowns) and 3 ranges; 13 choosable columns; week-by-week player detail; compare up to 4 players | Remembered settings; saved views (should-have) | — | Points "recalculate instantly" on a scoring change: either the browser rescores weekly stat lines (2025 alone has 19,422 weekly rows of 150 columns, 8.7 MB as CSV), or the API returns pre-scored aggregates per option |
| NFL scores and schedule | 1 | Games by week, scores, teams | — | — | — |
| Account | 1 | The signed-in user | A user record on first sign-in (ADR-0015) | — | — |
| Operator | 1 | Run history, ledger | — | — | Already in the scaffold |
| Platform connections | Later | Connections and their health, leagues, settings and what each allows, teams, rosters, matchups, transactions, waiver state | Connect Sleeper, Yahoo and ESPN; disconnect | Every 60 s during games | Yahoo's sign-in needs a browser redirect and a callback URL |
| Game-day lineup center | Later | Problems across every league, suggested swaps, locked players | Make a swap, then re-read the platform to confirm | Live board every 60 s | Combines several leagues on one screen |
| Waivers & trades | Later | Team needs, free-agent finder under each league's scoring, waiver calendar, trade evaluator on a proposed trade, bid range, drop suggestions, trending | Submit claims and drops | — | The evaluator takes a proposed trade as input |
| Weekly review & analytics | Later | Standings and power, heatmap in 4 modes, positional strength, team and player tables with a column chooser, comparison, every-league table, scoring what-if | — | — | Spreadsheet downloads (should-have) |

**Size (*inference* from the table):** Phase 1 needs about 10–13 REST endpoints, and the whole product about 45–55. In GraphQL the same scope is one endpoint with about 25–35 top-level query and mutation fields over one shared graph (player, game, team, league, fantasy team, roster, matchup), plus one subscription if the live board is pushed instead of polled.

**What that changes:** the API isn't read-only (per-user writes from Phase 1, lineup and waiver changes later); its responses aren't fixed (column choosers, ranges and scoring options on four features); it has a live screen; and several screens combine leagues. Those are the conditions GraphQL was built for, so it gets a full look below.

### GraphQL in detail

**How it works.** One endpoint serves a typed schema. Each request names exactly the fields it wants, and the server runs a resolver for each field. Queries can be sent by POST or GET under the GraphQL over HTTP specification, which is still a draft ([graphql.org: Serving over HTTP](https://graphql.org/learn/serving-over-http)).

**Where it is strong for this app**

- **The client picks the fields.** A column chooser becomes a field selection, and one request can fill a screen that spans players, teams and schedules.
- **One graph for every feature.** The Player explorer's table is the base for the tables in Waivers & trades and Weekly review (PRDs), so one `Player` type serves all three.
- **Arguments on fields** fit scoring and ranges, e.g. `points(scoring: HALF_PPR, range: LAST_5)` (*illustration*).
- **Types end to end.** GraphQL Code Generator types every query in the frontend from the schema ([codegen](https://www.the-guild.dev/graphql/codegen/docs/guides/react)); Pothos builds the schema in TypeScript with inferred types and no server-side codegen ([Pothos](https://pothos-graphql.dev/)).
- **Live data.** Subscriptions are part of the schema; GraphQL Yoga serves them over Server-Sent Events with no extra package ([Yoga subscriptions](https://www.the-guild.dev/graphql/yoga-server/examples/graphql-ws)).
- **Evolution instead of versions.** Fields are added and old ones marked `@deprecated` in one schema, rather than v1 and v2 ([graphql.org: schema change management](https://www.graphql.org/learn/governance-versioning/)). That meets guardrail row 10 in a different way.

**Where it costs**

- **The N+1 problem.** A resolver per field means one database call per item unless calls are batched; DataLoader is the standard fix ([graphql-js: N+1 and DataLoader](https://www.graphql-js.org/docs/n1-dataloader/)). With 1,250 players and their weekly stats, batching has to be designed in from the start.
- **Security work REST doesn't need.** OWASP recommends depth limits, amount limits, pagination and rate limiting, and notes that depth and amount limits usually need custom code ([OWASP GraphQL Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)). For a first-party app, "trusted documents" (the server runs only the app's own pre-registered queries) remove most of this ([trusted documents](https://blog-portfolio.pages.dev/blog/graphql-myths)).
- **HTTP caching takes setup.** POST responses aren't cached by default; GET for queries, especially with hashed query documents, restores HTTP and CDN caching ([graphql.org: performance](https://graphql.org/learn/performance)).
- **Errors arrive as HTTP 200.** A failed field comes back as `null` with an `errors` array, possibly beside partial data, so monitoring has to read the body ([Apollo Client: error handling](https://apollographql.com/docs/react/data/error-handling)).
- **It replaces the OpenAPI contract.** The GraphQL schema becomes the contract, so ADR-0016 would be revised. Yoga's Sofa plugin can also publish REST endpoints with a Swagger page generated from the schema ([Yoga v3 announcement](https://the-guild.dev/blog/graphql-yoga-v3)).
- **Some plain routes remain** (*inference*): Yahoo's sign-in callback, server-side file downloads and the operator endpoints are ordinary HTTP routes beside the GraphQL endpoint.
- **More moving parts:** a server (Yoga or Apollo Server), a schema builder, a client, codegen, DataLoader and query limits, all new to learn for one developer.

### Comparison

| Factor | REST with JSON | tRPC | GraphQL | Notes |
| --- | --- | --- | --- | --- |
| Size of the full scope (*inference*) | About 45–55 routes | About 45–55 procedures in one router | One endpoint, about 25–35 top-level fields | From the inventory above |
| Column choosers on four features | Fixed responses, or a `fields` parameter each endpoint implements (the JSON:API "sparse fieldsets" convention, e.g. `?fields[stores]=name,locale` in [Spryker's docs](https://docs.spryker.com/docs/dg/dev/architecture/api-platform/sparse-fieldsets)) | Inputs per procedure; no field selection | Built in | The main pull toward GraphQL |
| Screens that combine leagues | One purpose-built endpoint per screen | One procedure per screen | One query can combine leagues, teams and players | Game-day problem list, every-league table |
| Writes (settings, swaps, claims) | POST, PUT, DELETE with status codes | Mutation procedures | Mutations | All three fine |
| Live board every 60 s | Polling, or a Server-Sent Events route | Subscriptions over SSE in v11 ([summary](https://dev.to/0012303/trpc-v11-has-a-free-api-that-most-developers-dont-know-about-4ecl)) | Subscriptions; Yoga serves them over SSE | Polling every 60 s works with all three (*inference*) |
| Contract (ADR-0016) | OpenAPI, native | OpenAPI through the alpha `@trpc/openapi` ([release notes](https://releasebot.io/updates/trpc)) or [trpc-to-openapi](https://github.com/mcampa/trpc-to-openapi) | The GraphQL schema; OpenAPI only for Sofa-generated REST | GraphQL or tRPC means revising ADR-0016 |
| Frontend types, two repos | [openapi-typescript](https://openapi-ts.dev/introduction) from the OpenAPI file | The router's types shared through a package | GraphQL Code Generator from the schema and the app's queries | — |
| Server-side types | Hand-written, kept in step with OpenAPI | Inferred | Inferred with Pothos | — |
| Database access | One hand-written query per endpoint (ADR-0010) | Same | Resolvers per field, batched with DataLoader | REST keeps the hand-SQL model simplest |
| Security hardening | Per-route auth and rate limits | Same | Plus depth and cost limits, or trusted documents | — |
| HTTP caching | GET responses cache by default | Queries can use GET (*inference*) | GET plus persisted documents | Data changes once a day (D7) |
| Errors | HTTP status codes | tRPC error codes mapped to HTTP | 200 with an `errors` array | — |
| Versioning (guardrail row 10) | Path or header versions | No standard convention | Schema evolution and `@deprecated` | — |
| Plain HTTP routes (OAuth callback, downloads) | Native | Separate Express routes | Separate Express routes | — |
| New pieces to learn | OpenAPI file, openapi-typescript | tRPC server and client, a shared types package | Yoga or Apollo, Pothos, codegen, a client, DataLoader, limits | One developer |
| Industry use | 93% of teams use REST | — | 33% use GraphQL | Postman's 2025 State of the API report, as summarized by [DigitalCxO](https://digitalcxo.com/?p=23397) |

**REST with JSON**

- Pros: matches the OpenAPI decision and the scaffold's routes, controllers and services; one hand-written query per endpoint; status codes, caching and plain routes work as usual; fewest new pieces.
- Cons: about 45–55 endpoints by the end; field selection has to be built per endpoint; cross-league screens each need their own endpoint; frontend types are regenerated whenever the OpenAPI file changes.

**tRPC**

- Pros: end-to-end types with little code per procedure; SSE subscriptions.
- Cons: two repos need a shared types package; no field selection; OpenAPI only through an alpha or community package; typed calls only from TypeScript.

**GraphQL**

- Pros: field selection fits the column choosers; one graph serves all four features; cross-league screens are single queries; typed schema with mature codegen; subscriptions for the live board; no version juggling.
- Cons: N+1 batching and query limits are extra design work; 200-with-errors monitoring; replaces the OpenAPI contract (ADR-0016 revised); still needs a few plain routes; the most new pieces.

**Where it lands (*inference*).** tRPC is the weakest fit: two repos, no field selection, and the OpenAPI decision all work against it. REST and GraphQL are both sound. REST is less work for Phase 1 and keeps ADR-0016 as decided. GraphQL is less work for the league features the PRDs plan next, where configurable columns and cross-league screens multiply REST endpoints. If you're building past Phase 1, the lean is GraphQL (Yoga, Pothos, trusted documents, DataLoader); if Phase 1 may be the end state, REST. This must be decided before the Phase 1 endpoints are built (ETL spec §13, step 6).

**Recorded from your answers (2026-11-08)**

- **Contract:** the GraphQL schema, committed in the backend repo; the frontend's types are generated from it (ADR-0016, revised 2026-11-09; first version was an OpenAPI document).
- **Frontend to API:** the browser calls the Express API directly, so the backend is publicly reachable and allows the frontend's origin (CORS) (ADR-0014).
- **Sign-in:** Firebase Auth. The browser signs in with Firebase, sends the ID token with each request, and the API verifies it with the Admin SDK (ADR-0015).
- **Interfaces (Q5):** the five you confirmed. *Claude's addition, from the sign-in choice:* the browser to Firebase Auth, and the API to Firebase for token checks.

## Evidence gaps

These were looked for and couldn't be confirmed. Each affects the page named.

- **nflverse publish times (D7):** the schedule page was built in November 2024. Current times are unconfirmed.
- **ETag and Last-Modified on release files (D5, spec §4.2):** not verified; the network proxy failed during checks.
- **MySQL size (D2, D9):** every in-database size is estimated from CSV size and column types, not measured. Load one season and measure before relying on it.
- **node-cron version (D12):** npm shows 4.2.1 and other sources show 4.6.0. Several package figures come from third-party mirrors because npm was blocked.
- **Healthchecks.io "New" state (D8):** whether a never-pinged check alerts is unverified.
- **nflverse depth-chart snapshots (D14):** how often the dated copies are taken is unverified.
- **Sleeper fields (D4):** `injury_body_part`, `injury_notes` and `news_updated` aren't in the docs' sample, and the live endpoint couldn't be fetched.
- **Week-by-week ADP history (D14):** whether FantasyPros' past-season pages hold weekly ADP or only a final snapshot is unverified.
- **Stat-correction timing (D7):** from Yahoo's help page and NFL.com's corrections page; the NFL publishes no fixed deadline.
