/**
 * Service de synchronisation de profil utilisateur
 * Permet de synchroniser la photo de profil et les données utilisateur entre appareils
 */

import { AppDispatch } from '../store/hooks';
import { loadUserFromStorageThunk, updateUser } from '../store/slices/authSlice';
import apiClient, { APIError } from './api/apiClient';
import { logger } from '../utils/logger';
import type { User } from '../types/auth';

interface ProfileSyncOptions {
  /**
   * Intervalle de vérification en millisecondes (défaut: 30 secondes)
   */
  checkInterval?: number;
  /**
   * Callback appelé quand un changement est détecté
   */
  onProfileChanged?: (user: User) => void;
}

class ProfileSyncService {
  private checkInterval: number = 30000; // 30 secondes par défaut
  private intervalId: NodeJS.Timeout | null = null;
  private lastPhotoUri: string | null = null;
  private lastCheckTimestamp: number = 0;
  private isRunning: boolean = false;
  private userId: string | null = null;
  private dispatch: AppDispatch | null = null;
  private onProfileChangedCallback: ((user: User) => void) | null = null;

  /**
   * Démarrer la synchronisation périodique
   */
  start(userId: string, dispatch: AppDispatch, options: ProfileSyncOptions = {}) {
    if (this.isRunning && this.userId === userId) {
      // Déjà en cours pour cet utilisateur
      return;
    }

    // Arrêter la synchronisation précédente si elle existe
    this.stop();

    this.userId = userId;
    this.dispatch = dispatch;
    this.checkInterval = options.checkInterval || 30000;
    this.onProfileChangedCallback = options.onProfileChanged || null;

    // Démarrer le polling immédiatement
    // Le premier check initialisera lastPhotoUri, les suivants détecteront les changements
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);
    
    // Faire un premier check immédiat pour initialiser le cache
    this.checkForUpdates().catch((error) => {
      logger.error('[ProfileSyncService] Erreur lors du premier check:', error);
    });

    logger.log(`[ProfileSyncService] Synchronisation démarrée pour l'utilisateur ${userId}`);
  }

  /**
   * Arrêter la synchronisation
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.userId = null;
    this.dispatch = null;
    this.lastPhotoUri = null;
    this.lastCheckTimestamp = 0;
    logger.log('[ProfileSyncService] Synchronisation arrêtée');
  }

  /**
   * Vérifier manuellement les mises à jour (appel immédiat)
   */
  async checkNow(): Promise<boolean> {
    if (!this.userId || !this.dispatch) {
      return false;
    }

    return this.checkForUpdates();
  }


  /**
   * Vérifier les mises à jour du profil
   */
  private async checkForUpdates(): Promise<boolean> {
    if (!this.userId || !this.dispatch) {
      return false;
    }

    try {
      // Récupérer le profil depuis l'API
      const apiUser = await apiClient.get<User>(`/users/${this.userId}`);

      if (!apiUser) {
        return false;
      }

      // Vérifier si la photo a changé
      const currentPhotoUri = apiUser.photo || null;
      
      // Si lastPhotoUri n'est pas encore initialisé (premier check), l'initialiser sans déclencher de callback
      if (this.lastPhotoUri === null) {
        this.lastPhotoUri = currentPhotoUri;
        this.lastCheckTimestamp = Date.now();
        return false; // Pas de changement, juste initialisation
      }
      
      const photoChanged = this.lastPhotoUri !== currentPhotoUri;

      // Vérifier si d'autres données ont changé (nom, prénom, etc.)
      // Pour l'instant, on se concentre sur la photo
      if (photoChanged) {
        logger.log('[ProfileSyncService] Changement de photo détecté', {
          old: this.lastPhotoUri,
          new: currentPhotoUri,
        });

        // Mettre à jour le state Redux
        this.dispatch(updateUser(apiUser));

        // Appeler le callback si fourni
        if (this.onProfileChangedCallback) {
          this.onProfileChangedCallback(apiUser);
        }

        // Mettre à jour la photo en cache
        this.lastPhotoUri = currentPhotoUri;
        this.lastCheckTimestamp = Date.now();

        return true;
      }

      // Même si la photo n'a pas changé, mettre à jour le timestamp
      this.lastCheckTimestamp = Date.now();

      return false;
    } catch (error) {
      // Ne pas loguer les timeouts (408) comme des erreurs critiques (ils sont récupérables et gérés par le retry handler)
      if (error instanceof APIError && error.status === 408) {
        logger.debug('[ProfileSyncService] Timeout réseau lors de la vérification (non critique, retry automatique)');
      } else if (error instanceof Error && error.message.includes('timeout')) {
        logger.debug('[ProfileSyncService] Timeout lors de la vérification (non critique)');
      } else {
        logger.error('[ProfileSyncService] Erreur lors de la vérification des mises à jour:', error);
      }
      return false;
    }
  }

  /**
   * Obtenir le timestamp de la dernière vérification
   */
  getLastCheckTimestamp(): number {
    return this.lastCheckTimestamp;
  }

  /**
   * Vérifier si le service est en cours d'exécution
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Instance singleton
export const profileSyncService = new ProfileSyncService();

