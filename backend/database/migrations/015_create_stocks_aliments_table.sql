-- Migration: Création de la table stocks_aliments
-- Date: 2025-01-09
-- Description: Table pour stocker les stocks d'aliments

CREATE TABLE IF NOT EXISTS stocks_aliments (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  categorie TEXT,
  quantite_actuelle NUMERIC NOT NULL CHECK (quantite_actuelle >= 0),
  unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
  seuil_alerte NUMERIC CHECK (seuil_alerte IS NULL OR seuil_alerte >= 0),
  date_derniere_entree TIMESTAMP,
  date_derniere_sortie TIMESTAMP,
  alerte_active BOOLEAN DEFAULT FALSE,
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_stocks_aliments_projet_id ON stocks_aliments(projet_id);
CREATE INDEX IF NOT EXISTS idx_stocks_aliments_alerte_active ON stocks_aliments(alerte_active);

-- Commentaires pour documentation
COMMENT ON TABLE stocks_aliments IS 'Table pour stocker les stocks d''aliments';
COMMENT ON COLUMN stocks_aliments.alerte_active IS 'Indique si l''alerte de stock faible est active';

