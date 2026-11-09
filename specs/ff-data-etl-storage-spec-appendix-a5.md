# Implementation Spec — Data ETL & Storage: Appendix A, part 5 of 5

**Play-by-play, columns 187–372.** Part of [`ff-data-etl-storage-spec.md`](ff-data-etl-storage-spec.md), §7.2; split into five files only because of file-size limits.

Every column of every ingested file, profiled 2026-11-08. **Observed** is the type found in the data; **Nulls** the share of empty values; **Proposed MySQL type** applies §7.2.2 (integers sized to twice the largest value seen). Descriptions come from nflverse's dictionaries, linked per dataset; where a dataset's note says so, they are approximate or borrowed.

### A. Play-by-play, columns 187–372 (continued)

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
| 216 | `forced_fumble_player_1_team` | text | 99.0% | up to 3 chars | VARCHAR(4) | Team of one of the players who forced a fumble. |
| 217 | `forced_fumble_player_1_player_id` | text | 99.0% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the players who forced a fumble. |
| 218 | `forced_fumble_player_1_player_name` | text | 99.0% | up to 17 chars | VARCHAR(32) | Name of one of the players who forced a fumble. |
| 219 | `forced_fumble_player_2_team` | text | 100.0% | 3 values: DAL, LAC, SEA | VARCHAR(4) | Team of another player who forced a fumble. |
| 220 | `forced_fumble_player_2_player_id` | text | 100.0% | 3 values: 00-0034869, 00-0040144, 00-0040725 | VARCHAR(10) ascii_bin | Unique identifier for another player who forced a fumble. |
| 221 | `forced_fumble_player_2_player_name` | text | 100.0% | 3 values: D.Ezeiruaku, J.Caldwell, S.Darnold | VARCHAR(16) | Name of another player who forced a fumble. |
| 222 | `solo_tackle_1_team` | text | 57.7% | up to 3 chars | VARCHAR(4) | Team of one of the players credited with a solo tackle. |
| 223 | `solo_tackle_2_team` | text | 99.9% | up to 3 chars | VARCHAR(4) | Team of another player credited with a solo tackle. |
| 224 | `solo_tackle_1_player_id` | text | 57.7% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the players credited with a solo tackle. |
| 225 | `solo_tackle_2_player_id` | text | 99.9% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for another player credited with a solo tackle. |
| 226 | `solo_tackle_1_player_name` | text | 57.7% | up to 19 chars | VARCHAR(32) | Name of one of the players credited with a solo tackle. |
| 227 | `solo_tackle_2_player_name` | text | 99.9% | up to 13 chars | VARCHAR(32) | Name of another player credited with a solo tackle. |
| 228 | `assist_tackle_1_player_id` | text | 81.6% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the players credited with a tackle assist. |
| 229 | `assist_tackle_1_player_name` | text | 81.6% | up to 19 chars | VARCHAR(32) | Name of one of the players credited with a tackle assist. |
| 230 | `assist_tackle_1_team` | text | 81.6% | up to 3 chars | VARCHAR(4) | Team of one of the players credited with a tackle assist. |
| 231 | `assist_tackle_2_player_id` | text | 82.6% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for another player credited with a tackle assist. |
| 232 | `assist_tackle_2_player_name` | text | 82.6% | up to 19 chars | VARCHAR(32) | Name of another player credited with a tackle assist. |
| 233 | `assist_tackle_2_team` | text | 82.6% | up to 3 chars | VARCHAR(4) | Team of another player credited with a tackle assist. |
| 234 | `assist_tackle_3_player_id` | text | 100.0% | 1 values: 00-0039884 | VARCHAR(10) ascii_bin | Unique identifier for a third player credited with a tackle assist. |
| 235 | `assist_tackle_3_player_name` | text | 100.0% | 1 values: T.Washington | VARCHAR(16) | Name of a third player credited with a tackle assist. |
| 236 | `assist_tackle_3_team` | text | 100.0% | 1 values: MIA | VARCHAR(4) | Team of a third player credited with a tackle assist. |
| 237 | `assist_tackle_4_player_id` | text | 100.0% | 1 values: 00-0037252 | VARCHAR(10) ascii_bin | Unique identifier for a fourth player credited with a tackle assist. |
| 238 | `assist_tackle_4_player_name` | text | 100.0% | 1 values: G.Dulcich | VARCHAR(16) | Name of a fourth player credited with a tackle assist. |
| 239 | `assist_tackle_4_team` | text | 100.0% | 1 values: MIA | VARCHAR(4) | Team of a fourth player credited with a tackle assist. |
| 240 | `tackle_with_assist` | integer | 3.0% | 0 to 1 | BOOLEAN | Binary indicator for whether a tackle with assist occurred. |
| 241 | `tackle_with_assist_1_player_id` | text | 98.6% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the players in a tackle with assist. |
| 242 | `tackle_with_assist_1_player_name` | text | 98.6% | up to 18 chars | VARCHAR(32) | Name of one of the players in a tackle with assist. |
| 243 | `tackle_with_assist_1_team` | text | 98.6% | up to 3 chars | VARCHAR(4) | Team of one of the players in a tackle with assist. |
| 244 | `tackle_with_assist_2_player_id` | empty | 100.0% |  | VARCHAR(10) ascii_bin (empty in profiled seasons) | Unique identifier for another player in a tackle with assist. |
| 245 | `tackle_with_assist_2_player_name` | empty | 100.0% |  | VARCHAR(64) (empty in profiled seasons) | Name of another player in a tackle with assist. |
| 246 | `tackle_with_assist_2_team` | empty | 100.0% |  | VARCHAR(3) ascii (empty in profiled seasons) | Team of another player in a tackle with assist. |
| 247 | `pass_defense_1_player_id` | text | 95.0% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the players credited with a pass defense. |
| 248 | `pass_defense_1_player_name` | text | 95.0% | up to 18 chars | VARCHAR(32) | Name of one of the players credited with a pass defense. |
| 249 | `pass_defense_2_player_id` | text | 99.8% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for another player credited with a pass defense. |
| 250 | `pass_defense_2_player_name` | text | 99.8% | up to 17 chars | VARCHAR(32) | Name of another player credited with a pass defense. |
| 251 | `fumbled_1_team` | text | 98.6% | up to 3 chars | VARCHAR(4) | Team of the first player who fumbled on the play. |
| 252 | `fumbled_1_player_id` | text | 98.6% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the first player who fumbled on the play. |
| 253 | `fumbled_1_player_name` | text | 98.6% | up to 18 chars | VARCHAR(32) | Name of the first player who fumbled on the play. |
| 254 | `fumbled_2_player_id` | text | 100.0% | 3 values: 00-0032889, 00-0036139, 00-0036389 | VARCHAR(10) ascii_bin | Unique identifier for the second player who fumbled on the play. |
| 255 | `fumbled_2_player_name` | text | 100.0% | 3 values: A.Robinson, J.Hurts, R.Dowdle | VARCHAR(16) | Name of the second player who fumbled on the play. |
| 256 | `fumbled_2_team` | text | 100.0% | 2 values: CAR, PHI | VARCHAR(4) | Team of the second player who fumbled on the play. |
| 257 | `fumble_recovery_1_team` | text | 98.8% | up to 3 chars | VARCHAR(4) | Team of one of the players who recovered a fumble. |
| 258 | `fumble_recovery_1_yards` | integer | 98.8% | -6 to 87 | SMALLINT | Yards gained by one of the players who recovered a fumble. |
| 259 | `fumble_recovery_1_player_id` | text | 98.8% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for one of the players who recovered a fumble. |
| 260 | `fumble_recovery_1_player_name` | text | 98.8% | up to 18 chars | VARCHAR(32) | Name of one of the players who recovered a fumble. |
| 261 | `fumble_recovery_2_team` | text | 100.0% | 3 values: CAR, LAC, PIT | VARCHAR(4) | Team of another player who recovered a fumble. |
| 262 | `fumble_recovery_2_yards` | integer | 100.0% | 0 to 3 | TINYINT UNSIGNED | Yards gained by another player who recovered a fumble. |
| 263 | `fumble_recovery_2_player_id` | text | 100.0% | 4 values: 00-0032889, 00-0033886, 00-0036338, 00-0039342 | VARCHAR(10) ascii_bin | Unique identifier for another player who recovered a fumble. |
| 264 | `fumble_recovery_2_player_name` | text | 100.0% | 4 values: A.Robinson, T.Dye, T.Watt, X.Legette | VARCHAR(16) | Name of another player who recovered a fumble. |
| 265 | `sack_player_id` | text | 97.6% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the player credited with a solo sack. |
| 266 | `sack_player_name` | text | 97.6% | up to 18 chars | VARCHAR(32) | Name of the player credited with a solo sack. |
| 267 | `half_sack_1_player_id` | text | 99.7% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the first player credited with half a sack. |
| 268 | `half_sack_1_player_name` | text | 99.7% | up to 16 chars | VARCHAR(32) | Name of the first player credited with half a sack. |
| 269 | `half_sack_2_player_id` | text | 99.7% | up to 10 chars | VARCHAR(10) ascii_bin | Unique identifier for the second player credited with half a sack. |
| 270 | `half_sack_2_player_name` | text | 99.7% | up to 16 chars | VARCHAR(32) | Name of the second player credited with half a sack. |
| 271 | `return_team` | text | 89.2% | up to 3 chars | VARCHAR(4) | Abbreviation for the team returning the ball on a return play |
| 272 | `return_yards` | integer | 3.0% | -10 to 100 | SMALLINT | Yards gained by the returning team |
| 273 | `penalty_team` | text | 91.7% | up to 3 chars | VARCHAR(4) | Abbreviation for the team that committed the penalty |
| 274 | `penalty_player_id` | text | 92.5% | up to 10 chars | VARCHAR(10) ascii_bin | Identifier of the player who committed the penalty |
| 275 | `penalty_player_name` | text | 92.5% | up to 18 chars | VARCHAR(32) | Name of the player who committed the penalty |
| 276 | `penalty_yards` | integer | 91.7% | 0 to 52 | TINYINT UNSIGNED | Yards gained or lost by the offense due to the penalty |
| 277 | `replay_or_challenge` | integer | 0.0% | 0 to 1 | BOOLEAN | Flag for whether a replay review or challenge occurred |
| 278 | `replay_or_challenge_result` | text | 99.3% | 2 values: reversed, upheld | VARCHAR(16) | Outcome of the replay review or challenge |
| 279 | `penalty_type` | text | 91.7% | up to 42 chars | VARCHAR(64) | Category of the first penalty on the play; NA if the description does not name it |
| 280 | `defensive_two_point_attempt` | integer | 3.0% | 0 to 1 | BOOLEAN | Flag for whether the defense could attempt a two-point conversion after a turnover |
| 281 | `defensive_two_point_conv` | integer | 3.0% | 0 to 1 | BOOLEAN | Flag for whether the defense scored on that two-point attempt |
| 282 | `defensive_extra_point_attempt` | integer | 3.0% | 0 to 0 | TINYINT UNSIGNED | Flag for whether the defense could attempt an extra point after recovering a blocked kick |
| 283 | `defensive_extra_point_conv` | integer | 3.0% | 0 to 0 | TINYINT UNSIGNED | Flag for whether the defense scored on that extra point attempt |
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
| 299 | `play_deleted` | integer | 0.0% | 0 to 0 | TINYINT UNSIGNED | Flag for plays that were deleted |
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
| 334 | `temp` | integer | 33.7% | 8 to 92 | TINYINT UNSIGNED | Stadium temperature, populated only for outdoor or open roofs (Pro-Football-Reference) |
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
