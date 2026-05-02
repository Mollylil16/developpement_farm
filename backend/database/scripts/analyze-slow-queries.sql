-- Script d'analyse des requêtes lentes (Phase 3)
-- À exécuter après avoir collecté des logs de requêtes lentes
-- 
-- Usage:
-- 1. Activer pg_stat_statements dans postgresql.conf:
--    shared_preload_libraries = 'pg_stat_statements'
--    pg_stat_statements.track = all
--
-- 2. Exécuter ce script pour identifier les requêtes les plus lentes

-- Vérifier si pg_stat_statements est activé
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') 
    THEN '✅ pg_stat_statements est activé'
    ELSE '❌ pg_stat_statements n''est pas activé. Activez-le dans postgresql.conf'
  END as status;

-- Top 10 des requêtes les plus lentes (par temps total)
SELECT 
  LEFT(query, 100) as query_preview,
  calls as total_calls,
  ROUND(total_exec_time::numeric, 2) as total_time_ms,
  ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
  ROUND(max_exec_time::numeric, 2) as max_time_ms,
  ROUND((100 * total_exec_time / SUM(total_exec_time) OVER ())::numeric, 2) as percentage
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND query NOT LIKE '%pg_catalog%'
ORDER BY total_exec_time DESC
LIMIT 10;

-- Requêtes avec temps moyen > 1000ms
SELECT 
  LEFT(query, 100) as query_preview,
  calls as total_calls,
  ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
  ROUND(max_exec_time::numeric, 2) as max_time_ms
FROM pg_stat_statements
WHERE mean_exec_time > 1000
  AND query NOT LIKE '%pg_stat_statements%'
  AND query NOT LIKE '%pg_catalog%'
ORDER BY mean_exec_time DESC;

-- Requêtes les plus fréquentes (> 1000 appels)
SELECT 
  LEFT(query, 100) as query_preview,
  calls as total_calls,
  ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
  ROUND((total_exec_time / calls)::numeric, 2) as total_time_per_call_ms
FROM pg_stat_statements
WHERE calls > 1000
  AND query NOT LIKE '%pg_stat_statements%'
  AND query NOT LIKE '%pg_catalog%'
ORDER BY calls DESC
LIMIT 20;

-- Analyser une requête spécifique avec EXPLAIN ANALYZE
-- Remplacez 'VOTRE_REQUETE' par la requête à analyser
-- Exemple:
-- EXPLAIN (ANALYZE, BUFFERS, VERBOSE) 
-- SELECT * FROM production_animaux WHERE projet_id = 'xxx' ORDER BY date_creation DESC LIMIT 100;

