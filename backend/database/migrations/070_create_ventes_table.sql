-- Migration: Création de la table ventes
-- Date: 2025-01-XX
-- Description: Table pour stocker les ventes complétées du marketplace

CREATE TABLE IF NOT EXISTS ventes (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  producteur_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acheteur_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prix_total NUMERIC NOT NULL CHECK (prix_total >= 0),
  nombre_sujets INTEGER NOT NULL CHECK (nombre_sujets > 0),
  poids_total INTEGER NOT NULL CHECK (poids_total > 0), -- Nombre entier
  statut VARCHAR(50) DEFAULT 'confirmee',
  date_vente TIMESTAMP NOT NULL DEFAULT NOW(),
  date_recuperation DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ventes_projet_id ON ventes(projet_id);
CREATE INDEX IF NOT EXISTS idx_ventes_producteur_id ON ventes(producteur_id);
CREATE INDEX IF NOT EXISTS idx_ventes_acheteur_id ON ventes(acheteur_id);
CREATE INDEX IF NOT EXISTS idx_ventes_transaction_id ON ventes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ventes_date_vente ON ventes(date_vente);
CREATE INDEX IF NOT EXISTS idx_ventes_statut ON ventes(statut);

-- Commentaires pour documentation
COMMENT ON TABLE ventes IS 'Table pour stocker les ventes complétées du marketplace';
COMMENT ON COLUMN ventes.transaction_id IS 'Lien vers marketplace_transactions';
COMMENT ON COLUMN ventes.poids_total IS 'Poids total vendu en kg (nombre entier)';
COMMENT ON COLUMN ventes.statut IS 'Statut de la vente: confirmee, annulee, etc.';

-- Ajouter la contrainte de clé étrangère pour marketplace_transactions.vente_id
ALTER TABLE marketplace_transactions
  ADD CONSTRAINT fk_marketplace_transactions_vente_id 
  FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE SET NULL;

-- Ajouter la contrainte de clé étrangère pour revenus.vente_id
ALTER TABLE revenus
  ADD CONSTRAINT fk_revenus_vente_id 
  FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE SET NULL;

-- Ajouter la contrainte de clé étrangère pour marketplace_transactions.revenu_id
ALTER TABLE marketplace_transactions
  ADD CONSTRAINT fk_marketplace_transactions_revenu_id 
  FOREIGN KEY (revenu_id) REFERENCES revenus(id) ON DELETE SET NULL;

