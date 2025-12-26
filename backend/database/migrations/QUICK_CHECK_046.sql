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
-- Total attendu: 15 indexes (2 prod_animaux + 2 prod_pesees + 2 mortalites + 3 marketplace + 1 batch_pigs + 1 batch_pig_movements + 1 batches + 2 projets)
SELECT 
  'Total indexes migration 046' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 15 THEN '✅ Migration complète appliquée (15 indexes attendus)'
    WHEN COUNT(*) > 0 THEN '⚠️ Migration partielle (certains indexes manquants)'
    ELSE '❌ Migration non appliquée'
  END as status
FROM pg_indexes
WHERE tablename IN ('production_animaux', 'production_pesees', 'mortalites', 'marketplace_listings', 'batch_pigs', 'batch_pig_movements', 'batches', 'projets')
  AND (
    indexname IN (
      -- production_animaux (2 indexes)
      'idx_production_animaux_projet_statut',
      'idx_production_animaux_projet_created',
      -- production_pesees (2 indexes)
      'idx_production_pesees_projet_date',
      'idx_production_pesees_animal_date',
      -- mortalites (2 indexes)
      'idx_mortalites_projet_date',
      'idx_mortalites_projet_categorie',
      -- marketplace_listings (3 indexes)
      'idx_marketplace_listings_active_listed',
      'idx_marketplace_listings_farm_status',
      'idx_marketplace_listings_farm_active',
      -- batch_pigs (1 index)
      'idx_batch_pigs_batch_entry',
      -- batch_pig_movements (1 index)
      'idx_batch_pig_movements_pig_date',
      -- batches (1 index)
      'idx_batches_projet_creation',
      -- projets (2 indexes)
      'idx_projets_owner_statut',
      'idx_projets_owner_active'
    )
  );

