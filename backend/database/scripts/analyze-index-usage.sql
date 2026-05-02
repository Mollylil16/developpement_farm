-- ============================================================================
-- Script d'Analyse des Performances des Index avec EXPLAIN ANALYZE
-- Date: 2025-01-XX
-- Objectif: Vérifier l'utilisation des index sur des requêtes réelles
-- ============================================================================
--
-- USAGE:
-- 1. Se connecter à la base de données de production/staging
-- 2. Remplacer les valeurs 'TEST_*' par des IDs réels
-- 3. Exécuter les requêtes EXPLAIN ANALYZE une par une
-- 4. Analyser les résultats pour identifier:
--    - Les "Seq Scan" (scans séquentiels) qui indiquent des index manquants
--    - Les "Index Scan" qui confirment l'utilisation des index
--    - Le "Planning Time" et "Execution Time"
--    - Les "Buffers" pour voir l'utilisation du cache
--
-- ============================================================================

-- ==================== CONFIGURATION ====================
-- Définir les IDs de test (à remplacer par des IDs réels)
-- \set test_projet_id 'your_project_id_here'
-- \set test_animal_id 'your_animal_id_here'
-- \set test_user_id 'your_user_id_here'
-- \set test_batch_id 'your_batch_id_here'

-- ============================================================================
-- 1. VÉRIFICATION DES INDEX EXISTANTS
-- ============================================================================

-- Lister tous les index sur les tables principales
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef,
  CASE 
    WHEN indexdef LIKE '%WHERE%' THEN 'PARTIAL'
    WHEN indexdef LIKE '%DESC%' OR indexdef LIKE '%ASC%' THEN 'SORTED'
    ELSE 'STANDARD'
  END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'production_animaux',
    'production_pesees',
    'mortalites',
    'marketplace_listings',
    'revenus',
    'depenses_ponctuelles',
    'charges_fixes',
    'vaccinations',
    'maladies',
    'traitements',
    'visites_veterinaires',
    'gestations',
    'sevrages',
    'rapports_croissance',
    'planifications',
    'collaborations',
    'batches',
    'batch_pigs',
    'batch_pig_movements',
    'projets'
  )
ORDER BY tablename, indexname;

-- Statistiques sur l'utilisation des index
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 10 THEN 'LOW_USAGE'
    WHEN idx_scan < 100 THEN 'MEDIUM_USAGE'
    ELSE 'HIGH_USAGE'
  END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'production_animaux',
    'production_pesees',
    'mortalites',
    'marketplace_listings',
    'revenus',
    'depenses_ponctuelles',
    'charges_fixes',
    'vaccinations',
    'maladies',
    'traitements',
    'visites_veterinaires',
    'gestations',
    'sevrages',
    'rapports_croissance',
    'planifications',
    'collaborations',
    'batches',
    'batch_pigs',
    'projets'
  )
ORDER BY idx_scan ASC, tablename, indexname;

-- ============================================================================
-- 2. ANALYSE EXPLAIN ANALYZE - PRODUCTION
-- ============================================================================

-- PRODUCTION_ANIMAUX: WHERE projet_id = X AND statut = Y
-- Index attendu: idx_production_animaux_projet_statut
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, code, nom, sexe, statut, date_naissance
FROM production_animaux
WHERE projet_id = 'TEST_PROJET_ID' 
  AND statut = 'actif'
ORDER BY date_creation DESC
LIMIT 100;

-- PRODUCTION_ANIMAUX: WHERE projet_id = X ORDER BY date_creation DESC
-- Index attendu: idx_production_animaux_projet_created
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, code, nom, statut
FROM production_animaux
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY date_creation DESC
LIMIT 50;

-- PRODUCTION_PESEES: WHERE projet_id = X ORDER BY date DESC
-- Index attendu: idx_production_pesees_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, animal_id, poids_kg, date
FROM production_pesees
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY date DESC
LIMIT 100;

