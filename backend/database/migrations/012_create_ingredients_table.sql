-- Migration: Création de la table ingredients
-- Date: 2025-01-09
-- Description: Table pour stocker les ingrédients pour les rations

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
  prix_unitaire NUMERIC NOT NULL CHECK (prix_unitaire >= 0),
  proteine_pourcent NUMERIC CHECK (proteine_pourcent IS NULL OR (proteine_pourcent >= 0 AND proteine_pourcent <= 100)),
  energie_kcal NUMERIC CHECK (energie_kcal IS NULL OR energie_kcal >= 0),
  date_creation TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ingredients_nom ON ingredients(nom);

-- Commentaires pour documentation
COMMENT ON TABLE ingredients IS 'Table pour stocker les ingrédients pour les rations';

