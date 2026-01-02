-- Migration: Uniformisation complète du support marketplace pour les deux modes d'élevage
-- Date: 2026-01-02
-- Description: Ajoute les colonnes marketplace_status dans batch_pigs et batches, renforce les contraintes,
--              et assure la cohérence entre les modes d'élevage individuel et par bande

-- ========================================
-- 1. Ajouter marketplace_status dans batch_pigs
-- ========================================
ALTER TABLE batch_pigs
  ADD COLUMN IF NOT EXISTS marketplace_status TEXT CHECK (marketplace_status IN ('not_listed', 'available', 'pending_sale', 'sold')),
  ADD COLUMN IF NOT EXISTS marketplace_listing_id TEXT,
  ADD COLUMN IF NOT EXISTS listed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP;

-- Par défaut, tous les porcs existants ne sont pas listés
-- Vérifier que la colonne existe avant l'UPDATE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'batch_pigs' AND column_name = 'marketplace_status'
  ) THEN
    UPDATE batch_pigs 
    SET marketplace_status = 'not_listed' 
    WHERE marketplace_status IS NULL;
  END IF;
END $$;

-- Contrainte de clé étrangère
ALTER TABLE batch_pigs
  DROP CONSTRAINT IF EXISTS fk_batch_pigs_marketplace_listing;

ALTER TABLE batch_pigs
  ADD CONSTRAINT fk_batch_pigs_marketplace_listing 
    FOREIGN KEY (marketplace_listing_id) 
    REFERENCES marketplace_listings(id) 
    ON DELETE SET NULL;

-- Index pour les requêtes marketplace sur batch_pigs
CREATE INDEX IF NOT EXISTS idx_batch_pigs_marketplace_status 
  ON batch_pigs(marketplace_status) 
  WHERE marketplace_status != 'not_listed';

CREATE INDEX IF NOT EXISTS idx_batch_pigs_marketplace_listing 
  ON batch_pigs(marketplace_listing_id) 
  WHERE marketplace_listing_id IS NOT NULL;

-- Commentaires
COMMENT ON COLUMN batch_pigs.marketplace_status IS 'Statut marketplace du porc: not_listed, available, pending_sale, sold';
COMMENT ON COLUMN batch_pigs.marketplace_listing_id IS 'ID du listing marketplace actif pour ce porc';
COMMENT ON COLUMN batch_pigs.listed_at IS 'Date de mise en vente sur le marketplace';
COMMENT ON COLUMN batch_pigs.sold_at IS 'Date de vente effective sur le marketplace';

-- ========================================
-- 2. Ajouter marketplace_status dans batches
-- ========================================
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS marketplace_status TEXT CHECK (marketplace_status IN ('not_listed', 'partially_listed', 'fully_listed')),
  ADD COLUMN IF NOT EXISTS marketplace_listed_count INTEGER DEFAULT 0 CHECK (marketplace_listed_count >= 0);

-- Par défaut, toutes les bandes existantes ne sont pas listées
-- Vérifier que les colonnes existent avant l'UPDATE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'batches' AND column_name = 'marketplace_status'
  ) THEN
    UPDATE batches 
    SET marketplace_status = 'not_listed', marketplace_listed_count = 0
    WHERE marketplace_status IS NULL;
  END IF;
END $$;

-- Index pour les requêtes marketplace sur batches
CREATE INDEX IF NOT EXISTS idx_batches_marketplace_status 
  ON batches(marketplace_status) 
  WHERE marketplace_status != 'not_listed';

-- Commentaires
COMMENT ON COLUMN batches.marketplace_status IS 'Statut marketplace de la bande: not_listed, partially_listed (une partie des porcs), fully_listed (toute la bande)';
COMMENT ON COLUMN batches.marketplace_listed_count IS 'Nombre de porcs de la bande actuellement listés sur le marketplace';

-- ========================================
-- 3. Renforcer les contraintes sur marketplace_listings
-- ========================================

