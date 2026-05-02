-- Migration: Mise à jour de marketplace_offers pour les contre-propositions
-- Date: 2025-01-XX
-- Description: Ajouter les champs pour contre-propositions et date de récupération

-- Ajouter les champs pour contre-propositions et date de récupération
ALTER TABLE marketplace_offers 
  ADD COLUMN IF NOT EXISTS date_recuperation_souhaitee DATE,
  ADD COLUMN IF NOT EXISTS counter_offer_of TEXT REFERENCES marketplace_offers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS prix_total_final NUMERIC CHECK (prix_total_final IS NULL OR prix_total_final >= 0);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_counter_offer_of ON marketplace_offers(counter_offer_of);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_date_recuperation ON marketplace_offers(date_recuperation_souhaitee);

-- Commentaires pour documentation
COMMENT ON COLUMN marketplace_offers.date_recuperation_souhaitee IS 'Date souhaitée par l''acheteur pour récupérer les animaux';
COMMENT ON COLUMN marketplace_offers.counter_offer_of IS 'ID de l''offre originale si cette offre est une contre-proposition';
COMMENT ON COLUMN marketplace_offers.prix_total_final IS 'Prix final négocié, rempli après acceptation de l''offre';