-- PRODUCTION_PESEES: WHERE animal_id = X ORDER BY date DESC
-- Index attendu: idx_production_pesees_animal_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, poids_kg, date
FROM production_pesees
WHERE animal_id = 'TEST_ANIMAL_ID'
ORDER BY date DESC
LIMIT 50;

-- ============================================================================
-- 3. ANALYSE EXPLAIN ANALYZE - MORTALITÉS
-- ============================================================================

-- MORTALITES: WHERE projet_id = X ORDER BY date DESC
-- Index attendu: idx_mortalites_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, nombre_porcs, categorie, date, cause
FROM mortalites
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY date DESC
LIMIT 100;

-- MORTALITES: WHERE projet_id = X AND categorie = Y
-- Index attendu: idx_mortalites_projet_categorie
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, nombre_porcs, date, cause
FROM mortalites
WHERE projet_id = 'TEST_PROJET_ID' 
  AND categorie = 'porcelet'
ORDER BY date DESC;

-- ============================================================================
-- 4. ANALYSE EXPLAIN ANALYZE - FINANCE
-- ============================================================================

-- REVENUS: WHERE projet_id = X ORDER BY date DESC
-- Index attendu: idx_revenus_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, montant, categorie, date, poids_kg
FROM revenus
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY date DESC
LIMIT 100;

-- REVENUS: WHERE projet_id = X AND categorie = Y ORDER BY date DESC
-- Index attendu: idx_revenus_projet_categorie
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, montant, date, poids_kg
FROM revenus
WHERE projet_id = 'TEST_PROJET_ID' 
  AND categorie = 'vente_porc'
ORDER BY date DESC;

-- DÉPENSES PONCTUELLES: WHERE projet_id = X ORDER BY date DESC
-- Index attendu: idx_depenses_ponctuelles_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, montant, categorie, date, type_opex_capex
FROM depenses_ponctuelles
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY date DESC
LIMIT 100;

-- CHARGES FIXES: WHERE projet_id = X ORDER BY date_debut DESC
-- Index attendu: idx_charges_fixes_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, categorie, montant, date_debut, frequence
FROM charges_fixes
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY date_debut DESC;

-- ============================================================================
-- 5. ANALYSE EXPLAIN ANALYZE - SANTÉ
-- ============================================================================

-- VACCINATIONS: WHERE projet_id = X ORDER BY date_vaccination DESC
-- Index attendu: idx_vaccinations_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, animal_id, vaccin, date_vaccination, statut
FROM vaccinations
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY date_vaccination DESC
LIMIT 100;

-- VACCINATIONS: WHERE animal_id = X ORDER BY date_vaccination DESC
-- Index attendu: idx_vaccinations_animal_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, vaccin, date_vaccination, statut
FROM vaccinations
WHERE animal_id = 'TEST_ANIMAL_ID'
ORDER BY date_vaccination DESC;

-- VACCINATIONS: WHERE projet_id = X AND statut = 'a_faire' ORDER BY date_vaccination ASC
-- Index attendu: idx_vaccinations_projet_statut_date (partial)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, animal_id, vaccin, date_vaccination
FROM vaccinations
WHERE projet_id = 'TEST_PROJET_ID' 
  AND statut = 'a_faire'
ORDER BY date_vaccination ASC;

-- MALADIES: WHERE projet_id = X ORDER BY date_debut DESC
-- Index attendu: idx_maladies_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, animal_id, maladie, date_debut, date_fin, statut
FROM maladies
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY date_debut DESC
LIMIT 100;

-- MALADIES: WHERE animal_id = X AND statut = 'en_cours'
-- Index attendu: idx_maladies_animal_statut
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, maladie, date_debut, date_fin
FROM maladies
WHERE animal_id = 'TEST_ANIMAL_ID' 
  AND statut = 'en_cours';

