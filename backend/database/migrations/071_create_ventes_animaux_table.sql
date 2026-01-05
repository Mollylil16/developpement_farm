-- Migration: Création de la table ventes_animaux
-- Date: 2025-01-XX
-- Description: Table de liaison entre ventes et animaux vendus

CREATE TABLE IF NOT EXISTS ventes_animaux (
  vente_id TEXT NOT NULL REFERENCES ventes(id) ON DELETE CASCADE,
  animal_id TEXT NOT NULL, -- Peut être production_animaux.id ou batch_pigs.id
  animal_type VARCHAR(20) NOT NULL CHECK (animal_type IN ('production_animaux', 'batch_pigs')),
  poids_vente INTEGER NOT NULL CHECK (poids_vente > 0), -- Poids au moment de la vente (entier)
  prix_unitaire NUMERIC NOT NULL CHECK (prix_unitaire >= 0),
  PRIMARY KEY (vente_id, animal_id, animal_type)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ventes_animaux_animal_id ON ventes_animaux(animal_id);
CREATE INDEX IF NOT EXISTS idx_ventes_animaux_animal_type ON ventes_animaux(animal_type);
CREATE INDEX IF NOT EXISTS idx_ventes_animaux_vente_id ON ventes_animaux(vente_id);

-- Commentaires pour documentation
COMMENT ON TABLE ventes_animaux IS 'Table de liaison entre ventes et animaux vendus';
COMMENT ON COLUMN ventes_animaux.animal_id IS 'ID de l''animal (production_animaux.id ou batch_pigs.id selon animal_type)';
COMMENT ON COLUMN ventes_animaux.animal_type IS 'Type d''animal : production_animaux ou batch_pigs';
COMMENT ON COLUMN ventes_animaux.poids_vente IS 'Poids de l''animal au moment de la vente en kg (nombre entier)';
COMMENT ON COLUMN ventes_animaux.prix_unitaire IS 'Prix unitaire de l''animal (calculé : prix_total / nombre_sujets)';

-- Note: On n'ajoute pas de contrainte FK pour animal_id car il peut pointer vers deux tables différentes
-- (production_animaux ou batch_pigs). La validation se fait au niveau applicatif via animal_type.

