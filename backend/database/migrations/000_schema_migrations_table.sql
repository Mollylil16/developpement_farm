-- Migration 000: Table de suivi des migrations SQL
-- Cette table doit être créée en premier pour permettre le suivi automatique des migrations

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_number INTEGER NOT NULL UNIQUE,
  migration_name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_number ON schema_migrations(migration_number);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_name ON schema_migrations(migration_name);

COMMENT ON TABLE schema_migrations IS 'Table de suivi des migrations SQL appliquées automatiquement';
COMMENT ON COLUMN schema_migrations.migration_number IS 'Numéro de la migration (extrait du nom de fichier, ex: 082)';
COMMENT ON COLUMN schema_migrations.migration_name IS 'Nom du fichier de migration (ex: 082_add_verrat_to_batch_gestations.sql)';
COMMENT ON COLUMN schema_migrations.applied_at IS 'Date et heure d''application de la migration';
