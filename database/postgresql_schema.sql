-- ============================================
-- SCHÉMA POSTGRESQL POUR FARMTRACK PRO
-- Base de données: farmtrack_db
-- Utilisateur: farmtrack_user
-- ============================================

-- Extension pour UUID (optionnel, on utilise TEXT pour compatibilité)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    telephone TEXT UNIQUE,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    password_hash TEXT,
    provider TEXT NOT NULL CHECK (provider IN ('email', 'google', 'apple', 'telephone')) DEFAULT 'email',
    provider_id TEXT,
    photo TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_connexion TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT users_email_or_telephone CHECK (email IS NOT NULL OR telephone IS NOT NULL)
);

-- ============================================
-- TABLE: projets
-- ============================================
CREATE TABLE IF NOT EXISTS projets (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    description TEXT,
    localisation TEXT NOT NULL,
    nombre_truies INTEGER NOT NULL,
    nombre_verrats INTEGER NOT NULL,
    nombre_porcelets INTEGER NOT NULL,
    poids_moyen_actuel REAL NOT NULL,
    age_moyen_actuel INTEGER NOT NULL,
    notes TEXT,
    statut TEXT NOT NULL CHECK (statut IN ('actif', 'archive', 'suspendu')),
    proprietaire_id TEXT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proprietaire_id) REFERENCES users(id)
);

