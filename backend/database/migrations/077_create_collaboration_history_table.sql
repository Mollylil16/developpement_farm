-- Migration: Création de la table collaboration_history pour la traçabilité
-- Date: 2025-01-XX
-- Description: Table pour tracer toutes les actions sur les collaborations

CREATE TABLE IF NOT EXISTS collaboration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id VARCHAR(255) NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('invited', 'accepted', 'rejected', 'permission_changed', 'removed', 'linked', 'updated', 'expired')),
  performed_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_collab_history_collab ON collaboration_history(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_collab_history_date ON collaboration_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collab_history_action ON collaboration_history(action);
CREATE INDEX IF NOT EXISTS idx_collab_history_performed_by ON collaboration_history(performed_by);

-- Commentaires pour documentation
COMMENT ON TABLE collaboration_history IS 'Historique de toutes les actions effectuées sur les collaborations';
COMMENT ON COLUMN collaboration_history.action IS 'Type d''action : invited, accepted, rejected, permission_changed, removed, linked, updated, expired';
COMMENT ON COLUMN collaboration_history.performed_by IS 'ID de l''utilisateur qui a effectué l''action (NULL pour actions système)';
COMMENT ON COLUMN collaboration_history.old_value IS 'Valeurs avant modification (JSON)';
COMMENT ON COLUMN collaboration_history.new_value IS 'Valeurs après modification (JSON)';
