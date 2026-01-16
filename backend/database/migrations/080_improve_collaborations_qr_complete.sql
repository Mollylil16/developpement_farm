-- Migration: Amélioration complète des collaborations avec support QR code
-- Date: 2025-01-XX
-- Description: 
-- 1. Ajoute toutes les colonnes manquantes (invitation_type, invited_by, qr_scan_data, etc.)
-- 2. Met à jour les contraintes et index pour performance et sécurité
-- 3. Ajoute les contraintes d'unicité pour éviter les doublons
-- 4. Crée les fonctions et triggers pour automatisation
-- 5. Met à jour collaboration_history et notifications si nécessaire

-- ============================================
-- PARTIE 1: Ajout des colonnes manquantes
-- ============================================

-- invitation_type
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
        'Type d''invitation: manual (manuelle), email (via email), telephone (via SMS), qr_scan (via scan QR code)';
    END IF;
END $$;

-- invited_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'invited_by'
    ) THEN
        ALTER TABLE collaborations
        ADD COLUMN invited_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN collaborations.invited_by IS
        'ID de l''utilisateur qui a créé l''invitation';
    END IF;
END $$;

-- qr_scan_data
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
        'Métadonnées du scan QR: { timestamp, ip_address, user_agent, scanner_id }';
    END IF;
END $$;

-- expiration_date (déjà ajouté dans 076, mais on vérifie)
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
        'Date d''expiration de l''invitation. NULL pour les collaborations actives ou QR scan';
    END IF;
END $$;

-- last_activity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'last_activity'
    ) THEN
        ALTER TABLE collaborations
        ADD COLUMN last_activity TIMESTAMP DEFAULT NOW();
        
        COMMENT ON COLUMN collaborations.last_activity IS
        'Date de la dernière activité du collaborateur sur le projet';
    END IF;
END $$;

-- rejection_reason (déjà ajouté dans 078, mais on vérifie)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE collaborations
        ADD COLUMN rejection_reason TEXT;
        
        COMMENT ON COLUMN collaborations.rejection_reason IS
        'Raison du rejet de l''invitation (optionnel)';
    END IF;
END $$;

-- suspension_reason (déjà ajouté dans 078, mais on vérifie)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'suspension_reason'
    ) THEN
        ALTER TABLE collaborations
        ADD COLUMN suspension_reason TEXT;
        
        COMMENT ON COLUMN collaborations.suspension_reason IS
        'Raison de la suspension du collaborateur (optionnel)';
    END IF;
END $$;

-- ============================================
-- PARTIE 2: Mise à jour de la colonne statut
-- ============================================

-- Supprimer l'ancienne contrainte si elle existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'collaborations'
        AND constraint_name = 'collaborations_statut_check'
    ) THEN
        ALTER TABLE collaborations
        DROP CONSTRAINT collaborations_statut_check;
    END IF;
END $$;

-- Modifier le type de colonne si nécessaire
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'statut'
        AND data_type != 'character varying'
    ) THEN
        ALTER TABLE collaborations
        ALTER COLUMN statut TYPE VARCHAR(20);
    END IF;
END $$;

-- Mettre à jour les valeurs existantes (inactif -> rejete)
UPDATE collaborations
SET statut = 'rejete'
WHERE statut = 'inactif';

-- Ajouter la nouvelle contrainte CHECK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'collaborations'
        AND constraint_name = 'collaborations_statut_check'
    ) THEN
        ALTER TABLE collaborations
        ADD CONSTRAINT collaborations_statut_check
        CHECK (statut IN ('actif', 'en_attente', 'rejete', 'expire', 'suspendu'));
    END IF;
END $$;

-- Ajouter la contrainte CHECK pour invitation_type
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
        CHECK (invitation_type IN ('manual', 'email', 'telephone', 'qr_scan'));
    END IF;
END $$;

-- ============================================
-- PARTIE 3: Contraintes d'unicité (anti-doublons)
-- ============================================

-- Empêcher les doublons par user_id (uniquement pour actif/en_attente)
DROP INDEX IF EXISTS idx_collab_unique_user_projet;
CREATE UNIQUE INDEX idx_collab_unique_user_projet
ON collaborations(projet_id, user_id)
WHERE user_id IS NOT NULL AND statut IN ('actif', 'en_attente');

-- Empêcher les doublons par email (uniquement pour actif/en_attente)
DROP INDEX IF EXISTS idx_collab_unique_email_projet;
CREATE UNIQUE INDEX idx_collab_unique_email_projet
ON collaborations(projet_id, email)
WHERE email IS NOT NULL AND statut IN ('actif', 'en_attente');

-- Empêcher les doublons par téléphone (uniquement pour actif/en_attente)
DROP INDEX IF EXISTS idx_collab_unique_telephone_projet;
CREATE UNIQUE INDEX idx_collab_unique_telephone_projet
ON collaborations(projet_id, telephone)
WHERE telephone IS NOT NULL AND statut IN ('actif', 'en_attente');

-- ============================================
-- PARTIE 4: Index de performance
-- ============================================

-- Index composite projet + statut
CREATE INDEX IF NOT EXISTS idx_collab_projet_statut
ON collaborations(projet_id, statut);

-- Index composite user + statut
CREATE INDEX IF NOT EXISTS idx_collab_user_statut
ON collaborations(user_id, statut)
WHERE user_id IS NOT NULL;

-- Index sur expiration_date (pour les invitations en attente)
CREATE INDEX IF NOT EXISTS idx_collab_expiration
ON collaborations(expiration_date)
WHERE statut = 'en_attente' AND expiration_date IS NOT NULL;

