/**
 * Service de base de données SQLite
 * Gère toutes les opérations de base de données pour l'application
 */

import * as SQLite from 'expo-sqlite';
import uuid from 'react-native-uuid';
import { getErrorMessage } from '../types/common';
import {
  Projet,
  ChargeFixe,
  DepensePonctuelle,
  UpdateDepensePonctuelleInput,
  Revenu,
  UpdateRevenuInput,
  Gestation,
  Sevrage,
  Ingredient,
  Ration,
  Mortalite,
  Planification,
  StockAliment,
  CreateStockAlimentInput,
  UpdateStockAlimentInput,
  StockMouvement,
  CreateStockMouvementInput,
  ProductionAnimal,
  CreateProductionAnimalInput,
  UpdateProductionAnimalInput,
  ProductionPesee,
  CreatePeseeInput,
  ProductionStandardGMQ,
  getStandardGMQ,
  User,
} from '../types';
import { calculerDateMiseBasPrevue } from '../types/reproduction';
import { genererPlusieursNomsAleatoires } from '../utils/nameGenerator';
// Schémas de base de données organisés par domaine
import * as schemas from '../database/schemas';
// Système de migrations versionné
import { runMigrations } from '../database/migrations/MigrationRunner';
import { migrations } from '../database/migrations';
// Création des index
import { createIndexesWithProjetId as createProjetIdIndexes } from '../database/indexes/createIndexes';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialise la connexion à la base de données
   * Utilise un verrou pour éviter les initialisations parallèles
   */
  async initialize(): Promise<void> {
    // Si déjà initialisé, ne rien faire
    if (this.db) {
      return;
    }

    // Si une initialisation est en cours, attendre qu'elle se termine
    if (this.isInitializing && this.initPromise) {
      console.log('⏳ [DB] Initialisation en cours, attente...');
      return this.initPromise;
    }

    // Marquer comme en cours d'initialisation
    this.isInitializing = true;

    // Créer la promesse d'initialisation
    this.initPromise = (async () => {
      try {
        console.log('🔧 [DB] Initialisation de la base de données...');
        this.db = await SQLite.openDatabaseAsync('fermier_pro.db');
        
        // Configurer SQLite pour éviter les deadlocks
        try {
          await this.db.execAsync('PRAGMA busy_timeout = 5000;'); // Attendre 5s si locked
          await this.db.execAsync('PRAGMA journal_mode = WAL;'); // Write-Ahead Logging
          console.log('✅ [DB] Configuration SQLite appliquée');
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn('⚠️ [DB] Impossible de configurer SQLite:', message);
        }

        await this.createTablesFromSchemas();
        await this.createBaseIndexes();
        await this.runVersionedMigrations();
        await createProjetIdIndexes(this.db);
        await this.createCompositeIndexes();
        
        console.log('✅ [DB] Base de données initialisée avec succès');
      } catch (error) {
        console.error("❌ [DB] Erreur lors de l'initialisation de la base de données:", error);
        this.db = null; // Réinitialiser en cas d'erreur
        throw error;
      } finally {
        this.isInitializing = false;
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Nettoie simplement les tables _old sans toucher aux données
   * NE JAMAIS supprimer automatiquement les données principales !
   */
  private async cleanupOldTables(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      // Vérifier si des tables _old existent
      const oldTables = await this.db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_old'"
      );

      if (oldTables.length > 0) {
        console.log(`🧹 [DB] ${oldTables.length} table(s) temporaire(s) à nettoyer`);

        // Tenter de supprimer chaque table _old (mais sans forcer ni reconstruire)
        for (const table of oldTables) {
          try {
            await this.db.execAsync(`DROP TABLE IF EXISTS ${table.name};`);
            console.log(`   ✅ ${table.name} supprimée`);
          } catch (error: unknown) {
            // Ignorer les erreurs - ne pas bloquer le démarrage
            console.warn(`   ⚠️ ${table.name} non supprimée (ignoré)`);
          }
        }
      }
    } catch (error: unknown) {
      // Ne rien faire en cas d'erreur - préserver les données avant tout
      console.warn('⚠️ [DB] Impossible de nettoyer les tables temporaires (ignoré)');
    }
  }

  /**
   * Nettoie les tables temporaires (_old) laissées par des migrations échouées
   * IMPORTANT: Ne supprime JAMAIS users_old - elle peut contenir les seules données valides
   */
  private async cleanupFailedMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    try {
      console.log('🧹 [DB] Nettoyage des migrations échouées...');

      // NE JAMAIS appeler rebuildDatabase automatiquement - cela détruit les données !
      // Seulement nettoyer les tables _old sans toucher aux données principales

      // Nettoyer les tables _old en douceur
      await this.cleanupOldTables();

      // Vérifier spécifiquement si users_old existe encore (cas particulier)
      const usersOldExists = await this.db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='users_old'"
      );

      if (usersOldExists && usersOldExists.count > 0) {
        console.warn('⚠️ [DB] Table users_old existe encore');
        
        try {
          const usersCount = await this.db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
          );
          const usersOldCount = await this.db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM users_old WHERE is_active = 1'
          );
          
          console.log(`📊 [DB] users: ${usersCount?.count || 0} utilisateurs actifs`);
          console.log(`📊 [DB] users_old: ${usersOldCount?.count || 0} utilisateurs actifs`);
          
          // Si users est vide mais users_old a des données → RESTAURER depuis users_old
          if ((usersCount?.count || 0) === 0 && (usersOldCount?.count || 0) > 0) {
            console.warn('⚠️ [DB] Table users vide mais users_old contient des données');
            console.warn('→ Restauration des utilisateurs depuis users_old');
            
            // Copier les données de users_old vers users
            await this.db.execAsync(`
              INSERT OR REPLACE INTO users (
                id, email, telephone, nom, prenom, password_hash, provider,
                provider_id, photo, date_creation, derniere_connexion, is_active
              )
              SELECT
                id, email, telephone, nom, prenom, password_hash, provider,
                provider_id, photo, date_creation, derniere_connexion, is_active
              FROM users_old;
            `);
            
            console.log('✅ [DB] Utilisateurs restaurés depuis users_old');
          }
          
          // Ne supprimer users_old QUE si la table users contient au moins autant de données
          if ((usersCount?.count || 0) >= (usersOldCount?.count || 0) && (usersCount?.count || 0) > 0) {
            console.log('✅ [DB] Migration users confirmée, suppression de users_old');
            await this.db.execAsync('DROP TABLE IF EXISTS users_old;');
          } else {
            console.warn('⚠️ [DB] Conservation de users_old par sécurité (données non migrées)');
          }
        } catch (error: unknown) {
          console.error('❌ [DB] Erreur lors de la gestion de users_old:', getErrorMessage(error));
        }
      }
    } catch (error: unknown) {
      console.error('❌ [DB] Erreur lors du nettoyage:', getErrorMessage(error));
      // NE PAS reconstruire automatiquement - cela peut détruire les données
      console.error('→ Conservation de l\'état actuel de la base pour éviter toute perte de données');
    }
  }

  /**
   * Exécute les migrations versionnées
   * Utilise le système de migrations versionné pour appliquer les migrations dans l'ordre
   */
  private async runVersionedMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Nettoyer les tables temporaires avant toute migration
    await this.cleanupFailedMigrations();

    // Exécuter les migrations versionnées
    await runMigrations(this.db, migrations);
  }

  /**
   * @deprecated SUPPRIMÉ - Toutes les migrations ont été extraites vers database/migrations/
   * Utilisez runVersionedMigrations() qui appelle le MigrationRunner
   * 
   * Cette méthode contenait ~1735 lignes de code de migrations qui ont été extraites
   * vers des fichiers versionnés dans database/migrations/
   */
  // Méthode migrateTables() supprimée - toutes les migrations sont maintenant dans database/migrations/

  /**
   * @deprecated Utilisez createProjetIdIndexes() de database/indexes/createIndexes.ts
   * Cette méthode a été extraite pour améliorer la modularité
   */
  private async createIndexesWithProjetId(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }
    await createProjetIdIndexes(this.db);
  }


  /**
   * Vérifie et répare les index manquants (peut être appelé périodiquement)
   */
  async repairMissingIndexes(): Promise<{ repaired: number; failed: number }> {
    if (!this.db) {
      return { repaired: 0, failed: 0 };
    }

    console.log('🔧 Vérification et réparation des index manquants...');
    await this.createIndexesWithProjetId();

    // Compter les index manquants après réparation
    const indexes = [
      'idx_depenses_projet',
      'idx_revenus_projet',
      'idx_rapports_croissance_projet',
      'idx_mortalites_projet',
      'idx_planifications_projet',
      'idx_collaborations_projet',
      'idx_stocks_aliments_projet',
      'idx_production_animaux_code',
      'idx_production_animaux_reproducteur',
      'idx_collaborations_user_id',
    ];

    let repaired = 0;
    let failed = 0;

    for (const indexName of indexes) {
      const exists = await this.db.getFirstAsync<{ name: string } | null>(
        `SELECT name FROM sqlite_master WHERE type='index' AND name='${indexName}'`
      );
      if (exists) {
        repaired++;
      } else {
        failed++;
      }
    }

    if (failed > 0) {
      console.warn(`⚠ ${failed} index(s) toujours manquant(s) après réparation`);
    } else {
      console.log(`✓ Tous les index sont présents`);
    }

    return { repaired, failed };
  }

  /**
   * Crée toutes les tables nécessaires en utilisant les schémas organisés par domaine
   * Refactoré depuis createTables() pour améliorer la maintenabilité
   */
  private async createTablesFromSchemas(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    console.log('📋 [DB] Création des tables depuis les schémas...');

    // Core
    await schemas.createUsersTable(this.db);
    await schemas.createProjetsTable(this.db);

    // Finance
    await schemas.createChargesFixesTable(this.db);
    await schemas.createDepensesPonctuellesTable(this.db);
    await schemas.createRevenusTable(this.db);

    // Production
    await schemas.createProductionAnimauxTable(this.db);
    await schemas.createProductionPeseesTable(this.db);
    await schemas.createGestationsTable(this.db);
    await schemas.createSevragesTable(this.db);
    await schemas.createMortalitesTable(this.db);
    await schemas.createPlanificationsTable(this.db);

    // Nutrition
    await schemas.createIngredientsTable(this.db);
    await schemas.createRationsTable(this.db);
    await schemas.createIngredientsRationTable(this.db);
    await schemas.createRationsBudgetTable(this.db);
    await schemas.createStocksAlimentsTable(this.db);
    await schemas.createStocksMouvementsTable(this.db);
    await schemas.createRapportsCroissanceTable(this.db);

    // Santé
    await schemas.createCalendrierVaccinationsTable(this.db);
    await schemas.createVaccinationsTable(this.db);
    await schemas.createMaladiesTable(this.db);
    await schemas.createTraitementsTable(this.db);
    await schemas.createVisitesVeterinairesTable(this.db);
    await schemas.createRappelsVaccinationsTable(this.db);

    // Collaboration
    await schemas.createCollaborationsTable(this.db);

    console.log('✅ [DB] Toutes les tables créées avec succès');
  }

  /**
   * Crée les index composites pour optimiser les requêtes fréquentes
   */
  private async createCompositeIndexes(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const { createCompositeIndexes } = await import('../database/indexes/createCompositeIndexes');
      await createCompositeIndexes(this.db);
    } catch (error: unknown) {
      console.warn('⚠️  Erreur lors de la création des index composites:', getErrorMessage(error));
      // Ne pas bloquer l'initialisation si les index composites échouent
    }
  }

  /**
   * Crée les index de base (ceux qui ne dépendent pas de projet_id)
   * TODO: Extraire vers database/indexes/createBaseIndexes.ts
   */
  private async createBaseIndexes(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Index pour optimiser les requêtes (sans ceux qui utilisent projet_id)
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
      CREATE INDEX IF NOT EXISTS idx_projets_statut ON projets(statut);
      CREATE INDEX IF NOT EXISTS idx_charges_fixes_statut ON charges_fixes(statut);
      CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses_ponctuelles(date);
      CREATE INDEX IF NOT EXISTS idx_revenus_date ON revenus(date);
      CREATE INDEX IF NOT EXISTS idx_gestations_statut ON gestations(statut);
      CREATE INDEX IF NOT EXISTS idx_gestations_date_mise_bas ON gestations(date_mise_bas_prevue);
      CREATE INDEX IF NOT EXISTS idx_sevrages_gestation ON sevrages(gestation_id);
      CREATE INDEX IF NOT EXISTS idx_rations_type ON rations(type_porc);
      CREATE INDEX IF NOT EXISTS idx_ingredients_ration_ration ON ingredients_ration(ration_id);
      CREATE INDEX IF NOT EXISTS idx_rapports_croissance_date ON rapports_croissance(date);
      CREATE INDEX IF NOT EXISTS idx_mortalites_date ON mortalites(date);
      CREATE INDEX IF NOT EXISTS idx_mortalites_categorie ON mortalites(categorie);
      CREATE INDEX IF NOT EXISTS idx_planifications_date_prevue ON planifications(date_prevue);
      CREATE INDEX IF NOT EXISTS idx_planifications_statut ON planifications(statut);
      CREATE INDEX IF NOT EXISTS idx_planifications_type ON planifications(type);
      CREATE INDEX IF NOT EXISTS idx_collaborations_statut ON collaborations(statut);
      CREATE INDEX IF NOT EXISTS idx_collaborations_role ON collaborations(role);
      CREATE INDEX IF NOT EXISTS idx_collaborations_email ON collaborations(email);
      -- Note: idx_collaborations_user_id est créé dans createIndexesWithProjetId() après la migration
      CREATE INDEX IF NOT EXISTS idx_stocks_aliments_alerte ON stocks_aliments(alerte_active);
      CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_aliment ON stocks_mouvements(aliment_id);
      CREATE INDEX IF NOT EXISTS idx_stocks_mouvements_date ON stocks_mouvements(date);
      CREATE INDEX IF NOT EXISTS idx_production_animaux_actif ON production_animaux(actif);
      CREATE INDEX IF NOT EXISTS idx_production_pesees_animal ON production_pesees(animal_id);
      CREATE INDEX IF NOT EXISTS idx_production_pesees_date ON production_pesees(date);
      CREATE INDEX IF NOT EXISTS idx_calendrier_vaccinations_categorie ON calendrier_vaccinations(categorie);
      CREATE INDEX IF NOT EXISTS idx_vaccinations_statut ON vaccinations(statut);
      CREATE INDEX IF NOT EXISTS idx_vaccinations_date_rappel ON vaccinations(date_rappel);
      CREATE INDEX IF NOT EXISTS idx_vaccinations_animal ON vaccinations(animal_id);
      CREATE INDEX IF NOT EXISTS idx_maladies_type ON maladies(type);
      CREATE INDEX IF NOT EXISTS idx_maladies_gravite ON maladies(gravite);
      CREATE INDEX IF NOT EXISTS idx_maladies_gueri ON maladies(gueri);
      CREATE INDEX IF NOT EXISTS idx_maladies_date_debut ON maladies(date_debut);
      CREATE INDEX IF NOT EXISTS idx_traitements_termine ON traitements(termine);
      CREATE INDEX IF NOT EXISTS idx_traitements_maladie ON traitements(maladie_id);
      CREATE INDEX IF NOT EXISTS idx_traitements_animal ON traitements(animal_id);
      CREATE INDEX IF NOT EXISTS idx_visites_veterinaires_date ON visites_veterinaires(date_visite);
      CREATE INDEX IF NOT EXISTS idx_rappels_vaccinations_date ON rappels_vaccinations(date_rappel);
      CREATE INDEX IF NOT EXISTS idx_rappels_vaccinations_vaccination ON rappels_vaccinations(vaccination_id);
    `);
  }

  /**
   * ============================================
   * MODULE SANTÉ - CALENDRIER DE VACCINATIONS
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD CalendrierVaccination ont été migrées vers CalendrierVaccinationRepository
   * Voir: src/database/repositories/CalendrierVaccinationRepository.ts
   * 
   * Fonctions supprimées:
   * - createCalendrierVaccination → calendrierRepo.create()
   * - getCalendrierVaccinationsByProjet → calendrierRepo.findByProjet()
   * - getCalendrierVaccinationById → calendrierRepo.findById()
   * - updateCalendrierVaccination → calendrierRepo.update()
   * - deleteCalendrierVaccination → calendrierRepo.deleteById()
   */

  /**
   * ⚠️ NOTE: initProtocolesVaccinationStandard a été migré vers VaccinationInitializationService
   * Voir: src/services/VaccinationInitializationService.ts
   * 
   * Utilisez: new VaccinationInitializationService(db).initProtocolesVaccinationStandard(projetId)
   */

  /**
   * ============================================
   * MODULE SANTÉ - VACCINATIONS
   * ============================================
   */

  /**
   * ============================================
   * MODULE SANTÉ - VACCINATIONS
   * ============================================
   * 
   * ⚠️ NOTE: Toutes les fonctions CRUD Vaccinations ont été migrées vers VaccinationRepository
   * Voir: src/database/repositories/VaccinationRepository.ts
   * 
   * Fonctions supprimées:
   * - createVaccination → vaccinationRepo.create()
   * - getVaccinationsByProjet → vaccinationRepo.findByProjet()
   * - getVaccinationById → vaccinationRepo.findById()
   * - getVaccinationsByAnimal → vaccinationRepo.findByAnimal()
   * - getVaccinationsEnRetard → vaccinationRepo.findEnRetard()
   * - getVaccinationsAVenir → vaccinationRepo.findAVenir()
   * - updateVaccination → vaccinationRepo.update()
   * - deleteVaccination → vaccinationRepo.deleteById()
   * 
   * Cette section a été supprimée pour réduire la taille de database.ts
   * Utilisez VaccinationRepository pour toutes les opérations de vaccination.
   */


  /**
   * ============================================
   * MODULE SANTÉ - MALADIES
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD Maladie ont été migrées vers MaladieRepository
   * Voir: src/database/repositories/MaladieRepository.ts
   * 
   * Fonctions supprimées:
   * - createMaladie → maladieRepo.create()
   * - getMaladiesByProjet → maladieRepo.findByProjet()
   * - getMaladieById → maladieRepo.findById()
   * - getMaladiesByAnimal → maladieRepo.findByAnimal()
   * - getMaladiesEnCours → maladieRepo.findEnCours()
   * - updateMaladie → maladieRepo.update()
   * - deleteMaladie → maladieRepo.delete()
   */


  /**
   * ============================================
   * MODULE SANTÉ - TRAITEMENTS
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD Traitement ont été migrées vers TraitementRepository
   * Voir: src/database/repositories/TraitementRepository.ts
   * 
   * Fonctions supprimées:
   * - createTraitement → traitementRepo.create()
   * - getTraitementsByProjet → traitementRepo.findByProjet()
   * - getTraitementById → traitementRepo.findById()
   * - getTraitementsByMaladie → traitementRepo.findByMaladie()
   * - getTraitementsByAnimal → traitementRepo.findByAnimal()
   * - getTraitementsEnCours → traitementRepo.findEnCours()
   * - updateTraitement → traitementRepo.update()
   * - deleteTraitement → traitementRepo.deleteById()
   */


  /**
   * ============================================
   * MODULE SANTÉ - VISITES VÉTÉRINAIRES
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD VisiteVeterinaire ont été migrées vers VisiteVeterinaireRepository
   * Voir: src/database/repositories/VisiteVeterinaireRepository.ts
   * 
   * Fonctions supprimées:
   * - createVisiteVeterinaire → visiteRepo.create()
   * - getVisitesVeterinairesByProjet → visiteRepo.findByProjet()
   * - getVisiteVeterinaireById → visiteRepo.findById()
   * - getProchainVisitePrevue → visiteRepo.findProchaineVisite()
   * - updateVisiteVeterinaire → visiteRepo.update()
   * - deleteVisiteVeterinaire → visiteRepo.deleteById()
   */

  /**
   * ============================================
   * MODULE SANTÉ - RAPPELS VACCINATIONS
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD RappelVaccination ont été migrées vers RappelVaccinationRepository
   * Voir: src/database/repositories/RappelVaccinationRepository.ts
   * 
   * Fonctions supprimées:
   * - createRappelVaccination → rappelRepo.create()
   * - getRappelsByProjet → rappelRepo.findByVaccination() (via vaccinations du projet)
   * - getRappelsAVenir → rappelRepo.findAVenir()
   * - getRappelsEnRetard → rappelRepo.findEnRetard()
   * - marquerRappelEnvoye → rappelRepo.marquerEnvoye()
   */

  /**
   * ============================================
   * MODULE SANTÉ - STATISTIQUES ET RAPPORTS
   * ============================================
   */

  /**
   * ============================================
   * MODULE SANTÉ - STATISTIQUES
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions statistiques ont été migrées vers leurs repositories respectifs
   * 
   * Fonctions supprimées:
   * - getStatistiquesVaccinations → vaccinationRepo.getStatistiquesVaccinations()
   * - getStatistiquesMaladies → maladieRepo.getStatistiquesMaladies()
   * - getStatistiquesTraitements → traitementRepo.getStatistiquesTraitements()
   * 
   * Cette section a été supprimée pour réduire la taille de database.ts
   * Utilisez les repositories pour toutes les opérations statistiques.
   */

  /**
   * Obtenir les coûts vétérinaires totaux
   */
  /**
   * ⚠️ DEPRECATED: Utilisez SanteCoutsService.getCouts() à la place
   * Cette méthode est conservée temporairement pour compatibilité
   * @deprecated Utilisez SanteCoutsService.getCouts(projetId)
   */
  async getCoutsVeterinaires(projetId: string): Promise<{
    vaccinations: number;
    traitements: number;
    visites: number;
    total: number;
  }> {
    const { SanteCoutsService } = await import('./sante/SanteCoutsService');
    return SanteCoutsService.getCouts(projetId);
  }

  /**
   * ⚠️ DEPRECATED: Utilisez SanteRecommandationsService.getTauxMortaliteParCause() à la place
   * Cette méthode est conservée temporairement pour compatibilité
   * @deprecated Utilisez SanteRecommandationsService.getTauxMortaliteParCause(projetId)
   */
  async getTauxMortaliteParCause(projetId: string): Promise<
    Array<{
      cause: string;
      nombre: number;
      pourcentage: number;
    }>
  > {
    const { SanteRecommandationsService } = await import('./sante/SanteRecommandationsService');
    return SanteRecommandationsService.getTauxMortaliteParCause(projetId);
  }

  /**
   * ⚠️ DEPRECATED: Utilisez SanteRecommandationsService.getRecommandations() à la place
   * Cette méthode est conservée temporairement pour compatibilité
   * @deprecated Utilisez SanteRecommandationsService.getRecommandations(projetId)
   */
  async getRecommandationsSanitaires(projetId: string): Promise<
    Array<{
      type: 'vaccination' | 'traitement' | 'visite' | 'alerte';
      priorite: 'haute' | 'moyenne' | 'basse';
      message: string;
      data?: any;
    }>
  > {
    const { SanteRecommandationsService } = await import('./sante/SanteRecommandationsService');
    return SanteRecommandationsService.getRecommandations(projetId);
  }

  /**
   * ⚠️ NOTE: getAlertesSanitaires a été migrée vers SanteAlertesService
   * Voir: src/services/sante/SanteAlertesService.ts
   * 
   * Cette fonction est maintenant disponible via SanteAlertesService.getAlertesSanitaires()
   * Utilisez SanteAlertesService pour toutes les alertes sanitaires.
   */

  /**
   * ⚠️ DEPRECATED: Utilisez SanteHistoriqueService.getHistorique() à la place
   * Cette méthode est conservée temporairement pour compatibilité
   * @deprecated Utilisez SanteHistoriqueService.getHistorique(animalId)
   */
  async getHistoriqueMedicalAnimal(animalId: string): Promise<{
    vaccinations: Vaccination[];
    maladies: Maladie[];
    traitements: Traitement[];
    visites: VisiteVeterinaire[];
  }> {
    const { SanteHistoriqueService } = await import('./sante/SanteHistoriqueService');
    return SanteHistoriqueService.getHistorique(animalId);
  }

  /**
   * Obtenir les animaux avec temps d'attente actif (avant abattage)
   */
  /**
   * ⚠️ DEPRECATED: Utilisez SanteTempsAttenteService.getAnimauxEnAttente() à la place
   * Cette méthode est conservée temporairement pour compatibilité
   * @deprecated Utilisez SanteTempsAttenteService.getAnimauxEnAttente(projetId)
   */
  async getAnimauxTempsAttente(projetId: string): Promise<
    Array<{
      animal_id: string;
      traitement: Traitement;
      date_fin_attente: string;
      jours_restants: number;
    }>
  > {
    const { SanteTempsAttenteService } = await import('./sante/SanteTempsAttenteService');
    return SanteTempsAttenteService.getAnimauxEnAttente(projetId);
  }

  /**
   * ⚠️ DEPRECATED: Utilisez SanteCoutsService.getCoutsPeriode() à la place
   * Cette méthode est conservée temporairement pour compatibilité
   * @deprecated Utilisez SanteCoutsService.getCoutsPeriode(projetId, dateDebut, dateFin)
   */
  async getCoutsVeterinairesPeriode(
    projetId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<{
    vaccinations: number;
    traitements: number;
    visites: number;
    total: number;
    details: {
      vaccinations: Vaccination[];
      traitements: Traitement[];
      visites: VisiteVeterinaire[];
    };
  }> {
    const { SanteCoutsService } = await import('./sante/SanteCoutsService');
    return SanteCoutsService.getCoutsPeriode(projetId, dateDebut, dateFin);
  }

  /**
   * ============================================
   * GESTION DES UTILISATEURS
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD User ont été migrées vers UserRepository
   * Voir: src/database/repositories/UserRepository.ts
   * 
   * Cette section a été supprimée pour réduire la taille de database.ts
   * Utilisez UserRepository pour toutes les opérations utilisateur.
   */

  /**
   * ============================================
   * GESTION DES PROJETS
   * ============================================
   */

  /**
   * ⚠️ NOTE: createProjet et createAnimauxInitials ont été migrés vers ProjetRepository et ProjetInitializationService
   * Voir: 
   * - src/database/repositories/ProjetRepository.ts (create)
   * - src/services/ProjetInitializationService.ts (createAnimauxInitials)
   * 
   * Utilisez: projetRepo.create() qui appelle automatiquement ProjetInitializationService
   */

  /**
   * ⚠️ NOTE: Les fonctions CRUD Projet ont été migrées vers ProjetRepository
   * Voir: src/database/repositories/ProjetRepository.ts
   * 
   * Fonctions supprimées:
   * - getProjetById → projetRepo.getById()
   * - getAllProjets → projetRepo.findAllByUserId()
   * - getProjetActif → projetRepo.findActiveByUserId()
   * - updateProjet → projetRepo.update()
   * - createProjet → projetRepo.create() (crée aussi les animaux initiaux via ProjetInitializationService)
   * - createAnimauxInitials → ProjetInitializationService.createAnimauxInitials()
   */

  /**
   * ============================================
   * GESTION DES CHARGES FIXES
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD ChargeFixe ont été migrées vers ChargeFixeRepository
   * Voir: src/database/repositories/FinanceRepository.ts
   * 
   * Fonctions supprimées:
   * - createChargeFixe → chargeFixeRepo.create()
   * - getChargeFixeById → chargeFixeRepo.findById()
   * - getAllChargesFixes → chargeFixeRepo.findAll()
   * - getChargesFixesActives → chargeFixeRepo.findActives()
   * - updateChargeFixe → chargeFixeRepo.update()
   * - deleteChargeFixe → chargeFixeRepo.deleteById()
   */

  /**
   * ============================================
   * GESTION DES DÉPENSES PONCTUELLES
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD DepensePonctuelle ont été migrées vers DepensePonctuelleRepository
   * Voir: src/database/repositories/FinanceRepository.ts
   * 
   * Fonctions supprimées:
   * - createDepensePonctuelle → depenseRepo.create()
   * - getDepensePonctuelleById → depenseRepo.findById()
   * - getAllDepensesPonctuelles → depenseRepo.findAll()
   * - getDepensesPonctuellesByDateRange → depenseRepo.findByDateRange()
   * - updateDepensePonctuelle → depenseRepo.update()
   * - deleteDepensePonctuelle → depenseRepo.deleteById()
   */

  /**
   * ============================================
   * GESTION DES REVENUS
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD Revenu ont été migrées vers RevenuRepository
   * Voir: src/database/repositories/FinanceRepository.ts
   * 
   * Fonctions supprimées:
   * - createRevenu → revenuRepo.create()
   * - getRevenuById → revenuRepo.findById()
   * - getAllRevenus → revenuRepo.findAll()
   * - getRevenusByDateRange → revenuRepo.findByDateRange()
   * - updateRevenu → revenuRepo.update()
   * - deleteRevenu → revenuRepo.deleteById()
   */

  /**
   * ============================================
   * GESTION DES GESTATIONS
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD Gestation ont été migrées vers GestationRepository
   * Voir: src/database/repositories/GestationRepository.ts
   * 
   * Fonctions supprimées:
   * - createGestation → gestationRepo.create()
   * - getGestationById → gestationRepo.findById()
   * - getAllGestations → gestationRepo.findAll()
   * - getGestationsEnCours → gestationRepo.findEnCoursByProjet()
   * - getGestationsParDateMiseBas → gestationRepo.findByPeriod()
   * - updateGestation → gestationRepo.update()
   * - deleteGestation → gestationRepo.deleteById()
   * 
   * ⚠️ NOTE: creerPorceletsDepuisGestation() a été migrée vers GestationRepository
   * Voir: src/database/repositories/GestationRepository.ts
   * 
   * Cette fonction est maintenant appelée automatiquement lors de la mise à jour
   * d'une gestation terminée via reproductionSlice.updateGestation
   * 
   * La fonction a été complètement supprimée de database.ts car elle est maintenant
   * gérée par GestationRepository.creerPorceletsDepuisGestation()
   */

  /**
   * ============================================
   * GESTION DES SEVRAGES
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD Sevrage ont été migrées vers SevrageRepository
   * Voir: src/database/repositories/SevrageRepository.ts
   * 
   * Fonctions supprimées:
   * - createSevrage → sevrageRepo.create()
   * - getSevrageById → sevrageRepo.findById()
   * - getAllSevrages → sevrageRepo.findByProjet()
   * - getSevragesParGestation → sevrageRepo.findByGestation()
   * - getSevragesParDateRange → sevrageRepo.findByPeriod()
   * - deleteSevrage → sevrageRepo.deleteById()
   */


  /**
   * ============================================
   * GESTION DES INGRÉDIENTS
   * ============================================
   * 
   * ⚠️ NOTE: Toutes les fonctions CRUD Ingredient ont été migrées vers IngredientRepository
   * Voir: src/database/repositories/IngredientRepository.ts
   * 
   * Fonctions supprimées:
   * - createIngredient → ingredientRepo.create()
   * - getIngredientById → ingredientRepo.findById()
   * - getAllIngredients → ingredientRepo.findAll() / getAllIngredients()
   * - updateIngredient → ingredientRepo.update()
   * - deleteIngredient → ingredientRepo.deleteById()
   * 
   * Cette section a été supprimée pour réduire la taille de database.ts
   * Utilisez IngredientRepository pour toutes les opérations sur les ingrédients.
   */

  /**
   * ============================================
   * GESTION DES RATIONS BUDGET (BUDGÉTISATION ALIMENT)
   * ============================================
   * 
   * ⚠️ NOTE: Toutes les fonctions CRUD RationBudget ont été migrées vers RationRepository
   * Voir: src/database/repositories/RationRepository.ts
   * 
   * Fonctions supprimées:
   * - createRationBudget → rationRepo.createRationBudget()
   * - getRationBudgetById → rationRepo.findRationBudgetById()
   * - getRationsBudgetByProjet → rationRepo.findRationsBudgetByProjet()
   * - updateRationBudget → rationRepo.updateRationBudget()
   * - deleteRationBudget → rationRepo.deleteRationBudget()
   * 
   * Cette section a été supprimée pour réduire la taille de database.ts
   * Utilisez RationRepository pour toutes les opérations sur les rations budget.
   */

  /**
   * ============================================
   * GESTION DES STOCKS D'ALIMENTS
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD Stock ont été migrées vers StockRepository
   * Voir: src/database/repositories/StockRepository.ts
   * 
   * Fonctions supprimées:
   * - createStockAliment → stockRepo.create()
   * - getStockAlimentById → stockRepo.findById()
   * - getStocksParProjet → stockRepo.findByProjet()
   * - getStocksEnAlerte → stockRepo.findEnAlerte()
   * - updateStockAliment → stockRepo.update()
   * - deleteStockAliment → stockRepo.delete()
   * - createStockMouvement → stockRepo.createMouvement() (via StockRepository)
   * - getStockMouvementById → stockRepo.getMouvements()
   * - getMouvementsParAliment → stockRepo.getMouvements()
   * - getMouvementsRecents → stockRepo.getAllMouvementsByProjet()
   */


  /**
   * ============================================
   * GESTION PRODUCTION - ANIMAUX & PESÉES
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD Production ont été migrées vers AnimalRepository et PeseeRepository
   * Voir: src/database/repositories/AnimalRepository.ts et PeseeRepository.ts
   * 
   * Fonctions supprimées:
   * - createProductionAnimal → animalRepo.create()
   * - getProductionAnimalById → animalRepo.findById()
   * - getProductionAnimaux → animalRepo.findByProjet() / findActiveByProjet()
   * - updateProductionAnimal → animalRepo.update()
   * - deleteProductionAnimal → animalRepo.deleteById()
   * - createPesee → peseeRepo.create()
   * - getPeseeById → peseeRepo.findById()
   * - getPeseesParAnimal → peseeRepo.findByAnimal()
   * - getPeseesRecents → peseeRepo.findRecentsByProjet()
   * - updatePesee → peseeRepo.update()
   * - deletePesee → peseeRepo.deleteById()
   * 
   * ⚠️ CONSERVÉ TEMPORAIREMENT:
   * - getProductionAnimaux → Utilisé par createMortalite et creerPorceletsDepuisGestation
   * - createProductionAnimal → Utilisé par creerPorceletsDepuisGestation
   * - getDernierePeseeAvantDate → Logique complexe à migrer
   */

  /**
   * ============================================
   * MODULE PRODUCTION - ANIMAUX
   * ============================================
   * 
   * ⚠️ NOTE: Toutes les fonctions CRUD Production ont été migrées vers AnimalRepository
   * Voir: src/database/repositories/AnimalRepository.ts
   * 
   * Fonctions supprimées:
   * - createProductionAnimal → animalRepo.create()
   * - getProductionAnimalById → animalRepo.findById()
   * - getProductionAnimaux → animalRepo.findByProjet() / findActiveByProjet()
   * - updateProductionAnimal → animalRepo.update()
   * - deleteProductionAnimal → animalRepo.deleteById()
   * 
   * Cette section a été supprimée pour réduire la taille de database.ts
   * Utilisez AnimalRepository pour toutes les opérations sur les animaux.
   */

  /**
   * ============================================
   * MODULE PRODUCTION - PESÉES
   * ============================================
   * 
   * ⚠️ NOTE: Toutes les fonctions CRUD Pesées ont été migrées vers PeseeRepository
   * Voir: src/database/repositories/PeseeRepository.ts
   * 
   * Fonctions supprimées:
   * - createPesee → peseeRepo.create()
   * - getPeseeById → peseeRepo.findById()
   * - updatePesee → peseeRepo.update()
   * - deletePesee → peseeRepo.deleteById()
   * 
   * Cette section a été supprimée pour réduire la taille de database.ts
   * Utilisez PeseeRepository pour toutes les opérations sur les pesées.
   */

  /**
   * Recalcule les GMQ de toutes les pesées suivant une date donnée pour un animal
   */
  /**
   * ⚠️ DEPRECATED: Utilisez ProductionGMQService.recalculerGMQ() à la place
   * Cette méthode est conservée temporairement pour compatibilité
   * @deprecated Utilisez ProductionGMQService.recalculerGMQ(animalId, dateModifiee)
   * @private
   */
  private async recalculerGMQSuivants(animalId: string, dateModifiee: string): Promise<void> {
    const { ProductionGMQService } = await import('./production/ProductionGMQService');
    return ProductionGMQService.recalculerGMQ(animalId, dateModifiee);
  }


  /**
   * ============================================
   * GESTION DES RATIONS
   * ============================================
   * 
   * ⚠️ NOTE: Toutes les fonctions CRUD Ration ont été migrées vers RationRepository
   * Voir: src/database/repositories/RationRepository.ts
   * 
   * Fonctions supprimées:
   * - createRation → rationRepo.create()
   * - getRationById → rationRepo.findById()
   * - getAllRations → rationRepo.findByProjet()
   * - deleteRation → rationRepo.delete()
   * 
   * Cette section a été supprimée pour réduire la taille de database.ts
   * Utilisez RationRepository pour toutes les opérations sur les rations.
   */

  /**
   * ============================================
   * GESTION DES RAPPORTS DE CROISSANCE
   * ============================================
   * 
   * ⚠️ NOTE: Toutes les fonctions CRUD RapportCroissance ont été migrées vers RapportCroissanceRepository
   * Voir: src/database/repositories/RapportCroissanceRepository.ts
   * 
   * Fonctions supprimées:
   * - createRapportCroissance → rapportRepo.create()
   * - getRapportCroissanceById → rapportRepo.findById()
   * - getAllRapportsCroissance → rapportRepo.findAll()
   * - getRapportsCroissanceParProjet → rapportRepo.findByProjet()
   * - getRapportsCroissanceParDateRange → rapportRepo.findByDateRange()
   * - deleteRapportCroissance → rapportRepo.delete()
   * 
   * Cette section a été supprimée pour réduire la taille de database.ts
   * Utilisez RapportCroissanceRepository pour toutes les opérations sur les rapports de croissance.
   */

  /**
   * ============================================
   * GESTION DES MORTALITÉS
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD Mortalite ont été migrées vers MortaliteRepository
   * Voir: src/database/repositories/MortaliteRepository.ts
   * 
   * Fonctions supprimées:
   * - getMortaliteById → mortaliteRepo.findById()
   * - getAllMortalites → mortaliteRepo.findByProjet()
   * - getMortalitesParProjet → mortaliteRepo.findByProjet()
   * - getMortalitesParDateRange → mortaliteRepo.findByPeriod()
   * - getMortalitesParCategorie → mortaliteRepo.findByCategorie()
   * - updateMortalite → mortaliteRepo.update()
   * - deleteMortalite → mortaliteRepo.delete()
   * 
   * ⚠️ CONSERVÉ TEMPORAIREMENT:
   * - createMortalite → Utilise getProductionAnimaux (à migrer quand Production sera migré)
   * - getStatistiquesMortalite → Logique complexe à migrer vers un service dédié
   */

  /**
   * ============================================
   * MODULE MORTALITÉ
   * ============================================
   * 
   * ⚠️ NOTE: Les fonctions CRUD Mortalités ont été migrées vers MortaliteRepository
   * Voir: src/database/repositories/MortaliteRepository.ts
   * 
   * Fonctions supprimées:
   * - createMortalite → mortaliteRepo.createWithAnimalUpdate()
   * - getMortaliteById → mortaliteRepo.findById()
   * - getAllMortalites → mortaliteRepo.findByProjet()
   * - getMortalitesParDateRange → mortaliteRepo.findByPeriod()
   * - getMortalitesParCategorie → mortaliteRepo.findByProjet() + filtre
   * - updateMortalite → mortaliteRepo.update()
   * - deleteMortalite → mortaliteRepo.delete()
   * 
   * Cette section a été supprimée pour réduire la taille de database.ts
   * Utilisez MortaliteRepository pour toutes les opérations de mortalité.
   */

  /**
   * ⚠️ NOTE: getStatistiquesMortalite a été migrée vers MortaliteRepository
   * Voir: src/database/repositories/MortaliteRepository.ts
   * 
   * Cette fonction existe déjà dans MortaliteRepository.getStatistiquesMortalite()
   * Utilisez MortaliteRepository pour toutes les statistiques de mortalité.
   */

  /**
   * ============================================
   * GESTION DES PLANIFICATIONS
   * ============================================
   * 
   * ⚠️ NOTE: Toutes les fonctions CRUD Planification ont été migrées vers PlanificationRepository
   * Voir: src/database/repositories/PlanificationRepository.ts
   * 
   * Fonctions supprimées:
   * - createPlanification → planificationRepo.create()
   * - getPlanificationById → planificationRepo.findById()
   * - getAllPlanifications → planificationRepo.findByProjet()
   * - getPlanificationsParProjet → planificationRepo.findByProjet()
   * - getPlanificationsParStatut → planificationRepo.findByStatut()
   * - getPlanificationsParDateRange → planificationRepo.findByPeriod()
   * - getPlanificationsAVenir → planificationRepo.findAVenir()
   * - updatePlanification → planificationRepo.update()
   * - deletePlanification → planificationRepo.deleteById()
   * 
   * Cette section a été supprimée pour réduire la taille de database.ts
   * Utilisez PlanificationRepository pour toutes les opérations sur les planifications.
   */

  /**
   * ============================================
   * GESTION DES COLLABORATIONS
   * ============================================
   * 
   * ⚠️ NOTE: Toutes les fonctions CRUD Collaborateur ont été migrées vers CollaborateurRepository
   * Voir: src/database/repositories/CollaborateurRepository.ts
   * 
   * Fonctions supprimées:
   * - createCollaborateur → collaborateurRepo.create()
   * - getCollaborateurById → collaborateurRepo.findById()
   * - getAllCollaborateurs → collaborateurRepo.findByProjet()
   * - getCollaborateursParProjet → collaborateurRepo.findByProjet()
   * - getCollaborateursParStatut → collaborateurRepo.findByStatut()
   * - getCollaborateursParRole → collaborateurRepo.findByRole()
   * - getCollaborateurActifParEmail → collaborateurRepo.findActifByEmail()
   * - getCollaborateursActifsParUserId → collaborateurRepo.findActifsByUserId()
   * - lierCollaborateurAUtilisateur → collaborateurRepo.lierCollaborateurAUtilisateur()
   * - getCollaborateursParEmail → collaborateurRepo.findByEmail()
   * - getInvitationsEnAttenteParUserId → collaborateurRepo.findInvitationsEnAttenteByUserId()
   * - getInvitationsEnAttenteParEmail → collaborateurRepo.findInvitationsEnAttenteByEmail()
   * - updateCollaborateur → collaborateurRepo.update()
   * - deleteCollaborateur → collaborateurRepo.deleteById()
   * 
   * Cette section a été supprimée pour réduire la taille de database.ts
   * Utilisez CollaborateurRepository pour toutes les opérations sur les collaborateurs.
   */




  /**
   * ⚠️ DEPRECATED: Utilisez utils/dateUtils.calculateDayDifference() à la place
   * Cette méthode est conservée temporairement pour compatibilité
   * @deprecated Utilisez dateUtils.calculateDayDifference(start, end)
   * @private
   */
  private calculateDayDifference(start: string, end: string): number {
    // Utiliser la fonction utilitaire si elle existe, sinon calculer localement
    try {
      const { calculateDayDifference } = require('../utils/dateUtils');
      return calculateDayDifference(start, end);
    } catch {
      // Fallback si la fonction n'existe pas encore
    const parseDateOnly = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    const startDate = parseDateOnly(start);
    const endDate = parseDateOnly(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays <= 0 ? 0 : diffDays;
    }
  }

  /**
   * Nettoie toutes les données d'un utilisateur (projets et données associées)
   */
  async clearUserData(userId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    try {
      // Récupérer tous les projets de l'utilisateur
      const projets = await this.db.getAllAsync<{ id: string }>(
        'SELECT id FROM projets WHERE proprietaire_id = ?',
        [userId]
      );

      // Pour chaque projet, supprimer toutes les données associées
      for (const projet of projets) {
        const projetId = projet.id;

        // Supprimer toutes les données liées au projet (en respectant l'ordre des dépendances)
        await this.db.runAsync('DELETE FROM stocks_mouvements WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM stocks_aliments WHERE projet_id = ?', [projetId]);
        await this.db.runAsync(
          'DELETE FROM ingredients_ration WHERE ration_id IN (SELECT id FROM rations WHERE projet_id = ?)',
          [projetId]
        );
        await this.db.runAsync('DELETE FROM rations WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM production_pesees WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM production_animaux WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM sevrages WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM gestations WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM depenses_ponctuelles WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM revenus WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM charges_fixes WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM rapports_croissance WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM mortalites WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM planifications WHERE projet_id = ?', [projetId]);
        await this.db.runAsync('DELETE FROM collaborations WHERE projet_id = ?', [projetId]);
      }

      // Supprimer les projets de l'utilisateur
      await this.db.runAsync('DELETE FROM projets WHERE proprietaire_id = ?', [userId]);
    } catch (error) {
      console.error('Erreur lors du nettoyage des données utilisateur:', error);
      throw error;
    }
  }
}

// Instance singleton
export const databaseService = new DatabaseService();

/**
 * Fonction helper pour obtenir la base de données
 * Utilisée par les repositories
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  await databaseService.initialize();
  const db = (databaseService as any).db;
  if (!db) {
    throw new Error('Base de données non initialisée');
  }
  return db;
}
