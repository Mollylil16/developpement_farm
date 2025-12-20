-- Migration: Création de la table ingredients_ration
-- Date: 2025-01-09
-- Description: Table de liaison entre rations et ingredients

CREATE TABLE IF NOT EXISTS ingredients_ration (
  id TEXT PRIMARY KEY,
  ration_id TEXT NOT NULL REFERENCES rations(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantite NUMERIC NOT NULL CHECK (quantite > 0)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ingredients_ration_ration_id ON ingredients_ration(ration_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_ration_ingredient_id ON ingredients_ration(ingredient_id);

-- Commentaires pour documentation
COMMENT ON TABLE ingredients_ration IS 'Table de liaison entre rations et ingredients';

