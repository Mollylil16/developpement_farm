-- Migration 061: Ajout du support batch aux visites vétérinaires
-- Permet de gérer les visites vétérinaires pour les deux modes : individuel et batch

-- Ajouter batch_id à visites_veterinaires (si elle n'existe pas déjà)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visites_veterinaires' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE visites_veterinaires ADD COLUMN batch_id VARCHAR(255);
    ALTER TABLE visites_veterinaires ADD CONSTRAINT fk_visites_veterinaires_batch 
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_visites_veterinaires_batch_id ON visites_veterinaires(batch_id);
  END IF;
END $$;

-- Commentaire pour documentation
COMMENT ON COLUMN visites_veterinaires.batch_id IS 'ID de la bande associée à la visite (mode batch)';

