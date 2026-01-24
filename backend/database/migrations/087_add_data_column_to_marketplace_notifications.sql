-- Migration: Ajouter colonne data JSONB à marketplace_notifications
-- Date: 2026-01-23
-- Description: Permet de stocker des données enrichies dans les notifications (contact, localisation, etc.)

-- Ajouter la colonne data pour les données structurées
ALTER TABLE marketplace_notifications
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT NULL;

-- Note: ALTER TYPE ... ADD VALUE ne peut PAS être dans un bloc DO/transaction en PostgreSQL
-- On utilise des statements séparés avec IF NOT EXISTS (PostgreSQL 9.3+)

-- Ajouter les nouveaux types de notification (ces statements sont safe avec IF NOT EXISTS)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'sale_confirmed_buyer';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'sale_confirmed_producer';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'offer_countered';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'offer_withdrawn';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_offer';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'listing_sold';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'listing_expired';

-- Commentaire sur la nouvelle colonne
COMMENT ON COLUMN marketplace_notifications.data IS 'Données JSON enrichies (contact producteur/acheteur, localisation ferme, détails transaction)';