-- TRAITEMENTS: WHERE projet_id = X ORDER BY date_debut DESC
-- Index attendu: idx_traitements_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, animal_id, traitement, date_debut, date_fin, statut
FROM traitements
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY date_debut DESC
LIMIT 100;

-- VISITES VÉTÉRINAIRES: WHERE projet_id = X ORDER BY date_visite DESC
-- Index attendu: idx_visites_veterinaires_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, date_visite, veterinaire, type_visite, cout
FROM visites_veterinaires
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY date_visite DESC
LIMIT 100;

-- ============================================================================
-- 6. ANALYSE EXPLAIN ANALYZE - REPRODUCTION
-- ============================================================================

-- GESTATIONS: WHERE projet_id = X ORDER BY date_insemination DESC
-- Index attendu: idx_gestations_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, truie_id, date_insemination, date_mise_bas_prevue, statut
FROM gestations
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY date_insemination DESC
LIMIT 100;

-- GESTATIONS: WHERE projet_id = X AND statut = 'en_cours' ORDER BY date_mise_bas_prevue ASC
-- Index attendu: idx_gestations_projet_statut_date (partial)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, truie_id, date_insemination, date_mise_bas_prevue
FROM gestations
WHERE projet_id = 'TEST_PROJET_ID' 
  AND statut = 'en_cours'
ORDER BY date_mise_bas_prevue ASC;

-- SEVRAGES: WHERE projet_id = X ORDER BY date_sevrage DESC
-- Index attendu: idx_sevrages_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, truie_id, nombre_porcelets, date_sevrage, poids_moyen
FROM sevrages
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY date_sevrage DESC
LIMIT 100;

-- ============================================================================
-- 7. ANALYSE EXPLAIN ANALYZE - MARKETPLACE
-- ============================================================================

-- MARKETPLACE_LISTINGS: WHERE status != 'removed' ORDER BY listed_at DESC
-- Index attendu: idx_marketplace_listings_active_listed (partial)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, subject_id, producer_id, farm_id, price_per_kg, status, listed_at
FROM marketplace_listings
WHERE status != 'removed'
ORDER BY listed_at DESC
LIMIT 100;

-- MARKETPLACE_LISTINGS: WHERE farm_id = X AND status != 'removed' ORDER BY listed_at DESC
-- Index attendu: idx_marketplace_listings_farm_active (partial)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, subject_id, producer_id, price_per_kg, listed_at
FROM marketplace_listings
WHERE farm_id = 'TEST_PROJET_ID' 
  AND status != 'removed'
ORDER BY listed_at DESC
LIMIT 50;

-- ============================================================================
-- 8. ANALYSE EXPLAIN ANALYZE - BATCHES (Mode bande)
-- ============================================================================

-- BATCHES: WHERE projet_id = X ORDER BY batch_creation_date DESC
-- Index attendu: idx_batches_projet_creation
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, pen_name, category, total_count, batch_creation_date
FROM batches
WHERE projet_id = 'TEST_PROJET_ID'
ORDER BY batch_creation_date DESC;

-- BATCH_PIGS: WHERE batch_id = X ORDER BY entry_date DESC
-- Index attendu: idx_batch_pigs_batch_entry
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, name, sex, age_months, current_weight_kg, entry_date
FROM batch_pigs
WHERE batch_id = 'TEST_BATCH_ID'
ORDER BY entry_date DESC;

-- ============================================================================
-- 9. ANALYSE EXPLAIN ANALYZE - PROJETS
-- ============================================================================

-- PROJETS: WHERE proprietaire_id = X AND statut = Y
-- Index attendu: idx_projets_owner_statut
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, nom, localisation, statut, date_creation
FROM projets
WHERE proprietaire_id = 'TEST_USER_ID' 
  AND statut = 'actif'
ORDER BY date_creation DESC;

