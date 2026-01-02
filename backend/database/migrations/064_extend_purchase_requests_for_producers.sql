-- Migration 064: Étendre purchase_requests pour supporter producteurs et modes bande/individuel
-- Date: 2024
-- Description: Ajoute les champs nécessaires pour permettre aux producteurs de créer des demandes
--               et supporte les deux modes de gestion (bande/individuel)

-- Vérifier si la table purchase_requests existe, sinon la créer
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_requests') THEN
    CREATE TABLE purchase_requests (
      id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      race TEXT NOT NULL,
      min_weight REAL NOT NULL,
      max_weight REAL NOT NULL,
      age_category TEXT,
      min_age_months INTEGER,
      max_age_months INTEGER,
      quantity INTEGER NOT NULL,
      delivery_location_latitude REAL,
      delivery_location_longitude REAL,
      delivery_location_address TEXT,
      delivery_location_city TEXT,
      delivery_location_region TEXT,
      delivery_location_department TEXT,
      delivery_radius_km REAL,
      max_price_per_kg REAL,
      max_total_price REAL,
      delivery_date TEXT,
      delivery_period_start TEXT,
      delivery_period_end TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'fulfilled', 'expired', 'archived', 'cancelled', 'pending')),
      views INTEGER DEFAULT 0,
      matched_producers_count INTEGER DEFAULT 0,
      offers_count INTEGER DEFAULT 0,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    
    CREATE INDEX idx_purchase_requests_buyer ON purchase_requests(buyer_id);
    CREATE INDEX idx_purchase_requests_status ON purchase_requests(status);
    CREATE INDEX idx_purchase_requests_race ON purchase_requests(race);
    CREATE INDEX idx_purchase_requests_location ON purchase_requests(delivery_location_latitude, delivery_location_longitude);
    
    RAISE NOTICE 'Table purchase_requests créée';
  END IF;
END $$;

-- Ajouter les nouvelles colonnes si elles n'existent pas
DO $$
BEGIN
  -- sender_type: 'buyer' ou 'producer'
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'sender_type') THEN
    ALTER TABLE purchase_requests ADD COLUMN sender_type TEXT DEFAULT 'buyer' CHECK (sender_type IN ('buyer', 'producer'));
    RAISE NOTICE 'Colonne sender_type ajoutée';
  END IF;
  
  -- sender_id: ID de l'émetteur (peut être buyer_id ou producer_id selon sender_type)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'sender_id') THEN
    ALTER TABLE purchase_requests ADD COLUMN sender_id TEXT;
    -- Mettre à jour sender_id avec buyer_id pour les enregistrements existants
    UPDATE purchase_requests SET sender_id = buyer_id WHERE sender_id IS NULL;
    ALTER TABLE purchase_requests ALTER COLUMN sender_id SET NOT NULL;
    RAISE NOTICE 'Colonne sender_id ajoutée';
  END IF;
  
  -- management_mode: 'individual' ou 'batch' (mode de gestion préféré)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'management_mode') THEN
    ALTER TABLE purchase_requests ADD COLUMN management_mode TEXT CHECK (management_mode IN ('individual', 'batch', 'both'));
    RAISE NOTICE 'Colonne management_mode ajoutée';
  END IF;
  
  -- growth_stage: stade de croissance (porcelet, engraissement, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'growth_stage') THEN
    ALTER TABLE purchase_requests ADD COLUMN growth_stage TEXT;
    RAISE NOTICE 'Colonne growth_stage ajoutée';
  END IF;
  
  -- matching_thresholds: seuils de matching en JSON (poids ±%, prix ±%, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'matching_thresholds') THEN
    ALTER TABLE purchase_requests ADD COLUMN matching_thresholds JSONB;
    RAISE NOTICE 'Colonne matching_thresholds ajoutée';
  END IF;
  
  -- farm_id: ID du projet/ferme pour les producteurs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'farm_id') THEN
    ALTER TABLE purchase_requests ADD COLUMN farm_id TEXT REFERENCES projets(id) ON DELETE SET NULL;
    RAISE NOTICE 'Colonne farm_id ajoutée';
  END IF;
END $$;

