-- ========================================
-- Ajouter le support des photos aux listings marketplace
-- ========================================

-- Ajouter une colonne pour stocker les URLs des photos
ALTER TABLE marketplace_listings
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- Index GIN pour recherche rapide dans le tableau JSONB
CREATE INDEX IF NOT EXISTS idx_listings_photos ON marketplace_listings USING gin(photos);

-- Commentaire pour documenter
COMMENT ON COLUMN marketplace_listings.photos IS 
  'Array of photo objects: [{"url": "...", "thumbnailUrl": "...", "order": 1, "caption": "...", "uploadedAt": "..."}, ...]';
