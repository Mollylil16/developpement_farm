-- Migration 081: Nettoyage des URIs locales dans la colonne photo des utilisateurs
-- Date: 2025-01-XX
-- Description: Supprime toutes les URIs locales (file://, content://, ph://, etc.) 
--              de la colonne photo et les remplace par NULL
--              Les URIs locales ne doivent pas être stockées en base de données
--              car elles sont spécifiques à chaque appareil et ne sont pas accessibles
--              depuis d'autres terminaux.

-- Log de début de migration
DO $$
DECLARE
    affected_count INTEGER;
    local_uri_count INTEGER;
BEGIN
    -- Compter le nombre d'utilisateurs avec des URIs locales
    SELECT COUNT(*) INTO local_uri_count
    FROM users
    WHERE photo IS NOT NULL
      AND (
        photo LIKE 'file://%'
        OR photo LIKE 'content://%'
        OR photo LIKE 'ph://%'
        OR photo LIKE 'assets-library://%'
        OR photo LIKE 'ph-asset://%'
      );

    -- Logger le nombre d'utilisateurs affectés
    RAISE NOTICE '[Migration 081] Nombre d''utilisateurs avec URIs locales détectés: %', local_uri_count;

    -- Nettoyer les URIs locales en les remplaçant par NULL
    UPDATE users
    SET photo = NULL
    WHERE photo IS NOT NULL
      AND (
        photo LIKE 'file://%'
        OR photo LIKE 'content://%'
        OR photo LIKE 'ph://%'
        OR photo LIKE 'assets-library://%'
        OR photo LIKE 'ph-asset://%'
      );

    -- Récupérer le nombre d'utilisateurs effectivement mis à jour
    GET DIAGNOSTICS affected_count = ROW_COUNT;

    -- Logger le résultat
    RAISE NOTICE '[Migration 081] Nombre d''utilisateurs nettoyés: %', affected_count;
    RAISE NOTICE '[Migration 081] Migration terminée avec succès';

    -- Vérification finale
    IF affected_count > 0 THEN
        RAISE NOTICE '[Migration 081] ✅ % utilisateur(s) ont été nettoyé(s)', affected_count;
    ELSE
        RAISE NOTICE '[Migration 081] ✅ Aucun utilisateur à nettoyer (base de données déjà propre)';
    END IF;
END $$;

-- Vérification post-migration
-- Compter les URIs locales restantes (devrait être 0)
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM users
    WHERE photo IS NOT NULL
      AND (
        photo LIKE 'file://%'
        OR photo LIKE 'content://%'
        OR photo LIKE 'ph://%'
        OR photo LIKE 'assets-library://%'
        OR photo LIKE 'ph-asset://%'
      );

    IF remaining_count > 0 THEN
        RAISE WARNING '[Migration 081] ⚠️ Attention: % URI(s) locale(s) restante(s) après migration', remaining_count;
    ELSE
        RAISE NOTICE '[Migration 081] ✅ Vérification: Aucune URI locale restante';
    END IF;
END $$;
