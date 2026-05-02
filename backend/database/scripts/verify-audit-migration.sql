-- Script de vérification de la migration 086_enrich_collaboration_history_audit.sql
-- Usage: psql -d votre_database -f verify-audit-migration.sql

\echo '========================================'
\echo 'Vérification de la migration 086'
\echo '========================================'
\echo ''

-- 1. Vérifier que la migration a été appliquée
\echo '1. Vérification de la migration dans schema_migrations:'
SELECT 
  migration_number,
  migration_name,
  applied_at
FROM schema_migrations
WHERE migration_name = '086_enrich_collaboration_history_audit.sql';

\echo ''
\echo '2. Vérification des colonnes ajoutées:'
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'collaboration_history' 
  AND column_name IN ('device_info', 'action_metadata', 'profile_id')
ORDER BY column_name;

\echo ''
\echo '3. Vérification de l''index profile_id:'
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'collaboration_history' 
  AND indexname = 'idx_collab_history_profile_id';

\echo ''
\echo '4. Vérification des commentaires:'
SELECT 
  column_name,
  col_description(
    (SELECT oid FROM pg_class WHERE relname = 'collaboration_history'),
    ordinal_position
  ) as comment
FROM information_schema.columns 
WHERE table_name = 'collaboration_history' 
  AND column_name IN ('device_info', 'action_metadata', 'profile_id')
ORDER BY column_name;

\echo ''
\echo '5. Statistiques des métadonnées enrichies (7 derniers jours):'
SELECT 
  COUNT(*) as total_actions,
  COUNT(device_info) as actions_with_device_info,
  COUNT(action_metadata) as actions_with_metadata,
  COUNT(profile_id) as actions_with_profile_id,
  COUNT(*) FILTER (WHERE device_info IS NOT NULL AND action_metadata IS NOT NULL AND profile_id IS NOT NULL) as fully_enriched_actions
FROM collaboration_history
WHERE created_at > NOW() - INTERVAL '7 days';

\echo ''
\echo '6. Dernières actions avec métadonnées enrichies:'
SELECT 
  ch.id,
  ch.action,
  ch.created_at,
  ch.profile_id,
  CASE 
    WHEN ch.device_info IS NOT NULL THEN 'Oui'
    ELSE 'Non'
  END as has_device_info,
  CASE 
    WHEN ch.action_metadata IS NOT NULL THEN 'Oui'
    ELSE 'Non'
  END as has_action_metadata,
  u.nom || ' ' || u.prenom as performed_by
FROM collaboration_history ch
LEFT JOIN users u ON ch.performed_by = u.id
WHERE ch.created_at > NOW() - INTERVAL '7 days'
ORDER BY ch.created_at DESC
LIMIT 10;

\echo ''
\echo '========================================'
\echo 'Vérification terminée'
\echo '========================================'
