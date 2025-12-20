-- Migration: Création de la table promotions
-- Date: 2025-01-19
-- Description: Table pour gérer les promotions, codes promo, cadeaux

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('discount', 'free_month', 'gift', 'bonus')),
  discount_percentage INTEGER, -- Pourcentage de réduction (ex: 20 pour 20%)
  discount_amount NUMERIC, -- Montant fixe de réduction en CFA
  free_months INTEGER, -- Nombre de mois gratuits
  gift_description TEXT, -- Description du cadeau
  min_subscription_duration INTEGER, -- Durée minimale d'abonnement requise (en mois)
  max_uses INTEGER, -- Nombre maximum d'utilisations (NULL = illimité)
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  target_audience TEXT CHECK (target_audience IN ('all', 'new_users', 'active_users', 'specific_users')),
  target_user_ids TEXT[], -- IDs des utilisateurs ciblés si target_audience = 'specific_users'
  created_by TEXT REFERENCES admins(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_valid_dates ON promotions(valid_from, valid_until);

COMMENT ON TABLE promotions IS 'Table pour stocker les promotions, codes promo et cadeaux';
COMMENT ON COLUMN promotions.type IS 'Type de promotion: discount (réduction), free_month (mois gratuit), gift (cadeau), bonus (bonus)';
COMMENT ON COLUMN promotions.target_audience IS 'Audience cible: all, new_users, active_users, specific_users';

