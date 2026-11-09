# Data ETL & storage

**Loads nflverse's NFL data into MySQL tables that the Phase 1 screens read, keeps them current, and can rebuild every table from the source with one command.**

**Last updated:** 2026-11-09 · Technical PRD, draft v2.1 · Owner: William Sanchez · v2.1: moved from the online PRD doc; run history exposed through GraphQL (ADR-0017).

Its implementation spec is [`specs/ff-data-etl-storage-spec.md`](../specs/ff-data-etl-storage-spec.md), and the decisions behind it are ADR-0001 to ADR-0013 ([decision log](../design/architecture-decisions.md)). The API that reads its tables is GraphQL ([ADR-0017](../design/decisions/ADR-0017-use-graphql-for-the-backend-api.md)).

## At a glance

|  |  |
| --- | --- |
| **Serves** | The Phase 1 screens (Player list, Player card, NFL scores and schedule) through the Express API, plus you as the operator |
| **Viewing data** | Everything else reads from it. It's specified and built first |
| **Making changes** | None. It only reads from nflverse |
| **Depends on** | nflverse's public release files (HTTPS, no sign-in) |
| **Biggest risk** | A load leaves partial or wrong data. Handled by staging each piece and swapping it in one transaction, and by checks that run before a piece counts as loaded |

## The problem

Every Phase 1 screen is only as good as the data under it. This layer turns nflverse's published files into clean, typed MySQL tables: one row per player-week, team-week, game, roster entry, injury report, snap count, depth-chart slot and play. Fantasy points are calculated in the app from the stored stats (ADR-0007), so this layer stores stat lines only.

If this layer is wrong, every screen above it is silently wrong. It also has to keep the player list and stats no more than 24 hours old during the season.

## Scope

**In scope (Phase 1)**

- Seven nflverse datasets for 2017–2026: weekly player stats, weekly team stats, schedules, players, season rosters, injuries and snap counts, plus nflverse's team file for team names, colors and logos
- Play-by-play and depth charts for the current season only (ADR-0013); play-by-play is kept to enable analytics later
- Kickers, team defenses and individual defensive players; practice-squad players only once they play (a weekly stats row)
- A one-time backfill, then scheduled runs that load only data that can still change (ADR-0006)
- Typed MySQL tables with natural keys, as designed in the spec (§7.2 and Appendix A). MySQL is the only store; raw downloads aren't kept (ADR-0005)
- An ingest ledger and a run lock (ADR-0006), and a run history (spec §5.3)
- Checks that run before a load is marked done

**Where it stops:** at the MySQL tables. The API, the scoring and the screens sit outside it.

## Who it serves

| User | What they need |
| --- | --- |
| Operator (you) | Run the backfill and loads; see each run's outcome in the run history and the ledger; rebuild by downloading again |
| The Express API | Stable table and column contracts (spec §7.2 and Appendix A) |
| Phase 1 screens, through the API | Player list, Player card, NFL scores and schedule, with the player list and stats no more than 24 hours old |

## Sources

| Source | What it provides | Access | Decision |
| --- | --- | --- | --- |
| nflverse | Weekly player and team stats, schedules, players, season rosters, injuries, snap counts, teams; current-season play-by-play and depth charts | Public GitHub release files over HTTPS, no sign-in | Decided |
| Sleeper player list | Injury status, practice participation, depth-chart order | Documented public API | Set aside 2026-11-06; not in Phase 1 |

## What success looks like

| Goal | Target |
| --- | --- |
| Full backfill, 2017–2026, with one command | Completes; resumes where it stopped; every piece recorded in the ledger |
| Scheduled runs | Load only the current season's files and the single-file datasets; unchanged files are skipped |
| Freshness | Player list and stats no more than 24 hours old in season |
| Safe re-runs | Loading the same piece twice gives identical tables; a run killed midway leaves the previous data intact |
| Rebuild | Every table can be rebuilt by running the backfill again |

## Not doing

| Not doing | Where it lives instead, or why |
| --- | --- |
| Fantasy-point columns | The app calculates points from stored stats (ADR-0007) |
| Keeping raw downloads, or an object storage bucket | MySQL is the only store; a bad load is fixed by downloading again (ADR-0005) |
| Past seasons of play-by-play and depth charts | Current season only (ADR-0013) |
| Weekly rosters | No Phase 1 requirement needs them |
| Reconciling play-by-play against weekly stats | nflverse already computes weekly stats from play-by-play (ADR-0013) |
| League data from Sleeper, Yahoo and ESPN; the live game-day tier; source health | [Platform connections](infra-platform-connections.md) |
| Monitoring and alerting | Its own PRD in a later phase; a failed run shows in the run history and the logs |
| Making changes on any platform | Platform connections |

## User stories

- As the operator, I want one command that loads 2017–2026, so the tables are complete before the screens are built.
- As the operator, I want each day's run to load only what changed, so runs stay short and never duplicate rows.
- As the operator, I want each run's outcome and each file's load recorded, so I can see what loaded, what was skipped and what failed.
- As the owner, I want the player list and stats no more than 24 hours old in season, so the Phase 1 screens are current.

## Must have for launch

