-- Migration 094: Mettre à jour permission_cheptel pour les collaborateurs existants
-- Date: 2026-01-24
-- Description: Met à jour permission_cheptel pour les collaborateurs qui ont permission_reproduction = true

-- Mettre à jour permission_cheptel = true pour tous les collaborateurs qui ont permission_reproduction = true
UPDATE collaborations
SET permission_cheptel = true
WHERE permission_reproduction = true
  AND (permission_cheptel IS NULL OR permission_cheptel = false);

-- Mettre à jour permission_cheptel = true pour tous les collaborateurs qui ont permission_gestion_complete = true
UPDATE collaborations
SET permission_cheptel = true
WHERE permission_gestion_complete = true
  AND (permission_cheptel IS NULL OR permission_cheptel = false);

-- Vérification
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM collaborations
    WHERE permission_cheptel = true;
    
    RAISE NOTICE 'Migration 094: % collaborateurs ont maintenant permission_cheptel = true', updated_count;
END $$;
