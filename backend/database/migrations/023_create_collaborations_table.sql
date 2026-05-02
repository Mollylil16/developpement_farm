-- Migration: Création de la table collaborations
-- Date: 2025-01-09
-- Description: Table pour stocker les collaborations entre utilisateurs et projets

CREATE TABLE IF NOT EXISTS collaborations (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  role TEXT NOT NULL CHECK (role IN ('proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur')),
  statut TEXT NOT NULL CHECK (statut IN ('actif', 'inactif', 'en_attente')),
  permission_reproduction BOOLEAN DEFAULT FALSE,
  permission_nutrition BOOLEAN DEFAULT FALSE,
  permission_finance BOOLEAN DEFAULT FALSE,
  permission_rapports BOOLEAN DEFAULT FALSE,
  permission_planification BOOLEAN DEFAULT FALSE,
  permission_mortalites BOOLEAN DEFAULT FALSE,
  permission_sante BOOLEAN DEFAULT FALSE,
  date_invitation TIMESTAMP NOT NULL,
  date_acceptation TIMESTAMP,
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_collaborations_projet_id ON collaborations(projet_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_user_id ON collaborations(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_statut ON collaborations(statut);
CREATE INDEX IF NOT EXISTS idx_collaborations_email ON collaborations(email);

-- Commentaires pour documentation
COMMENT ON TABLE collaborations IS 'Table pour stocker les collaborations entre utilisateurs et projets';

