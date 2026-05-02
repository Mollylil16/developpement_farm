-- Migration 096: add missing performance indexes for high-frequency lookup patterns
-- All use CREATE INDEX IF NOT EXISTS so running twice is safe.

-- Health/vaccination stats (getStatistiquesVaccinations, createRappelsAutomatiques)
CREATE INDEX IF NOT EXISTS idx_vaccinations_projet_id
  ON vaccinations (projet_id);

CREATE INDEX IF NOT EXISTS idx_maladies_projet_id
  ON maladies (projet_id);

-- Planifications (task listing by project + due date)
CREATE INDEX IF NOT EXISTS idx_planifications_projet_date
  ON planifications (projet_id, date_echeance);

-- Users filtered by role (admin dashboard, veterinarian listing)
CREATE INDEX IF NOT EXISTS idx_users_active_role
  ON users (active_role)
  WHERE active_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_active_role_is_active
  ON users (active_role, is_active);

-- Marketplace: seller's listings by status
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_producer_status
  ON marketplace_listings (producer_id, status);

-- Finance: queries filtered by project + date
CREATE INDEX IF NOT EXISTS idx_finance_revenus_projet_date
  ON finance_revenus (projet_id, date_creation);

CREATE INDEX IF NOT EXISTS idx_finance_depenses_projet_date
  ON finance_depenses (projet_id, date_creation);

-- Refresh tokens: lookup by user (complement to selector index from 095)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens (user_id)
  WHERE revoked = false;
