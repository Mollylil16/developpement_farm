-- Migration: Ajouter expiration_date et statut 'expire' à la table collaborations
-- Date: 2025-01-XX
-- Description: Ajoute la gestion de l'expiration des invitations (7 jours par défaut)

-- Étape 1: Ajouter la colonne expiration_date (TIMESTAMP, nullable)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'collaborations' 
        AND column_name = 'expiration_date'
    ) THEN
        ALTER TABLE collaborations 
        ADD COLUMN expiration_date TIMESTAMP;
        
        COMMENT ON COLUMN collaborations.expiration_date IS 
        'Date d''expiration de l''invitation. Les invitations expirent après 7 jours par défaut.';
    END IF;
END $$;

-- Étape 2: Mettre à jour le CHECK constraint pour inclure le statut 'expire'
DO $$
BEGIN
    -- Supprimer l'ancienne contrainte si elle existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'collaborations' 
        AND constraint_name = 'collaborations_statut_check'
    ) THEN
        ALTER TABLE collaborations 
        DROP CONSTRAINT collaborations_statut_check;
    END IF;
    
    -- Ajouter la nouvelle contrainte avec 'expire'
    ALTER TABLE collaborations
    ADD CONSTRAINT collaborations_statut_check 
    CHECK (statut IN ('actif', 'inactif', 'en_attente', 'expire'));
END $$;

-- Étape 3: Créer un index sur expiration_date pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_collaborations_expiration_date 
ON collaborations(expiration_date) 
WHERE expiration_date IS NOT NULL;

-- Étape 4: Créer un index composite pour les requêtes de nettoyage
CREATE INDEX IF NOT EXISTS idx_collaborations_statut_expiration 
ON collaborations(statut, expiration_date) 
WHERE statut = 'en_attente' AND expiration_date IS NOT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN collaborations.expiration_date IS 
'Date d''expiration de l''invitation. Les invitations expirent après 7 jours par défaut. NULL signifie que l''invitation n''expire pas (pour les anciennes invitations).';
