/**
 * StockRepository - Gestion des stocks d'aliments
 *
 * Responsabilités:
 * - CRUD des stocks
 * - Mouvements de stock (entrées/sorties)
 * - Alertes de stock faible
 * - Valorisation des stocks
 */

import { BaseRepository } from './BaseRepository';
import { StockAliment, MouvementStock, CreateStockAlimentInput } from '../../types/nutrition';

export class StockRepository extends BaseRepository<StockAliment> {
  constructor() {
    super('stocks_aliments', '/nutrition/stocks');
  }

  async create(data: CreateStockAlimentInput | Partial<StockAliment>): Promise<StockAliment> {
    // Mapper quantite_initiale vers quantite_actuelle si c'est un CreateStockAlimentInput
    const quantiteActuelle =
      'quantite_initiale' in data ? (data.quantite_initiale ?? 0) : (data.quantite_actuelle ?? 0);

    // Activer l'alerte par défaut si seuil défini
    const seuilAlerte = data.seuil_alerte;
    const alerteActive = seuilAlerte ? quantiteActuelle <= seuilAlerte : false;

    const stockData = {
      projet_id: data.projet_id,
      nom: data.nom,
      categorie: data.categorie || null,
      unite: data.unite || 'kg',
      quantite_actuelle: quantiteActuelle,
      seuil_alerte: seuilAlerte || null,
      alerte_active: alerteActive,
      notes: data.notes || null,
    };

    return this.executePost<StockAliment>(this.apiBasePath, stockData);
  }

  async update(id: string, data: Partial<StockAliment>): Promise<StockAliment> {
    const updateData: Partial<StockAliment> = { ...data };

    // Mettre à jour alerte_active si quantite_actuelle change et seuil défini
    if (data.quantite_actuelle !== undefined) {
      const stock = await this.findById(id);
      if (stock?.seuil_alerte) {
        updateData.alerte_active = data.quantite_actuelle <= stock.seuil_alerte;
      }
    }

    return this.executePatch<StockAliment>(`${this.apiBasePath}/${id}`, updateData);
  }

  /**
   * Récupérer tous les stocks d'un projet avec mapping correct des données
   */
  async findByProjet(projetId: string): Promise<StockAliment[]> {
    const rows = await this.query<unknown>(this.apiBasePath, { projet_id: projetId });

    // Mapper les données pour s'assurer que les types sont corrects
    return rows.map((row) => this.mapRowToStockAliment(row));
  }

