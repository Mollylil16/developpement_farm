-- Script de nettoyage des utilisateurs
-- ATTENTION : Ce script supprime des données. Faites un backup avant !

-- 1. Voir tous les utilisateurs avec leurs informations
SELECT 
    id, 
    email, 
    nom, 
    prenom, 
    telephone,
    date_creation,
    derniere_connexion,
    is_active,
    (SELECT COUNT(*) FROM projets WHERE proprietaire_id = users.id) as nombre_projets
FROM users 
ORDER BY date_creation DESC;

-- 2. Voir les utilisateurs sans projets (pour nettoyage sécurisé)
SELECT 
    id, 
    email, 
    nom, 
    prenom, 
    date_creation
FROM users 
WHERE id NOT IN (SELECT DISTINCT proprietaire_id FROM projets WHERE proprietaire_id IS NOT NULL)
ORDER BY date_creation DESC;

-- 3. Supprimer un utilisateur spécifique (remplacer 'user_xxx' par l'ID réel)
-- Décommentez et adaptez cette ligne :
-- DELETE FROM users WHERE id = 'user_xxx';

-- 4. Supprimer tous les utilisateurs de test (ceux créés après une certaine date)
-- ATTENTION : Adaptez la date selon vos besoins
-- DELETE FROM users WHERE date_creation > '2025-01-01' AND email LIKE '%test%';

-- 5. Supprimer tous les utilisateurs sans projets (NON RECOMMANDÉ en production)
-- DELETE FROM users 
-- WHERE id NOT IN (
--     SELECT DISTINCT proprietaire_id 
--     FROM projets 
--     WHERE proprietaire_id IS NOT NULL
-- );

-- 6. Supprimer un utilisateur par email
-- DELETE FROM users WHERE email = 'exemple@email.com';

-- 7. Voir les colonnes disponibles dans la table users
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' 
-- ORDER BY ordinal_position;