-- Vérifier et créer les colonnes nécessaires si elles n'existent pas (indépendance de la migration 52)
DO $$
BEGIN
  -- Vérifier et créer listing_type si nécessaire
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_listings' AND column_name = 'listing_type'
  ) THEN
    ALTER TABLE marketplace_listings
      ADD COLUMN listing_type TEXT DEFAULT 'individual' CHECK (listing_type IN ('individual', 'batch'));
  END IF;

  -- Vérifier et créer batch_id si nécessaire
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_listings' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE marketplace_listings
      ADD COLUMN batch_id TEXT REFERENCES batches(id) ON DELETE CASCADE;
  END IF;

  -- Vérifier et créer pig_ids si nécessaire
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_listings' AND column_name = 'pig_ids'
  ) THEN
    ALTER TABLE marketplace_listings
      ADD COLUMN pig_ids JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Vérifier et créer pig_count si nécessaire
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_listings' AND column_name = 'pig_count'
  ) THEN
    ALTER TABLE marketplace_listings
      ADD COLUMN pig_count INTEGER DEFAULT 1 CHECK (pig_count >= 1);
  END IF;

  -- Vérifier et créer weight si nécessaire
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketplace_listings' AND column_name = 'weight'
  ) THEN
    ALTER TABLE marketplace_listings
      ADD COLUMN weight NUMERIC CHECK (weight >= 0);
  END IF;

  -- Rendre subject_id nullable si nécessaire (pour support batch)
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

-- Corriger les données avant de rendre weight NOT NULL
-- IMPORTANT : Faire cela AVANT de rendre la colonne NOT NULL

-- 1. Corriger les listings avec listing_type NULL (déterminer le type)
UPDATE marketplace_listings
SET listing_type = CASE 
  WHEN subject_id IS NOT NULL AND batch_id IS NULL THEN 'individual'
  WHEN batch_id IS NOT NULL AND subject_id IS NULL THEN 'batch'
  WHEN subject_id IS NOT NULL THEN 'individual' -- Priorité à subject_id
  ELSE 'individual' -- Fallback par défaut
END
WHERE listing_type IS NULL;

-- 2. Corriger les pig_ids NULL ou invalides pour les listings individuels
UPDATE marketplace_listings
SET pig_ids = '[]'::jsonb
WHERE listing_type = 'individual' 
  AND (pig_ids IS NULL OR pig_ids = 'null'::jsonb OR pig_ids::text = 'null');

-- 3. Corriger les pig_count pour les listings individuels
UPDATE marketplace_listings
SET pig_count = 1
WHERE listing_type = 'individual' AND (pig_count IS NULL OR pig_count != 1);

-- 4. Corriger les listings batch avec pig_count invalide
UPDATE marketplace_listings
SET pig_count = CASE
  WHEN batch_id IS NOT NULL AND EXISTS (SELECT 1 FROM batches WHERE id = marketplace_listings.batch_id) THEN
    COALESCE(
      (SELECT COUNT(*) FROM batch_pigs WHERE batch_id = marketplace_listings.batch_id),
      1
    )
  ELSE 1
END
WHERE listing_type = 'batch' AND (pig_count IS NULL OR pig_count = 0);

-- 5. Mettre à jour les weight pour les listings individuels
UPDATE marketplace_listings
SET weight = COALESCE(
  (SELECT poids_kg FROM production_pesees 
   WHERE animal_id = marketplace_listings.subject_id 
   ORDER BY date DESC LIMIT 1),
  50.0 -- Poids par défaut si aucune pesée n'est disponible
)
WHERE weight IS NULL AND listing_type = 'individual';

-- 6. Mettre à jour les weight pour les listings batch
UPDATE marketplace_listings ml
SET weight = COALESCE(
  (SELECT average_weight_kg FROM batches WHERE id = ml.batch_id),
  50.0
)
WHERE weight IS NULL AND listing_type = 'batch';

