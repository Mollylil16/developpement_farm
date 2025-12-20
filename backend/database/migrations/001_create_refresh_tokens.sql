-- Migration: Création de la table refresh_tokens
-- Date: 2025-01-08
-- Description: Table pour stocker les tokens de rafraîchissement JWT
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  CONSTRAINT unique_active_token UNIQUE (user_id, token_hash)
);
-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked ON refresh_tokens(user_id, revoked);
-- Ajouter last_login à la table users si elle n'existe pas
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
-- Commentaires pour documentation
COMMENT ON TABLE refresh_tokens IS 'Table pour stocker les tokens de rafraîchissement JWT';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Hash bcrypt du token (jamais stocké en clair)';
COMMENT ON COLUMN refresh_tokens.revoked IS 'Indique si le token a été révoqué (logout)';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Date d''expiration du token (7 jours par défaut)';