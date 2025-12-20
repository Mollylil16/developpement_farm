-- ============================================
-- SCHÉMA POSTGRESQL POUR FERMIER PRO (CORRIGÉ)
-- ============================================
-- Généré le: 2025-12-07T02:06:26.906Z
-- Base de données: farmtrack_db
-- Utilisateur: farmtrack_user
-- 
-- INSTRUCTIONS:
-- 1. Ouvrir pgAdmin
-- 2. Se connecter à farmtrack_db
-- 3. Query Tool → Coller ce script → Execute (F5)
-- ============================================

-- Activer les extensions si nécessaire
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SCHÉMA POSTGRESQL POUR FERMIER PRO
-- ============================================
-- Généré le: 2025-12-07T01:28:34.303Z
-- 
-- INSTRUCTIONS:
-- 1. Créer une base de données: CREATE DATABASE fermier_pro;
-- 2. Se connecter à la base: \c fermier_pro;
-- 3. Exécuter ce script: \i postgresql_schema.sql
-- ============================================

-- Activer les extensions si nécessaire
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================
-- collaboration\collaborations.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS collaborations (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255),
      nom VARCHAR(255) NOT NULL,
      prenom VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      telephone VARCHAR(255),
      role VARCHAR(255) NOT NULL CHECK (role IN ('proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur')),
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
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

-- ============================================
-- core\projets.schema.ts
-- ============================================

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
      derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- ============================================
-- core\regional_pork_price.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS regional_pork_price (
      id VARCHAR(255) PRIMARY KEY,
      price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
      source VARCHAR(255) NOT NULL CHECK (source IN ('api', 'manual', 'default')),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

-- ============================================
-- core\users.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) UNIQUE,
      telephone VARCHAR(255) UNIQUE,
      nom VARCHAR(255) NOT NULL,
      prenom VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255),
      provider VARCHAR(255) NOT NULL CHECK (provider IN ('email', 'google', 'apple', 'telephone')) DEFAULT 'email',
      provider_id VARCHAR(255),
      photo VARCHAR(255),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      derniere_connexion VARCHAR(255),
      is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
      saved_farms VARCHAR(255),
      -- 🆕 Colonnes pour le système multi-rôles
      roles VARCHAR(255),
      active_role VARCHAR(255),
      is_onboarded INTEGER DEFAULT 0 CHECK (is_onboarded IN (0, 1)),
      onboarding_completed_at TIMESTAMP,
      CHECK (email IS NOT NULL OR telephone IS NOT NULL)
    );

-- ============================================
-- finance\depenses_ponctuelles.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS depenses_ponctuelles (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      montant NUMERIC(10, 2) NOT NULL CHECK (montant >= 0),
      categorie VARCHAR(255) NOT NULL CHECK (categorie IN ('vaccins', 'medicaments', 'alimentation', 'veterinaire', 'entretien', 'equipements', 'amenagement_batiment', 'equipement_lourd', 'achat_sujet', 'autre')),
      libelle_categorie VARCHAR(255),
      type_opex_capex VARCHAR(255) CHECK (type_opex_capex IN ('opex', 'capex')),
      duree_amortissement_mois INTEGER CHECK (duree_amortissement_mois IS NULL OR duree_amortissement_mois > 0),
      date VARCHAR(255) NOT NULL,
      commentaire VARCHAR(255),
      photos VARCHAR(255),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );

-- ============================================
-- finance\revenus.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS revenus (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      montant NUMERIC(10, 2) NOT NULL CHECK (montant >= 0),
      categorie VARCHAR(255) NOT NULL CHECK (categorie IN ('vente_porc', 'vente_autre', 'subvention', 'autre')),
      libelle_categorie VARCHAR(255),
      date VARCHAR(255) NOT NULL,
      description VARCHAR(255),
      commentaire VARCHAR(255),
      photos VARCHAR(255),
      poids_kg NUMERIC(10, 2) CHECK (poids_kg IS NULL OR poids_kg > 0),
      animal_id VARCHAR(255),
      cout_kg_opex NUMERIC(10, 2) CHECK (cout_kg_opex IS NULL OR cout_kg_opex >= 0),
      cout_kg_complet NUMERIC(10, 2) CHECK (cout_kg_complet IS NULL OR cout_kg_complet >= 0),
      cout_reel_opex NUMERIC(10, 2) CHECK (cout_reel_opex IS NULL OR cout_reel_opex >= 0),
      cout_reel_complet NUMERIC(10, 2) CHECK (cout_reel_complet IS NULL OR cout_reel_complet >= 0),
      marge_opex NUMERIC(10, 2),
      marge_complete NUMERIC(10, 2),
      marge_opex_pourcent NUMERIC(10, 2) CHECK (marge_opex_pourcent IS NULL OR (marge_opex_pourcent >= -100 AND marge_opex_pourcent <= 100)),
      marge_complete_pourcent NUMERIC(10, 2) CHECK (marge_complete_pourcent IS NULL OR (marge_complete_pourcent >= -100 AND marge_complete_pourcent <= 100)),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL
    );