-- 7. Cas de fallback : listings sans type valide ou sans subject_id/batch_id
UPDATE marketplace_listings
SET weight = 50.0
WHERE weight IS NULL 
  AND (listing_type IS NULL 
       OR listing_type NOT IN ('individual', 'batch')
       OR (listing_type = 'individual' AND subject_id IS NULL)
       OR (listing_type = 'batch' AND batch_id IS NULL));

-- Vérifier qu'il ne reste plus de NULL avant de rendre la colonne NOT NULL
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM marketplace_listings
  WHERE weight IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Il reste % listing(s) avec weight NULL. Veuillez les corriger manuellement avant de continuer.', null_count;
  END IF;
END $$;

-- Rendre weight obligatoire pour tous les nouveaux listings
ALTER TABLE marketplace_listings
  ALTER COLUMN weight SET NOT NULL;

-- Améliorer la contrainte check_batch_listing
-- DROP les contraintes existantes avant de les recréer
ALTER TABLE marketplace_listings
  DROP CONSTRAINT IF EXISTS check_batch_listing,
  DROP CONSTRAINT IF EXISTS check_batch_pig_count;

-- Corriger automatiquement toutes les données invalides avant d'ajouter les contraintes
DO $$
DECLARE
  invalid_individual_count INTEGER;
  invalid_batch_count INTEGER;
BEGIN
  -- Compter les listings individuels invalides
  SELECT COUNT(*) INTO invalid_individual_count
  FROM marketplace_listings
  WHERE listing_type = 'individual' 
    AND (
      subject_id IS NULL 
      OR batch_id IS NOT NULL 
      OR (pig_ids IS NOT NULL AND pig_ids::text != '[]' AND pig_ids::text != 'null')
      OR pig_count != 1
    );

  -- Compter les listings batch invalides
  SELECT COUNT(*) INTO invalid_batch_count
  FROM marketplace_listings
  WHERE listing_type = 'batch' 
    AND (
      batch_id IS NULL 
      OR subject_id IS NOT NULL 
      OR pig_count IS NULL 
      OR pig_count <= 0
    );

  -- Corriger les listings individuels invalides (seulement ceux qui peuvent être corrigés)
  IF invalid_individual_count > 0 THEN
    -- Corriger batch_id et pig_ids/pig_count pour les listings avec subject_id valide
    UPDATE marketplace_listings
    SET 
      batch_id = NULL,
      pig_ids = '[]'::jsonb,
      pig_count = 1
    WHERE listing_type = 'individual' 
      AND subject_id IS NOT NULL
      AND (
        batch_id IS NOT NULL 
        OR (pig_ids IS NOT NULL AND pig_ids::text != '[]' AND pig_ids::text != 'null')
        OR pig_count != 1
      );

    -- Pour les listings sans subject_id, les marquer comme 'removed' (ne peuvent pas être corrigés automatiquement)
    UPDATE marketplace_listings
    SET status = 'removed'
    WHERE listing_type = 'individual' 
      AND subject_id IS NULL;
  END IF;

  -- Corriger les listings batch invalides (seulement ceux qui peuvent être corrigés)
  IF invalid_batch_count > 0 THEN
    -- Corriger subject_id et pig_count pour les listings avec batch_id valide
    UPDATE marketplace_listings
    SET 
      subject_id = NULL,
      pig_count = CASE
        WHEN batch_id IS NOT NULL AND EXISTS (SELECT 1 FROM batches WHERE id = marketplace_listings.batch_id) THEN
          COALESCE((SELECT COUNT(*) FROM batch_pigs WHERE batch_id = marketplace_listings.batch_id), 1)
        ELSE 1
      END
    WHERE listing_type = 'batch' 
      AND batch_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM batches WHERE id = marketplace_listings.batch_id)
      AND (
        subject_id IS NOT NULL 
        OR pig_count IS NULL 
        OR pig_count <= 0
      );

    -- Pour les listings sans batch_id valide, les marquer comme 'removed'
    UPDATE marketplace_listings
    SET status = 'removed'
    WHERE listing_type = 'batch' 
      AND (batch_id IS NULL OR NOT EXISTS (SELECT 1 FROM batches WHERE id = marketplace_listings.batch_id));
  END IF;
