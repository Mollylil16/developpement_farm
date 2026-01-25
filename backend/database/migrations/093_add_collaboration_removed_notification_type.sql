-- Migration 093: Ajouter le type de notification pour le retrait de collaboration
-- Date: 2026-01-25
-- Description: Ajoute la valeur 'collaboration_removed' à l'enum notification_type

-- Ajouter le type de notification pour le retrait de collaboration
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'collaboration_removed';

-- Commentaires pour documentation
COMMENT ON TYPE notification_type IS 'Types de notifications du système marketplace, rendez-vous vétérinaires et collaborations';
