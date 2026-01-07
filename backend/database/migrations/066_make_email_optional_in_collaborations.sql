-- Migration: Rendre email optionnel dans collaborations et supporter invitations par téléphone
-- Date: 2025-01-10
-- Description: Permet d'envoyer des invitations avec email OU téléphone (au moins un requis)

-- Étape 1: Supprimer la contrainte NOT NULL sur email (si elle existe)
DO $$
BEGIN
    -- Vérifier si la colonne email a une contrainte NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'collaborations' 
        AND column_name = 'email' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE collaborations ALTER COLUMN email DROP NOT NULL;
    END IF;
END $$;

-- Étape 2: Ajouter une contrainte CHECK pour s'assurer qu'au moins email OU telephone est présent
-- (seulement si elle n'existe pas déjà)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'collaborations' 
        AND constraint_name = 'check_email_or_telephone'
    ) THEN
        ALTER TABLE collaborations
        ADD CONSTRAINT check_email_or_telephone 
        CHECK (email IS NOT NULL OR telephone IS NOT NULL);
    END IF;
END $$;

-- Étape 3: Créer un index sur telephone pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_collaborations_telephone 
ON collaborations(telephone) 
WHERE telephone IS NOT NULL;

-- Commentaire pour documentation (seulement si la contrainte existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'collaborations' 
        AND constraint_name = 'check_email_or_telephone'
    ) THEN
        COMMENT ON CONSTRAINT check_email_or_telephone ON collaborations IS 
        'Garantit qu''au moins un identifiant (email ou telephone) est fourni pour identifier le destinataire de l''invitation';
    END IF;
END $$;

