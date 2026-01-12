-- Migration 065: Système de notifications marketplace
-- Date: 2026-01-10
-- Description: Création de la table marketplace_notifications pour le système de notifications

-- ========================================
-- TABLE marketplace_notifications
-- ========================================

CREATE TABLE IF NOT EXISTS marketplace_notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,

  -- Type de notification
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'offer_received',
    'offer_accepted',
    'offer_rejected',
    'offer_countered',
    'offer_withdrawn',
    'message_received',
    'listing_sold',
    'listing_expired'
  )),

  -- Contenu
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Lien vers l'entité concernée
  related_type VARCHAR(50),
  related_id VARCHAR(255),

  -- Action
  action_url VARCHAR(255),

  -- Statut
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,

  -- Dates
  created_at TIMESTAMP DEFAULT NOW(),

  -- Relations
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user ON marketplace_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON marketplace_notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON marketplace_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON marketplace_notifications(type);

-- Commentaires pour documentation
COMMENT ON TABLE marketplace_notifications IS 'Table des notifications marketplace';
COMMENT ON COLUMN marketplace_notifications.type IS 'Type de notification: offer_received, offer_accepted, offer_rejected, offer_countered, offer_withdrawn, message_received, listing_sold, listing_expired';
COMMENT ON COLUMN marketplace_notifications.related_type IS 'Type d''entité liée: offer, listing, inquiry, etc.';
COMMENT ON COLUMN marketplace_notifications.related_id IS 'ID de l''entité liée';
COMMENT ON COLUMN marketplace_notifications.action_url IS 'URL d''action pour rediriger l''utilisateur';
COMMENT ON COLUMN marketplace_notifications.read IS 'Indique si la notification a été lue';
COMMENT ON COLUMN marketplace_notifications.read_at IS 'Date de lecture de la notification';

-- ========================================
-- FIN DE LA MIGRATION
-- ========================================
