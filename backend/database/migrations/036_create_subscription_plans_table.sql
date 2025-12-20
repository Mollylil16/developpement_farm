-- Migration: Création de la table subscription_plans
-- Date: 2025-01-XX
-- Description: Table pour stocker les plans d'abonnement disponibles
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  -- 'basic', 'pro', 'super_pro'
  display_name TEXT NOT NULL,
  -- 'Basic', 'Pro', 'Super Pro'
  price_monthly NUMERIC(10, 2) NOT NULL CHECK (price_monthly >= 0),
  price_yearly NUMERIC(10, 2),
  -- Prix annuel (optionnel, pour réduction)
  currency TEXT NOT NULL DEFAULT 'XOF',
  -- XOF pour CFA
  features TEXT,
  -- JSON array des fonctionnalités incluses
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_subscription_plans_updated_at BEFORE
UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_subscription_plans_updated_at();
-- Index
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);
-- Commentaires
COMMENT ON TABLE subscription_plans IS 'Plans d''abonnement disponibles pour les utilisateurs';
COMMENT ON COLUMN subscription_plans.price_monthly IS 'Prix mensuel en CFA';
COMMENT ON COLUMN subscription_plans.features IS 'JSON array des fonctionnalités du plan';
-- Insérer les plans par défaut
INSERT INTO subscription_plans (
    id,
    name,
    display_name,
    price_monthly,
    currency,
    features,
    is_active
  )
VALUES (
    'plan_basic',
    'basic',
    'Basic',
    2000.00,
    'XOF',
    '["Gestion de base", "1 projet", "Support email"]',
    TRUE
  ),
  (
    'plan_pro',
    'pro',
    'Pro',
    10000.00,
    'XOF',
    '["Toutes fonctionnalités", "Projets illimités", "Support prioritaire", "Rapports avancés"]',
    TRUE
  ),
  (
    'plan_super_pro',
    'super_pro',
    'Super Pro',
    3000.00,
    'XOF',
    '["Fonctionnalités Pro", "Collaboration", "API access"]',
    TRUE
  ) ON CONFLICT (id) DO NOTHING;