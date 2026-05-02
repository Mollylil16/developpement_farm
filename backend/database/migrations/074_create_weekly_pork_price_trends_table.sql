-- Migration 074: Créer table des tendances de prix hebdomadaires du porc
-- Date: 2026-01-11
-- Description: Table pour stocker les prix moyens hebdomadaires du porc poids vif
--              basés sur les listings du marketplace

-- Créer la table des tendances de prix hebdomadaires
CREATE TABLE IF NOT EXISTS weekly_pork_price_trends (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
  
  -- Prix moyens
  avg_price_platform NUMERIC, -- Prix moyen calculé depuis le marketplace (FCFA/kg)
  avg_price_regional NUMERIC, -- Prix régional de référence (FCFA/kg)
  
  -- Statistiques de la semaine
  transactions_count INTEGER DEFAULT 0,
  offers_count INTEGER DEFAULT 0,
  listings_count INTEGER DEFAULT 0,
  
  -- Source des données (platform, offers, listings, regional)
  source_priority TEXT CHECK (source_priority IN ('platform', 'offers', 'listings', 'regional')),
  
  -- Données agrégées
  total_weight_kg NUMERIC,
  total_price_fcfa NUMERIC,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Contrainte d'unicité pour éviter les doublons
  CONSTRAINT unique_year_week UNIQUE (year, week_number)
);

-- Index pour les requêtes par année et semaine
CREATE INDEX IF NOT EXISTS idx_weekly_pork_price_trends_year_week 
  ON weekly_pork_price_trends(year DESC, week_number DESC);

-- Index pour récupérer les N dernières semaines
CREATE INDEX IF NOT EXISTS idx_weekly_pork_price_trends_updated 
  ON weekly_pork_price_trends(updated_at DESC);

-- Commentaires
COMMENT ON TABLE weekly_pork_price_trends IS 'Tendances de prix hebdomadaires du porc poids vif calculées depuis le marketplace';
COMMENT ON COLUMN weekly_pork_price_trends.avg_price_platform IS 'Prix moyen FCFA/kg calculé depuis les transactions, offres et listings du marketplace';
COMMENT ON COLUMN weekly_pork_price_trends.avg_price_regional IS 'Prix régional de référence FCFA/kg';
COMMENT ON COLUMN weekly_pork_price_trends.source_priority IS 'Source principale des données: platform (transactions), offers, listings, ou regional (fallback)';
