-- ========================================
-- Script de Test EXPLAIN ANALYZE - Index Marketplace
-- ========================================
-- Date : 2025-01-XX
-- Description : Valide que les index sont bien utilisés dans les requêtes critiques
-- Usage : Exécuter avec psql ou un client PostgreSQL
-- ========================================

-- ========================================
-- CONFIGURATION
-- ========================================
-- Remplacer ces valeurs par des IDs réels pour des tests plus précis
\set TEST_PROJET_ID 'test-projet-123'
\set TEST_PRODUCER_ID 'test-producer-456'
\set TEST_SUBJECT_ID 'test-subject-789'
\set TEST_BATCH_ID 'test-batch-101'

-- ========================================
-- TEST 1 : Tri par date (PRIORITÉ HAUTE)
-- ========================================
-- Index attendu : idx_marketplace_listings_listed_at
-- Vérifier : Index Scan ou Bitmap Index Scan sur idx_marketplace_listings_listed_at
\echo '========================================'
\echo 'TEST 1 : Tri par date (listed_at DESC)'
\echo '========================================'
\echo 'Index attendu : idx_marketplace_listings_listed_at'
\echo ''

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS, FORMAT JSON)
SELECT 
    id, subject_id, producer_id, farm_id, price_per_kg, 
    calculated_price, status, listed_at
FROM marketplace_listings
WHERE status != 'removed'
ORDER BY listed_at DESC
LIMIT 100;

\echo ''
\echo 'Vérification : Rechercher "idx_marketplace_listings_listed_at" dans le plan'
\echo ''

-- ========================================
-- TEST 2 : Filtre par farm_id + status (PRIORITÉ HAUTE)
-- ========================================
-- Index attendu : idx_marketplace_listings_status_farm_producer
-- Vérifier : Index Scan sur idx_marketplace_listings_status_farm_producer
\echo '========================================'
\echo 'TEST 2 : Filtre par farm_id et status'
\echo '========================================'
\echo 'Index attendu : idx_marketplace_listings_status_farm_producer'
\echo ''

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS, FORMAT JSON)
SELECT 
    id, subject_id, producer_id, price_per_kg, listed_at
FROM marketplace_listings
WHERE farm_id = :'TEST_PROJET_ID'
  AND status != 'removed'
ORDER BY listed_at DESC
LIMIT 50;

\echo ''
\echo 'Vérification : Rechercher "idx_marketplace_listings_status_farm_producer" dans le plan'
\echo ''

-- ========================================
-- TEST 3 : Filtre par producer_id (PRIORITÉ MOYENNE)
-- ========================================
-- Index attendu : idx_marketplace_listings_producer_status
-- Vérifier : Index Scan sur idx_marketplace_listings_producer_status
\echo '========================================'
\echo 'TEST 3 : Filtre par producer_id (Mes annonces)'
\echo '========================================'
\echo 'Index attendu : idx_marketplace_listings_producer_status'
\echo ''

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS, FORMAT JSON)
SELECT 
    id, subject_id, farm_id, price_per_kg, status, listed_at
FROM marketplace_listings
WHERE producer_id = :'TEST_PRODUCER_ID'
  AND status IN ('available', 'reserved')
ORDER BY listed_at DESC
LIMIT 50;

\echo ''
\echo 'Vérification : Rechercher "idx_marketplace_listings_producer_status" dans le plan'
\echo ''

-- ========================================
-- TEST 4 : Filtre par subject_id (PRIORITÉ MOYENNE)
-- ========================================
-- Index attendu : idx_marketplace_listings_subject_status
-- Vérifier : Index Scan sur idx_marketplace_listings_subject_status
\echo '========================================'
\echo 'TEST 4 : Vérification existence listing par subject_id'
\echo '========================================'
\echo 'Index attendu : idx_marketplace_listings_subject_status'
\echo ''

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS, FORMAT JSON)
SELECT 
    id, status, listed_at
FROM marketplace_listings
WHERE subject_id = :'TEST_SUBJECT_ID'
  AND status != 'removed'
