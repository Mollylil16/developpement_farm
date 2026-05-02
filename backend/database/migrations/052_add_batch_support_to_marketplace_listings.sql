-- Migration: Ajout du support des bandes (batches) dans marketplace_listings
-- Date: 2025-12-26
-- Description: Permet de créer des annonces marketplace pour des bandes entières ou N porcs d'une bande

-- Ajouter les colonnes pour le support des bandes
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'individual' CHECK (listing_type IN ('individual', 'batch')),
  ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES batches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS pig_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pig_count INTEGER DEFAULT 1 CHECK (pig_count >= 1),
  ADD COLUMN IF NOT EXISTS weight NUMERIC CHECK (weight >= 0); -- Poids moyen (pour listings batch) ou poids individuel

-- Rendre subject_id nullable car pour les listings de bande, on n'a pas de subject_id unique
-- Note: La contrainte de clé étrangère reste mais accepte NULL
-- Vérifier si la colonne est déjà nullable avant de modifier
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_listings' 
      AND column_name = 'subject_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE marketplace_listings
      ALTER COLUMN subject_id DROP NOT NULL;
  END IF;
END $$;

-- Ajouter une contrainte : si listing_type = 'batch', batch_id doit être renseigné
-- DROP la contrainte si elle existe déjà (pour éviter les conflits avec migration 63)
ALTER TABLE marketplace_listings
  DROP CONSTRAINT IF EXISTS check_batch_listing;

ALTER TABLE marketplace_listings
  ADD CONSTRAINT check_batch_listing 
    CHECK (
      (listing_type = 'individual' AND subject_id IS NOT NULL AND batch_id IS NULL) OR
      (listing_type = 'batch' AND batch_id IS NOT NULL)
    );

-- Index pour améliorer les performances des requêtes sur les bandes
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_batch_id ON marketplace_listings(batch_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_listing_type ON marketplace_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_batch_active 
  ON marketplace_listings(batch_id, listed_at DESC) 
  WHERE listing_type = 'batch' AND status != 'removed';

-- Commentaires pour documentation
COMMENT ON COLUMN marketplace_listings.listing_type IS 'Type de listing: individual (animal unique) ou batch (bande)';
COMMENT ON COLUMN marketplace_listings.batch_id IS 'ID de la bande (si listing_type = batch)';
COMMENT ON COLUMN marketplace_listings.pig_ids IS 'Liste des IDs de porcs concernés (JSON array)';
COMMENT ON COLUMN marketplace_listings.pig_count IS 'Nombre de porcs dans l''annonce';
COMMENT ON COLUMN marketplace_listings.weight IS 'Poids moyen (pour listings batch) ou poids individuel (pour listings individual)';

