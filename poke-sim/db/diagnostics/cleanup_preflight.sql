-- Read-only inventory, not a migration or an automatic cleanup recommendation.
-- Run in an authorized SQL session and retain the timestamped results privately.
-- Estimates and low scan counts are not evidence that a table/index is disposable.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';

SELECT current_database() AS database_name,
       current_timestamp AS captured_at,
       current_setting('server_version') AS server_version,
       pg_postmaster_start_time() AS server_started_at;

-- Database reset time is context, not proof that each per-object counter shares it.
SELECT stats_reset, numbackends, deadlocks, temp_files, temp_bytes
FROM pg_stat_database
WHERE datname = current_database();

-- Estimated row/dead-tuple counts, relation sizes and maintenance timestamps.
-- A dead-tuple estimate is not a measured bloat percentage.
SELECT schemaname, relname,
       n_live_tup AS estimated_live_rows, n_dead_tup AS estimated_dead_rows,
       pg_table_size(relid) AS table_bytes,
       pg_indexes_size(relid) AS index_bytes,
       pg_total_relation_size(relid) AS total_bytes,
       seq_scan, idx_scan, last_autovacuum, last_autoanalyze,
       count(*) OVER () AS total_matching_tables
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC, relname
LIMIT 200;

-- Constraint-backed/unique indexes must not be treated as unused clutter.
SELECT s.schemaname, s.relname, s.indexrelname,
       pg_relation_size(s.indexrelid) AS index_bytes,
       s.idx_scan, s.idx_tup_read, s.idx_tup_fetch,
       i.indisprimary, i.indisunique, i.indisvalid,
       count(*) OVER () AS total_matching_indexes,
       EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = s.indexrelid) AS backs_constraint
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.schemaname = 'public'
ORDER BY pg_relation_size(s.indexrelid) DESC, s.indexrelname
LIMIT 200;

-- Visibility of these flags is not proof that authorization policies are correct.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced,
       count(*) OVER () AS total_matching_tables,
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY c.relname
LIMIT 200;

-- No SQL text, connection addresses, credentials or row payloads are exported.
SELECT state, wait_event_type, count(*) AS connection_count
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state, wait_event_type
ORDER BY state, wait_event_type;

COMMIT;
