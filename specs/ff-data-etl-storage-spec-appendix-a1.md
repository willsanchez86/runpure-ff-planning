# Implementation Spec — Data ETL & Storage: Appendix A, part 1 of 5

**Weekly player stats.** Part of [`ff-data-etl-storage-spec.md`](ff-data-etl-storage-spec.md), §7.2; split into five files only because of file-size limits.

Every column of every ingested file, profiled 2026-11-08. **Observed** is the type found in the data; **Nulls** the share of empty values; **Proposed MySQL type** applies §7.2.2 (integers sized to twice the largest value seen). Descriptions come from nflverse's dictionaries, linked per dataset; where a dataset's note says so, they are approximate or borrowed.

### A. Weekly player stats (`stats_player`)

Descriptions: [nflreadr dictionary](https://ftp.fau.de/cran/web/packages/nflreadr/vignettes/dictionary_player_stats.html). The dictionary predates 36 newer columns, shown as having no entry.

Grain: one player in one week. Natural key: player_id, season, week, season_type. Profiled: 173,203 rows (2017–2026). 150 columns; 114 have an nflreadr dictionary entry.

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

