/**
 * Service de base de données - API PostgreSQL via Backend
 * Toutes les opérations de base de données passent maintenant par l'API REST du backend
 * qui utilise PostgreSQL
 */

import { dbLogger } from '../utils/logger';

/**
 * Interface pour représenter une connexion API (remplace SQLite)
 * Cette interface est maintenue pour la compatibilité avec le code existant
 */
export interface DatabaseConnection {
  // Cette interface est vide car nous n'utilisons plus de connexion directe
  // Toutes les opérations passent par apiClient
}

class DatabaseService {
  private isInitialized: boolean = false;

  /**
   * Initialise le service de base de données
   * Pour PostgreSQL via API, cette méthode vérifie simplement la connectivité
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      dbLogger.log('Initialisation du service de base de données (PostgreSQL via API)...');
      
      // Vérifier la connectivité avec le backend
      // Cette vérification sera faite lors de la première requête API
      
      this.isInitialized = true;
      dbLogger.success('Service de base de données initialisé (PostgreSQL via API)');
    } catch (error) {
      dbLogger.error("Erreur lors de l'initialisation du service de base de données:", error);
      throw error;
    }
  }

  /**
   * Obtient la connexion (maintenu pour compatibilité)
   * Retourne un objet vide car toutes les opérations passent par apiClient
   */
  getConnection(): DatabaseConnection {
    return {};
  }
}

// Instance singleton
export const databaseService = new DatabaseService();

/**
 * Fonction helper pour obtenir la base de données
 * Utilisée par les repositories
 * 
 * ⚠️ DEPRECATED: Cette fonction est maintenue pour compatibilité
 * Les repositories utilisent maintenant directement apiClient via BaseRepository
 */
export async function getDatabase(): Promise<DatabaseConnection> {
  await databaseService.initialize();
  return databaseService.getConnection();
}
