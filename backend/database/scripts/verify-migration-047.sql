-- ============================================================================
-- Script de Vérification Post-Migration 047
-- Date: 2025-01-XX
-- Objectif: Vérifier que tous les index de la migration 047 ont été créés
-- ============================================================================
--
-- USAGE:
-- 1. Exécuter ce script après la migration 047
-- 2. Vérifier que tous les index attendus sont présents
-- 3. Documenter les résultats
--
-- ============================================================================

-- ============================================================================
-- 1. VÉRIFICATION DES INDEX ATTENDUS
-- ============================================================================

-- Liste des index attendus après migration 047
WITH expected_indexes AS (
  SELECT 'revenus' as table_name, 'idx_revenus_projet_date' as index_name
  UNION ALL SELECT 'revenus', 'idx_revenus_projet_categorie'
  UNION ALL SELECT 'depenses_ponctuelles', 'idx_depenses_ponctuelles_projet_date'
  UNION ALL SELECT 'depenses_ponctuelles', 'idx_depenses_ponctuelles_projet_categorie'
  UNION ALL SELECT 'charges_fixes', 'idx_charges_fixes_projet_date'
  UNION ALL SELECT 'vaccinations', 'idx_vaccinations_projet_date'
  UNION ALL SELECT 'vaccinations', 'idx_vaccinations_animal_date'
  UNION ALL SELECT 'vaccinations', 'idx_vaccinations_projet_statut_date'
  UNION ALL SELECT 'maladies', 'idx_maladies_projet_date'
  UNION ALL SELECT 'maladies', 'idx_maladies_animal_statut'
  UNION ALL SELECT 'traitements', 'idx_traitements_projet_date'
  UNION ALL SELECT 'traitements', 'idx_traitements_animal_statut'
  UNION ALL SELECT 'visites_veterinaires', 'idx_visites_veterinaires_projet_date'
  UNION ALL SELECT 'gestations', 'idx_gestations_projet_date'
  UNION ALL SELECT 'gestations', 'idx_gestations_projet_statut_date'
  UNION ALL SELECT 'sevrages', 'idx_sevrages_projet_date'
  UNION ALL SELECT 'rapports_croissance', 'idx_rapports_croissance_projet_date'
  UNION ALL SELECT 'planifications', 'idx_planifications_projet_date'
  UNION ALL SELECT 'planifications', 'idx_planifications_projet_statut_date'
  UNION ALL SELECT 'collaborations', 'idx_collaborations_projet_collaborateur'
  UNION ALL SELECT 'collaborations', 'idx_collaborations_collaborateur'
)
SELECT 
  ei.table_name,
  ei.index_name,
  CASE 
    WHEN pi.indexname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  pi.indexdef
FROM expected_indexes ei
LEFT JOIN pg_indexes pi 
  ON pi.schemaname = 'public' 
  AND pi.tablename = ei.table_name 
  AND pi.indexname = ei.index_name
ORDER BY ei.table_name, ei.index_name;

-- ============================================================================
-- 2. COMPTEUR D'INDEX PAR TABLE
-- ============================================================================

SELECT 
  tablename,
  COUNT(*) as total_indexes,
  COUNT(CASE WHEN indexname LIKE 'idx_%' THEN 1 END) as migration_047_indexes
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'revenus', 'depenses_ponctuelles', 'charges_fixes',
    'vaccinations', 'maladies', 'traitements', 'visites_veterinaires',
    'gestations', 'sevrages', 'rapports_croissance',
    'planifications', 'collaborations'
  )
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 3. VÉRIFICATION DES INDEX PARTIELS
-- ============================================================================

SELECT 
  tablename,
  indexname,
  indexdef,
  CASE 
    WHEN indexdef LIKE '%WHERE statut = ''a_faire''%' THEN '✅ Partial (a_faire)'
    WHEN indexdef LIKE '%WHERE statut = ''en_cours''%' THEN '✅ Partial (en_cours)'
    WHEN indexdef LIKE '%WHERE animal_id IS NOT NULL%' THEN '✅ Partial (animal_id)'
    WHEN indexdef LIKE '%WHERE date_debut >= CURRENT_DATE%' THEN '✅ Partial (future)'
    ELSE '⚠️ Check manually'
  END as partial_type
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%WHERE%'
  AND tablename IN (
    'vaccinations', 'gestations', 'planifications', 'maladies', 'traitements'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- 4. VÉRIFICATION DES STATISTIQUES (ANALYZE)
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  last_analyze,
  last_autoanalyze,
  CASE 
    WHEN last_analyze IS NOT NULL OR last_autoanalyze IS NOT NULL THEN '✅ Analyzed'
    ELSE '⚠️ Not analyzed recently'
  END as analyze_status,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'revenus', 'depenses_ponctuelles', 'charges_fixes',
    'vaccinations', 'maladies', 'traitements', 'visites_veterinaires',
    'gestations', 'sevrages', 'rapports_croissance',
    'planifications', 'collaborations'
  )
