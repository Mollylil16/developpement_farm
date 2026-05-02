-- Migration: Création de la table depenses_ponctuelles
-- Date: 2025-01-09
-- Description: Table pour stocker les dépenses ponctuelles
CREATE TABLE IF NOT EXISTS depenses_ponctuelles (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  montant NUMERIC NOT NULL CHECK (montant >= 0),
  categorie TEXT NOT NULL CHECK (
    categorie IN (
      'vaccins',
      'medicaments',
      'alimentation',
      'veterinaire',
      'entretien',
      'equipements',
      'amenagement_batiment',
      'equipement_lourd',
      'achat_sujet',
      'autre'
    )
  ),
  libelle_categorie TEXT,
  type_opex_capex TEXT CHECK (type_opex_capex IN ('opex', 'capex')),
  duree_amortissement_mois INTEGER CHECK (
    duree_amortissement_mois IS NULL
    OR duree_amortissement_mois > 0
  ),
  date TIMESTAMP NOT NULL,
  commentaire TEXT,
  photos TEXT,
  -- JSON array
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);
-- Ajouter les colonnes manquantes si la table existe déjà
DO $$ BEGIN -- Ajouter type_opex_capex si elle n'existe pas
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'depenses_ponctuelles'
    AND column_name = 'type_opex_capex'
) THEN
ALTER TABLE depenses_ponctuelles
ADD COLUMN type_opex_capex TEXT CHECK (type_opex_capex IN ('opex', 'capex'));
END IF;
-- Ajouter duree_amortissement_mois si elle n'existe pas
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'depenses_ponctuelles'
    AND column_name = 'duree_amortissement_mois'
) THEN
ALTER TABLE depenses_ponctuelles
ADD COLUMN duree_amortissement_mois INTEGER CHECK (
    duree_amortissement_mois IS NULL
    OR duree_amortissement_mois > 0
  );
END IF;
-- Ajouter photos si elle n'existe pas
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'depenses_ponctuelles'
    AND column_name = 'photos'
) THEN
ALTER TABLE depenses_ponctuelles
ADD COLUMN photos TEXT;
END IF;
-- Ajouter derniere_modification si elle n'existe pas
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'depenses_ponctuelles'
    AND column_name = 'derniere_modification'
) THEN
ALTER TABLE depenses_ponctuelles
ADD COLUMN derniere_modification TIMESTAMP DEFAULT NOW();
END IF;
END $$;
-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_depenses_ponctuelles_projet_id ON depenses_ponctuelles(projet_id);
CREATE INDEX IF NOT EXISTS idx_depenses_ponctuelles_date ON depenses_ponctuelles(date);
CREATE INDEX IF NOT EXISTS idx_depenses_ponctuelles_categorie ON depenses_ponctuelles(categorie);
CREATE INDEX IF NOT EXISTS idx_depenses_ponctuelles_type_opex_capex ON depenses_ponctuelles(type_opex_capex);
-- Commentaires pour documentation
COMMENT ON TABLE depenses_ponctuelles IS 'Table pour stocker les dépenses ponctuelles';
COMMENT ON COLUMN depenses_ponctuelles.photos IS 'JSON array des URIs des photos';