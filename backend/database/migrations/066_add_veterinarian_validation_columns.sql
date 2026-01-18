-- Migration: Ajout des colonnes de validation pour les vétérinaires
-- Date: 2025-01-XX
-- Description: Ajoute les colonnes nécessaires pour la validation des vétérinaires (CNI, diplômes, statut)

-- Ajouter le statut de validation
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS veterinarian_validation_status VARCHAR(20) DEFAULT 'pending'
CHECK (veterinarian_validation_status IN ('pending', 'approved', 'rejected'));

-- Ajouter les URLs des documents
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cni_document_url TEXT;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS diploma_document_url TEXT;

-- Ajouter les flags de vérification
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cni_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS diploma_verified BOOLEAN DEFAULT FALSE;

-- Ajouter la raison de validation/rejet
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS validation_reason TEXT;

-- Ajouter la date de validation
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP;

-- Ajouter l'ID de l'admin qui a validé
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS validated_by TEXT REFERENCES admins(id) ON DELETE SET NULL;

-- Ajouter la date de soumission des documents
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS documents_submitted_at TIMESTAMP;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_veterinarian_validation_status 
ON users(veterinarian_validation_status) 
WHERE veterinarian_validation_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_validated_by 
ON users(validated_by) 
WHERE validated_by IS NOT NULL;

-- Commentaires pour documentation
COMMENT ON COLUMN users.veterinarian_validation_status IS 'Statut de validation du vétérinaire : pending, approved, rejected';
COMMENT ON COLUMN users.cni_document_url IS 'URL du document CNI (Carte Nationale d''Identité)';
COMMENT ON COLUMN users.diploma_document_url IS 'URL du document diplôme professionnel';
COMMENT ON COLUMN users.cni_verified IS 'Indique si le document CNI a été vérifié manuellement par un admin';
COMMENT ON COLUMN users.diploma_verified IS 'Indique si le document diplôme a été vérifié manuellement par un admin';
COMMENT ON COLUMN users.validation_reason IS 'Raison de validation ou de rejet du profil vétérinaire';
COMMENT ON COLUMN users.validated_at IS 'Date et heure de la validation du profil';
COMMENT ON COLUMN users.validated_by IS 'ID de l''administrateur qui a validé ou rejeté le profil';
COMMENT ON COLUMN users.documents_submitted_at IS 'Date de soumission des documents par le vétérinaire';
