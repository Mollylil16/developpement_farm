-- Migration: Création de la table production_animaux
-- Date: 2025-01-09
-- Description: Table pour stocker les animaux de production

CREATE TABLE IF NOT EXISTS production_animaux (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  nom TEXT,
  origine TEXT,
  sexe TEXT NOT NULL CHECK (sexe IN ('male', 'femelle', 'indetermine')) DEFAULT 'indetermine',
  date_naissance TIMESTAMP,
  poids_initial NUMERIC CHECK (poids_initial IS NULL OR poids_initial > 0),
  date_entree TIMESTAMP,
  actif BOOLEAN DEFAULT TRUE,
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'mort', 'vendu', 'offert', 'autre')),
  race TEXT,
  reproducteur BOOLEAN DEFAULT FALSE,
  categorie_poids TEXT CHECK (categorie_poids IN ('porcelet', 'croissance', 'finition')),
  pere_id TEXT REFERENCES production_animaux(id) ON DELETE SET NULL,
  mere_id TEXT REFERENCES production_animaux(id) ON DELETE SET NULL,
  notes TEXT,
  photo_uri TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_production_animaux_projet_id ON production_animaux(projet_id);
CREATE INDEX IF NOT EXISTS idx_production_animaux_code ON production_animaux(code);
CREATE INDEX IF NOT EXISTS idx_production_animaux_statut ON production_animaux(statut);
CREATE INDEX IF NOT EXISTS idx_production_animaux_actif ON production_animaux(actif);
CREATE INDEX IF NOT EXISTS idx_production_animaux_pere_id ON production_animaux(pere_id);
CREATE INDEX IF NOT EXISTS idx_production_animaux_mere_id ON production_animaux(mere_id);

-- Commentaires pour documentation
COMMENT ON TABLE production_animaux IS 'Table pour stocker les animaux de production (porcs)';
COMMENT ON COLUMN production_animaux.actif IS 'Indique si l''animal est dans le cheptel actif';
COMMENT ON COLUMN production_animaux.statut IS 'Détail du statut : actif (sur ferme), mort, vendu, offert, autre';

