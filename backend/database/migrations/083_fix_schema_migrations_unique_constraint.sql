-- Migration 083: Corriger la contrainte unique de schema_migrations
-- Date: 2026-01-17
-- Description: Change la contrainte UNIQUE de migration_number vers migration_name
--              pour permettre plusieurs migrations avec le même numéro

-- Supprimer l'ancienne contrainte unique sur migration_number
ALTER TABLE schema_migrations
DROP CONSTRAINT IF EXISTS schema_migrations_migration_number_key;

-- Ajouter une contrainte unique sur migration_name (nom de fichier)
ALTER TABLE schema_migrations
ADD CONSTRAINT schema_migrations_migration_name_key UNIQUE (migration_name);

-- Mettre à jour les commentaires
COMMENT ON COLUMN schema_migrations.migration_number IS 'Numéro de la migration (peut être dupliqué si plusieurs fichiers ont le même numéro)';
COMMENT ON COLUMN schema_migrations.migration_name IS 'Nom du fichier de migration (identifiant unique, ex: 050_add_batch_id_to_traitements.sql)';
