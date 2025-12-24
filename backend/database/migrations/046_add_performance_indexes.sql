-- Migration 046: Ajout d'indexes de performance pour optimiser les requêtes fréquentes
-- Date: 2025-01-XX
-- Description: Indexes composites et optimisés pour améliorer les performances des requêtes les plus fréquentes

-- ==================== PRODUCTION_ANIMAUX ====================
-- Index composite pour la requête fréquente: WHERE projet_id = X AND statut = Y
-- Utilisé dans: findAllAnimals avec filtrage par statut
CREATE INDEX IF NOT EXISTS idx_production_animaux_projet_statut 
ON production_animaux(projet_id, statut);

-- Index composite pour ORDER BY date_creation DESC (avec filtrage par projet)
-- Améliore les requêtes: WHERE projet_id = X ORDER BY date_creation DESC
CREATE INDEX IF NOT EXISTS idx_production_animaux_projet_created 
ON production_animaux(projet_id, date_creation DESC);

-- ==================== PRODUCTION_PESEES ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date DESC
-- Utilisé pour charger les pesées récentes d'un projet
CREATE INDEX IF NOT EXISTS idx_production_pesees_projet_date 
ON production_pesees(projet_id, date DESC);

-- Index composite pour requêtes par animal avec tri par date
-- Utilisé pour l'historique des pesées d'un animal
CREATE INDEX IF NOT EXISTS idx_production_pesees_animal_date 
ON production_pesees(animal_id, date DESC);

-- ==================== MORTALITES ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY date DESC
-- Utilisé dans: findAll mortalités d'un projet
CREATE INDEX IF NOT EXISTS idx_mortalites_projet_date 
ON mortalites(projet_id, date DESC);

-- Index composite pour filtrage par catégorie dans un projet
-- Utilisé pour compter les mortalités par catégorie
CREATE INDEX IF NOT EXISTS idx_mortalites_projet_categorie 
ON mortalites(projet_id, categorie);

-- ==================== MARKETPLACE_LISTINGS ====================
-- Index composite pour requêtes: WHERE status != X ORDER BY listed_at DESC
-- Utilisé dans: findAllListings (requête principale du marketplace)
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status_listed 
ON marketplace_listings(status, listed_at DESC);

-- Index composite pour filtrage par projet et statut
-- Utilisé pour les listings d'un fermier spécifique
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_farm_status 
ON marketplace_listings(farm_id, status);

-- ==================== BATCH_PIGS ====================
-- Index composite pour requêtes: WHERE batch_id = X ORDER BY entry_date DESC
-- Utilisé pour charger les porcs d'une bande
CREATE INDEX IF NOT EXISTS idx_batch_pigs_batch_entry 
ON batch_pigs(batch_id, entry_date DESC);

-- Index pour les mouvements de porcs
-- Utilisé pour l'historique des mouvements
CREATE INDEX IF NOT EXISTS idx_batch_pig_movements_pig_date 
ON batch_pig_movements(pig_id, movement_date DESC);

-- ==================== BATCHES ====================
-- Index composite pour requêtes: WHERE projet_id = X ORDER BY batch_creation_date DESC
-- Utilisé dans: getAllBatchesByProjet
CREATE INDEX IF NOT EXISTS idx_batches_projet_creation 
ON batches(projet_id, batch_creation_date DESC);

-- ==================== PROJETS ====================
-- Index composite pour requêtes: WHERE proprietaire_id = X AND statut = Y
-- Utilisé dans: findAll projets actifs d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_projets_owner_statut 
ON projets(proprietaire_id, statut);

-- Index pour recherche de projet actif
-- Utilisé dans: findActive
CREATE INDEX IF NOT EXISTS idx_projets_owner_active 
ON projets(proprietaire_id, statut, date_creation DESC) 
WHERE statut = 'actif';

-- Analyser les tables après ajout des indexes pour optimiser les statistiques
ANALYZE production_animaux;
ANALYZE production_pesees;
ANALYZE mortalites;
ANALYZE marketplace_listings;
ANALYZE batch_pigs;
ANALYZE batch_pig_movements;
ANALYZE batches;
ANALYZE projets;

-- Commentaires pour documentation
COMMENT ON INDEX idx_production_animaux_projet_statut IS 'Index composite pour optimiser les requêtes filtrées par projet et statut';
COMMENT ON INDEX idx_production_pesees_projet_date IS 'Index composite pour optimiser le chargement des pesées récentes par projet';
COMMENT ON INDEX idx_mortalites_projet_date IS 'Index composite pour optimiser le chargement des mortalités par projet';
COMMENT ON INDEX idx_marketplace_listings_status_listed IS 'Index composite pour optimiser les requêtes du marketplace triées par date';
COMMENT ON INDEX idx_batch_pigs_batch_entry IS 'Index composite pour optimiser le chargement des porcs d''une bande';

