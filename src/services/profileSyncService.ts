/**
 * Service de synchronisation de profil utilisateur
 * Permet de synchroniser la photo de profil et les données utilisateur entre appareils
 */

import { AppDispatch } from '../store/hooks';
import { loadUserFromStorageThunk, updateUser } from '../store/slices/authSlice';
import apiClient, { APIError } from './api/apiClient';
import { logger } from '../utils/logger';
import type { User } from '../types/auth';
import { normalizePhotoUri, comparePhotoUris } from '../utils/profilePhotoUtils';

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
  // Circuit breaker pour éviter les tentatives répétées si le backend est inaccessible
  private consecutiveFailures: number = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3; // Après 3 échecs, augmenter l'intervalle
  private readonly BACKOFF_MULTIPLIER = 2; // Doubler l'intervalle après échecs
  private readonly MAX_BACKOFF_INTERVAL = 300000; // 5 minutes maximum

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
    // Utiliser l'intervalle personnalisé ou l'intervalle actuel (si déjà augmenté par le circuit breaker)
    // Ne pas réinitialiser si le circuit breaker a déjà augmenté l'intervalle
    if (!this.isRunning) {
      this.checkInterval = options.checkInterval || 30000;
    } else {
      // Si déjà en cours, garder l'intervalle actuel (peut être augmenté par le circuit breaker)
      this.checkInterval = this.checkInterval || options.checkInterval || 30000;
    }
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
    this.consecutiveFailures = 0; // Réinitialiser le compteur d'échecs
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
    // Vérifier que le service est toujours actif et que dispatch est disponible
    if (!this.isRunning || !this.userId || !this.dispatch) {
      return false;
    }

    try {
      // Récupérer le profil depuis l'API
      // Timeout augmenté pour éviter les timeouts prématurés si le backend est lent
      const apiUser = await apiClient.get<User>(`/users/${this.userId}`, {
        timeout: 15000, // 15 secondes
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
        if (this.dispatch) {
          this.dispatch(updateUser(apiUser));
        }
        return false; // Pas de changement, juste initialisation
      }
      
      // Comparer les URIs en utilisant la fonction utilitaire partagée
      // Cette fonction ignore les paramètres de cache busting et ne compare que les URLs serveur
      // Les URIs locales ne sont pas comparées (retourne false)
      const photoChanged = !comparePhotoUris(currentPhotoUri, this.lastPhotoUri);

      // Vérifier si d'autres données ont changé (nom, prénom, etc.)
      // Pour l'instant, on se concentre sur la photo
      if (photoChanged) {
        // Normaliser les URIs pour le log (retire les paramètres de cache)
        const normalizedOld = normalizePhotoUri(this.lastPhotoUri);
        const normalizedNew = normalizePhotoUri(currentPhotoUri);
        
        logger.log('[ProfileSyncService] Changement de photo détecté', {
          old: normalizedOld || this.lastPhotoUri,
          new: normalizedNew || currentPhotoUri,
          isServerUrl: normalizedNew !== null,
        });

        // Mettre à jour le state Redux
        if (this.dispatch) {
          this.dispatch(updateUser(apiUser));
        }

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
        if (this.dispatch) {
          this.dispatch(updateUser(apiUser));
        }
        this.lastDataHash = currentDataHash;
      }
      
      // Mettre à jour le timestamp même si rien n'a changé
      this.lastCheckTimestamp = Date.now();
      
      // Réinitialiser le compteur d'échecs en cas de succès
      if (this.consecutiveFailures > 0) {
        this.consecutiveFailures = 0;
        // Si l'intervalle avait été augmenté, le remettre à la normale
        if (this.checkInterval > 30000 && this.isRunning) {
          this.checkInterval = 30000;
          if (this.intervalId) {
            clearInterval(this.intervalId);
          }
          this.intervalId = setInterval(() => {
            this.checkForUpdates();
          }, this.checkInterval);
          if (__DEV__) {
            logger.debug('[ProfileSyncService] Backend accessible. Intervalle remis à 30s');
          }
        }
      }

      return false;
    } catch (error) {
      // Ne pas loguer les timeouts comme des erreurs critiques (opération en arrière-plan, vérification périodique)
      const isTimeout = 
        (error instanceof APIError && error.status === 408) ||
        (error instanceof Error && error.message.includes('timeout')) ||
        (error instanceof Error && error.message.includes('Network request timed out')) ||
        (error instanceof Error && error.name === 'AbortError') ||
        (error instanceof Error && error.message.includes('aborted')) ||
        (error instanceof Error && error.message.includes('Aborted'));
      
      if (isTimeout) {
        // Circuit breaker : compter les échecs consécutifs
        this.consecutiveFailures += 1;
        
        // Si trop d'échecs consécutifs, augmenter l'intervalle (backoff exponentiel)
        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES && this.isRunning) {
          const newInterval = Math.min(
            this.checkInterval * Math.pow(this.BACKOFF_MULTIPLIER, this.consecutiveFailures - this.MAX_CONSECUTIVE_FAILURES),
            this.MAX_BACKOFF_INTERVAL
          );
          
          if (newInterval > this.checkInterval) {
            // Redémarrer l'intervalle avec le nouveau délai
            if (this.intervalId) {
              clearInterval(this.intervalId);
            }
            this.checkInterval = newInterval;
            this.intervalId = setInterval(() => {
              this.checkForUpdates();
            }, this.checkInterval);
            
            if (__DEV__) {
              logger.debug(`[ProfileSyncService] Backend inaccessible. Intervalle augmenté à ${this.checkInterval}ms (${Math.round(this.checkInterval / 1000)}s)`);
            }
          }
        } else if (__DEV__) {
          logger.debug('[ProfileSyncService] Timeout lors de la vérification (non critique, retry au prochain intervalle)');
        }
        
        // Retourner false pour indiquer qu'aucun changement n'a été détecté (mais sans erreur)
        return false;
      } else {
        // Logger uniquement les erreurs non-timeout avec plus de détails
        const errorDetails = error instanceof Error 
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : { error: String(error) };
        
        logger.error('[ProfileSyncService] Erreur lors de la vérification des mises à jour:', errorDetails);
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