LIMIT 10;

\echo ''
\echo 'Vérification : Rechercher "idx_marketplace_listings_subject_status" dans le plan'
\echo ''

-- ========================================
-- TEST 5 : Filtre par batch_id (PRIORITÉ MOYENNE)
-- ========================================
-- Index attendu : idx_marketplace_listings_batch_status
-- Vérifier : Index Scan sur idx_marketplace_listings_batch_status
\echo '========================================'
\echo 'TEST 5 : Filtre par batch_id'
\echo '========================================'
\echo 'Index attendu : idx_marketplace_listings_batch_status'
\echo ''

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS, FORMAT JSON)
SELECT 
    id, listing_type, batch_id, producer_id, status, listed_at
FROM marketplace_listings
WHERE batch_id = :'TEST_BATCH_ID'
  AND status != 'removed'
LIMIT 10;

\echo ''
\echo 'Vérification : Rechercher "idx_marketplace_listings_batch_status" dans le plan'
\echo ''

-- ========================================
-- TEST 6 : Tri par prix (PRIORITÉ BASSE)
-- ========================================
-- Index attendu : idx_marketplace_listings_price_status
-- Vérifier : Index Scan sur idx_marketplace_listings_price_status
\echo '========================================'
\echo 'TEST 6 : Tri par prix (calculated_price)'
\echo '========================================'
\echo 'Index attendu : idx_marketplace_listings_price_status'
\echo ''

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS, FORMAT JSON)
SELECT 
    id, subject_id, producer_id, calculated_price, listed_at
FROM marketplace_listings
WHERE status != 'removed'
  AND calculated_price IS NOT NULL
ORDER BY calculated_price DESC, listed_at DESC
LIMIT 50;

\echo ''
\echo 'Vérification : Rechercher "idx_marketplace_listings_price_status" dans le plan'
\echo ''

-- ========================================
-- TEST 7 : Requête complexe avec plusieurs filtres
-- ========================================
-- Index attendu : idx_marketplace_listings_status_farm_producer ou idx_marketplace_listings_listed_at
\echo '========================================'
\echo 'TEST 7 : Requête complexe (farm_id + producer_id + status)'
\echo '========================================'
\echo 'Index attendu : idx_marketplace_listings_status_farm_producer'
\echo ''

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS, FORMAT JSON)
SELECT 
    id, subject_id, price_per_kg, calculated_price, status, listed_at
FROM marketplace_listings
WHERE farm_id = :'TEST_PROJET_ID'
  AND producer_id != :'TEST_PRODUCER_ID'
  AND status != 'removed'
ORDER BY listed_at DESC
LIMIT 20 OFFSET 0;

\echo ''
\echo 'Vérification : Vérifier l\'utilisation de l\'index composite'
\echo ''

-- ========================================
-- RÉSUMÉ DES RÉSULTATS ATTENDUS
-- ========================================
\echo '========================================'
\echo 'RÉSUMÉ DES RÉSULTATS ATTENDUS'
\echo '========================================'
\echo ''
\echo 'Pour chaque test, vérifier :'
\echo '  1. Le type de scan : "Index Scan" ou "Bitmap Index Scan" (✅ BON)'
\echo '     vs "Seq Scan" (❌ MAUVAIS - l\'index n\'est pas utilisé)'
\echo '  2. Le nom de l\'index utilisé correspond à l\'index attendu'
\echo '  3. Le temps d\'exécution est acceptable (< 100ms pour LIMIT 50-100)'
\echo '  4. Le nombre de lignes parcourues (rows) est minimal'
\echo '  5. Les buffers lus (shared hit/blocks) sont faibles'
\echo ''
\echo 'Si un "Seq Scan" apparaît, cela signifie que :'
\echo '  - L\'index n\'est pas utilisé (vérifier les conditions WHERE)'
\echo '  - Les statistiques sont obsolètes (exécuter ANALYZE marketplace_listings)'
\echo '  - La table est trop petite (PostgreSQL préfère un scan séquentiel)'
\echo ''
