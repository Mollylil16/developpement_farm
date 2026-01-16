-- Migration: Ajouter le support QR scan aux collaborations
-- Date: 2025-01-XX
-- Description: Ajoute les colonnes invitation_type et qr_scan_data pour traçabilité des invitations QR

-- Étape 1: Ajouter la colonne invitation_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'invitation_type'
    ) THEN
        ALTER TABLE collaborations
        ADD COLUMN invitation_type VARCHAR(20) DEFAULT 'manual';

        COMMENT ON COLUMN collaborations.invitation_type IS
        'Type d''invitation: manual (invitation manuelle), qr_scan (via scan QR code), email (via email), sms (via SMS)';
    END IF;
END $$;

-- Étape 2: Ajouter la colonne qr_scan_data (JSONB pour stocker les métadonnées du scan)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'qr_scan_data'
    ) THEN
        ALTER TABLE collaborations
        ADD COLUMN qr_scan_data JSONB;

        COMMENT ON COLUMN collaborations.qr_scan_data IS
        'Métadonnées du scan QR: timestamp, ip_address, user_agent, scanner_id';
    END IF;
END $$;

-- Étape 3: Ajouter une contrainte CHECK pour invitation_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'collaborations'
        AND constraint_name = 'collaborations_invitation_type_check'
    ) THEN
        ALTER TABLE collaborations
        ADD CONSTRAINT collaborations_invitation_type_check
        CHECK (invitation_type IN ('manual', 'qr_scan', 'email', 'sms'));
    END IF;
END $$;

-- Étape 4: Créer un index sur invitation_type pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_collaborations_invitation_type
ON collaborations(invitation_type)
WHERE invitation_type IS NOT NULL;

-- Étape 5: Créer un index GIN sur qr_scan_data pour les requêtes JSONB
CREATE INDEX IF NOT EXISTS idx_collaborations_qr_scan_data
ON collaborations USING GIN (qr_scan_data)
WHERE qr_scan_data IS NOT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN collaborations.invitation_type IS
'Type d''invitation: manual (invitation manuelle), qr_scan (via scan QR code), email (via email), sms (via SMS). Défaut: manual';

COMMENT ON COLUMN collaborations.qr_scan_data IS
'Métadonnées du scan QR code au format JSON: { timestamp, ip_address, user_agent, scanner_id }. NULL si invitation_type != qr_scan';
