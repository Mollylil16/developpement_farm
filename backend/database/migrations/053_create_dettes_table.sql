-- Migration: Création de la table dettes
-- Date: 2025-12-27
-- Description: Table pour gérer les dettes et prêts de l'exploitation

CREATE TABLE IF NOT EXISTS dettes (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL,
  type_dette TEXT NOT NULL CHECK (type_dette IN ('pret_bancaire', 'pret_personnel', 'fournisseur', 'autre')),
  montant_initial NUMERIC NOT NULL CHECK (montant_initial > 0),
  montant_restant NUMERIC NOT NULL CHECK (montant_restant >= 0),
  taux_interet NUMERIC DEFAULT 0 CHECK (taux_interet >= 0),
  date_debut DATE NOT NULL,
  date_echeance DATE,
  frequence_remboursement TEXT DEFAULT 'mensuel' CHECK (frequence_remboursement IN ('mensuel', 'trimestriel', 'annuel', 'ponctuel')),
  montant_remboursement NUMERIC,
  statut TEXT DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'rembourse', 'en_defaut', 'annule')),
  preteur TEXT,
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_dettes_projet_id ON dettes(projet_id);
CREATE INDEX IF NOT EXISTS idx_dettes_statut ON dettes(statut);
CREATE INDEX IF NOT EXISTS idx_dettes_date_echeance ON dettes(date_echeance);
CREATE INDEX IF NOT EXISTS idx_dettes_projet_statut ON dettes(projet_id, statut);

-- Commentaires pour documentation
COMMENT ON TABLE dettes IS 'Table pour gérer les dettes et prêts de l''exploitation';
COMMENT ON COLUMN dettes.montant_restant IS 'Montant restant à rembourser';
COMMENT ON COLUMN dettes.taux_interet IS 'Taux d''intérêt annuel en pourcentage';
COMMENT ON COLUMN dettes.date_echeance IS 'Date d''échéance du prêt ou de la dette';
COMMENT ON COLUMN dettes.frequence_remboursement IS 'Fréquence des remboursements';
COMMENT ON COLUMN dettes.statut IS 'Statut de la dette : en_cours, rembourse, en_defaut, annule';

