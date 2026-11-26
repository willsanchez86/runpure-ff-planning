-- Schema principles review (2026-11-24): every diagnostic check, one result grid.
-- Referenced from design/reviews/2026-11-24-schema-principles-review.md §4 section 3.
--
-- CHANGES NO DATA. Reads every table; writes only to two TEMPORARY tables (diag_check,
-- diag_result) that exist in your own session and disappear when the connection closes.
--
-- HOW TO RUN (MySQL Workbench):
--   1. Raise the read timeout once: Edit > Preferences > SQL Editor > "DBMS connection read
--      timeout interval" = 600, then OK, then reconnect (close and reopen the connection tab).
--      The default 30 seconds is too short for check 15, which scans `play`.
--   2. Select the runpure schema (double-click it in the Navigator).
--   3. Run the whole file with the lightning-bolt "Execute" button (Ctrl+Shift+Enter).
--      It takes one to a few minutes. Only the last statement opens a result tab.
--   4. In that tab, click the Export button on the result grid's toolbar ("Export recordset
--      to an external file"), choose CSV, and save it as Downloads\diag-results.csv.
--      If the Output panel shows an error instead, paste that error line.
--
-- The grid has one row per result row: result_no, check_name, detail. `detail` is a JSON
-- object whose keys are that check's column names. A check with no rows shows one row
-- with detail NULL (for checks 1, 4 and 5, that means "none found", the good outcome).
--
-- CHECKS
--    1  job_run rows that block sql/0014 (no rows = safe to apply 0014)
--    2  Current ingest_ledger columns (shows whether the update script was already run)
--    3  Current job_run columns (outcome's ENUM shows whether 0014 was applied)
--    4  O2: pfr_id values shared by more than one player (any row rules out option a)
--    5  espn_id values shared by more than one player
--    6  O2: snap_count PFR IDs that match no player
--    7  O2: roster GSIS candidates for those unmatched PFR IDs (evidence, not proof)
--    8  depth_chart rows with no gsis_id
--    9  O1: roster rows whose player is missing, by season
--   10  O1: weekly stat rows whose player is missing, by season
--   11  O1/O4: every player reference with no player row (54 columns, 48 of them on play)
--   12  D2: game references with no game row
--   13  Index inventory (P5)
--   14  P2 guard: descriptor columns on player_week_stat, roster, injury_report, depth_chart, game (33 columns)
--   15  P2 guard: play player-name columns (48 columns; slowest)
--
-- Checks 14 and 15, detail keys:
--   players_with_value   distinct players with a non-NULL value in the fact column
--   no_player_row        of those, players with no row in `player` (they need a placeholder, O1,
--                        and the fact row is the only place their name/IDs exist)
--   value_only_on_fact   players that exist in `player` but whose matching `player` column is NULL:
--                        dropping the fact column would lose this value unless it is copied first
--   conflicting_players  players whose fact value differs from `player`'s; for a per-season table
--                        (roster) a difference can be legitimate history (height and weight are
--                        re-measured), so read before deciding
--   rows_without_id      fact rows carrying this value but no player ID: the text is the only record
--                        of who the row is about, and no `player` row can hold it
-- A column is safe to drop when no_player_row, value_only_on_fact, conflicting_players and
-- rows_without_id are 0, or when those values have first been kept elsewhere as decided.
-- Check 15: play names use the 'F.Last' format (data dictionary A10); player.short_name holds
-- that format but is 68% NULL, so play is compared with player.display_name for loss only;
-- conflicts are not computed (different formats).

DROP TEMPORARY TABLE IF EXISTS diag_result;
DROP TEMPORARY TABLE IF EXISTS diag_check;
CREATE TEMPORARY TABLE diag_check (
  result_no  TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  check_name VARCHAR(200) NOT NULL
);
CREATE TEMPORARY TABLE diag_result (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  result_no  TINYINT UNSIGNED NOT NULL,
  detail     JSON NOT NULL
);
INSERT INTO diag_check (result_no, check_name) VALUES
  (1, 'job_run rows that block sql/0014 (no rows = safe to apply 0014)'),
  (2, 'Current ingest_ledger columns (shows whether the update script was already run)'),
  (3, 'Current job_run columns (outcome''s ENUM shows whether 0014 was applied)'),
  (4, 'O2: pfr_id values shared by more than one player (any row rules out option a)'),
  (5, 'espn_id values shared by more than one player'),
  (6, 'O2: snap_count PFR IDs that match no player'),
  (7, 'O2: roster GSIS candidates for those unmatched PFR IDs (evidence, not proof)'),
  (8, 'depth_chart rows with no gsis_id'),
  (9, 'O1: roster rows whose player is missing, by season'),
  (10, 'O1: weekly stat rows whose player is missing, by season'),
  (11, 'O1/O4: every player reference with no player row (54 columns, 48 of them on play)'),
  (12, 'D2: game references with no game row'),
  (13, 'Index inventory (P5)'),
  (14, 'P2 guard: descriptor columns on player_week_stat, roster, injury_report, depth_chart, game (33 columns)'),
  (15, 'P2 guard: play player-name columns (48 columns; slowest)');

-- 1: job_run rows that block sql/0014 (no rows = safe to apply 0014)
INSERT INTO diag_result (result_no, detail)
SELECT 1, JSON_OBJECT('id', t.`id`, 'started_at', t.`started_at`, 'outcome', t.`outcome`)
  FROM (
  SELECT id, started_at, outcome FROM job_run WHERE outcome NOT IN ('running','ok','failed')
  ) AS t
 ORDER BY id;

-- 2: Current ingest_ledger columns (shows whether the update script was already run)
INSERT INTO diag_result (result_no, detail)
SELECT 2, JSON_OBJECT('pos', t.`pos`, 'column_name', t.`column_name`, 'column_type', t.`column_type`, 'is_nullable', t.`is_nullable`, 'column_default', t.`column_default`)
  FROM (
  SELECT ORDINAL_POSITION AS pos, COLUMN_NAME AS column_name, COLUMN_TYPE AS column_type,
         IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ingest_ledger'
  ) AS t
 ORDER BY pos;

-- 3: Current job_run columns (outcome's ENUM shows whether 0014 was applied)
INSERT INTO diag_result (result_no, detail)
SELECT 3, JSON_OBJECT('pos', t.`pos`, 'column_name', t.`column_name`, 'column_type', t.`column_type`, 'is_nullable', t.`is_nullable`, 'column_default', t.`column_default`)
  FROM (
  SELECT ORDINAL_POSITION AS pos, COLUMN_NAME AS column_name, COLUMN_TYPE AS column_type,
         IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_run'
  ) AS t
 ORDER BY pos;

-- 4: O2: pfr_id values shared by more than one player (any row rules out option a)
INSERT INTO diag_result (result_no, detail)
SELECT 4, JSON_OBJECT('pfr_id', t.`pfr_id`, 'player_count', t.`player_count`)
  FROM (
  SELECT pfr_id, COUNT(*) AS player_count
    FROM player WHERE pfr_id IS NOT NULL
   GROUP BY pfr_id HAVING COUNT(*) > 1
  ) AS t
 ORDER BY player_count DESC, pfr_id;

-- 5: espn_id values shared by more than one player
INSERT INTO diag_result (result_no, detail)
SELECT 5, JSON_OBJECT('espn_id', t.`espn_id`, 'player_count', t.`player_count`)
  FROM (
  SELECT espn_id, COUNT(*) AS player_count
    FROM player WHERE espn_id IS NOT NULL
   GROUP BY espn_id HAVING COUNT(*) > 1
  ) AS t
 ORDER BY player_count DESC, espn_id;

-- 6: O2: snap_count PFR IDs that match no player
INSERT INTO diag_result (result_no, detail)
SELECT 6, JSON_OBJECT('pfr_player_id', t.`pfr_player_id`, 'snap_rows', t.`snap_rows`)
  FROM (
  SELECT s.pfr_player_id, COUNT(*) AS snap_rows
    FROM snap_count s
   WHERE NOT EXISTS (SELECT 1 FROM player p WHERE p.pfr_id = s.pfr_player_id)
   GROUP BY s.pfr_player_id
  ) AS t
 ORDER BY snap_rows DESC, pfr_player_id;

-- 7: O2: roster GSIS candidates for those unmatched PFR IDs (evidence, not proof)
INSERT INTO diag_result (result_no, detail)
SELECT 7, JSON_OBJECT('pfr_id', t.`pfr_id`, 'candidate_gsis_count', t.`candidate_gsis_count`, 'candidate_gsis_ids', t.`candidate_gsis_ids`)
  FROM (
  SELECT r.pfr_id, COUNT(DISTINCT r.gsis_id) AS candidate_gsis_count,
         GROUP_CONCAT(DISTINCT r.gsis_id ORDER BY r.gsis_id) AS candidate_gsis_ids
    FROM roster r
   WHERE r.pfr_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM snap_count s WHERE s.pfr_player_id = r.pfr_id)
     AND NOT EXISTS (SELECT 1 FROM player p WHERE p.pfr_id = r.pfr_id)
   GROUP BY r.pfr_id
  ) AS t
 ORDER BY pfr_id;

-- 8: depth_chart rows with no gsis_id
INSERT INTO diag_result (result_no, detail)
SELECT 8, JSON_OBJECT('depth_chart_rows_without_gsis_id', t.`depth_chart_rows_without_gsis_id`)
  FROM (
  SELECT COUNT(*) AS depth_chart_rows_without_gsis_id FROM depth_chart WHERE gsis_id IS NULL
  ) AS t
 ORDER BY 1;

-- 9: O1: roster rows whose player is missing, by season
INSERT INTO diag_result (result_no, detail)
SELECT 9, JSON_OBJECT('season', t.`season`, 'orphan_rows', t.`orphan_rows`, 'orphan_players', t.`orphan_players`)
  FROM (
  SELECT r.season, COUNT(*) AS orphan_rows, COUNT(DISTINCT r.gsis_id) AS orphan_players
    FROM roster r LEFT JOIN player p ON p.gsis_id = r.gsis_id
   WHERE p.gsis_id IS NULL GROUP BY r.season
  ) AS t
 ORDER BY season;

-- 10: O1: weekly stat rows whose player is missing, by season
INSERT INTO diag_result (result_no, detail)
SELECT 10, JSON_OBJECT('season', t.`season`, 'stat_rows', t.`stat_rows`, 'players', t.`players`)
  FROM (
  SELECT s.season, COUNT(*) AS stat_rows, COUNT(DISTINCT s.player_id) AS players
    FROM player_week_stat s LEFT JOIN player p ON p.gsis_id = s.player_id
   WHERE p.gsis_id IS NULL GROUP BY s.season
  ) AS t
 ORDER BY season;

-- 11: O1/O4: every player reference with no player row (54 columns, 48 of them on play)
INSERT INTO diag_result (result_no, detail)
SELECT 11, JSON_OBJECT('reference_column', t.`reference_column`, 'orphan_rows', t.`orphan_rows`, 'orphan_ids', t.`orphan_ids`)
  FROM (
  SELECT 'roster.gsis_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`gsis_id`) AS orphan_ids
    FROM `roster` f LEFT JOIN `player` p ON p.gsis_id = f.`gsis_id`
   WHERE f.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'player_week_stat.player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`player_id`) AS orphan_ids
    FROM `player_week_stat` f LEFT JOIN `player` p ON p.gsis_id = f.`player_id`
   WHERE f.`player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'injury_report.gsis_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`gsis_id`) AS orphan_ids
    FROM `injury_report` f LEFT JOIN `player` p ON p.gsis_id = f.`gsis_id`
   WHERE f.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'depth_chart.gsis_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`gsis_id`) AS orphan_ids
    FROM `depth_chart` f LEFT JOIN `player` p ON p.gsis_id = f.`gsis_id`
   WHERE f.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'game.home_qb_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`home_qb_id`) AS orphan_ids
    FROM `game` f LEFT JOIN `player` p ON p.gsis_id = f.`home_qb_id`
   WHERE f.`home_qb_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'game.away_qb_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`away_qb_id`) AS orphan_ids
    FROM `game` f LEFT JOIN `player` p ON p.gsis_id = f.`away_qb_id`
   WHERE f.`away_qb_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.td_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`td_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`td_player_id`
   WHERE f.`td_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.passer_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`passer_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`passer_player_id`
   WHERE f.`passer_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.receiver_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`receiver_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`receiver_player_id`
   WHERE f.`receiver_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.rusher_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`rusher_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`rusher_player_id`
   WHERE f.`rusher_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.lateral_receiver_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`lateral_receiver_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`lateral_receiver_player_id`
   WHERE f.`lateral_receiver_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.lateral_rusher_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`lateral_rusher_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`lateral_rusher_player_id`
   WHERE f.`lateral_rusher_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.lateral_sack_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`lateral_sack_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`lateral_sack_player_id`
   WHERE f.`lateral_sack_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.interception_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`interception_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`interception_player_id`
   WHERE f.`interception_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.lateral_interception_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`lateral_interception_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`lateral_interception_player_id`
   WHERE f.`lateral_interception_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.punt_returner_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`punt_returner_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`punt_returner_player_id`
   WHERE f.`punt_returner_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.lateral_punt_returner_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`lateral_punt_returner_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`lateral_punt_returner_player_id`
   WHERE f.`lateral_punt_returner_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.kickoff_returner_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`kickoff_returner_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`kickoff_returner_player_id`
   WHERE f.`kickoff_returner_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.lateral_kickoff_returner_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`lateral_kickoff_returner_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`lateral_kickoff_returner_player_id`
   WHERE f.`lateral_kickoff_returner_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.punter_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`punter_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`punter_player_id`
   WHERE f.`punter_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.kicker_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`kicker_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`kicker_player_id`
   WHERE f.`kicker_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.own_kickoff_recovery_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`own_kickoff_recovery_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`own_kickoff_recovery_player_id`
   WHERE f.`own_kickoff_recovery_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.blocked_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`blocked_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`blocked_player_id`
   WHERE f.`blocked_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.sack_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`sack_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`sack_player_id`
   WHERE f.`sack_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.penalty_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`penalty_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`penalty_player_id`
   WHERE f.`penalty_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.safety_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`safety_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`safety_player_id`
   WHERE f.`safety_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.fantasy_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`fantasy_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`fantasy_player_id`
   WHERE f.`fantasy_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.tackle_for_loss_1_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`tackle_for_loss_1_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`tackle_for_loss_1_player_id`
   WHERE f.`tackle_for_loss_1_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.tackle_for_loss_2_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`tackle_for_loss_2_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`tackle_for_loss_2_player_id`
   WHERE f.`tackle_for_loss_2_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.qb_hit_1_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`qb_hit_1_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`qb_hit_1_player_id`
   WHERE f.`qb_hit_1_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.qb_hit_2_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`qb_hit_2_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`qb_hit_2_player_id`
   WHERE f.`qb_hit_2_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.forced_fumble_player_1_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`forced_fumble_player_1_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`forced_fumble_player_1_player_id`
   WHERE f.`forced_fumble_player_1_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.forced_fumble_player_2_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`forced_fumble_player_2_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`forced_fumble_player_2_player_id`
   WHERE f.`forced_fumble_player_2_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.solo_tackle_1_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`solo_tackle_1_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`solo_tackle_1_player_id`
   WHERE f.`solo_tackle_1_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.solo_tackle_2_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`solo_tackle_2_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`solo_tackle_2_player_id`
   WHERE f.`solo_tackle_2_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.assist_tackle_1_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`assist_tackle_1_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`assist_tackle_1_player_id`
   WHERE f.`assist_tackle_1_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.assist_tackle_2_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`assist_tackle_2_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`assist_tackle_2_player_id`
   WHERE f.`assist_tackle_2_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.assist_tackle_3_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`assist_tackle_3_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`assist_tackle_3_player_id`
   WHERE f.`assist_tackle_3_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.assist_tackle_4_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`assist_tackle_4_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`assist_tackle_4_player_id`
   WHERE f.`assist_tackle_4_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.tackle_with_assist_1_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`tackle_with_assist_1_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`tackle_with_assist_1_player_id`
   WHERE f.`tackle_with_assist_1_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.tackle_with_assist_2_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`tackle_with_assist_2_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`tackle_with_assist_2_player_id`
   WHERE f.`tackle_with_assist_2_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.pass_defense_1_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`pass_defense_1_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`pass_defense_1_player_id`
   WHERE f.`pass_defense_1_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.pass_defense_2_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`pass_defense_2_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`pass_defense_2_player_id`
   WHERE f.`pass_defense_2_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.fumbled_1_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`fumbled_1_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`fumbled_1_player_id`
   WHERE f.`fumbled_1_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.fumbled_2_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`fumbled_2_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`fumbled_2_player_id`
   WHERE f.`fumbled_2_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.fumble_recovery_1_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`fumble_recovery_1_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`fumble_recovery_1_player_id`
   WHERE f.`fumble_recovery_1_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.fumble_recovery_2_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`fumble_recovery_2_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`fumble_recovery_2_player_id`
   WHERE f.`fumble_recovery_2_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.half_sack_1_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`half_sack_1_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`half_sack_1_player_id`
   WHERE f.`half_sack_1_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.half_sack_2_player_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`half_sack_2_player_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`half_sack_2_player_id`
   WHERE f.`half_sack_2_player_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.passer_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`passer_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`passer_id`
   WHERE f.`passer_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.rusher_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`rusher_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`rusher_id`
   WHERE f.`rusher_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.receiver_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`receiver_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`receiver_id`
   WHERE f.`receiver_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.fantasy_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`fantasy_id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`fantasy_id`
   WHERE f.`fantasy_id` IS NOT NULL AND p.gsis_id IS NULL
  UNION ALL
  SELECT 'play.id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.`id`) AS orphan_ids
    FROM `play` f LEFT JOIN `player` p ON p.gsis_id = f.`id`
   WHERE f.`id` IS NOT NULL AND p.gsis_id IS NULL
  ) AS t
 ORDER BY orphan_rows DESC, reference_column;

-- 12: D2: game references with no game row
INSERT INTO diag_result (result_no, detail)
SELECT 12, JSON_OBJECT('reference_column', t.`reference_column`, 'orphan_rows', t.`orphan_rows`, 'orphan_ids', t.`orphan_ids`)
  FROM (
  SELECT 'play.game_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.game_id) AS orphan_ids
    FROM `play` f LEFT JOIN `game` g ON g.game_id = f.game_id
   WHERE f.game_id IS NOT NULL AND g.game_id IS NULL
  UNION ALL
  SELECT 'player_week_stat.game_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.game_id) AS orphan_ids
    FROM `player_week_stat` f LEFT JOIN `game` g ON g.game_id = f.game_id
   WHERE f.game_id IS NOT NULL AND g.game_id IS NULL
  UNION ALL
  SELECT 'team_week_stat.game_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.game_id) AS orphan_ids
    FROM `team_week_stat` f LEFT JOIN `game` g ON g.game_id = f.game_id
   WHERE f.game_id IS NOT NULL AND g.game_id IS NULL
  UNION ALL
  SELECT 'snap_count.game_id' AS reference_column, COUNT(*) AS orphan_rows,
         COUNT(DISTINCT f.game_id) AS orphan_ids
    FROM `snap_count` f LEFT JOIN `game` g ON g.game_id = f.game_id
   WHERE f.game_id IS NOT NULL AND g.game_id IS NULL
  ) AS t
 ORDER BY orphan_rows DESC, reference_column;

-- 13: Index inventory (P5)
INSERT INTO diag_result (result_no, detail)
SELECT 13, JSON_OBJECT('table_name', t.`table_name`, 'index_name', t.`index_name`, 'non_unique', t.`non_unique`, 'indexed_columns', t.`indexed_columns`)
  FROM (
  SELECT TABLE_NAME AS table_name, INDEX_NAME AS index_name, NON_UNIQUE AS non_unique,
         GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ', ') AS indexed_columns
    FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME IN ('player','game','roster','injury_report','snap_count',
                        'depth_chart','play','player_week_stat','team_week_stat')
   GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
  ) AS t
 ORDER BY table_name, index_name;

