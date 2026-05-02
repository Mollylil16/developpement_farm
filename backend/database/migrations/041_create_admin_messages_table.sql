-- Migration: Création de la table admin_messages
-- Date: 2025-01-19
-- Description: Table pour stocker les messages envoyés par les admins aux utilisateurs

CREATE TABLE IF NOT EXISTS admin_messages (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('support', 'announcement', 'gift', 'promotion', 'warning', 'congratulations')),
  target_audience TEXT NOT NULL CHECK (target_audience IN ('all', 'active_users', 'new_users', 'specific_users', 'by_role')),
  target_user_ids TEXT[], -- IDs des utilisateurs ciblés
  target_roles TEXT[], -- Rôles ciblés (si target_audience = 'by_role')
  sent_at TIMESTAMP,
  sent_count INTEGER DEFAULT 0, -- Nombre d'emails envoyés
  failed_count INTEGER DEFAULT 0, -- Nombre d'emails échoués
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed', 'cancelled')),
  created_by TEXT NOT NULL REFERENCES admins(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_messages_status ON admin_messages(status);
CREATE INDEX IF NOT EXISTS idx_admin_messages_type ON admin_messages(type);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON admin_messages(created_at);

COMMENT ON TABLE admin_messages IS 'Table pour stocker les messages envoyés par les admins aux utilisateurs';
COMMENT ON COLUMN admin_messages.type IS 'Type de message: support, announcement, gift, promotion, warning, congratulations';

