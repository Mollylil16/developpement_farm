-- ========================================
-- Index pour optimiser les requêtes marketplace
-- ========================================

-- Index sur subject_id pour les listings individuels
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_subject_id 
ON marketplace_listings(subject_id) 
WHERE subject_id IS NOT NULL;

-- Index GIN sur pig_ids pour les listings batch (recherche dans le tableau JSONB)
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_pig_ids_gin 
ON marketplace_listings USING GIN(pig_ids) 
WHERE pig_ids IS NOT NULL AND jsonb_array_length(pig_ids) > 0;

-- Index composite pour les requêtes fréquentes : status + listing_type
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status_type 
ON marketplace_listings(status, listing_type) 
WHERE status IN ('available', 'reserved', 'pending_delivery');

-- Index pour les recherches par listing_id dans getListingsWithSubjects
-- (déjà optimisé avec PRIMARY KEY, mais ajout explicite pour clarté)
-- CREATE INDEX IF NOT EXISTS idx_marketplace_listings_id 
-- ON marketplace_listings(id); -- Non nécessaire car PRIMARY KEY existe

-- Index pour optimiser les requêtes de vérification dans getMarketplaceAnimalInfo
-- Vérifie si un animal est listé (subject_id OU dans pig_ids)
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_animal_check 
ON marketplace_listings(status) 
INCLUDE (subject_id, pig_ids)
WHERE status = 'available';

-- Commentaires sur les index
COMMENT ON INDEX idx_marketplace_listings_subject_id IS 
  'Index pour optimiser les recherches de listings individuels par subject_id';

COMMENT ON INDEX idx_marketplace_listings_pig_ids_gin IS 
  'Index GIN pour optimiser les recherches dans pig_ids (JSONB array) pour les listings batch';

COMMENT ON INDEX idx_marketplace_listings_status_type IS 
  'Index composite pour optimiser les filtres par status et listing_type';

COMMENT ON INDEX idx_marketplace_listings_animal_check IS 
  'Index pour optimiser la vérification si un animal est listé (getMarketplaceAnimalInfo)';
