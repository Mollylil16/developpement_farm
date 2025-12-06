/**
 * StockRepository - Gestion des stocks d'aliments
 * 
 * Responsabilités:
 * - CRUD des stocks
 * - Mouvements de stock (entrées/sorties)
 * - Alertes de stock faible
 * - Valorisation des stocks
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { StockAliment, StockMouvement, CreateStockAlimentInput } from '../../types/nutrition';
import uuid from 'react-native-uuid';

export class StockRepository extends BaseRepository<StockAliment> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'stocks_aliments');
  }

  async create(data: CreateStockAlimentInput | Partial<StockAliment>): Promise<StockAliment> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    // Mapper quantite_initiale vers quantite_actuelle si c'est un CreateStockAlimentInput
    const quantiteActuelle = 
      'quantite_initiale' in data 
        ? (data.quantite_initiale ?? 0)
        : ('quantite_actuelle' in data ? (data.quantite_actuelle ?? 0) : 0);

    // Activer l'alerte par défaut si seuil défini
    const seuilAlerte = data.seuil_alerte;
    const alerteActive = seuilAlerte ? quantiteActuelle <= seuilAlerte : false;

    await this.execute(
      `INSERT INTO stocks_aliments (
        id, projet_id, nom, categorie, unite, quantite_actuelle,
        seuil_alerte, alerte_active, notes,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.nom,
        data.categorie || null,
        data.unite || 'kg',
        quantiteActuelle,
        seuilAlerte || null,
        alerteActive ? 1 : 0,
        data.notes || null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer le stock');
    }
    return created;
  }

  async update(id: string, data: Partial<StockAliment>): Promise<StockAliment> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.nom !== undefined) {
      fields.push('nom = ?');
      values.push(data.nom);
    }
    if (data.categorie !== undefined) {
      fields.push('categorie = ?');
      values.push(data.categorie);
    }
    if (data.unite !== undefined) {
      fields.push('unite = ?');
      values.push(data.unite);
    }
    if (data.quantite_actuelle !== undefined) {
      fields.push('quantite_actuelle = ?');
      values.push(data.quantite_actuelle);

      // Mettre à jour alerte_active si seuil défini
      const stock = await this.findById(id);
      if (stock?.seuil_alerte) {
        fields.push('alerte_active = ?');
        values.push(data.quantite_actuelle <= stock.seuil_alerte ? 1 : 0);
      }
    }
    if (data.seuil_alerte !== undefined) {
      fields.push('seuil_alerte = ?');
      values.push(data.seuil_alerte);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    fields.push('derniere_modification = ?');
    values.push(now);
    values.push(id);

    await this.execute(`UPDATE stocks_aliments SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Stock introuvable');
    }
    return updated;
  }

  /**
   * Récupérer tous les stocks d'un projet avec mapping correct des données
   */
  async findByProjet(projetId: string): Promise<StockAliment[]> {
    const rows = await this.query<any>(
      `SELECT * FROM stocks_aliments 
       WHERE projet_id = ? 
       ORDER BY nom ASC`,
      [projetId]
    );
    
    // Mapper les données pour s'assurer que les types sont corrects
    return rows.map((row) => this.mapRowToStockAliment(row));
  }

  /**
   * Mapper une ligne de la base de données vers StockAliment
   */
  private mapRowToStockAliment(row: any): StockAliment {
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
    const row = await this.queryOne<any>(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    if (!row) {
      return null;
    }
    return this.mapRowToStockAliment(row);
  }

  async findEnAlerte(projetId: string): Promise<StockAliment[]> {
    const rows = await this.query<any>(
      `SELECT * FROM stocks_aliments 
       WHERE projet_id = ? AND alerte_active = 1
       ORDER BY nom ASC`,
      [projetId]
    );
    
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
    const id = uuid.v4().toString();
    const now = new Date().toISOString();
    
    // Récupérer le projet_id depuis le stock
    const stock = await this.findById(data.stock_id);
    if (!stock) {
      throw new Error('Stock introuvable');
    }

    await this.execute(
      `INSERT INTO stocks_mouvements (
        id, projet_id, aliment_id, type, quantite, unite, date, commentaire, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        stock.projet_id,
        data.stock_id,
        data.type,
        data.quantite,
        stock.unite,
        data.date || now,
        data.notes || null,
        now
      ]
    );
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
  async getMouvements(stockId: string, limit?: number): Promise<StockMouvement[]> {
    const sql = `SELECT * FROM stocks_mouvements 
                 WHERE aliment_id = ? 
                 ORDER BY date DESC 
                 ${limit ? `LIMIT ${limit}` : ''}`;
    
    return this.query<StockMouvement>(sql, [stockId]);
  }

  /**
   * Récupérer tous les mouvements pour un projet
   */
  async getAllMouvementsByProjet(projetId: string, limit?: number): Promise<StockMouvement[]> {
    const sql = `SELECT m.* FROM stocks_mouvements m
                 INNER JOIN stocks_aliments s ON m.aliment_id = s.id
                 WHERE s.projet_id = ?
                 ORDER BY m.date DESC
                 ${limit ? `LIMIT ${limit}` : ''}`;
    
    return this.query<StockMouvement>(sql, [projetId]);
  }

  /**
   * Supprimer un stock et tous ses mouvements associés
   */
  async delete(id: string): Promise<void> {
    // Supprimer d'abord tous les mouvements associés
    await this.execute(`DELETE FROM stocks_mouvements WHERE aliment_id = ?`, [id]);
    
    // Ensuite supprimer le stock
    await this.execute(`DELETE FROM stocks_aliments WHERE id = ?`, [id]);
  }
}

