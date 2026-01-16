-- Migration: Mise à jour des statuts collaborations et création de la table notifications
-- Date: 2025-01-XX
-- Description: 
-- 1. Met à jour les statuts (inactif -> rejete, ajoute suspendu)
-- 2. Ajoute rejection_reason et suspension_reason
-- 3. Crée la table notifications générale

-- ============================================
-- PARTIE 1: Mise à jour des statuts collaborations
-- ============================================

-- Étape 1: Supprimer l'ancienne contrainte CHECK si elle existe
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

-- Étape 2: Modifier le type de la colonne statut pour accepter plus de valeurs
ALTER TABLE collaborations 
ALTER COLUMN statut TYPE VARCHAR(20);

-- Étape 3: Mettre à jour les valeurs existantes (inactif -> rejete)
UPDATE collaborations 
SET statut = 'rejete' 
WHERE statut = 'inactif';

-- Étape 4: Ajouter la nouvelle contrainte CHECK avec tous les statuts
ALTER TABLE collaborations 
ADD CONSTRAINT collaborations_statut_check 
CHECK (statut IN ('actif', 'en_attente', 'rejete', 'expire', 'suspendu'));

-- Étape 5: Ajouter les colonnes rejection_reason et suspension_reason
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
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'collaborations' 
        AND column_name = 'suspension_reason'
    ) THEN
        ALTER TABLE collaborations 
        ADD COLUMN suspension_reason TEXT;
    END IF;
END $$;

-- Commentaires pour documentation
COMMENT ON COLUMN collaborations.rejection_reason IS 'Raison du rejet de l''invitation (optionnel)';
COMMENT ON COLUMN collaborations.suspension_reason IS 'Raison de la suspension du collaborateur (optionnel)';

-- ============================================
-- PARTIE 2: Création de la table notifications
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Commentaires pour documentation
COMMENT ON TABLE notifications IS 'Table générale pour toutes les notifications utilisateur';
COMMENT ON COLUMN notifications.type IS 'Type de notification: invitation_received, invitation_accepted, invitation_rejected, etc.';
COMMENT ON COLUMN notifications.data IS 'Données supplémentaires au format JSON (projet_id, collaboration_id, etc.)';
COMMENT ON COLUMN notifications.read IS 'Indique si la notification a été lue';
