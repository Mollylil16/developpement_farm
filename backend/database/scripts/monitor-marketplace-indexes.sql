-- ========================================
-- Script de Monitoring - Index Marketplace
-- ========================================
-- Date : 2025-01-XX
-- Description : Monitorer l'utilisation des index sur marketplace_listings
-- Usage : Exécuter régulièrement pour surveiller les performances
-- ========================================

-- ========================================
-- 1. UTILISATION DES INDEX (pg_stat_user_indexes)
-- ========================================
\echo '========================================'
\echo '1. UTILISATION DES INDEX'
\echo '========================================'
\echo 'Affiche le nombre de scans par index depuis le dernier reset des statistiques'
\echo ''

SELECT 
    indexname AS "Nom de l'index",
    idx_scan AS "Nombre de scans",
    idx_tup_read AS "Tuples lus",
    idx_tup_fetch AS "Tuples récupérés",
    CASE 
        WHEN idx_scan = 0 THEN '❌ JAMAIS UTILISÉ'
        WHEN idx_scan < 10 THEN '⚠️  PEU UTILISÉ'
        WHEN idx_scan < 100 THEN '⚠️  MODÉRÉMENT UTILISÉ'
        ELSE '✅ BIEN UTILISÉ'
    END AS "Statut"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'marketplace_listings'
  AND indexname LIKE 'idx_marketplace_listings%'
ORDER BY idx_scan DESC;

\echo ''
\echo 'Recommandation : Si un index n\'est jamais utilisé (idx_scan = 0),'
\echo '  considérer le supprimer pour économiser de l\'espace disque.'
\echo ''

-- ========================================
-- 2. TAILLE DES INDEX
-- ========================================
\echo '========================================'
\echo '2. TAILLE DES INDEX'
\echo '========================================'
\echo 'Affiche la taille de chaque index en Mo'
\echo ''

SELECT
    indexname AS "Nom de l'index",
    pg_size_pretty(pg_relation_size(indexrelid)) AS "Taille",
    pg_size_pretty(pg_total_relation_size(indexrelid)) AS "Taille totale",
    pg_relation_size(indexrelid) / 1024.0 / 1024.0 AS "Taille (Mo)",
    idx_scan AS "Scans"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'marketplace_listings'
  AND indexname LIKE 'idx_marketplace_listings%'
ORDER BY pg_relation_size(indexrelid) DESC;

\echo ''
\echo 'Recommandation : Surveiller la taille des index pour détecter'
\echo '  une croissance anormale (signe de fragmentation ou de données obsolètes).'
\echo ''

-- ========================================
-- 3. INDEX NON UTILISÉS
-- ========================================
\echo '========================================'
\echo '3. INDEX NON UTILISÉS (À CONSIDÉRER POUR SUPPRESSION)'
\echo '========================================'
\echo 'Index qui n\'ont jamais été utilisés depuis le dernier reset'
\echo ''

SELECT
    indexname AS "Nom de l'index",
    pg_size_pretty(pg_relation_size(indexrelid)) AS "Taille",
    idx_scan AS "Scans",
    'DROP INDEX IF EXISTS ' || indexname || ';' AS "Commande de suppression"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'marketplace_listings'
  AND indexname LIKE 'idx_marketplace_listings%'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

\echo ''
\echo '⚠️  ATTENTION : Avant de supprimer un index, vérifier qu\'il ne sera'
\echo '  pas utilisé dans le futur (analyse des requêtes avec EXPLAIN).'
\echo ''

-- ========================================
-- 4. STATISTIQUES DE LA TABLE
-- ========================================
\echo '========================================'
\echo '4. STATISTIQUES DE LA TABLE'
\echo '========================================'
\echo 'Nombre de lignes, taille, dernières analyses'
\echo ''

SELECT
    schemaname AS "Schéma",
    tablename AS "Table",
    n_live_tup AS "Lignes vivantes",
    n_dead_tup AS "Lignes mortes",
    last_vacuum AS "Dernier VACUUM",
    last_autovacuum AS "Dernier AUTO VACUUM",
    last_analyze AS "Dernière ANALYZE",
    last_autoanalyze AS "Dernière AUTO ANALYZE",
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS "Taille totale"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename = 'marketplace_listings';

