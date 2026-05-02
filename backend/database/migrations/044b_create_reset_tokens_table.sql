-- Migration 044b: Création de la table reset_tokens pour la réinitialisation de mot de passe
-- Stocke les codes OTP pour la réinitialisation de mot de passe

CREATE TABLE IF NOT EXISTS reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  telephone VARCHAR(15) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'password_reset',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_reset_tokens_telephone_type 
ON reset_tokens(telephone, type, expires_at);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id 
ON reset_tokens(user_id);

-- Nettoyage automatique des tokens expirés (via trigger)
CREATE OR REPLACE FUNCTION delete_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM reset_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Commentaires pour documentation
COMMENT ON TABLE reset_tokens IS 'Table des tokens OTP pour réinitialisation de mot de passe';
COMMENT ON COLUMN reset_tokens.otp IS 'Code OTP à 6 chiffres';
COMMENT ON COLUMN reset_tokens.type IS 'Type de token : password_reset, phone_verification';
COMMENT ON COLUMN reset_tokens.expires_at IS 'Date d''expiration du token (généralement 10 minutes)';

