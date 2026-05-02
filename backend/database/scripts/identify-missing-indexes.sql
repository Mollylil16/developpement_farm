-- Script d'analyse pour identifier les indexes manquants
-- Date: 2025-01-XX
-- Phase 5: Analyse EXPLAIN ANALYZE
--
-- Usage:
-- 1. Exécuter ce script pour identifier les opportunités d'indexation
-- 2. Analyser les résultats avec EXPLAIN ANALYZE sur les requêtes identifiées
-- 3. Créer une migration pour les nouveaux indexes

-- ==================== ANALYSE DES REQUÊTES FRÉQUENTES ====================

-- 1. Vérifier les indexes existants sur les tables principales
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
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
    'collaborations'
  )
ORDER BY tablename, indexname;

-- 2. Identifier les colonnes fréquemment utilisées dans WHERE sans index
-- (Requiert pg_stat_statements - à exécuter après collecte de données)

-- ==================== REQUÊTES À ANALYSER AVEC EXPLAIN ANALYZE ====================

-- REVENUS
-- Pattern: WHERE projet_id = X ORDER BY date DESC
-- Vérifier si index existe: idx_revenus_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, montant, categorie, date, poids_kg
FROM revenus
WHERE projet_id = 'test_projet_id'
ORDER BY date DESC
LIMIT 100;

-- DÉPENSES PONCTUELLES
-- Pattern: WHERE projet_id = X ORDER BY date DESC
-- Vérifier si index existe: idx_depenses_ponctuelles_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, montant, categorie, date, type_opex_capex
FROM depenses_ponctuelles
WHERE projet_id = 'test_projet_id'
ORDER BY date DESC
LIMIT 100;

-- Pattern: WHERE projet_id = X AND categorie = Y
-- Vérifier si index existe: idx_depenses_ponctuelles_projet_categorie
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, montant, date
FROM depenses_ponctuelles
WHERE projet_id = 'test_projet_id' AND categorie = 'alimentation'
ORDER BY date DESC;

-- CHARGES FIXES
-- Pattern: WHERE projet_id = X ORDER BY date_debut DESC
-- Vérifier si index existe: idx_charges_fixes_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, categorie, montant, date_debut, frequence
FROM charges_fixes
WHERE projet_id = 'test_projet_id'
ORDER BY date_debut DESC;

-- VACCINATIONS
-- Pattern: WHERE projet_id = X ORDER BY date_vaccination DESC
-- Vérifier si index existe: idx_vaccinations_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, animal_id, vaccin, date_vaccination, statut
FROM vaccinations
WHERE projet_id = 'test_projet_id'
ORDER BY date_vaccination DESC
LIMIT 100;

-- Pattern: WHERE animal_id = X ORDER BY date_vaccination DESC
-- Vérifier si index existe: idx_vaccinations_animal_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, vaccin, date_vaccination, statut
FROM vaccinations
WHERE animal_id = 'test_animal_id'
ORDER BY date_vaccination DESC;

-- Pattern: WHERE projet_id = X AND statut = Y
-- Vérifier si index existe: idx_vaccinations_projet_statut
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, animal_id, vaccin, date_vaccination
FROM vaccinations
WHERE projet_id = 'test_projet_id' AND statut = 'a_faire'
ORDER BY date_vaccination ASC;

-- MALADIES
-- Pattern: WHERE projet_id = X ORDER BY date_debut DESC
-- Vérifier si index existe: idx_maladies_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, animal_id, maladie, date_debut, date_fin, statut
FROM maladies
WHERE projet_id = 'test_projet_id'
ORDER BY date_debut DESC
LIMIT 100;

-- Pattern: WHERE animal_id = X AND statut = 'en_cours'
-- Vérifier si index existe: idx_maladies_animal_statut
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, maladie, date_debut, date_fin
FROM maladies
WHERE animal_id = 'test_animal_id' AND statut = 'en_cours';

-- TRAITEMENTS
-- Pattern: WHERE projet_id = X ORDER BY date_debut DESC
-- Vérifier si index existe: idx_traitements_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, animal_id, traitement, date_debut, date_fin, statut
FROM traitements
WHERE projet_id = 'test_projet_id'
ORDER BY date_debut DESC
LIMIT 100;

-- Pattern: WHERE animal_id = X AND statut = 'en_cours'
-- Vérifier si index existe: idx_traitements_animal_statut
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, traitement, date_debut, date_fin
FROM traitements
WHERE animal_id = 'test_animal_id' AND statut = 'en_cours';

-- VISITES VÉTÉRINAIRES
-- Pattern: WHERE projet_id = X ORDER BY date_visite DESC
-- Vérifier si index existe: idx_visites_veterinaires_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, date_visite, veterinaire, type_visite, cout
FROM visites_veterinaires
WHERE projet_id = 'test_projet_id'
ORDER BY date_visite DESC
LIMIT 100;

-- GESTATIONS
-- Pattern: WHERE projet_id = X ORDER BY date_insemination DESC
-- Vérifier si index existe: idx_gestations_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, truie_id, date_insemination, date_mise_bas_prevue, statut
FROM gestations
WHERE projet_id = 'test_projet_id'
ORDER BY date_insemination DESC
LIMIT 100;