\echo ''
\echo 'Recommandation : Si last_analyze est ancien (> 1 semaine),'
\echo '  exécuter : ANALYZE marketplace_listings;'
\echo '  Si n_dead_tup est élevé (> 10% de n_live_tup),'
\echo '  exécuter : VACUUM ANALYZE marketplace_listings;'
\echo ''

-- ========================================
-- 5. EFFICACITÉ DES INDEX (RATIO SCAN/READ)
-- ========================================
\echo '========================================'
\echo '5. EFFICACITÉ DES INDEX'
\echo '========================================'
\echo 'Ratio entre les tuples lus et récupérés (indicateur d\'efficacité)'
\echo ''

SELECT
    indexname AS "Nom de l'index",
    idx_scan AS "Scans",
    idx_tup_read AS "Tuples lus",
    idx_tup_fetch AS "Tuples récupérés",
    CASE 
        WHEN idx_scan = 0 THEN 0
        ELSE ROUND((idx_tup_read::numeric / NULLIF(idx_scan, 0)), 2)
    END AS "Ratio lect/scans",
    CASE 
        WHEN idx_tup_read = 0 THEN 0
        ELSE ROUND((idx_tup_fetch::numeric / NULLIF(idx_tup_read, 0)) * 100, 2)
    END AS "% tuples récupérés",
    CASE 
        WHEN idx_scan = 0 THEN '❌ NON UTILISÉ'
        WHEN idx_tup_read / NULLIF(idx_scan, 0) < 10 THEN '✅ TRÈS EFFICACE'
        WHEN idx_tup_read / NULLIF(idx_scan, 0) < 100 THEN '✅ EFFICACE'
        WHEN idx_tup_read / NULLIF(idx_scan, 1) < 1000 THEN '⚠️  MODÉRÉ'
        ELSE '❌ PEU EFFICACE'
    END AS "Efficacité"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'marketplace_listings'
  AND indexname LIKE 'idx_marketplace_listings%'
  AND idx_scan > 0
ORDER BY idx_scan DESC;

\echo ''
\echo 'Interprétation :'
\echo '  - Ratio lect/scans : Nombre moyen de tuples lus par scan'
\echo '  - % tuples récupérés : Pourcentage de tuples lus qui sont réellement utilisés'
\echo '  - Plus le ratio est bas, plus l\'index est efficace'
\echo ''

-- ========================================
-- 6. RECOMMANDATIONS
-- ========================================
\echo '========================================'
\echo '6. RECOMMANDATIONS AUTOMATIQUES'
\echo '========================================'
\echo ''

-- Vérifier si des analyses sont nécessaires
DO $$
DECLARE
    last_analyze_date TIMESTAMP;
    days_since_analyze INTEGER;
BEGIN
    SELECT last_analyze INTO last_analyze_date
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' AND tablename = 'marketplace_listings';
    
    IF last_analyze_date IS NULL THEN
        RAISE NOTICE '⚠️  ANALYZE jamais exécuté. Exécuter : ANALYZE marketplace_listings;';
    ELSE
        days_since_analyze := EXTRACT(EPOCH FROM (NOW() - last_analyze_date)) / 86400;
        IF days_since_analyze > 7 THEN
            RAISE NOTICE '⚠️  Dernière ANALYZE il y a % jours. Exécuter : ANALYZE marketplace_listings;', days_since_analyze;
        ELSE
            RAISE NOTICE '✅ Dernière ANALYZE il y a % jours (OK)', days_since_analyze;
        END IF;
    END IF;
END $$;

-- Vérifier si un VACUUM est nécessaire
DO $$
DECLARE
    live_tup BIGINT;
    dead_tup BIGINT;
    dead_ratio NUMERIC;
BEGIN
    SELECT n_live_tup, n_dead_tup INTO live_tup, dead_tup
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' AND tablename = 'marketplace_listings';
    
    IF live_tup > 0 THEN
        dead_ratio := (dead_tup::numeric / live_tup) * 100;
        IF dead_ratio > 10 THEN
            RAISE NOTICE '⚠️  %%% de lignes mortes (%). Exécuter : VACUUM ANALYZE marketplace_listings;', 
                ROUND(dead_ratio, 2), dead_tup;
        ELSE
            RAISE NOTICE '✅ Ratio de lignes mortes : %% (OK)', ROUND(dead_ratio, 2);
        END IF;
    END IF;
END $$;

\echo ''
\echo '========================================'
\echo 'FIN DU RAPPORT DE MONITORING'
\echo '========================================'
