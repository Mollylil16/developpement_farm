/**
 * Service pour gérer le prix régional du porc poids vif
 * Supporte la récupération depuis une API externe avec fallback
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from './database';

/**
 * Prix moyen régional par défaut (FCFA/kg)
 * Utilisé comme fallback si l'API n'est pas disponible
 */
const DEFAULT_REGIONAL_PRICE = 2300; // FCFA/kg

/**
 * Configuration de l'API pour le prix régional
 * Peut être configurée via variables d'environnement ou settings
 */
interface RegionalPriceAPIConfig {
  enabled: boolean;
  url?: string;
  apiKey?: string;
  timeout?: number; // en millisecondes
  updateInterval?: number; // en heures
}

/**
 * Configuration par défaut
 * L'URL peut être configurée via une variable d'environnement ou dans les paramètres de l'app
 */
const DEFAULT_API_CONFIG: RegionalPriceAPIConfig = {
  enabled: false, // Désactivé par défaut jusqu'à ce qu'une API soit configurée
  url: undefined, // À configurer via les paramètres de l'app ou variables d'environnement
  apiKey: undefined,
  timeout: 5000, // 5 secondes
  updateInterval: 24, // Mise à jour toutes les 24 heures
};

/**
 * Interface pour la réponse de l'API
 * À adapter selon le format de l'API utilisée
 */
interface RegionalPriceAPIResponse {
  price?: number; // Prix en FCFA/kg
  pricePerKg?: number; // Alternative: prix par kg
  value?: number; // Alternative: valeur
  date?: string; // Date de mise à jour
  currency?: string; // Devise (par défaut: FCFA)
  [key: string]: any; // Permet d'accepter d'autres champs
}

export class RegionalPriceService {
  private db: SQLiteDatabase;
  private apiConfig: RegionalPriceAPIConfig;

  constructor(db: SQLiteDatabase, apiConfig?: Partial<RegionalPriceAPIConfig>) {
    this.db = db;
    this.apiConfig = { ...DEFAULT_API_CONFIG, ...apiConfig };
  }

  /**
   * Récupère le prix régional actuel
   * Priorité: Base de données > API > Constante par défaut
   */
  async getCurrentRegionalPrice(): Promise<number> {
    try {
      // 1. Essayer de récupérer depuis la base de données
      const storedPrice = await this.getStoredRegionalPrice();
      if (storedPrice) {
        // Vérifier si le prix est récent (moins de 24h)
        const lastUpdate = await this.getLastUpdateTime();
        if (lastUpdate) {
          const hoursSinceUpdate = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);
          if (hoursSinceUpdate < (this.apiConfig.updateInterval || 24)) {
            return storedPrice;
          }
        }
      }

      // 2. Si l'API est activée, essayer de récupérer depuis l'API
      if (this.apiConfig.enabled && this.apiConfig.url) {
        try {
          const apiPrice = await this.fetchPriceFromAPI();
          if (apiPrice) {
            // Sauvegarder le prix récupéré
            await this.saveRegionalPrice(apiPrice);
            return apiPrice;
          }
        } catch (error) {
          console.warn('⚠️ [RegionalPriceService] Erreur lors de la récupération depuis l\'API:', error);
          // Continuer avec le fallback
        }
      }

      // 3. Utiliser le prix stocké même s'il est ancien
      if (storedPrice) {
        return storedPrice;
      }

      // 4. Fallback vers la constante par défaut
      return DEFAULT_REGIONAL_PRICE;
    } catch (error) {
      console.error('❌ [RegionalPriceService] Erreur lors de la récupération du prix régional:', error);
      return DEFAULT_REGIONAL_PRICE;
    }
  }

  /**
   * Récupère le prix depuis l'API externe
   */
  private async fetchPriceFromAPI(): Promise<number | null> {
    if (!this.apiConfig.url) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.apiConfig.timeout || 5000);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiConfig.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiConfig.apiKey}`;
        // Ou selon le format de l'API:
        // headers['X-API-Key'] = this.apiConfig.apiKey;
      }

      const response = await fetch(this.apiConfig.url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data: RegionalPriceAPIResponse = await response.json();

      // Extraire le prix selon différents formats possibles
      const price = data.price || data.pricePerKg || data.value;

      if (!price || typeof price !== 'number' || price <= 0) {
        throw new Error('Invalid price format from API');
      }

      // Convertir en FCFA si nécessaire (selon la devise retournée)
      // Cette logique peut être adaptée selon l'API
      if (data.currency && data.currency !== 'FCFA' && data.currency !== 'XOF') {
        // Ici, on pourrait ajouter une conversion de devise si nécessaire
        console.warn(`⚠️ [RegionalPriceService] Devise non-FCFA détectée: ${data.currency}`);
      }

      return Math.round(price);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('aborted')) {
        throw new Error('API request timeout');
      }
      throw error;
    }
  }

  /**
   * Récupère le prix stocké dans la base de données
   */
  private async getStoredRegionalPrice(): Promise<number | null> {
    try {
      const row = await this.db.getFirstAsync<{ price: number }>(
        `SELECT price FROM regional_pork_price ORDER BY updated_at DESC LIMIT 1`
      );
      return row?.price || null;
    } catch (error) {
      // La table n'existe peut-être pas encore
      return null;
    }
  }

  /**
   * Récupère la date de dernière mise à jour
   */
  private async getLastUpdateTime(): Promise<string | null> {
    try {
      const row = await this.db.getFirstAsync<{ updated_at: string }>(
        `SELECT updated_at FROM regional_pork_price ORDER BY updated_at DESC LIMIT 1`
      );
      return row?.updated_at || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Sauvegarde le prix régional dans la base de données
   */
  private async saveRegionalPrice(price: number): Promise<void> {
    try {
      await this.db.runAsync(
        `INSERT INTO regional_pork_price (id, price, source, updated_at)
         VALUES (?, ?, ?, ?)`,
        [
          `price_${Date.now()}`,
          price,
          this.apiConfig.enabled ? 'api' : 'manual',
          new Date().toISOString(),
        ]
      );
    } catch (error) {
      // La table n'existe peut-être pas encore, on ignore l'erreur
      console.warn('⚠️ [RegionalPriceService] Impossible de sauvegarder le prix:', error);
    }
  }

  /**
   * Met à jour la configuration de l'API
   */
  updateAPIConfig(config: Partial<RegionalPriceAPIConfig>): void {
    this.apiConfig = { ...this.apiConfig, ...config };
  }

  /**
   * Force une mise à jour depuis l'API (si activée)
   */
  async forceUpdate(): Promise<number> {
    if (this.apiConfig.enabled && this.apiConfig.url) {
      try {
        const apiPrice = await this.fetchPriceFromAPI();
        if (apiPrice) {
          await this.saveRegionalPrice(apiPrice);
          return apiPrice;
        }
      } catch (error) {
        console.error('❌ [RegionalPriceService] Erreur lors de la mise à jour forcée:', error);
      }
    }
    return await this.getCurrentRegionalPrice();
  }
}

/**
 * Instance singleton du service
 */
let regionalPriceServiceInstance: RegionalPriceService | null = null;

export function getRegionalPriceService(
  db?: SQLiteDatabase,
  apiConfig?: Partial<RegionalPriceAPIConfig>
): RegionalPriceService {
  if (!regionalPriceServiceInstance) {
    if (!db) {
      throw new Error('Database instance required for RegionalPriceService');
    }
    regionalPriceServiceInstance = new RegionalPriceService(db, apiConfig);
  }
  return regionalPriceServiceInstance;
}