ORDER BY tablename;

-- ============================================================================
-- 5. VÉRIFICATION DE LA TAILLE DES INDEX
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan as usage_count,
  CASE 
    WHEN idx_scan = 0 THEN '⚠️ Unused'
    WHEN idx_scan < 10 THEN '📊 Low usage'
    ELSE '✅ Used'
  END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN (
    'revenus', 'depenses_ponctuelles', 'charges_fixes',
    'vaccinations', 'maladies', 'traitements', 'visites_veterinaires',
    'gestations', 'sevrages', 'rapports_croissance',
    'planifications', 'collaborations'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- 6. RÉSUMÉ DE VALIDATION
-- ============================================================================

SELECT 
  'Total indexes expected' as metric,
  COUNT(*)::text as value
FROM (
  SELECT 'revenus' as table_name, 'idx_revenus_projet_date' as index_name
  UNION ALL SELECT 'revenus', 'idx_revenus_projet_categorie'
  UNION ALL SELECT 'depenses_ponctuelles', 'idx_depenses_ponctuelles_projet_date'
  UNION ALL SELECT 'depenses_ponctuelles', 'idx_depenses_ponctuelles_projet_categorie'
  UNION ALL SELECT 'charges_fixes', 'idx_charges_fixes_projet_date'
  UNION ALL SELECT 'vaccinations', 'idx_vaccinations_projet_date'
  UNION ALL SELECT 'vaccinations', 'idx_vaccinations_animal_date'
  UNION ALL SELECT 'vaccinations', 'idx_vaccinations_projet_statut_date'
  UNION ALL SELECT 'maladies', 'idx_maladies_projet_date'
  UNION ALL SELECT 'maladies', 'idx_maladies_animal_statut'
  UNION ALL SELECT 'traitements', 'idx_traitements_projet_date'
  UNION ALL SELECT 'traitements', 'idx_traitements_animal_statut'
  UNION ALL SELECT 'visites_veterinaires', 'idx_visites_veterinaires_projet_date'
  UNION ALL SELECT 'gestations', 'idx_gestations_projet_date'
  UNION ALL SELECT 'gestations', 'idx_gestations_projet_statut_date'
  UNION ALL SELECT 'sevrages', 'idx_sevrages_projet_date'
  UNION ALL SELECT 'rapports_croissance', 'idx_rapports_croissance_projet_date'
  UNION ALL SELECT 'planifications', 'idx_planifications_projet_date'
  UNION ALL SELECT 'planifications', 'idx_planifications_projet_statut_date'
  UNION ALL SELECT 'collaborations', 'idx_collaborations_projet_collaborateur'
  UNION ALL SELECT 'collaborations', 'idx_collaborations_collaborateur'
) expected
UNION ALL
SELECT 
  'Total indexes found' as metric,
  COUNT(*)::text as value
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_revenus_projet_date', 'idx_revenus_projet_categorie',
    'idx_depenses_ponctuelles_projet_date', 'idx_depenses_ponctuelles_projet_categorie',
    'idx_charges_fixes_projet_date',
    'idx_vaccinations_projet_date', 'idx_vaccinations_animal_date', 'idx_vaccinations_projet_statut_date',
    'idx_maladies_projet_date', 'idx_maladies_animal_statut',
    'idx_traitements_projet_date', 'idx_traitements_animal_statut',
    'idx_visites_veterinaires_projet_date',
    'idx_gestations_projet_date', 'idx_gestations_projet_statut_date',
    'idx_sevrages_projet_date',
    'idx_rapports_croissance_projet_date',
    'idx_planifications_projet_date', 'idx_planifications_projet_statut_date',
    'idx_collaborations_projet_collaborateur', 'idx_collaborations_collaborateur'
  )
UNION ALL
SELECT 
  'Migration status' as metric,
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM pg_indexes 
      WHERE schemaname = 'public'
        AND indexname IN (
          'idx_revenus_projet_date', 'idx_revenus_projet_categorie',
          'idx_depenses_ponctuelles_projet_date', 'idx_depenses_ponctuelles_projet_categorie',
          'idx_charges_fixes_projet_date',
          'idx_vaccinations_projet_date', 'idx_vaccinations_animal_date', 'idx_vaccinations_projet_statut_date',
          'idx_maladies_projet_date', 'idx_maladies_animal_statut',
          'idx_traitements_projet_date', 'idx_traitements_animal_statut',
          'idx_visites_veterinaires_projet_date',
          'idx_gestations_projet_date', 'idx_gestations_projet_statut_date',
          'idx_sevrages_projet_date',
          'idx_rapports_croissance_projet_date',
          'idx_planifications_projet_date', 'idx_planifications_projet_statut_date',
          'idx_collaborations_projet_collaborateur', 'idx_collaborations_collaborateur'
        )
    ) = 22 THEN '✅ SUCCESS'
    ELSE '❌ INCOMPLETE'
  END as value;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

