-- Migration: Enrichissement de collaboration_history pour l'audit
-- Date: 2025-01-XX
-- Description: Ajoute device_info, action_metadata, et profile_id pour améliorer l'audit

-- Ajouter la colonne device_info (JSONB pour stocker les informations du device)
ALTER TABLE collaboration_history
ADD COLUMN IF NOT EXISTS device_info JSONB;

-- Ajouter la colonne action_metadata (JSONB pour stocker les métadonnées spécifiques à l'action)
ALTER TABLE collaboration_history
ADD COLUMN IF NOT EXISTS action_metadata JSONB;

-- Ajouter la colonne profile_id pour identifier le profil de l'utilisateur qui a effectué l'action
ALTER TABLE collaboration_history
ADD COLUMN IF NOT EXISTS profile_id VARCHAR(255);

-- Ajouter un index sur profile_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_collab_history_profile_id ON collaboration_history(profile_id);

-- Commentaires pour documentation
COMMENT ON COLUMN collaboration_history.device_info IS 'Informations du device (plateforme, OS, version app)';
COMMENT ON COLUMN collaboration_history.action_metadata IS 'Métadonnées spécifiques à l''action (ex: permissions définies, raison du rejet, etc.)';
COMMENT ON COLUMN collaboration_history.profile_id IS 'ID du profil de l''utilisateur qui a effectué l''action (ex: profile_user123_veterinarian)';