-- Pattern: WHERE projet_id = X AND statut = Y
-- Vérifier si index existe: idx_gestations_projet_statut
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, truie_id, date_insemination, date_mise_bas_prevue
FROM gestations
WHERE projet_id = 'test_projet_id' AND statut = 'en_cours'
ORDER BY date_mise_bas_prevue ASC;

-- SEVRAGES
-- Pattern: WHERE projet_id = X ORDER BY date_sevrage DESC
-- Vérifier si index existe: idx_sevrages_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, truie_id, nombre_porcelets, date_sevrage, poids_moyen
FROM sevrages
WHERE projet_id = 'test_projet_id'
ORDER BY date_sevrage DESC
LIMIT 100;

-- RAPPORTS CROISSANCE
-- Pattern: WHERE projet_id = X ORDER BY date DESC
-- Vérifier si index existe: idx_rapports_croissance_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, date, poids_moyen, nombre_porcs, gain_quotidien
FROM rapports_croissance
WHERE projet_id = 'test_projet_id'
ORDER BY date DESC
LIMIT 100;

-- PLANIFICATIONS
-- Pattern: WHERE projet_id = X ORDER BY date_debut ASC
-- Vérifier si index existe: idx_planifications_projet_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, type_tache, date_debut, date_fin, statut
FROM planifications
WHERE projet_id = 'test_projet_id'
ORDER BY date_debut ASC
LIMIT 100;

-- Pattern: WHERE projet_id = X AND statut = Y AND date_debut >= CURRENT_DATE
-- Vérifier si index existe: idx_planifications_projet_statut_date
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, type_tache, date_debut, date_fin
FROM planifications
WHERE projet_id = 'test_projet_id' 
  AND statut = 'a_faire'
  AND date_debut >= CURRENT_DATE
ORDER BY date_debut ASC;

-- COLLABORATIONS
-- Pattern: WHERE projet_id = X OR collaborateur_id = X
-- Vérifier si index existe: idx_collaborations_projet_collaborateur
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, projet_id, collaborateur_id, role, statut
FROM collaborations
WHERE projet_id = 'test_projet_id' OR collaborateur_id = 'test_user_id'
ORDER BY date_creation DESC;

-- ==================== RÉSUMÉ DES INDEXES RECOMMANDÉS ====================

-- Les indexes suivants sont recommandés pour améliorer les performances:

-- 1. REVENUS
--    - idx_revenus_projet_date (projet_id, date DESC)
--    - idx_revenus_projet_categorie (projet_id, categorie) [si filtrage fréquent par catégorie]

-- 2. DÉPENSES PONCTUELLES
--    - idx_depenses_ponctuelles_projet_date (projet_id, date DESC)
--    - idx_depenses_ponctuelles_projet_categorie (projet_id, categorie)

-- 3. CHARGES FIXES
--    - idx_charges_fixes_projet_date (projet_id, date_debut DESC)

-- 4. VACCINATIONS
--    - idx_vaccinations_projet_date (projet_id, date_vaccination DESC)
--    - idx_vaccinations_animal_date (animal_id, date_vaccination DESC)
--    - idx_vaccinations_projet_statut (projet_id, statut, date_vaccination ASC) [pour requêtes "à faire"]

-- 5. MALADIES
--    - idx_maladies_projet_date (projet_id, date_debut DESC)
--    - idx_maladies_animal_statut (animal_id, statut) [si filtrage fréquent par statut]

-- 6. TRAITEMENTS
--    - idx_traitements_projet_date (projet_id, date_debut DESC)
--    - idx_traitements_animal_statut (animal_id, statut)

-- 7. VISITES VÉTÉRINAIRES
--    - idx_visites_veterinaires_projet_date (projet_id, date_visite DESC)

-- 8. GESTATIONS
--    - idx_gestations_projet_date (projet_id, date_insemination DESC)
--    - idx_gestations_projet_statut (projet_id, statut, date_mise_bas_prevue ASC)

-- 9. SEVRAGES
--    - idx_sevrages_projet_date (projet_id, date_sevrage DESC)

-- 10. RAPPORTS CROISSANCE
--     - idx_rapports_croissance_projet_date (projet_id, date DESC)

-- 11. PLANIFICATIONS
--     - idx_planifications_projet_date (projet_id, date_debut ASC)
--     - idx_planifications_projet_statut_date (projet_id, statut, date_debut ASC) [pour requêtes "à faire" futures]

-- 12. COLLABORATIONS
--     - idx_collaborations_projet_collaborateur (projet_id, collaborateur_id)
--     - idx_collaborations_collaborateur (collaborateur_id) [pour requêtes par collaborateur]

-- ==================== NOTES ====================

-- 1. Remplacer 'test_projet_id', 'test_animal_id', 'test_user_id' par des IDs réels pour les tests
-- 2. Analyser les résultats EXPLAIN ANALYZE pour identifier les "Seq Scan" (scans séquentiels)
-- 3. Les "Seq Scan" indiquent qu'un index serait bénéfique
-- 4. Vérifier le "Planning Time" et "Execution Time" avant/après ajout d'index
-- 5. Les indexes composites sont plus efficaces pour les requêtes avec plusieurs conditions WHERE

