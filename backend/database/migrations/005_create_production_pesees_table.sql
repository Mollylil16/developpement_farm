-- Migration: Création de la table production_pesees
-- Date: 2025-01-09
-- Description: Table pour stocker les pesées des animaux

CREATE TABLE IF NOT EXISTS production_pesees (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  animal_id TEXT NOT NULL REFERENCES production_animaux(id) ON DELETE CASCADE,
  date TIMESTAMP NOT NULL,
  poids_kg NUMERIC NOT NULL CHECK (poids_kg > 0),
  gmq NUMERIC,
  difference_standard NUMERIC,
  commentaire TEXT,
  cree_par TEXT,
  date_creation TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_production_pesees_projet_id ON production_pesees(projet_id);
CREATE INDEX IF NOT EXISTS idx_production_pesees_animal_id ON production_pesees(animal_id);
CREATE INDEX IF NOT EXISTS idx_production_pesees_date ON production_pesees(date);

-- Commentaires pour documentation
COMMENT ON TABLE production_pesees IS 'Table pour stocker les pesées des animaux';
COMMENT ON COLUMN production_pesees.gmq IS 'Gain Moyen Quotidien (en kg/jour)';
COMMENT ON COLUMN production_pesees.difference_standard IS 'Différence avec le poids standard attendu';

