/**
 * Queue de requêtes API avec limitation de concurrence
 * Évite le "thundering herd" au démarrage de l'app
 */

type QueuedRequest<T> = {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private activeRequests = 0;
  private maxConcurrent: number;
  private delayBetweenRequests: number;

  constructor(maxConcurrent = 4, delayBetweenRequests = 50) {
    this.maxConcurrent = maxConcurrent;
    this.delayBetweenRequests = delayBetweenRequests;
  }

  /**
   * Ajoute une requête à la queue et retourne une Promise
   */
  enqueue<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
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
      
      // Petit délai entre les requêtes pour éviter de surcharger le serveur
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), this.delayBetweenRequests);
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
export const requestQueue = new RequestQueue(4, 50); // Max 4 requêtes concurrentes, 50ms de délai

export default requestQueue;