-- 14: P2 guard: descriptor columns on player_week_stat, roster, injury_report, depth_chart, game (33 columns)
INSERT INTO diag_result (result_no, detail)
SELECT 14, JSON_OBJECT('fact_column', t.`fact_column`, 'player_column', t.`player_column`, 'players_with_value', t.`players_with_value`, 'no_player_row', t.`no_player_row`, 'value_only_on_fact', t.`value_only_on_fact`, 'conflicting_players', t.`conflicting_players`, 'rows_without_id', t.`rows_without_id`)
  FROM (
  SELECT 'player_week_stat.player_display_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`player_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`display_name` IS NOT NULL AND x.`player_display_name` <> p.`display_name` THEN x.`player_id` END) AS conflicting_players,
         SUM(x.`player_id` IS NULL) AS rows_without_id
    FROM `player_week_stat` x LEFT JOIN `player` p ON p.gsis_id = x.`player_id`
   WHERE x.`player_display_name` IS NOT NULL
  UNION ALL
  SELECT 'player_week_stat.player_name' AS fact_column, 'player.short_name' AS player_column,
         COUNT(DISTINCT x.`player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`short_name` IS NULL THEN x.`player_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`short_name` IS NOT NULL AND x.`player_name` <> p.`short_name` THEN x.`player_id` END) AS conflicting_players,
         SUM(x.`player_id` IS NULL) AS rows_without_id
    FROM `player_week_stat` x LEFT JOIN `player` p ON p.gsis_id = x.`player_id`
   WHERE x.`player_name` IS NOT NULL
  UNION ALL
  SELECT 'player_week_stat.headshot_url' AS fact_column, 'player.headshot' AS player_column,
         COUNT(DISTINCT x.`player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`headshot` IS NULL THEN x.`player_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`headshot` IS NOT NULL AND x.`headshot_url` <> p.`headshot` THEN x.`player_id` END) AS conflicting_players,
         SUM(x.`player_id` IS NULL) AS rows_without_id
    FROM `player_week_stat` x LEFT JOIN `player` p ON p.gsis_id = x.`player_id`
   WHERE x.`headshot_url` IS NOT NULL
  UNION ALL
  SELECT 'roster.full_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`display_name` IS NOT NULL AND x.`full_name` <> p.`display_name` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`full_name` IS NOT NULL
  UNION ALL
  SELECT 'roster.first_name' AS fact_column, 'player.first_name' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`first_name` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`first_name` IS NOT NULL AND x.`first_name` <> p.`first_name` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`first_name` IS NOT NULL
  UNION ALL
  SELECT 'roster.last_name' AS fact_column, 'player.last_name' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`last_name` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`last_name` IS NOT NULL AND x.`last_name` <> p.`last_name` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`last_name` IS NOT NULL
  UNION ALL
  SELECT 'roster.birth_date' AS fact_column, 'player.birth_date' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`birth_date` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`birth_date` IS NOT NULL AND x.`birth_date` <> p.`birth_date` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`birth_date` IS NOT NULL
  UNION ALL
  SELECT 'roster.college' AS fact_column, 'player.college_name' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`college_name` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`college_name` IS NOT NULL AND x.`college` <> p.`college_name` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`college` IS NOT NULL
  UNION ALL
  SELECT 'roster.football_name' AS fact_column, 'player.football_name' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`football_name` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`football_name` IS NOT NULL AND x.`football_name` <> p.`football_name` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`football_name` IS NOT NULL
  UNION ALL
  SELECT 'roster.headshot_url' AS fact_column, 'player.headshot' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`headshot` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`headshot` IS NOT NULL AND x.`headshot_url` <> p.`headshot` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`headshot_url` IS NOT NULL
  UNION ALL
  SELECT 'roster.espn_id' AS fact_column, 'player.espn_id' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`espn_id` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`espn_id` IS NOT NULL AND x.`espn_id` <> p.`espn_id` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`espn_id` IS NOT NULL
  UNION ALL
  SELECT 'roster.pff_id' AS fact_column, 'player.pff_id' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`pff_id` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`pff_id` IS NOT NULL AND x.`pff_id` <> p.`pff_id` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`pff_id` IS NOT NULL
  UNION ALL
  SELECT 'roster.pfr_id' AS fact_column, 'player.pfr_id' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`pfr_id` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`pfr_id` IS NOT NULL AND x.`pfr_id` <> p.`pfr_id` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`pfr_id` IS NOT NULL
  UNION ALL
  SELECT 'roster.esb_id' AS fact_column, 'player.esb_id' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`esb_id` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`esb_id` IS NOT NULL AND x.`esb_id` <> p.`esb_id` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`esb_id` IS NOT NULL
  UNION ALL
  SELECT 'roster.smart_id' AS fact_column, 'player.smart_id' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`smart_id` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`smart_id` IS NOT NULL AND x.`smart_id` <> p.`smart_id` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`smart_id` IS NOT NULL
  UNION ALL
  SELECT 'roster.rookie_year' AS fact_column, 'player.rookie_season' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`rookie_season` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`rookie_season` IS NOT NULL AND x.`rookie_year` <> p.`rookie_season` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`rookie_year` IS NOT NULL
  UNION ALL
  SELECT 'roster.draft_number' AS fact_column, 'player.draft_pick' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`draft_pick` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`draft_pick` IS NOT NULL AND x.`draft_number` <> p.`draft_pick` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`draft_number` IS NOT NULL
  UNION ALL
  SELECT 'roster.height' AS fact_column, 'player.height' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`height` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`height` IS NOT NULL AND x.`height` <> p.`height` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`height` IS NOT NULL
  UNION ALL
  SELECT 'roster.weight' AS fact_column, 'player.weight' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`weight` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`weight` IS NOT NULL AND x.`weight` <> p.`weight` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`weight` IS NOT NULL
  UNION ALL
  SELECT 'roster.sportradar_id' AS fact_column, '(none on player)' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value, NULL AS no_player_row,
         COUNT(DISTINCT x.`gsis_id`) AS value_only_on_fact, NULL AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x WHERE x.`sportradar_id` IS NOT NULL
  UNION ALL
  SELECT 'roster.yahoo_id' AS fact_column, '(none on player)' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value, NULL AS no_player_row,
         COUNT(DISTINCT x.`gsis_id`) AS value_only_on_fact, NULL AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x WHERE x.`yahoo_id` IS NOT NULL
  UNION ALL
  SELECT 'roster.rotowire_id' AS fact_column, '(none on player)' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value, NULL AS no_player_row,
         COUNT(DISTINCT x.`gsis_id`) AS value_only_on_fact, NULL AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x WHERE x.`rotowire_id` IS NOT NULL
  UNION ALL
  SELECT 'roster.fantasy_data_id' AS fact_column, '(none on player)' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value, NULL AS no_player_row,
         COUNT(DISTINCT x.`gsis_id`) AS value_only_on_fact, NULL AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x WHERE x.`fantasy_data_id` IS NOT NULL
  UNION ALL
  SELECT 'roster.sleeper_id' AS fact_column, '(none on player)' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value, NULL AS no_player_row,
         COUNT(DISTINCT x.`gsis_id`) AS value_only_on_fact, NULL AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x WHERE x.`sleeper_id` IS NOT NULL
  UNION ALL
  SELECT 'roster.gsis_it_id' AS fact_column, '(none on player)' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value, NULL AS no_player_row,
         COUNT(DISTINCT x.`gsis_id`) AS value_only_on_fact, NULL AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x WHERE x.`gsis_it_id` IS NOT NULL
  UNION ALL
  SELECT 'roster.entry_year' AS fact_column, '(none on player)' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value, NULL AS no_player_row,
         COUNT(DISTINCT x.`gsis_id`) AS value_only_on_fact, NULL AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x WHERE x.`entry_year` IS NOT NULL
  UNION ALL
  SELECT 'roster.draft_club' AS fact_column, '(none on player)' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value, NULL AS no_player_row,
         COUNT(DISTINCT x.`gsis_id`) AS value_only_on_fact, NULL AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `roster` x WHERE x.`draft_club` IS NOT NULL
  UNION ALL
  SELECT 'injury_report.full_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`display_name` IS NOT NULL AND x.`full_name` <> p.`display_name` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `injury_report` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`full_name` IS NOT NULL
  UNION ALL
  SELECT 'injury_report.first_name' AS fact_column, 'player.first_name' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`first_name` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`first_name` IS NOT NULL AND x.`first_name` <> p.`first_name` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `injury_report` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`first_name` IS NOT NULL
  UNION ALL
  SELECT 'injury_report.last_name' AS fact_column, 'player.last_name' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`last_name` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`last_name` IS NOT NULL AND x.`last_name` <> p.`last_name` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `injury_report` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`last_name` IS NOT NULL
  UNION ALL
  SELECT 'depth_chart.player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`gsis_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`gsis_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`gsis_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`gsis_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`display_name` IS NOT NULL AND x.`player_name` <> p.`display_name` THEN x.`gsis_id` END) AS conflicting_players,
         SUM(x.`gsis_id` IS NULL) AS rows_without_id
    FROM `depth_chart` x LEFT JOIN `player` p ON p.gsis_id = x.`gsis_id`
   WHERE x.`player_name` IS NOT NULL
  UNION ALL
  SELECT 'game.home_qb_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`home_qb_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`home_qb_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`home_qb_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`home_qb_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`display_name` IS NOT NULL AND x.`home_qb_name` <> p.`display_name` THEN x.`home_qb_id` END) AS conflicting_players,
         SUM(x.`home_qb_id` IS NULL) AS rows_without_id
    FROM `game` x LEFT JOIN `player` p ON p.gsis_id = x.`home_qb_id`
   WHERE x.`home_qb_name` IS NOT NULL
  UNION ALL
  SELECT 'game.away_qb_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`away_qb_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`away_qb_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`away_qb_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`away_qb_id` END) AS value_only_on_fact,
         COUNT(DISTINCT CASE WHEN p.`display_name` IS NOT NULL AND x.`away_qb_name` <> p.`display_name` THEN x.`away_qb_id` END) AS conflicting_players,
         SUM(x.`away_qb_id` IS NULL) AS rows_without_id
    FROM `game` x LEFT JOIN `player` p ON p.gsis_id = x.`away_qb_id`
   WHERE x.`away_qb_name` IS NOT NULL
  ) AS t
 ORDER BY fact_column;

