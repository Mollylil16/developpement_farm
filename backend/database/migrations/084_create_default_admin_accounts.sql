-- Migration: Création des comptes administrateurs par défaut
-- Date: 2025-01-19
-- Description: Crée les comptes admin par défaut pour le dashboard (admin1@farmtrack.com et admin2@farmtrack.com)
-- Mot de passe par défaut: Admin123!@# (à changer après première connexion)

-- Activer l'extension pgcrypto si elle n'est pas déjà activée (nécessaire pour bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash bcrypt du mot de passe "Admin123!@#" (10 rounds)
-- Généré avec: bcrypt.hash("Admin123!@#", 10)
-- On utilise crypt() de pgcrypto pour générer le hash dynamiquement

-- Créer ou mettre à jour Admin 1 (Principal)
INSERT INTO admins (id, email, password_hash, nom, prenom, is_active, created_at)
VALUES 
  (
    gen_random_uuid()::text,
    'admin1@farmtrack.com',
    crypt('Admin123!@#', gen_salt('bf', 10)),
    'Admin',
    'Principal',
    true,
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = crypt('Admin123!@#', gen_salt('bf', 10)),
  nom = EXCLUDED.nom,
  prenom = EXCLUDED.prenom,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Créer ou mettre à jour Admin 2 (Collaborateur)
INSERT INTO admins (id, email, password_hash, nom, prenom, is_active, created_at)
VALUES 
  (
    gen_random_uuid()::text,
    'admin2@farmtrack.com',
    crypt('Admin123!@#', gen_salt('bf', 10)),
    'Admin',
    'Collaborateur',
    true,
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = crypt('Admin123!@#', gen_salt('bf', 10)),
  nom = EXCLUDED.nom,
  prenom = EXCLUDED.prenom,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Commentaire pour documentation
COMMENT ON TABLE admins IS 'Table pour stocker les administrateurs du dashboard - Comptes par défaut: admin1@farmtrack.com et admin2@farmtrack.com (mdp: Admin123!@#)';