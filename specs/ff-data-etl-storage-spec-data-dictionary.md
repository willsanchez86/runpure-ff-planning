# Implementation Spec — Data ETL & Storage: Appendix A, Data dictionary

Part of [`ff-data-etl-storage-spec.md`](ff-data-etl-storage-spec.md), §7.2. Merged 2026-11-09 from the earlier five part files (A1–A5), which were split only because of a tool size limit.

Every column of every ingested file, profiled 2026-11-08 (teams and depth charts 2026-11-09 UTC). **Observed** is the type found in the data; **Nulls** the share of empty values; **Proposed MySQL type** applies §7.2.2 (integers sized to twice the largest value seen). Descriptions come from nflverse's dictionaries, linked per dataset; where a dataset's note says so, they are approximate or borrowed.

## A1. Weekly player stats (`stats_player`)

Descriptions: [nflreadr dictionary](https://ftp.fau.de/cran/web/packages/nflreadr/vignettes/dictionary_player_stats.html). The dictionary predates 36 newer columns, shown as having no entry.

Grain: one player in one week. Natural key: season, season_type, week, player_id. Profiled: 173,203 rows (2017–2026). 150 columns; 114 have an nflreadr dictionary entry.

| # | Column | Observed | Nulls | Range or values | Proposed MySQL type | Description |
|---|---|---|---|---|---|---|
| 1 | `player_id` | text | 0.1% | up to 10 chars | VARCHAR(10) ascii_bin | Player’s gsis_id. Use this to join to other sources, e.g. load_players(). |
| 2 | `player_name` | text | 0.1% | up to 19 chars | VARCHAR(32) | Abbreviated name of player as provided by playstats api |
| 3 | `player_display_name` | text | 0.1% | up to 27 chars | VARCHAR(64) | Name of player as provided by `load_players()` |
| 4 | `position` | text | 0.1% | up to 3 chars | VARCHAR(4) ascii | Position of player as listed by NFL |
| 5 | `position_group` | text | 0.1% | 9 values: DB, DL, LB, OL, QB, RB, SPEC, TE, WR | VARCHAR(8) ascii | Position group of player as listed by NFL |
| 6 | `headshot_url` | text | 0.1% | up to 93 chars | VARCHAR(128) | Player’s nfl.com headshot URL |
| 7 | `season` | integer | 0.0% | 2017 to 2026 | SMALLINT UNSIGNED | Official NFL season |
| 8 | `week` | integer | 0.0% | 1 to 22 | TINYINT UNSIGNED | Game week number |
| 9 | `season_type` | text | 0.0% | 2 values: POST, REG | ENUM('POST','REG') | `REG` for regular season, `POST` for postseason |
| 10 | `game_id` | text | 0.0% | up to 15 chars | VARCHAR(32) ascii | No dictionary entry |
| 11 | `team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | Abbreviation of player’s team |
| 12 | `opponent_team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | Abbreviation of opponent’s team |
| 13 | `completions` | integer | 0.0% | 0 to 47 | TINYINT UNSIGNED | The number of completed passes. |
| 14 | `attempts` | integer | 0.0% | 0 to 68 | TINYINT UNSIGNED | The number of pass attempts as defined by the NFL. |
| 15 | `passing_yards` | integer | 0.0% | -7 to 525 | SMALLINT | Yards gained on pass plays. |
| 16 | `passing_tds` | integer | 0.0% | 0 to 6 | TINYINT UNSIGNED | The number of passing touchdowns. |
| 17 | `passing_interceptions` | integer | 0.0% | 0 to 5 | TINYINT UNSIGNED | Number of passing interceptions |
| 18 | `sacks_suffered` | integer | 0.0% | 0 to 11 | TINYINT UNSIGNED | Number of sacks taken as a QB |
| 19 | `sack_yards_lost` | integer | 0.0% | -82 to 0 | SMALLINT | Yards lost from sacks suffered by this player |
| 20 | `sack_fumbles` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | The number of sacks suffered with a fumble. |
| 21 | `sack_fumbles_lost` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | The number of sacks suffered with a lost fumble. |
| 22 | `passing_air_yards` | integer | 0.0% | -17 to 770 | SMALLINT | Passing air yards (includes incomplete passes). |
| 23 | `passing_yards_after_catch` | integer | 0.0% | -1 to 280 | SMALLINT | Yards after the catch gained on plays in which player was the passer (this is an unofficial stat and may differ slightly between different sources). |
| 24 | `passing_first_downs` | integer | 0.0% | 0 to 29 | TINYINT UNSIGNED | First downs on pass attempts. |
| 25 | `passing_epa` | decimal | 96.3% | -38.8966 to 33.5485 | DOUBLE | Total expected points added on pass attempts and sacks. NOTE: this uses the variable `qb_epa`, which gives QB credit for EPA for up to the point where a receiver lost a fumble after a completed catch and makes EPA work m |
| 26 | `passing_cpoe` | decimal | 96.4% | -89.4962 to 77.089 | DOUBLE | Completion percentage over expected for this player. |
| 27 | `passing_2pt_conversions` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Two-point conversion passes. |
| 28 | `pacr` | decimal | 96.4% | -0.25 to 15.75 | DOUBLE | Passing (yards) Air (yards) Conversion Ratio - the number of passing yards per air yards thrown per game |
| 29 | `passing_10` | integer | 0.0% | 0 to 26 | TINYINT UNSIGNED | No dictionary entry |
| 30 | `passing_16` | integer | 0.0% | 0 to 14 | TINYINT UNSIGNED | No dictionary entry |
| 31 | `passing_20` | integer | 0.0% | 0 to 11 | TINYINT UNSIGNED | No dictionary entry |
| 32 | `passing_40` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | No dictionary entry |
| 33 | `carries` | integer | 0.0% | 0 to 37 | TINYINT UNSIGNED | The number of official rush attempts (incl. scrambles and kneel downs). Rushes after a lateral reception don’t count as carry. |
| 34 | `rushing_yards` | integer | 0.0% | -34 to 255 | SMALLINT | Yards gained when rushing with the ball (incl. scrambles and kneel downs). Also includes yards gained after obtaining a lateral on a play that started with a rushing attempt. |
| 35 | `rushing_tds` | integer | 0.0% | 0 to 6 | TINYINT UNSIGNED | The number of rushing touchdowns (incl. scrambles). Also includes touchdowns after obtaining a lateral on a play that started with a rushing attempt. |
| 36 | `rushing_fumbles` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | The number of rushes with a fumble. |
| 37 | `rushing_fumbles_lost` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | The number of rushes with a lost fumble. |
| 38 | `rushing_first_downs` | integer | 0.0% | 0 to 15 | TINYINT UNSIGNED | First downs on rush attempts (incl. scrambles). |
| 39 | `rushing_epa` | decimal | 87.5% | -17.2996 to 17.3565 | DOUBLE | Expected points added on rush attempts (incl. scrambles and kneel downs). |
| 40 | `rushing_2pt_conversions` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Two-point conversion rushes |
| 41 | `rushing_10` | integer | 0.0% | 0 to 8 | TINYINT UNSIGNED | No dictionary entry |
| 42 | `rushing_12` | integer | 0.0% | 0 to 7 | TINYINT UNSIGNED | No dictionary entry |
| 43 | `rushing_20` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | No dictionary entry |
| 44 | `rushing_40` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | No dictionary entry |
| 45 | `receptions` | integer | 0.0% | 0 to 18 | TINYINT UNSIGNED | The number of pass receptions. Lateral receptions officially don’t count as reception. |
| 46 | `targets` | integer | 0.0% | 0 to 24 | TINYINT UNSIGNED | The number of pass plays where the player was the targeted receiver. |
| 47 | `receiving_yards` | integer | 0.0% | -17 to 269 | SMALLINT | Yards gained after a pass reception. Includes yards gained after receiving a lateral on a play that started as a pass play. |
| 48 | `receiving_tds` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | The number of touchdowns following a pass reception. Also includes touchdowns after receiving a lateral on a play that started as a pass play. |
| 49 | `receiving_fumbles` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | The number of fumbles after a pass reception. |
| 50 | `receiving_fumbles_lost` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | The number of fumbles lost after a pass reception. |
| 51 | `receiving_air_yards` | integer | 0.0% | -36 to 334 | SMALLINT | Receiving air yards (incl. incomplete passes). |
| 52 | `receiving_yards_after_catch` | integer | 0.0% | -23 to 161 | SMALLINT | Yards after the catch gained on plays in which player was receiver (this is an unofficial stat and may differ slightly between different sources). |
| 53 | `receiving_first_downs` | integer | 0.0% | 0 to 14 | TINYINT UNSIGNED | Total number of first downs gained on receptions |
| 54 | `receiving_epa` | decimal | 75.7% | -23.14 to 24.6817 | DOUBLE | Total EPA on plays where this receiver was targeted |
| 55 | `receiving_2pt_conversions` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Two-point conversion receptions |
| 56 | `receiving_10` | integer | 0.0% | 0 to 10 | TINYINT UNSIGNED | No dictionary entry |
| 57 | `receiving_16` | integer | 0.0% | 0 to 7 | TINYINT UNSIGNED | No dictionary entry |
| 58 | `receiving_20` | integer | 0.0% | 0 to 7 | TINYINT UNSIGNED | No dictionary entry |
| 59 | `receiving_40` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | No dictionary entry |
| 60 | `racr` | decimal | 75.9% | -102 to 150 | DOUBLE | Receiving (yards) Air (yards) Conversion Ratio - the number of receiving yards per air yards targeted per game |
| 61 | `target_share` | decimal | 0.0% | 0 to 0.666667 | DOUBLE | Player’s share of team receiving targets in this game |
| 62 | `air_yards_share` | decimal | 0.0% | -0.9 to 1.84211 | DOUBLE | Player’s share of the team’s air yards in this game |
| 63 | `wopr` | decimal | 0.0% | -0.219565 to 1.78947 | DOUBLE | Weighted OPportunity Rating - 1.5 x target_share + 0.7 x air_yards_share - a weighted average that contextualizes total fantasy usage. |
| 64 | `special_teams_tds` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Total number of kick/punt return touchdowns |
| 65 | `def_tackles_solo` | integer | 0.0% | 0 to 15 | TINYINT UNSIGNED | Total number of solo tackles for this player |
| 66 | `def_tackles_with_assist` | integer | 0.0% | 0 to 7 | TINYINT UNSIGNED | Number of tackles this player had with an assisted tackle |
| 67 | `def_tackle_assists` | integer | 0.0% | 0 to 14 | TINYINT UNSIGNED | Number of assisted tackles for this player |
| 68 | `def_tackles_for_loss` | integer | 0.0% | 0 to 5 | TINYINT UNSIGNED | Number of tackles for loss (TFL) for this player |
| 69 | `def_tackles_for_loss_yards` | integer | 0.0% | 0 to 37 | TINYINT UNSIGNED | Yards lost from TFLs involving this player |
| 70 | `def_fumbles_forced` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | Number of times a fumble was forced from this player |
| 71 | `def_sacks` | decimal | 0.0% | 0 to 6 | DOUBLE | Number of sacks form this player |
| 72 | `def_sack_yards` | decimal | 0.0% | -1 to 46 | DOUBLE | Yards lost from sacks forced by this player |
| 73 | `def_qb_hits` | integer | 0.0% | 0 to 8 | TINYINT UNSIGNED | Number of QB hits from this player (should not include plays where the QB was sacked) |
| 74 | `def_interceptions` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | Number of interceptions forced by this player |
| 75 | `def_interception_yards` | integer | 0.0% | -11 to 115 | SMALLINT | yards gained/lost by interception returns from this player |
| 76 | `def_pass_defended` | integer | 0.0% | 0 to 6 | TINYINT UNSIGNED | Number of passes defended/broken up by this player |
| 77 | `def_tds` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Number of defensive touchdowns scored by this player |
| 78 | `def_fumbles` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | Number of fumbles by this player |
| 79 | `def_safeties` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | Number of safeties forced by this player |
| 80 | `def_punt_blocks` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | No dictionary entry |
| 81 | `def_pat_blocks` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | No dictionary entry |
| 82 | `def_fg_blocks` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | No dictionary entry |
| 83 | `def_2pt_atts` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | No dictionary entry |
| 84 | `def_2pt_made` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | No dictionary entry |
| 85 | `misc_yards` | integer | 0.0% | -8 to 109 | SMALLINT | Miscellaneous yards attributed to this player |
| 86 | `fumble_recovery_own` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Number of the player’s own team fumbles recovered |
| 87 | `fumble_recovery_yards_own` | integer | 0.0% | -29 to 57 | TINYINT | Yards gained/lost on own fumble recoveries |
| 88 | `fumble_recovery_opp` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Number of the opponent’s fumbles recovered |
| 89 | `fumble_recovery_yards_opp` | integer | 0.0% | -16 to 102 | SMALLINT | Yardage on opponent fumble recoveries |
| 90 | `fumble_recovery_tds` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Fumbles recovered and advanced for a touchdown |
| 91 | `penalties` | integer | 0.0% | 0 to 31 | TINYINT UNSIGNED | Number of penalties attributed to this player |
| 92 | `penalty_yards` | integer | 0.0% | 0 to 155 | SMALLINT UNSIGNED | Penalty yardage on penalties attributed to this player |
| 93 | `fumbles_forced_by_opp` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | No dictionary entry |
| 94 | `fumbles_not_forced` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | No dictionary entry |
| 95 | `fumbles_out_of_bounds` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | No dictionary entry |
| 96 | `fumbles_total` | integer | 0.0% | 0 to 5 | TINYINT UNSIGNED | No dictionary entry |
| 97 | `fumbles_lost_total` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | No dictionary entry |
| 98 | `punt_returns` | integer | 0.0% | 0 to 8 | TINYINT UNSIGNED | Count of punt returns by this player |
| 99 | `punt_return_yards` | integer | 0.0% | -13 to 195 | SMALLINT | Yards gained on punts returned by this player |
| 100 | `kickoff_returns` | integer | 0.0% | 0 to 8 | TINYINT UNSIGNED | Count of kick returns by this player |
| 101 | `kickoff_return_yards` | integer | 0.0% | -19 to 235 | SMALLINT | Yards gained on kick returns by this player |
| 102 | `fg_made` | integer | 0.0% | 0 to 7 | TINYINT UNSIGNED | Count of field goals made by this player |
| 103 | `fg_att` | integer | 0.0% | 0 to 8 | TINYINT UNSIGNED | Count of field goals attempted by this player |
| 104 | `fg_missed` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Count of field goals missed by this player |
| 105 | `fg_blocked` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Count of field goals attempted by this player that were blocked |
| 106 | `fg_long` | integer | 97.5% | 19 to 68 | TINYINT UNSIGNED | Longest successful field goal made by this player |
| 107 | `fg_pct` | decimal | 97.3% | 0 to 1 | DOUBLE | Percentage of field goals successfully made |
| 108 | `fg_made_0_19` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of field goals within 0-19 yards made by this player |
| 109 | `fg_made_20_29` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Count of field goals within 20-29 yards made by this player |
| 110 | `fg_made_30_39` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Count of field goals within 30-39 yards made by this player |
| 111 | `fg_made_40_49` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Count of field goals within 40-49 yards made by this player |
| 112 | `fg_made_50_59` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Count of field goals within 50-59 yards made by this player |
| 113 | `fg_made_60_` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of field goals over 60 yards made by this player |
| 114 | `fg_missed_0_19` | integer | 0.0% | 0 to 0 | TINYINT UNSIGNED | Count of field goals missed between 0-19 yards by this player |
| 115 | `fg_missed_20_29` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of field goals missed between 20-29 yards by this player |
| 116 | `fg_missed_30_39` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Count of field goals missed between 30-39 yards by this player |
| 117 | `fg_missed_40_49` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Count of field goals missed between 40-49 yards by this player |
| 118 | `fg_missed_50_59` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | Count of field goals missed between 50-59 yards by this player |
| 119 | `fg_missed_60_` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of field goals missed over 60 yards by this player |
| 120 | `fg_made_list` | text | 97.5% | up to 20 chars | VARCHAR(32) | Comma-separated string listing lengths of field goals made |
| 121 | `fg_missed_list` | text | 99.3% | up to 11 chars | VARCHAR(16) | Comma-separated string listing lengths of field goals missed |
| 122 | `fg_blocked_list` | text | 99.9% | up to 5 chars | VARCHAR(8) | Comma-separated string listing lengths of field goals blocked |
| 123 | `fg_made_distance` | integer | 0.0% | 0 to 274 | SMALLINT UNSIGNED | Total distance on field goals made |
| 124 | `fg_missed_distance` | integer | 0.0% | 0 to 177 | SMALLINT UNSIGNED | Total distance on field goals missed |
| 125 | `fg_blocked_distance` | integer | 0.0% | 0 to 133 | SMALLINT UNSIGNED | Total distance on field goals blocked |
| 126 | `pat_made` | integer | 0.0% | 0 to 10 | TINYINT UNSIGNED | Count of extra point kicks made |
| 127 | `pat_att` | integer | 0.0% | 0 to 10 | TINYINT UNSIGNED | Count of extra point kicks attempted |
| 128 | `pat_missed` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | Count of extra point kicks missed |
| 129 | `pat_blocked` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | Count of extra point kicks blocked |
| 130 | `pat_pct` | decimal | 97.3% | 0 to 1 | DOUBLE | Percentage of extra point kicks successfully completed |
| 131 | `gwfg_made` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of game winning field goals made |
| 132 | `gwfg_att` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of game winning field goals attempted |
| 133 | `gwfg_missed` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of game winning field goals missed |
| 134 | `gwfg_blocked` | integer | 0.0% | 0 to 1 | TINYINT UNSIGNED | Count of game winning field goals blocked |
| 135 | `gwfg_distance` | integer | 0.0% | 0 to 68 | TINYINT UNSIGNED | Total distance on game winning field goals completed |
| 136 | `pt_att` | integer | 0.0% | 0 to 13 | TINYINT UNSIGNED | No dictionary entry |
| 137 | `pt_blocked` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | No dictionary entry |
| 138 | `pt_long` | integer | 97.0% | 14 to 84 | TINYINT UNSIGNED | No dictionary entry |
| 139 | `pt_yards` | integer | 0.0% | 0 to 549 | SMALLINT UNSIGNED | No dictionary entry |
| 140 | `pt_inside_20` | integer | 0.0% | 0 to 8 | TINYINT UNSIGNED | No dictionary entry |
| 141 | `pt_out_of_bounds` | integer | 0.0% | 0 to 5 | TINYINT UNSIGNED | No dictionary entry |
| 142 | `pt_downed` | integer | 0.0% | 0 to 6 | TINYINT UNSIGNED | No dictionary entry |
| 143 | `pt_touchback` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | No dictionary entry |
| 144 | `pt_fair_caught` | integer | 0.0% | 0 to 7 | TINYINT UNSIGNED | No dictionary entry |
| 145 | `pt_returned` | integer | 0.0% | 0 to 8 | TINYINT UNSIGNED | No dictionary entry |
| 146 | `pt_return_yards` | integer | 0.0% | -15 to 195 | SMALLINT | No dictionary entry |
| 147 | `pt_return_tds` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | No dictionary entry |
| 148 | `pt_net_yards` | integer | 0.0% | -36 to 529 | SMALLINT | No dictionary entry |
| 149 | `fantasy_points` | decimal | 0.0% | -6.96 to 53.2 | not stored (ADR-0007) | Fantasy points: not stored (ADR-0007). Standard fantasy points. |
| 150 | `fantasy_points_ppr` | decimal | 0.0% | -6.96 to 57.9 | not stored (ADR-0007) | Fantasy points: not stored (ADR-0007). PPR fantasy points. |


## A2. Weekly team stats (`stats_team`)

Descriptions: [nflreadr dictionary](https://ftp.fau.de/cran/web/packages/nflreadr/vignettes/dictionary_player_stats.html). No team-stats dictionary could be fetched; descriptions are the player-stats entries for the same column names.

Grain: one team in one week. Natural key: season, season_type, week, team. Profiled: 5,232 rows (2017–2026). 138 columns; 101 have an nflreadr dictionary entry.

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
| 9 | `passing_yards` | integer | 0.0% | 0 to 525 | SMALLINT | Yards gained on pass plays. |
| 10 | `passing_tds` | integer | 0.0% | 0 to 6 | TINYINT UNSIGNED | The number of passing touchdowns. |
| 11 | `passing_interceptions` | integer | 0.0% | 0 to 5 | TINYINT UNSIGNED | Number of passing interceptions |
| 12 | `sacks_suffered` | integer | 0.0% | 0 to 11 | TINYINT UNSIGNED | Number of sacks taken as a QB |
| 13 | `sack_yards_lost` | integer | 0.0% | -82 to 0 | SMALLINT | Yards lost from sacks suffered by this player |
| 14 | `sack_fumbles` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | The number of sacks suffered with a fumble. |
| 15 | `sack_fumbles_lost` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | The number of sacks suffered with a lost fumble. |
| 16 | `passing_air_yards` | integer | 0.0% | 15 to 770 | SMALLINT | Passing air yards (includes incomplete passes). |
| 17 | `passing_yards_after_catch` | integer | 0.0% | 0 to 292 | SMALLINT | Yards after the catch gained on plays in which player was the passer (this is an unofficial stat and may differ slightly between different sources). |
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
| 40 | `receiving_yards` | integer | 0.0% | 0 to 525 | SMALLINT | Yards gained after a pass reception. Includes yards gained after receiving a lateral on a play that started as a pass play. |
| 41 | `receiving_tds` | integer | 0.0% | 0 to 6 | TINYINT UNSIGNED | The number of touchdowns following a pass reception. Also includes touchdowns after receiving a lateral on a play that started as a pass play. |
| 42 | `receiving_fumbles` | integer | 0.0% | 0 to 4 | TINYINT UNSIGNED | The number of fumbles after a pass reception. |
| 43 | `receiving_fumbles_lost` | integer | 0.0% | 0 to 2 | TINYINT UNSIGNED | The number of fumbles lost after a pass reception. |
| 44 | `receiving_air_yards` | integer | 0.0% | 15 to 770 | SMALLINT | Receiving air yards (incl. incomplete passes). |
| 45 | `receiving_yards_after_catch` | integer | 0.0% | 0 to 292 | SMALLINT | Yards after the catch gained on plays in which player was receiver (this is an unofficial stat and may differ slightly between different sources). |
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

## A3. Schedules (`schedules/games.csv`)

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

## A4. Teams (`teams/teams_colors_logos.csv`)

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

## A5. Players (`players/players.csv`)

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
| 29 | `latest_team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | Latest team the player was listed in |
| 30 | `status` | text | 0.0% | up to 3 chars | VARCHAR(4) | Roster status: describes things like Active, Inactive, Injured Reserve, Practice Squad etc |
| 31 | `ngs_status` | text | 66.5% | up to 3 chars | VARCHAR(4) | Next Gen Stats variant of status |
| 32 | `ngs_status_short_description` | text | 73.0% | up to 15 chars | VARCHAR(32) | Next Gen Stats status description |
| 33 | `years_of_experience` | integer | 0.0% | 0 to 26 | TINYINT UNSIGNED | Years played in league |
| 34 | `pff_position` | text | 69.0% | up to 2 chars | VARCHAR(4) | Position of player as listed by PFF |
| 35 | `pff_status` | text | 83.4% | 12 values: A, APUP, DNR, I, IR, IRD, P, PINJ, PSUS, RNFI, RPUP, S | VARCHAR(8) | Roster status as listed by PFF |
| 36 | `draft_year` | integer | 49.8% | 1974 to 2026 | SMALLINT UNSIGNED | Year that player was drafted |
| 37 | `draft_round` | integer | 49.8% | 1 to 17 | TINYINT UNSIGNED | Round that player was drafted in |
| 38 | `draft_pick` | integer | 49.8% | 1 to 472 | SMALLINT UNSIGNED | Pick number of player |
| 39 | `draft_team` | text | 49.8% | up to 3 chars | VARCHAR(4) ascii | Team that drafted player |

## A6. Season rosters (`rosters`)

Descriptions: [nflreadr dictionary](https://cloud.r-project.org/web/packages/nflreadr/vignettes/dictionary_rosters.html). 

Grain: one player on one team in one season. Natural key: season, team, gsis_id. Profiled: 31,013 rows (2017–2026). 36 columns; 36 have an nflreadr dictionary entry.

| # | Column | Observed | Nulls | Range or values | Proposed MySQL type | Description |
|---|---|---|---|---|---|---|
| 1 | `season` | integer | 0.0% | 2017 to 2026 | SMALLINT UNSIGNED | NFL season. Defaults to current year after March, otherwise is previous year. |
| 2 | `team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | NFL team. Uses official abbreviations as per NFL.com |
| 3 | `position` | text | 0.0% | 11 values: DB, DL, K, LB, LS, OL, P, QB, RB, TE, WR | VARCHAR(4) ascii | Primary position as reported by NFL.com |
| 4 | `depth_chart_position` | text | 0.0% | up to 3 chars | VARCHAR(4) | Position assigned on depth chart. Not always accurate! |
| 5 | `jersey_number` | integer | 0.4% | 0 to 99 | TINYINT UNSIGNED | Jersey number. Often useful for joins by name/team/jersey. |
| 6 | `status` | text | 0.0% | up to 3 chars; values (rows, 2017–2026, re-profiled 2026-11-09): ACT 17,307, CUT 5,169, DEV 4,954, RES 4,510, INA 1,730, RET 168, UFA 124, NWT 43, RSN 38, SUS 26, PUP 23, TRC 22, TRD 19, EXE 7, TRT 4, RFA 3, RSR 1, E14 1, empty 1 | VARCHAR(4) ascii | Roster status: describes things like Active, Inactive, Injured Reserve, Practice Squad etc |
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
| 35 | `draft_club` | text | 43.8% | up to 3 chars | VARCHAR(4) ascii | The team that originally drafted a player. NA if a player went undrafted in their draft-eligible year. |
| 36 | `draft_number` | integer | 48.8% | 1 to 262 | SMALLINT UNSIGNED | The number pick that was used to select a given player. |

## A7. Injuries (`injuries`)

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

## A8. Snap counts (`snap_counts`)

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

## A9. Depth charts (`depth_charts`, current season)

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


## A10. Play-by-play (`pbp`, current season)

Descriptions: [nflreadr dictionary](https://ftp.fau.de/cran/web/packages/nflreadr/vignettes/dictionary_pbp.html). Field names and documented types are exact; many descriptions are paraphrased by the fetch tool, so treat them as approximate.

Grain: one play. Natural key: game_id, play_id. Profiled: 70,118 rows (2025 full season and 2026 to date). 372 columns; 372 have an nflreadr dictionary entry.

| # | Column | Observed | Nulls | Range or values | Proposed MySQL type | Description |
|---|---|---|---|---|---|---|
| 1 | `play_id` | integer | 0.0% | 1 to 5519 | SMALLINT UNSIGNED | Numeric play id that when used with game_id and drive provides the unique identifier for a single play. |
| 2 | `game_id` | text | 0.0% | up to 15 chars | VARCHAR(32) ascii | Ten digit identifier for NFL game. |
| 3 | `old_game_id` | integer | 0.0% | 2025090400 to 2026110500 | INT UNSIGNED | Legacy NFL game ID. |
| 4 | `home_team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | String abbreviation for the home team. |
| 5 | `away_team` | text | 0.0% | up to 3 chars | VARCHAR(4) ascii | String abbreviation for the away team. |
| 6 | `season_type` | text | 0.0% | 2 values: POST, REG | ENUM('POST','REG') | 'REG' or 'POST' indicating if the game belongs to regular or post season. |
| 7 | `week` | integer | 0.0% | 1 to 22 | TINYINT UNSIGNED | Season week. |
| 8 | `posteam` | text | 5.5% | up to 3 chars | VARCHAR(4) ascii | String abbreviation for the team with possession. |
| 9 | `posteam_type` | text | 5.5% | 2 values: away, home | VARCHAR(8) | String indicating whether the posteam team is home or away. |
| 10 | `defteam` | text | 5.5% | up to 3 chars | VARCHAR(4) ascii | String abbreviation for the team on defense. |
| 11 | `side_of_field` | text | 7.2% | up to 3 chars | VARCHAR(4) ascii | String abbreviation for which team's side of the field the team with possession is currently on. |
| 12 | `yardline_100` | integer | 7.1% | 1 to 99 | TINYINT UNSIGNED | Numeric distance in the number of yards from the opponent's endzone for the posteam. |
| 13 | `game_date` | date | 0.0% | 2025-09-04 to 2026-11-05 | DATE | Date of the game. |
| 14 | `quarter_seconds_remaining` | integer | 0.0% | 0 to 900 | SMALLINT UNSIGNED | Seconds remaining in the quarter. |
| 15 | `half_seconds_remaining` | integer | 0.0% | 0 to 1800 | SMALLINT UNSIGNED | Seconds remaining in the half. |
| 16 | `game_seconds_remaining` | integer | 0.0% | 0 to 3600 | SMALLINT UNSIGNED | Seconds remaining in the game. |
| 17 | `game_half` | text | 0.0% | 3 values: Half1, Half2, Overtime | VARCHAR(16) | String indicating which half the play is in, either Half1, Half2, or Overtime. |
| 18 | `quarter_end` | integer | 0.0% | 0 to 1 | BOOLEAN | Binary indicator for whether or not the row of the data is marking the end of a quarter. |
| 19 | `drive` | integer | 1.1% | 1 to 32 | TINYINT UNSIGNED | Numeric drive number in the game. |
| 20 | `sp` | integer | 0.0% | 0 to 1 | BOOLEAN | Binary indicator for whether or not a score occurred on the play. |
| 21 | `qtr` | integer | 0.0% | 1 to 5 | TINYINT UNSIGNED | Quarter of the game (5 is overtime). |
| 22 | `down` | integer | 16.1% | 1 to 4 | TINYINT UNSIGNED | The down for the given play. |
| 23 | `goal_to_go` | integer | 0.0% | 0 to 1 | BOOLEAN | Binary indicator for whether or not the posteam is in a goal down situation. |
| 24 | `time` | time | 0.0% |  | VARCHAR(5) ascii (mm:ss clock, not a time of day) | Time at start of play provided in string format as minutes:seconds remaining in the quarter. |
| 25 | `yrdln` | text | 0.7% | up to 6 chars | VARCHAR(8) | String indicating the current field position for a given play. |
| 26 | `ydstogo` | integer | 0.0% | 0 to 43 | TINYINT UNSIGNED | Numeric yards in distance from either the first down marker or the endzone in goal down situations. |
| 27 | `ydsnet` | integer | 1.1% | -35 to 99 | SMALLINT | Numeric value for total yards gained on the given drive. |
| 28 | `desc` | text | 0.0% | up to 717 chars | TEXT | Detailed string description for the given play. |
| 29 | `play_type` | text | 2.9% | 9 values: extra_point, field_goal, kickoff, no_play, pass, punt, qb_kneel, qb_spike, run | VARCHAR(16) | String naming the play category, such as pass, run, punt, field_goal, kickoff, extra_point, qb_kneel, qb_spike, or no_play, plus a missing value for end-of-play rows. |
| 30 | `yards_gained` | integer | 3.0% | -34 to 93 | SMALLINT | Numeric yards gained (or lost) by the possessing team, excluding yards gained via fumble recoveries and laterals. |
| 31 | `shotgun` | integer | 0.0% | 0 to 1 | BOOLEAN | Binary indicator for whether or not the play was in shotgun formation. |
| 32 | `no_huddle` | integer | 0.0% | 0 to 1 | BOOLEAN | Binary indicator for whether or not the play was in no_huddle formation. |
| 33 | `qb_dropback` | integer | 2.9% | 0 to 1 | BOOLEAN | Binary indicator for whether or not the QB dropped back on the play (pass attempt, sack, or scrambled). |
| 34 | `qb_kneel` | integer | 0.0% | 0 to 1 | BOOLEAN | Binary indicator for whether or not the QB took a knee. |
| 35 | `qb_spike` | integer | 0.0% | 0 to 1 | BOOLEAN | Binary indicator for whether or not the QB spiked the ball. |
| 36 | `qb_scramble` | integer | 0.0% | 0 to 1 | BOOLEAN | Binary indicator for whether or not the QB scrambled. |
| 37 | `pass_length` | text | 62.5% | 2 values: deep, short | VARCHAR(8) | String indicator for pass length: short or deep. |
| 38 | `pass_location` | text | 62.5% | 3 values: left, middle, right | VARCHAR(8) | String indicator for pass location: left, middle, or right. |
| 39 | `air_yards` | integer | 62.2% | -20 to 64 | SMALLINT | Yards from the line of scrimmage to where the targeted receiver caught or failed to catch the ball. |
| 40 | `yards_after_catch` | integer | 75.8% | -8 to 80 | SMALLINT | Yards from where the receiver made the reception to where the play ended. |
| 41 | `run_location` | text | 69.7% | 3 values: left, middle, right | VARCHAR(8) | String indicator for location of run: left, middle, or right. |
| 42 | `run_gap` | text | 77.7% | 3 values: end, guard, tackle | VARCHAR(8) | String indicator for line gap of run: end, guard, or tackle |
| 43 | `field_goal_result` | text | 97.6% | 3 values: blocked, made, missed | VARCHAR(16) | String indicator for result of field goal attempt: made, missed, or blocked. |
| 44 | `kick_distance` | integer | 84.8% | 0 to 81 | TINYINT UNSIGNED | Numeric distance in yards for kickoffs, field goals, and punts. |
| 45 | `extra_point_result` | text | 97.3% | 3 values: blocked, failed, good | VARCHAR(16) | Outcome of the extra point try: good, failed, blocked, aborted, or a safety scored on a defensive touchback. |
| 46 | `two_point_conv_result` | text | 99.7% | 2 values: failure, success | VARCHAR(16) | Outcome of the two point conversion try: success, failure, return, or a safety scored on a defensive touchback. |
| 47 | `home_timeouts_remaining` | integer | 0.0% | 0 to 3 | TINYINT UNSIGNED | Numeric timeouts remaining in the half for the home team. |
| 48 | `away_timeouts_remaining` | integer | 0.0% | -1 to 3 | TINYINT | Numeric timeouts remaining in the half for the away team. |
| 49 | `timeout` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for whether or not a timeout was called by either team. |
| 50 | `timeout_team` | text | 95.5% | up to 3 chars | VARCHAR(4) ascii | String abbreviation for which team called the timeout. |
| 51 | `td_team` | text | 97.0% | up to 3 chars | VARCHAR(4) ascii | String abbreviation for which team scored the touchdown. |
| 52 | `td_player_name` | text | 97.0% | up to 18 chars | VARCHAR(32) | String name of the player who scored a touchdown. |
| 53 | `td_player_id` | text | 97.0% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier of the player who scored a touchdown. |
| 54 | `posteam_timeouts_remaining` | integer | 5.5% | 0 to 3 | TINYINT UNSIGNED | Number of timeouts remaining for the possession team. |
| 55 | `defteam_timeouts_remaining` | integer | 5.5% | -1 to 3 | TINYINT | Number of timeouts remaining for the team on defense. |
| 56 | `total_home_score` | integer | 0.0% | 0 to 52 | TINYINT UNSIGNED | Score for the home team at the start of the play. |
| 57 | `total_away_score` | integer | 0.0% | 0 to 59 | TINYINT UNSIGNED | Score for the away team at the start of the play. |
| 58 | `posteam_score` | integer | 5.5% | 0 to 58 | TINYINT UNSIGNED | Score the posteam at the start of the play. |
| 59 | `defteam_score` | integer | 5.5% | 0 to 59 | TINYINT UNSIGNED | Score the defteam at the start of the play. |
| 60 | `score_differential` | integer | 5.5% | -45 to 44 | TINYINT | Score differential between the posteam and defteam at the start of the play. |
| 61 | `posteam_score_post` | integer | 5.5% | 0 to 59 | TINYINT UNSIGNED | Score for the posteam at the end of the play. |
| 62 | `defteam_score_post` | integer | 5.5% | 0 to 59 | TINYINT UNSIGNED | Score for the defteam at the end of the play. |
| 63 | `score_differential_post` | integer | 5.5% | -45 to 45 | TINYINT | Score differential between the posteam and defteam at the end of the play. |
| 64 | `no_score_prob` | decimal | 0.0% | 0 to 1 | DOUBLE | Predicted probability of no score occurring for the rest of the half based on the expected points model. |
| 65 | `opp_fg_prob` | decimal | 0.0% | 0 to 0.375928 | DOUBLE | Predicted probability of the defteam scoring a FG next within the same game half. |
| 66 | `opp_safety_prob` | decimal | 0.0% | 0 to 0.120629 | DOUBLE | Predicted probability of the defteam scoring a safety next within the same game half. |
| 67 | `opp_td_prob` | decimal | 0.0% | 0 to 0.470153 | DOUBLE | Predicted probability of the defteam scoring a TD next within the same game half. |
| 68 | `fg_prob` | decimal | 0.0% | 0 to 0.997507 | DOUBLE | Predicted probability of the posteam scoring a FG next within the same game half. |
| 69 | `safety_prob` | decimal | 0.0% | 0 to 0.0339684 | DOUBLE | Predicted probability of the posteam scoring a safety next within the same game half. |
| 70 | `td_prob` | decimal | 0.0% | 0 to 0.939227 | DOUBLE | Predicted probability of the posteam scoring a TD next within the same game half. |
| 71 | `extra_point_prob` | decimal | 0.0% | 0 to 0.988709 | DOUBLE | Predicted probability of the posteam scoring an extra point. |
| 72 | `two_point_conversion_prob` | decimal | 0.0% | 0 to 0.4735 | DOUBLE | Predicted probability of the posteam scoring the two point conversion. |
| 73 | `ep` | decimal | 1.1% | -3.56645 to 6.6323 | DOUBLE | Estimated expected points for the possession team on the given play, derived from scoring event probabilities. |
| 74 | `epa` | decimal | 1.1% | -12.6581 to 7.96741 | DOUBLE | Expected points added (EPA) by the posteam for the given play. |
| 75 | `total_home_epa` | decimal | 0.0% | -49.5396 to 49.4818 | DOUBLE | Cumulative total EPA for the home team in the game so far. |
| 76 | `total_away_epa` | decimal | 0.0% | -49.4818 to 49.5396 | DOUBLE | Cumulative total EPA for the away team in the game so far. |
| 77 | `total_home_rush_epa` | decimal | 0.0% | -26.9549 to 27.2076 | DOUBLE | Cumulative total rushing EPA for the home team in the game so far. |
| 78 | `total_away_rush_epa` | decimal | 0.0% | -27.2076 to 26.9549 | DOUBLE | Cumulative total rushing EPA for the away team in the game so far. |
| 79 | `total_home_pass_epa` | decimal | 0.0% | -41.6586 to 42.4084 | DOUBLE | Cumulative total passing EPA for the home team in the game so far. |
| 80 | `total_away_pass_epa` | decimal | 0.0% | -42.4084 to 41.6586 | DOUBLE | Cumulative total passing EPA for the away team in the game so far. |
| 81 | `air_epa` | decimal | 62.5% | -5.88204 to 6.87907 | DOUBLE | EPA from air yards alone; for incompletions, the hypothetical value had the pass been completed. |
| 82 | `yac_epa` | decimal | 62.5% | -12.8265 to 8.28225 | DOUBLE | EPA from yards after catch alone; for incompletions, the gap between hypothetical air EPA and observed EPA. |
| 83 | `comp_air_epa` | decimal | 3.0% | -5.88204 to 5.90343 | DOUBLE | EPA from the air yards alone only for completions. |
| 84 | `comp_yac_epa` | decimal | 3.0% | -9.82489 to 8.28225 | DOUBLE | EPA from the yards after catch alone only for completions. |
| 85 | `total_home_comp_air_epa` | decimal | 0.0% | -30.9639 to 21.5536 | DOUBLE | Cumulative total completions air EPA for the home team in the game so far. |
| 86 | `total_away_comp_air_epa` | decimal | 0.0% | -21.5536 to 30.9639 | DOUBLE | Cumulative total completions air EPA for the away team in the game so far. |
| 87 | `total_home_comp_yac_epa` | decimal | 0.0% | -27.9286 to 25.0782 | DOUBLE | Cumulative total completions yac EPA for the home team in the game so far. |
| 88 | `total_away_comp_yac_epa` | decimal | 0.0% | -25.0782 to 27.9286 | DOUBLE | Cumulative total completions yac EPA for the away team in the game so far. |
| 89 | `total_home_raw_air_epa` | decimal | 0.0% | -53.2927 to 58.451 | DOUBLE | Cumulative total raw air EPA for the home team in the game so far. |
| 90 | `total_away_raw_air_epa` | decimal | 0.0% | -58.451 to 53.2927 | DOUBLE | Cumulative total raw air EPA for the away team in the game so far. |
| 91 | `total_home_raw_yac_epa` | decimal | 0.0% | -66.8133 to 64.642 | DOUBLE | Cumulative total raw yac EPA for the home team in the game so far. |
| 92 | `total_away_raw_yac_epa` | decimal | 0.0% | -64.642 to 66.8133 | DOUBLE | Cumulative total raw yac EPA for the away team in the game so far. |
| 93 | `wp` | decimal | 0.6% | 2.86447e-05 to 1 | DOUBLE | Estimated win probability for the posteam at the start of the given play. |
| 94 | `def_wp` | decimal | 0.6% | 0 to 0.999971 | DOUBLE | Estimated win probability for the defteam. |
| 95 | `home_wp` | decimal | 0.0% | 0 to 1 | DOUBLE | Estimated win probability for the home team. |
| 96 | `away_wp` | decimal | 0.0% | 0 to 1 | DOUBLE | Estimated win probability for the away team. |
| 97 | `wpa` | decimal | 1.4% | -0.831667 to 0.577939 | DOUBLE | Win probability added (WPA) for the posteam. |
| 98 | `vegas_wpa` | decimal | 1.4% | -0.831667 to 0.594256 | DOUBLE | Win probability added (WPA) for the posteam: spread_adjusted model. |
| 99 | `vegas_home_wpa` | decimal | 0.6% | -0.798678 to 0.831667 | DOUBLE | Win probability added (WPA) for the home team: spread_adjusted model. |
| 100 | `home_wp_post` | decimal | 7.0% | 0 to 1 | DOUBLE | Estimated win probability for the home team at the end of the play. |
| 101 | `away_wp_post` | decimal | 7.0% | 0 to 1 | DOUBLE | Estimated win probability for the away team at the end of the play. |
| 102 | `vegas_wp` | decimal | 0.6% | 7.07114e-08 to 1 | DOUBLE | Estimated win probability for the posteam at the start of the play, incorporating the pre-game Vegas line. |
| 103 | `vegas_home_wp` | decimal | 0.0% | 0 to 1 | DOUBLE | Estimated win probability for the home team incorporating pre-game Vegas line. |
| 104 | `total_home_rush_wpa` | decimal | 0.0% | -1.18077 to 0.830393 | DOUBLE | Cumulative total rushing WPA for the home team in the game so far. |
| 105 | `total_away_rush_wpa` | decimal | 0.0% | -0.830393 to 1.18077 | DOUBLE | Cumulative total rushing WPA for the away team in the game so far. |
| 106 | `total_home_pass_wpa` | decimal | 0.0% | -1.58396 to 0.840997 | DOUBLE | Cumulative total passing WPA for the home team in the game so far. |
| 107 | `total_away_pass_wpa` | decimal | 0.0% | -0.840997 to 1.58396 | DOUBLE | Cumulative total passing WPA for the away team in the game so far. |
| 108 | `air_wpa` | decimal | 62.5% | -0.957869 to 0.975666 | DOUBLE | WPA through the air (same logic as air_epa). |
| 109 | `yac_wpa` | decimal | 62.5% | -0.974364 to 0.952749 | DOUBLE | WPA from yards after the catch (same logic as yac_epa). |
| 110 | `comp_air_wpa` | decimal | 3.0% | -0.938268 to 0.975666 | DOUBLE | The air_wpa for completions only. |
| 111 | `comp_yac_wpa` | decimal | 3.0% | -0.974364 to 0.938521 | DOUBLE | The yac_wpa for completions only. |
| 112 | `total_home_comp_air_wpa` | decimal | 0.0% | -1.43272 to 1.64491 | DOUBLE | Cumulative total completions air WPA for the home team in the game so far. |
| 113 | `total_away_comp_air_wpa` | decimal | 0.0% | -1.64491 to 1.43272 | DOUBLE | Cumulative total completions air WPA for the away team in the game so far. |
| 114 | `total_home_comp_yac_wpa` | decimal | 0.0% | -1.94907 to 1.84264 | DOUBLE | Cumulative total completions yac WPA for the home team in the game so far. |
| 115 | `total_away_comp_yac_wpa` | decimal | 0.0% | -1.84264 to 1.94907 | DOUBLE | Cumulative total completions yac WPA for the away team in the game so far. |
| 116 | `total_home_raw_air_wpa` | decimal | 0.0% | -1.96324 to 1.88499 | DOUBLE | Cumulative total raw air WPA for the home team in the game so far. |
| 117 | `total_away_raw_air_wpa` | decimal | 0.0% | -1.88499 to 1.96324 | DOUBLE | Cumulative total raw air WPA for the away team in the game so far. |
| 118 | `total_home_raw_yac_wpa` | decimal | 0.0% | -2.43411 to 2.47621 | DOUBLE | Cumulative total raw yac WPA for the home team in the game so far. |
| 119 | `total_away_raw_yac_wpa` | decimal | 0.0% | -2.47621 to 2.43411 | DOUBLE | Cumulative total raw yac WPA for the away team in the game so far. |
| 120 | `punt_blocked` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the punt was blocked. |
| 121 | `first_down_rush` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if a running play converted the first down. |
| 122 | `first_down_pass` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if a passing play converted the first down. |
| 123 | `first_down_penalty` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if a penalty converted the first down. |
| 124 | `third_down_converted` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the first down was converted on third down. |
| 125 | `third_down_failed` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the posteam failed to convert first down on third down. |
| 126 | `fourth_down_converted` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the first down was converted on fourth down. |
| 127 | `fourth_down_failed` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the posteam failed to convert first down on fourth down. |
| 128 | `incomplete_pass` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the pass was incomplete. |
| 129 | `touchback` | integer | 0.0% | 0 to 1 | BOOLEAN | Binary indicator for if a touchback occurred on the play. |
| 130 | `interception` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the pass was intercepted. |
| 131 | `punt_inside_twenty` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the punt ended inside the twenty yard line. |
| 132 | `punt_in_endzone` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the punt was in the endzone. |
| 133 | `punt_out_of_bounds` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the punt went out of bounds. |
| 134 | `punt_downed` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the punt was downed. |
| 135 | `punt_fair_catch` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the punt was caught with a fair catch. |
| 136 | `kickoff_inside_twenty` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the kickoff ended inside the twenty yard line. |
| 137 | `kickoff_in_endzone` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the kickoff was in the endzone. |
| 138 | `kickoff_out_of_bounds` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the kickoff went out of bounds. |
| 139 | `kickoff_downed` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the kickoff was downed. |
| 140 | `kickoff_fair_catch` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the kickoff was caught with a fair catch. |
| 141 | `fumble_forced` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the fumble was forced. |
| 142 | `fumble_not_forced` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the fumble was not forced. |
| 143 | `fumble_out_of_bounds` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the fumble went out of bounds. |
| 144 | `solo_tackle` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator if the play had a solo tackle (could be multiple due to fumbles). |
| 145 | `safety` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for whether or not a safety occurred. |
| 146 | `penalty` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for whether or not a penalty occurred. |
| 147 | `tackled_for_loss` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for whether or not a tackle for loss on a run play occurred. |
| 148 | `fumble_lost` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the fumble was lost. |
| 149 | `own_kickoff_recovery` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the kicking team recovered the kickoff. |
| 150 | `own_kickoff_recovery_td` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the kicking team recovered the kickoff and scored a TD. |
| 151 | `qb_hit` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator if the QB was hit on the play. |
| 152 | `rush_attempt` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the play was a run. |
| 153 | `pass_attempt` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the play was a pass attempt (includes sacks). |
| 154 | `sack` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the play ended in a sack. |
| 155 | `touchdown` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the play resulted in a TD. |
| 156 | `pass_touchdown` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the play resulted in a passing TD. |
| 157 | `rush_touchdown` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the play resulted in a rushing TD. |
| 158 | `return_touchdown` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the play resulted in a return TD, such as on an interception, fumble, kickoff, punt, or blocked kick. |
| 159 | `extra_point_attempt` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for extra point attempt. |
| 160 | `two_point_attempt` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for two point conversion attempt. |
| 161 | `field_goal_attempt` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for field goal attempt. |
| 162 | `kickoff_attempt` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for kickoff. |
| 163 | `punt_attempt` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for punts. |
| 164 | `fumble` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if a fumble occurred. |
| 165 | `complete_pass` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if the pass was completed. |
| 166 | `assist_tackle` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if an assist tackle occurred. |
| 167 | `lateral_reception` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if a lateral occurred on the reception. |
| 168 | `lateral_rush` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if a lateral occurred on a run. |
| 169 | `lateral_return` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if a lateral occurred on a return, such as on an interception, fumble, kickoff, punt, or blocked kick. |
| 170 | `lateral_recovery` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for if a lateral occurred on a fumble recovery. |
| 171 | `passer_player_id` | text | 59.4% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the player that attempted the pass. |
| 172 | `passer_player_name` | text | 59.4% | up to 14 chars | VARCHAR(32) | String name for the player that attempted the pass. |
| 173 | `passing_yards` | integer | 75.8% | -11 to 88 | SMALLINT | Yards by the passer, including yards on pass plays with laterals; should match official passing stats. |
| 174 | `receiver_player_id` | text | 63.8% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the receiver that was targeted on the pass. |
| 175 | `receiver_player_name` | text | 63.8% | up to 18 chars | VARCHAR(32) | String name for the targeted receiver. |
| 176 | `receiving_yards` | integer | 75.8% | -11 to 88 | SMALLINT | Yards by the receiver, excluding yards on pass plays with laterals; may miss some lateral yards. |
| 177 | `rusher_player_id` | text | 68.5% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the player that attempted the run. |
| 178 | `rusher_player_name` | text | 68.5% | up to 17 chars | VARCHAR(32) | String name for the player that attempted the run. |
| 179 | `rushing_yards` | integer | 68.6% | -34 to 93 | SMALLINT | Yards by the rusher, excluding yards on rush plays with laterals; may miss some lateral yards. |
| 180 | `lateral_receiver_player_id` | text | 100.0% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the player that received the last(!) lateral on a pass play. |
| 181 | `lateral_receiver_player_name` | text | 100.0% | up to 12 chars | VARCHAR(16) | Name of the player who received the last lateral on a pass play; multi-lateral plays are listed in the nfl-data lateral_yards data. |
| 182 | `lateral_receiving_yards` | integer | 100.0% | -3 to 80 | SMALLINT | Yards by the lateral receiver on pass plays with laterals. |
| 183 | `lateral_rusher_player_id` | text | 100.0% | 1 values: 00-0035710 | VARCHAR(10) ascii_bin | Unique identifier for the player that received the last(!) lateral on a run play. |
| 184 | `lateral_rusher_player_name` | text | 100.0% | 1 values: D.Jones | VARCHAR(16) | Name of the player who received the last lateral on a run play; multi-lateral plays are listed in the nfl-data lateral_yards data. |
| 185 | `lateral_rushing_yards` | integer | 100.0% | 1 to 3 | TINYINT UNSIGNED | Yards by the lateral rusher on run plays with laterals. |
| 186 | `lateral_sack_player_id` | empty | 100.0% |  | VARCHAR(10) ascii_bin (empty in profiled seasons) | Unique identifier for the player that received the lateral on a sack. |

### Play-by-play, columns 187–372 (continued)

| # | Column | Observed | Nulls | Range or values | Proposed MySQL type | Description |
|---|---|---|---|---|---|---|
| 187 | `lateral_sack_player_name` | empty | 100.0% |  | VARCHAR(64) (empty in profiled seasons) | String name for the player that received the lateral on a sack. |
| 188 | `interception_player_id` | text | 99.2% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the player that intercepted the pass. |
| 189 | `interception_player_name` | text | 99.2% | up to 17 chars | VARCHAR(32) | String name for the player that intercepted the pass. |
| 190 | `lateral_interception_player_id` | text | 100.0% | 1 values: 00-0036380 | VARCHAR(10) ascii_bin | Unique identifier for the player that received the lateral on an interception. |
| 191 | `lateral_interception_player_name` | text | 100.0% | 1 values: A.Gilman | VARCHAR(16) | String name for the player that received the lateral on an interception. |
| 192 | `punt_returner_player_id` | text | 97.0% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the punt returner. |
| 193 | `punt_returner_player_name` | text | 97.0% | up to 16 chars | VARCHAR(32) | String name for the punt returner. |
| 194 | `lateral_punt_returner_player_id` | empty | 100.0% |  | VARCHAR(10) ascii_bin (empty in profiled seasons) | Unique identifier for the player that received the lateral on a punt return. |
| 195 | `lateral_punt_returner_player_name` | empty | 100.0% |  | VARCHAR(64) (empty in profiled seasons) | String name for the player that received the lateral on a punt return. |
| 196 | `kickoff_returner_player_name` | text | 95.3% | up to 16 chars | VARCHAR(32) | String name for the kickoff returner. |
| 197 | `kickoff_returner_player_id` | text | 95.3% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the kickoff returner. |
| 198 | `lateral_kickoff_returner_player_id` | empty | 100.0% |  | VARCHAR(10) ascii_bin (empty in profiled seasons) | Unique identifier for the player that received the lateral on a kickoff return. |
| 199 | `lateral_kickoff_returner_player_name` | empty | 100.0% |  | VARCHAR(64) (empty in profiled seasons) | String name for the player that received the lateral on a kickoff return. |
| 200 | `punter_player_id` | text | 95.7% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the punter. |
| 201 | `punter_player_name` | text | 95.7% | up to 12 chars | VARCHAR(16) | Name of the punter. |
| 202 | `kicker_player_name` | text | 89.0% | up to 12 chars | VARCHAR(16) | Name of the kicker on a field goal or kickoff. |
| 203 | `kicker_player_id` | text | 89.0% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the kicker on a field goal or kickoff. |
| 204 | `own_kickoff_recovery_player_id` | text | 100.0% | 6 values: 00-0034754, 00-0037129, 00-0039299, 00-0039424, 00-0039601, 00-0040259 | VARCHAR(10) ascii_bin | Unique identifier for the player who recovered their own kickoff. |
| 205 | `own_kickoff_recovery_player_name` | text | 100.0% | 6 values: D.Richardson, D.Vele, G.Holani, G.Larvadain, J.Blackwell, O.Burks | VARCHAR(16) | Name of the player who recovered their own kickoff. |
| 206 | `blocked_player_id` | text | 99.9% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the player who blocked the punt or field goal. |
| 207 | `blocked_player_name` | text | 99.9% | up to 12 chars | VARCHAR(16) | Name of the player who blocked the punt or field goal. |
| 208 | `tackle_for_loss_1_player_id` | text | 94.4% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the potential players credited with the tackle for loss. |
| 209 | `tackle_for_loss_1_player_name` | text | 94.4% | up to 18 chars | VARCHAR(32) | Name of one of the potential players credited with the tackle for loss. |
| 210 | `tackle_for_loss_2_player_id` | empty | 100.0% |  | VARCHAR(10) ascii_bin (empty in profiled seasons) | Unique identifier for another potential player credited with the tackle for loss. |
| 211 | `tackle_for_loss_2_player_name` | empty | 100.0% |  | VARCHAR(64) (empty in profiled seasons) | Name of another potential player credited with the tackle for loss. |
| 212 | `qb_hit_1_player_id` | text | 93.6% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the potential players who hit the QB; sacks are covered by sack or half-sack fields. |
| 213 | `qb_hit_1_player_name` | text | 93.6% | up to 18 chars | VARCHAR(32) | Name of one of the potential players who hit the QB; sacks are covered by sack or half-sack fields. |
| 214 | `qb_hit_2_player_id` | text | 99.7% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for another potential player who hit the QB; sacks are covered by sack or half-sack fields. |
| 215 | `qb_hit_2_player_name` | text | 99.7% | up to 16 chars | VARCHAR(32) | Name of another potential player who hit the QB; sacks are covered by sack or half-sack fields. |
| 216 | `forced_fumble_player_1_team` | text | 99.0% | up to 3 chars | VARCHAR(4) ascii | Team of one of the players who forced a fumble. |
| 217 | `forced_fumble_player_1_player_id` | text | 99.0% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the players who forced a fumble. |
| 218 | `forced_fumble_player_1_player_name` | text | 99.0% | up to 17 chars | VARCHAR(32) | Name of one of the players who forced a fumble. |
| 219 | `forced_fumble_player_2_team` | text | 100.0% | 3 values: DAL, LAC, SEA | VARCHAR(4) ascii | Team of another player who forced a fumble. |
| 220 | `forced_fumble_player_2_player_id` | text | 100.0% | 3 values: 00-0034869, 00-0040144, 00-0040725 | VARCHAR(10) ascii_bin | Unique identifier for another player who forced a fumble. |
| 221 | `forced_fumble_player_2_player_name` | text | 100.0% | 3 values: D.Ezeiruaku, J.Caldwell, S.Darnold | VARCHAR(16) | Name of another player who forced a fumble. |
| 222 | `solo_tackle_1_team` | text | 57.7% | up to 3 chars | VARCHAR(4) ascii | Team of one of the players credited with a solo tackle. |
| 223 | `solo_tackle_2_team` | text | 99.9% | up to 3 chars | VARCHAR(4) ascii | Team of another player credited with a solo tackle. |
| 224 | `solo_tackle_1_player_id` | text | 57.7% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the players credited with a solo tackle. |
| 225 | `solo_tackle_2_player_id` | text | 99.9% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for another player credited with a solo tackle. |
| 226 | `solo_tackle_1_player_name` | text | 57.7% | up to 19 chars | VARCHAR(32) | Name of one of the players credited with a solo tackle. |
| 227 | `solo_tackle_2_player_name` | text | 99.9% | up to 13 chars | VARCHAR(32) | Name of another player credited with a solo tackle. |
| 228 | `assist_tackle_1_player_id` | text | 81.6% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the players credited with a tackle assist. |
| 229 | `assist_tackle_1_player_name` | text | 81.6% | up to 19 chars | VARCHAR(32) | Name of one of the players credited with a tackle assist. |
| 230 | `assist_tackle_1_team` | text | 81.6% | up to 3 chars | VARCHAR(4) ascii | Team of one of the players credited with a tackle assist. |
| 231 | `assist_tackle_2_player_id` | text | 82.6% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for another player credited with a tackle assist. |
| 232 | `assist_tackle_2_player_name` | text | 82.6% | up to 19 chars | VARCHAR(32) | Name of another player credited with a tackle assist. |
| 233 | `assist_tackle_2_team` | text | 82.6% | up to 3 chars | VARCHAR(4) ascii | Team of another player credited with a tackle assist. |
| 234 | `assist_tackle_3_player_id` | text | 100.0% | 1 values: 00-0039884 | VARCHAR(10) ascii_bin | Unique identifier for a third player credited with a tackle assist. |
| 235 | `assist_tackle_3_player_name` | text | 100.0% | 1 values: T.Washington | VARCHAR(16) | Name of a third player credited with a tackle assist. |
| 236 | `assist_tackle_3_team` | text | 100.0% | 1 values: MIA | VARCHAR(4) ascii | Team of a third player credited with a tackle assist. |
| 237 | `assist_tackle_4_player_id` | text | 100.0% | 1 values: 00-0037252 | VARCHAR(10) ascii_bin | Unique identifier for a fourth player credited with a tackle assist. |
| 238 | `assist_tackle_4_player_name` | text | 100.0% | 1 values: G.Dulcich | VARCHAR(16) | Name of a fourth player credited with a tackle assist. |
| 239 | `assist_tackle_4_team` | text | 100.0% | 1 values: MIA | VARCHAR(4) ascii | Team of a fourth player credited with a tackle assist. |
| 240 | `tackle_with_assist` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for whether a tackle with assist occurred. |
| 241 | `tackle_with_assist_1_player_id` | text | 98.6% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the players in a tackle with assist. |
| 242 | `tackle_with_assist_1_player_name` | text | 98.6% | up to 18 chars | VARCHAR(32) | Name of one of the players in a tackle with assist. |
| 243 | `tackle_with_assist_1_team` | text | 98.6% | up to 3 chars | VARCHAR(4) ascii | Team of one of the players in a tackle with assist. |
| 244 | `tackle_with_assist_2_player_id` | empty | 100.0% |  | VARCHAR(10) ascii_bin (empty in profiled seasons) | Unique identifier for another player in a tackle with assist. |
| 245 | `tackle_with_assist_2_player_name` | empty | 100.0% |  | VARCHAR(64) (empty in profiled seasons) | Name of another player in a tackle with assist. |
| 246 | `tackle_with_assist_2_team` | empty | 100.0% |  | VARCHAR(4) ascii (empty in profiled seasons) | Team of another player in a tackle with assist. |
| 247 | `pass_defense_1_player_id` | text | 95.0% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the players credited with a pass defense. |
| 248 | `pass_defense_1_player_name` | text | 95.0% | up to 18 chars | VARCHAR(32) | Name of one of the players credited with a pass defense. |
| 249 | `pass_defense_2_player_id` | text | 99.8% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for another player credited with a pass defense. |
| 250 | `pass_defense_2_player_name` | text | 99.8% | up to 17 chars | VARCHAR(32) | Name of another player credited with a pass defense. |
| 251 | `fumbled_1_team` | text | 98.6% | up to 3 chars | VARCHAR(4) ascii | Team of the first player who fumbled on the play. |
| 252 | `fumbled_1_player_id` | text | 98.6% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the first player who fumbled on the play. |
| 253 | `fumbled_1_player_name` | text | 98.6% | up to 18 chars | VARCHAR(32) | Name of the first player who fumbled on the play. |
| 254 | `fumbled_2_player_id` | text | 100.0% | 3 values: 00-0032889, 00-0036139, 00-0036389 | VARCHAR(10) ascii_bin | Unique identifier for the second player who fumbled on the play. |
| 255 | `fumbled_2_player_name` | text | 100.0% | 3 values: A.Robinson, J.Hurts, R.Dowdle | VARCHAR(16) | Name of the second player who fumbled on the play. |
| 256 | `fumbled_2_team` | text | 100.0% | 2 values: CAR, PHI | VARCHAR(4) ascii | Team of the second player who fumbled on the play. |
| 257 | `fumble_recovery_1_team` | text | 98.8% | up to 3 chars | VARCHAR(4) ascii | Team of one of the players who recovered a fumble. |
| 258 | `fumble_recovery_1_yards` | integer | 98.8% | -6 to 87 | SMALLINT | Yards gained by one of the players who recovered a fumble. |
| 259 | `fumble_recovery_1_player_id` | text | 98.8% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the players who recovered a fumble. |
| 260 | `fumble_recovery_1_player_name` | text | 98.8% | up to 18 chars | VARCHAR(32) | Name of one of the players who recovered a fumble. |
| 261 | `fumble_recovery_2_team` | text | 100.0% | 3 values: CAR, LAC, PIT | VARCHAR(4) ascii | Team of another player who recovered a fumble. |
| 262 | `fumble_recovery_2_yards` | integer | 100.0% | 0 to 3 | TINYINT UNSIGNED | Yards gained by another player who recovered a fumble. |
| 263 | `fumble_recovery_2_player_id` | text | 100.0% | 4 values: 00-0032889, 00-0033886, 00-0036338, 00-0039342 | VARCHAR(10) ascii_bin | Unique identifier for another player who recovered a fumble. |
| 264 | `fumble_recovery_2_player_name` | text | 100.0% | 4 values: A.Robinson, T.Dye, T.Watt, X.Legette | VARCHAR(16) | Name of another player who recovered a fumble. |
| 265 | `sack_player_id` | text | 97.6% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the player credited with a solo sack. |
| 266 | `sack_player_name` | text | 97.6% | up to 18 chars | VARCHAR(32) | Name of the player credited with a solo sack. |
| 267 | `half_sack_1_player_id` | text | 99.7% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the first player credited with half a sack. |
| 268 | `half_sack_1_player_name` | text | 99.7% | up to 16 chars | VARCHAR(32) | Name of the first player credited with half a sack. |
| 269 | `half_sack_2_player_id` | text | 99.7% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the second player credited with half a sack. |
| 270 | `half_sack_2_player_name` | text | 99.7% | up to 16 chars | VARCHAR(32) | Name of the second player credited with half a sack. |
| 271 | `return_team` | text | 89.2% | up to 3 chars | VARCHAR(4) ascii | Abbreviation for the team returning the ball on a return play |
| 272 | `return_yards` | integer | 3.0% | -10 to 100 | SMALLINT | Yards gained by the returning team |
| 273 | `penalty_team` | text | 91.7% | up to 3 chars | VARCHAR(4) ascii | Abbreviation for the team that committed the penalty |
| 274 | `penalty_player_id` | text | 92.5% | up to 10 chars | VARCHAR(10) ascii_bin | Identifier of the player who committed the penalty |
| 275 | `penalty_player_name` | text | 92.5% | up to 18 chars | VARCHAR(32) | Name of the player who committed the penalty |
| 276 | `penalty_yards` | integer | 91.7% | 0 to 52 | TINYINT UNSIGNED | Yards gained or lost by the offense due to the penalty |
| 277 | `replay_or_challenge` | integer | 0.0% | 0 to 1 | BOOLEAN | Flag for whether a replay review or challenge occurred |
| 278 | `replay_or_challenge_result` | text | 99.3% | 2 values: reversed, upheld | VARCHAR(16) | Outcome of the replay review or challenge |
| 279 | `penalty_type` | text | 91.7% | up to 42 chars | VARCHAR(64) | Category of the first penalty on the play; NA if the description does not name it |
| 280 | `defensive_two_point_attempt` | integer | 3.0% | 0 to 1 | BOOLEAN | Flag for whether the defense could attempt a two-point conversion after a turnover |
| 281 | `defensive_two_point_conv` | integer | 3.0% | 0 to 1 | BOOLEAN | Flag for whether the defense scored on that two-point attempt |
| 282 | `defensive_extra_point_attempt` | integer | 3.0% | 0 to 0 | BOOLEAN | Flag for whether the defense could attempt an extra point after recovering a blocked kick |
| 283 | `defensive_extra_point_conv` | integer | 3.0% | 0 to 0 | BOOLEAN | Flag for whether the defense scored on that extra point attempt |
| 284 | `safety_player_name` | text | 100.0% | 9 values: D.Barnes, D.Ezeiruaku, D.Payne, J.Hines-Allen, J.Simmons, K.Dugger, K.Mack, K.Merriweather, T.Wilson | VARCHAR(32) | Name of the player credited with a safety |
| 285 | `safety_player_id` | text | 100.0% | 9 values: 00-0031040, 00-0034333, 00-0035642, 00-0035643, 00-0036231, 00-0036964, 00-0038541, 00-0038823, 00-0040725 | VARCHAR(10) ascii_bin | Identifier of the player credited with a safety |
| 286 | `season` | integer | 0.0% | 2025 to 2026 | SMALLINT UNSIGNED | Four-digit year of the season the game belongs to |
| 287 | `cp` | decimal | 64.0% | 0.160301 to 0.92595 | DOUBLE | Estimated completion probability for a pass based on comparable game situations |
| 288 | `cpoe` | decimal | 64.0% | -91.2298 to 79.3681 | DOUBLE | Completion percentage over expectation; for one pass, 1 minus cp if completed or negative cp if not |
| 289 | `series` | integer | 0.0% | 1 to 76 | TINYINT UNSIGNED | Series counter that rises with each new first down and is shared by both teams; NA for kickoffs, PATs, and non-plays |
| 290 | `series_success` | integer | 0.0% | 0 to 1 | BOOLEAN | Flag for whether the series ended successfully through a touchdown or first down |
| 291 | `series_result` | text | 0.0% | 11 values: End of half, Field goal, First down, Missed field goal, Opp touchdown, Punt, QB kneel, Safety, Touchdown, Turnover, Turnover on downs | VARCHAR(32) | Final outcome of the series, such as first down, touchdown, turnover, or punt |
| 292 | `order_sequence` | integer | 0.0% | 1 to 5519 | SMALLINT UNSIGNED | NFL-supplied sequence number used to correct out-of-order plays; available from 2011 onward |
| 293 | `start_time` | text | 0.0% | up to 18 chars | VARCHAR(32) | Kickoff time of the game in Eastern time |
| 294 | `time_of_day` | datetime | 2.9% | 2025-09-05T00:23:01.813Z to 2026-11-06T04:05:29Z | DATETIME(3) (UTC) | UTC time of the play in HH:MM:SS format; available from 2011 onward |
| 295 | `stadium` | text | 0.0% | up to 31 chars | VARCHAR(64) | Name of the game venue |
| 296 | `weather` | text | 7.2% | up to 76 chars | VARCHAR(128) | Free-text description of temperature, humidity, and wind; constant throughout the game |
| 297 | `nfl_api_id` | text | 0.0% | up to 36 chars | VARCHAR(64) ascii | UUID identifying the game in the NFL's newer API |
| 298 | `play_clock` | integer | 0.0% | 0 to 0 | TINYINT UNSIGNED | Play clock reading at the moment of the snap |
| 299 | `play_deleted` | integer | 0.0% | 0 to 0 | BOOLEAN | Flag for plays that were deleted |
| 300 | `play_type_nfl` | text | 0.0% | up to 28 chars | VARCHAR(64) | Play type as labeled by the NFL, which differs slightly from play_type |
| 301 | `special_teams_play` | integer | 0.0% | 0 to 1 | BOOLEAN | Flag for special teams plays per the NFL source; available from 2011 onward |
| 302 | `st_play_type` | empty | 100.0% |  | VARCHAR(64) (empty in profiled seasons) | Special teams play category from the NFL source; available from 2011 onward |
| 303 | `end_clock_time` | datetime | 16.8% | 2025-09-05T00:23:10.123Z to 2026-11-06T04:04:10.940Z | DATETIME(3) (UTC) | Game clock time when the play ended |
| 304 | `end_yard_line` | empty | 100.0% |  | VARCHAR(64) (empty in profiled seasons) | Team half and yard line where the play ended |
| 305 | `fixed_drive` | integer | 0.0% | 1 to 31 | TINYINT UNSIGNED | Manually assigned drive number within the game |
| 306 | `fixed_drive_result` | text | 0.0% | 9 values: End of half, Field goal, Missed field goal, Opp touchdown, Punt, Safety, Touchdown, Turnover, Turnover on downs | VARCHAR(32) | Manually assigned result of the drive |
| 307 | `drive_real_start_time` | datetime | 1.1% | 2025-09-05T00:23:01.813Z to 2026-11-06T03:59:32.230Z | DATETIME(3) (UTC) | Local time of day the drive started; rarely populated by the NFL |
| 308 | `drive_play_count` | integer | 1.1% | 0 to 21 | TINYINT UNSIGNED | Number of regular plays in the drive |
| 309 | `drive_time_of_possession` | time | 1.1% |  | VARCHAR(5) ascii (mm:ss clock, not a time of day) | Time of possession for the drive |
| 310 | `drive_first_downs` | integer | 1.1% | 0 to 9 | TINYINT UNSIGNED | Number of first downs gained during the drive |
| 311 | `drive_inside20` | integer | 1.1% | 0 to 1 | BOOLEAN | Flag for whether the offense reached inside the opponent's 20-yard line |
| 312 | `drive_ended_with_score` | integer | 1.1% | 0 to 1 | BOOLEAN | Flag for whether the drive ended with points |
| 313 | `drive_quarter_start` | integer | 1.1% | 1 to 5 | TINYINT UNSIGNED | Quarter in which the drive began |
| 314 | `drive_quarter_end` | integer | 1.1% | 1 to 5 | TINYINT UNSIGNED | Quarter in which the drive ended |
| 315 | `drive_yards_penalized` | integer | 1.1% | -50 to 63 | TINYINT | Net yards the offense gained or lost through penalties during the drive |
| 316 | `drive_start_transition` | text | 1.1% | up to 19 chars | VARCHAR(32) | How the offense gained possession to start the drive |
| 317 | `drive_end_transition` | text | 1.1% | up to 19 chars | VARCHAR(32) | How the offense lost possession to end the drive |
| 318 | `drive_game_clock_start` | time | 1.1% |  | VARCHAR(5) ascii (mm:ss clock, not a time of day) | Game clock time when the drive began |
| 319 | `drive_game_clock_end` | time | 1.1% |  | VARCHAR(5) ascii (mm:ss clock, not a time of day) | Game clock time when the drive ended |
| 320 | `drive_start_yard_line` | text | 1.2% | up to 6 chars | VARCHAR(8) | Team half and yard line where the drive started |
| 321 | `drive_end_yard_line` | text | 1.2% | up to 6 chars | VARCHAR(8) | Team half and yard line where the drive ended |
| 322 | `drive_play_id_started` | integer | 1.1% | 39 to 5409 | SMALLINT UNSIGNED | play_id of the first play in the drive |
| 323 | `drive_play_id_ended` | integer | 1.1% | 39 to 5485 | SMALLINT UNSIGNED | play_id of the last play in the drive |
| 324 | `away_score` | integer | 0.0% | 0 to 59 | TINYINT UNSIGNED | Total points scored by the away team |
| 325 | `home_score` | integer | 0.0% | 0 to 52 | TINYINT UNSIGNED | Total points scored by the home team |
| 326 | `location` | text | 0.0% | 2 values: Home, Neutral | ENUM('Home','Neutral') | Whether the home team played at home or at a neutral site |
| 327 | `result` | integer | 0.0% | -34 to 38 | TINYINT | Home score minus away score, giving the outcome from the home team's perspective |
| 328 | `total` | integer | 0.0% | 12 to 96 | TINYINT UNSIGNED | Combined points scored by both teams |
| 329 | `spread_line` | decimal | 0.0% | -13.5 to 15.5 | DOUBLE | Closing point spread; positive favors the home team, negative favors the away team (Pro-Football-Reference) |
| 330 | `total_line` | decimal | 0.0% | 33.5 to 55.5 | DOUBLE | Closing over/under total points line (Pro-Football-Reference) |
| 331 | `div_game` | integer | 0.0% | 0 to 1 | BOOLEAN | Flag for whether the game was a divisional matchup |
| 332 | `roof` | text | 0.0% | 3 values: closed, dome, outdoors | VARCHAR(16) | Roof status of the venue: dome, outdoors, closed, or open (Pro-Football-Reference) |
| 333 | `surface` | text | 0.3% | 6 values: a_turf, astroturf, fieldturf, grass, matrixturf, sportturf | VARCHAR(16) | Type of playing surface (Pro-Football-Reference) |
| 334 | `temp` | integer | 33.7% | 8 to 92 | SMALLINT | Stadium temperature, populated only for outdoor or open roofs (Pro-Football-Reference) |
| 335 | `wind` | integer | 33.7% | 0 to 22 | TINYINT UNSIGNED | Wind speed in miles per hour, populated only for outdoor or open roofs (Pro-Football-Reference) |
| 336 | `home_coach` | text | 0.0% | up to 20 chars | VARCHAR(32) | First and last name of the home head coach (Pro-Football-Reference) |
| 337 | `away_coach` | text | 0.0% | up to 20 chars | VARCHAR(32) | First and last name of the away head coach (Pro-Football-Reference) |
| 338 | `stadium_id` | text | 0.0% | up to 5 chars | VARCHAR(8) ascii | Identifier of the stadium (Pro-Football-Reference) |
| 339 | `game_stadium` | text | 0.0% | up to 31 chars | VARCHAR(64) | Name of the stadium where the game was played (Pro-Football-Reference) |
| 340 | `aborted_play` | integer | 0.0% | 0 to 1 | BOOLEAN | Flag for plays whose description indicates they were aborted |
| 341 | `success` | integer | 1.1% | 0 to 1 | BOOLEAN | Flag for whether the play produced positive EPA |
| 342 | `passer` | text | 54.8% | up to 14 chars | VARCHAR(32) | Name of the dropback player, including scramblers and plays with penalties |
| 343 | `passer_jersey_number` | integer | 54.7% | 0 to 86 | TINYINT UNSIGNED | Jersey number of the passer |
| 344 | `rusher` | text | 70.2% | up to 17 chars | VARCHAR(32) | Name of the rusher, excluding scrambles, including plays with penalties |
| 345 | `rusher_jersey_number` | integer | 68.6% | 0 to 92 | TINYINT UNSIGNED | Jersey number of the rusher |
| 346 | `receiver` | text | 61.7% | up to 18 chars | VARCHAR(32) | Name of the receiver, including plays with penalties |
| 347 | `receiver_jersey_number` | integer | 61.4% | 0 to 98 | TINYINT UNSIGNED | Jersey number of the receiver |
| 348 | `pass` | integer | 0.0% | 0 to 1 | BOOLEAN | Flag for pass plays, counting sacks and scrambles |
| 349 | `rush` | integer | 0.0% | 0 to 1 | BOOLEAN | Flag for rushing plays |
| 350 | `first_down` | integer | 3.0% | 0 to 1 | BOOLEAN | Flag for plays that ended in a first down |
| 351 | `special` | integer | 0.0% | 0 to 1 | BOOLEAN | Flag for plays typed as extra point, field goal, kickoff, or punt |
| 352 | `play` | integer | 0.0% | 0 to 1 | BOOLEAN | Flag for normal plays, including penalties; 0 otherwise |
| 353 | `passer_id` | text | 54.8% | up to 10 chars | VARCHAR(10) ascii_bin | ID of the player listed in the passer column |
| 354 | `rusher_id` | text | 70.2% | up to 10 chars | VARCHAR(10) ascii_bin | ID of the player listed in the rusher column |
| 355 | `receiver_id` | text | 61.7% | up to 10 chars | VARCHAR(10) ascii_bin | ID of the player listed in the receiver column |
| 356 | `name` | text | 25.0% | up to 17 chars | VARCHAR(32) | Name of the passer if present, otherwise the rusher |
| 357 | `jersey_number` | integer | 25.9% | 0 to 92 | TINYINT UNSIGNED | Jersey number of the player in the name column |
| 358 | `id` | text | 25.0% | up to 10 chars | VARCHAR(10) ascii_bin | ID of the player in the name column |
| 359 | `fantasy_player_name` | text | 32.5% | up to 18 chars | VARCHAR(32) | Name of the rusher on rush plays or receiver on pass plays, from official stats |
| 360 | `fantasy_player_id` | text | 32.5% | up to 10 chars | VARCHAR(10) ascii_bin | ID of the rusher on rush plays or receiver on pass plays, from official stats |
| 361 | `fantasy` | text | 29.7% | up to 18 chars | VARCHAR(32) | Name of the rusher on rush plays or receiver on pass plays |
| 362 | `fantasy_id` | text | 29.7% | up to 10 chars | VARCHAR(10) ascii_bin | ID of the rusher on rush plays or receiver on pass plays |
| 363 | `out_of_bounds` | integer | 0.0% | 0 to 1 | BOOLEAN | Flag set when the play description notes a player ran, was pushed, or was sacked out of bounds |
| 364 | `home_opening_kickoff` | integer | 0.0% | 0 to 1 | BOOLEAN | Flag set when the home team received the opening kickoff |
| 365 | `qb_epa` | decimal | 1.1% | -12.6581 to 7.96741 | DOUBLE | QB EPA credit, capped at a fumble lost after a completed catch, so it behaves like passing yards on fumble plays |
| 366 | `xyac_epa` | decimal | 66.5% | -2.32932 to 5.92889 | DOUBLE | Expected EPA gained after the catch, measured from the catch location |
| 367 | `xyac_mean_yardage` | decimal | 66.5% | 0.40953 to 21.2178 | DOUBLE | Average expected yards after catch given where the ball was caught |
| 368 | `xyac_median_yardage` | integer | 66.5% | 0 to 33 | TINYINT UNSIGNED | Median expected yards after catch given where the ball was caught |
| 369 | `xyac_success` | decimal | 66.5% | 0.0388995 to 1 | DOUBLE | Probability the play earns positive EPA relative to its starting point, based on catch location |
| 370 | `xyac_fd` | decimal | 66.5% | 0.00727958 to 1 | DOUBLE | Probability the play earns a first down based on catch location |
| 371 | `xpass` | decimal | 23.8% | 0.013008 to 0.996765 | DOUBLE | Dropback probability, scaled from 0 to 1 |
| 372 | `pass_oe` | decimal | 26.1% | -99.5382 to 97.8482 | DOUBLE | Dropback percent over expected, scaled from 0 to 100 |
