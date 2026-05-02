-- Migration: Création de la table admins
-- Date: 2025-01-XX
-- Description: Table pour stocker les administrateurs du dashboard
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);
-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_admins_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Supprimer le trigger s'il existe déjà avant de le créer
DROP TRIGGER IF EXISTS trigger_update_admins_updated_at ON admins;
CREATE TRIGGER trigger_update_admins_updated_at BEFORE
UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_admins_updated_at();
-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);
-- Commentaires pour documentation
COMMENT ON TABLE admins IS 'Table pour stocker les administrateurs du dashboard';
COMMENT ON COLUMN admins.password_hash IS 'Hash bcrypt du mot de passe';
COMMENT ON COLUMN admins.is_active IS 'Indique si le compte admin est actif';