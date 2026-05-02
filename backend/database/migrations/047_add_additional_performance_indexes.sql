-- Migration 047: Ajout d'indexes supplémentaires pour optimiser les requêtes fréquentes
-- Date: 2025-01-XX
-- Phase 5: Analyse EXPLAIN ANALYZE - Indexes manquants identifiés
-- Description: Indexes composites et optimisés pour améliorer les performances des requêtes sur les tables finance, santé, reproduction, etc.

-- ==================== REVENUS ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date DESC
-- Utilisé dans: findAllRevenus, calculerPerformanceGlobale
CREATE INDEX IF NOT EXISTS idx_revenus_projet_date 
ON revenus(projet_id, date DESC);

-- Index composite pour filtrage par catégorie dans un projet
-- Utilisé pour les requêtes filtrées par catégorie (ex: vente_porc)
CREATE INDEX IF NOT EXISTS idx_revenus_projet_categorie 
ON revenus(projet_id, categorie, date DESC);

-- ==================== DÉPENSES PONCTUELLES ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date DESC
-- Utilisé dans: findAllDepensesPonctuelles, calculerPerformanceGlobale
CREATE INDEX IF NOT EXISTS idx_depenses_ponctuelles_projet_date 
ON depenses_ponctuelles(projet_id, date DESC);

-- Index composite pour filtrage par catégorie dans un projet
-- Utilisé pour les requêtes filtrées par catégorie
CREATE INDEX IF NOT EXISTS idx_depenses_ponctuelles_projet_categorie 
ON depenses_ponctuelles(projet_id, categorie, date DESC);

-- ==================== CHARGES FIXES ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date_debut DESC
-- Utilisé dans: findAllChargesFixes
CREATE INDEX IF NOT EXISTS idx_charges_fixes_projet_date 
ON charges_fixes(projet_id, date_debut DESC);

-- ==================== VACCINATIONS ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date_vaccination DESC
-- Utilisé dans: findAllVaccinations
CREATE INDEX IF NOT EXISTS idx_vaccinations_projet_date 
ON vaccinations(projet_id, date_vaccination DESC);

-- Index composite pour requêtes par animal avec tri par date
-- Utilisé pour l'historique des vaccinations d'un animal
CREATE INDEX IF NOT EXISTS idx_vaccinations_animal_date 
ON vaccinations(animal_id, date_vaccination DESC)
WHERE animal_id IS NOT NULL;

-- Index composite pour requêtes "à faire" (statut = 'a_faire')
-- Utilisé pour le calendrier des vaccinations
CREATE INDEX IF NOT EXISTS idx_vaccinations_projet_statut_date 
ON vaccinations(projet_id, statut, date_vaccination ASC)
WHERE statut = 'a_faire';

-- ==================== MALADIES ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date_debut DESC
-- Utilisé dans: findAllMaladies
CREATE INDEX IF NOT EXISTS idx_maladies_projet_date 
ON maladies(projet_id, date_debut DESC);

-- Index composite pour requêtes par animal "en cours"
-- NOTE: la table maladies utilise `gueri` (boolean) et non `statut`
-- Utilisé pour les maladies en cours d'un animal (gueri = false)
CREATE INDEX IF NOT EXISTS idx_maladies_animal_en_cours
ON maladies(animal_id, date_debut DESC)
WHERE animal_id IS NOT NULL AND gueri = false;

-- ==================== TRAITEMENTS ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date_debut DESC
-- Utilisé dans: findAllTraitements
CREATE INDEX IF NOT EXISTS idx_traitements_projet_date 
ON traitements(projet_id, date_debut DESC);

-- Index composite pour requêtes par animal "en cours"
-- NOTE: la table traitements utilise `termine` (boolean) et non `statut`
-- Utilisé pour les traitements en cours d'un animal (termine = false)
CREATE INDEX IF NOT EXISTS idx_traitements_animal_en_cours
ON traitements(animal_id, date_debut DESC)
WHERE animal_id IS NOT NULL AND termine = false;

-- ==================== VISITES VÉTÉRINAIRES ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date_visite DESC
-- Utilisé dans: findAllVisitesVeterinaires
CREATE INDEX IF NOT EXISTS idx_visites_veterinaires_projet_date 
ON visites_veterinaires(projet_id, date_visite DESC);

-- ==================== GESTATIONS ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date_sautage DESC
-- Utilisé dans: findAllGestations
CREATE INDEX IF NOT EXISTS idx_gestations_projet_date 
ON gestations(projet_id, date_sautage DESC);

-- Index composite pour requêtes "en cours" avec tri par date mise bas
-- Utilisé pour le calendrier des gestations
CREATE INDEX IF NOT EXISTS idx_gestations_projet_statut_date 
ON gestations(projet_id, statut, date_mise_bas_prevue ASC)
WHERE statut = 'en_cours';

-- ==================== SEVRAGES ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date_sevrage DESC
-- Utilisé dans: findAllSevrages
CREATE INDEX IF NOT EXISTS idx_sevrages_projet_date 
ON sevrages(projet_id, date_sevrage DESC);

