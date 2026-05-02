import * as SQLite from 'expo-sqlite';
import { Porc, Gestation, Transaction, Mortalite } from '../types';
import { auditLog } from '../utils/auditLogger';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialise la base de données
   */
  public async initDatabase(): Promise<void> {
    try {
      this.db = SQLite.openDatabaseSync('FermierPro.db');
      await this.createTables();
      console.log('Base de données initialisée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la base de données:', error);
      throw error;
    }
  }

  /**
   * Crée les tables de la base de données
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    // Table des porcs
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS porcs (
        id TEXT PRIMARY KEY,
        numeroIdentification TEXT UNIQUE NOT NULL,
        dateNaissance TEXT NOT NULL,
        sexe TEXT NOT NULL CHECK (sexe IN ('male', 'femelle')),
        race TEXT NOT NULL,
        poidsActuel REAL NOT NULL,
        poidsCible REAL NOT NULL,
        statut TEXT NOT NULL CHECK (statut IN ('gestation', 'sevrage', 'croissance', 'vente', 'reproduction')),
        mereId TEXT,
        pereId TEXT,
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des gestations
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS gestations (
        id TEXT PRIMARY KEY,
        truieId TEXT NOT NULL,
        dateSautage TEXT NOT NULL,
        dateMiseBasPrevue TEXT NOT NULL,
        dateMiseBasReelle TEXT,
        nombrePorceletsPrevu INTEGER NOT NULL,
        nombrePorceletsReel INTEGER,
        statut TEXT NOT NULL CHECK (statut IN ('en_cours', 'terminee', 'avortement')),
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (truieId) REFERENCES porcs (id)
      )
    `);

    // Table des sevrages
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS sevrages (
        id TEXT PRIMARY KEY,
        porceletId TEXT NOT NULL,
        dateSevrage TEXT NOT NULL,
        poidsSevrage REAL NOT NULL,
        alimentation TEXT,
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (porceletId) REFERENCES porcs (id)
      )
    `);

    // Table des rations
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS rations (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        typePorc TEXT NOT NULL CHECK (typePorc IN ('porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance')),
        poidsMin REAL NOT NULL,
        poidsMax REAL NOT NULL,
        coutParKg REAL NOT NULL,
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des ingrédients de ration
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS ingredients_ration (
        id TEXT PRIMARY KEY,
        rationId TEXT NOT NULL,
        nom TEXT NOT NULL,
        pourcentage REAL NOT NULL,
        coutParKg REAL NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rationId) REFERENCES rations (id)
      )
    `);

    // Table des mortalités
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS mortalites (
        id TEXT PRIMARY KEY,
        porcId TEXT NOT NULL,
        porcNumeroIdentification TEXT NOT NULL,
        dateDeces TEXT NOT NULL,
        causeDeces TEXT NOT NULL,
        causeDetaillee TEXT,
        poidsAuDeces REAL NOT NULL,
        ageAuDeces INTEGER NOT NULL,
        traitementPrecedent TEXT,
        notes TEXT,
        photos TEXT,
        rapportVeterinaire TEXT,
        FOREIGN KEY (porcId) REFERENCES porcs (id)
      )
    `);

    // Table des rapports de croissance
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS rapports_croissance (
        id TEXT PRIMARY KEY,
        porcId TEXT NOT NULL,
        date TEXT NOT NULL,
        poids REAL NOT NULL,
        gainQuotidien REAL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (porcId) REFERENCES porcs (id)
      )
    `);

    // Table des transactions
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        montant REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        categorie TEXT,
        porcId TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (porcId) REFERENCES porcs (id)
      )
    `);
  }

  /**
   * Sauvegarde un porc
   */
  public async savePorc(porc: any): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    const query = `
      INSERT OR REPLACE INTO porcs (
        id, numeroIdentification, dateNaissance, sexe, race, 
        poidsActuel, poidsCible, statut, mereId, pereId, notes, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    this.db.runSync(query, [
      porc.id,
      porc.numeroIdentification,
      porc.dateNaissance.toISOString(),
      porc.sexe,
      porc.race,
      porc.poidsActuel,
      porc.poidsCible,
      porc.statut,
      porc.mereId || null,
      porc.pereId || null,
      porc.notes || null,
    ]);
  }

  /**
   * Récupère tous les porcs
   */
  public async getAllPorcs(limit?: number, offset?: number): Promise<any[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    const pagination = limit != null ? ` LIMIT ${limit} OFFSET ${offset ?? 0}` : '';
    const results = this.db.getAllSync(`SELECT * FROM porcs ORDER BY createdAt DESC${pagination}`);

    return results.map(row => ({
      ...row,
      dateNaissance: new Date(row.dateNaissance),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Sauvegarde une gestation
   */
  public async saveGestation(gestation: any): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    const query = `
      INSERT OR REPLACE INTO gestations (
        id, truieId, dateSautage, dateMiseBasPrevue, dateMiseBasReelle,
        nombrePorceletsPrevu, nombrePorceletsReel, statut, notes, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    this.db.runSync(query, [
      gestation.id,
      gestation.truieId,
      gestation.dateSautage.toISOString(),
      gestation.dateMiseBasPrevue.toISOString(),
      gestation.dateMiseBasReelle ? gestation.dateMiseBasReelle.toISOString() : null,
      gestation.nombrePorceletsPrevu,
      gestation.nombrePorceletsReel || null,
      gestation.statut,
      gestation.notes || null,
    ]);
  }

  /**
   * Récupère toutes les gestations
   */
  public async getAllGestations(limit?: number, offset?: number): Promise<any[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    const pagination = limit != null ? ` LIMIT ${limit} OFFSET ${offset ?? 0}` : '';
    const results = this.db.getAllSync(`SELECT * FROM gestations ORDER BY createdAt DESC${pagination}`);

    return results.map(row => ({
      ...row,
      dateSautage: new Date(row.dateSautage),
      dateMiseBasPrevue: new Date(row.dateMiseBasPrevue),
      dateMiseBasReelle: row.dateMiseBasReelle ? new Date(row.dateMiseBasReelle) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Sauvegarde une transaction
   */
  public async saveTransaction(transaction: any): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    const query = `
      INSERT OR REPLACE INTO transactions (
        id, type, montant, date, description, categorie, porcId, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    this.db.runSync(query, [
      transaction.id,
      transaction.type,
      transaction.montant,
      transaction.date.toISOString(),
      transaction.description,
      transaction.categorie || null,
      transaction.porcId || null,
    ]);
  }

  /**
   * Récupère toutes les transactions
   */
  public async getAllTransactions(limit?: number, offset?: number): Promise<any[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    const pagination = limit != null ? ` LIMIT ${limit} OFFSET ${offset ?? 0}` : '';
    const results = this.db.getAllSync(`SELECT * FROM transactions ORDER BY date DESC${pagination}`);

    return results.map(row => ({
      ...row,
      date: new Date(row.date),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Ferme la base de données
   */
  public async closeDatabase(): Promise<void> {
    if (this.db) {
      this.db.closeSync();
      this.db = null;
    }
  }

  /**
   * Supprime toutes les données (pour les tests)
   */
  public async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    const allowedTables = new Set([
      'rapports_croissance',
      'transactions',
      'ingredients_ration',
      'rations',
      'sevrages',
      'gestations',
      'porcs',
      'mortalites',
    ]);

    for (const table of allowedTables) {
      this.db.runSync(`DELETE FROM ${table}`);
    }

    await auditLog('data.clear_all', undefined, { tables: [...allowedTables].join(',') });
  }

  // Méthodes pour la gestion des mortalités
  static async saveMortalite(mortalite: Mortalite): Promise<void> {
    const instance = DatabaseService.getInstance();
    if (!instance.db) {
      throw new Error('Base de données non initialisée');
    }
    
    try {
      const query = `
        INSERT INTO mortalites (id, porcId, porcNumeroIdentification, dateDeces, causeDeces, causeDetaillee, poidsAuDeces, ageAuDeces, traitementPrecedent, notes, photos, rapportVeterinaire)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      instance.db.runSync(query, [
        mortalite.id,
        mortalite.porcId,
        mortalite.porcNumeroIdentification,
        mortalite.dateDeces.toISOString(),
        mortalite.causeDeces,
        mortalite.causeDetaillee || null,
        mortalite.poidsAuDeces,
        mortalite.ageAuDeces,
        mortalite.traitementPrecedent || null,
        mortalite.notes || null,
        mortalite.photos ? JSON.stringify(mortalite.photos) : null,
        mortalite.rapportVeterinaire || null,
      ]);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la mortalité:', error);
      throw error;
    }
  }

  static async loadMortalites(): Promise<Mortalite[]> {
    const instance = DatabaseService.getInstance();
    if (!instance.db) {
      throw new Error('Base de données non initialisée');
    }
    
    try {
      const query = 'SELECT * FROM mortalites ORDER BY dateDeces DESC';
      const results = instance.db.getAllSync(query);
      
      return results.map(row => ({
        id: row.id,
        porcId: row.porcId,
        porcNumeroIdentification: row.porcNumeroIdentification,
        dateDeces: new Date(row.dateDeces),
        causeDeces: row.causeDeces,
        causeDetaillee: row.causeDetaillee,
        poidsAuDeces: row.poidsAuDeces,
        ageAuDeces: row.ageAuDeces,
        traitementPrecedent: row.traitementPrecedent,
        notes: row.notes,
        photos: row.photos ? JSON.parse(row.photos) : undefined,
        rapportVeterinaire: row.rapportVeterinaire,
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des mortalités:', error);
      throw error;
    }
  }

  static async deleteMortalite(mortaliteId: string): Promise<void> {
    const instance = DatabaseService.getInstance();
    if (!instance.db) {
      throw new Error('Base de données non initialisée');
    }
    
    try {
      const query = 'DELETE FROM mortalites WHERE id = ?';
      instance.db.runSync(query, [mortaliteId]);
    } catch (error) {
      console.error('Erreur lors de la suppression de la mortalité:', error);
      throw error;
    }
  }

  static async updatePorcStatut(porcId: string, nouveauStatut: string): Promise<void> {
    const instance = DatabaseService.getInstance();
    if (!instance.db) {
      throw new Error('Base de données non initialisée');
    }
    
    try{
      const query = 'UPDATE porcs SET statut = ? WHERE id = ?';
      instance.db.runSync(query, [nouveauStatut, porcId]);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut du porc:', error);
      throw error;
    }
  }
}
