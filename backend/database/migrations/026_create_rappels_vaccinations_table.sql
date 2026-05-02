-- Migration: Création de la table rappels_vaccinations
-- Date: 2025-01-09
-- Description: Table pour stocker les rappels automatiques de vaccination

CREATE TABLE IF NOT EXISTS rappels_vaccinations (
  id TEXT PRIMARY KEY,
  vaccination_id TEXT NOT NULL REFERENCES vaccinations(id) ON DELETE CASCADE,
  date_rappel TIMESTAMP NOT NULL,
  envoi BOOLEAN DEFAULT FALSE,
  date_envoi TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_rappels_vaccinations_vaccination_id ON rappels_vaccinations(vaccination_id);
CREATE INDEX IF NOT EXISTS idx_rappels_vaccinations_date_rappel ON rappels_vaccinations(date_rappel);

-- Commentaires pour documentation
COMMENT ON TABLE rappels_vaccinations IS 'Table pour stocker les rappels automatiques de vaccination';

