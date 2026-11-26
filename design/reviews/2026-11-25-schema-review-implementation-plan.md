# Implementation plan — schema principles review decisions D1–D8 (2026-11-25)

**Status:** Draft, written by Claude from the owner's decisions. The plan, and every build detail marked *(build detail)*, is Proposed until the owner approves it; the decisions themselves are the owner's.
**Implements:** [schema principles review](2026-11-24-schema-principles-review.md) §5.1, decisions D1–D8 (owner, 2026-11-23 to 2026-11-25).
**Database change:** [`2026-11-24-schema-principles-review-migration.sql`](2026-11-24-schema-principles-review-migration.sql), copied into the backend as `sql/0015_schema_review.sql`.
**Not in scope (open in the review §5.2):** O5 fact-table load method, O6 `created_at`/`updated_at`, O8 per-column `NOT NULL`, O10 small fixes (renames, database charset script, explicit `ON DELETE RESTRICT`, strict `sql_mode`, confirming the ledger write in the swap transaction).
**Backend state checked:** working tree of `runpure-ff-backend` on 2026-11-25, including the uncommitted run-lock removal. File and line references in §8 are to that tree.

---

## 1. What changes

| Decision | Database | Pipeline | API |
|---|---|---|---|
| D1 Runs, retries, overlap | `sql/0014` applied | Download retry (none exists today); publishing-transaction retry; every failure and outcome stored on `job_run` | — |
| D2 What each run loads | — | Past-season files version-checked every run; `player` and `game` upserted | — |
| D3 Foreign keys | 40 foreign keys | New load order (§3); warn-only reference checks removed | — |
| D4 Provider IDs | `source`, `player_source`, `game_source`; `snap_count.source_code` | ID columns read from the CSV and written as rows; conflicts and shared IDs logged | Snap percentage joins through `player_source` |
| D5 Unidentifiable players | — | Roster exclusion; unlinked snap and depth rows counted and re-linked | — |
| D6 Lookup tables | `stadium`, `position_group`, `position` | Lookups filled before their rows | — |
| D7 Descriptors off fact rows | 164 columns dropped; 3 added to `game` | Column maps split into "read from CSV" and "write to table"; copied values protected from overwrite | QB names from `player` |
| D8 `play_participant` | New table | Emitted from play-by-play | — |

## 2. The pipeline run after the change, step by step

