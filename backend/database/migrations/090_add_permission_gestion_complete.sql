-- Migration 090: Ajouter la colonne permission_gestion_complete à collaborations
-- Date: 2026-01-23
-- Description: Ajoute la permission pour la gestion complète du projet

-- Ajouter la colonne permission_gestion_complete si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'permission_gestion_complete'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN permission_gestion_complete BOOLEAN DEFAULT false;
        COMMENT ON COLUMN collaborations.permission_gestion_complete IS 'Permission pour la gestion complète du projet (toutes les fonctionnalités)';
        RAISE NOTICE 'Colonne permission_gestion_complete ajoutée';
    END IF;
END $$;

-- Ajouter permission_cheptel si elle n'existe pas (nécessaire pour batch-pigs)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'permission_cheptel'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN permission_cheptel BOOLEAN DEFAULT false;
        COMMENT ON COLUMN collaborations.permission_cheptel IS 'Permission pour gérer le cheptel (animaux, bandes)';
        RAISE NOTICE 'Colonne permission_cheptel ajoutée';
    END IF;
END $$;

-- Ajouter permission_planification si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'permission_planification'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN permission_planification BOOLEAN DEFAULT false;
        COMMENT ON COLUMN collaborations.permission_planification IS 'Permission pour gérer les planifications';
        RAISE NOTICE 'Colonne permission_planification ajoutée';
    END IF;
END $$;

-- Ajouter permission_reproduction si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'permission_reproduction'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN permission_reproduction BOOLEAN DEFAULT false;
        COMMENT ON COLUMN collaborations.permission_reproduction IS 'Permission pour gérer la reproduction (gestations, sevrages)';
        RAISE NOTICE 'Colonne permission_reproduction ajoutée';
    END IF;
END $$;

-- Ajouter permission_sante si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'permission_sante'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN permission_sante BOOLEAN DEFAULT false;
        COMMENT ON COLUMN collaborations.permission_sante IS 'Permission pour gérer la santé (vaccinations, traitements)';
        RAISE NOTICE 'Colonne permission_sante ajoutée';
    END IF;
END $$;

-- Ajouter permission_finance si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'permission_finance'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN permission_finance BOOLEAN DEFAULT false;
        COMMENT ON COLUMN collaborations.permission_finance IS 'Permission pour consulter les finances';
        RAISE NOTICE 'Colonne permission_finance ajoutée';
    END IF;
END $$;

-- Index sur les permissions pour les requêtes de vérification
CREATE INDEX IF NOT EXISTS idx_collab_permissions
ON collaborations(permission_gestion_complete, permission_cheptel, permission_planification, permission_reproduction, permission_sante, permission_finance)
WHERE statut = 'actif';

-- Vérification finale
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'collaborations' 
    AND column_name IN ('permission_gestion_complete', 'permission_cheptel', 'permission_planification', 'permission_reproduction', 'permission_sante', 'permission_finance');
    
    RAISE NOTICE 'Migration 090: % colonnes de permission vérifiées/ajoutées', col_count;
END $$;