END $$;

-- Ajouter la contrainte check_batch_listing améliorée
ALTER TABLE marketplace_listings
  ADD CONSTRAINT check_batch_listing 
    CHECK (
      (listing_type = 'individual' AND subject_id IS NOT NULL AND batch_id IS NULL AND (pig_ids = '[]'::jsonb OR pig_ids IS NULL)) OR
      (listing_type = 'batch' AND batch_id IS NOT NULL AND subject_id IS NULL AND pig_count > 0)
    );

-- Contrainte: si listing_type='batch', pig_ids doit être valide
ALTER TABLE marketplace_listings
  ADD CONSTRAINT check_batch_pig_count
    CHECK (
      listing_type != 'batch' OR 
      (pig_count > 0 AND (
        pig_ids IS NULL OR 
        (jsonb_typeof(pig_ids) = 'array' AND jsonb_array_length(pig_ids) <= pig_count)
      ))
    );

-- ========================================
-- 4. Ajouter des fonctions de synchronisation
-- ========================================

-- Fonction: Mettre à jour le statut marketplace d'une bande basé sur ses porcs
CREATE OR REPLACE FUNCTION update_batch_marketplace_status()
RETURNS TRIGGER AS $$
DECLARE
  v_batch_id TEXT;
  v_total_count INTEGER;
  v_listed_count INTEGER;
BEGIN
  -- Déterminer le batch_id selon le type d'opération
  IF TG_OP = 'DELETE' THEN
    v_batch_id := OLD.batch_id;
  ELSE
    v_batch_id := NEW.batch_id;
  END IF;

  -- Ignorer si batch_id est NULL
  IF v_batch_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Récupérer le nombre total de porcs dans la bande
  SELECT total_count INTO v_total_count
  FROM batches
  WHERE id = v_batch_id;

  -- Compter les porcs listés
  SELECT COUNT(*) INTO v_listed_count
  FROM batch_pigs
  WHERE batch_id = v_batch_id
    AND marketplace_status IN ('available', 'pending_sale');

  -- Mettre à jour le statut de la bande
  IF v_listed_count = 0 THEN
    UPDATE batches
    SET marketplace_status = 'not_listed',
        marketplace_listed_count = 0
    WHERE id = v_batch_id;
  ELSIF v_listed_count >= v_total_count THEN
    UPDATE batches
    SET marketplace_status = 'fully_listed',
        marketplace_listed_count = v_listed_count
    WHERE id = v_batch_id;
  ELSE
    UPDATE batches
    SET marketplace_status = 'partially_listed',
        marketplace_listed_count = v_listed_count
    WHERE id = v_batch_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Synchroniser le statut de la bande quand un porc est listé/délisté
DROP TRIGGER IF EXISTS trigger_sync_batch_marketplace_status ON batch_pigs;
CREATE TRIGGER trigger_sync_batch_marketplace_status
  AFTER INSERT OR UPDATE OF marketplace_status OR DELETE ON batch_pigs
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_marketplace_status();

-- ========================================
-- 5. Index de performance supplémentaires
-- ========================================

-- Index composite pour rechercher les listings disponibles par type
-- Vérifier que toutes les colonnes nécessaires existent avant de créer les index
DO $$
DECLARE
  cols_exist BOOLEAN;
