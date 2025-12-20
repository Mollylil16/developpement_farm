-- Migration: Création de la table rations
-- Date: 2025-01-09
-- Description: Table pour stocker les rations alimentaires

CREATE TABLE IF NOT EXISTS rations (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  type_porc TEXT NOT NULL CHECK (type_porc IN ('porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance')),
  poids_kg NUMERIC NOT NULL,
  nombre_porcs INTEGER,
  cout_total NUMERIC,
  cout_par_kg NUMERIC,
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_rations_projet_id ON rations(projet_id);
CREATE INDEX IF NOT EXISTS idx_rations_type_porc ON rations(type_porc);

-- Commentaires pour documentation
COMMENT ON TABLE rations IS 'Table pour stocker les rations alimentaires';

