-- Migration: Création de la table users
-- Date: 2025-01-08
-- Description: Table pour stocker les utilisateurs (compatible avec le frontend)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  telephone TEXT UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  password_hash TEXT,
  provider TEXT NOT NULL DEFAULT 'email' CHECK (provider IN ('email', 'google', 'apple', 'telephone')),
  provider_id TEXT,
  photo TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_connexion TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  saved_farms TEXT, -- JSON array of farm IDs
  -- 🆕 Colonnes pour le système multi-rôles
  roles TEXT, -- JSON object
  active_role TEXT,
  is_onboarded BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMP,
  
  -- Contrainte: au moins email ou téléphone doit être fourni
  CONSTRAINT check_email_or_telephone CHECK (email IS NOT NULL OR telephone IS NOT NULL)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_telephone ON users(telephone);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);

-- Commentaires pour documentation
COMMENT ON TABLE users IS 'Table pour stocker les utilisateurs de l''application';
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt du mot de passe (optionnel)';
COMMENT ON COLUMN users.roles IS 'JSON object contenant les rôles de l''utilisateur (producteur, acheteur, etc.)';
COMMENT ON COLUMN users.saved_farms IS 'JSON array contenant les IDs des fermes favorites';

