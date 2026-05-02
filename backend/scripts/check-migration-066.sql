-- Script de vérification pour la migration 066
-- Vérifie si la migration a été appliquée correctement

-- 1. Vérifier si la colonne email est nullable
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'collaborations' 
  AND column_name = 'email';

-- 2. Vérifier si la contrainte check_email_or_telephone existe
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'collaborations'::regclass
  AND conname = 'check_email_or_telephone';

-- 3. Vérifier si l'index idx_collaborations_telephone existe
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'collaborations'
  AND indexname = 'idx_collaborations_telephone';

-- 4. Résumé de l'état de la migration
SELECT 
    CASE 
        WHEN (SELECT is_nullable FROM information_schema.columns 
              WHERE table_name = 'collaborations' AND column_name = 'email') = 'YES' 
        THEN '✅ Email est nullable'
        ELSE '❌ Email n''est PAS nullable'
    END AS email_nullable_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'collaborations'::regclass 
            AND conname = 'check_email_or_telephone'
        )
        THEN '✅ Contrainte check_email_or_telephone existe'
        ELSE '❌ Contrainte check_email_or_telephone manquante'
    END AS constraint_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'collaborations' 
            AND indexname = 'idx_collaborations_telephone'
        )
        THEN '✅ Index idx_collaborations_telephone existe'
        ELSE '❌ Index idx_collaborations_telephone manquant'
    END AS index_status;