-- ==================== RAPPORTS CROISSANCE ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date DESC
-- Utilisé dans: findAll rapports de croissance
CREATE INDEX IF NOT EXISTS idx_rapports_croissance_projet_date 
ON rapports_croissance(projet_id, date DESC);

-- ==================== PLANIFICATIONS ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date_prevue ASC
-- Utilisé dans: findAllPlanifications
CREATE INDEX IF NOT EXISTS idx_planifications_projet_date 
ON planifications(projet_id, date_prevue ASC);

-- Index composite pour requêtes "à faire" futures
-- Utilisé pour le calendrier des tâches à venir
CREATE INDEX IF NOT EXISTS idx_planifications_projet_statut_date 
ON planifications(projet_id, statut, date_prevue ASC)
WHERE statut = 'a_faire';

-- ==================== COLLABORATIONS ====================
-- Index composite pour requêtes: WHERE projet_id = X OR user_id = X
-- Utilisé dans: findAllCollaborations
CREATE INDEX IF NOT EXISTS idx_collaborations_projet_collaborateur 
ON collaborations(projet_id, user_id, date_creation DESC);

-- Index pour requêtes par collaborateur
-- Utilisé pour les collaborations d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_collaborations_collaborateur 
ON collaborations(user_id, date_creation DESC);

-- ==================== ANALYSE DES TABLES ====================
-- Analyser les tables après ajout des indexes pour optimiser les statistiques
ANALYZE revenus;
ANALYZE depenses_ponctuelles;
ANALYZE charges_fixes;
ANALYZE vaccinations;
ANALYZE maladies;
ANALYZE traitements;
ANALYZE visites_veterinaires;
ANALYZE gestations;
ANALYZE sevrages;
ANALYZE rapports_croissance;
ANALYZE planifications;
ANALYZE collaborations;

-- ==================== COMMENTAIRES ====================
COMMENT ON INDEX idx_revenus_projet_date IS 'Index composite pour optimiser les requêtes de revenus par projet triées par date';
COMMENT ON INDEX idx_revenus_projet_categorie IS 'Index composite pour optimiser les requêtes de revenus filtrées par catégorie';
COMMENT ON INDEX idx_depenses_ponctuelles_projet_date IS 'Index composite pour optimiser les requêtes de dépenses par projet triées par date';
COMMENT ON INDEX idx_depenses_ponctuelles_projet_categorie IS 'Index composite pour optimiser les requêtes de dépenses filtrées par catégorie';
COMMENT ON INDEX idx_charges_fixes_projet_date IS 'Index composite pour optimiser les requêtes de charges fixes par projet triées par date';
COMMENT ON INDEX idx_vaccinations_projet_date IS 'Index composite pour optimiser les requêtes de vaccinations par projet triées par date';
COMMENT ON INDEX idx_vaccinations_animal_date IS 'Index composite pour optimiser l''historique des vaccinations d''un animal';
COMMENT ON INDEX idx_vaccinations_projet_statut_date IS 'Index partiel pour optimiser le calendrier des vaccinations à faire';
COMMENT ON INDEX idx_maladies_projet_date IS 'Index composite pour optimiser les requêtes de maladies par projet triées par date';
COMMENT ON INDEX idx_maladies_animal_en_cours IS 'Index partiel pour optimiser les requêtes de maladies en cours (gueri = false) d''un animal';
COMMENT ON INDEX idx_traitements_projet_date IS 'Index composite pour optimiser les requêtes de traitements par projet triées par date';
COMMENT ON INDEX idx_traitements_animal_en_cours IS 'Index partiel pour optimiser les requêtes de traitements en cours (termine = false) d''un animal';
COMMENT ON INDEX idx_visites_veterinaires_projet_date IS 'Index composite pour optimiser les requêtes de visites vétérinaires par projet triées par date';
COMMENT ON INDEX idx_gestations_projet_date IS 'Index composite pour optimiser les requêtes de gestations par projet triées par date';
COMMENT ON INDEX idx_gestations_projet_statut_date IS 'Index partiel pour optimiser le calendrier des gestations en cours';
COMMENT ON INDEX idx_sevrages_projet_date IS 'Index composite pour optimiser les requêtes de sevrages par projet triées par date';
COMMENT ON INDEX idx_rapports_croissance_projet_date IS 'Index composite pour optimiser les requêtes de rapports de croissance par projet triées par date';
COMMENT ON INDEX idx_planifications_projet_date IS 'Index composite pour optimiser les requêtes de planifications par projet triées par date';
COMMENT ON INDEX idx_planifications_projet_statut_date IS 'Index partiel pour optimiser le calendrier des tâches à faire futures';
COMMENT ON INDEX idx_collaborations_projet_collaborateur IS 'Index composite pour optimiser les requêtes de collaborations par projet ou collaborateur';
COMMENT ON INDEX idx_collaborations_collaborateur IS 'Index pour optimiser les requêtes de collaborations d''un utilisateur';

