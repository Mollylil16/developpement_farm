-- Migration: Création de la table planifications
-- Date: 2025-01-09
-- Description: Table pour stocker les planifications

CREATE TABLE IF NOT EXISTS planifications (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('saillie', 'vaccination', 'sevrage', 'nettoyage', 'alimentation', 'veterinaire', 'autre')),
  titre TEXT NOT NULL,
  description TEXT,
  date_prevue TIMESTAMP NOT NULL,
  date_echeance TIMESTAMP,
  rappel TEXT,
  statut TEXT NOT NULL CHECK (statut IN ('a_faire', 'en_cours', 'terminee', 'annulee')),
  recurrence TEXT CHECK (recurrence IN ('aucune', 'quotidienne', 'hebdomadaire', 'mensuelle')),
  lien_gestation_id TEXT REFERENCES gestations(id) ON DELETE SET NULL,
  lien_sevrage_id TEXT REFERENCES sevrages(id) ON DELETE SET NULL,
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_planifications_projet_id ON planifications(projet_id);
CREATE INDEX IF NOT EXISTS idx_planifications_type ON planifications(type);
CREATE INDEX IF NOT EXISTS idx_planifications_statut ON planifications(statut);
CREATE INDEX IF NOT EXISTS idx_planifications_date_prevue ON planifications(date_prevue);

-- Commentaires pour documentation
COMMENT ON TABLE planifications IS 'Table pour stocker les planifications';

