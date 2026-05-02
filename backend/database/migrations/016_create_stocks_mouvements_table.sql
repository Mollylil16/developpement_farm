-- Migration: Création de la table stocks_mouvements
-- Date: 2025-01-09
-- Description: Table pour stocker les mouvements de stocks

CREATE TABLE IF NOT EXISTS stocks_mouvements (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  aliment_id TEXT NOT NULL REFERENCES stocks_aliments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie', 'ajustement')),
  quantite NUMERIC NOT NULL CHECK (quantite > 0),
  unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
  date TIMESTAMP NOT NULL,
  origine TEXT,
  commentaire TEXT,
  cree_par TEXT,
  date_creation TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_projet_id ON stocks_mouvements(projet_id);
CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_aliment_id ON stocks_mouvements(aliment_id);
CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_date ON stocks_mouvements(date);
CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_type ON stocks_mouvements(type);

-- Commentaires pour documentation
COMMENT ON TABLE stocks_mouvements IS 'Table pour stocker les mouvements de stocks (entrées, sorties, ajustements)';

