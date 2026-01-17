-- Migration 082: Ajouter support verrat dans batch_gestations
-- Date: 2026-01-17
-- Description: Ajoute les colonnes verrat_id et verrat_nom pour uniformiser avec le mode individuel

-- ========================================
-- 1. Ajouter colonnes verrat_id et verrat_nom
-- ========================================
ALTER TABLE batch_gestations
ADD COLUMN IF NOT EXISTS verrat_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS verrat_nom TEXT;

-- ========================================
-- 2. Ajouter index pour verrat_id
-- ========================================
CREATE INDEX IF NOT EXISTS idx_batch_gestations_verrat_id 
ON batch_gestations(verrat_id) 
WHERE verrat_id IS NOT NULL;

-- ========================================
-- 3. Commentaires
-- ========================================
COMMENT ON COLUMN batch_gestations.verrat_id IS 'ID du verrat utilisé (peut être un batch_pig ou un production_animal)';
COMMENT ON COLUMN batch_gestations.verrat_nom IS 'Nom du verrat pour référence rapide';
