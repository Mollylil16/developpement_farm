-- Migration 073: Ajouter colonne photos à marketplace_listings
-- Date: 2026-01-11
-- Description: Ajoute la colonne photos (JSONB) pour stocker les photos des listings marketplace
--              Cette colonne permet aux producteurs d'ajouter des photos lors de la mise en vente

-- Ajouter la colonne photos si elle n'existe pas
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- Créer un index GIN pour les requêtes sur les photos (optionnel mais recommandé)
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_photos 
  ON marketplace_listings USING GIN (photos);

-- Commentaire pour documentation
COMMENT ON COLUMN marketplace_listings.photos IS 'Array JSON des photos du listing. Chaque photo contient: url, thumbnailUrl, order, caption, uploadedAt';

-- Mettre à jour la vue enrichie pour inclure explicitement la colonne photos
DROP VIEW IF EXISTS v_marketplace_listings_enriched;

CREATE OR REPLACE VIEW v_marketplace_listings_enriched AS
SELECT 
  ml.*,
  -- Données pour listing individuel
  CASE WHEN ml.listing_type = 'individual' THEN
    (SELECT json_build_object(
      'code', pa.code,
      'race', pa.race,
      'sexe', pa.sexe,
      'date_naissance', pa.date_naissance,
      'age_jours', COALESCE(EXTRACT(DAY FROM (CURRENT_DATE - pa.date_naissance))::INTEGER, 0)
    ) FROM production_animaux pa WHERE pa.id = ml.subject_id)
  END AS animal_details,
  
  -- Données pour listing batch
  CASE WHEN ml.listing_type = 'batch' THEN
    (SELECT json_build_object(
      'pen_name', b.pen_name,
      'category', b.category,
      'total_count', b.total_count,
      'average_weight_kg', b.average_weight_kg,
      'total_weight_kg', COALESCE(ml.pig_count, 0) * COALESCE(ml.weight, 0),
      'position', b.position
    ) FROM batches b WHERE b.id = ml.batch_id)
  END AS batch_details,
  
  -- Données communes du producteur
  (SELECT json_build_object(
    'nom', u.nom,
    'prenom', u.prenom,
    'telephone', u.telephone,
    'rating', COALESCE((
      SELECT AVG(overall) 
      FROM marketplace_ratings 
      WHERE producer_id = ml.producer_id
    ), 0)
  ) FROM users u WHERE u.id = ml.producer_id) AS producer_details

FROM marketplace_listings ml
WHERE ml.status != 'removed';

COMMENT ON VIEW v_marketplace_listings_enriched IS 'Vue enrichie des listings marketplace avec toutes les données nécessaires pour l''affichage, quel que soit le mode d''élevage. Inclut la colonne photos.';
