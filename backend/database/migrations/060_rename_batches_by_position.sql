-- Migration 060: Renommer les loges existantes selon leur position
-- Les loges à droite (position='droite') seront renommées A1, A2, A3, etc.
-- Les loges à gauche (position='gauche') seront renommées B1, B2, B3, etc.

-- Fonction pour renommer les loges par position
DO $$
DECLARE
  projet_record RECORD;
  batch_record RECORD;
  counter_droite INTEGER;
  counter_gauche INTEGER;
  new_name VARCHAR(255);
BEGIN
  -- Parcourir tous les projets
  FOR projet_record IN SELECT DISTINCT projet_id FROM batches LOOP
    counter_droite := 1;
    counter_gauche := 1;
    
    -- Renommer les loges à droite (A1, A2, A3...)
    FOR batch_record IN 
      SELECT id, pen_name 
      FROM batches 
      WHERE projet_id = projet_record.projet_id 
        AND position = 'droite'
      ORDER BY batch_creation_date, created_at
    LOOP
      new_name := 'A' || counter_droite::TEXT;
      
      -- Vérifier que le nom n'est pas déjà utilisé
      WHILE EXISTS (SELECT 1 FROM batches WHERE projet_id = projet_record.projet_id AND pen_name = new_name AND id != batch_record.id) LOOP
        counter_droite := counter_droite + 1;
        new_name := 'A' || counter_droite::TEXT;
      END LOOP;
      
      UPDATE batches SET pen_name = new_name WHERE id = batch_record.id;
      counter_droite := counter_droite + 1;
    END LOOP;
    
    -- Renommer les loges à gauche (B1, B2, B3...)
    FOR batch_record IN 
      SELECT id, pen_name 
      FROM batches 
      WHERE projet_id = projet_record.projet_id 
        AND position = 'gauche'
      ORDER BY batch_creation_date, created_at
    LOOP
      new_name := 'B' || counter_gauche::TEXT;
      
      -- Vérifier que le nom n'est pas déjà utilisé
      WHILE EXISTS (SELECT 1 FROM batches WHERE projet_id = projet_record.projet_id AND pen_name = new_name AND id != batch_record.id) LOOP
        counter_gauche := counter_gauche + 1;
        new_name := 'B' || counter_gauche::TEXT;
      END LOOP;
      
      UPDATE batches SET pen_name = new_name WHERE id = batch_record.id;
      counter_gauche := counter_gauche + 1;
    END LOOP;
  END LOOP;
END $$;

-- Commentaire pour documentation
COMMENT ON COLUMN batches.position IS 'Position de la loge : gauche (B) ou droite (A). Les loges à droite sont nommées A1, A2, A3... Les loges à gauche sont nommées B1, B2, B3...';

