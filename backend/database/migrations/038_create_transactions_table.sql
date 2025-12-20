-- Migration: Création de la table transactions
-- Date: 2025-01-XX
-- Description: Table pour stocker les transactions de paiement

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  subscription_id TEXT REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  plan_id TEXT REFERENCES subscription_plans(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  payment_method TEXT NOT NULL, -- 'stripe', 'wave', 'orange_money', 'mtn_money', 'moov_money'
  payment_provider_id TEXT, -- ID de la transaction chez le provider (Stripe payment_intent_id, etc.)
  payment_provider_response TEXT, -- JSON response du provider
  failure_reason TEXT,
  refunded_at TIMESTAMP,
  refund_amount NUMERIC(10, 2),
  metadata TEXT, -- JSON pour données supplémentaires
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_subscription_id ON transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_provider_id ON transactions(payment_provider_id);

-- Commentaires
COMMENT ON TABLE transactions IS 'Transactions de paiement pour les abonnements';
COMMENT ON COLUMN transactions.status IS 'Statut de la transaction: pending, completed, failed, refunded, cancelled';
COMMENT ON COLUMN transactions.payment_provider_id IS 'ID de la transaction chez le provider externe (Stripe, etc.)';
COMMENT ON COLUMN transactions.payment_provider_response IS 'Réponse JSON complète du provider de paiement';

