-- Migration 062: Ajout du support batch aux mortalités
-- Permet de gérer les mortalités pour les deux modes : individuel et batch

-- Ajouter batch_id à mortalites (si elle n'existe pas déjà)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mortalites' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE mortalites ADD COLUMN batch_id VARCHAR(255);
    ALTER TABLE mortalites ADD CONSTRAINT fk_mortalites_batch 
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_mortalites_batch_id ON mortalites(batch_id);
  END IF;
END $$;

-- Commentaire pour documentation
COMMENT ON COLUMN mortalites.batch_id IS 'ID de la bande associée à la mortalité (mode batch)';

