-- Migration: Mise à jour de marketplace_transactions pour les ventes
-- Date: 2025-01-XX
-- Description: Ajouter les champs pour lier avec ventes et revenus

-- Ajouter les champs pour lier avec ventes
ALTER TABLE marketplace_transactions
  ADD COLUMN IF NOT EXISTS poids_total INTEGER CHECK (poids_total IS NULL OR poids_total > 0),
  ADD COLUMN IF NOT EXISTS nombre_sujets INTEGER CHECK (nombre_sujets IS NULL OR nombre_sujets > 0),
  ADD COLUMN IF NOT EXISTS date_vente TIMESTAMP,
  ADD COLUMN IF NOT EXISTS vente_id TEXT,
  ADD COLUMN IF NOT EXISTS revenu_id TEXT;

-- Ajouter les contraintes de clé étrangère après avoir créé les tables ventes et revenus
-- (ces contraintes seront ajoutées dans les migrations suivantes)

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_vente_id ON marketplace_transactions(vente_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_revenu_id ON marketplace_transactions(revenu_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_date_vente ON marketplace_transactions(date_vente);

-- Commentaires pour documentation
COMMENT ON COLUMN marketplace_transactions.poids_total IS 'Poids total des animaux vendus en kg (nombre entier)';
COMMENT ON COLUMN marketplace_transactions.nombre_sujets IS 'Nombre de sujets vendus';
COMMENT ON COLUMN marketplace_transactions.date_vente IS 'Date de vente, remplie après confirmation de livraison';
COMMENT ON COLUMN marketplace_transactions.vente_id IS 'Lien vers la table ventes (contrainte FK ajoutée dans migration 070)';
COMMENT ON COLUMN marketplace_transactions.revenu_id IS 'Lien vers la table revenus (contrainte FK ajoutée dans migration 069)';

