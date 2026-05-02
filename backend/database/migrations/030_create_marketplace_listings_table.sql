-- Migration: Création de la table marketplace_listings
-- Date: 2025-01-09
-- Description: Table pour stocker les annonces (listings) du marketplace

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marketplace_status') THEN
        CREATE TYPE marketplace_status AS ENUM ('available', 'reserved', 'pending_delivery', 'sold', 'removed');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES production_animaux(id) ON DELETE CASCADE,
  producer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farm_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  price_per_kg NUMERIC NOT NULL CHECK (price_per_kg >= 0),
  calculated_price NUMERIC NOT NULL CHECK (calculated_price >= 0),
  status marketplace_status NOT NULL DEFAULT 'available',
  listed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_weight_date TIMESTAMP NOT NULL,
  -- Location
  location_latitude NUMERIC NOT NULL,
  location_longitude NUMERIC NOT NULL,
  location_address TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_region TEXT NOT NULL,
  -- Sale Terms (stored as JSON for flexibility)
  sale_terms JSONB NOT NULL DEFAULT '{}',
  -- Analytics
  views INTEGER DEFAULT 0,
  inquiries INTEGER DEFAULT 0,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_producer_id ON marketplace_listings(producer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_farm_id ON marketplace_listings(farm_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_subject_id ON marketplace_listings(subject_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_listed_at ON marketplace_listings(listed_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_location ON marketplace_listings USING GIST (point(location_longitude, location_latitude));

-- Commentaires pour documentation
COMMENT ON TABLE marketplace_listings IS 'Table pour stocker les annonces (listings) du marketplace';
COMMENT ON COLUMN marketplace_listings.sale_terms IS 'Conditions de vente stockées en JSON';

