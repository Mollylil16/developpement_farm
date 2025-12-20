-- Migration: Création de la table marketplace_offers
-- Date: 2025-01-09
-- Description: Table pour stocker les offres d'achat du marketplace

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
        CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS marketplace_offers (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  subject_ids TEXT[] NOT NULL, -- Array of subject IDs
  buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  producer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposed_price NUMERIC NOT NULL CHECK (proposed_price >= 0),
  original_price NUMERIC NOT NULL CHECK (original_price >= 0),
  message TEXT,
  status offer_status NOT NULL DEFAULT 'pending',
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_listing_id ON marketplace_offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_buyer_id ON marketplace_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_producer_id ON marketplace_offers(producer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_status ON marketplace_offers(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_created_at ON marketplace_offers(created_at);

-- Commentaires pour documentation
COMMENT ON TABLE marketplace_offers IS 'Table pour stocker les offres d''achat du marketplace';

