-- Migration: Mise à jour de revenus pour supporter plusieurs animaux
-- Date: 2025-01-XX
-- Description: Ajouter animal_ids (array) et champs pour ventes marketplace

-- Ajouter les nouveaux champs
ALTER TABLE revenus
  ADD COLUMN IF NOT EXISTS animal_ids TEXT[], -- Array d'IDs au lieu d'un seul
  ADD COLUMN IF NOT EXISTS acheteur VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nombre_animaux INTEGER CHECK (nombre_animaux IS NULL OR nombre_animaux > 0),
  ADD COLUMN IF NOT EXISTS vente_id TEXT;

-- Migrer les données existantes : copier animal_id dans animal_ids si animal_id existe
UPDATE revenus 
SET animal_ids = ARRAY[animal_id]::TEXT[]
WHERE animal_id IS NOT NULL 
  AND (animal_ids IS NULL OR array_length(animal_ids, 1) IS NULL);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_revenus_vente_id ON revenus(vente_id);
CREATE INDEX IF NOT EXISTS idx_revenus_animal_ids ON revenus USING GIN(animal_ids); -- GIN index pour recherche dans array

-- Commentaires pour documentation
COMMENT ON COLUMN revenus.animal_ids IS 'Array des IDs des animaux vendus (remplace animal_id pour ventes multiples)';
COMMENT ON COLUMN revenus.acheteur IS 'Nom complet de l''acheteur';
COMMENT ON COLUMN revenus.nombre_animaux IS 'Nombre d''animaux vendus dans cette transaction';
COMMENT ON COLUMN revenus.vente_id IS 'Lien vers la table ventes si créé depuis marketplace (contrainte FK ajoutée dans migration 070)';

-- Note: Les contraintes de clé étrangère pour vente_id seront ajoutées dans la migration 070

