import { Injectable, OnModuleDestroy } from '@nestjs/common';

/**
 * Interface pour les entrées du cache
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Service de cache en mémoire simple
 * Utilise un Map pour stocker les données avec TTL (Time To Live)
 * 
 * ⚠️ Note: Ce cache est perdu au redémarrage du serveur
 * Pour un cache persistant, utiliser Redis en production
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Nettoyer le cache toutes les minutes pour éviter les fuites mémoire
    this.cleanupInterval = setInterval(() => {
      this.cleanExpired();
    }, 60000); // 1 minute
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }

  /**
   * Obtenir une valeur du cache
   * @param key Clé du cache
   * @returns La valeur mise en cache ou undefined si expirée/inexistante
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Vérifier si l'entrée a expiré
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Définir une valeur dans le cache
   * @param key Clé du cache
   * @param value Valeur à mettre en cache
   * @param ttlSeconds Durée de vie en secondes (défaut: 300 = 5 minutes)
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, {
      data: value,
      expiresAt,
    });
  }

  /**
   * Supprimer une entrée du cache
   * @param key Clé du cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Supprimer toutes les entrées correspondant à un préfixe
   * Utile pour invalider plusieurs clés liées (ex: toutes les stats d'un projet)
   * @param prefix Préfixe des clés à supprimer
   */
  deleteByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Vider complètement le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Vérifier si une clé existe dans le cache (et n'est pas expirée)
   * @param key Clé du cache
   * @returns true si la clé existe et n'est pas expirée
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Obtenir ou calculer une valeur (pattern cache-aside)
   * Si la valeur est en cache, la retourner
   * Sinon, appeler la fonction, mettre en cache et retourner
   * 
   * @param key Clé du cache
   * @param factory Fonction pour générer la valeur si absente du cache
   * @param ttlSeconds Durée de vie en secondes (défaut: 300 = 5 minutes)
   * @returns La valeur (depuis le cache ou calculée)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Nettoyer les entrées expirées du cache
   */
  private cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Obtenir des statistiques sur le cache
   * Utile pour le monitoring
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

