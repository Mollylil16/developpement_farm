-- Migration 088: Correction - S'assurer que expiration_date existe dans collaborations
-- Date: 2026-01-23
-- Description: Vérifie et ajoute la colonne expiration_date si elle n'existe pas
--              Cette migration corrige l'erreur "column expiration_date does not exist"

-- Étape 1: Ajouter la colonne expiration_date si elle n'existe pas
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
        'Date d''expiration de l''invitation. Les invitations expirent après 7 jours par défaut. NULL signifie que l''invitation n''expire pas (pour les anciennes invitations).';
        
        RAISE NOTICE 'Colonne expiration_date ajoutée à la table collaborations';
    ELSE
        RAISE NOTICE 'Colonne expiration_date existe déjà dans la table collaborations';
    END IF;
END $$;

-- Étape 2: Créer un index sur expiration_date si nécessaire
CREATE INDEX IF NOT EXISTS idx_collaborations_expiration_date 
ON collaborations(expiration_date) 
WHERE expiration_date IS NOT NULL;

-- Étape 3: Créer un index composite pour les requêtes de nettoyage si nécessaire
CREATE INDEX IF NOT EXISTS idx_collaborations_statut_expiration 
ON collaborations(statut, expiration_date) 
WHERE statut = 'en_attente' AND expiration_date IS NOT NULL;

-- Étape 4: Mettre à jour le CHECK constraint pour inclure le statut 'expire' si nécessaire
DO $$
BEGIN
    -- Vérifier si la contrainte existe et si elle contient 'expire'
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'collaborations' 
        AND constraint_name = 'collaborations_statut_check'
    ) THEN
        -- Vérifier si 'expire' est dans les valeurs autorisées
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.check_constraints 
            WHERE constraint_name = 'collaborations_statut_check'
            AND check_clause LIKE '%expire%'
        ) THEN
            -- Supprimer l'ancienne contrainte
            ALTER TABLE collaborations 
            DROP CONSTRAINT collaborations_statut_check;
            
            -- Ajouter la nouvelle contrainte avec 'expire'
            ALTER TABLE collaborations
            ADD CONSTRAINT collaborations_statut_check 
            CHECK (statut IN ('actif', 'inactif', 'en_attente', 'expire'));
            
            RAISE NOTICE 'Contrainte collaborations_statut_check mise à jour pour inclure ''expire''';
        ELSE
            RAISE NOTICE 'Contrainte collaborations_statut_check contient déjà ''expire''';
        END IF;
    ELSE
        -- Ajouter la contrainte si elle n'existe pas
        ALTER TABLE collaborations
        ADD CONSTRAINT collaborations_statut_check 
        CHECK (statut IN ('actif', 'inactif', 'en_attente', 'expire'));
        
        RAISE NOTICE 'Contrainte collaborations_statut_check créée avec ''expire''';
    END IF;
END $$;
