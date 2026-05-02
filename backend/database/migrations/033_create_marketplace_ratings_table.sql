-- Migration: Création de la table marketplace_ratings
-- Date: 2025-01-09
-- Description: Table pour stocker les notations des producteurs

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rating_status') THEN
        CREATE TYPE rating_status AS ENUM ('published', 'pending_moderation', 'flagged');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS marketplace_ratings (
  id TEXT PRIMARY KEY,
  producer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,
  -- Rating Criteria (stored as JSON for flexibility)
  ratings JSONB NOT NULL, -- { quality: number, professionalism: number, timeliness: number, communication: number }
  overall NUMERIC NOT NULL CHECK (overall >= 1 AND overall <= 5),
  comment TEXT,
  photos TEXT[], -- Array of photo URLs
  verified_purchase BOOLEAN NOT NULL DEFAULT TRUE,
  status rating_status NOT NULL DEFAULT 'published',
  -- Producer Response
  producer_response JSONB, -- { text: string, responded_at: timestamp }
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  helpful_count INTEGER DEFAULT 0,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_producer_id ON marketplace_ratings(producer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_buyer_id ON marketplace_ratings(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_transaction_id ON marketplace_ratings(transaction_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_status ON marketplace_ratings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_created_at ON marketplace_ratings(created_at);

-- Commentaires pour documentation
COMMENT ON TABLE marketplace_ratings IS 'Table pour stocker les notations des producteurs';
COMMENT ON COLUMN marketplace_ratings.ratings IS 'Critères de notation stockés en JSON';
COMMENT ON COLUMN marketplace_ratings.producer_response IS 'Réponse du producteur stockée en JSON';

