-- Migration 092: Ajouter les types de notifications pour les rendez-vous vétérinaires
-- Date: 2026-01-25
-- Description: Ajoute les valeurs manquantes à l'enum notification_type pour les rendez-vous

-- Ajouter les types de notifications pour les rendez-vous vétérinaires
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'appointment_requested';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'appointment_accepted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'appointment_rejected';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'appointment_cancelled';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'appointment_reminder';

-- Commentaires pour documentation
COMMENT ON TYPE notification_type IS 'Types de notifications du système marketplace et rendez-vous vétérinaires';
