-- Migration: Création de la table marketplace_notifications
-- Date: 2025-01-09
-- Description: Table pour stocker les notifications du marketplace

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('offer_received', 'offer_accepted', 'offer_rejected', 'message_received', 'delivery_confirmed', 'rating_received', 'delivery_reminder', 'payment_reminder');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_related_type') THEN
        CREATE TYPE notification_related_type AS ENUM ('offer', 'transaction', 'message', 'rating');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS marketplace_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  body TEXT, -- Détails supplémentaires
  related_id TEXT NOT NULL,
  related_type notification_related_type NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_user_id ON marketplace_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_read ON marketplace_notifications(read);
CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_created_at ON marketplace_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_related ON marketplace_notifications(related_id, related_type);

-- Commentaires pour documentation
COMMENT ON TABLE marketplace_notifications IS 'Table pour stocker les notifications du marketplace';

