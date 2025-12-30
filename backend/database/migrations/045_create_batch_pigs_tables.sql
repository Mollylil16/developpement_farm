-- Migration 045: Création des tables batch_pigs et batch_pig_movements
-- Permet de suivre les porcs individuels dans les bandes et leur historique

-- Table pour suivre les porcs individuels dans les bandes
CREATE TABLE IF NOT EXISTS batch_pigs (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  
  -- Informations du porc
  name TEXT, -- Nom/numéro optionnel
  sex TEXT CHECK (sex IN ('male', 'female', 'castrated')),
  birth_date DATE,
  age_months REAL,
  current_weight_kg REAL NOT NULL,
  
  -- Provenance
  origin TEXT CHECK (origin IN ('birth', 'purchase', 'transfer', 'other')),
  origin_details TEXT,
  supplier_name TEXT,
  purchase_price REAL,
  
  -- Santé
  health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'sick', 'treatment', 'quarantine')),
  last_vaccination_date DATE,
  notes TEXT,
  
  -- Photos
  photo_url TEXT,
  
  -- Dates
  entry_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

-- Colonnes complémentaires utilisées par les opérations batch (créées ici pour éviter la dépendance d'ordre avec 044)
ALTER TABLE batch_pigs
ADD COLUMN IF NOT EXISTS gestation_status VARCHAR(50) DEFAULT 'not_pregnant' CHECK (gestation_status IN (
  'not_pregnant', 'pregnant', 'delivered', 'aborted'
));

ALTER TABLE batch_pigs
ADD COLUMN IF NOT EXISTS last_weighing_date TIMESTAMP;

ALTER TABLE batch_pigs
ADD COLUMN IF NOT EXISTS last_vaccination_type VARCHAR(50);

-- Index additionnels (si non déjà créés)
CREATE INDEX IF NOT EXISTS idx_batch_pigs_gestation_status ON batch_pigs(gestation_status);
CREATE INDEX IF NOT EXISTS idx_batch_pigs_last_weighing ON batch_pigs(last_weighing_date);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_batch_pigs_batch ON batch_pigs(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_pigs_sex ON batch_pigs(sex);
CREATE INDEX IF NOT EXISTS idx_batch_pigs_health ON batch_pigs(health_status);

-- Table pour l'historique des mouvements
CREATE TABLE IF NOT EXISTS batch_pig_movements (
  id TEXT PRIMARY KEY,
  pig_id TEXT NOT NULL,
  
  -- Mouvement
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entry', 'transfer', 'removal')),
  
  -- Pour transfert
  from_batch_id TEXT,
  to_batch_id TEXT,
  
  -- Pour retrait
  removal_reason TEXT CHECK (removal_reason IN ('sale', 'death', 'donation', 'personal_consumption', 'transfer_out', 'other')),
  removal_details TEXT,
  
  -- Informations financières (pour vente)
  sale_price REAL,
  sale_weight_kg REAL,
  buyer_name TEXT,
  
  -- Informations mortalité
  death_cause TEXT,
  veterinary_report TEXT,
  
  -- Métadonnées
  movement_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (pig_id) REFERENCES batch_pigs(id) ON DELETE CASCADE,
  FOREIGN KEY (from_batch_id) REFERENCES batches(id) ON DELETE SET NULL,
  FOREIGN KEY (to_batch_id) REFERENCES batches(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_movements_pig ON batch_pig_movements(pig_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON batch_pig_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_date ON batch_pig_movements(movement_date);

-- Ajouter les FK vers batch_pigs sur les tables batch_* (créées en 044) une fois batch_pigs disponible
DO $$
BEGIN
  -- batch_gestations.pig_id -> batch_pigs.id
  IF to_regclass('public.batch_gestations') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_batch_gestations_pig_id'
    ) THEN
      ALTER TABLE batch_gestations
      ADD CONSTRAINT fk_batch_gestations_pig_id FOREIGN KEY (pig_id) REFERENCES batch_pigs(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- batch_diseases.pig_id -> batch_pigs.id
  IF to_regclass('public.batch_diseases') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_batch_diseases_pig_id'
    ) THEN
      ALTER TABLE batch_diseases
      ADD CONSTRAINT fk_batch_diseases_pig_id FOREIGN KEY (pig_id) REFERENCES batch_pigs(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Trigger pour mettre à jour les effectifs de la bande
CREATE OR REPLACE FUNCTION update_batch_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Incrémenter le total et le compteur de sexe
    UPDATE batches 
    SET 
      total_count = total_count + 1,
      male_count = CASE WHEN NEW.sex = 'male' THEN male_count + 1 ELSE male_count END,
      female_count = CASE WHEN NEW.sex = 'female' THEN female_count + 1 ELSE female_count END,
      castrated_count = CASE WHEN NEW.sex = 'castrated' THEN castrated_count + 1 ELSE castrated_count END,
      updated_at = NOW()
    WHERE id = NEW.batch_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Décrémenter le total et le compteur de sexe
    UPDATE batches 
    SET 
      total_count = GREATEST(total_count - 1, 0),
      male_count = CASE WHEN OLD.sex = 'male' THEN GREATEST(male_count - 1, 0) ELSE male_count END,
      female_count = CASE WHEN OLD.sex = 'female' THEN GREATEST(female_count - 1, 0) ELSE female_count END,
      castrated_count = CASE WHEN OLD.sex = 'castrated' THEN GREATEST(castrated_count - 1, 0) ELSE castrated_count END,
      updated_at = NOW()
    WHERE id = OLD.batch_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
    -- Transfert vers une autre bande
    -- Décrémenter ancienne bande
    UPDATE batches 
    SET 
      total_count = GREATEST(total_count - 1, 0),
      male_count = CASE WHEN OLD.sex = 'male' THEN GREATEST(male_count - 1, 0) ELSE male_count END,
      female_count = CASE WHEN OLD.sex = 'female' THEN GREATEST(female_count - 1, 0) ELSE female_count END,
      castrated_count = CASE WHEN OLD.sex = 'castrated' THEN GREATEST(castrated_count - 1, 0) ELSE castrated_count END,
      updated_at = NOW()
    WHERE id = OLD.batch_id;
    
    -- Incrémenter nouvelle bande
    UPDATE batches 
    SET 
      total_count = total_count + 1,
      male_count = CASE WHEN NEW.sex = 'male' THEN male_count + 1 ELSE male_count END,
      female_count = CASE WHEN NEW.sex = 'female' THEN female_count + 1 ELSE female_count END,
      castrated_count = CASE WHEN NEW.sex = 'castrated' THEN castrated_count + 1 ELSE castrated_count END,
      updated_at = NOW()
    WHERE id = NEW.batch_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_counts
AFTER INSERT OR DELETE OR UPDATE OF batch_id ON batch_pigs
FOR EACH ROW
EXECUTE FUNCTION update_batch_counts();

-- Trigger pour recalculer poids moyen de la bande
CREATE OR REPLACE FUNCTION update_batch_average_weight()
RETURNS TRIGGER AS $$
DECLARE
  batch_id_val TEXT;
BEGIN
  -- Déterminer la bande concernée
  batch_id_val := COALESCE(NEW.batch_id, OLD.batch_id);
  
  -- Recalculer le poids moyen
  UPDATE batches 
  SET 
    average_weight_kg = (
      SELECT COALESCE(AVG(current_weight_kg), 0)
      FROM batch_pigs
      WHERE batch_id = batch_id_val
    ),
    updated_at = NOW()
  WHERE id = batch_id_val;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_weight
AFTER INSERT OR UPDATE OF current_weight_kg OR DELETE ON batch_pigs
FOR EACH ROW
EXECUTE FUNCTION update_batch_average_weight();

-- Commentaires pour documentation
COMMENT ON TABLE batch_pigs IS 'Table des porcs individuels dans les bandes';
COMMENT ON TABLE batch_pig_movements IS 'Historique des mouvements des porcs (entrée, transfert, retrait)';
COMMENT ON COLUMN batch_pigs.origin IS 'Origine : birth (naissance), purchase (achat), transfer (transfert), other';
COMMENT ON COLUMN batch_pigs.health_status IS 'État de santé : healthy, sick, treatment, quarantine';
COMMENT ON COLUMN batch_pig_movements.movement_type IS 'Type de mouvement : entry (entrée), transfer (transfert), removal (retrait)';
COMMENT ON COLUMN batch_pig_movements.removal_reason IS 'Raison du retrait : sale, death, donation, personal_consumption, transfer_out, other';

