-- Migration 058: Ajout du support batch aux tables santé
-- Permet de gérer les vaccinations, maladies et traitements pour les deux modes : individuel et batch

-- ========================================
-- 1. AJOUT batch_id aux tables existantes
-- ========================================

-- Ajouter batch_id à vaccinations (si elle n'existe pas déjà)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vaccinations' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE vaccinations ADD COLUMN batch_id VARCHAR(255);
    ALTER TABLE vaccinations ADD CONSTRAINT fk_vaccinations_batch 
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_vaccinations_batch_id ON vaccinations(batch_id);
  END IF;
END $$;

-- Ajouter batch_id à maladies (si elle n'existe pas déjà)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maladies' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE maladies ADD COLUMN batch_id VARCHAR(255);
    ALTER TABLE maladies ADD CONSTRAINT fk_maladies_batch 
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_maladies_batch_id ON maladies(batch_id);
  END IF;
END $$;

-- Ajouter batch_id à traitements (si elle n'existe pas déjà)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'traitements' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE traitements ADD COLUMN batch_id VARCHAR(255);
    ALTER TABLE traitements ADD CONSTRAINT fk_traitements_batch 
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_traitements_batch_id ON traitements(batch_id);
  END IF;
END $$;

-- ========================================
-- 2. CRÉATION batch_treatments
-- ========================================
CREATE TABLE IF NOT EXISTS batch_treatments (
  id VARCHAR(255) PRIMARY KEY,
  batch_id VARCHAR(255) NOT NULL,
  
  -- Relation avec maladie si applicable
  batch_disease_id VARCHAR(255),
  
  -- Informations traitement
  treatment_type VARCHAR(50) NOT NULL CHECK (treatment_type IN (
    'antibiotique', 'antiparasitaire', 'anti_inflammatoire', 'vitamine', 'vaccin', 'autre'
  )),
  medication_name VARCHAR(255) NOT NULL,
  administration_route VARCHAR(50) NOT NULL CHECK (administration_route IN (
    'orale', 'injectable', 'topique', 'alimentaire'
  )),
  dosage VARCHAR(255) NOT NULL,
  frequency VARCHAR(255) NOT NULL,
  
  -- Dates
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  duration_days INTEGER CHECK (duration_days IS NULL OR duration_days > 0),
  withdrawal_period_days INTEGER CHECK (withdrawal_period_days IS NULL OR withdrawal_period_days >= 0),
  
  -- Porcs traités (JSON array de pig_ids)
  treated_pigs JSONB NOT NULL DEFAULT '[]',
  count INTEGER NOT NULL,
  
  -- Métadonnées
  veterinarian VARCHAR(255),
  cost NUMERIC CHECK (cost IS NULL OR cost >= 0),
  completed BOOLEAN DEFAULT FALSE,
  effective BOOLEAN,
  side_effects TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_disease_id) REFERENCES batch_diseases(id) ON DELETE SET NULL,
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_batch_treatments_batch ON batch_treatments(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_treatments_disease ON batch_treatments(batch_disease_id);
CREATE INDEX IF NOT EXISTS idx_batch_treatments_start_date ON batch_treatments(start_date);
CREATE INDEX IF NOT EXISTS idx_batch_treatments_completed ON batch_treatments(completed);

-- Commentaires pour documentation
COMMENT ON TABLE batch_treatments IS 'Traitements médicaux effectués par batch';
COMMENT ON COLUMN batch_treatments.treated_pigs IS 'JSON array des IDs des porcs traités';
COMMENT ON COLUMN batch_treatments.count IS 'Nombre de porcs traités';

