-- Migration 049: Système de migration entre modes batch et individualisé
-- Permet de convertir les données entre les deux modes de gestion

-- ========================================
-- 1. TABLE migration_history
-- ========================================
CREATE TABLE IF NOT EXISTS migration_history (
  id VARCHAR(255) PRIMARY KEY,
  migration_type VARCHAR(50) NOT NULL CHECK (migration_type IN ('batch_to_individual', 'individual_to_batch')),
  projet_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  
  -- Sources et cibles
  source_ids JSONB NOT NULL, -- IDs des entités sources (batches ou production_animaux)
  target_ids JSONB NOT NULL, -- IDs des entités créées
  
  -- Configuration utilisée
  options JSONB NOT NULL,
  
  -- Statistiques
  statistics JSONB, -- {pigsCreated, batchesCreated, recordsMigrated, etc.}
  
  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'rolled_back')),
  error_message TEXT,
  
  -- Dates
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_migration_history_projet ON migration_history(projet_id);
CREATE INDEX IF NOT EXISTS idx_migration_history_user ON migration_history(user_id);
CREATE INDEX IF NOT EXISTS idx_migration_history_type ON migration_history(migration_type);
CREATE INDEX IF NOT EXISTS idx_migration_history_status ON migration_history(status);
CREATE INDEX IF NOT EXISTS idx_migration_history_started_at ON migration_history(started_at);

-- ========================================
-- 2. MODIFICATIONS production_animaux
-- Ajouter référence à la bande d'origine
-- ========================================
ALTER TABLE production_animaux
ADD COLUMN IF NOT EXISTS original_batch_id VARCHAR(255) REFERENCES batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_production_animaux_original_batch ON production_animaux(original_batch_id);

-- ========================================
-- 3. MODIFICATIONS batches
-- Ajouter référence aux animaux individuels d'origine
-- ========================================
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS migrated_from_individual BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_animal_ids JSONB; -- IDs des production_animaux d'origine

CREATE INDEX IF NOT EXISTS idx_batches_migrated_from_individual ON batches(migrated_from_individual);

-- ========================================
-- 4. MODIFICATIONS vaccinations
-- Permettre référence batch_id pour compatibilité
-- ========================================
ALTER TABLE vaccinations
ADD COLUMN IF NOT EXISTS batch_id VARCHAR(255) REFERENCES batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vaccinations_batch_id ON vaccinations(batch_id);

-- ========================================
-- 5. MODIFICATIONS production_pesees
-- Permettre référence batch_id pour compatibilité
-- ========================================
ALTER TABLE production_pesees
ADD COLUMN IF NOT EXISTS batch_id VARCHAR(255) REFERENCES batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_production_pesees_batch_id ON production_pesees(batch_id);

-- ========================================
-- 6. MODIFICATIONS maladies
-- Permettre référence batch_id pour compatibilité
-- ========================================
ALTER TABLE maladies
ADD COLUMN IF NOT EXISTS batch_id VARCHAR(255) REFERENCES batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maladies_batch_id ON maladies(batch_id);

-- Commentaires pour documentation
COMMENT ON TABLE migration_history IS 'Historique des migrations entre modes batch et individualisé';
COMMENT ON COLUMN migration_history.source_ids IS 'JSON array des IDs des entités sources (batches ou production_animaux)';
COMMENT ON COLUMN migration_history.target_ids IS 'JSON array des IDs des entités créées';
COMMENT ON COLUMN migration_history.options IS 'Configuration JSON utilisée pour la migration';
COMMENT ON COLUMN migration_history.statistics IS 'Statistiques JSON de la migration (pigsCreated, recordsMigrated, etc.)';
COMMENT ON COLUMN production_animaux.original_batch_id IS 'ID de la bande d''origine si l''animal a été créé depuis une bande';
COMMENT ON COLUMN batches.migrated_from_individual IS 'Indique si la bande a été créée depuis des animaux individuels';
COMMENT ON COLUMN batches.original_animal_ids IS 'JSON array des IDs des production_animaux d''origine';

