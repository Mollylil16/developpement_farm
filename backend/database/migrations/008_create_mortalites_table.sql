-- Migration: Création de la table mortalites
-- Date: 2025-01-09
-- Description: Table pour stocker les mortalités

CREATE TABLE IF NOT EXISTS mortalites (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  nombre_porcs INTEGER NOT NULL CHECK (nombre_porcs > 0),
  date TIMESTAMP NOT NULL,
  cause TEXT,
  categorie TEXT NOT NULL CHECK (categorie IN ('porcelet', 'truie', 'verrat', 'autre')),
  animal_code TEXT,
  poids_kg NUMERIC CHECK (poids_kg IS NULL OR poids_kg > 0),
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_mortalites_projet_id ON mortalites(projet_id);
CREATE INDEX IF NOT EXISTS idx_mortalites_date ON mortalites(date);
CREATE INDEX IF NOT EXISTS idx_mortalites_categorie ON mortalites(categorie);

-- Commentaires pour documentation
COMMENT ON TABLE mortalites IS 'Table pour stocker les mortalités';