| Requirement | Done when |
| --- | --- |
| Every Phase 1 dataset loaded into its table (spec §7.2) | For each dataset: header read, table created, columns mapped, first load passes |
| Backfill command | `npm run backfill -- --from 2017 --to 2026` loads every piece; a stopped backfill resumes |
| Scheduled runs inside the Express backend's always-on process (ADR-0008) | Each run loads the current season's files and the single files; a file whose published version hasn't changed is skipped |
| Ledger, lock and run history | One ledger row per dataset × season; a run that finds the lock taken exits and records the skip; every run is recorded |
| Staging, then swap | A piece's rows are replaced in one transaction; a crash leaves the live table untouched |
| Missing is never zero | Empty fields load as NULL; a stat that doesn't apply stays NULL |
| Checks before a piece is marked loaded | A bad header, a repeated or empty key, a sharp drop in row count, or a team code with no row in `team` blocks the load; orphan player and game IDs, odd values and stale data only warn (spec §8) |

## Should have soon after

None. Monitoring and alerting get their own PRD in a later phase (decision log, open item 7); later data sources are under Later.

## Later

| Idea | Why it's parked |
| --- | --- |
| Odds: game lines and player props | Vendor not chosen |
| Consensus rankings | FantasyPros key or nflverse's free path not chosen |
| Snapshot archiver | Not in Phase 1. When it starts, snapshots are stored as MySQL rows, as ADR-0005 does for other dated copies |
| Sleeper player list | Set aside; ADR-0004 keeps dated copies once it's enabled |
| Charting and tracking data (Next Gen Stats, FTN, participation, PFR advanced), coaching, weather | Not among the Phase 1 datasets |

## What it hands to other parts

| Output | Contents |
| --- | --- |
| Entity tables | `player`, `game`, `team` |
| Fact tables | `player_week_stat`, `team_week_stat`, `roster`, `injury_report`, `snap_count`; `depth_chart` and `play` for the current season |
| Bookkeeping | `ingest_ledger` and `job_run`, exposed to operator accounts as the GraphQL fields `ingestLedger` and `pipelineRuns` (ADR-0017) |

Freezing these table contracts is what lets the API and screens build against them before every load is finished.

## Risks

| Risk | How it's handled |
| --- | --- |
| A load leaves partial data | Staging, then one transaction; a piece is marked loaded only after its checks pass |
| nflverse changes a file's columns (injuries did in 2025) | Each file's header is read before mapping; a dataset without a mapping is skipped and reported |
| GitHub's download host may not return version headers | Fall back to the file size plus a content hash recorded in the ledger |
| Jobs share the API's single Node process | Files are streamed and inserted in batches (ADR-0008) |
| Snap counts identify players by Pro Football Reference ID | 99.91% of rows map to a player through `player.pfr_id`; the rest are reported |
| A rebuild returns today's published data, not an earlier copy | Accepted: nflverse corrects and republishes its files |
| Point-in-time data that isn't captured is gone | The archiver isn't in Phase 1; nflverse's dated depth charts since 2025 cover part of it |

## How we'll measure it

| Measure | When it shows | Target |
| --- | --- | --- |
| Age of the player list and stats | Each run (`job_run`, ledger) | Never more than 24 hours old in season |
| Scheduled runs that finish without a failed piece | Each run (`job_run`) | Every run; a failed piece is retried on the next run |
| Backfill completeness | After the backfill | One `loaded` ledger row per dataset × season |

## Open questions

The "Ref" column: D labels are the implementation spec's §0.2 decisions; Q labels are this PRD's own question numbers, which the spec's §11 also cites.

| Question | Ref | Blocks building? | Who answers | Status |
| --- | --- | --- | --- | --- |
| Which season counts as "current", including the off-season? | D6 | Yes, before runs are left unattended | You | Answered: the season in progress on today's date; between seasons, rosters switch March 15 and everything else the Wednesday after Labor Day |
| When do scheduled runs happen? | D7 | Yes, before runs are left unattended | You | Answered: once a day at 06:00 Eastern |
| Load a team table, for team names and foreign keys? | D9a | No, answer during build | You | Answered: yes, nflverse's team file is loaded as `team` |
| Which checks block a load, and which only warn? | D10 | Yes, answer first | You | Closed by Claude's recommendation (you didn't know): structural checks block, value checks warn |
| Scheduler library: node-cron or node-schedule? | D12 | No, answer during build | You | Closed by default: node-cron, already in the scaffold |
| How soon after games does nflverse publish player stats? Sets the real freshness | Q8 | No, answer during build | Engineering | Open |
| Has the snapshot archiver run yet? | Q1 | — | You | Answered: it doesn't run in Phase 1 |
| Where are raw files and snapshots stored? | Q12 | — | You | Answered: no raw files are kept; MySQL is the only store (ADR-0005) |
| Which odds vendor: The Odds API or SportsGameOdds? | Q10 | Later phase | You | Open |
| Consensus rankings: FantasyPros key or the free path? | Q11 | Later phase | You | Open |
| Terms of service (Q2), ESPN cookies (Q3), Yahoo limits (Q4), late inactives (Q5), where the live tier runs (Q6), Sleeper ID fields (Q7), shared league model (Q9) | — | — | — | Moved to [Platform connections](infra-platform-connections.md) |

## Build order

The implementation spec's sequencing, [`specs/ff-data-etl-storage-spec.md`](../specs/ff-data-etl-storage-spec.md) §13:

1. Apply the bookkeeping tables (`sql/0001_pipeline_tables.sql`)
2. Map each Phase 1 dataset: header, `CREATE TABLE`, mapping, first load
3. Add the checks that block or warn on a load
4. Run the backfill
5. Replace the scaffold's season placeholder with the D6 switch dates; confirm the 06:00 Eastern schedule
