-- Migration 050: Ajouter batch_id à la table traitements
-- Cette colonne était manquante dans la migration 049

-- ========================================
-- 1. MODIFICATIONS traitements
-- Permettre référence batch_id pour compatibilité mode batch
-- ========================================
ALTER TABLE traitements
ADD COLUMN IF NOT EXISTS batch_id VARCHAR(255) REFERENCES batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_traitements_batch_id ON traitements(batch_id);

-- Commentaire pour documentation
COMMENT ON COLUMN traitements.batch_id IS 'ID de la bande associée au traitement (mode batch)';

