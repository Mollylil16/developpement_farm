-- Migration: Ajout des colonnes manquantes à la table users
-- Date: 2025-01-08
-- Description: Ajoute les colonnes roles, saved_farms, active_role, is_onboarded, onboarding_completed_at

-- Ajouter saved_farms (JSON array of farm IDs)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS saved_farms TEXT;

-- Ajouter roles (JSON object)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS roles TEXT;

-- Ajouter active_role
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS active_role TEXT;

-- Ajouter is_onboarded
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE;

-- Ajouter onboarding_completed_at
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;

-- Commentaires pour documentation
COMMENT ON COLUMN users.roles IS 'JSON object contenant les rôles de l''utilisateur (producteur, acheteur, etc.)';
COMMENT ON COLUMN users.saved_farms IS 'JSON array contenant les IDs des fermes favorites';
COMMENT ON COLUMN users.active_role IS 'Rôle actif de l''utilisateur (producteur, acheteur, veterinaire, technicien)';
COMMENT ON COLUMN users.is_onboarded IS 'Indique si l''utilisateur a terminé l''onboarding';
COMMENT ON COLUMN users.onboarding_completed_at IS 'Date de fin de l''onboarding';

