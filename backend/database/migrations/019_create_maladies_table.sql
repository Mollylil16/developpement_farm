-- Migration: Création de la table maladies
-- Date: 2025-01-09
-- Description: Table pour stocker le journal des maladies

CREATE TABLE IF NOT EXISTS maladies (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  animal_id TEXT REFERENCES production_animaux(id) ON DELETE SET NULL,
  lot_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('diarrhee', 'respiratoire', 'gale_parasites', 'fievre', 'boiterie', 'digestive', 'cutanee', 'reproduction', 'neurologique', 'autre')),
  nom_maladie TEXT NOT NULL,
  gravite TEXT NOT NULL CHECK (gravite IN ('faible', 'moderee', 'grave', 'critique')),
  date_debut TIMESTAMP NOT NULL,
  date_fin TIMESTAMP,
  symptomes TEXT NOT NULL,
  diagnostic TEXT,
  contagieux BOOLEAN DEFAULT FALSE,
  nombre_animaux_affectes INTEGER CHECK (nombre_animaux_affectes IS NULL OR nombre_animaux_affectes > 0),
  nombre_deces INTEGER CHECK (nombre_deces IS NULL OR nombre_deces >= 0),
  veterinaire TEXT,
  cout_traitement NUMERIC CHECK (cout_traitement IS NULL OR cout_traitement >= 0),
  gueri BOOLEAN DEFAULT FALSE,
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW(),
  CHECK (date_fin IS NULL OR date_fin >= date_debut)
);

-- Ajouter les colonnes manquantes si la table existe déjà
DO $$
BEGIN
  -- Convertir contagieux de INTEGER à BOOLEAN si nécessaire
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maladies' 
    AND column_name = 'contagieux' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE maladies ALTER COLUMN contagieux TYPE BOOLEAN USING (contagieux::boolean);
    ALTER TABLE maladies ALTER COLUMN contagieux SET DEFAULT FALSE;
  END IF;

  -- Convertir gueri de INTEGER à BOOLEAN si nécessaire
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maladies' 
    AND column_name = 'gueri' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE maladies ALTER COLUMN gueri TYPE BOOLEAN USING (gueri::boolean);
    ALTER TABLE maladies ALTER COLUMN gueri SET DEFAULT FALSE;
  END IF;

  -- Ajouter derniere_modification si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maladies' AND column_name = 'derniere_modification'
  ) THEN
    ALTER TABLE maladies ADD COLUMN derniere_modification TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_maladies_projet_id ON maladies(projet_id);
CREATE INDEX IF NOT EXISTS idx_maladies_animal_id ON maladies(animal_id);
CREATE INDEX IF NOT EXISTS idx_maladies_date_debut ON maladies(date_debut);
CREATE INDEX IF NOT EXISTS idx_maladies_gueri ON maladies(gueri);
CREATE INDEX IF NOT EXISTS idx_maladies_contagieux ON maladies(contagieux);

-- Commentaires pour documentation
COMMENT ON TABLE maladies IS 'Table pour stocker le journal des maladies';

