-- Migration 042: Ajout du champ management_method à la table projets
-- Permet de gérer deux modes d'élevage : individuel ou par bande

-- Ajouter la colonne management_method
ALTER TABLE projets 
ADD COLUMN IF NOT EXISTS management_method VARCHAR(20) NOT NULL DEFAULT 'individual'
CHECK (management_method IN ('individual', 'batch'));

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_projets_management_method 
ON projets(management_method);

-- Commentaires pour documentation
COMMENT ON COLUMN projets.management_method IS 'Méthode de gestion d''élevage : individual (suivi individuel) ou batch (suivi par bande)';