-- Créer la table purchase_request_responses si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_request_responses') THEN
    CREATE TABLE purchase_request_responses (
      id TEXT PRIMARY KEY,
      purchase_request_id TEXT NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
      responder_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      responder_type TEXT NOT NULL CHECK (responder_type IN ('buyer', 'producer')),
      listing_id TEXT REFERENCES marketplace_listings(id) ON DELETE SET NULL,
      subject_ids JSONB, -- IDs des sujets proposés (pour mode individuel)
      batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL, -- ID de la bande (pour mode batch)
      proposed_price_per_kg REAL NOT NULL,
      proposed_total_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      available_date TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn')),
      created_at TEXT NOT NULL,
      responded_at TEXT,
      expires_at TEXT
    );
    
    CREATE INDEX idx_purchase_request_responses_request ON purchase_request_responses(purchase_request_id);
    CREATE INDEX idx_purchase_request_responses_responder ON purchase_request_responses(responder_id);
    CREATE INDEX idx_purchase_request_responses_status ON purchase_request_responses(status);
    
    RAISE NOTICE 'Table purchase_request_responses créée';
  END IF;
END $$;

-- Créer la table purchase_request_matches si elle n'existe pas (pour tracking des matches automatiques)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_request_matches') THEN
    CREATE TABLE purchase_request_matches (
      id TEXT PRIMARY KEY,
      purchase_request_id TEXT NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
      producer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      farm_id TEXT REFERENCES projets(id) ON DELETE SET NULL,
      listing_id TEXT REFERENCES marketplace_listings(id) ON DELETE SET NULL,
      match_score REAL, -- Score de correspondance (0-100)
      match_details JSONB, -- Détails du match (critères correspondants, etc.)
      notified BOOLEAN DEFAULT FALSE,
      notification_sent_at TEXT,
      created_at TEXT NOT NULL
    );
    
    CREATE INDEX idx_purchase_request_matches_request ON purchase_request_matches(purchase_request_id);
    CREATE INDEX idx_purchase_request_matches_producer ON purchase_request_matches(producer_id);
    CREATE INDEX idx_purchase_request_matches_score ON purchase_request_matches(match_score);
    
    RAISE NOTICE 'Table purchase_request_matches créée';
  END IF;
END $$;

-- Mettre à jour les enregistrements existants (seulement si les colonnes existent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'sender_type')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'sender_id') THEN
    UPDATE purchase_requests 
    SET sender_type = 'buyer', 
        sender_id = buyer_id,
        management_mode = COALESCE(management_mode, 'both') -- Par défaut, accepter les deux modes
    WHERE sender_type IS NULL OR sender_id IS NULL;
  END IF;
END $$;

-- Ajouter des contraintes de validation
DO $$
BEGIN
  -- S'assurer que sender_id correspond au type
  -- (Cette validation sera faite au niveau application)
  
  -- Créer une fonction pour générer des IDs uniques
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_purchase_request_id') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION generate_purchase_request_id() RETURNS TEXT AS $func$
      BEGIN
        RETURN ''pr_'' || to_char(now(), ''YYYYMMDD'') || ''_'' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);
      END;
      $func$ LANGUAGE plpgsql;
    ';
    RAISE NOTICE 'Fonction generate_purchase_request_id créée';
  END IF;
END $$;

-- Commentaires pour documentation (ajoutés seulement si les colonnes existent)
DO $$
BEGIN
  -- Vérifier si les colonnes existent avant d'ajouter les commentaires
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'sender_type') THEN
    EXECUTE 'COMMENT ON COLUMN purchase_requests.sender_type IS ''Type d''''émetteur: buyer (acheteur) ou producer (producteur)''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'sender_id') THEN
    EXECUTE 'COMMENT ON COLUMN purchase_requests.sender_id IS ''ID de l''''émetteur (buyer_id ou producer_id selon sender_type)''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'management_mode') THEN
    EXECUTE 'COMMENT ON COLUMN purchase_requests.management_mode IS ''Mode de gestion préféré: individual, batch, ou both''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'growth_stage') THEN
    EXECUTE 'COMMENT ON COLUMN purchase_requests.growth_stage IS ''Stade de croissance souhaité (porcelet, engraissement, etc.)''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'matching_thresholds') THEN
    EXECUTE 'COMMENT ON COLUMN purchase_requests.matching_thresholds IS ''Seuils de matching en JSON: {weight_tolerance: 10, price_tolerance: 20} (en %)''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_requests' AND column_name = 'farm_id') THEN
    EXECUTE 'COMMENT ON COLUMN purchase_requests.farm_id IS ''ID du projet/ferme pour les producteurs''';
  END IF;
  
  RAISE NOTICE 'Migration 064 terminée avec succès';
EXCEPTION
  WHEN OTHERS THEN
    -- Si les commentaires échouent, ce n'est pas critique
    RAISE NOTICE 'Migration 064 terminée (certains commentaires peuvent ne pas avoir été ajoutés)';
END $$;

