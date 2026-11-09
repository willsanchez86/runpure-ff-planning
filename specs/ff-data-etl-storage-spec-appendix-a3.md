# Implementation Spec — Data ETL & Storage: Appendix A, part 3 of 5

**Players, season rosters, injuries, snap counts and depth charts.** Part of [`ff-data-etl-storage-spec.md`](ff-data-etl-storage-spec.md), §7.2; split into five files only because of file-size limits.

Every column of every ingested file, profiled 2026-11-08. **Observed** is the type found in the data; **Nulls** the share of empty values; **Proposed MySQL type** applies §7.2.2 (integers sized to twice the largest value seen). Descriptions come from nflverse's dictionaries, linked per dataset; where a dataset's note says so, they are approximate or borrowed.

### A. Players (`players/players.csv`)

Descriptions: [nflreadr dictionary](https://ftp.fau.de/cran/web/packages/nflreadr/vignettes/dictionary_players.html). 

Grain: one player. Natural key: gsis_id. Profiled: 24,867 rows (single file). 39 columns; 39 have an nflreadr dictionary entry.

| # | Column | Observed | Nulls | Range or values | Proposed MySQL type | Description |
|---|---|---|---|---|---|---|
| 1 | `gsis_id` | text | 0.0% | up to 10 chars | VARCHAR(10) ascii_bin | GSIS ID for player. Primary key for all data. |
| 2 | `display_name` | text | 0.0% | up to 29 chars | VARCHAR(64) | Full name of player |
| 3 | `common_first_name` | text | 0.0% | up to 15 chars | VARCHAR(32) | Common first name of player |
| 4 | `first_name` | text | 0.0% | up to 18 chars | VARCHAR(32) | First name of player |
| 5 | `last_name` | text | 0.0% | up to 19 chars | VARCHAR(32) | Last name of player |
| 6 | `short_name` | text | 68.4% | up to 22 chars | VARCHAR(32) | Player short name (i.e. F.Last) |
| 7 | `football_name` | text | 66.5% | up to 14 chars | VARCHAR(32) | Common player name (i.e. in most cases common_first_name last_name) |
| 8 | `suffix` | text | 99.3% | 8 values: II, III, IV, Jr, Jr., Sindre, Sr., Williams | VARCHAR(16) | Name suffix of player |
| 9 | `esb_id` | text | 0.0% | up to 9 chars | VARCHAR(16) ascii | ESB ID of player |
| 10 | `nfl_id` | integer | 52.0% | 9143 to 63960 | INT UNSIGNED | NFL ID of player (this is used in Big Data Bowl Data) |
| 11 | `pfr_id` | text | 8.7% | up to 10 chars | VARCHAR(10) ascii_bin (joins snap counts' `pfr_player_id`) | Pro-Football-Reference ID for player |
| 12 | `pff_id` | integer | 53.2% | 51 to 217533 | INT UNSIGNED | PFF ID for player |
| 13 | `otc_id` | integer | 60.5% | 1 to 13847 | INT UNSIGNED | Over the Cap ID for player |
| 14 | `espn_id` | integer | 33.2% | 1 to 5360470 | INT UNSIGNED | ESPN ID for player |
| 15 | `smart_id` | text | 0.0% | up to 36 chars | VARCHAR(64) ascii | SMART ID for player (that’s in raw pbp. It includes a hashed ESB_ID) |
| 16 | `birth_date` | date | 0.1% | 1927-09-17 to 2005-09-07 | DATE | Player birth date (sourced from NFL. Other sources may differ) |
| 17 | `position_group` | text | 0.0% | 9 values: DB, DL, LB, OL, QB, RB, SPEC, TE, WR | VARCHAR(8) ascii | Postion group of player as listed by NFL |
| 18 | `position` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | Position of player as listed by NFL |
| 19 | `ngs_position_group` | text | 77.8% | up to 4 chars | VARCHAR(8) | Position group of player as listed by Next Gen Stats |
| 20 | `ngs_position` | text | 78.2% | up to 13 chars | VARCHAR(32) | Position of player as listed by Next Gen Stats |
| 21 | `height` | integer | 0.0% | 64 to 83 | TINYINT UNSIGNED | Height of player (inches) |
| 22 | `weight` | integer | 0.0% | 1 to 449 | SMALLINT UNSIGNED | Weight of player (lbs) |
| 23 | `headshot` | text | 0.6% | up to 93 chars | VARCHAR(128) | NFL headshot url for player |
| 24 | `college_name` | text | 0.4% | up to 102 chars | VARCHAR(128) | Official college (usually the last one attended) |
| 25 | `college_conference` | text | 73.1% | up to 48 chars | VARCHAR(64) | Conference of college |
| 26 | `jersey_number` | integer | 4.6% | 0 to 99 | TINYINT UNSIGNED | Latest jersey number of player |
| 27 | `rookie_season` | integer | 0.0% | 1974 to 2026 | SMALLINT UNSIGNED | 4 digit number indicating which season the player was a rookie |
| 28 | `last_season` | integer | 0.0% | 1974 to 2026 | SMALLINT UNSIGNED | 4 digit number indicating which season the player was active the last time |
| 29 | `latest_team` | text | 0.0% | up to 3 chars | VARCHAR(4) | Latest team the player was listed in |
| 30 | `status` | text | 0.0% | up to 3 chars | VARCHAR(4) | Roster status: describes things like Active, Inactive, Injured Reserve, Practice Squad etc |
| 31 | `ngs_status` | text | 66.5% | up to 3 chars | VARCHAR(4) | Next Gen Stats variant of status |
| 32 | `ngs_status_short_description` | text | 73.0% | up to 15 chars | VARCHAR(32) | Next Gen Stats status description |
| 33 | `years_of_experience` | integer | 0.0% | 0 to 26 | TINYINT UNSIGNED | Years played in league |
| 34 | `pff_position` | text | 69.0% | up to 2 chars | VARCHAR(4) | Position of player as listed by PFF |
| 35 | `pff_status` | text | 83.4% | 12 values: A, APUP, DNR, I, IR, IRD, P, PINJ, PSUS, RNFI, RPUP, S | VARCHAR(8) | Roster status as listed by PFF |
| 36 | `draft_year` | integer | 49.8% | 1974 to 2026 | SMALLINT UNSIGNED | Year that player was drafted |
| 37 | `draft_round` | integer | 49.8% | 1 to 17 | TINYINT UNSIGNED | Round that player was drafted in |
| 38 | `draft_pick` | integer | 49.8% | 1 to 472 | SMALLINT UNSIGNED | Pick number of player |
| 39 | `draft_team` | text | 49.8% | up to 3 chars | VARCHAR(4) | Team that drafted player |

### A. Season rosters (`rosters`)

Descriptions: [nflreadr dictionary](https://cloud.r-project.org/web/packages/nflreadr/vignettes/dictionary_rosters.html). 

Grain: one player on one team in one season. Natural key: season, team, gsis_id. Profiled: 31,013 rows (2017–2026). 36 columns; 36 have an nflreadr dictionary entry.

| # | Column | Observed | Nulls | Range or values | Proposed MySQL type | Description |
|---|---|---|---|---|---|---|
| 1 | `season` | integer | 0.0% | 2017 to 2026 | SMALLINT UNSIGNED | NFL season. Defaults to current year after March, otherwise is previous year. |
| 2 | `team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | NFL team. Uses official abbreviations as per NFL.com |
| 3 | `position` | text | 0.0% | 11 values: DB, DL, K, LB, LS, OL, P, QB, RB, TE, WR | VARCHAR(4) ascii | Primary position as reported by NFL.com |
| 4 | `depth_chart_position` | text | 0.0% | up to 3 chars | VARCHAR(4) | Position assigned on depth chart. Not always accurate! |
| 5 | `jersey_number` | integer | 0.4% | 0 to 99 | TINYINT UNSIGNED | Jersey number. Often useful for joins by name/team/jersey. |
| 6 | `status` | text | 0.0% | up to 3 chars | VARCHAR(4) | Roster status: describes things like Active, Inactive, Injured Reserve, Practice Squad etc |
| 7 | `full_name` | text | 0.0% | up to 29 chars | VARCHAR(64) | Full name as per NFL.com |
| 8 | `first_name` | text | 0.0% | up to 22 chars | VARCHAR(32) | First name as per NFL.com |
| 9 | `last_name` | text | 0.0% | up to 20 chars | VARCHAR(32) | Last name as per NFL.com |
| 10 | `birth_date` | date | 7.7% | 1972-12-28 to 2005-09-07 | DATE | Birthdate, as recorded by Sleeper API |
| 11 | `height` | integer | 1.2% | 65 to 83 | TINYINT UNSIGNED | Official height, in inches |
| 12 | `weight` | integer | 0.0% | 0 to 1794 | SMALLINT UNSIGNED | Official weight, in pounds |
| 13 | `college` | text | 1.3% | up to 102 chars | VARCHAR(128) | Official college (usually the last one attended) |
| 14 | `gsis_id` | text | 0.0% | up to 10 chars | VARCHAR(10) ascii_bin | Game Stats and Info Service ID: the primary ID for play-by-play data. |
| 15 | `espn_id` | integer | 33.8% | 1097 to 5344966 | INT UNSIGNED | Player ID for ESPN API |
| 16 | `sportradar_id` | text | 32.0% | up to 36 chars | VARCHAR(64) ascii | Player ID for Sportradar API |
| 17 | `yahoo_id` | integer | 39.5% | 3727 to 900125 | INT UNSIGNED | Player ID for Yahoo API |
| 18 | `rotowire_id` | integer | 31.3% | 395 to 36732 | INT UNSIGNED | Player ID for Rotowire |
| 19 | `pff_id` | integer | 38.3% | 226 to 217399 | INT UNSIGNED | Player ID for Pro Football Focus |
| 20 | `pfr_id` | text | 47.4% | up to 10 chars | VARCHAR(10) ascii_bin | Player ID for Pro Football Reference |
| 21 | `fantasy_data_id` | integer | 41.1% | 292 to 28606 | INT UNSIGNED | Player ID for FantasyData |
| 22 | `sleeper_id` | integer | 32.0% | 6 to 14059 | INT UNSIGNED | Player ID for Sleeper API |
| 23 | `years_exp` | integer | 0.1% | 0 to 29 | TINYINT UNSIGNED | Years played in league |
| 24 | `headshot_url` | text | 3.6% | up to 93 chars | VARCHAR(128) | A URL string that points to player photos used by NFL.com (or sometimes ESPN) |
| 25 | `ngs_position` | text | 64.8% | up to 13 chars | VARCHAR(32) | Primary position as reported by the NextGen stats API. |
| 26 | `week` | integer | 0.0% | 1 to 22 | TINYINT UNSIGNED | The most recent week of that season that a player appeared on the roster. |
| 27 | `game_type` | text | 0.0% | 5 values: CON, DIV, REG, SB, WC | ENUM('CON','DIV','REG','SB','WC') | The most recent game type of that season that a player appeared on the roster. |
| 28 | `status_description_abbr` | text | 14.1% | up to 3 chars | VARCHAR(4) | A code corresponding to a particular NFL status. |
| 29 | `football_name` | text | 0.0% | up to 14 chars | VARCHAR(32) | The nickname or first name typically used by a player. |
| 30 | `esb_id` | text | 0.3% | up to 9 chars | VARCHAR(16) ascii | Player ID for Elias Sports Bureau |
| 31 | `gsis_it_id` | integer | 0.0% | 17623 to 63972 | INT UNSIGNED | Player ID for the GSIS IT API |
| 32 | `smart_id` | text | 0.4% | up to 36 chars | VARCHAR(64) ascii | Player ID hash for a player's ESB ID |
| 33 | `entry_year` | integer | 0.1% | 1994 to 2026 | SMALLINT UNSIGNED | The year a player first became eligible to play in the NFL. |
| 34 | `rookie_year` | integer | 0.1% | 1994 to 2026 | SMALLINT UNSIGNED | The year a player lost their rookie eligibility. |
| 35 | `draft_club` | text | 43.8% | up to 3 chars | VARCHAR(4) | The team that originally drafted a player. NA if a player went undrafted in their draft-eligible year. |
| 36 | `draft_number` | integer | 48.8% | 1 to 262 | SMALLINT UNSIGNED | The number pick that was used to select a given player. |

### A. Injuries (`injuries`)

Descriptions: [nflreadr dictionary](https://cloud.r-project.org/web/packages/nflreadr/vignettes/dictionary_injuries.html). 

Grain: one player's report for one game week. Natural key: season, week, game_type, team, gsis_id (latest report wins). Profiled: 53,262 rows (2017–2026). 17 columns; 16 have an nflreadr dictionary entry.

| # | Column | Observed | Nulls | Range or values | Proposed MySQL type | Description |
|---|---|---|---|---|---|---|
| 1 | `season` | integer | 0.0% | 2017 to 2026 | SMALLINT UNSIGNED | 4 digit number indicating to which season(s) the specified timeframe belongs to. |
| 2 | `game_type` | text | 0.0% | 5 values: CON, DIV, REG, SB, WC | ENUM('CON','DIV','REG','SB','WC') | No dictionary entry |
| 3 | `team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | Team of injured player |
| 4 | `week` | integer | 0.0% | 1 to 22 | TINYINT UNSIGNED | Week that injury occurred |
| 5 | `gsis_id` | text | 0.0% | up to 10 chars | VARCHAR(10) ascii_bin | Game Stats and Info Service ID: the primary ID for play-by-play data. |
| 6 | `position` | text | 0.0% | up to 5 chars | VARCHAR(8) ascii | Position of injured player |
| 7 | `full_name` | text | 0.0% | up to 27 chars | VARCHAR(64) | Full name of player |
| 8 | `first_name` | text | 0.0% | up to 18 chars | VARCHAR(32) | First name of player |
| 9 | `last_name` | text | 0.0% | up to 17 chars | VARCHAR(32) | Last name of player |
| 10 | `report_primary_injury` | text | 53.2% | up to 154 chars | VARCHAR(255) | Primary injury listed on official injury report |
| 11 | `report_secondary_injury` | text | 96.6% | up to 98 chars | VARCHAR(128) | Secondary injury listed on official injury report |
| 12 | `report_status` | text | 53.2% | 4 values: Doubtful, Note, Out, Questionable | VARCHAR(16) | Player’s status for game on official injury report |
| 13 | `practice_primary_injury` | text | 0.5% | up to 80 chars | VARCHAR(128) | Primary injury listed on practice injury report |
| 14 | `practice_secondary_injury` | text | 93.1% | up to 36 chars | VARCHAR(64) | Secondary injury listed on practice injury report |
| 15 | `practice_status` | text | 0.1% | 5 values:      , Did Not Participate In Practice, Full Participation in Practice, Limited Participation in Practice, Note | VARCHAR(64) | Player’s participation in practice |
| 16 | `date_modified` | datetime | 16.7% | 2017-09-06T08:51:15Z to 2025-02-07T20:32:07Z | DATETIME (UTC) | Date and time that injury information was updated |
| 17 | `season_type` | text | 83.3% | 2 values: POST, REG | ENUM('POST','REG') | REG or POST indicating if the timeframe belongs to regular or post season. |

### A. Snap counts (`snap_counts`)

Descriptions: [nflreadr dictionary](https://ftp.fau.de/cran/web/packages/nflreadr/vignettes/dictionary_snap_counts.html). 

Grain: one player in one game. Natural key: game_id, pfr_player_id. Profiled: 240,602 rows (2017–2026). 16 columns; 16 have an nflreadr dictionary entry.

| # | Column | Observed | Nulls | Range or values | Proposed MySQL type | Description |
|---|---|---|---|---|---|---|
| 1 | `game_id` | text | 0.0% | up to 15 chars | VARCHAR(32) ascii | nflfastR game ID |
| 2 | `pfr_game_id` | text | 0.0% | up to 12 chars | VARCHAR(16) ascii | PFR game ID |
| 3 | `season` | integer | 0.0% | 2017 to 2026 | SMALLINT UNSIGNED | Season of game |
| 4 | `game_type` | text | 0.0% | 5 values: CON, DIV, REG, SB, WC | ENUM('CON','DIV','REG','SB','WC') | Type of game (regular or postseason) |
| 5 | `week` | integer | 0.0% | 1 to 22 | TINYINT UNSIGNED | Week of game in NFL season |
| 6 | `player` | text | 0.0% | up to 27 chars | VARCHAR(64) | Player name |
| 7 | `pfr_player_id` | text | 0.0% | up to 10 chars | VARCHAR(10) ascii_bin | Player PFR ID |
| 8 | `position` | text | 0.0% | up to 4 chars | VARCHAR(8) ascii | Position of player |
| 9 | `team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | Team of player |
| 10 | `opponent` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | Opposing team of player |
| 11 | `offense_snaps` | integer | 0.0% | 0 to 100 | TINYINT UNSIGNED | Number of snaps on offense |
| 12 | `offense_pct` | decimal | 0.0% | 0 to 1 | DOUBLE | Percent of offensive snaps taken |
| 13 | `defense_snaps` | integer | 0.0% | 0 to 100 | TINYINT UNSIGNED | Number of snaps on defense |
| 14 | `defense_pct` | decimal | 0.0% | 0 to 1 | DOUBLE | Percent of defensive snaps taken |
| 15 | `st_snaps` | integer | 0.0% | 0 to 39 | TINYINT UNSIGNED | Number of snaps on special teams |
| 16 | `st_pct` | decimal | 0.0% | 0 to 1.01 | DOUBLE | Percent of special teams snaps taken |

### A. Depth charts (`depth_charts`, current season)

Descriptions: [nflreadr dictionary](https://ftp.fau.de/cran/web/packages/nflreadr/vignettes/dictionary_depth_charts.html). 

Grain: one player in one depth-chart slot at one dated snapshot. Natural key: dt, team, pos_grp_id, pos_slot, pos_rank. Profiled: 763,791 rows (2026 to date, 285 snapshots). 12 columns; 12 have an nflreadr dictionary entry.

| # | Column | Observed | Nulls | Range or values | Proposed MySQL type | Description |
|---|---|---|---|---|---|---|
| 1 | `dt` | datetime | 0.0% | 2026-03-22T06:38:42Z to 2026-11-08T14:14:26Z | DATETIME (UTC) | ISO8601 timestamp of when the record was loaded, used to place the data at a point in the season |
| 2 | `team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | Team the depth chart belongs to |
| 3 | `player_name` | text | 0.2% | up to 26 chars | VARCHAR(64) | Player's full name |
| 4 | `espn_id` | integer | 0.0% | 8439 to 5393270 | INT UNSIGNED | Player's ESPN ID |
| 5 | `gsis_id` | text | 3.2% | up to 10 chars | VARCHAR(10) ascii_bin | Player's Game Stats and Info Service ID, the primary key for play-by-play data |
| 6 | `pos_grp_id` | integer | 0.0% | 15 to 21 | INT UNSIGNED | Identifier for the player's position group |
| 7 | `pos_grp` | text | 0.0% | 4 values: 3WR 1TE, Base 3-4 D, Base 4-3 D, Special Teams | VARCHAR(32) | Position group, indicating the offense, defense, or special teams formation |
| 8 | `pos_id` | integer | 0.0% | 1 to 79 | INT UNSIGNED | Identifier for the player's position |
| 9 | `pos_name` | text | 0.0% | up to 23 chars | VARCHAR(32) | Full name of the player's position |
| 10 | `pos_abb` | text | 0.0% | up to 4 chars | VARCHAR(8) | Abbreviated position label |
| 11 | `pos_slot` | integer | 0.0% | 1 to 12 | TINYINT UNSIGNED | Number assigned to each position in a formation |
| 12 | `pos_rank` | integer | 0.0% | 1 to 16 | TINYINT UNSIGNED | Player's rank on the depth chart within each pos_slot |

