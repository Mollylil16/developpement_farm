-- Migration 064: Ajouter support photos dans la vue marketplace enrichie
-- Date: 2026-01-10
-- Description: Met à jour la vue v_marketplace_listings_enriched pour inclure la colonne photos

-- Recréer la vue en incluant explicitement la colonne photos
DROP VIEW IF EXISTS v_marketplace_listings_enriched;

-- Vérifier que toutes les colonnes nécessaires existent avant de créer la vue
DO $$
DECLARE
  required_columns TEXT[] := ARRAY['listing_type', 'subject_id', 'batch_id', 'pig_count', 'weight', 'producer_id', 'status', 'photos'];
  missing_columns TEXT[];
  col TEXT;
BEGIN
  -- Vérifier que toutes les colonnes requises existent
  SELECT ARRAY_AGG(required_col) INTO missing_columns
  FROM unnest(required_columns) AS required_col
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_listings' AND column_name = required_col
  );

  -- Si toutes les colonnes existent, créer la vue
  IF missing_columns IS NULL OR array_length(missing_columns, 1) IS NULL THEN
    EXECUTE '
    CREATE OR REPLACE VIEW v_marketplace_listings_enriched AS
    SELECT 
      ml.*,
      -- Données pour listing individuel
      CASE WHEN ml.listing_type = ''individual'' THEN
        (SELECT json_build_object(
          ''code'', pa.code,
          ''race'', pa.race,
          ''sexe'', pa.sexe,
          ''date_naissance'', pa.date_naissance,
          ''age_jours'', COALESCE(EXTRACT(DAY FROM (CURRENT_DATE - pa.date_naissance))::INTEGER, 0)
        ) FROM production_animaux pa WHERE pa.id = ml.subject_id)
      END AS animal_details,
      
      -- Données pour listing batch
      CASE WHEN ml.listing_type = ''batch'' THEN
        (SELECT json_build_object(
          ''pen_name'', b.pen_name,
          ''category'', b.category,
          ''total_count'', b.total_count,
          ''average_weight_kg'', b.average_weight_kg,
          ''total_weight_kg'', COALESCE(ml.pig_count, 0) * COALESCE(ml.weight, 0),
          ''position'', b.position
        ) FROM batches b WHERE b.id = ml.batch_id)
      END AS batch_details,
      
      -- Données communes
      (SELECT json_build_object(
        ''nom'', u.nom,
        ''prenom'', u.prenom,
        ''telephone'', u.telephone,
        ''rating'', COALESCE((
          SELECT AVG(overall) 
          FROM marketplace_ratings 
          WHERE producer_id = ml.producer_id
        ), 0)
      ) FROM users u WHERE u.id = ml.producer_id) AS producer_details

    FROM marketplace_listings ml
    WHERE ml.status != ''removed'';
    ';
  ELSE
    RAISE WARNING 'Vue v_marketplace_listings_enriched non mise à jour: colonnes manquantes: %', array_to_string(missing_columns, ', ');
  END IF;
END $$;

COMMENT ON VIEW v_marketplace_listings_enriched IS 'Vue enrichie des listings marketplace avec toutes les données nécessaires pour l''affichage, quel que soit le mode d''élevage. Inclut maintenant la colonne photos.';
