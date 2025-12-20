-- Migration: Création de la table regional_pork_price
-- Date: 2025-01-09
-- Description: Table pour stocker le prix régional du porc poids vif avec historique

CREATE TABLE IF NOT EXISTS regional_pork_price (
  id TEXT PRIMARY KEY,
  price NUMERIC NOT NULL CHECK (price > 0),
  source TEXT NOT NULL CHECK (source IN ('api', 'manual', 'default')),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_regional_pork_price_updated ON regional_pork_price(updated_at DESC);

-- Commentaires pour documentation
COMMENT ON TABLE regional_pork_price IS 'Table pour stocker le prix régional du porc poids vif avec historique';

