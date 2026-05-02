-- Migration: Création de la table gestations
-- Date: 2025-01-09
-- Description: Table pour stocker les gestations

CREATE TABLE IF NOT EXISTS gestations (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  truie_id TEXT NOT NULL REFERENCES production_animaux(id) ON DELETE CASCADE,
  truie_nom TEXT,
  verrat_id TEXT REFERENCES production_animaux(id) ON DELETE SET NULL,
  verrat_nom TEXT,
  date_sautage TIMESTAMP NOT NULL,
  date_mise_bas_prevue TIMESTAMP NOT NULL,
  date_mise_bas_reelle TIMESTAMP,
  nombre_porcelets_prevu INTEGER NOT NULL CHECK (nombre_porcelets_prevu >= 0),
  nombre_porcelets_reel INTEGER CHECK (nombre_porcelets_reel IS NULL OR nombre_porcelets_reel >= 0),
  statut TEXT NOT NULL CHECK (statut IN ('en_cours', 'terminee', 'annulee')),
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW(),
  CHECK (date_mise_bas_prevue >= date_sautage),
  CHECK (date_mise_bas_reelle IS NULL OR date_mise_bas_reelle >= date_sautage)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_gestations_projet_id ON gestations(projet_id);
CREATE INDEX IF NOT EXISTS idx_gestations_truie_id ON gestations(truie_id);
CREATE INDEX IF NOT EXISTS idx_gestations_verrat_id ON gestations(verrat_id);
CREATE INDEX IF NOT EXISTS idx_gestations_statut ON gestations(statut);
CREATE INDEX IF NOT EXISTS idx_gestations_date_mise_bas_prevue ON gestations(date_mise_bas_prevue);

-- Commentaires pour documentation
COMMENT ON TABLE gestations IS 'Table pour stocker les gestations des truies';

