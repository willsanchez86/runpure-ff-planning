# Implementation Spec — Data ETL & Storage: Appendix A, part 2 of 5

**Weekly team stats, schedules and teams.** Part of [`ff-data-etl-storage-spec.md`](ff-data-etl-storage-spec.md), §7.2; split into five files only because of file-size limits.

Every column of every ingested file, profiled 2026-11-08. **Observed** is the type found in the data; **Nulls** the share of empty values; **Proposed MySQL type** applies §7.2.2 (integers sized to twice the largest value seen). Descriptions come from nflverse's dictionaries, linked per dataset; where a dataset's note says so, they are approximate or borrowed.

### A. Weekly team stats (`stats_team`)

Descriptions: [nflreadr dictionary](https://ftp.fau.de/cran/web/packages/nflreadr/vignettes/dictionary_player_stats.html). No team-stats dictionary could be fetched; descriptions are the player-stats entries for the same column names.

Grain: one team in one week. Natural key: team, season, week, season_type. Profiled: 5,232 rows (2017–2026). 138 columns; 101 have an nflreadr dictionary entry.

| # | Column | Observed | Nulls | Range or values | Proposed MySQL type | Description |
|---|---|---|---|---|---|---|
| 1 | `season` | integer | 0.0% | 2017 to 2026 | SMALLINT UNSIGNED | Official NFL season |
| 2 | `week` | integer | 0.0% | 1 to 22 | TINYINT UNSIGNED | Game week number |
| 3 | `team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | Abbreviation of player’s team |
| 4 | `season_type` | text | 0.0% | 2 values: POST, REG | ENUM('POST','REG') | `REG` for regular season, `POST` for postseason |
| 5 | `game_id` | text | 0.0% | up to 15 chars | VARCHAR(32) ascii | No dictionary entry |
| 6 | `opponent_team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | Abbreviation of opponent’s team |
| 7 | `completions` | integer | 0.0% | 0 to 47 | TINYINT UNSIGNED | The number of completed passes. |
| 8 | `attempts` | integer | 0.0% | 3 to 68 | TINYINT UNSIGNED | The number of pass attempts as defined by the NFL. |
| 9 | `passing_yards` | integer | 0.0% | 0 to 525 | SMALLINT UNSIGNED | Yards gained on pass plays. |
| 10 | `passing_tds` | integer | 0.0% | 0 to 6 | TINYINT UNSIGNED | The number of passing touchdowns. |
| 11 | `passing_interceptions` | integer | 0.0% | 0 to 5 | TINYINT UNSIGNED | Number of passing interceptions |
| 12 | `sacks_suffered` | integer | 0.0% | 0 to 11 | TINYINT UNSIGNED | Number of sacks taken as a QB |
| 13 | `sack_yards_lost` | integer | 0.0% | -82 to 0 | SMALLINT | Yards lost from sacks suffered by this player |
| 14 | `sack_fumbles` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | The number of sacks suffered with a fumble. |
| 15 | `sack_fumbles_lost` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | The number of sacks suffered with a lost fumble. |
| 16 | `passing_air_yards` | integer | 0.0% | 15 to 770 | SMALLINT UNSIGNED | Passing air yards (includes incomplete passes). |
| 17 | `passing_yards_after_catch` | integer | 0.0% | 0 to 292 | SMALLINT UNSIGNED | Yards after the catch gained on plays in which player was the passer (this is an unofficial stat and may differ slightly between different sources). |
| 18 | `passing_first_downs` | integer | 0.0% | 0 to 29 | TINYINT UNSIGNED | First downs on pass attempts. |
| 19 | `passing_epa` | decimal | 0.0% | -40.4754 to 37.9897 | DOUBLE | Total expected points added on pass attempts and sacks. NOTE: this uses the variable `qb_epa`, which gives QB credit for EPA for up to the point where a receiver lost a fumble after a completed catch and makes EPA work m |
| 20 | `passing_cpoe` | decimal | 0.0% | -48.9692 to 29.0404 | DOUBLE | Completion percentage over expected for this player. |
| 21 | `passing_2pt_conversions` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Two-point conversion passes. |
| 22 | `passing_10` | integer | 0.0% | 0 to 26 | TINYINT UNSIGNED | No dictionary entry |
| 23 | `passing_16` | integer | 0.0% | 0 to 14 | TINYINT UNSIGNED | No dictionary entry |
| 24 | `passing_20` | integer | 0.0% | 0 to 11 | TINYINT UNSIGNED | No dictionary entry |
| 25 | `passing_40` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | No dictionary entry |
| 26 | `carries` | integer | 0.0% | 5 to 56 | TINYINT UNSIGNED | The number of official rush attempts (incl. scrambles and kneel downs). Rushes after a lateral reception don’t count as carry. |
| 27 | `rushing_yards` | integer | 0.0% | -1 to 404 | SMALLINT | Yards gained when rushing with the ball (incl. scrambles and kneel downs). Also includes yards gained after obtaining a lateral on a play that started with a rushing attempt. |
| 28 | `rushing_tds` | integer | 0.0% | 0 to 7 | TINYINT UNSIGNED | The number of rushing touchdowns (incl. scrambles). Also includes touchdowns after obtaining a lateral on a play that started with a rushing attempt. |
| 29 | `rushing_fumbles` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | The number of rushes with a fumble. |
| 30 | `rushing_fumbles_lost` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | The number of rushes with a lost fumble. |
| 31 | `rushing_first_downs` | integer | 0.0% | 0 to 22 | TINYINT UNSIGNED | First downs on rush attempts (incl. scrambles). |
| 32 | `rushing_epa` | decimal | 0.0% | -24.6504 to 19.2924 | DOUBLE | Expected points added on rush attempts (incl. scrambles and kneel downs). |
| 33 | `rushing_2pt_conversions` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Two-point conversion rushes |
| 34 | `rushing_10` | integer | 0.0% | 0 to 12 | TINYINT UNSIGNED | No dictionary entry |
| 35 | `rushing_12` | integer | 0.0% | 0 to 10 | TINYINT UNSIGNED | No dictionary entry |
| 36 | `rushing_20` | integer | 0.0% | 0 to 7 | TINYINT UNSIGNED | No dictionary entry |
| 37 | `rushing_40` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | No dictionary entry |
| 38 | `receptions` | integer | 0.0% | 0 to 47 | TINYINT UNSIGNED | The number of pass receptions. Lateral receptions officially don’t count as reception. |
| 39 | `targets` | integer | 0.0% | 3 to 68 | TINYINT UNSIGNED | The number of pass plays where the player was the targeted receiver. |
| 40 | `receiving_yards` | integer | 0.0% | 0 to 525 | SMALLINT UNSIGNED | Yards gained after a pass reception. Includes yards gained after receiving a lateral on a play that started as a pass play. |
| 41 | `receiving_tds` | integer | 0.0% | 0 to 6 | TINYINT UNSIGNED | The number of touchdowns following a pass reception. Also includes touchdowns after receiving a lateral on a play that started as a pass play. |
| 42 | `receiving_fumbles` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | The number of fumbles after a pass reception. |
| 43 | `receiving_fumbles_lost` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | The number of fumbles lost after a pass reception. |
| 44 | `receiving_air_yards` | integer | 0.0% | 15 to 770 | SMALLINT UNSIGNED | Receiving air yards (incl. incomplete passes). |
| 45 | `receiving_yards_after_catch` | integer | 0.0% | 0 to 292 | SMALLINT UNSIGNED | Yards after the catch gained on plays in which player was receiver (this is an unofficial stat and may differ slightly between different sources). |
| 46 | `receiving_first_downs` | integer | 0.0% | 0 to 29 | TINYINT UNSIGNED | Total number of first downs gained on receptions |
| 47 | `receiving_epa` | decimal | 0.0% | -30.2176 to 39.1626 | DOUBLE | Total EPA on plays where this receiver was targeted |
| 48 | `receiving_2pt_conversions` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Two-point conversion receptions |
| 49 | `receiving_10` | integer | 0.0% | 0 to 26 | TINYINT UNSIGNED | No dictionary entry |
| 50 | `receiving_16` | integer | 0.0% | 0 to 14 | TINYINT UNSIGNED | No dictionary entry |
| 51 | `receiving_20` | integer | 0.0% | 0 to 11 | TINYINT UNSIGNED | No dictionary entry |
| 52 | `receiving_40` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | No dictionary entry |
| 53 | `special_teams_tds` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Total number of kick/punt return touchdowns |
| 54 | `def_tackles_solo` | integer | 0.0% | 13 to 67 | TINYINT UNSIGNED | Total number of solo tackles for this player |
| 55 | `def_tackles_with_assist` | integer | 0.0% | 0 to 29 | TINYINT UNSIGNED | Number of tackles this player had with an assisted tackle |
| 56 | `def_tackle_assists` | integer | 0.0% | 0 to 61 | TINYINT UNSIGNED | Number of assisted tackles for this player |
| 57 | `def_tackles_for_loss` | integer | 0.0% | 0 to 13 | TINYINT UNSIGNED | Number of tackles for loss (TFL) for this player |
| 58 | `def_tackles_for_loss_yards` | integer | 0.0% | 0 to 84 | TINYINT UNSIGNED | Yards lost from TFLs involving this player |
| 59 | `def_fumbles_forced` | integer | 0.0% | 0 to 5 | TINYINT UNSIGNED | Number of times a fumble was forced from this player |
| 60 | `def_sacks` | integer | 0.0% | 0 to 11 | TINYINT UNSIGNED | Number of sacks form this player |
| 61 | `def_sack_yards` | integer | 0.0% | 0 to 82 | TINYINT UNSIGNED | Yards lost from sacks forced by this player |
| 62 | `def_qb_hits` | integer | 0.0% | 0 to 20 | TINYINT UNSIGNED | Number of QB hits from this player (should not include plays where the QB was sacked) |
| 63 | `def_interceptions` | integer | 0.0% | 0 to 5 | TINYINT UNSIGNED | Number of interceptions forced by this player |
| 64 | `def_interception_yards` | integer | 0.0% | -7 to 171 | SMALLINT | yards gained/lost by interception returns from this player |
| 65 | `def_pass_defended` | integer | 0.0% | 0 to 16 | TINYINT UNSIGNED | Number of passes defended/broken up by this player |
| 66 | `def_tds` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Number of defensive touchdowns scored by this player |
| 67 | `def_fumbles` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | Number of fumbles by this player |
| 68 | `def_safeties` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Number of safeties forced by this player |
| 69 | `def_punt_blocks` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | No dictionary entry |
| 70 | `def_pat_blocks` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | No dictionary entry |
| 71 | `def_fg_blocks` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | No dictionary entry |
| 72 | `def_2pt_atts` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | No dictionary entry |
| 73 | `def_2pt_made` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | No dictionary entry |
| 74 | `misc_yards` | integer | 0.0% | -8 to 109 | SMALLINT | Miscellaneous yards attributed to this player |
| 75 | `fumble_recovery_own` | integer | 0.0% | 0 to 6 | TINYINT UNSIGNED | Number of the player’s own team fumbles recovered |
| 76 | `fumble_recovery_yards_own` | integer | 0.0% | -41 to 57 | TINYINT | Yards gained/lost on own fumble recoveries |
| 77 | `fumble_recovery_opp` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Number of the opponent’s fumbles recovered |
| 78 | `fumble_recovery_yards_opp` | integer | 0.0% | -22 to 114 | SMALLINT | Yardage on opponent fumble recoveries |
| 79 | `fumble_recovery_tds` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Fumbles recovered and advanced for a touchdown |
| 80 | `penalties` | integer | 0.0% | 0 to 19 | TINYINT UNSIGNED | Number of penalties attributed to this player |
| 81 | `penalty_yards` | integer | 0.0% | 0 to 182 | SMALLINT UNSIGNED | Penalty yardage on penalties attributed to this player |
| 82 | `timeouts` | integer | 0.0% | 0 to 9 | TINYINT UNSIGNED | No dictionary entry |
| 83 | `fumbles_forced_by_opp` | integer | 0.0% | 0 to 5 | TINYINT UNSIGNED | No dictionary entry |
| 84 | `fumbles_not_forced` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | No dictionary entry |
| 85 | `fumbles_out_of_bounds` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | No dictionary entry |
| 86 | `fumbles_total` | integer | 0.0% | 0 to 7 | TINYINT UNSIGNED | No dictionary entry |
| 87 | `fumbles_lost_total` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | No dictionary entry |
| 88 | `punt_returns` | integer | 0.0% | 0 to 8 | TINYINT UNSIGNED | Count of punt returns by this player |
| 89 | `punt_return_yards` | integer | 0.0% | -15 to 195 | SMALLINT | Yards gained on punts returned by this player |
| 90 | `kickoff_returns` | integer | 0.0% | 0 to 9 | TINYINT UNSIGNED | Count of kick returns by this player |
| 91 | `kickoff_return_yards` | integer | 0.0% | -1 to 297 | SMALLINT | Yards gained on kick returns by this player |
| 92 | `fg_made` | integer | 0.0% | 0 to 7 | TINYINT UNSIGNED | Count of field goals made by this player |
| 93 | `fg_att` | integer | 0.0% | 0 to 8 | TINYINT UNSIGNED | Count of field goals attempted by this player |
| 94 | `fg_missed` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Count of field goals missed by this player |
| 95 | `fg_blocked` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Count of field goals attempted by this player that were blocked |
| 96 | `fg_long` | integer | 17.4% | 19 to 68 | TINYINT UNSIGNED | Longest successful field goal made by this player |
| 97 | `fg_pct` | decimal | 11.9% | 0 to 1 | DOUBLE | Percentage of field goals successfully made |
| 98 | `fg_made_0_19` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of field goals within 0-19 yards made by this player |
| 99 | `fg_made_20_29` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Count of field goals within 20-29 yards made by this player |
| 100 | `fg_made_30_39` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Count of field goals within 30-39 yards made by this player |
| 101 | `fg_made_40_49` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Count of field goals within 40-49 yards made by this player |
| 102 | `fg_made_50_59` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Count of field goals within 50-59 yards made by this player |
| 103 | `fg_made_60_` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of field goals over 60 yards made by this player |
| 104 | `fg_missed_0_19` | integer | 0.0% | 0 to 0 | TINYINT UNSIGNED | Count of field goals missed between 0-19 yards by this player |
| 105 | `fg_missed_20_29` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of field goals missed between 20-29 yards by this player |
| 106 | `fg_missed_30_39` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Count of field goals missed between 30-39 yards by this player |
| 107 | `fg_missed_40_49` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Count of field goals missed between 40-49 yards by this player |
| 108 | `fg_missed_50_59` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | Count of field goals missed between 50-59 yards by this player |
| 109 | `fg_missed_60_` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of field goals missed over 60 yards by this player |
| 110 | `fg_made_list` | text | 17.4% | up to 20 chars | VARCHAR(32) | Comma-separated string listing lengths of field goals made |
| 111 | `fg_missed_list` | text | 76.6% | up to 11 chars | VARCHAR(16) | Comma-separated string listing lengths of field goals missed |
| 112 | `fg_blocked_list` | text | 96.6% | up to 5 chars | VARCHAR(8) | Comma-separated string listing lengths of field goals blocked |
| 113 | `fg_made_distance` | integer | 0.0% | 0 to 274 | SMALLINT UNSIGNED | Total distance on field goals made |
| 114 | `fg_missed_distance` | integer | 0.0% | 0 to 177 | SMALLINT UNSIGNED | Total distance on field goals missed |
| 115 | `fg_blocked_distance` | integer | 0.0% | 0 to 133 | SMALLINT UNSIGNED | Total distance on field goals blocked |
| 116 | `pat_made` | integer | 0.0% | 0 to 10 | TINYINT UNSIGNED | Count of extra point kicks made |
| 117 | `pat_att` | integer | 0.0% | 0 to 10 | TINYINT UNSIGNED | Count of extra point kicks attempted |
| 118 | `pat_missed` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Count of extra point kicks missed |
| 119 | `pat_blocked` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Count of extra point kicks blocked |
| 120 | `pat_pct` | decimal | 9.7% | 0 to 1 | DOUBLE | Percentage of extra point kicks successfully completed |
| 121 | `gwfg_made` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of game winning field goals made |
| 122 | `gwfg_att` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of game winning field goals attempted |
| 123 | `gwfg_missed` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of game winning field goals missed |
| 124 | `gwfg_blocked` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of game winning field goals blocked |
| 125 | `gwfg_distance` | integer | 0.0% | 0 to 68 | TINYINT UNSIGNED | Total distance on game winning field goals completed |
| 126 | `pt_att` | integer | 0.0% | 0 to 13 | TINYINT UNSIGNED | No dictionary entry |
| 127 | `pt_blocked` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | No dictionary entry |
| 128 | `pt_long` | integer | 1.5% | 15 to 84 | TINYINT UNSIGNED | No dictionary entry |
| 129 | `pt_yards` | integer | 0.0% | 0 to 549 | SMALLINT UNSIGNED | No dictionary entry |
| 130 | `pt_inside_20` | integer | 0.0% | 0 to 8 | TINYINT UNSIGNED | No dictionary entry |
| 131 | `pt_out_of_bounds` | integer | 0.0% | 0 to 5 | TINYINT UNSIGNED | No dictionary entry |
| 132 | `pt_downed` | integer | 0.0% | 0 to 6 | TINYINT UNSIGNED | No dictionary entry |
| 133 | `pt_touchback` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | No dictionary entry |
| 134 | `pt_fair_caught` | integer | 0.0% | 0 to 7 | TINYINT UNSIGNED | No dictionary entry |
| 135 | `pt_returned` | integer | 0.0% | 0 to 8 | TINYINT UNSIGNED | No dictionary entry |
| 136 | `pt_return_yards` | integer | 0.0% | -15 to 195 | SMALLINT | No dictionary entry |
| 137 | `pt_return_tds` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | No dictionary entry |
| 138 | `pt_net_yards` | integer | 0.0% | -36 to 529 | SMALLINT | No dictionary entry |

### A. Schedules (`schedules/games.csv`)

Descriptions: [nflreadr dictionary](https://nflverse.r-universe.dev/nflreadr/data/dictionary_schedules/ndjson). 

Grain: one game. Natural key: game_id. Profiled: 7,548 rows (single file, 1999–2026). 46 columns; 45 have an nflreadr dictionary entry.

| # | Column | Observed | Nulls | Range or values | Proposed MySQL type | Description |
|---|---|---|---|---|---|---|
| 1 | `game_id` | text | 0.0% | up to 15 chars | VARCHAR(32) ascii | A human-readable game ID. It consists of: the season, an underscore, the two-digit week number, an underscore, the away team, an underscore, the home team. This is the primary identifier for a given game and is also used |
| 2 | `season` | integer | 0.0% | 1999 to 2026 | SMALLINT UNSIGNED | The year of the NFL season. This represents the whole season, so regular season games that happen in January as well as playoff games will occur in the year after this number. |
| 3 | `game_type` | text | 0.0% | 5 values: CON, DIV, REG, SB, WC | ENUM('CON','DIV','REG','SB','WC') | What type of game? One of REG, WC, DIV, CON, SB |
| 4 | `week` | integer | 0.0% | 1 to 22 | TINYINT UNSIGNED | The week of the NFL season the game occurs in. Please note that the `game_type` will differ for weeks >= 18 because of the season expansion in 2021. Please use `game_type` to filter for regular season or postseason. |
| 5 | `gameday` | date | 0.0% | 1999-09-12 to 2027-01-10 | DATE | The date on which the game occurred. |
| 6 | `weekday` | text | 0.0% | 7 values: Friday, Monday, Saturday, Sunday, Thursday, Tuesday, Wednesday | VARCHAR(16) | The day of the week on which the game occcured. |
| 7 | `gametime` | time | 3.4% |  | TIME | The kickoff time of the game. This is represented in 24-hour time and the Eastern time zone, regardless of what time zone the game was being played in. |
| 8 | `away_team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | The away team. |
| 9 | `away_score` | integer | 2.0% | 0 to 59 | TINYINT UNSIGNED | The number of points the away team scored. Is NA for games which haven't yet been played. |
| 10 | `home_team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | The home team. Note that this contains the designated home team for games which no team is playing at home such as Super Bowls or NFL International games. |
| 11 | `home_score` | integer | 2.0% | 0 to 70 | TINYINT UNSIGNED | The number of points the home team scored. Is NA for games which haven't yet been played. |
| 12 | `location` | text | 0.0% | 2 values: Home, Neutral | ENUM('Home','Neutral') | Either Home if the home team is playing in their home stadium, or Neutral if the game is being played at a neutral location. This still shows as Home for games between the Giants and Jets even though they share the same  |
| 13 | `result` | integer | 2.0% | -49 to 59 | TINYINT | The number of points the home team scored minus the number of points the visiting team scored. Equals h_score - v_score. Is NA for games which haven't yet been played. Convenient for evaluating against the spread bets. |
| 14 | `total` | integer | 2.0% | 3 to 106 | TINYINT UNSIGNED | The sum of each team's score in the game. Equals h_score + v_score. Is NA for games which haven't yet been played. Convenient for evaluating over/under total bets. |
| 15 | `overtime` | integer | 2.0% | 0 to 1 | TINYINT UNSIGNED | Binary indicator of whether or not game went to overtime. |
| 16 | `old_game_id` | integer | 0.0% | 1999091200 to 2027011015 | INT UNSIGNED | The old id for the game assigned by the NFL. |
| 17 | `gsis` | integer | 1.8% | 588 to 1999101011 | INT UNSIGNED | The id of the game issued by the NFL Game Statistics & Information System. |
| 18 | `nfl_detail_id` | text | 96.4% | up to 36 chars | VARCHAR(64) ascii | The id of the game issued by NFL Detail. |
| 19 | `pfr` | text | 0.0% | up to 12 chars | VARCHAR(16) | The id of the game issued by [Pro-Football-Reference](https://www.pro-football-reference.com/) |
| 20 | `pff` | integer | 38.1% | 731 to 30726 | SMALLINT UNSIGNED | The id of the game issued by [Pro Football Focus](https://www.pff.com/) |
| 21 | `espn` | integer | 0.0% | 190912001 to 401873187 | INT UNSIGNED | The id of the game issued by [ESPN](https://www.espn.com/) |
| 22 | `ftn` | integer | 74.2% | 5058 to 7290 | SMALLINT UNSIGNED | No dictionary entry |
| 23 | `away_rest` | integer | 0.0% | 4 to 21 | TINYINT UNSIGNED | Days of rest that the away team is coming off of. |
| 24 | `home_rest` | integer | 0.0% | 4 to 16 | TINYINT UNSIGNED | Days of rest that the home team is coming off of. |
| 25 | `away_moneyline` | integer | 28.0% | -1800 to 2173 | SMALLINT | Odds for away team to win the game. |
| 26 | `home_moneyline` | integer | 28.0% | -5000 to 1100 | SMALLINT | Odds for home team to win the game. |
| 27 | `spread_line` | decimal | 1.8% | -19 to 27 | DOUBLE | The spread line for the game. A positive number means the home team was favored by that many points, a negative number means the away team was favored by that many points. This lines up with the result column. |
| 28 | `away_spread_odds` | integer | 28.0% | -137 to 138 | SMALLINT | Odds for away team to cover the spread. |
| 29 | `home_spread_odds` | integer | 28.0% | -146 to 126 | SMALLINT | Odds for home team to cover the spread. |
| 30 | `total_line` | decimal | 1.8% | 28.5 to 63.5 | DOUBLE | The total line for the game. |
| 31 | `under_odds` | integer | 28.1% | -125 to 113 | SMALLINT | Odds that total score of game would be under the total_line. |
| 32 | `over_odds` | integer | 28.1% | -125 to 113 | SMALLINT | Odds that total score of game would be over the total_ine. |
| 33 | `div_game` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Binary indicator of whether or not game was played by 2 teams in the same division. |
| 34 | `roof` | text | 0.3% | 4 values: closed, dome, open, outdoors | VARCHAR(16) | What was the status of the stadium's roof? One of outdoors, open, closed, dome |
| 35 | `surface` | text | 1.4% | 9 values: a_turf, astroplay, astroturf, dessograss, fieldturf, grass, grass , matrixturf, sportturf | VARCHAR(16) | What type of ground the game was played on |
| 36 | `temp` | integer | 30.4% | -6 to 109 | SMALLINT | The temperature at the stadium (for outdoors and open only) |
| 37 | `wind` | integer | 30.4% | 0 to 71 | TINYINT UNSIGNED | The speed of the wind in miles/hour (for outdoors and open only) |
| 38 | `away_qb_id` | text | 1.6% | up to 10 chars | VARCHAR(10) ascii_bin | GSIS Player ID for away team starting quarterback. |
| 39 | `home_qb_id` | text | 1.6% | up to 10 chars | VARCHAR(10) ascii_bin | GSIS Player ID for home team starting quarterback. |
| 40 | `away_qb_name` | text | 1.6% | up to 24 chars | VARCHAR(32) | Name of away team starting QB. |
| 41 | `home_qb_name` | text | 1.6% | up to 24 chars | VARCHAR(32) | Name of home team starting QB. |
| 42 | `away_coach` | text | 0.0% | up to 20 chars | VARCHAR(32) | Name of the head coach of the away team |
| 43 | `home_coach` | text | 0.0% | up to 20 chars | VARCHAR(32) | Name of the head coach of the home team |
| 44 | `referee` | text | 2.8% | up to 16 chars | VARCHAR(32) | Name of the game's referee (head official) |
| 45 | `stadium_id` | text | 0.0% | up to 5 chars | VARCHAR(8) ascii | ID of Stadium that game took place in |
| 46 | `stadium` | text | 0.0% | up to 35 chars | VARCHAR(64) | Name of the stadium |

### A. Teams (`teams/teams_colors_logos.csv`)

No nflverse dictionary was fetched for this file; descriptions are read from the column names and values (*inference*).

Grain: one team code. Natural key: team_abbr. Profiled: 36 rows (single file), 2026-11-09 UTC. 16 columns. Relocated teams keep their old codes as separate rows (OAK, SD, STL), and Los Angeles appears as both LA and LAR, so team codes from 2017–2019 rows join to this table.

| # | Column | Observed | Nulls | Range or values | Proposed MySQL type | Description |
|---|---|---|---|---|---|---|
| 1 | `team_abbr` | text | 0.0% | 36 codes, up to 3 chars; includes OAK, SD, STL, LA and LAR | VARCHAR(4) ascii | Team code; matches the team columns in every other table |
| 2 | `team_name` | text | 0.0% | up to 21 chars | VARCHAR(32) | Full team name |
| 3 | `team_id` | text | 0.0% | 4 chars, leading zeros (e.g. 0200); 32 values | CHAR(4) ascii | Numeric team ID kept as text; relocated codes share their franchise's ID |
| 4 | `team_nick` | text | 0.0% | up to 10 chars | VARCHAR(16) | Team nickname |
| 5 | `team_conf` | text | 0.0% | 2 values: AFC, NFC | ENUM('AFC','NFC') | Conference |
| 6 | `team_division` | text | 0.0% | 8 values, up to 9 chars | VARCHAR(16) | Division, e.g. NFC West |
| 7 | `team_color` | text | 0.0% | 7 chars (#RRGGBB) | CHAR(7) ascii | Primary color |
| 8 | `team_color2` | text | 0.0% | 7 chars | CHAR(7) ascii | Second color |
| 9 | `team_color3` | text | 5.6% | 7 chars | CHAR(7) ascii | Third color |
| 10 | `team_color4` | text | 5.6% | 7 chars | CHAR(7) ascii | Fourth color |
| 11 | `team_logo_wikipedia` | text | 0.0% | URL, up to 125 chars | VARCHAR(255) | Logo image URL (Wikipedia) |
| 12 | `team_logo_espn` | text | 0.0% | URL, up to 54 chars | VARCHAR(255) | Logo image URL (ESPN) |
| 13 | `team_wordmark` | text | 0.0% | URL, up to 69 chars | VARCHAR(255) | Wordmark image URL |
| 14 | `team_conference_logo` | text | 0.0% | URL, up to 59 chars; 2 values | VARCHAR(255) | Conference logo URL |
| 15 | `team_league_logo` | text | 0.0% | URL, up to 70 chars; 1 value | VARCHAR(255) | League logo URL |
| 16 | `team_logo_squared` | text | 0.0% | URL, up to 73 chars | VARCHAR(255) | Square logo URL |
