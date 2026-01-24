-- Migration: Ajout de profileId dans collaborations
-- Date: 2026-01-18
-- Description: Ajoute la colonne profile_id pour identifier le profil spécifique (vétérinaire/technicien) 
--              au lieu de seulement user_id. Cela permet de différencier les profils d'un même utilisateur.

-- Ajouter la colonne profile_id
ALTER TABLE collaborations
ADD COLUMN IF NOT EXISTS profile_id TEXT;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_collaborations_profile_id 
ON collaborations(profile_id) 
WHERE profile_id IS NOT NULL;

-- Ajouter une contrainte unique sur (projet_id, profile_id) pour éviter les doublons
-- Note: On ne peut pas ajouter directement UNIQUE car il peut y avoir des valeurs NULL
-- On utilisera une contrainte unique partielle dans le code applicatif

-- Commentaire pour documentation
COMMENT ON COLUMN collaborations.profile_id IS 'ID du profil spécifique (ex: profile_user123_veterinarian). Permet de différencier les profils d''un même utilisateur.';
