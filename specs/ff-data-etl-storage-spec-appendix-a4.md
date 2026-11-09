# Implementation Spec — Data ETL & Storage: Appendix A, part 4 of 5

**Play-by-play, columns 1–186.** Part of [`ff-data-etl-storage-spec.md`](ff-data-etl-storage-spec.md), §7.2; split into five files only because of file-size limits.

Every column of every ingested file, profiled 2026-11-08. **Observed** is the type found in the data; **Nulls** the share of empty values; **Proposed MySQL type** applies §7.2.2 (integers sized to twice the largest value seen). Descriptions come from nflverse's dictionaries, linked per dataset; where a dataset's note says so, they are approximate or borrowed.

### A. Play-by-play (`pbp`, current season)

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
| 11 | `side_of_field` | text | 7.2% | up to 3 chars | VARCHAR(4) | String abbreviation for which team's side of the field the team with possession is currently on. |
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
| 50 | `timeout_team` | text | 95.5% | up to 3 chars | VARCHAR(4) | String abbreviation for which team called the timeout. |
| 51 | `td_team` | text | 97.0% | up to 3 chars | VARCHAR(4) | String abbreviation for which team scored the touchdown. |
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
