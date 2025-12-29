-- Script pour supprimer les utilisateurs spécifiques visibles dans pgAdmin
-- ATTENTION : Faites un backup avant d'exécuter ce script !

-- 1. VÉRIFICATION : Voir les projets associés à ces utilisateurs
SELECT 
    u.id,
    u.email,
    u.nom,
    u.prenom,
    COUNT(p.id) as nombre_projets
FROM users u
LEFT JOIN projets p ON p.proprietaire_id = u.id
WHERE u.id IN (
    'user_1766493099008_d6qstb0bw',
    'user_1766499003226_32mxam9zd',
    'user_1766571520560_gt9n2pkb6',
    'user_1766439247544_kx3ozj00m',
    'user_1766493100828_vjb4lz8qy',
    'user_1766447664996_f2qopbvxr',
    'user_1766493102255_f3qcz9yhj',
    'user_1766493103308_rkdb5u0zq',
    'user_1766493104329_krpx3c6dv',
    'user_1766571655624_9hhrxvkdk'
)
GROUP BY u.id, u.email, u.nom, u.prenom
ORDER BY nombre_projets DESC;

-- 2. Supprimer d'abord les projets associés (si nécessaire)
-- Décommentez cette ligne si des projets existent :
-- DELETE FROM projets WHERE proprietaire_id IN (
--     'user_1766493099008_d6qstb0bw',
--     'user_1766499003226_32mxam9zd',
--     'user_1766571520560_gt9n2pkb6',
--     'user_1766439247544_kx3ozj00m',
--     'user_1766493100828_vjb4lz8qy',
--     'user_1766447664996_f2qopbvxr',
--     'user_1766493102255_f3qcz9yhj',
--     'user_1766493103308_rkdb5u0zq',
--     'user_1766493104329_krpx3c6dv',
--     'user_1766571655624_9hhrxvkdk'
-- );

-- 3. Supprimer les utilisateurs
-- Décommentez cette ligne pour supprimer tous ces utilisateurs :
-- DELETE FROM users WHERE id IN (
--     'user_1766493099008_d6qstb0bw',
--     'user_1766499003226_32mxam9zd',
--     'user_1766571520560_gt9n2pkb6',
--     'user_1766439247544_kx3ozj00m',
--     'user_1766493100828_vjb4lz8qy',
--     'user_1766447664996_f2qopbvxr',
--     'user_1766493102255_f3qcz9yhj',
--     'user_1766493103308_rkdb5u0zq',
--     'user_1766493104329_krpx3c6dv',
--     'user_1766571655624_9hhrxvkdk'
-- );