-- PROJETS: WHERE proprietaire_id = X AND statut = 'actif' (recherche projet actif)
-- Index attendu: idx_projets_owner_active (partial)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, nom, localisation, management_method
FROM projets
WHERE proprietaire_id = 'TEST_USER_ID' 
  AND statut = 'actif'
ORDER BY date_creation DESC
LIMIT 1;

-- ============================================================================
-- 10. ANALYSE EXPLAIN ANALYZE - REQUÊTES COMPLEXES (JOINS)
-- ============================================================================

-- Requête complexe: Production animaux avec leurs pesées récentes
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT 
  a.id,
  a.code,
  a.nom,
  a.statut,
  p.poids_kg,
  p.date as derniere_pesee
FROM production_animaux a
LEFT JOIN LATERAL (
  SELECT poids_kg, date
  FROM production_pesees
  WHERE animal_id = a.id
  ORDER BY date DESC
  LIMIT 1
) p ON true
WHERE a.projet_id = 'TEST_PROJET_ID'
  AND a.statut = 'actif'
ORDER BY a.date_creation DESC
LIMIT 50;

-- Requête complexe: Statistiques de mortalité par catégorie
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT 
  categorie,
  COUNT(*) as nombre_mortalites,
  SUM(nombre_porcs) as total_porcs_morts
FROM mortalites
WHERE projet_id = 'TEST_PROJET_ID'
GROUP BY categorie
ORDER BY total_porcs_morts DESC;

-- ============================================================================
-- 11. ANALYSE DES REQUÊTES LENTES (pg_stat_statements)
-- ============================================================================
-- NOTE: Nécessite l'extension pg_stat_statements activée

-- Lister les requêtes les plus lentes (si pg_stat_statements est activé)
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND mean_exec_time > 100  -- Plus de 100ms en moyenne
ORDER BY mean_exec_time DESC
LIMIT 20;

-- ============================================================================
-- 12. RECOMMANDATIONS BASÉES SUR L'ANALYSE
-- ============================================================================

-- Après avoir exécuté les EXPLAIN ANALYZE ci-dessus, analyser les résultats:

-- ✅ INDICATEURS POSITIFS:
--    - "Index Scan" ou "Index Only Scan" dans le plan d'exécution
--    - "Execution Time" < 50ms pour les requêtes simples
--    - "Buffers: shared hit" élevé (données en cache)

-- ⚠️ INDICATEURS NÉGATIFS:
--    - "Seq Scan" (scans séquentiels) sur de grandes tables
--    - "Execution Time" > 100ms pour des requêtes simples
--    - "Buffers: shared read" élevé (données pas en cache)
--    - "Planning Time" > 10ms (peut indiquer des statistiques obsolètes)

-- 📋 ACTIONS RECOMMANDÉES:
--    1. Si "Seq Scan" détecté: Créer un index approprié
--    2. Si "Execution Time" élevé: Analyser le plan d'exécution en détail
--    3. Si statistiques obsolètes: Exécuter ANALYZE sur les tables concernées
--    4. Si index non utilisé: Vérifier les statistiques (ANALYZE) ou réorganiser l'index (REINDEX)

-- ============================================================================
-- 13. MAINTENANCE DES INDEX
-- ============================================================================

-- Mettre à jour les statistiques des tables (à exécuter régulièrement)
ANALYZE production_animaux;
ANALYZE production_pesees;
ANALYZE mortalites;
ANALYZE revenus;
ANALYZE depenses_ponctuelles;
ANALYZE charges_fixes;
ANALYZE vaccinations;
ANALYZE maladies;
ANALYZE traitements;
ANALYZE visites_veterinaires;
ANALYZE gestations;
ANALYZE sevrages;
ANALYZE marketplace_listings;
ANALYZE batches;
ANALYZE batch_pigs;
ANALYZE projets;

-- Réorganiser les index si nécessaire (à exécuter occasionnellement)
-- REINDEX TABLE production_animaux;
-- REINDEX TABLE production_pesees;
-- etc.

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

