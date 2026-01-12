-- Migration 075: Créer table des paramètres de vente automatique marketplace
-- Date: 2026-01-11
-- Description: Stocke les préférences de vente automatique gérées par Kouakou

-- Table pour les paramètres de vente automatique
CREATE TABLE IF NOT EXISTS marketplace_auto_sale_settings (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Prix configurés
  min_price_per_kg NUMERIC NOT NULL CHECK (min_price_per_kg > 0), -- Prix minimum par kg
  target_price_per_kg NUMERIC NOT NULL CHECK (target_price_per_kg >= min_price_per_kg), -- Prix cible par kg
  
  -- Seuils de décision automatique
  auto_accept_threshold NUMERIC DEFAULT 0, -- % en dessous du target pour acceptation auto (0 = au target)
  confirm_threshold NUMERIC DEFAULT 5, -- % en dessous du min pour demander confirmation (3-5%)
  auto_reject_threshold NUMERIC DEFAULT 5, -- % en dessous du min pour rejet auto (> 5%)
  
  -- État de la gestion automatique
  auto_management_enabled BOOLEAN DEFAULT TRUE,
  kouakou_managed BOOLEAN DEFAULT TRUE, -- Géré par Kouakou
  
  -- Historique des décisions
  last_offer_checked_at TIMESTAMP,
  offers_auto_accepted INTEGER DEFAULT 0,
  offers_auto_rejected INTEGER DEFAULT 0,
  offers_pending_confirmation INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Contrainte d'unicité: un seul paramètre par listing
  CONSTRAINT unique_listing_settings UNIQUE (listing_id)
);

-- Table pour les décisions en attente de confirmation
CREATE TABLE IF NOT EXISTS marketplace_pending_decisions (
  id TEXT PRIMARY KEY,
  setting_id TEXT NOT NULL REFERENCES marketplace_auto_sale_settings(id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL REFERENCES marketplace_offers(id) ON DELETE CASCADE,
  
  -- Détails de l'offre
  offered_price NUMERIC NOT NULL,
  offered_price_per_kg NUMERIC NOT NULL,
  min_price_per_kg NUMERIC NOT NULL,
  price_difference_percent NUMERIC NOT NULL, -- % en dessous du min
  
  -- Décision recommandée par Kouakou
  recommended_action TEXT CHECK (recommended_action IN ('accept', 'reject', 'counter')),
  recommended_counter_price NUMERIC, -- Prix de contre-proposition suggéré
  kouakou_message TEXT, -- Message de Kouakou à l'utilisateur
  
  -- État
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired')),
  user_response TEXT, -- Réponse de l'utilisateur
  responded_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Un seul pending decision par offre
  CONSTRAINT unique_offer_decision UNIQUE (offer_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_auto_sale_settings_user ON marketplace_auto_sale_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_sale_settings_listing ON marketplace_auto_sale_settings(listing_id);
CREATE INDEX IF NOT EXISTS idx_pending_decisions_status ON marketplace_pending_decisions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pending_decisions_setting ON marketplace_pending_decisions(setting_id);

-- Commentaires
COMMENT ON TABLE marketplace_auto_sale_settings IS 'Paramètres de vente automatique gérée par Kouakou';
COMMENT ON TABLE marketplace_pending_decisions IS 'Décisions en attente de confirmation utilisateur pour offres marketplace';
COMMENT ON COLUMN marketplace_auto_sale_settings.auto_accept_threshold IS 'Pourcentage en dessous du target pour acceptation automatique (0 = seulement au target exact ou au-dessus)';
COMMENT ON COLUMN marketplace_auto_sale_settings.confirm_threshold IS 'Pourcentage en dessous du min pour demander confirmation (typiquement 3-5%)';
COMMENT ON COLUMN marketplace_auto_sale_settings.auto_reject_threshold IS 'Pourcentage en dessous du min pour rejet automatique (> 5% typiquement)';
