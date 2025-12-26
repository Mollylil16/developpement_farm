-- Migration 048: Correction de la contrainte CASCADE pour préserver l'historique des mouvements
-- Change ON DELETE CASCADE en ON DELETE SET NULL pour pig_id dans batch_pig_movements
-- Cela permet de préserver les enregistrements de mortalité même après suppression des porcs

-- Supprimer l'ancienne contrainte
ALTER TABLE batch_pig_movements 
DROP CONSTRAINT IF EXISTS batch_pig_movements_pig_id_fkey;

-- Rendre pig_id nullable pour permettre SET NULL
ALTER TABLE batch_pig_movements
ALTER COLUMN pig_id DROP NOT NULL;

-- Recréer la contrainte avec ON DELETE SET NULL
ALTER TABLE batch_pig_movements
ADD CONSTRAINT batch_pig_movements_pig_id_fkey
FOREIGN KEY (pig_id) REFERENCES batch_pigs(id) ON DELETE SET NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN batch_pig_movements.pig_id IS 'ID du porc (peut être NULL si le porc a été supprimé, l''historique est préservé dans removal_details)';

