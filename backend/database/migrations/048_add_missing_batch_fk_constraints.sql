-- Migration 048: Garantir les contraintes FK sur pig_id pour les tables batch_gestations et batch_diseases

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'batch_gestations_pig_id_fkey'
      AND table_schema = 'public'
      AND table_name = 'batch_gestations'
  ) THEN
    ALTER TABLE batch_gestations
      ADD CONSTRAINT batch_gestations_pig_id_fkey
      FOREIGN KEY (pig_id) REFERENCES batch_pigs(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'batch_diseases_pig_id_fkey'
      AND table_schema = 'public'
      AND table_name = 'batch_diseases'
  ) THEN
    ALTER TABLE batch_diseases
      ADD CONSTRAINT batch_diseases_pig_id_fkey
      FOREIGN KEY (pig_id) REFERENCES batch_pigs(id) ON DELETE CASCADE;
  END IF;
END $$;


