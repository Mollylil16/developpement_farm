-- Migration: Création de la table rapports_croissance
-- Date: 2025-01-09
-- Description: Table pour stocker les rapports de croissance

CREATE TABLE IF NOT EXISTS rapports_croissance (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  date TIMESTAMP NOT NULL,
  poids_moyen NUMERIC NOT NULL,
  nombre_porcs INTEGER NOT NULL,
  gain_quotidien NUMERIC,
  poids_cible NUMERIC,
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_rapports_croissance_projet_id ON rapports_croissance(projet_id);
CREATE INDEX IF NOT EXISTS idx_rapports_croissance_date ON rapports_croissance(date);

-- Commentaires pour documentation
COMMENT ON TABLE rapports_croissance IS 'Table pour stocker les rapports de croissance';

