-- Migration: Création de la table projets
-- Date: 2025-01-09
-- Description: Table pour stocker les projets (fermes)
CREATE TABLE IF NOT EXISTS projets (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  localisation TEXT NOT NULL,
  nombre_truies INTEGER NOT NULL,
  nombre_verrats INTEGER NOT NULL,
  nombre_porcelets INTEGER NOT NULL,
  nombre_croissance INTEGER NOT NULL DEFAULT 0,
  poids_moyen_actuel NUMERIC NOT NULL,
  age_moyen_actuel INTEGER NOT NULL,
  prix_kg_vif NUMERIC,
  prix_kg_carcasse NUMERIC,
  notes TEXT,
  statut TEXT NOT NULL CHECK (statut IN ('actif', 'archive', 'suspendu')),
  proprietaire_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duree_amortissement_par_defaut_mois INTEGER DEFAULT 36,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);
-- Ajouter les colonnes manquantes si la table existe déjà
DO $$ BEGIN -- Ajouter duree_amortissement_par_defaut_mois si elle n'existe pas
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'projets'
    AND column_name = 'duree_amortissement_par_defaut_mois'
) THEN
ALTER TABLE projets
ADD COLUMN duree_amortissement_par_defaut_mois INTEGER DEFAULT 36;
END IF;
-- Ajouter nombre_croissance si elle n'existe pas
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'projets'
    AND column_name = 'nombre_croissance'
) THEN
ALTER TABLE projets
ADD COLUMN nombre_croissance INTEGER NOT NULL DEFAULT 0;
END IF;
-- Ajouter derniere_modification si elle n'existe pas
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'projets'
    AND column_name = 'derniere_modification'
) THEN
ALTER TABLE projets
ADD COLUMN derniere_modification TIMESTAMP DEFAULT NOW();
END IF;
END $$;
-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_projets_proprietaire_id ON projets(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_projets_statut ON projets(statut);
-- Commentaires pour documentation
COMMENT ON TABLE projets IS 'Table pour stocker les projets (fermes) de l''application';
COMMENT ON COLUMN projets.duree_amortissement_par_defaut_mois IS 'Durée d''amortissement par défaut pour les dépenses CAPEX (en mois)';