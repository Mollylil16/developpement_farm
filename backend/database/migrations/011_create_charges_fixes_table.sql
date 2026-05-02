-- Migration: Création de la table charges_fixes
-- Date: 2025-01-09
-- Description: Table pour stocker les charges fixes récurrentes

CREATE TABLE IF NOT EXISTS charges_fixes (
  id TEXT PRIMARY KEY,
  projet_id TEXT REFERENCES projets(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL CHECK (categorie IN ('salaires', 'alimentation', 'entretien', 'vaccins', 'eau_electricite', 'loyer', 'salaire', 'assurance', 'eau', 'electricite', 'autre')),
  libelle TEXT NOT NULL,
  montant NUMERIC NOT NULL CHECK (montant >= 0),
  type_opex_capex TEXT CHECK (type_opex_capex IN ('opex', 'capex')),
  date_debut TIMESTAMP NOT NULL,
  frequence TEXT NOT NULL CHECK (frequence IN ('mensuel', 'trimestriel', 'annuel')),
  jour_paiement INTEGER CHECK (jour_paiement IS NULL OR (jour_paiement >= 1 AND jour_paiement <= 31)),
  notes TEXT,
  statut TEXT NOT NULL CHECK (statut IN ('actif', 'suspendu', 'termine')),
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_charges_fixes_projet_id ON charges_fixes(projet_id);
CREATE INDEX IF NOT EXISTS idx_charges_fixes_statut ON charges_fixes(statut);
CREATE INDEX IF NOT EXISTS idx_charges_fixes_frequence ON charges_fixes(frequence);

-- Commentaires pour documentation
COMMENT ON TABLE charges_fixes IS 'Table pour stocker les charges fixes récurrentes';

