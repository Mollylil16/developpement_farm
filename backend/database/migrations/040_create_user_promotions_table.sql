-- Migration: Création de la table user_promotions
-- Date: 2025-01-19
-- Description: Table pour suivre l'utilisation des promotions par les utilisateurs

CREATE TABLE IF NOT EXISTS user_promotions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  used_at TIMESTAMP DEFAULT NOW(),
  subscription_id TEXT REFERENCES user_subscriptions(id),
  transaction_id TEXT REFERENCES transactions(id),
  discount_applied NUMERIC, -- Montant de réduction appliqué
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_promotions_user_id ON user_promotions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_promotions_promotion_id ON user_promotions(promotion_id);

COMMENT ON TABLE user_promotions IS 'Table pour suivre l''utilisation des promotions par les utilisateurs';