1. **Start:** open a `job_run` row. No lock (D1).
2. **Datasets in this order** (§3 explains why): teams → players → schedules → rosters → weekly player stats, weekly team stats, injuries → snap counts → depth charts → play-by-play.
3. **For each piece** (dataset × season): HEAD request, with up to 3 attempts on network errors, 5xx and 429 (D1). Skip the piece if its version matches the last successful load. History datasets check the current season **and** every past season from 2022 (D2).
4. **Download and stage:** stream the CSV into a temporary staging table that holds **every column the load needs from the file**, including the ones the target table no longer has (provider IDs, position names, slot columns, play-by-play game fields) *(build detail: wide staging)*. Sanitize as today. Roster rows whose `gsis_id` is not in `player` are dropped here and counted (D5). An error mid-stream re-runs the piece from the HEAD request, counted against the same 3 attempts *(build detail)*.
5. **Publish in one transaction**, per dataset:
   - **players:** upsert `player`; columns that other loads fill (`short_name`, `first_name`, `last_name`, `football_name`, `birth_date`, `college_name`) keep their stored value when the file's value is empty *(build detail)*. Write `player_source` from the 7 ID columns: insert new pairs, update changed ones; a value held by another player, or duplicated within the file, is skipped and logged (D4). Before changing a PFR ID, empty `snap_count.source_code` on rows that point at the old one *(build detail: the snap foreign key would otherwise block the change)*.
   - **schedules:** upsert `stadium` (current name: the name in the stadium's most recent season) *(build detail)*, then upsert `game`; `game.stadium` keeps the play-by-play name where play-by-play has set one *(build detail)*. Write `game_source` from the 7 ID columns; an ID shared by two games is skipped and logged (D4).
   - **rosters:** replace the season's rows. Gap-fill `player_source` from the 11 ID columns only where the player has no ID for that provider; a differing value is logged, not stored (`players.csv` wins, D4). Fill `player` columns that are still empty from the roster *(build detail)*.
   - **weekly stats, injuries:** replace the season's rows, as today.
   - **snap counts:** replace the season's rows, scoped through `game.season` because `snap_count` no longer has a `season` column. Set `source_code = 'pfr'` where `player_source` knows the PFR ID, otherwise leave it empty (D4, D5).
   - **depth charts:** upsert `position_group` and `position`, then replace the table; an empty `gsis_id` is filled from the ESPN ID through `player_source` (D5).
   - **play-by-play:** replace the table (deleting a play removes its participants), insert plays, insert `play_participant` rows from the 60 slot columns (D8), update `game.start_time`, `weather`, `home_opening_kickoff` and `stadium` for the season's games (D7), write `game_source` `nfl_api` rows (D4).
6. **If the publishing transaction fails**, retry it up to 2 more times; staging survives the rollback, so nothing is downloaded again. Retry any error, including deadlock (1213) and lock-wait timeout (1205); a foreign-key or duplicate-key error (1452, 1062) is logged and fails at once, since a retry gives the same result *(build detail; the owner's rule is "any failure retried up to 2 more times")*. Every attempt is logged (D1).
7. **After all pieces:** re-link rows loaded earlier without a match: `snap_count.source_code` and `depth_chart.gsis_id` where a mapping now exists (D5).
8. **Close** the `job_run` row with its outcome and, stored in the row, the counts and logs: excluded roster rows, unlinked snap and depth rows, skipped and conflicting provider IDs, retries (D1, D4, D5). Today these counts reach only the console.

## 3. Load order and foreign keys

MySQL checks a foreign key on every statement (R7), and staging tables made with `CREATE TEMPORARY TABLE … LIKE` carry none (R47), so every violation appears at publish and rolls back the piece.

| Order | Dataset | Why here |
|---|---|---|
| 0 | `source` | Seeded by the migration |
| 1 | teams | Every team code references it |
| 2 | players | `game`'s QB IDs, every fact table and `player_source` reference it |
| 3 | schedules | Fact tables' `game_id` references it; needs players for QB IDs |
| 4 | rosters | Exclusion needs `player` loaded |
| 5 | weekly stats, injuries | Need players and games |
| 6 | snap counts | Need games and `player_source` |
| 7 | depth charts | Need players, `position_group`, `position` |
| 8 | play-by-play | Needs games and players; feeds `game` columns |

- `team`, `player`, `game` are upserted and never deleted (D2); `source`, `stadium`, `position_group`, `position` only grow.
- Fact tables keep delete-and-replace per piece (O5 open): nothing references them except `play`, whose participants go with it (`ON DELETE CASCADE`, *build detail*).
- If a parent piece fails, its children fail on foreign keys in the same run and are retried on the next run.

## 4. Implementation steps

Effort assumes the backend tests run locally against `TEST_DATABASE_URL`.

| # | Step | Check | Effort |
|---|---|---|---|
| 1 | Open the GitHub issue(s) (governance: work tracking); branch the backend from `main` | Issue linked in the PR | 15 min |
| 2 | Commit the uncommitted run-lock removal on that branch; apply `sql/0014` (pre-check first) | Pre-check returns no rows | 30 min |
| 3 | Add `sql/0015_schema_review.sql`; update the `CREATE TABLE` files `0004`–`0012` and their header comments to the new shape | Fresh database from `0001`–`0015` builds; migration applies to a copy of live (§6) | 1–2 h |
| 4 | Registry: new load order; `replace: 'upsert'` for players and schedules; split each column map into "read from CSV" and "write to table"; metadata for derived tables (provider IDs, lookups, participants, game columns) so the engine stays generic | Typecheck; registry unit tests | 3–4 h |
| 5 | Wide staging and the per-dataset publish steps of §2 step 5 | Integration tests per dataset (§5) | 1.5–2 days |
| 6 | Download retry; publish retry; stored logs and counts on `job_run` | Unit and integration tests (§5) | 4–6 h |
| 7 | `seasonsToLoad`: past seasons for scheduled runs | Unit test | 1 h |
| 8 | Re-link pass after all pieces | Integration test | 1 h |
| 9 | Remove the warn-only reference checks and the registry `references` field | Tests updated | 1 h |
| 10 | API: snap percentage through `player_source`; QB names through `player` | API tests (none exist today for these) | 2–3 h |
| 11 | Docs: backend `README.md`, `docs/api-contract/02-field-mapping.md`, `sql/README.md` | Read-through | 1 h |
| 12 | Full local run: fresh database, backfill 2022–2026, compare with the review §5.3 counts | Counts match | 2 h |
| 13 | Production: stop the scheduler, back up, apply `0015`, deploy, run once, restart | `migration_log` grid; first `job_run` is `ok` | 1 h |

Total: about 4–5 working days.

## 5. Tests

**Will break and must be updated:** `season.test.ts` (ingest returned one season); `pipeline.integration.test.ts` (depth rows use a player not in `player` and dropped position columns; delete order in `beforeEach`; the overlap test tolerates a deadlock, which the publish retry should now absorb).

**To add (unit):** download retry (5xx, 429, network retried 3 times; 404 and disallowed host not retried); past-season `seasonsToLoad`; roster exclusion count; participant emission; provider-ID normalization to text.

**To add (integration):**
- Publish retry on a forced deadlock or lock-wait timeout; each attempt logged.
- An unknown `player_id`, `game_id` or QB ID fails the piece and rolls back.
- An unknown PFR ID loads with an empty `source_code` and is counted; the re-link pass links it once the mapping appears.
- An empty depth-chart `gsis_id` is filled from a known ESPN ID; an unknown ESPN ID stays empty and is counted.
- `players.csv` wins over the roster; a second player claiming an ID is skipped and logged; two games sharing a legacy ID are both skipped and logged.
- Player and game rows absent from a later file are kept.
- Snap counts replace one season without a `season` column.
- A schedules reload does not revert the play-by-play stadium name; a players reload does not erase copied names.
- A play-by-play reload with participants present succeeds.
- API: snap percentage through `player_source`; game QB names through `player`.

## 6. Migration test record (2026-11-25)

MySQL 8.4 in a throwaway container; schema from backend `sql/0001`–`0014`; seeded with players (two sharing a Smart ID), games (two sharing a legacy ID), a roster row for an unknown player, a roster ESPN ID conflicting with `players.csv`, snap rows with a known and an unknown PFR ID, depth rows with and without `gsis_id`, and a play with six slot players. The migration ran without errors: 7 tables created, 164 columns dropped, 40 foreign keys added, every count as expected. Rejected as intended: an unknown PFR ID with `source_code = 'pfr'`, a roster row for an unknown player, a participant for an unknown player, one PFR ID for two players, an unknown position group, deleting a game that has plays (errors 1452, 1062, 1451). Accepted: an unknown PFR ID with an empty `source_code`; deleting a play removed its participants. **Before production:** run it on a copy of the live database (step 3) to measure time and the real counts.

## 7. Governance before the build

| Item | Rule | Status |
|---|---|---|
| ADRs for D3–D8 | "Any decision affecting … database schema … requires an ADR" (`governance/documentation-suite.md`); one decision per ADR | Done (owner, 2026-11-25): ADR-0022 to ADR-0027. Each needs its **Implementation started** line in the planning change set that accompanies the first backend PR implementing it |
| ADR-0006 **Implementation started** line | A backend PR naming ADR-0006 under `Implements:` fails `check-planning-refs.mjs` without it; adding it freezes the ADR | Add it in the planning change set that accompanies the backend PR (standing authorization, 2026-11-17), after the D1/D2 revisions are committed |
| GitHub Issues | Work items, blockers and closure evidence live in GitHub Issues (`AGENTS.md` rule 8) | Not opened: `gh` is not authenticated in this environment. Open one issue per step group of §4, linking this plan and the review §5.1 |
| Backend scaffold kit | `code-repo-kit/init-runpure-backend.ps1` reproduces the backend; its registry order, upsert comments and run-lock text describe today's backend | Update it in the same change as the backend build (step 11), so it matches the code it generates |
| Branch and PR | Never commit to `main`; never `--no-verify` (`AGENTS.md` rule 6) | Both repos: branch, commit, PR |
| Baseline | "No code is written for a feature until its PRD and the parts of the system design it relies on are committed to `main`" | Merge this planning change before backend step 4 |

## 8. Backend cross-check (2026-11-25)

What must change in `runpure-ff-backend`, by file. Line numbers are from the working tree of 2026-11-25.

**Blockers the plan resolves**

| # | Finding | Where | Resolution |
|---|---|---|---|
| 1 | Schedules and players load after the fact tables | `datasets.ts:132-137` | New order (§3) |
| 2 | Staging is `CREATE TEMPORARY TABLE … LIKE <target>`, so it can't hold columns the target loses | `load.service.ts:63` | Wide staging (§2 step 4) |
| 3 | Snap counts' season delete uses `season`, which is dropped | `load.service.ts:103-104`; `validate.service.ts:128,138` | Scope the delete through `game` |
| 4 | Upserts would overwrite copied names and the play-by-play stadium name | `load.service.ts:93-101`; `dataset-columns.ts:16` | Keep stored values when the file's value is empty; keep play-by-play's stadium |
| 5 | `DELETE FROM play` fails once participants reference plays | `load.service.ts:107` | `ON DELETE CASCADE` on `play_participant` (migration) |
| 6 | Changing a player's PFR ID is blocked by the snap foreign key | `snap_count` → `player_source` | Empty `source_code` on rows pointing at the old ID first |
| 7 | The snap reference check queries `player.pfr_id`, which is dropped | `datasets.ts:124` | Remove the warn-only checks (step 9) |

**By decision**

- **D1:** uncommitted run-lock removal (`src/db/lock.ts` deleted; edits in `ingest.service.ts`, `load.service.ts`, `pipeline.model.ts:98`, `sql/0001_pipeline_tables.sql:25`, `scheduler/index.ts:9-10`, `nflverse.service.ts:137`, `pipeline.integration.test.ts`, `README.md`); `sql/0014` untracked. Download retry: `nflverse.service.ts:44-65` (`fetchGuarded`), `:110-112` (`headSource`), `:128-130` (`openCsv`). Publish retry: wrap `load.service.ts:91-118`. Stored logs: `finishJobRun` (`pipeline.model.ts:130-143`) stores only counts and warnings; `summary.details` (`ingest.service.ts:127-129`) is never stored. Stale overlap comments: `ingest.service.ts:44-45`, `README.md:203-206`, `scheduler/index.ts:9-10`.
- **D2:** `season.ts:56` returns only the current season for scheduled runs; docs at `season.ts:42-47`, `datasets.ts:7`. The version skip exists (`ingest.service.ts:65-76`) and compares the `ETag` only; a missing `ETag` reloads every run (`nflverse.service.ts:106-108`). Upsert for players and schedules: `datasets.ts:134,136`; "the team table" comments at `datasets.ts:14-16,69-70,132-133`, `load.service.ts:23-24,94`.
- **D3:** `CREATE TABLE` files `0005`–`0012` and their headers (`0004:2-3`, `0005:2-4`, `0006:3-4`, `0007:2`, `0008:2-5`, `0009:4-5`, `0010:2-4`, `0011:3-5`, `0012:2-4`); column types already match (`VARCHAR(32) ascii` game IDs, `VARCHAR(10) ascii_bin` player IDs). An orphan now fails the piece instead of warning. About 27 new indexes on `play` (slower play loads).
- **D4:** `dataset-columns.ts:13,16,25,37` serve as both the CSV header check and the target columns; split them. Numeric provider IDs (`0004:16-20`, roster and game `INT` columns) are normalized to text. API: `nfl.model.ts:208-211` joins `snap_count` on `player.pfr_id`; becomes a join through `player_source`; doc `docs/api-contract/02-field-mapping.md:36`.
- **D5:** roster exclusion in `sanitize` (`validate.service.ts:54-91`) with a new counter in `SanitizeStats` (`:6-13`), reported at `ingest.service.ts:95-98`. `depth_chart.espn_id` is `INT` (`0011:11`); the join to `source_player_id` needs a cast. Weekly stat rows without a player are counted only in `details` (`ingest.service.ts:96`), which isn't stored.
- **D6:** `game.stadium_id` (`0005:51`); `depth_chart` `pos_grp`, `pos_name`, `pos_abb` (`0011:14,16,17`; `dataset-columns.ts:34`).
- **D7:** dropped columns per table: `player_week_stat` `0006:9,10,13`; `roster` `0008:14-17,20,36,40-43`; `injury_report` `0009:14-16`; `snap_count` `0010:8-11`; `game` `0005:46-47`; `play` game-level and name columns (`0012`, 54 lines). API: `nfl.model.ts:111-112,126` and `nfl.service.ts:315-316` read the QB names from `game`; join `player` instead; doc `02-field-mapping.md:59`. `game.start_time`, `weather`, `home_opening_kickoff` stay empty for 2022–2025 games, because `play` keeps the current season only (ADR-0013).
- **D8:** slot columns `0012:216-247,249-272,275-278` (keep `:248` `tackle_with_assist` and `:273-274` `sack`); 14 team foreign keys `0012:388-401` dropped first.
- **Remove:** `countMissingReferences` (`validate.service.ts:119-155`), `DatasetReference` (`datasets.ts:49-57`), the `references` field (`:83-84`) and its call (`ingest.service.ts:15,106`).
- **Docs:** backend `README.md:42-44,117,146-147,149-152,156-174,194-209,230-233`; `docs/api-contract/02-field-mapping.md:30,36,59`.
- **Unaffected:** `schema.graphql` and persisted queries (no shape change); `nfl.service.ts:462-473`; `pipeline.graphql.ts`; `headers` script (`src/jobs/headers.ts:12-15`) unless derived tables are added without a `path`.

**Found along the way, not part of D1–D8**

1. The retry row-count bug: after a failed attempt, the next attempt skips the row-count check (`ingest.service.ts:90`; `pipeline.model.ts:70-74`). The fix is the review's §4 2a columns, not yet applied.
2. `downloading` and `failed` status writes happen outside the publish transaction and can overwrite another run's `loaded` row (`load.service.ts:32-33`).
3. CI runs only lint and typecheck (`.github/workflows/ci.yml:16-18`): no tests, no `npm audit`, no security lint. Branch protection couldn't be checked (`gh` not authenticated).
4. `findStatPage` reads the player's current position (`nfl.model.ts:195,214`), not the weekly position D7 keeps on the stat row.
