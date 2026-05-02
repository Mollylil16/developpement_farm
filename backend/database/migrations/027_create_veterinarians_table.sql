-- Migration: Création de la table veterinarians
-- Date: 2025-01-09
-- Description: Table pour stocker les vétérinaires disponibles pour recherche

CREATE TABLE IF NOT EXISTS veterinarians (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  specialties TEXT, -- JSON array
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_veterinarians_user_id ON veterinarians(user_id);
CREATE INDEX IF NOT EXISTS idx_veterinarians_location ON veterinarians(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_veterinarians_verified ON veterinarians(verified);

-- Commentaires pour documentation
COMMENT ON TABLE veterinarians IS 'Table pour stocker les vétérinaires disponibles pour recherche';
COMMENT ON COLUMN veterinarians.specialties IS 'JSON array des spécialités';

