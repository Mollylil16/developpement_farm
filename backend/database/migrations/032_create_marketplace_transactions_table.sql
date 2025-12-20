-- Migration: Création de la table marketplace_transactions
-- Date: 2025-01-09
-- Description: Table pour stocker les transactions du marketplace

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE transaction_status AS ENUM ('confirmed', 'preparing', 'ready_for_delivery', 'pending_delivery', 'in_transit', 'delivered', 'completed', 'cancelled');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES marketplace_offers(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  subject_ids TEXT[] NOT NULL, -- Array of subject IDs
  buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  producer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  final_price NUMERIC NOT NULL CHECK (final_price >= 0),
  status transaction_status NOT NULL DEFAULT 'confirmed',
  -- Delivery Details (stored as JSON for flexibility)
  delivery_details JSONB,
  -- Documents (stored as JSON for flexibility)
  documents JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_offer_id ON marketplace_transactions(offer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_listing_id ON marketplace_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer_id ON marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_producer_id ON marketplace_transactions(producer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_status ON marketplace_transactions(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_created_at ON marketplace_transactions(created_at);

-- Commentaires pour documentation
COMMENT ON TABLE marketplace_transactions IS 'Table pour stocker les transactions du marketplace';
COMMENT ON COLUMN marketplace_transactions.delivery_details IS 'Détails de livraison stockés en JSON';
COMMENT ON COLUMN marketplace_transactions.documents IS 'Documents de transaction stockés en JSON';

