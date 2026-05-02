-- Migration: Création de la table sevrages
-- Date: 2025-01-09
-- Description: Table pour stocker les sevrages

CREATE TABLE IF NOT EXISTS sevrages (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  gestation_id TEXT NOT NULL REFERENCES gestations(id) ON DELETE CASCADE,
  date_sevrage TIMESTAMP NOT NULL,
  nombre_porcelets_sevres INTEGER NOT NULL,
  poids_moyen_sevrage NUMERIC,
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sevrages_projet_id ON sevrages(projet_id);
CREATE INDEX IF NOT EXISTS idx_sevrages_gestation_id ON sevrages(gestation_id);
CREATE INDEX IF NOT EXISTS idx_sevrages_date_sevrage ON sevrages(date_sevrage);

-- Commentaires pour documentation
COMMENT ON TABLE sevrages IS 'Table pour stocker les sevrages des porcelets';