-- ============================================
-- nutrition\ingredients.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS ingredients (
      id VARCHAR(255) PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      unite VARCHAR(255) NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
      prix_unitaire NUMERIC(10, 2) NOT NULL CHECK (prix_unitaire >= 0),
      proteine_pourcent NUMERIC(10, 2) CHECK (proteine_pourcent IS NULL OR (proteine_pourcent >= 0 AND proteine_pourcent <= 100)),
      energie_kcal NUMERIC(10, 2) CHECK (energie_kcal IS NULL OR energie_kcal >= 0),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- ============================================
-- nutrition\ingredients_ration.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS ingredients_ration (
      id VARCHAR(255) PRIMARY KEY,
      ration_id VARCHAR(255) NOT NULL,
      ingredient_id VARCHAR(255) NOT NULL,
      quantite NUMERIC(10, 2) NOT NULL CHECK (quantite > 0),
      FOREIGN KEY (ration_id) REFERENCES rations(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
    );

-- ============================================
-- nutrition\rapports_croissance.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS rapports_croissance (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      date VARCHAR(255) NOT NULL,
      poids_moyen NUMERIC(10, 2) NOT NULL,
      nombre_porcs INTEGER NOT NULL,
      gain_quotidien NUMERIC(10, 2),
      poids_cible NUMERIC(10, 2),
      notes VARCHAR(255),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );

-- ============================================
-- nutrition\rations.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS rations (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      type_porc VARCHAR(255) NOT NULL CHECK (type_porc IN ('porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance')),
      poids_kg NUMERIC(10, 2) NOT NULL,
      nombre_porcs INTEGER,
      cout_total NUMERIC(10, 2),
      cout_par_kg NUMERIC(10, 2),
      notes VARCHAR(255),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );

-- ============================================
-- nutrition\rations_budget.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS rations_budget (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      nom VARCHAR(255) NOT NULL,
      type_porc VARCHAR(255) NOT NULL CHECK (type_porc IN ('porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance')),
      poids_moyen_kg NUMERIC(10, 2) NOT NULL,
      nombre_porcs INTEGER NOT NULL,
      duree_jours INTEGER NOT NULL,
      ration_journaliere_par_porc NUMERIC(10, 2) NOT NULL,
      quantite_totale_kg NUMERIC(10, 2) NOT NULL,
      cout_total NUMERIC(10, 2) NOT NULL,
      cout_par_kg NUMERIC(10, 2) NOT NULL,
      cout_par_porc NUMERIC(10, 2) NOT NULL,
      ingredients VARCHAR(255) NOT NULL,
      notes VARCHAR(255),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );

-- ============================================
-- nutrition\stocks_aliments.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS stocks_aliments (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      nom VARCHAR(255) NOT NULL,
      categorie VARCHAR(255),
      quantite_actuelle NUMERIC(10, 2) NOT NULL CHECK (quantite_actuelle >= 0),
      unite VARCHAR(255) NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
      seuil_alerte NUMERIC(10, 2) CHECK (seuil_alerte IS NULL OR seuil_alerte >= 0),
      date_derniere_entree TIMESTAMP,
      date_derniere_sortie TIMESTAMP,
      alerte_active INTEGER DEFAULT 0,
      notes VARCHAR(255),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );

-- ============================================
-- nutrition\stocks_mouvements.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS stocks_mouvements (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      aliment_id VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL CHECK (type IN ('entree', 'sortie', 'ajustement')),
      quantite NUMERIC(10, 2) NOT NULL CHECK (quantite > 0),
      unite VARCHAR(255) NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
      date VARCHAR(255) NOT NULL,
      origine VARCHAR(255),
      commentaire VARCHAR(255),
      cree_par VARCHAR(255),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (aliment_id) REFERENCES stocks_aliments(id) ON DELETE CASCADE
    );

-- ============================================
-- production\animaux.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS production_animaux (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      code VARCHAR(255) NOT NULL,
      nom VARCHAR(255),
      origine VARCHAR(255),
      sexe VARCHAR(255) NOT NULL CHECK (sexe IN ('male', 'femelle', 'indetermine')) DEFAULT 'indetermine',
      date_naissance TIMESTAMP,
      poids_initial NUMERIC(10, 2) CHECK (poids_initial IS NULL OR poids_initial > 0),
      date_entree TIMESTAMP,
      actif INTEGER DEFAULT 1,
      statut VARCHAR(255) DEFAULT 'actif' CHECK (statut IN ('actif', 'mort', 'vendu', 'offert', 'autre')),
      race VARCHAR(255),
      reproducteur INTEGER DEFAULT 0 CHECK (reproducteur IN (0, 1)),
      categorie_poids VARCHAR(255) CHECK (categorie_poids IN ('porcelet', 'croissance', 'finition')),
      pere_id VARCHAR(255),
      mere_id VARCHAR(255),
      notes VARCHAR(255),
      photo_uri VARCHAR(255),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (pere_id) REFERENCES production_animaux(id) ON DELETE SET NULL,
      FOREIGN KEY (mere_id) REFERENCES production_animaux(id) ON DELETE SET NULL
    );

-- ============================================
-- production\mortalites.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS mortalites (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      nombre_porcs INTEGER NOT NULL CHECK (nombre_porcs > 0),
      date VARCHAR(255) NOT NULL,
      cause VARCHAR(255),
      categorie VARCHAR(255) NOT NULL CHECK (categorie IN ('porcelet', 'truie', 'verrat', 'autre')),
      animal_code VARCHAR(255),
      poids_kg NUMERIC(10, 2) CHECK (poids_kg IS NULL OR poids_kg > 0),
      notes VARCHAR(255),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
    );

-- ============================================
-- production\pesees.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS production_pesees (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      animal_id VARCHAR(255) NOT NULL,
      date VARCHAR(255) NOT NULL,
      poids_kg NUMERIC(10, 2) NOT NULL CHECK (poids_kg > 0),
      gmq NUMERIC(10, 2),
      difference_standard NUMERIC(10, 2),
      commentaire VARCHAR(255),
      cree_par VARCHAR(255),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE CASCADE
    );

-- ============================================
-- production\planifications.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS planifications (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL CHECK (type IN ('saillie', 'vaccination', 'sevrage', 'nettoyage', 'alimentation', 'veterinaire', 'autre')),
      titre VARCHAR(255) NOT NULL,
      description VARCHAR(255),
      date_prevue TIMESTAMP NOT NULL,
      date_echeance TIMESTAMP,
      rappel VARCHAR(255),
      statut VARCHAR(255) NOT NULL CHECK (statut IN ('a_faire', 'en_cours', 'terminee', 'annulee')),
      recurrence VARCHAR(255) CHECK (recurrence IN ('aucune', 'quotidienne', 'hebdomadaire', 'mensuelle')),
      lien_gestation_id VARCHAR(255),
      lien_sevrage_id VARCHAR(255),
      notes VARCHAR(255),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (lien_gestation_id) REFERENCES gestations(id) ON DELETE SET NULL,
      FOREIGN KEY (lien_sevrage_id) REFERENCES sevrages(id) ON DELETE SET NULL
    );

-- ============================================
-- production\sevrages.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS sevrages (
      id VARCHAR(255) PRIMARY KEY,
      projet_id VARCHAR(255) NOT NULL,
      gestation_id VARCHAR(255) NOT NULL,
      date_sevrage TIMESTAMP NOT NULL,
      nombre_porcelets_sevres INTEGER NOT NULL,
      poids_moyen_sevrage NUMERIC(10, 2),
      notes VARCHAR(255),
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
      FOREIGN KEY (gestation_id) REFERENCES gestations(id) ON DELETE CASCADE
    );

-- ============================================
-- sante\rappels_vaccinations.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS rappels_vaccinations (
      id VARCHAR(255) PRIMARY KEY,
      vaccination_id VARCHAR(255) NOT NULL,
      date_rappel TIMESTAMP NOT NULL,
      envoi INTEGER DEFAULT 0 CHECK (envoi IN (0, 1)),
      date_envoi TIMESTAMP,
      FOREIGN KEY (vaccination_id) REFERENCES vaccinations(id) ON DELETE CASCADE
    );

-- ============================================
-- veterinarians.schema.ts
-- ============================================

CREATE TABLE IF NOT EXISTS veterinarians (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) UNIQUE,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      phone VARCHAR(255),
      email VARCHAR(255),
      address VARCHAR(255),
      city VARCHAR(255),
      latitude NUMERIC(10, 2) NOT NULL,
      longitude NUMERIC(10, 2) NOT NULL,
      specialties VARCHAR(255),
      rating NUMERIC(10, 2) DEFAULT 0,
      reviews_count INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

-- ============================================
-- INDEXES POUR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projets_proprietaire ON projets(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_animaux_projet ON production_animaux(projet_id);
CREATE INDEX IF NOT EXISTS idx_animaux_statut ON production_animaux(statut);
CREATE INDEX IF NOT EXISTS idx_revenus_projet ON revenus(projet_id);
CREATE INDEX IF NOT EXISTS idx_revenus_date ON revenus(date);
CREATE INDEX IF NOT EXISTS idx_depenses_projet ON depenses_ponctuelles(projet_id);
CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses_ponctuelles(date);
CREATE INDEX IF NOT EXISTS idx_charges_fixes_projet ON charges_fixes(projet_id);
CREATE INDEX IF NOT EXISTS idx_pesees_animal ON production_pesees(animal_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_animal ON vaccinations(animal_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_projet ON collaborations(projet_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_user ON collaborations(user_id);

