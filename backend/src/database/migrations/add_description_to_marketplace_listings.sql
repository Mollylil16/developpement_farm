-- Migration: Ajouter la colonne description à marketplace_listings
-- Date: 2026-01-11
-- Description: Permettre aux vendeurs d'ajouter une description à leurs annonces marketplace

-- Ajouter la colonne description
ALTER TABLE marketplace_listings
ADD COLUMN IF NOT EXISTS description TEXT;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN marketplace_listings.description IS 'Description détaillée de l''annonce marketplace';

-- Créer un index pour la recherche textuelle si nécessaire
-- CREATE INDEX IF NOT EXISTS idx_listings_description ON marketplace_listings USING gin(to_tsvector('french', description));