BEGIN
  -- Vérifier que listing_type, status et listed_at existent
  SELECT COUNT(*) = 3 INTO cols_exist
  FROM information_schema.columns 
  WHERE table_name = 'marketplace_listings' 
    AND column_name IN ('listing_type', 'status', 'listed_at');

  IF cols_exist THEN
    CREATE INDEX IF NOT EXISTS idx_marketplace_listings_type_status 
      ON marketplace_listings(listing_type, status, listed_at DESC)
      WHERE status = 'available';
  END IF;

  -- Vérifier que producer_id, listing_type et status existent
  SELECT COUNT(*) = 3 INTO cols_exist
  FROM information_schema.columns 
  WHERE table_name = 'marketplace_listings' 
    AND column_name IN ('producer_id', 'listing_type', 'status');

  IF cols_exist THEN
    CREATE INDEX IF NOT EXISTS idx_marketplace_listings_producer_type 
      ON marketplace_listings(producer_id, listing_type, status)
      WHERE status != 'removed';
  END IF;

  -- Vérifier que pig_ids et listing_type existent
  SELECT COUNT(*) = 2 INTO cols_exist
  FROM information_schema.columns 
  WHERE table_name = 'marketplace_listings' 
    AND column_name IN ('pig_ids', 'listing_type');

  IF cols_exist THEN
    CREATE INDEX IF NOT EXISTS idx_marketplace_listings_pig_ids_gin 
      ON marketplace_listings USING gin(pig_ids)
      WHERE listing_type = 'batch';
  END IF;
END $$;

-- ========================================
-- 6. Vues utilitaires pour requêtes simplifiées
-- ========================================

-- Vue: Tous les listings avec enrichissement automatique
-- Vérifier que toutes les colonnes nécessaires existent avant de créer la vue
DO $$
DECLARE
  required_columns TEXT[] := ARRAY['listing_type', 'subject_id', 'batch_id', 'pig_count', 'weight', 'producer_id', 'status'];
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
    RAISE WARNING 'Vue v_marketplace_listings_enriched non créée: colonnes manquantes: %', array_to_string(missing_columns, ', ');
  END IF;
END $$;

COMMENT ON VIEW v_marketplace_listings_enriched IS 'Vue enrichie des listings marketplace avec toutes les données nécessaires pour l''affichage, quel que soit le mode d''élevage';

-- ========================================
-- 7. Permissions et sécurité (si RLS est activé)
-- ========================================

-- Ces commandes sont optionnelles et dépendent de votre configuration RLS

-- GRANT SELECT ON v_marketplace_listings_enriched TO authenticated_users;
-- GRANT SELECT, INSERT, UPDATE ON marketplace_listings TO authenticated_users;
-- GRANT SELECT, UPDATE ON batch_pigs TO authenticated_users;
-- GRANT SELECT, UPDATE ON batches TO authenticated_users;

-- ========================================
-- FIN DE LA MIGRATION
-- ========================================

-- Afficher un résumé
DO $$
DECLARE
  v_total_listings INTEGER;
  v_individual_listings INTEGER;
  v_batch_listings INTEGER;
  v_batches_with_status INTEGER;
  v_pigs_with_status INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_listings FROM marketplace_listings WHERE status != 'removed';
  SELECT COUNT(*) INTO v_individual_listings FROM marketplace_listings WHERE listing_type = 'individual' AND status != 'removed';
  SELECT COUNT(*) INTO v_batch_listings FROM marketplace_listings WHERE listing_type = 'batch' AND status != 'removed';
  SELECT COUNT(*) INTO v_batches_with_status FROM batches WHERE marketplace_status != 'not_listed';
  SELECT COUNT(*) INTO v_pigs_with_status FROM batch_pigs WHERE marketplace_status != 'not_listed';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 063 terminée avec succès';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Listings actifs: % (% individuels, % bandes)', v_total_listings, v_individual_listings, v_batch_listings;
  RAISE NOTICE 'Bandes avec statut marketplace: %', v_batches_with_status;
  RAISE NOTICE 'Porcs avec statut marketplace: %', v_pigs_with_status;
  RAISE NOTICE '========================================';
END $$;

