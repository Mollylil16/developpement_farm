-- Migration: Création de la table visites_veterinaires
-- Date: 2025-01-09
-- Description: Table pour stocker l'historique des visites vétérinaires
CREATE TABLE IF NOT EXISTS visites_veterinaires (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  date_visite TIMESTAMP NOT NULL,
  veterinaire TEXT,
  motif TEXT NOT NULL,
  animaux_examines TEXT,
  -- JSON array
  diagnostic TEXT,
  prescriptions TEXT,
  recommandations TEXT,
  traitement TEXT,
  cout NUMERIC CHECK (
    cout IS NULL
    OR cout >= 0
  ),
  prochaine_visite TIMESTAMP,
  -- Note: frontend utilise prochaine_visite, pas prochaine_visite_prevue
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW(),
  CHECK (
    prochaine_visite IS NULL
    OR prochaine_visite >= date_visite
  )
);
-- Ajouter les colonnes manquantes si la table existe déjà
DO $$ BEGIN -- Ajouter prochaine_visite si elle n'existe pas (ou si elle s'appelle prochaine_visite_prevue)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'visites_veterinaires'
    AND column_name = 'prochaine_visite'
) THEN -- Vérifier si l'ancienne colonne existe
IF EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'visites_veterinaires'
    AND column_name = 'prochaine_visite_prevue'
) THEN -- Renommer l'ancienne colonne
ALTER TABLE visites_veterinaires
  RENAME COLUMN prochaine_visite_prevue TO prochaine_visite;
ELSE -- Ajouter la nouvelle colonne
ALTER TABLE visites_veterinaires
ADD COLUMN prochaine_visite TIMESTAMP;
END IF;
END IF;
-- Ajouter animaux_examines si elle n'existe pas
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'visites_veterinaires'
    AND column_name = 'animaux_examines'
) THEN
ALTER TABLE visites_veterinaires
ADD COLUMN animaux_examines TEXT;
END IF;
-- Ajouter derniere_modification si elle n'existe pas
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'visites_veterinaires'
    AND column_name = 'derniere_modification'
) THEN
ALTER TABLE visites_veterinaires
ADD COLUMN derniere_modification TIMESTAMP DEFAULT NOW();
END IF;
END $$;
-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_visites_veterinaires_projet_id ON visites_veterinaires(projet_id);
CREATE INDEX IF NOT EXISTS idx_visites_veterinaires_date_visite ON visites_veterinaires(date_visite);
CREATE INDEX IF NOT EXISTS idx_visites_veterinaires_prochaine_visite ON visites_veterinaires(prochaine_visite);
-- Commentaires pour documentation
COMMENT ON TABLE visites_veterinaires IS 'Table pour stocker l''historique des visites vétérinaires';
COMMENT ON COLUMN visites_veterinaires.animaux_examines IS 'JSON array des IDs des animaux examinés';