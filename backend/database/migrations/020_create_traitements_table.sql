-- Migration: Création de la table traitements
-- Date: 2025-01-09
-- Description: Table pour stocker les traitements médicaux

CREATE TABLE IF NOT EXISTS traitements (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  maladie_id TEXT REFERENCES maladies(id) ON DELETE SET NULL,
  animal_id TEXT REFERENCES production_animaux(id) ON DELETE SET NULL,
  lot_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('antibiotique', 'antiparasitaire', 'anti_inflammatoire', 'vitamine', 'vaccin', 'autre')),
  nom_medicament TEXT NOT NULL,
  voie_administration TEXT NOT NULL CHECK (voie_administration IN ('orale', 'injectable', 'topique', 'alimentaire')),
  dosage TEXT NOT NULL,
  frequence TEXT NOT NULL,
  date_debut TIMESTAMP NOT NULL,
  date_fin TIMESTAMP,
  duree_jours INTEGER CHECK (duree_jours IS NULL OR duree_jours > 0),
  temps_attente_jours INTEGER CHECK (temps_attente_jours IS NULL OR temps_attente_jours >= 0),
  veterinaire TEXT,
  cout NUMERIC CHECK (cout IS NULL OR cout >= 0),
  termine BOOLEAN DEFAULT FALSE,
  efficace BOOLEAN,
  effets_secondaires TEXT,
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW(),
  CHECK (date_fin IS NULL OR date_fin >= date_debut)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_traitements_projet_id ON traitements(projet_id);
CREATE INDEX IF NOT EXISTS idx_traitements_maladie_id ON traitements(maladie_id);
CREATE INDEX IF NOT EXISTS idx_traitements_animal_id ON traitements(animal_id);
CREATE INDEX IF NOT EXISTS idx_traitements_date_debut ON traitements(date_debut);
CREATE INDEX IF NOT EXISTS idx_traitements_termine ON traitements(termine);

-- Commentaires pour documentation
COMMENT ON TABLE traitements IS 'Table pour stocker les traitements médicaux';

