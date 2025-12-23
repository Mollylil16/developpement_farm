-- Migration 043: Création de la table batches pour le suivi par bande
-- Permet de gérer des groupes d'animaux par loge/enclos

CREATE TABLE IF NOT EXISTS batches (
  id VARCHAR(255) PRIMARY KEY,
  projet_id VARCHAR(255) NOT NULL,
  pen_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'truie_reproductrice',
    'verrat_reproducteur',
    'porcelets',
    'porcs_croissance',
    'porcs_engraissement'
  )),
  
  -- Effectifs
  total_count INTEGER NOT NULL,
  male_count INTEGER DEFAULT 0,
  female_count INTEGER DEFAULT 0,
  castrated_count INTEGER DEFAULT 0,
  
  -- Caractéristiques moyennes
  average_age_months REAL NOT NULL,
  average_weight_kg REAL NOT NULL,
  
  -- Dates
  batch_creation_date TIMESTAMP NOT NULL,
  expected_sale_date TIMESTAMP,
  
  -- Métadonnées
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Contrainte de clé étrangère
  FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_batches_projet ON batches(projet_id);
CREATE INDEX IF NOT EXISTS idx_batches_category ON batches(category);
CREATE INDEX IF NOT EXISTS idx_batches_pen ON batches(pen_name);

-- Commentaires pour documentation
COMMENT ON TABLE batches IS 'Table des bandes d''animaux pour le mode de suivi par bande';
COMMENT ON COLUMN batches.category IS 'Catégorie de la bande : truie_reproductrice, verrat_reproducteur, porcelets, porcs_croissance, porcs_engraissement';
COMMENT ON COLUMN batches.total_count IS 'Nombre total d''animaux dans la bande';
COMMENT ON COLUMN batches.average_age_months IS 'Âge moyen des animaux en mois';
COMMENT ON COLUMN batches.average_weight_kg IS 'Poids moyen des animaux en kg';