-- 15: P2 guard: play player-name columns (48 columns; slowest)
INSERT INTO diag_result (result_no, detail)
SELECT 15, JSON_OBJECT('fact_column', t.`fact_column`, 'player_column', t.`player_column`, 'players_with_value', t.`players_with_value`, 'no_player_row', t.`no_player_row`, 'value_only_on_fact', t.`value_only_on_fact`, 'conflicting_players', t.`conflicting_players`, 'rows_without_id', t.`rows_without_id`)
  FROM (
  SELECT 'play.td_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`td_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`td_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`td_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`td_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`td_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`td_player_id`
   WHERE x.`td_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.passer_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`passer_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`passer_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`passer_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`passer_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`passer_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`passer_player_id`
   WHERE x.`passer_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.receiver_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`receiver_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`receiver_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`receiver_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`receiver_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`receiver_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`receiver_player_id`
   WHERE x.`receiver_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.rusher_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`rusher_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`rusher_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`rusher_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`rusher_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`rusher_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`rusher_player_id`
   WHERE x.`rusher_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.lateral_receiver_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`lateral_receiver_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`lateral_receiver_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`lateral_receiver_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`lateral_receiver_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`lateral_receiver_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`lateral_receiver_player_id`
   WHERE x.`lateral_receiver_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.lateral_rusher_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`lateral_rusher_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`lateral_rusher_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`lateral_rusher_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`lateral_rusher_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`lateral_rusher_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`lateral_rusher_player_id`
   WHERE x.`lateral_rusher_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.lateral_sack_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`lateral_sack_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`lateral_sack_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`lateral_sack_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`lateral_sack_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`lateral_sack_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`lateral_sack_player_id`
   WHERE x.`lateral_sack_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.interception_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`interception_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`interception_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`interception_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`interception_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`interception_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`interception_player_id`
   WHERE x.`interception_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.lateral_interception_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`lateral_interception_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`lateral_interception_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`lateral_interception_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`lateral_interception_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`lateral_interception_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`lateral_interception_player_id`
   WHERE x.`lateral_interception_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.punt_returner_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`punt_returner_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`punt_returner_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`punt_returner_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`punt_returner_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`punt_returner_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`punt_returner_player_id`
   WHERE x.`punt_returner_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.lateral_punt_returner_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`lateral_punt_returner_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`lateral_punt_returner_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`lateral_punt_returner_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`lateral_punt_returner_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`lateral_punt_returner_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`lateral_punt_returner_player_id`
   WHERE x.`lateral_punt_returner_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.kickoff_returner_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`kickoff_returner_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`kickoff_returner_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`kickoff_returner_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`kickoff_returner_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`kickoff_returner_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`kickoff_returner_player_id`
   WHERE x.`kickoff_returner_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.lateral_kickoff_returner_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`lateral_kickoff_returner_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`lateral_kickoff_returner_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`lateral_kickoff_returner_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`lateral_kickoff_returner_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`lateral_kickoff_returner_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`lateral_kickoff_returner_player_id`
   WHERE x.`lateral_kickoff_returner_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.punter_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`punter_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`punter_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`punter_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`punter_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`punter_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`punter_player_id`
   WHERE x.`punter_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.kicker_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`kicker_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`kicker_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`kicker_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`kicker_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`kicker_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`kicker_player_id`
   WHERE x.`kicker_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.own_kickoff_recovery_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`own_kickoff_recovery_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`own_kickoff_recovery_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`own_kickoff_recovery_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`own_kickoff_recovery_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`own_kickoff_recovery_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`own_kickoff_recovery_player_id`
   WHERE x.`own_kickoff_recovery_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.blocked_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`blocked_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`blocked_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`blocked_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`blocked_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`blocked_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`blocked_player_id`
   WHERE x.`blocked_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.sack_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`sack_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`sack_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`sack_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`sack_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`sack_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`sack_player_id`
   WHERE x.`sack_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.penalty_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`penalty_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`penalty_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`penalty_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`penalty_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`penalty_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`penalty_player_id`
   WHERE x.`penalty_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.safety_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`safety_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`safety_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`safety_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`safety_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`safety_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`safety_player_id`
   WHERE x.`safety_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.fantasy_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`fantasy_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`fantasy_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`fantasy_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`fantasy_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`fantasy_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`fantasy_player_id`
   WHERE x.`fantasy_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.tackle_for_loss_1_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`tackle_for_loss_1_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`tackle_for_loss_1_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`tackle_for_loss_1_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`tackle_for_loss_1_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`tackle_for_loss_1_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`tackle_for_loss_1_player_id`
   WHERE x.`tackle_for_loss_1_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.tackle_for_loss_2_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`tackle_for_loss_2_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`tackle_for_loss_2_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`tackle_for_loss_2_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`tackle_for_loss_2_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`tackle_for_loss_2_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`tackle_for_loss_2_player_id`
   WHERE x.`tackle_for_loss_2_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.qb_hit_1_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`qb_hit_1_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`qb_hit_1_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`qb_hit_1_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`qb_hit_1_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`qb_hit_1_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`qb_hit_1_player_id`
   WHERE x.`qb_hit_1_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.qb_hit_2_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`qb_hit_2_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`qb_hit_2_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`qb_hit_2_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`qb_hit_2_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`qb_hit_2_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`qb_hit_2_player_id`
   WHERE x.`qb_hit_2_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.forced_fumble_player_1_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`forced_fumble_player_1_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`forced_fumble_player_1_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`forced_fumble_player_1_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`forced_fumble_player_1_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`forced_fumble_player_1_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`forced_fumble_player_1_player_id`
   WHERE x.`forced_fumble_player_1_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.forced_fumble_player_2_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`forced_fumble_player_2_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`forced_fumble_player_2_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`forced_fumble_player_2_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`forced_fumble_player_2_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`forced_fumble_player_2_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`forced_fumble_player_2_player_id`
   WHERE x.`forced_fumble_player_2_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.solo_tackle_1_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`solo_tackle_1_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`solo_tackle_1_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`solo_tackle_1_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`solo_tackle_1_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`solo_tackle_1_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`solo_tackle_1_player_id`
   WHERE x.`solo_tackle_1_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.solo_tackle_2_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`solo_tackle_2_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`solo_tackle_2_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`solo_tackle_2_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`solo_tackle_2_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`solo_tackle_2_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`solo_tackle_2_player_id`
   WHERE x.`solo_tackle_2_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.assist_tackle_1_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`assist_tackle_1_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`assist_tackle_1_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`assist_tackle_1_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`assist_tackle_1_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`assist_tackle_1_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`assist_tackle_1_player_id`
   WHERE x.`assist_tackle_1_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.assist_tackle_2_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`assist_tackle_2_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`assist_tackle_2_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`assist_tackle_2_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`assist_tackle_2_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`assist_tackle_2_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`assist_tackle_2_player_id`
   WHERE x.`assist_tackle_2_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.assist_tackle_3_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`assist_tackle_3_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`assist_tackle_3_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`assist_tackle_3_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`assist_tackle_3_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`assist_tackle_3_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`assist_tackle_3_player_id`
   WHERE x.`assist_tackle_3_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.assist_tackle_4_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`assist_tackle_4_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`assist_tackle_4_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`assist_tackle_4_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`assist_tackle_4_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`assist_tackle_4_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`assist_tackle_4_player_id`
   WHERE x.`assist_tackle_4_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.tackle_with_assist_1_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`tackle_with_assist_1_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`tackle_with_assist_1_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`tackle_with_assist_1_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`tackle_with_assist_1_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`tackle_with_assist_1_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`tackle_with_assist_1_player_id`
   WHERE x.`tackle_with_assist_1_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.tackle_with_assist_2_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`tackle_with_assist_2_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`tackle_with_assist_2_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`tackle_with_assist_2_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`tackle_with_assist_2_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`tackle_with_assist_2_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`tackle_with_assist_2_player_id`
   WHERE x.`tackle_with_assist_2_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.pass_defense_1_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`pass_defense_1_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`pass_defense_1_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`pass_defense_1_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`pass_defense_1_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`pass_defense_1_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`pass_defense_1_player_id`
   WHERE x.`pass_defense_1_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.pass_defense_2_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`pass_defense_2_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`pass_defense_2_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`pass_defense_2_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`pass_defense_2_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`pass_defense_2_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`pass_defense_2_player_id`
   WHERE x.`pass_defense_2_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.fumbled_1_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`fumbled_1_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`fumbled_1_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`fumbled_1_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`fumbled_1_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`fumbled_1_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`fumbled_1_player_id`
   WHERE x.`fumbled_1_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.fumbled_2_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`fumbled_2_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`fumbled_2_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`fumbled_2_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`fumbled_2_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`fumbled_2_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`fumbled_2_player_id`
   WHERE x.`fumbled_2_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.fumble_recovery_1_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`fumble_recovery_1_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`fumble_recovery_1_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`fumble_recovery_1_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`fumble_recovery_1_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`fumble_recovery_1_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`fumble_recovery_1_player_id`
   WHERE x.`fumble_recovery_1_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.fumble_recovery_2_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`fumble_recovery_2_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`fumble_recovery_2_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`fumble_recovery_2_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`fumble_recovery_2_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`fumble_recovery_2_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`fumble_recovery_2_player_id`
   WHERE x.`fumble_recovery_2_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.half_sack_1_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`half_sack_1_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`half_sack_1_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`half_sack_1_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`half_sack_1_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`half_sack_1_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`half_sack_1_player_id`
   WHERE x.`half_sack_1_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.half_sack_2_player_name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`half_sack_2_player_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`half_sack_2_player_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`half_sack_2_player_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`half_sack_2_player_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`half_sack_2_player_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`half_sack_2_player_id`
   WHERE x.`half_sack_2_player_name` IS NOT NULL
  UNION ALL
  SELECT 'play.passer' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`passer_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`passer_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`passer_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`passer_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`passer_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`passer_id`
   WHERE x.`passer` IS NOT NULL
  UNION ALL
  SELECT 'play.rusher' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`rusher_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`rusher_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`rusher_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`rusher_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`rusher_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`rusher_id`
   WHERE x.`rusher` IS NOT NULL
  UNION ALL
  SELECT 'play.receiver' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`receiver_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`receiver_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`receiver_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`receiver_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`receiver_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`receiver_id`
   WHERE x.`receiver` IS NOT NULL
  UNION ALL
  SELECT 'play.fantasy' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`fantasy_id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`fantasy_id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`fantasy_id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`fantasy_id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`fantasy_id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`fantasy_id`
   WHERE x.`fantasy` IS NOT NULL
  UNION ALL
  SELECT 'play.name' AS fact_column, 'player.display_name' AS player_column,
         COUNT(DISTINCT x.`id`) AS players_with_value,
         COUNT(DISTINCT CASE WHEN x.`id` IS NOT NULL AND p.gsis_id IS NULL THEN x.`id` END) AS no_player_row,
         COUNT(DISTINCT CASE WHEN p.gsis_id IS NOT NULL AND p.`display_name` IS NULL THEN x.`id` END) AS value_only_on_fact,
         NULL AS conflicting_players,
         SUM(x.`id` IS NULL) AS rows_without_id
    FROM `play` x LEFT JOIN `player` p ON p.gsis_id = x.`id`
   WHERE x.`name` IS NOT NULL
  ) AS t
 ORDER BY fact_column;

-- The one result grid: export this.
SELECT c.result_no, c.check_name, r.detail
  FROM diag_check c
  LEFT JOIN diag_result r ON r.result_no = c.result_no
 ORDER BY c.result_no, r.id
 LIMIT 100000;
