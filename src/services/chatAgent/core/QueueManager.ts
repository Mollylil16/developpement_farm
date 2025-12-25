/**
 * QueueManager - Gestionnaire de file d'attente pour actions en mode offline
 * Stocke les actions qui échouent (timeout, réseau, erreurs serveur) et les réexécute automatiquement
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AgentAction, AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { checkNetworkConnectivity } from '../../network/networkService';

const QUEUE_STORAGE_KEY = '@kouakou:action_queue';
const MAX_QUEUE_SIZE = 100; // Limite pour éviter de remplir le stockage

export interface QueuedAction {
  id: string;
  action: AgentAction;
  context: AgentContext;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

/**
 * Gestionnaire de file d'attente pour les actions en attente
 */
export class QueueManager {
  private queue: QueuedAction[] = [];
  private isProcessing = false;

  /**
   * Initialise le QueueManager en chargeant la queue depuis AsyncStorage
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`[QueueManager] Queue chargée : ${this.queue.length} action(s) en attente`);
      }
    } catch (error) {
      console.error('[QueueManager] Erreur lors du chargement de la queue:', error);
      this.queue = [];
    }
  }

  /**
   * Ajoute une action à la file d'attente
   */
  async enqueue(action: AgentAction, context: AgentContext, error?: string): Promise<void> {
    // Vérifier la taille maximale
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      console.warn('[QueueManager] Queue pleine, suppression de la plus ancienne action');
      this.queue.shift(); // Supprimer la plus ancienne
    }

    const queuedAction: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      action,
      context,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: error,
    };

    this.queue.push(queuedAction);
    await this.saveQueue();

    console.log(`[QueueManager] Action ajoutée à la queue (${this.queue.length} au total)`);
  }

  /**
   * Retire une action de la file d'attente
   */
  async dequeue(actionId: string): Promise<void> {
    this.queue = this.queue.filter((item) => item.id !== actionId);
    await this.saveQueue();
  }

  /**
   * Récupère toutes les actions en attente
   */
  getQueue(): QueuedAction[] {
    return [...this.queue]; // Retourne une copie pour éviter les modifications externes
  }

  /**
   * Vide complètement la file d'attente
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }

  /**
   * Tente de traiter toutes les actions en attente
   * À appeler quand la connexion revient
   */
  async processQueue(
    executor: (action: AgentAction, context: AgentContext) => Promise<AgentActionResult>
  ): Promise<{ succeeded: number; failed: number }> {
    if (this.isProcessing) {
      console.log('[QueueManager] Déjà en cours de traitement');
      return { succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;
    let succeeded = 0;
    let failed = 0;

    try {
      // Vérifier la connectivité
      const networkState = await checkNetworkConnectivity();
      if (!networkState.isConnected) {
        console.log('[QueueManager] Pas de connexion, traitement annulé');
        return { succeeded: 0, failed: 0 };
      }

      console.log(`[QueueManager] Traitement de ${this.queue.length} action(s) en attente`);

      const actionsToProcess = [...this.queue]; // Copie pour éviter les modifications pendant l'itération
      const failedActions: QueuedAction[] = [];

      for (const queuedAction of actionsToProcess) {
        try {
          // Limiter le nombre de retries
          if (queuedAction.retryCount >= 3) {
            console.warn(`[QueueManager] Action ${queuedAction.id} abandonnée après 3 tentatives`);
            await this.dequeue(queuedAction.id);
            failed++;
            continue;
          }

          // Exécuter l'action
          const result = await executor(queuedAction.action, queuedAction.context);

          if (result.success) {
            // Action réussie, la retirer de la queue
            await this.dequeue(queuedAction.id);
            succeeded++;
            console.log(`[QueueManager] Action ${queuedAction.id} traitée avec succès`);
          } else {
            // Action échouée, incrémenter le compteur de retry
            queuedAction.retryCount++;
            queuedAction.lastError = result.message || result.error || 'Erreur inconnue';
            failedActions.push(queuedAction);
          }
        } catch (error) {
          // Erreur lors de l'exécution, incrémenter le compteur de retry
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          queuedAction.retryCount++;
          queuedAction.lastError = errorMessage;
          failedActions.push(queuedAction);
          console.error(`[QueueManager] Erreur lors du traitement de l'action ${queuedAction.id}:`, errorMessage);
        }
      }

      // Mettre à jour les actions qui ont échoué
      this.queue = failedActions;
      await this.saveQueue();

      failed = failedActions.length;
    } catch (error) {
      console.error('[QueueManager] Erreur lors du traitement de la queue:', error);
    } finally {
      this.isProcessing = false;
    }

    console.log(`[QueueManager] Traitement terminé : ${succeeded} succès, ${failed} échecs`);
    return { succeeded, failed };
  }

  /**
   * Sauvegarde la queue dans AsyncStorage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[QueueManager] Erreur lors de la sauvegarde de la queue:', error);
    }
  }

  /**
   * Retourne le nombre d'actions en attente
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}

// Instance singleton
export const queueManager = new QueueManager();

