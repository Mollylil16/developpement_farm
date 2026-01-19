-- Migration 083: Corriger la contrainte unique de schema_migrations
-- Date: 2026-01-17
-- Description: Change la contrainte UNIQUE de migration_number vers migration_name
--              pour permettre plusieurs migrations avec le même numéro
--              Note: migration_name a déjà une contrainte UNIQUE depuis la migration 000,
--              donc on s'assure simplement qu'elle a le bon nom et on supprime l'ancienne contrainte sur migration_number

DO $$
DECLARE
  constraint_name TEXT;
  col_attnum INTEGER;
BEGIN
  -- Obtenir l'attnum de la colonne migration_name
  SELECT attnum INTO col_attnum
  FROM pg_attribute
  WHERE attrelid = 'schema_migrations'::regclass
    AND attname = 'migration_name'
  LIMIT 1;

  -- Si la colonne existe, chercher la contrainte unique existante
  IF col_attnum IS NOT NULL THEN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'schema_migrations'::regclass
      AND contype = 'u'
      AND col_attnum = ANY(conkey)
    LIMIT 1;

    -- Si la contrainte existe mais n'a pas le bon nom, la renommer
    IF constraint_name IS NOT NULL AND constraint_name != 'schema_migrations_migration_name_key' THEN
      EXECUTE format('ALTER TABLE schema_migrations RENAME CONSTRAINT %I TO schema_migrations_migration_name_key', constraint_name);
    END IF;

    -- Si aucune contrainte unique n'existe sur migration_name (cas peu probable), la créer
    IF constraint_name IS NULL THEN
      ALTER TABLE schema_migrations
      ADD CONSTRAINT schema_migrations_migration_name_key UNIQUE (migration_name);
    END IF;
  END IF;

  -- Supprimer l'ancienne contrainte unique sur migration_number si elle existe
  ALTER TABLE schema_migrations
  DROP CONSTRAINT IF EXISTS schema_migrations_migration_number_key;
END $$;

-- Mettre à jour les commentaires
COMMENT ON COLUMN schema_migrations.migration_number IS 'Numéro de la migration (peut être dupliqué si plusieurs fichiers ont le même numéro)';
COMMENT ON COLUMN schema_migrations.migration_name IS 'Nom du fichier de migration (identifiant unique, ex: 050_add_batch_id_to_traitements.sql)';
