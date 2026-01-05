-- Migration: Rendre email optionnel dans collaborations et supporter invitations par téléphone
-- Date: 2025-01-10
-- Description: Permet d'envoyer des invitations avec email OU téléphone (au moins un requis)

-- Étape 1: Supprimer la contrainte NOT NULL sur email
ALTER TABLE collaborations 
ALTER COLUMN email DROP NOT NULL;

-- Étape 2: Ajouter une contrainte CHECK pour s'assurer qu'au moins email OU telephone est présent
ALTER TABLE collaborations
ADD CONSTRAINT check_email_or_telephone 
CHECK (email IS NOT NULL OR telephone IS NOT NULL);

-- Étape 3: Créer un index sur telephone pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_collaborations_telephone 
ON collaborations(telephone) 
WHERE telephone IS NOT NULL;

-- Commentaire pour documentation
COMMENT ON CONSTRAINT check_email_or_telephone ON collaborations IS 
'Garantit qu''au moins un identifiant (email ou telephone) est fourni pour identifier le destinataire de l''invitation';

