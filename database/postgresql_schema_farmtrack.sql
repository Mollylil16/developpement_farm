-- ============================================
-- SCHÉMA POSTGRESQL POUR FERMIER PRO
-- Base de données: farmtrack_db
-- Utilisateur: farmtrack_user
-- ============================================
-- Généré le: 2025-12-07
-- 
-- INSTRUCTIONS D'EXÉCUTION:
-- 1. Se connecter à PostgreSQL en tant que farmtrack_user
-- 2. Se connecter à la base farmtrack_db: \c farmtrack_db;
-- 3. Exécuter ce script: \i postgresql_schema_farmtrack.sql
-- 
-- OU via pgAdmin:
-- 1. Clic droit sur "farmtrack_db" → Query Tool
-- 2. Coller ce script
-- 3. Exécuter (F5)
-- ============================================
-- Activer les extensions si nécessaire
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ============================================
-- CRÉATION DES TABLES (dans l'ordre des dépendances)
-- ============================================
-- Table: users (pas de dépendances)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    telephone VARCHAR(255) UNIQUE,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    provider VARCHAR(255) NOT NULL CHECK (
        provider IN ('email', 'google', 'apple', 'telephone')
    ) DEFAULT 'email',
    provider_id VARCHAR(255),
    photo VARCHAR(255),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_connexion TIMESTAMP,
    is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
    saved_farms VARCHAR(255),
    roles VARCHAR(255),
    active_role VARCHAR(255),
    is_onboarded INTEGER DEFAULT 0 CHECK (is_onboarded IN (0, 1)),
    onboarding_completed_at TIMESTAMP,
    CHECK (
        email IS NOT NULL
        OR telephone IS NOT NULL
    )
);
-- Table: projets (dépend de users)
CREATE TABLE IF NOT EXISTS projets (
    id VARCHAR(255) PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    localisation VARCHAR(255) NOT NULL,
    nombre_truies INTEGER NOT NULL,
    nombre_verrats INTEGER NOT NULL,
    nombre_porcelets INTEGER NOT NULL,
    nombre_croissance INTEGER NOT NULL DEFAULT 0,
    poids_moyen_actuel NUMERIC(10, 2) NOT NULL,
    age_moyen_actuel INTEGER NOT NULL,
    prix_kg_vif NUMERIC(10, 2),
    prix_kg_carcasse NUMERIC(10, 2),
    notes VARCHAR(255),
    statut VARCHAR(255) NOT NULL CHECK (statut IN ('actif', 'archive', 'suspendu')),
    proprietaire_id VARCHAR(255) NOT NULL,
    duree_amortissement_par_defaut_mois INTEGER DEFAULT 36,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proprietaire_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Table: regional_pork_price (pas de dépendances)
CREATE TABLE IF NOT EXISTS regional_pork_price (
    id VARCHAR(255) PRIMARY KEY,
    price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
    source VARCHAR(255) NOT NULL CHECK (source IN ('api', 'manual', 'default')),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Table: production_animaux (dépend de projets)
CREATE TABLE IF NOT EXISTS production_animaux (
    id VARCHAR(255) PRIMARY KEY,
    projet_id VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    nom VARCHAR(255),
    origine VARCHAR(255),
    sexe VARCHAR(255) NOT NULL CHECK (sexe IN ('male', 'femelle', 'indetermine')) DEFAULT 'indetermine',
    date_naissance TIMESTAMP,
    poids_initial NUMERIC(10, 2) CHECK (
        poids_initial IS NULL
        OR poids_initial > 0
    ),
    date_entree TIMESTAMP,
    actif INTEGER DEFAULT 1,
    statut VARCHAR(255) DEFAULT 'actif' CHECK (
        statut IN ('actif', 'mort', 'vendu', 'offert', 'autre')
    ),
    race VARCHAR(255),
    reproducteur INTEGER DEFAULT 0 CHECK (reproducteur IN (0, 1)),
    categorie_poids VARCHAR(255) CHECK (
        categorie_poids IN ('porcelet', 'croissance', 'finition')
    ),
    pere_id VARCHAR(255),
    mere_id VARCHAR(255),
    notes VARCHAR(255),
    photo_uri VARCHAR(255),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
    FOREIGN KEY (pere_id) REFERENCES production_animaux(id) ON DELETE
    SET NULL,
        FOREIGN KEY (mere_id) REFERENCES production_animaux(id) ON DELETE
    SET NULL
);
-- Table: collaborations (dépend de projets et users)
CREATE TABLE IF NOT EXISTS collaborations (
    id VARCHAR(255) PRIMARY KEY,
    projet_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telephone VARCHAR(255),
    role VARCHAR(255) NOT NULL CHECK (
        role IN (
            'proprietaire',
            'gestionnaire',
            'veterinaire',
            'ouvrier',
            'observateur'
        )
    ),
    statut VARCHAR(255) NOT NULL CHECK (statut IN ('actif', 'inactif', 'en_attente')),
    permission_reproduction INTEGER DEFAULT 0,
    permission_nutrition INTEGER DEFAULT 0,
    permission_finance INTEGER DEFAULT 0,
    permission_rapports INTEGER DEFAULT 0,
    permission_planification INTEGER DEFAULT 0,
    permission_mortalites INTEGER DEFAULT 0,
    permission_sante INTEGER DEFAULT 0,
    date_invitation TIMESTAMP NOT NULL,
    date_acceptation TIMESTAMP,
    notes VARCHAR(255),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
    SET NULL
);
-- Continuer avec les autres tables...
-- (Je vais créer un script complet qui lit le fichier original et le corrige)