-- ROLLBACK: Migration 080 - Amélioration complète des collaborations avec support QR code
-- Date: 2025-01-XX
-- Description: Script pour annuler les modifications de la migration 080
-- ⚠️ ATTENTION: Ce script supprime les données et structures créées. Utilisez avec précaution.

-- ============================================
-- PARTIE 1: Supprimer les triggers et fonctions
-- ============================================

DROP TRIGGER IF EXISTS trg_collab_last_activity ON collaborations;
DROP FUNCTION IF EXISTS update_collaboration_last_activity();
DROP FUNCTION IF EXISTS cleanup_expired_invitations();

-- ============================================
-- PARTIE 2: Supprimer les index uniques
-- ============================================

DROP INDEX IF EXISTS idx_collab_unique_user_projet;
DROP INDEX IF EXISTS idx_collab_unique_email_projet;
DROP INDEX IF EXISTS idx_collab_unique_telephone_projet;

-- ============================================
-- PARTIE 3: Supprimer les index de performance
-- ============================================

DROP INDEX IF EXISTS idx_collab_projet_statut;
DROP INDEX IF EXISTS idx_collab_user_statut;
DROP INDEX IF EXISTS idx_collab_expiration;
DROP INDEX IF EXISTS idx_collab_invitation_type;
DROP INDEX IF EXISTS idx_collab_invited_by;
DROP INDEX IF EXISTS idx_collab_qr_scan_data;
DROP INDEX IF EXISTS idx_collab_last_activity;

-- ============================================
-- PARTIE 4: Supprimer les contraintes CHECK
-- ============================================

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
    
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'collaborations'
        AND constraint_name = 'collaborations_invitation_type_check'
    ) THEN
        ALTER TABLE collaborations
        DROP CONSTRAINT collaborations_invitation_type_check;
    END IF;
END $$;

-- ============================================
-- PARTIE 5: Supprimer les colonnes ajoutées
-- ⚠️ ATTENTION: Cela supprimera les données dans ces colonnes
-- ============================================

-- Supprimer les colonnes dans l'ordre inverse de leur création
DO $$
BEGIN
    -- last_activity
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'last_activity'
    ) THEN
        ALTER TABLE collaborations
        DROP COLUMN last_activity;
    END IF;
    
    -- suspension_reason
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'suspension_reason'
    ) THEN
        ALTER TABLE collaborations
        DROP COLUMN suspension_reason;
    END IF;
    
    -- rejection_reason
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE collaborations
        DROP COLUMN rejection_reason;
    END IF;
    
    -- expiration_date
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'expiration_date'
    ) THEN
        ALTER TABLE collaborations
        DROP COLUMN expiration_date;
    END IF;
    
    -- qr_scan_data
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'qr_scan_data'
    ) THEN
        ALTER TABLE collaborations
        DROP COLUMN qr_scan_data;
    END IF;
    
    -- invited_by
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'invited_by'
    ) THEN
        ALTER TABLE collaborations
        DROP COLUMN invited_by;
    END IF;
    
    -- invitation_type
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'collaborations'
        AND column_name = 'invitation_type'
    ) THEN
        ALTER TABLE collaborations
        DROP COLUMN invitation_type;
    END IF;
END $$;

-- ============================================
-- PARTIE 6: Restaurer l'ancienne contrainte statut
-- ============================================

-- Remettre les valeurs 'rejete' en 'inactif' si nécessaire
-- (Optionnel - commentez si vous voulez garder 'rejete')
-- UPDATE collaborations SET statut = 'inactif' WHERE statut = 'rejete';

-- Restaurer l'ancienne contrainte CHECK (si nécessaire)
-- ALTER TABLE collaborations
-- ADD CONSTRAINT collaborations_statut_check
-- CHECK (statut IN ('actif', 'inactif', 'en_attente'));

-- ============================================
-- PARTIE 7: Restaurer les contraintes de collaboration_history
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'collaboration_history'
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_name = 'collaboration_history'
            AND constraint_name = 'collaboration_history_action_check'
        ) THEN
            ALTER TABLE collaboration_history
            DROP CONSTRAINT collaboration_history_action_check;
        END IF;
        
        -- Restaurer l'ancienne contrainte (sans 'qr_scanned')
        ALTER TABLE collaboration_history
        ADD CONSTRAINT collaboration_history_action_check
        CHECK (action IN ('invited', 'accepted', 'rejected', 'permission_changed', 'removed', 'linked', 'updated', 'expired'));
    END IF;
END $$;

-- ============================================
-- PARTIE 8: Restaurer les contraintes de notifications
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'notifications'
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_name = 'notifications'
            AND constraint_name = 'notifications_type_check'
        ) THEN
            ALTER TABLE notifications
            DROP CONSTRAINT notifications_type_check;
        END IF;
        
        -- Restaurer l'ancienne contrainte (sans 'qr_scan_success')
        -- Note: Ajustez selon votre contrainte originale
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
            'other'
        ));
    END IF;
END $$;

-- ============================================
-- FIN DU ROLLBACK
-- ============================================

-- ⚠️ NOTES IMPORTANTES:
-- 1. Ce script supprime les données dans les colonnes ajoutées
-- 2. Les index uniques seront supprimés, permettant à nouveau les doublons
-- 3. Les fonctions et triggers seront supprimés
-- 4. Les contraintes CHECK seront restaurées aux valeurs précédentes
-- 5. Vérifiez que vous avez une sauvegarde avant d'exécuter ce rollback
