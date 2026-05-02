-- Migration: Création de la table revenus
-- Date: 2025-01-09
-- Description: Table pour stocker les revenus

CREATE TABLE IF NOT EXISTS revenus (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  montant NUMERIC NOT NULL CHECK (montant >= 0),
  categorie TEXT NOT NULL CHECK (categorie IN ('vente_porc', 'vente_autre', 'subvention', 'autre')),
  libelle_categorie TEXT,
  date TIMESTAMP NOT NULL,
  description TEXT,
  commentaire TEXT,
  photos TEXT, -- JSON array
  poids_kg NUMERIC CHECK (poids_kg IS NULL OR poids_kg > 0),
  animal_id TEXT REFERENCES production_animaux(id) ON DELETE SET NULL,
  cout_kg_opex NUMERIC CHECK (cout_kg_opex IS NULL OR cout_kg_opex >= 0),
  cout_kg_complet NUMERIC CHECK (cout_kg_complet IS NULL OR cout_kg_complet >= 0),
  cout_reel_opex NUMERIC CHECK (cout_reel_opex IS NULL OR cout_reel_opex >= 0),
  cout_reel_complet NUMERIC CHECK (cout_reel_complet IS NULL OR cout_reel_complet >= 0),
  marge_opex NUMERIC,
  marge_complete NUMERIC,
  marge_opex_pourcent NUMERIC CHECK (marge_opex_pourcent IS NULL OR (marge_opex_pourcent >= -100 AND marge_opex_pourcent <= 100)),
  marge_complete_pourcent NUMERIC CHECK (marge_complete_pourcent IS NULL OR (marge_complete_pourcent >= -100 AND marge_complete_pourcent <= 100)),
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_revenus_projet_id ON revenus(projet_id);
CREATE INDEX IF NOT EXISTS idx_revenus_date ON revenus(date);
CREATE INDEX IF NOT EXISTS idx_revenus_categorie ON revenus(categorie);
CREATE INDEX IF NOT EXISTS idx_revenus_animal_id ON revenus(animal_id);

-- Commentaires pour documentation
COMMENT ON TABLE revenus IS 'Table pour stocker les revenus';
COMMENT ON COLUMN revenus.photos IS 'JSON array des URIs des photos';

