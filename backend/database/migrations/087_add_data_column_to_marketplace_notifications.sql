-- Migration: Ajouter colonne data JSONB à marketplace_notifications
-- Date: 2026-01-23
-- Description: Permet de stocker des données enrichies dans les notifications (contact, localisation, etc.)

-- Ajouter la colonne data pour les données structurées
ALTER TABLE marketplace_notifications
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT NULL;

-- Mettre à jour le type enum pour inclure les nouveaux types de notification
DO $$
BEGIN
    -- Ajouter les nouveaux types si ils n'existent pas
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sale_confirmed_buyer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'sale_confirmed_buyer';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sale_confirmed_producer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'sale_confirmed_producer';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'offer_countered' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'offer_countered';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'offer_withdrawn' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'offer_withdrawn';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'new_offer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_offer';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'listing_sold' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'listing_sold';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'listing_expired' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'listing_expired';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Ignorer si la valeur existe déjà
        NULL;
END
$$;

-- Commentaire sur la nouvelle colonne
COMMENT ON COLUMN marketplace_notifications.data IS 'Données JSON enrichies (contact producteur/acheteur, localisation ferme, détails transaction)';
