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
  private lastDataHash: string | null = null; // Hash des autres données utilisateur
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
    this.lastDataHash = null;
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
      // Timeout réduit pour la sync de profil (non-critique, en arrière-plan)
      const apiUser = await apiClient.get<User>(`/users/${this.userId}`, {
        timeout: 8000, // 8 secondes au lieu du timeout par défaut
        retry: false, // Pas de retry automatique (vérification périodique)
      });

      if (!apiUser) {
        return false;
      }

      // Vérifier si la photo a changé
      const currentPhotoUri = apiUser.photo || null;
      
      // Si lastPhotoUri n'est pas encore initialisé (premier check), l'initialiser sans déclencher de callback
      if (this.lastPhotoUri === null) {
        this.lastPhotoUri = currentPhotoUri;
        this.lastCheckTimestamp = Date.now();
        // Initialiser aussi le hash des données
        this.lastDataHash = JSON.stringify({
          nom: apiUser.nom,
          prenom: apiUser.prenom,
          email: apiUser.email,
        });
        // Mettre quand même à jour le Redux store pour s'assurer que les données sont à jour
        this.dispatch(updateUser(apiUser));
        return false; // Pas de changement, juste initialisation
      }
      
      // Comparer les URIs sans les paramètres de cache busting pour détecter les vrais changements
      const normalizeUri = (uri: string | null): string | null => {
        if (!uri) return null;
        // Retirer les paramètres de cache busting (_t, timestamp, etc.)
        return uri.split('?')[0].split('&')[0];
      };
      
      const normalizedCurrent = normalizeUri(currentPhotoUri);
      const normalizedLast = normalizeUri(this.lastPhotoUri);
      const photoChanged = normalizedCurrent !== normalizedLast;

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

      // Même si la photo n'a pas changé, vérifier si d'autres données ont changé
      // et mettre à jour le Redux store pour s'assurer de la synchronisation
      const currentDataHash = JSON.stringify({
        nom: apiUser.nom,
        prenom: apiUser.prenom,
        email: apiUser.email,
      });
      const lastDataHash = this.lastDataHash || '';
      
      if (currentDataHash !== lastDataHash) {
        // Données utilisateur changées (nom, prénom, etc.)
        this.dispatch(updateUser(apiUser));
        this.lastDataHash = currentDataHash;
      }
      
      // Mettre à jour le timestamp même si rien n'a changé
      this.lastCheckTimestamp = Date.now();

      return false;
    } catch (error) {
      // Ne pas loguer les timeouts comme des erreurs critiques (opération en arrière-plan, vérification périodique)
      const isTimeout = 
        (error instanceof APIError && error.status === 408) ||
        (error instanceof Error && error.message.includes('timeout')) ||
        (error instanceof Error && error.message.includes('Network request timed out')) ||
        (error instanceof Error && error.name === 'AbortError') ||
        (error instanceof Error && error.message.includes('aborted'));
      
      if (isTimeout) {
        // Timeout silencieux (vérification périodique, retry automatique au prochain intervalle)
        // Ne pas logger comme erreur pour éviter le spam dans les logs
        if (__DEV__) {
          logger.debug('[ProfileSyncService] Timeout lors de la vérification (non critique, retry au prochain intervalle)');
        }
      } else {
        // Logger uniquement les erreurs non-timeout
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