-- ============================================
-- TABLE: charges_fixes
-- ============================================
CREATE TABLE IF NOT EXISTS charges_fixes (
    id TEXT PRIMARY KEY,
    projet_id TEXT,
    categorie TEXT NOT NULL,
    libelle TEXT NOT NULL,
    montant REAL NOT NULL,
    date_debut DATE NOT NULL,
    frequence TEXT NOT NULL CHECK (frequence IN ('mensuel', 'trimestriel', 'annuel')),
    jour_paiement INTEGER,
    notes TEXT,
    statut TEXT NOT NULL CHECK (statut IN ('actif', 'suspendu', 'termine')),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: depenses_ponctuelles
-- ============================================
CREATE TABLE IF NOT EXISTS depenses_ponctuelles (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    montant REAL NOT NULL,
    categorie TEXT NOT NULL,
    libelle_categorie TEXT,
    date DATE NOT NULL,
    commentaire TEXT,
    photos TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: revenus
-- ============================================
CREATE TABLE IF NOT EXISTS revenus (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    montant REAL NOT NULL,
    categorie TEXT NOT NULL CHECK (categorie IN ('vente_porc', 'vente_autre', 'subvention', 'autre')),
    libelle_categorie TEXT,
    date DATE NOT NULL,
    description TEXT,
    commentaire TEXT,
    photos TEXT,
    poids_kg REAL,
    animal_id TEXT,
    cout_kg_opex REAL,
    cout_kg_complet REAL,
    cout_reel_opex REAL,
    cout_reel_complet REAL,
    marge_opex REAL,
    marge_complete REAL,
    marge_opex_pourcent REAL,
    marge_complete_pourcent REAL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: gestations
-- ============================================
CREATE TABLE IF NOT EXISTS gestations (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    truie_id TEXT NOT NULL,
    truie_nom TEXT,
    verrat_id TEXT,
    verrat_nom TEXT,
    date_sautage DATE NOT NULL,
    date_mise_bas_prevue DATE NOT NULL,
    date_mise_bas_reelle DATE,
    nombre_porcelets_prevu INTEGER NOT NULL,
    nombre_porcelets_reel INTEGER,
    statut TEXT NOT NULL CHECK (statut IN ('en_cours', 'terminee', 'annulee')),
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: sevrages
-- ============================================
CREATE TABLE IF NOT EXISTS sevrages (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    gestation_id TEXT NOT NULL,
    date_sevrage DATE NOT NULL,
    nombre_porcelets_sevres INTEGER NOT NULL,
    poids_moyen_sevrage REAL,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
    FOREIGN KEY (gestation_id) REFERENCES gestations(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: ingredients
-- ============================================
CREATE TABLE IF NOT EXISTS ingredients (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml', 'sac')),
    prix_unitaire REAL NOT NULL,
    proteine_pourcent REAL,
    energie_kcal REAL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: stocks_aliments
-- ============================================
CREATE TABLE IF NOT EXISTS stocks_aliments (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    nom TEXT NOT NULL,
    categorie TEXT,
    quantite_actuelle REAL NOT NULL,
    unite TEXT NOT NULL,
    seuil_alerte REAL,
    date_derniere_entree DATE,
    date_derniere_sortie DATE,
    alerte_active BOOLEAN DEFAULT FALSE,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: stocks_mouvements
-- ============================================
CREATE TABLE IF NOT EXISTS stocks_mouvements (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    aliment_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('entree', 'sortie', 'ajustement')),
    quantite REAL NOT NULL,
    unite TEXT NOT NULL,
    date DATE NOT NULL,
    origine TEXT,
    commentaire TEXT,
    cree_par TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
    FOREIGN KEY (aliment_id) REFERENCES stocks_aliments(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: production_animaux
-- ============================================
CREATE TABLE IF NOT EXISTS production_animaux (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    code TEXT NOT NULL,
    nom TEXT,
    origine TEXT,
    sexe TEXT NOT NULL CHECK (sexe IN ('male', 'femelle', 'indetermine')) DEFAULT 'indetermine',
    date_naissance DATE,
    poids_initial REAL,
    date_entree DATE,
    actif BOOLEAN DEFAULT TRUE,
    statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'mort', 'vendu', 'offert', 'autre')),
    race TEXT,
    reproducteur BOOLEAN DEFAULT FALSE,
    pere_id TEXT,
    mere_id TEXT,
    notes TEXT,
    photo_uri TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
    FOREIGN KEY (pere_id) REFERENCES production_animaux(id),
    FOREIGN KEY (mere_id) REFERENCES production_animaux(id),
    CONSTRAINT unique_code_projet UNIQUE (projet_id, code)
);

-- ============================================
-- TABLE: production_pesees
-- ============================================
CREATE TABLE IF NOT EXISTS production_pesees (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    animal_id TEXT NOT NULL,
    date DATE NOT NULL,
    poids_kg REAL NOT NULL,
    gmq REAL,
    difference_standard REAL,
    commentaire TEXT,
    cree_par TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
    FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: rations
-- ============================================
CREATE TABLE IF NOT EXISTS rations (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    type_porc TEXT NOT NULL CHECK (type_porc IN ('porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance')),
    poids_kg REAL NOT NULL,
    nombre_porcs INTEGER,
    cout_total REAL,
    cout_par_kg REAL,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: ingredients_ration (table de liaison)
-- ============================================
CREATE TABLE IF NOT EXISTS ingredients_ration (
    id TEXT PRIMARY KEY,
    ration_id TEXT NOT NULL,
    ingredient_id TEXT NOT NULL,
    quantite REAL NOT NULL,
    FOREIGN KEY (ration_id) REFERENCES rations(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: rations_budget
-- ============================================
CREATE TABLE IF NOT EXISTS rations_budget (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    nom TEXT NOT NULL,
    type_porc TEXT NOT NULL CHECK (type_porc IN ('porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance')),
    poids_moyen_kg REAL NOT NULL,
    nombre_porcs INTEGER NOT NULL,
    duree_jours INTEGER NOT NULL,
    ration_journaliere_par_porc REAL NOT NULL,
    quantite_totale_kg REAL NOT NULL,
    cout_total REAL NOT NULL,
    cout_par_kg REAL NOT NULL,
    cout_par_porc REAL NOT NULL,
    ingredients TEXT NOT NULL,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: rapports_croissance
-- ============================================
CREATE TABLE IF NOT EXISTS rapports_croissance (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    date DATE NOT NULL,
    poids_moyen REAL NOT NULL,
    nombre_porcs INTEGER NOT NULL,
    gain_quotidien REAL,
    poids_cible REAL,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: mortalites
-- ============================================
CREATE TABLE IF NOT EXISTS mortalites (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    nombre_porcs INTEGER NOT NULL,
    date DATE NOT NULL,
    cause TEXT,
    categorie TEXT NOT NULL CHECK (categorie IN ('porcelet', 'truie', 'verrat', 'autre')),
    animal_code TEXT,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: planifications
-- ============================================
CREATE TABLE IF NOT EXISTS planifications (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('saillie', 'vaccination', 'sevrage', 'nettoyage', 'alimentation', 'veterinaire', 'autre')),
    titre TEXT NOT NULL,
    description TEXT,
    date_prevue DATE NOT NULL,
    date_echeance DATE,
    rappel TEXT,
    statut TEXT NOT NULL CHECK (statut IN ('a_faire', 'en_cours', 'terminee', 'annulee')),
    recurrence TEXT CHECK (recurrence IN ('aucune', 'quotidienne', 'hebdomadaire', 'mensuelle')),
    lien_gestation_id TEXT,
    lien_sevrage_id TEXT,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: collaborations
-- ============================================
CREATE TABLE IF NOT EXISTS collaborations (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    user_id TEXT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT NOT NULL,
    telephone TEXT,
    role TEXT NOT NULL CHECK (role IN ('proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur')),
    statut TEXT NOT NULL CHECK (statut IN ('actif', 'inactif', 'en_attente')),
    permission_reproduction BOOLEAN DEFAULT FALSE,
    permission_nutrition BOOLEAN DEFAULT FALSE,
    permission_finance BOOLEAN DEFAULT FALSE,
    permission_rapports BOOLEAN DEFAULT FALSE,
    permission_planification BOOLEAN DEFAULT FALSE,
    permission_mortalites BOOLEAN DEFAULT FALSE,
    permission_sante BOOLEAN DEFAULT FALSE,
    date_invitation DATE NOT NULL,
    date_acceptation DATE,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- MODULE SANTÉ
-- ============================================

-- ============================================
-- TABLE: calendrier_vaccinations
-- ============================================
CREATE TABLE IF NOT EXISTS calendrier_vaccinations (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    vaccin TEXT NOT NULL CHECK (vaccin IN ('rouget', 'parvovirose', 'mal_rouge', 'circovirus', 'mycoplasme', 'grippe', 'autre')),
    nom_vaccin TEXT,
    categorie TEXT NOT NULL CHECK (categorie IN ('porcelet', 'truie', 'verrat', 'porc_croissance', 'tous')),
    age_jours INTEGER,
    date_planifiee DATE,
    frequence_jours INTEGER,
    obligatoire BOOLEAN DEFAULT FALSE,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: vaccinations
-- ============================================
CREATE TABLE IF NOT EXISTS vaccinations (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    calendrier_id TEXT,
    animal_id TEXT,
    lot_id TEXT,
    vaccin TEXT,
    nom_vaccin TEXT,
    date_vaccination DATE NOT NULL,
    date_rappel DATE,
    numero_lot_vaccin TEXT,
    veterinaire TEXT,
    cout REAL,
    statut TEXT NOT NULL CHECK (statut IN ('planifie', 'effectue', 'en_retard', 'annule')) DEFAULT 'effectue',
    effets_secondaires TEXT,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    animal_ids TEXT, -- JSON array of animal IDs
    type_prophylaxie TEXT DEFAULT 'vitamine',
    produit_administre TEXT,
    photo_flacon TEXT,
    dosage TEXT,
    unite_dosage TEXT DEFAULT 'ml',
    raison_traitement TEXT DEFAULT 'suivi_normal',
    raison_autre TEXT,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
    FOREIGN KEY (calendrier_id) REFERENCES calendrier_vaccinations(id) ON DELETE SET NULL,
    FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL
);

-- ============================================
-- TABLE: maladies
-- ============================================
CREATE TABLE IF NOT EXISTS maladies (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    animal_id TEXT,
    lot_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('diarrhee', 'respiratoire', 'gale_parasites', 'fievre', 'boiterie', 'digestive', 'cutanee', 'reproduction', 'neurologique', 'autre')),
    nom_maladie TEXT NOT NULL,
    gravite TEXT NOT NULL CHECK (gravite IN ('faible', 'moderee', 'grave', 'critique')),
    date_debut DATE NOT NULL,
    date_fin DATE,
    symptomes TEXT NOT NULL,
    diagnostic TEXT,
    contagieux BOOLEAN DEFAULT FALSE,
    nombre_animaux_affectes INTEGER,
    nombre_deces INTEGER,
    veterinaire TEXT,
    cout_traitement REAL,
    gueri BOOLEAN DEFAULT FALSE,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
    FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL
);

-- ============================================
-- TABLE: traitements
-- ============================================
CREATE TABLE IF NOT EXISTS traitements (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    maladie_id TEXT,
    animal_id TEXT,
    lot_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('antibiotique', 'antiparasitaire', 'anti_inflammatoire', 'vitamine', 'vaccin', 'autre')),
    nom_medicament TEXT NOT NULL,
    voie_administration TEXT NOT NULL CHECK (voie_administration IN ('orale', 'injectable', 'topique', 'alimentaire')),
    dosage TEXT NOT NULL,
    frequence TEXT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE,
    duree_jours INTEGER,
    temps_attente_jours INTEGER,
    veterinaire TEXT,
    cout REAL,
    termine BOOLEAN DEFAULT FALSE,
    efficace INTEGER, -- NULL, 0 (non), 1 (oui)
    effets_secondaires TEXT,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE,
    FOREIGN KEY (maladie_id) REFERENCES maladies(id) ON DELETE CASCADE,
    FOREIGN KEY (animal_id) REFERENCES production_animaux(id) ON DELETE SET NULL
);

-- ============================================
-- TABLE: visites_veterinaires
-- ============================================
CREATE TABLE IF NOT EXISTS visites_veterinaires (
    id TEXT PRIMARY KEY,
    projet_id TEXT NOT NULL,
    date_visite DATE NOT NULL,
    veterinaire TEXT,
    motif TEXT NOT NULL,
    animaux_examines TEXT,
    diagnostic TEXT,
    prescriptions TEXT,
    recommandations TEXT,
    traitement TEXT,
    cout REAL,
    prochaine_visite_prevue DATE,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE: rappels_vaccinations
-- ============================================
CREATE TABLE IF NOT EXISTS rappels_vaccinations (
    id TEXT PRIMARY KEY,
    vaccination_id TEXT NOT NULL,
    date_rappel DATE NOT NULL,
    envoi BOOLEAN DEFAULT FALSE,
    date_envoi TIMESTAMP,
    FOREIGN KEY (vaccination_id) REFERENCES vaccinations(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES POUR OPTIMISER LES PERFORMANCES
-- ============================================

-- Index sur users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_telephone ON users(telephone);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);

-- Index sur projets
CREATE INDEX IF NOT EXISTS idx_projets_statut ON projets(statut);
CREATE INDEX IF NOT EXISTS idx_projets_proprietaire ON projets(proprietaire_id);

-- Index sur charges_fixes
CREATE INDEX IF NOT EXISTS idx_charges_fixes_projet ON charges_fixes(projet_id);
CREATE INDEX IF NOT EXISTS idx_charges_fixes_statut ON charges_fixes(statut);

-- Index sur depenses_ponctuelles
CREATE INDEX IF NOT EXISTS idx_depenses_projet ON depenses_ponctuelles(projet_id);
CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses_ponctuelles(date);

-- Index sur revenus
CREATE INDEX IF NOT EXISTS idx_revenus_projet ON revenus(projet_id);
CREATE INDEX IF NOT EXISTS idx_revenus_date ON revenus(date);

-- Index sur gestations
CREATE INDEX IF NOT EXISTS idx_gestations_projet ON gestations(projet_id);
CREATE INDEX IF NOT EXISTS idx_gestations_statut ON gestations(statut);
CREATE INDEX IF NOT EXISTS idx_gestations_date_mise_bas ON gestations(date_mise_bas_prevue);

-- Index sur sevrages
CREATE INDEX IF NOT EXISTS idx_sevrages_projet ON sevrages(projet_id);
CREATE INDEX IF NOT EXISTS idx_sevrages_gestation ON sevrages(gestation_id);

-- Index sur stocks_aliments
CREATE INDEX IF NOT EXISTS idx_stocks_aliments_projet ON stocks_aliments(projet_id);
CREATE INDEX IF NOT EXISTS idx_stocks_aliments_alerte ON stocks_aliments(alerte_active);

-- Index sur stocks_mouvements
CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_projet ON stocks_mouvements(projet_id);
CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_aliment ON stocks_mouvements(aliment_id);
CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_date ON stocks_mouvements(date);

-- Index sur production_animaux
CREATE INDEX IF NOT EXISTS idx_production_animaux_projet ON production_animaux(projet_id);
CREATE INDEX IF NOT EXISTS idx_production_animaux_code ON production_animaux(projet_id, code);
CREATE INDEX IF NOT EXISTS idx_production_animaux_actif ON production_animaux(actif);
CREATE INDEX IF NOT EXISTS idx_production_animaux_reproducteur ON production_animaux(reproducteur);

-- Index sur production_pesees
CREATE INDEX IF NOT EXISTS idx_production_pesees_projet ON production_pesees(projet_id);
CREATE INDEX IF NOT EXISTS idx_production_pesees_animal ON production_pesees(animal_id);
CREATE INDEX IF NOT EXISTS idx_production_pesees_date ON production_pesees(date);

-- Index sur rations
CREATE INDEX IF NOT EXISTS idx_rations_projet ON rations(projet_id);
CREATE INDEX IF NOT EXISTS idx_rations_type ON rations(type_porc);

-- Index sur ingredients_ration
CREATE INDEX IF NOT EXISTS idx_ingredients_ration_ration ON ingredients_ration(ration_id);

-- Index sur rapports_croissance
CREATE INDEX IF NOT EXISTS idx_rapports_croissance_projet ON rapports_croissance(projet_id);
CREATE INDEX IF NOT EXISTS idx_rapports_croissance_date ON rapports_croissance(date);

-- Index sur mortalites
CREATE INDEX IF NOT EXISTS idx_mortalites_projet ON mortalites(projet_id);
CREATE INDEX IF NOT EXISTS idx_mortalites_date ON mortalites(date);
CREATE INDEX IF NOT EXISTS idx_mortalites_categorie ON mortalites(categorie);

-- Index sur planifications
CREATE INDEX IF NOT EXISTS idx_planifications_projet ON planifications(projet_id);
CREATE INDEX IF NOT EXISTS idx_planifications_date_prevue ON planifications(date_prevue);
CREATE INDEX IF NOT EXISTS idx_planifications_statut ON planifications(statut);
CREATE INDEX IF NOT EXISTS idx_planifications_type ON planifications(type);

-- Index sur collaborations
CREATE INDEX IF NOT EXISTS idx_collaborations_projet ON collaborations(projet_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_user_id ON collaborations(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_statut ON collaborations(statut);
CREATE INDEX IF NOT EXISTS idx_collaborations_role ON collaborations(role);
CREATE INDEX IF NOT EXISTS idx_collaborations_email ON collaborations(email);

-- Index sur calendrier_vaccinations
CREATE INDEX IF NOT EXISTS idx_calendrier_vaccinations_projet ON calendrier_vaccinations(projet_id);
CREATE INDEX IF NOT EXISTS idx_calendrier_vaccinations_categorie ON calendrier_vaccinations(categorie);

-- Index sur vaccinations
CREATE INDEX IF NOT EXISTS idx_vaccinations_projet ON vaccinations(projet_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_statut ON vaccinations(statut);
CREATE INDEX IF NOT EXISTS idx_vaccinations_date_rappel ON vaccinations(date_rappel);
CREATE INDEX IF NOT EXISTS idx_vaccinations_animal ON vaccinations(animal_id);

-- Index sur maladies
CREATE INDEX IF NOT EXISTS idx_maladies_projet ON maladies(projet_id);
CREATE INDEX IF NOT EXISTS idx_maladies_type ON maladies(type);
CREATE INDEX IF NOT EXISTS idx_maladies_gravite ON maladies(gravite);
CREATE INDEX IF NOT EXISTS idx_maladies_gueri ON maladies(gueri);
CREATE INDEX IF NOT EXISTS idx_maladies_date_debut ON maladies(date_debut);

-- Index sur traitements
CREATE INDEX IF NOT EXISTS idx_traitements_projet ON traitements(projet_id);
CREATE INDEX IF NOT EXISTS idx_traitements_termine ON traitements(termine);
CREATE INDEX IF NOT EXISTS idx_traitements_maladie ON traitements(maladie_id);
CREATE INDEX IF NOT EXISTS idx_traitements_animal ON traitements(animal_id);

-- Index sur visites_veterinaires
CREATE INDEX IF NOT EXISTS idx_visites_veterinaires_projet ON visites_veterinaires(projet_id);
CREATE INDEX IF NOT EXISTS idx_visites_veterinaires_date ON visites_veterinaires(date_visite);

-- Index sur rappels_vaccinations
CREATE INDEX IF NOT EXISTS idx_rappels_vaccinations_date ON rappels_vaccinations(date_rappel);
CREATE INDEX IF NOT EXISTS idx_rappels_vaccinations_vaccination ON rappels_vaccinations(vaccination_id);

-- ============================================
-- FIN DU SCHÉMA
-- ============================================

