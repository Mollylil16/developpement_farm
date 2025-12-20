-- Migration: Création de la table calendrier_vaccinations
-- Date: 2025-01-09
-- Description: Table pour stocker les protocoles de vaccination

CREATE TABLE IF NOT EXISTS calendrier_vaccinations (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  vaccin TEXT NOT NULL CHECK (vaccin IN ('rouget', 'parvovirose', 'mal_rouge', 'circovirus', 'mycoplasme', 'grippe', 'autre')),
  nom_vaccin TEXT,
  categorie TEXT NOT NULL CHECK (categorie IN ('porcelet', 'truie', 'verrat', 'porc_croissance', 'tous')),
  age_jours INTEGER,
  date_planifiee TIMESTAMP,
  frequence_jours INTEGER,
  obligatoire BOOLEAN DEFAULT FALSE,
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_calendrier_vaccinations_projet_id ON calendrier_vaccinations(projet_id);
CREATE INDEX IF NOT EXISTS idx_calendrier_vaccinations_categorie ON calendrier_vaccinations(categorie);

-- Commentaires pour documentation
COMMENT ON TABLE calendrier_vaccinations IS 'Table pour stocker les protocoles de vaccination';

