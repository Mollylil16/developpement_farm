-- Vérification rapide de la migration 046
-- Script simplifié pour déterminer rapidement l'état

-- Vérifier spécifiquement l'état des indexes marketplace_listings (le plus critique)
SELECT 
  'marketplace_listings indexes' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_listings_status_listed') 
      THEN '⚠️ ANCIENNE VERSION: Exécutez FIX_046_marketplace_indexes.sql'
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_listings_active_listed')
      AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_listings_farm_active')
      THEN '✅ CORRIGÉ: Index partiels en place'
    WHEN NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname LIKE 'idx_marketplace_listings%')
      THEN 'ℹ️ NON APPLIQUÉ: Exécutez 046_add_performance_indexes.sql'
    ELSE '⚠️ État inconnu'
  END as status;

-- Compter les indexes de la migration 046 (toutes tables confondues)
SELECT 
  'Total indexes migration 046' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 15 THEN '✅ Migration complète appliquée'
    WHEN COUNT(*) > 0 THEN '⚠️ Migration partielle (certains indexes manquants)'
    ELSE '❌ Migration non appliquée'
  END as status
FROM pg_indexes
WHERE tablename IN ('production_animaux', 'production_pesees', 'mortalites', 'marketplace_listings', 'batch_pigs', 'batch_pig_movements', 'batches', 'projets')
  AND (
    indexname LIKE 'idx_production_animaux_projet%'
    OR indexname LIKE 'idx_production_pesees_projet%'
    OR indexname LIKE 'idx_production_pesees_animal_date%'
    OR indexname LIKE 'idx_mortalites_projet%'
    OR indexname LIKE 'idx_marketplace_listings%'
    OR indexname LIKE 'idx_batch_pigs_batch_entry%'
    OR indexname LIKE 'idx_batch_pig_movements_pig_date%'
    OR indexname LIKE 'idx_batches_projet_creation%'
    OR indexname LIKE 'idx_projets_owner%'
  );

