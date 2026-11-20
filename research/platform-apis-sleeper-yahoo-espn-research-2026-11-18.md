# Platform API research: Sleeper, Yahoo, ESPN — access, capabilities, constraints

**Date:** 2026-11-18 · **Author:** Claude (research), for William Sanchez
**Status:** Final (research). Input to the future Platform connections implementation spec. Decides nothing itself; every owner decision this raises is listed in §5 and stays open until the owner answers.
**How to read it:** §1–§3 are per-platform findings, each tied to a source; anything the research could not confirm is marked **UNVERIFIED**. §4 lists cross-platform constraints. §5 maps the findings to the open questions in the PRDs and earlier reviews — what is now answered, what is partially answered, and what remains the owner's decision. All links were opened or returned by a search on 2026-11-18. Three independent research passes (one per platform) produced the raw findings.

---

## 1. Sleeper

### 1.1 Reading data — official, keyless, stable

- The official API (`https://api.sleeper.app/v1`) is read-only, needs **no key or authentication**, and is free for non-commercial use (commercial use needs a license via api@sleeper.app). ([docs.sleeper.com](https://docs.sleeper.com/))
- Username → `user_id` flow: `GET /v1/user/<username>`; docs advise storing the `user_id` (a string) because usernames can change. ([docs.sleeper.com](https://docs.sleeper.com/))
- Full read surface (all under `/v1`): user's leagues per season (`/user/<user_id>/leagues/nfl/<season>`), league with `scoring_settings` + `roster_positions` + `previous_league_id` (`/league/<id>`), rosters, league users, matchups by week, playoff brackets, transactions by week (`/transactions/<round>` — "round" means week), traded picks, drafts and picks, full players map (`/players/nfl`), trending adds/drops, and NFL state (`/state/nfl` → `week`, `leg`, `display_week`, `season`, `season_type`). ([docs.sleeper.com](https://docs.sleeper.com/))
- **Players map:** ~5 MB JSON; docs: save it on your own servers and "You do not need to call this endpoint more than once per day." Player objects carry cross-platform IDs: `espn_id`, `yahoo_id`, `gsis_id`, `sportradar_id`, `stats_id`, `rotowire_id`, `fantasy_data_id`. ([docs.sleeper.com](https://docs.sleeper.com/))
- **Waiver visibility:** roster `settings` exposes `waiver_position` and `waiver_budget_used`; league settings hold the FAAB budget. Processed waiver transactions carry `waiver_bid`. **Other managers' pending (unprocessed) claims are not exposed.** ([docs.sleeper.com](https://docs.sleeper.com/))
- Undocumented but unauthenticated extras on a different host (`https://api.sleeper.com`): weekly stats and projections, depth charts, NFL schedule. Library maintainers warn these "could be blocked/deprecated at any point". ([joeyagreco/sleeper discussion](https://github.com/joeyagreco/sleeper/discussions/11), [ai-fantasy-league issue #184](https://github.com/allenheltondev/ai-fantasy-league/issues/184))

### 1.2 Making changes — no official path at all

- The official API cannot write: "this API is read-only". ([docs.sleeper.com](https://docs.sleeper.com/))
- Community tools write through Sleeper's **private GraphQL endpoint** (`sleeper.com/graphql`), reverse-engineered: ~350 mutations including lineup setting, `submit_waiver_claim` (with FAAB bid), cancel claim, add/drop, IR/taxi moves, propose/respond to trades. Open introspection, no subscriptions. ([Filip-Kin/sleeper-graphql](https://github.com/Filip-Kin/sleeper-graphql), [sleeper-sdk PR #117](https://github.com/cameron-eth/sleeper-sdk/pull/117))
- **Token:** a JWT manually copied from the logged-in browser (`authorization` header, no `Bearer` prefix; also in `localStorage.token`). **No refresh endpoint — recovery is manual re-capture.** Lifetime: embedded in the JWT `exp` claim; no source states a standard duration (**UNVERIFIED**). A programmatic `login` GraphQL query exists but may demand captcha; reliability **UNVERIFIED**. ([sleeper-graphql](https://github.com/Filip-Kin/sleeper-graphql), [SleepBot MCP](https://glama.ai/mcp/servers/sdotj/sleeper-bot))
- **Churn:** Sleeper removed `create_waiver_claim`/`create_free_agent` and changed `cancel_waiver_claim`'s arguments without notice, breaking community SDKs; it also removed a public stats endpoint ffscrapr used. The REST read surface, by contrast, has been stable for years. ([sleeper-sdk PR #117](https://github.com/cameron-eth/sleeper-sdk/pull/117), [ffscrapr news](https://ffscrapr.ffverse.com/news/index.html))

### 1.3 Terms of service (General Terms of Use, updated 2026-11-17)

- §9.2: personal, non-commercial license; prohibits "reverse engineer, decompile … or otherwise inappropriately use the Services". §2.2: user is solely responsible for credential confidentiality. §2.9: third-party connections are contemplated only for "Approved Integration" partners. ([support.sleeper.com ToU](https://support.sleeper.com/en/articles/5486620-general-terms-of-use))
- A search summary attributed stronger anti-scraping/anti-credential-sharing clauses to Sleeper; three direct fetches could not find them in the live article (**UNVERIFIED** — the ToU was updated the day before this research; re-read before any write decision).
- Net reading: official read API within its stated limits is fine for personal use; **any write automation is unofficial and sits at minimum against §9.2**.

### 1.4 Rate limits and gotchas

- "Stay under 1000 API calls per minute, otherwise, you risk being IP-blocked"; 429 is documented. Players map ≤ 1/day. ([docs.sleeper.com](https://docs.sleeper.com/))
- No pagination anywhere; whole collections per call. No webhooks/push — polling only.
- Week semantics: `/state/nfl` has `week`, `leg` (regular-season week) and `display_week`, which "can be different"; transactions are keyed by week via the `<round>` path segment.
- Matchups return one object per roster — pair opponents by equal `matchup_id`; empty lineup slots appear as `"0"` entries (community-observed, **UNVERIFIED** in docs).
- Rosters can have `co_owners` (array of user_ids, undocumented) — "is this my roster" checks must include it; `is_owner` on a league user means **commissioner**, not roster owner.
- Team-defense `player_id`s are team abbreviations (`"CAR"`), not numbers. League/user/draft IDs are snowflake-style strings that overflow JS `Number` — keep as strings.
- Dynasty/keeper: league history walks `previous_league_id`; `roster_id` is not stable across seasons, `user_id` is.

## 2. Yahoo

### 2.1 Access is now gated (the headline finding)

- Since ~July 2026 the Fantasy Sports API sits behind a **manual access application**: create a Yahoo developer app (client id/secret), then apply at the access portal (product description, user-count tier — "Small <1,000"; **"personal or single league use" is an explicitly permitted category**), then DocuSign an API Access and Use Agreement. Human review, **no SLA**; terms are **US/Canada only**; sparse applications are closed without correspondence; at least one rejection for use-case misalignment is on record. Approval and "binding to the data allowlist" are separate stages — approved apps still saw 401/403 until binding completed. ([Yahoo access portal](https://sports.yahoo.com/developer/access/), [fantasy-football-mcp issue #18](https://github.com/derekrbreese/fantasy-football-mcp-public/issues/18), [fantasy-hoops issue #7](https://github.com/Allen930311/fantasy-hoops-decision-assistant/issues/7))
- **Write access is not grantable to new apps.** The portal states: "The Yahoo Fantasy Sports API currently provides read access only. Write access is not available at this time." The write scope (`fspt-w`) option disappeared from the console around Oct 2025; **legacy apps with `fspt-w` keep working** ("My old app keys still work to Write", Oct 2025). ([access portal](https://sports.yahoo.com/developer/access/), [yfpy issue #79](https://github.com/uberfastman/yfpy/issues/79))

### 2.2 Authentication

- OAuth 2.0 authorization-code flow only: `request_auth` → `get_token`; access token lifetime **3600 s**; refresh token long-lived, documented to survive password changes; a refresh response may return a new refresh token — persist whatever comes back. ([Yahoo OAuth guide](https://developer.yahoo.com/oauth2/guide/flows_authcode/))
- **Redirect URIs: HTTPS required; `https://localhost:PORT` is accepted** (yfpy's official setup registers `https://localhost:8080`). `127.0.0.1` specifically: **UNVERIFIED**. OOB (`redirect_uri=oob`) reported removed for new apps. No device-code flow documented. ([yfpy on PyPI](https://pypi.org/project/yfpy/), [OAuth guide](https://developer.yahoo.com/oauth2/guide/flows_authcode/), [yfpy issue #79](https://github.com/uberfastman/yfpy/issues/79))

### 2.3 Reading data (scope `fspt-r`)

Base `https://fantasysports.yahooapis.com/fantasy/v2`; current docs at [sports.yahoo.com/developer/docs](https://sports.yahoo.com/developer/docs/). Confirmed read surface: user's leagues (`/users;use_login=1/games;game_keys=nfl/leagues`), league settings with full stat categories and per-stat modifiers, rosters by week, scoreboard/matchups by week, players with free-agent filters (`status=FA`, pagination capped ~25/page), player stats incl. league-scored `player_points`, game metadata (`/game/nfl/game_weeks`, `stat_categories`, `roster_positions`).

- **Pending claims and trades are visible only with the team-scoped filter** `;team_key={key};types=waiver,pending_trade` — a plain transactions call returns completed only. Editable fields on a pending claim: `waiver_priority`, `faab_bid`. League settings expose `waiver_type`, `waiver_rule`, `uses_faab`, `trade_ratify_type`. FAAB balance appears in team metadata (`faab_balance` per wrappers; field name **UNVERIFIED** in current official samples). ([docs](https://sports.yahoo.com/developer/docs/))
- Responses are XML natively; `?format=json` works but is a literal XML transliteration — collections are objects with numeric string keys plus `"count"`, entities are arrays of single-key objects. **Every client hand-writes a normalizer; budget for one as a first-class component.** (community-documented: [wernull guide](https://wernull.com/2016/01/getting-started-with-the-yahoo-fantasy-sports-api/))

### 2.4 Writing data (documented, but scope-locked)

All officially documented, usable only with `fspt-w`:
- Lineup: `PUT /team/{team_key}/roster` with XML body, `coverage_type=week` — **football-confirmed in the docs' own example**; partial rosters allowed; invalid moves fail atomically.
- Add/drop: `POST /league/{league_key}/transactions` (`type` add / drop / add/drop); posting a waivered player creates a claim; FAAB bid via `<faab_bid>`.
- Edit pending claim: `PUT /transaction/{transaction_key}` (priority, bid). Cancel claim or un-accepted trade: `DELETE /transaction/{key}`.
- Trades: propose via `POST` (`type=pending_trade`, trader/tradee team keys, per-player transaction_data); respond via `PUT` with `action` accept/reject/allow/disallow/vote_against. ([docs](https://sports.yahoo.com/developer/docs/))

### 2.5 Rate limits, terms, stability

- No official numbers. Community evidence: blocks observed around ~500 back-to-back requests/min; Yahoo contact quoted "a couple thousand requests per hour", abuse-oriented enforcement; block responses are **non-JSON text** (breaks naive parsers); ~1 req/s with caching avoids trouble. ([yahoo-fantasy-sports-api issue #81](https://github.com/whatadewitt/yahoo-fantasy-sports-api/issues/81))
- The old Fantasy API ToU URL 404s; obligations now come from the signed access agreement plus portal terms: single developer account, no reverse engineering, throttling reserved, **attribution required** ("Fantasy data provided by Yahoo Fantasy" + logo/link). ([portal](https://sports.yahoo.com/developer), [YDN API terms](https://legal.yahoo.com/us/en/yahoo/terms/product-atos/apiforydn/index.html))
- API surface itself stable ~15 years; the access story is what changed (write removal ~Oct 2025, full gating ~Jul–Aug 2026). Maintained wrappers: `yahoo-fantasy` npm (active, 2026-09), `yfpy` (read-oriented; notes transient hangs fixed by retry).
- Gotchas: `game_id` changes every season (2025 = `461`), so league/team/player/transaction keys change each season — resolve via `/game/nfl`; season-stable player identity is `editorial_player_key` (`nfl.p.XXXX`); league `renew`/`renewed` fields chain seasons; `edit_key`/`weekly_deadline` govern when weekly lineup PUTs apply; `W/R/T`, `IR`, `BN` position strings used verbatim; some players are undroppable (`cant_cut_list`).

## 3. ESPN

### 3.1 No official API; cookie authentication

- No official public API, no OAuth, no partner program. Private-league access requires two cookies on every request: `espn_s2` (long opaque token, URL-encoded) and `SWID` (GUID **with the curly braces** — they are part of the value). Public leagues need neither. ([ffscrapr auth vignette](https://ffscrapr.ffverse.com/articles/espn_authentication.html), [stmorse v3 post](https://stmorse.github.io/journal/espn-fantasy-v3.html))
- Users obtain them by logging into fantasy.espn.com and copying from DevTools → Cookies — the flow every community tool documents. ([espn-api discussion #150](https://github.com/cwendt94/espn-api/discussions/150))
- **Lifetime: conflicting community data, no authoritative number.** One camp: survives a full season (expiry set far out; browsers cap cookies at 400 days). Other camp: rotated/silently expired after weeks. **Treat as valid-for-months but revocable at any time**; "sign out everywhere" invalidates it; effect of password change **UNVERIFIED** (assume invalidation). Detect 401 → prompt re-paste. ([discussion #150](https://github.com/cwendt94/espn-api/discussions/150), [League Loom guide](https://leagueloom.com/espn-s2-swid))
- A reverse-engineered Disney login flow exists but breaks on MFA/captcha and is disabled in the main community library — **do not design around it**. ([espn-api discussion #128](https://github.com/cwendt94/espn-api/discussions/128))
- **Scope risk:** the cookie pair authenticates the whole ESPN/Disney account, not just fantasy. Store server-side encrypted; never log. ([fantasybot.ai explainer](https://www.fantasybot.ai/espn-s2-swid))

### 3.2 Read surface (unofficial, well-mapped, 2026-current)

- Host: `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{leagueId}` (the pre-2024 `fantasy.espn.com` host no longer serves JSON reliably). Confirmed live by community tests 2026-03. ([espn-api constant.py](https://github.com/cwendt94/espn-api/blob/master/espn_api/requests/constant.py), [pseudo-r Public-ESPN-Fantasy-API](https://github.com/pseudo-r/Public-ESPN-Fantasy-API/blob/main/README.md))
- Composable `?view=` params: `mSettings` (scoring, roster slots), `mTeam`, `mRoster` (+`scoringPeriodId` for a week), `mMatchup`/`mMatchupScore`, `mBoxscore`, `mLiveScoring`, `mStandings`, **`mTransactions2` (waivers, trades, FA moves — pending and executed)**, `mDraftDetail`, `kona_player_info` (player pool with stats/projections/ownership).
- `kona_player_info` **silently truncates to 50 players** without an `X-Fantasy-Filter` JSON header carrying a `limit`. ([jman4190 walkthrough](https://jman4190.medium.com/how-to-use-python-with-the-espn-fantasy-draft-api-ecde38621b1b))
- **Listing the user's leagues:** `GET https://fan.api.espn.com/apis/v2/fans/{percent-encoded SWID}?featureFlags=fantasy` — leagues in `preferences[]` with `type.id == 9`. Reported SWID-only auth — weakly verified, probe at build. ([jwulff issue #157](https://github.com/jwulff/fantasy-sports/issues/157))
- Seasons before 2018 use `/leagueHistory/{leagueId}?seasonId={year}` and return a one-element array. Player news: `site.api.espn.com/apis/fantasy/v3/games/ffl/news/players?playerId={id}`.

### 3.3 Writes (reverse-engineered, experimental)

- `POST https://lm-api-writes.fantasy.espn.com/.../leagues/{leagueId}/transactions/` with the same cookies. Observed types: `WAIVER` (claim, add+optional drop), `FREEAGENT` (instant add/drop), `ROSTER` with `LINEUP` items (both sides of a slot swap in **one** transaction). Working community automations exist (CLI with dry-run; bots doing lineups/waivers/trades). Payloads unversioned and undocumented; maintainers: "can change without notice… a few requests per session is plenty." ([ryanjadhav/espn-fantasy](https://github.com/ryanjadhav/espn-fantasy), [pseudo-r](https://github.com/pseudo-r/Public-ESPN-Fantasy-API/blob/main/README.md))
- Account flagging/bans for automation: **no documented case found** (UNVERIFIED either way).

### 3.4 Terms, rate limits, stability

- Disney Terms of Use **§2.B.x** prohibits accessing/extracting Disney products "using a robot, spider, script, or other automated means" — on its face this covers reads as well as writes. §1.F: don't share account information. No fantasy-specific enforcement case found. ([disneytermsofuse.com](https://disneytermsofuse.com/english/))
- No documented rate limits; no reproducible 429 reports at hobby volume; `lm-api-reads` returns JSON without browser spoofing. Cache aggressively, stay human-scale, back off on 429/403.
- Stability record: one structural break roughly every five years (v2→v3 in 2019; host split in 2024; **no breaking change 2025–2026** — the main community library's 2026 releases are feature-level). Community adapts in days-to-weeks. Isolate host + view names in one adapter module.
- Gotchas: `scoringPeriodId` (NFL week) vs `matchupPeriodId` (fantasy matchup; diverge in multi-week playoffs — `mSettings` has the mapping); two position-ID systems (`lineupSlotId` 0–25 incl. 23 = RB/WR/TE flex, vs `defaultPositionId`) plus a third map for stat IDs ([canonical tables](https://github.com/cwendt94/espn-api/blob/master/espn_api/football/constant.py)); ESPN player IDs are proprietary integers — map via nflverse `ff_playerids` (known duplicate-`espn_id` rows: [dynastyprocess data issue #84](https://github.com/dynastyprocess/data/issues/84)); D/ST uses negative IDs derived from proTeamId (**UNVERIFIED**, confirm live); new-season league objects may 404 until the league is reactivated — handle gracefully.

## 4. Cross-platform constraints that shape the spec

1. **Write paths are the scarce resource.** Yahoo: documented writes, scope unavailable to new apps (legacy `fspt-w` credentials are the only clean path). Sleeper: no official writes; unofficial GraphQL + manually captured JWT, mutation churn, ToS §9.2 exposure. ESPN: unofficial writes, ToS exposure, but a working community playbook. The PRD's "Changes phase: Yahoo first, then Sleeper" rests on an assumption that no longer holds for new Yahoo apps.
2. **Reads are solid everywhere.** Sleeper official/keyless; Yahoo official behind an application (personal use permitted); ESPN unofficial but stable and well-mapped. The Viewing phase has no platform blocker other than the Yahoo application lead time and the owner's ESPN ToS posture.
3. **No webhooks anywhere.** All three are poll-only; the PRD's 60-second live tier and ≤15-minute freshness are achievable within each platform's observed tolerance (Sleeper <1,000/min; Yahoo ~1 req/s; ESPN human-scale + caching).
4. **Three credential shapes** (none / OAuth tokens / pasted cookies or JWT) and three failure modes (IP block / token expiry+refresh / silent cookie revocation) — the connection-health design must express all three.
5. **Identity:** Sleeper's players map + nflverse `ff_playerids` together cover Sleeper/ESPN/Yahoo→GSIS mapping, with known duplicate rows → the crosswalk needs the manual-match queue the PRD already requires.
6. **Local-first development works for all three.** Yahoo accepts `https://localhost:PORT` redirects (local TLS needed); Sleeper and ESPN need no callback at all. No deployment dependency for the Viewing phase.
7. **Season rollover is a real design input:** Yahoo keys change every season (`game_id`), Sleeper chains leagues via `previous_league_id`, ESPN reuses `leagueId` across `seasons/{year}` resources.

## 5. What this answers, what stays open

### Answered (facts; cite this document)

| Question (where it was open) | Answer |
| --- | --- |
| Do ToS allow automated use? (Platform connections PRD, blocking) | Read: Sleeper §9.2 reading above; Yahoo — yes under the signed access agreement; ESPN — prohibited on its face, no observed enforcement. **The risk acceptance is the owner's decision (§5 below)** |
| Does Yahoo's API allow lineup changes for football, or only add/drop? (PRD) | Lineup changes are documented and football-confirmed (weekly coverage PUT) — but write scope is unavailable to new apps |
| Yahoo rate limits; does it expose waiver type, budget, priority? (PRD, blocking) | ~1 req/s safe (blocks ~500/min observed); waiver_type/uses_faab/waiver_rule in settings; own pending claims (with priority and bid) visible via team-scoped filter; FAAB balance in team metadata |
| How long do ESPN cookies last? (PRD) | Months-but-revocable; no official number; "sign out everywhere" kills them; design the 401→re-paste flow |
| Yahoo OAuth callback vs. local-only deployment (2026-11-18 review) | `https://localhost:PORT` is registrable — dissolved; no deployment dependency |
| Credential lifecycle facts (2026-11-18 review) | Yahoo 1 h access/long-lived rotating refresh; Sleeper reads credential-free, write JWT has no refresh (manual re-capture); ESPN cookies as above |
| Can claims be submitted on Sleeper and Yahoo, or only immediate adds? (Lineup management PRD) | Yahoo: documented claims incl. FAAB bid and edit/cancel (scope-locked). Sleeper: only via the unofficial GraphQL mutation. ESPN: unofficial `WAIVER` transaction |
| Do platforms expose waiver deadlines, budgets, priority? (Lineup management PRD, blocking) | Budget and priority: yes on all three (Sleeper roster settings; Yahoo team/settings; ESPN mTeam/mSettings). **Waiver-run schedule/deadline times: only as league settings fields — exact per-platform fields need the build-time probe list** |
| Which platforms expose trade proposals — read/send/accept/reject? (Trades PRD, blocking) | Yahoo: all four documented (scope-locked). ESPN: pending+executed trades readable via mTransactions2; send/accept unofficial. Sleeper: completed trades readable officially; pending proposals and actions only via unofficial GraphQL |
| Which shared player-ID list covers all three? (PRD, answered before; now confirmed) | nflverse `ff_playerids` + Sleeper players-map cross-IDs; duplicate-`espn_id` rows exist → manual-match queue stands |

### Partially answered — needs a build-time probe (collect in the spec's probe list)

- Where late inactives come from on game day (PRD, blocking): candidates found — ESPN news endpoint, `mLiveScoring`, Sleeper's undocumented stats host, Yahoo player status fields — none verified as a timely inactives source.
- Kickoff times and lock status per platform (Lineup management PRD, blocking): ESPN `proTeamSchedules_wl`, Sleeper undocumented schedule endpoint, Yahoo `/game/nfl/game_weeks` + nflverse schedules — a deliberate choice plus probe needed.
- Injury-label vocabulary across platforms (Lineup management PRD, blocking): not resolved; each platform's label set needs enumeration during build.
- Completeness of Sleeper's `espn_id`/`yahoo_id` fields vs. nflverse (PRD): duplicates documented; coverage percentage needs a one-off data comparison.
- Yahoo FAAB-balance field name; ESPN fans-endpoint auth scope; ESPN D/ST negative IDs; Yahoo `127.0.0.1` redirect; Sleeper write-JWT lifetime — all flagged UNVERIFIED above.

### Still open — owner decisions (nothing recorded until decided)

1. **ESPN posture:** integrate reads accepting the stated ToS risk / view-only / exclude. (The PRD's blocking ToS question, now decision-ready.)
2. **Sleeper writes posture:** defer to changes phase / plan the unofficial path (isolated adapter, kill switch, manual token UX) / view-only permanently.
3. **Yahoo application:** file the read-only application now (calendar long pole) — and whether any legacy Yahoo app credentials (pre-Oct-2025, possibly `fspt-w`) exist.
4. **Changes-phase ordering:** "Yahoo first, then Sleeper" needs re-confirmation once 1–3 are answered.
5. **Credential policy residue:** disconnect = hard-delete credentials; what happens to already-synced league data on disconnect.
