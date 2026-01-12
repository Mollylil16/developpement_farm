/**
 * Queue de requêtes API avec limitation de concurrence et priorités
 * Évite le "thundering herd" au démarrage de l'app
 * Priorités : HIGH (auth, écriture) > NORMAL (lecture) > LOW (requêtes moins critiques)
 */

export enum RequestPriority {
  HIGH = 3,    // Auth, requêtes critiques
  NORMAL = 2,  // Requêtes normales (lecture/écriture standard)
  LOW = 1,     // Requêtes moins critiques (stats, analytics)
}

type QueuedRequest<T> = {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  priority: RequestPriority;
  timestamp: number; // Pour trier les requêtes de même priorité (FIFO)
};

class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private activeRequests = 0;
  private maxConcurrent: number;
  private baseDelay: number;
  private adaptiveDelay: number; // Délai adaptatif basé sur la charge

  constructor(maxConcurrent = 4, baseDelay = 50) {
    this.maxConcurrent = maxConcurrent;
    this.baseDelay = baseDelay;
    this.adaptiveDelay = baseDelay;
  }

  /**
   * Ajoute une requête à la queue et retourne une Promise
   * @param execute Fonction à exécuter
   * @param priority Priorité de la requête (HIGH, NORMAL, LOW)
   */
  enqueue<T>(execute: () => Promise<T>, priority: RequestPriority = RequestPriority.NORMAL): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        execute,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
        timestamp: Date.now(),
      };
      
      // Insérer la requête selon sa priorité (plus haute priorité en premier)
      // Pour même priorité, FIFO (plus ancienne en premier)
      const insertIndex = this.queue.findIndex(
        (req) => req.priority < priority || (req.priority === priority && req.timestamp > request.timestamp)
      );
      
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }
      
      this.processQueue();
    });
  }

  /**
   * Traite la queue de requêtes
   */
  private async processQueue(): Promise<void> {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.activeRequests++;

    try {
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      
      // Délai adaptatif : plus la queue est longue, plus le délai est long
      // Cela évite de surcharger le serveur si beaucoup de requêtes sont en attente
      if (this.queue.length > 0) {
        const queueLength = this.queue.length;
        // Augmenter le délai si beaucoup de requêtes en attente (jusqu'à 200ms max)
        this.adaptiveDelay = Math.min(this.baseDelay * (1 + queueLength * 0.1), 200);
        setTimeout(() => this.processQueue(), this.adaptiveDelay);
      } else {
        // Réinitialiser le délai si la queue est vide
        this.adaptiveDelay = this.baseDelay;
      }
    }

    // Continuer à traiter la queue
    this.processQueue();
  }

  /**
   * Retourne le nombre de requêtes en attente
   */
  get pendingCount(): number {
    return this.queue.length;
  }

  /**
   * Retourne le nombre de requêtes actives
   */
  get activeCount(): number {
    return this.activeRequests;
  }

  /**
   * Vide la queue (annule les requêtes en attente)
   */
  clear(): void {
    const pendingRequests = this.queue.splice(0);
    pendingRequests.forEach((req) => {
      req.reject(new Error('Request cancelled - queue cleared'));
    });
  }
}

// Instance singleton pour toute l'application
export const requestQueue = new RequestQueue(4, 50); // Max 4 requêtes concurrentes, délai de base 50ms

/**
 * Détermine la priorité d'une requête basée sur son endpoint
 */
export function getRequestPriority(endpoint: string, method: string): RequestPriority {
  // Auth et refresh sont toujours prioritaires
  if (endpoint.includes('/auth/')) {
    return RequestPriority.HIGH;
  }
  
  // Écritures (POST, PUT, PATCH, DELETE) sont prioritaires
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    return RequestPriority.HIGH;
  }
  
  // Requêtes de lecture critiques (données utilisateur, projet actif)
  if (
    endpoint.includes('/users/me') ||
    endpoint.includes('/projets/actif') ||
    endpoint.includes('/production/animaux')
  ) {
    return RequestPriority.HIGH;
  }
  
  // Requêtes de lecture normales
  if (method.toUpperCase() === 'GET') {
    return RequestPriority.NORMAL;
  }
  
  // Par défaut, priorité normale
  return RequestPriority.NORMAL;
}

export default requestQueue;