-- Index sur invitation_type
CREATE INDEX IF NOT EXISTS idx_collab_invitation_type
ON collaborations(invitation_type)
WHERE invitation_type IS NOT NULL;

-- Index sur invited_by
CREATE INDEX IF NOT EXISTS idx_collab_invited_by
ON collaborations(invited_by)
WHERE invited_by IS NOT NULL;

-- Index GIN sur qr_scan_data pour requêtes JSONB
CREATE INDEX IF NOT EXISTS idx_collab_qr_scan_data
ON collaborations USING GIN (qr_scan_data)
WHERE qr_scan_data IS NOT NULL;

-- Index sur last_activity
CREATE INDEX IF NOT EXISTS idx_collab_last_activity
ON collaborations(last_activity DESC)
WHERE last_activity IS NOT NULL;

-- ============================================
-- PARTIE 5: Mise à jour de collaboration_history
-- ============================================

-- Ajouter l'action 'qr_scanned' si elle n'existe pas déjà dans la contrainte
DO $$
BEGIN
    -- Vérifier si la table existe
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'collaboration_history'
    ) THEN
        -- Supprimer l'ancienne contrainte si elle existe
        IF EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_name = 'collaboration_history'
            AND constraint_name = 'collaboration_history_action_check'
        ) THEN
            ALTER TABLE collaboration_history
            DROP CONSTRAINT collaboration_history_action_check;
        END IF;
        
        -- Ajouter la nouvelle contrainte avec 'qr_scanned'
        ALTER TABLE collaboration_history
        ADD CONSTRAINT collaboration_history_action_check
        CHECK (action IN ('invited', 'accepted', 'rejected', 'permission_changed', 'removed', 'linked', 'updated', 'expired', 'qr_scanned'));
    END IF;
END $$;

-- ============================================
-- PARTIE 6: Mise à jour de notifications
-- ============================================

-- Ajouter le type 'qr_scan_success' si nécessaire
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'notifications'
    ) THEN
        -- Supprimer l'ancienne contrainte si elle existe
        IF EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_name = 'notifications'
            AND constraint_name = 'notifications_type_check'
        ) THEN
            ALTER TABLE notifications
            DROP CONSTRAINT notifications_type_check;
        END IF;
        
        -- Ajouter la nouvelle contrainte avec 'qr_scan_success'
        ALTER TABLE notifications
        ADD CONSTRAINT notifications_type_check
        CHECK (type IN (
            'invitation_received',
            'invitation_accepted',
            'invitation_rejected',
            'invitation_expired',
            'permission_changed',
            'collaboration_removed',
            'project_shared',
            'qr_scan_success',
            'other'
        ));
    END IF;
END $$;

-- ============================================
-- PARTIE 7: Fonction pour nettoyer les invitations expirées
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE collaborations
    SET statut = 'expire',
        derniere_modification = NOW()
    WHERE statut = 'en_attente'
      AND expiration_date IS NOT NULL
      AND expiration_date < NOW();
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_invitations() IS
'Fonction pour marquer automatiquement les invitations expirées. Retourne le nombre d''invitations expirées.';

-- ============================================
-- PARTIE 8: Trigger pour mettre à jour last_activity
-- ============================================

-- Supprimer le trigger et la fonction s'ils existent déjà
DROP TRIGGER IF EXISTS trg_collab_last_activity ON collaborations;
DROP FUNCTION IF EXISTS update_collaboration_last_activity();

-- Créer la fonction
CREATE OR REPLACE FUNCTION update_collaboration_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour last_activity uniquement si le statut change vers 'actif'
    -- ou si c'est une mise à jour de permissions/role
    IF NEW.statut = 'actif' AND (OLD.statut IS NULL OR OLD.statut != 'actif') THEN
        NEW.last_activity := NOW();
    ELSIF NEW.statut = 'actif' AND (
        OLD.permission_reproduction != NEW.permission_reproduction OR
        OLD.permission_nutrition != NEW.permission_nutrition OR
        OLD.permission_finance != NEW.permission_finance OR
        OLD.permission_rapports != NEW.permission_rapports OR
        OLD.permission_planification != NEW.permission_planification OR
        OLD.permission_mortalites != NEW.permission_mortalites OR
        OLD.permission_sante != NEW.permission_sante OR
        OLD.role != NEW.role
    ) THEN
        NEW.last_activity := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
CREATE TRIGGER trg_collab_last_activity
BEFORE UPDATE ON collaborations
FOR EACH ROW
EXECUTE FUNCTION update_collaboration_last_activity();

COMMENT ON FUNCTION update_collaboration_last_activity() IS
'Fonction trigger pour mettre à jour automatiquement last_activity lors des changements de statut ou permissions';

-- ============================================
-- PARTIE 9: Commentaires finaux
-- ============================================

COMMENT ON TABLE collaborations IS
'Table des collaborations entre utilisateurs et projets. Supporte les invitations manuelles, email, SMS et QR code.';

COMMENT ON COLUMN collaborations.invitation_type IS
'Type d''invitation: manual (manuelle), email (via email), telephone (via SMS), qr_scan (via scan QR code). Défaut: manual';

COMMENT ON COLUMN collaborations.invited_by IS
'ID de l''utilisateur qui a créé l''invitation. NULL pour les anciennes invitations.';

COMMENT ON COLUMN collaborations.qr_scan_data IS
'Métadonnées du scan QR code au format JSON: { timestamp, ip_address, user_agent, scanner_id }. NULL si invitation_type != qr_scan';

COMMENT ON COLUMN collaborations.last_activity IS
'Date de la dernière activité du collaborateur sur le projet. Mis à jour automatiquement par trigger.';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