  /**
   * Mapper une ligne de la base de données vers StockAliment
   */
  private mapRowToStockAliment(row: unknown): StockAliment {
    // S'assurer que quantite_actuelle est toujours un nombre
    const quantiteActuelle =
      typeof row.quantite_actuelle === 'number'
        ? row.quantite_actuelle
        : parseFloat(String(row.quantite_actuelle)) || 0;

    // S'assurer que seuil_alerte est un nombre ou undefined
    const seuilAlerte =
      row.seuil_alerte !== null && row.seuil_alerte !== undefined
        ? typeof row.seuil_alerte === 'number'
          ? row.seuil_alerte
          : parseFloat(String(row.seuil_alerte)) || undefined
        : undefined;

    return {
      id: row.id,
      projet_id: row.projet_id,
      nom: row.nom,
      categorie: row.categorie || undefined,
      quantite_actuelle: quantiteActuelle,
      unite: row.unite,
      seuil_alerte: seuilAlerte,
      date_derniere_entree: row.date_derniere_entree || undefined,
      date_derniere_sortie: row.date_derniere_sortie || undefined,
      alerte_active: row.alerte_active === 1 || row.alerte_active === true,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  /**
   * Override findById pour mapper correctement les données
   */
  async findById(id: string): Promise<StockAliment | null> {
    const row = await this.queryOne<unknown>(`${this.apiBasePath}/${id}`);
    if (!row) {
      return null;
    }
    return this.mapRowToStockAliment(row);
  }

  async findEnAlerte(projetId: string): Promise<StockAliment[]> {
    const rows = await this.query<unknown>(this.apiBasePath, {
      projet_id: projetId,
      alerte_active: true,
    });

    return rows.map((row) => this.mapRowToStockAliment(row));
  }

  async ajouterStock(stockId: string, quantite: number, notes?: string): Promise<StockAliment> {
    const stock = await this.findById(stockId);
    if (!stock) {
      throw new Error('Stock introuvable');
    }

    const nouvelleQuantite = stock.quantite_actuelle + quantite;

    await this.update(stockId, {
      quantite_actuelle: nouvelleQuantite,
    });

    // Enregistrer le mouvement
    await this.enregistrerMouvement({
      stock_id: stockId,
      type: 'entree',
      quantite,
      notes,
    });

    return this.findById(stockId) as Promise<StockAliment>;
  }

  async retirerStock(stockId: string, quantite: number, notes?: string): Promise<StockAliment> {
    const stock = await this.findById(stockId);
    if (!stock) {
      throw new Error('Stock introuvable');
    }

    if (stock.quantite_actuelle < quantite) {
      throw new Error('Stock insuffisant');
    }

    const nouvelleQuantite = stock.quantite_actuelle - quantite;

    await this.update(stockId, {
      quantite_actuelle: nouvelleQuantite,
    });

    // Enregistrer le mouvement
    await this.enregistrerMouvement({
      stock_id: stockId,
      type: 'sortie',
      quantite,
      notes,
    });

    return this.findById(stockId) as Promise<StockAliment>;
  }

  /**
   * Ajuster le stock à une nouvelle quantité et enregistrer le mouvement
   */
  async ajusterStock(
    stockId: string,
    nouvelleQuantite: number,
    notes?: string,
    date?: string
  ): Promise<StockAliment> {
    const stock = await this.findById(stockId);
    if (!stock) {
      throw new Error('Stock introuvable');
    }

    const ancienneQuantite = stock.quantite_actuelle;
    const difference = nouvelleQuantite - ancienneQuantite;

    // Mettre à jour la quantité
    await this.update(stockId, {
      quantite_actuelle: nouvelleQuantite,
    });

    // Enregistrer le mouvement d'ajustement
    await this.enregistrerMouvement({
      stock_id: stockId,
      type: 'ajustement',
      quantite: Math.abs(difference),
      notes,
      date,
    });

    return this.findById(stockId) as Promise<StockAliment>;
  }

  /**
   * Enregistrer un mouvement de stock
   * Supporte maintenant 'ajustement' en plus de 'entree' et 'sortie'
   */
  private async enregistrerMouvement(data: {
    stock_id: string;
    type: 'entree' | 'sortie' | 'ajustement';
    quantite: number;
    notes?: string;
    date?: string;
  }): Promise<void> {
    // Récupérer le projet_id depuis le stock
    const stock = await this.findById(data.stock_id);
    if (!stock) {
      throw new Error('Stock introuvable');
    }

    const mouvementData = {
      projet_id: stock.projet_id,
      aliment_id: data.stock_id,
      type: data.type,
      quantite: data.quantite,
      unite: stock.unite,
      date: data.date || new Date().toISOString(),
      commentaire: data.notes || null,
    };

    await this.executePost(`${this.apiBasePath}/${data.stock_id}/mouvements`, mouvementData);
  }

  async getValeurTotaleStock(projetId: string): Promise<number> {
    // Note: La table stocks_aliments n'a pas de colonne prix_unitaire
    // Cette fonction retourne 0 pour l'instant
    // TODO: Ajouter prix_unitaire à la table ou utiliser une autre méthode de calcul
    return 0;
  }

  async getStats(projetId: string): Promise<{
    nombreStocks: number;
    stocksEnAlerte: number;
    valeurTotale: number;
  }> {
    const nombreStocks = await this.count(projetId);
    const stocksEnAlerte = (await this.findEnAlerte(projetId)).length;
    const valeurTotale = await this.getValeurTotaleStock(projetId);

    return {
      nombreStocks,
      stocksEnAlerte,
      valeurTotale,
    };
  }

  /**
   * Récupérer les mouvements de stock pour un aliment
   */
  async getMouvements(stockId: string, limit?: number): Promise<MouvementStock[]> {
    const params: Record<string, unknown> = {};
    if (limit) {
      params.limit = limit;
    }
    return this.query<MouvementStock>(`${this.apiBasePath}/${stockId}/mouvements`, params);
  }

  /**
   * Récupérer tous les mouvements pour un projet
   */
  async getAllMouvementsByProjet(projetId: string, limit?: number): Promise<MouvementStock[]> {
    const params: Record<string, unknown> = { projet_id: projetId };
    if (limit) {
      params.limit = limit;
    }
    return this.query<MouvementStock>(`${this.apiBasePath}/mouvements`, params);
  }

  /**
   * Supprimer un stock et tous ses mouvements associés
   */
  async delete(id: string): Promise<void> {
    await this.executeDelete(`${this.apiBasePath}/${id}`);
  }
}
