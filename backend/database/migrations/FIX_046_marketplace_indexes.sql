-- Fix pour la migration 046: Correction des indexes marketplace_listings
-- 
-- PROBLÈME IDENTIFIÉ:
-- L'index idx_marketplace_listings_status_listed utilisait (status, listed_at DESC)
-- mais la requête utilise WHERE status != 'removed', ce que les index B-tree
-- ne supportent pas efficacement.
--
-- SOLUTION:
-- Remplacer par un index partiel qui exclut 'removed' de l'index
-- Cela permet à PostgreSQL d'utiliser efficacement l'index pour le tri

-- Supprimer l'ancien index (s'il existe)
DROP INDEX IF EXISTS idx_marketplace_listings_status_listed;

-- Créer le nouvel index partiel pour la requête principale
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_active_listed 
ON marketplace_listings(listed_at DESC) 
WHERE status != 'removed';

-- Créer un index partiel supplémentaire pour les requêtes avec farm_id
-- Optimise les cas où projetId est fourni dans findAllListings
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_farm_active 
ON marketplace_listings(farm_id, listed_at DESC) 
WHERE status != 'removed';

-- Analyser la table pour mettre à jour les statistiques
ANALYZE marketplace_listings;

-- Commentaires
COMMENT ON INDEX idx_marketplace_listings_active_listed IS 'Index partiel pour optimiser les requêtes du marketplace (status != ''removed'') triées par date';
COMMENT ON INDEX idx_marketplace_listings_farm_active IS 'Index partiel pour optimiser les requêtes du marketplace par farm_id (status != ''removed'') triées par date';

