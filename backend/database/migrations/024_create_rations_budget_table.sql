-- Migration: Création de la table rations_budget
-- Date: 2025-01-09
-- Description: Table pour stocker la budgétisation d'aliment

CREATE TABLE IF NOT EXISTS rations_budget (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type_porc TEXT NOT NULL CHECK (type_porc IN ('porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance')),
  poids_moyen_kg NUMERIC NOT NULL,
  nombre_porcs INTEGER NOT NULL,
  duree_jours INTEGER NOT NULL,
  ration_journaliere_par_porc NUMERIC NOT NULL,
  quantite_totale_kg NUMERIC NOT NULL,
  cout_total NUMERIC NOT NULL,
  cout_par_kg NUMERIC NOT NULL,
  cout_par_porc NUMERIC NOT NULL,
  ingredients TEXT NOT NULL, -- JSON
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_rations_budget_projet_id ON rations_budget(projet_id);
CREATE INDEX IF NOT EXISTS idx_rations_budget_type_porc ON rations_budget(type_porc);

-- Commentaires pour documentation
COMMENT ON TABLE rations_budget IS 'Table pour stocker la budgétisation d''aliment';
COMMENT ON COLUMN rations_budget.ingredients IS 'JSON des ingrédients et quantités';

