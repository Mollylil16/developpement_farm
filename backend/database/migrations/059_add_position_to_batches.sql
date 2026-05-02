-- Migration 059: Ajout du champ position (gauche/droite) à la table batches
-- Permet de distinguer les loges à gauche (B) et à droite (A)

ALTER TABLE batches
ADD COLUMN IF NOT EXISTS position VARCHAR(10) CHECK (position IN ('gauche', 'droite'));

-- Index pour améliorer les performances des requêtes par position
CREATE INDEX IF NOT EXISTS idx_batches_position ON batches(position);

-- Commentaire pour documentation
COMMENT ON COLUMN batches.position IS 'Position de la loge : gauche (B) ou droite (A)';

-- Mettre à jour les loges existantes : par défaut, on considère qu'elles sont à droite (A)
-- Les loges existantes avec des noms commençant par B seront mises à gauche
UPDATE batches
SET position = CASE 
  WHEN UPPER(SUBSTRING(pen_name FROM 1 FOR 1)) = 'B' THEN 'gauche'
  ELSE 'droite'
END
WHERE position IS NULL;

-- Pour les loges sans position définie, mettre 'droite' par défaut
UPDATE batches
SET position = 'droite'
WHERE position IS NULL;

