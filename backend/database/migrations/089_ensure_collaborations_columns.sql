-- Migration 089: S'assurer que toutes les colonnes nécessaires existent dans collaborations
-- Date: 2026-01-23
-- Description: Migration de consolidation pour ajouter les colonnes manquantes de façon idempotente

-- Colonne profile_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'profile_id'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN profile_id TEXT;
        COMMENT ON COLUMN collaborations.profile_id IS 'ID du profil spécifique (ex: profile_user123_veterinarian)';
        RAISE NOTICE 'Colonne profile_id ajoutée';
    END IF;
END $$;

-- Colonne invited_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'invited_by'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN invited_by VARCHAR(255);
        COMMENT ON COLUMN collaborations.invited_by IS 'ID de l''utilisateur qui a envoyé l''invitation';
        RAISE NOTICE 'Colonne invited_by ajoutée';
    END IF;
END $$;

-- Colonne qr_scan_data
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'qr_scan_data'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN qr_scan_data JSONB;
        COMMENT ON COLUMN collaborations.qr_scan_data IS 'Métadonnées du scan QR code (JSON)';
        RAISE NOTICE 'Colonne qr_scan_data ajoutée';
    END IF;
END $$;

-- Colonne expiration_date
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'expiration_date'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN expiration_date TIMESTAMP;
        COMMENT ON COLUMN collaborations.expiration_date IS 'Date d''expiration de l''invitation';
        RAISE NOTICE 'Colonne expiration_date ajoutée';
    END IF;
END $$;

-- Colonne invitation_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'invitation_type'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN invitation_type VARCHAR(20) DEFAULT 'manual';
        COMMENT ON COLUMN collaborations.invitation_type IS 'Type d''invitation: manual, qr_scan, email, sms, telephone';
        RAISE NOTICE 'Colonne invitation_type ajoutée';
    END IF;
END $$;

-- Colonne notes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'notes'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN notes TEXT;
        COMMENT ON COLUMN collaborations.notes IS 'Notes optionnelles sur la collaboration';
        RAISE NOTICE 'Colonne notes ajoutée';
    END IF;
END $$;

-- Colonne date_invitation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'date_invitation'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN date_invitation TIMESTAMP;
        COMMENT ON COLUMN collaborations.date_invitation IS 'Date d''envoi de l''invitation';
        RAISE NOTICE 'Colonne date_invitation ajoutée';
    END IF;
END $$;

-- Colonne date_acceptation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'collaborations' AND column_name = 'date_acceptation'
    ) THEN
        ALTER TABLE collaborations ADD COLUMN date_acceptation TIMESTAMP;
        COMMENT ON COLUMN collaborations.date_acceptation IS 'Date d''acceptation de l''invitation';
        RAISE NOTICE 'Colonne date_acceptation ajoutée';
    END IF;
END $$;

-- Index sur profile_id
CREATE INDEX IF NOT EXISTS idx_collaborations_profile_id 
ON collaborations(profile_id) 
WHERE profile_id IS NOT NULL;

-- Index sur invited_by
CREATE INDEX IF NOT EXISTS idx_collab_invited_by
ON collaborations(invited_by)
WHERE invited_by IS NOT NULL;

-- Index GIN sur qr_scan_data
CREATE INDEX IF NOT EXISTS idx_collab_qr_scan_data
ON collaborations USING GIN (qr_scan_data)
WHERE qr_scan_data IS NOT NULL;

-- Index sur expiration_date
CREATE INDEX IF NOT EXISTS idx_collaborations_expiration_date 
ON collaborations(expiration_date) 
WHERE expiration_date IS NOT NULL;

-- Index composite pour le nettoyage des invitations expirées
CREATE INDEX IF NOT EXISTS idx_collaborations_statut_expiration 
ON collaborations(statut, expiration_date) 
WHERE statut = 'en_attente' AND expiration_date IS NOT NULL;

-- Contrainte CHECK sur invitation_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'collaborations' 
        AND constraint_name = 'collaborations_invitation_type_check'
    ) THEN
        ALTER TABLE collaborations
        ADD CONSTRAINT collaborations_invitation_type_check 
        CHECK (invitation_type IN ('manual', 'qr_scan', 'email', 'sms', 'telephone'));
        RAISE NOTICE 'Contrainte invitation_type_check ajoutée';
    END IF;
EXCEPTION 
    WHEN duplicate_object THEN
        RAISE NOTICE 'Contrainte invitation_type_check existe déjà';
END $$;

-- Contrainte CHECK sur statut (inclure 'expire')
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    -- Vérifier si la contrainte existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'collaborations' 
        AND constraint_name = 'collaborations_statut_check'
    ) INTO constraint_exists;

    IF constraint_exists THEN
        -- Vérifier si 'expire' est inclus
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_name = 'collaborations_statut_check'
            AND check_clause LIKE '%expire%'
        ) THEN
            ALTER TABLE collaborations DROP CONSTRAINT collaborations_statut_check;
            ALTER TABLE collaborations
            ADD CONSTRAINT collaborations_statut_check 
            CHECK (statut IN ('actif', 'inactif', 'en_attente', 'expire'));
            RAISE NOTICE 'Contrainte statut_check mise à jour';
        END IF;
    ELSE
        ALTER TABLE collaborations
        ADD CONSTRAINT collaborations_statut_check 
        CHECK (statut IN ('actif', 'inactif', 'en_attente', 'expire'));
        RAISE NOTICE 'Contrainte statut_check créée';
    END IF;
EXCEPTION 
    WHEN duplicate_object THEN
        RAISE NOTICE 'Contrainte statut_check existe déjà avec les bonnes valeurs';
END $$;

-- Vérification finale
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'collaborations' 
    AND column_name IN ('profile_id', 'invited_by', 'qr_scan_data', 'expiration_date', 'invitation_type', 'notes', 'date_invitation', 'date_acceptation');
    
    RAISE NOTICE 'Migration 089: % colonnes vérifiées/ajoutées pour collaborations', col_count;
END $$;
