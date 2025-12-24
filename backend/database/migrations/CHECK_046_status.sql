-- Script de vérification de l'état de la migration 046
-- Exécutez ce script pour vérifier quels indexes de la migration 046 existent

-- Vérifier les indexes de production_animaux
SELECT 
  'production_animaux' as table_name,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'production_animaux' 
  AND (indexname LIKE 'idx_production_animaux_projet_statut'
    OR indexname LIKE 'idx_production_animaux_projet_created')
ORDER BY indexname;

-- Vérifier les indexes de production_pesees
SELECT 
  'production_pesees' as table_name,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'production_pesees' 
  AND (indexname LIKE 'idx_production_pesees_projet_date'
    OR indexname LIKE 'idx_production_pesees_animal_date')
ORDER BY indexname;

-- Vérifier les indexes de mortalites
SELECT 
  'mortalites' as table_name,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'mortalites' 
  AND (indexname LIKE 'idx_mortalites_projet_date'
    OR indexname LIKE 'idx_mortalites_projet_categorie')
ORDER BY indexname;

-- Vérifier les indexes de marketplace_listings (CRITIQUE pour le fix)
SELECT 
  'marketplace_listings' as table_name,
  indexname,
  indexdef,
  CASE 
    WHEN indexname = 'idx_marketplace_listings_status_listed' THEN '⚠️ ANCIEN INDEX (à remplacer)'
    WHEN indexname = 'idx_marketplace_listings_active_listed' THEN '✅ NOUVEL INDEX PARTIEL'
    WHEN indexname = 'idx_marketplace_listings_farm_active' THEN '✅ NOUVEL INDEX PARTIEL'
    ELSE 'Autre index'
  END as status
FROM pg_indexes 
WHERE tablename = 'marketplace_listings' 
  AND (indexname LIKE 'idx_marketplace_listings%')
ORDER BY indexname;

-- Vérifier les indexes de batch_pigs
SELECT 
  'batch_pigs' as table_name,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'batch_pigs' 
  AND indexname LIKE 'idx_batch_pigs%'
ORDER BY indexname;

-- Vérifier les indexes de batch_pig_movements
SELECT 
  'batch_pig_movements' as table_name,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'batch_pig_movements' 
  AND indexname LIKE 'idx_batch_pig_movements%'
ORDER BY indexname;

-- Vérifier les indexes de batches
SELECT 
  'batches' as table_name,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'batches' 
  AND indexname LIKE 'idx_batches_projet_creation'
ORDER BY indexname;

-- Vérifier les indexes de projets
SELECT 
  'projets' as table_name,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'projets' 
  AND (indexname LIKE 'idx_projets_owner_statut'
    OR indexname LIKE 'idx_projets_owner_active')
ORDER BY indexname;

-- Résumé: Compter les indexes de la migration 046
SELECT 
  'RÉSUMÉ' as info,
  COUNT(*) FILTER (WHERE tablename = 'production_animaux' AND (indexname = 'idx_production_animaux_projet_statut' OR indexname = 'idx_production_animaux_projet_created')) as prod_animaux_indexes,
  COUNT(*) FILTER (WHERE tablename = 'production_pesees' AND (indexname = 'idx_production_pesees_projet_date' OR indexname = 'idx_production_pesees_animal_date')) as prod_pesees_indexes,
  COUNT(*) FILTER (WHERE tablename = 'mortalites' AND (indexname = 'idx_mortalites_projet_date' OR indexname = 'idx_mortalites_projet_categorie')) as mortalites_indexes,
  COUNT(*) FILTER (WHERE tablename = 'marketplace_listings' AND (indexname = 'idx_marketplace_listings_active_listed' OR indexname = 'idx_marketplace_listings_farm_status' OR indexname = 'idx_marketplace_listings_farm_active')) as marketplace_indexes,
  COUNT(*) FILTER (WHERE tablename = 'batch_pigs' AND indexname = 'idx_batch_pigs_batch_entry') as batch_pigs_indexes,
  COUNT(*) FILTER (WHERE tablename = 'batch_pig_movements' AND indexname = 'idx_batch_pig_movements_pig_date') as batch_pig_movements_indexes,
  COUNT(*) FILTER (WHERE tablename = 'batches' AND indexname = 'idx_batches_projet_creation') as batches_indexes,
  COUNT(*) FILTER (WHERE tablename = 'projets' AND (indexname = 'idx_projets_owner_statut' OR indexname = 'idx_projets_owner_active')) as projets_indexes
FROM pg_indexes
WHERE tablename IN ('production_animaux', 'production_pesees', 'mortalites', 'marketplace_listings', 'batch_pigs', 'batch_pig_movements', 'batches', 'projets');

-- Vérification spécifique pour le fix marketplace_listings
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_listings_status_listed') 
      THEN '⚠️ ACTION REQUISE: Ancien index détecté, exécutez FIX_046_marketplace_indexes.sql'
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_listings_active_listed')
      AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_listings_farm_active')
      THEN '✅ OK: Nouveaux index partiels en place'
    WHEN NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname LIKE 'idx_marketplace_listings%')
      THEN 'ℹ️ Migration 046 non appliquée ou table marketplace_listings inexistante'
    ELSE '⚠️ État inconnu: Vérifiez manuellement les indexes marketplace_listings'
  END as marketplace_indexes_status;

