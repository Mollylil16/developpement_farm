-- Migration 046: Ajout du GMQ moyen (Gain Moyen Quotidien) pour les bandes
-- et amélioration de la robustesse des pesées collectives

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS avg_daily_gain REAL;

UPDATE batches
  SET avg_daily_gain = COALESCE(avg_daily_gain, 0.4);

ALTER TABLE batches
  ALTER COLUMN avg_daily_gain SET DEFAULT 0.4;


