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

-- Ajouter les contraintes de clé étrangère (seulement si elles n'existent pas déjà)
-- Note: Ces contraintes nécessitent que les colonnes existent (ajoutées dans migrations 068 et 069)

-- Contrainte FK pour marketplace_transactions.vente_id
DO $$
BEGIN
    -- Vérifier que la colonne vente_id existe dans marketplace_transactions
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'marketplace_transactions' 
        AND column_name = 'vente_id'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'marketplace_transactions' 
        AND constraint_name = 'fk_marketplace_transactions_vente_id'
    ) THEN
        ALTER TABLE marketplace_transactions
        ADD CONSTRAINT fk_marketplace_transactions_vente_id 
        FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Contrainte FK pour revenus.vente_id
DO $$
BEGIN
    -- Vérifier que la colonne vente_id existe dans revenus
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'revenus' 
        AND column_name = 'vente_id'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'revenus' 
        AND constraint_name = 'fk_revenus_vente_id'
    ) THEN
        ALTER TABLE revenus
        ADD CONSTRAINT fk_revenus_vente_id 
        FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Contrainte FK pour marketplace_transactions.revenu_id
-- Note: Cette contrainte devrait normalement être dans la migration 069, mais elle est ici pour compatibilité
DO $$
BEGIN
    -- Vérifier que la colonne revenu_id existe dans marketplace_transactions
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'marketplace_transactions' 
        AND column_name = 'revenu_id'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'marketplace_transactions' 
        AND constraint_name = 'fk_marketplace_transactions_revenu_id'
    ) THEN
        ALTER TABLE marketplace_transactions
        ADD CONSTRAINT fk_marketplace_transactions_revenu_id 
        FOREIGN KEY (revenu_id) REFERENCES revenus(id) ON DELETE SET NULL;
    END IF;
END $$;

