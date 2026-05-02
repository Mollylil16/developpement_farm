-- Migration: Création de la table user_subscriptions
-- Date: 2025-01-XX
-- Description: Table pour stocker les abonnements des utilisateurs

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'trial', 'pending')),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP, -- NULL pour abonnements actifs sans expiration
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  payment_method TEXT, -- 'stripe', 'wave', 'orange_money', 'mtn_money', 'moov_money'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER trigger_update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);

-- Commentaires
COMMENT ON TABLE user_subscriptions IS 'Abonnements des utilisateurs';
COMMENT ON COLUMN user_subscriptions.status IS 'Statut de l''abonnement: active, expired, cancelled, trial, pending';
COMMENT ON COLUMN user_subscriptions.payment_method IS 'Méthode de paiement utilisée';

