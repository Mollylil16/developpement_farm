/**
 * Service de base de données SQLite
 * Gère toutes les opérations de base de données pour l'application
 */

import * as SQLite from 'expo-sqlite';
import { Projet, ChargeFixe, DepensePonctuelle, UpdateDepensePonctuelleInput, Gestation, Sevrage, Ingredient, Ration, RapportCroissance, Mortalite, Planification, Collaborateur, UpdateCollaborateurInput } from '../types';
import { calculerDateMiseBasPrevue } from '../types/reproduction';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialise la connexion à la base de données
   */
  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('fermier_pro.db');
      await this.createTables();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la base de données:', error);
      throw error;
    }
  }

  /**
   * Crée toutes les tables nécessaires
   */
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Table projets
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS projets (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        localisation TEXT NOT NULL,
        nombre_truies INTEGER NOT NULL,
        nombre_verrats INTEGER NOT NULL,
        nombre_porcelets INTEGER NOT NULL,
        poids_moyen_actuel REAL NOT NULL,
        age_moyen_actuel INTEGER NOT NULL,
        notes TEXT,
        statut TEXT NOT NULL CHECK (statut IN ('actif', 'archive', 'suspendu')),
        proprietaire_id TEXT NOT NULL,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table charges_fixes
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS charges_fixes (
        id TEXT PRIMARY KEY,
        categorie TEXT NOT NULL,
        libelle TEXT NOT NULL,
        montant REAL NOT NULL,
        date_debut TEXT NOT NULL,
        frequence TEXT NOT NULL CHECK (frequence IN ('mensuel', 'trimestriel', 'annuel')),
        jour_paiement INTEGER,
        notes TEXT,
        statut TEXT NOT NULL CHECK (statut IN ('actif', 'suspendu', 'termine')),
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table depenses_ponctuelles
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS depenses_ponctuelles (
        id TEXT PRIMARY KEY,
        montant REAL NOT NULL,
        categorie TEXT NOT NULL,
        libelle_categorie TEXT,
        date TEXT NOT NULL,
        commentaire TEXT,
        photos TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table gestations
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS gestations (
        id TEXT PRIMARY KEY,
        truie_id TEXT NOT NULL,
        truie_nom TEXT,
        date_sautage TEXT NOT NULL,
        date_mise_bas_prevue TEXT NOT NULL,
        date_mise_bas_reelle TEXT,
        nombre_porcelets_prevu INTEGER NOT NULL,
        nombre_porcelets_reel INTEGER,
        statut TEXT NOT NULL CHECK (statut IN ('en_cours', 'terminee', 'annulee')),
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table sevrages
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sevrages (
        id TEXT PRIMARY KEY,
        gestation_id TEXT NOT NULL,
        date_sevrage TEXT NOT NULL,
        nombre_porcelets_sevres INTEGER NOT NULL,
        poids_moyen_sevrage REAL,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gestation_id) REFERENCES gestations(id)
      );
    `);

    // Table ingredients
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        unite TEXT NOT NULL CHECK (unite IN ('kg', 'g', 'l', 'ml')),
        prix_unitaire REAL NOT NULL,
        proteine_pourcent REAL,
        energie_kcal REAL,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table rations
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS rations (
        id TEXT PRIMARY KEY,
        type_porc TEXT NOT NULL CHECK (type_porc IN ('porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance')),
        poids_kg REAL NOT NULL,
        nombre_porcs INTEGER,
        cout_total REAL,
        cout_par_kg REAL,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table ingredients_ration (table de liaison)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ingredients_ration (
        id TEXT PRIMARY KEY,
        ration_id TEXT NOT NULL,
        ingredient_id TEXT NOT NULL,
        quantite REAL NOT NULL,
        FOREIGN KEY (ration_id) REFERENCES rations(id),
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
      );
    `);

    // Table rapports_croissance
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS rapports_croissance (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        date TEXT NOT NULL,
        poids_moyen REAL NOT NULL,
        nombre_porcs INTEGER NOT NULL,
        gain_quotidien REAL,
        poids_cible REAL,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table mortalites
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS mortalites (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        nombre_porcs INTEGER NOT NULL,
        date TEXT NOT NULL,
        cause TEXT,
        categorie TEXT NOT NULL CHECK (categorie IN ('porcelet', 'truie', 'verrat', 'autre')),
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table planifications
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS planifications (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('saillie', 'vaccination', 'sevrage', 'nettoyage', 'alimentation', 'veterinaire', 'autre')),
        titre TEXT NOT NULL,
        description TEXT,
        date_prevue TEXT NOT NULL,
        date_echeance TEXT,
        rappel TEXT,
        statut TEXT NOT NULL CHECK (statut IN ('a_faire', 'en_cours', 'terminee', 'annulee')),
        recurrence TEXT CHECK (recurrence IN ('aucune', 'quotidienne', 'hebdomadaire', 'mensuelle')),
        lien_gestation_id TEXT,
        lien_sevrage_id TEXT,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Table collaborations
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS collaborations (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        email TEXT NOT NULL,
        telephone TEXT,
        role TEXT NOT NULL CHECK (role IN ('proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur')),
        statut TEXT NOT NULL CHECK (statut IN ('actif', 'inactif', 'en_attente')),
        permission_reproduction INTEGER DEFAULT 0,
        permission_nutrition INTEGER DEFAULT 0,
        permission_finance INTEGER DEFAULT 0,
        permission_rapports INTEGER DEFAULT 0,
        permission_planification INTEGER DEFAULT 0,
        permission_mortalites INTEGER DEFAULT 0,
        date_invitation TEXT NOT NULL,
        date_acceptation TEXT,
        notes TEXT,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
        derniere_modification TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projet_id) REFERENCES projets(id)
      );
    `);

    // Index pour optimiser les requêtes
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_projets_statut ON projets(statut);
      CREATE INDEX IF NOT EXISTS idx_charges_fixes_statut ON charges_fixes(statut);
      CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses_ponctuelles(date);
      CREATE INDEX IF NOT EXISTS idx_gestations_statut ON gestations(statut);
      CREATE INDEX IF NOT EXISTS idx_gestations_date_mise_bas ON gestations(date_mise_bas_prevue);
      CREATE INDEX IF NOT EXISTS idx_sevrages_gestation ON sevrages(gestation_id);
      CREATE INDEX IF NOT EXISTS idx_rations_type ON rations(type_porc);
      CREATE INDEX IF NOT EXISTS idx_ingredients_ration_ration ON ingredients_ration(ration_id);
      CREATE INDEX IF NOT EXISTS idx_rapports_croissance_date ON rapports_croissance(date);
      CREATE INDEX IF NOT EXISTS idx_rapports_croissance_projet ON rapports_croissance(projet_id);
      CREATE INDEX IF NOT EXISTS idx_mortalites_date ON mortalites(date);
      CREATE INDEX IF NOT EXISTS idx_mortalites_projet ON mortalites(projet_id);
      CREATE INDEX IF NOT EXISTS idx_mortalites_categorie ON mortalites(categorie);
      CREATE INDEX IF NOT EXISTS idx_planifications_date_prevue ON planifications(date_prevue);
      CREATE INDEX IF NOT EXISTS idx_planifications_projet ON planifications(projet_id);
      CREATE INDEX IF NOT EXISTS idx_planifications_statut ON planifications(statut);
      CREATE INDEX IF NOT EXISTS idx_planifications_type ON planifications(type);
      CREATE INDEX IF NOT EXISTS idx_collaborations_projet ON collaborations(projet_id);
      CREATE INDEX IF NOT EXISTS idx_collaborations_statut ON collaborations(statut);
      CREATE INDEX IF NOT EXISTS idx_collaborations_role ON collaborations(role);
      CREATE INDEX IF NOT EXISTS idx_collaborations_email ON collaborations(email);
    `);
  }

  /**
   * ============================================
   * GESTION DES PROJETS
   * ============================================
   */

  async createProjet(projet: Omit<Projet, 'id' | 'date_creation' | 'derniere_modification'>): Promise<Projet> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `projet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    await this.db.runAsync(
      `INSERT INTO projets (
        id, nom, localisation, nombre_truies, nombre_verrats, nombre_porcelets,
        poids_moyen_actuel, age_moyen_actuel, notes, statut, proprietaire_id,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        projet.nom,
        projet.localisation,
        projet.nombre_truies,
        projet.nombre_verrats,
        projet.nombre_porcelets,
        projet.poids_moyen_actuel,
        projet.age_moyen_actuel,
        projet.notes || null,
        projet.statut,
        projet.proprietaire_id,
        date_creation,
        derniere_modification,
      ]
    );

    return this.getProjetById(id);
  }

  async getProjetById(id: string): Promise<Projet> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Projet>(
      'SELECT * FROM projets WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Projet avec l'id ${id} non trouvé`);
    }

    return result;
  }

  async getAllProjets(): Promise<Projet[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Projet>('SELECT * FROM projets ORDER BY date_creation DESC');
  }

  async getProjetActif(): Promise<Projet | null> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getFirstAsync<Projet>(
      'SELECT * FROM projets WHERE statut = ? ORDER BY date_creation DESC LIMIT 1',
      ['actif']
    );
  }

  async updateProjet(id: string, updates: Partial<Projet>): Promise<Projet> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getProjetById(id);
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.db.runAsync(
      `UPDATE projets SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getProjetById(id);
  }

  /**
   * ============================================
   * GESTION DES CHARGES FIXES
   * ============================================
   */

  async createChargeFixe(charge: Omit<ChargeFixe, 'id' | 'date_creation' | 'derniere_modification'>): Promise<ChargeFixe> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `charge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    await this.db.runAsync(
      `INSERT INTO charges_fixes (
        id, categorie, libelle, montant, date_debut, frequence,
        jour_paiement, notes, statut, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        charge.categorie,
        charge.libelle,
        charge.montant,
        charge.date_debut,
        charge.frequence,
        charge.jour_paiement || null,
        charge.notes || null,
        charge.statut,
        date_creation,
        derniere_modification,
      ]
    );

    return this.getChargeFixeById(id);
  }

  async getChargeFixeById(id: string): Promise<ChargeFixe> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<ChargeFixe>(
      'SELECT * FROM charges_fixes WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Charge fixe avec l'id ${id} non trouvée`);
    }

    return result;
  }

  async getAllChargesFixes(): Promise<ChargeFixe[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<ChargeFixe>(
      'SELECT * FROM charges_fixes ORDER BY date_debut DESC'
    );
  }

  async getChargesFixesActives(): Promise<ChargeFixe[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<ChargeFixe>(
      'SELECT * FROM charges_fixes WHERE statut = ? ORDER BY date_debut DESC',
      ['actif']
    );
  }

  async updateChargeFixe(id: string, updates: Partial<ChargeFixe>): Promise<ChargeFixe> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getChargeFixeById(id);
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.db.runAsync(
      `UPDATE charges_fixes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getChargeFixeById(id);
  }

  async deleteChargeFixe(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM charges_fixes WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES DÉPENSES PONCTUELLES
   * ============================================
   */

  async createDepensePonctuelle(depense: Omit<DepensePonctuelle, 'id' | 'date_creation'>): Promise<DepensePonctuelle> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `depense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const photosJson = depense.photos ? JSON.stringify(depense.photos) : null;

    await this.db.runAsync(
      `INSERT INTO depenses_ponctuelles (
        id, montant, categorie, libelle_categorie, date,
        commentaire, photos, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        depense.montant,
        depense.categorie,
        depense.libelle_categorie || null,
        depense.date,
        depense.commentaire || null,
        photosJson,
        date_creation,
      ]
    );

    return this.getDepensePonctuelleById(id);
  }

  async getDepensePonctuelleById(id: string): Promise<DepensePonctuelle> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM depenses_ponctuelles WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Dépense ponctuelle avec l'id ${id} non trouvée`);
    }

    return {
      ...result,
      photos: result.photos ? JSON.parse(result.photos) : undefined,
    };
  }

  async getAllDepensesPonctuelles(): Promise<DepensePonctuelle[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM depenses_ponctuelles ORDER BY date DESC'
    );

    return results.map((result) => ({
      ...result,
      photos: result.photos ? JSON.parse(result.photos) : undefined,
    }));
  }

  async getDepensesPonctuellesByDateRange(dateDebut: string, dateFin: string): Promise<DepensePonctuelle[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM depenses_ponctuelles WHERE date >= ? AND date <= ? ORDER BY date DESC',
      [dateDebut, dateFin]
    );

    return results.map((result) => ({
      ...result,
      photos: result.photos ? JSON.parse(result.photos) : undefined,
    }));
  }

  async updateDepensePonctuelle(id: string, updates: UpdateDepensePonctuelleInput): Promise<DepensePonctuelle> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const photosJson = updates.photos ? JSON.stringify(updates.photos) : null;

    await this.db.runAsync(
      `UPDATE depenses_ponctuelles SET
        montant = COALESCE(?, montant),
        categorie = COALESCE(?, categorie),
        libelle_categorie = COALESCE(?, libelle_categorie),
        date = COALESCE(?, date),
        commentaire = COALESCE(?, commentaire),
        photos = COALESCE(?, photos)
      WHERE id = ?`,
      [
        updates.montant ?? null,
        updates.categorie ?? null,
        updates.libelle_categorie ?? null,
        updates.date ?? null,
        updates.commentaire ?? null,
        photosJson,
        id,
      ]
    );

    return this.getDepensePonctuelleById(id);
  }

  async deleteDepensePonctuelle(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM depenses_ponctuelles WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES GESTATIONS
   * ============================================
   */

  async createGestation(gestation: Omit<Gestation, 'id' | 'date_creation' | 'derniere_modification' | 'date_mise_bas_prevue'>): Promise<Gestation> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `gestation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;
    const date_mise_bas_prevue = calculerDateMiseBasPrevue(gestation.date_sautage);

    await this.db.runAsync(
      `INSERT INTO gestations (
        id, truie_id, truie_nom, date_sautage, date_mise_bas_prevue,
        nombre_porcelets_prevu, statut, notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        gestation.truie_id,
        gestation.truie_nom || null,
        gestation.date_sautage,
        date_mise_bas_prevue,
        gestation.nombre_porcelets_prevu,
        gestation.statut,
        gestation.notes || null,
        date_creation,
        derniere_modification,
      ]
    );

    return this.getGestationById(id);
  }

  async getGestationById(id: string): Promise<Gestation> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Gestation>(
      'SELECT * FROM gestations WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Gestation avec l'id ${id} non trouvée`);
    }

    return result;
  }

  async getAllGestations(): Promise<Gestation[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Gestation>(
      'SELECT * FROM gestations ORDER BY date_mise_bas_prevue ASC'
    );
  }

  async getGestationsEnCours(): Promise<Gestation[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Gestation>(
      "SELECT * FROM gestations WHERE statut = 'en_cours' ORDER BY date_mise_bas_prevue ASC"
    );
  }

  async getGestationsParDateMiseBas(dateDebut: string, dateFin: string): Promise<Gestation[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Gestation>(
      'SELECT * FROM gestations WHERE date_mise_bas_prevue >= ? AND date_mise_bas_prevue <= ? ORDER BY date_mise_bas_prevue ASC',
      [dateDebut, dateFin]
    );
  }

  async updateGestation(id: string, updates: Partial<Gestation>): Promise<Gestation> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getGestationById(id);
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.db.runAsync(
      `UPDATE gestations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getGestationById(id);
  }

  async deleteGestation(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM gestations WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES SEVRAGES
   * ============================================
   */

  async createSevrage(sevrage: Omit<Sevrage, 'id' | 'date_creation'>): Promise<Sevrage> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `sevrage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO sevrages (
        id, gestation_id, date_sevrage, nombre_porcelets_sevres,
        poids_moyen_sevrage, notes, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sevrage.gestation_id,
        sevrage.date_sevrage,
        sevrage.nombre_porcelets_sevres,
        sevrage.poids_moyen_sevrage || null,
        sevrage.notes || null,
        date_creation,
      ]
    );

    return this.getSevrageById(id);
  }

  async getSevrageById(id: string): Promise<Sevrage> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Sevrage>(
      'SELECT * FROM sevrages WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Sevrage avec l'id ${id} non trouvé`);
    }

    return result;
  }

  async getAllSevrages(): Promise<Sevrage[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Sevrage>(
      'SELECT * FROM sevrages ORDER BY date_sevrage DESC'
    );
  }

  async getSevragesParGestation(gestationId: string): Promise<Sevrage[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Sevrage>(
      'SELECT * FROM sevrages WHERE gestation_id = ? ORDER BY date_sevrage DESC',
      [gestationId]
    );
  }

  async getSevragesParDateRange(dateDebut: string, dateFin: string): Promise<Sevrage[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Sevrage>(
      'SELECT * FROM sevrages WHERE date_sevrage >= ? AND date_sevrage <= ? ORDER BY date_sevrage DESC',
      [dateDebut, dateFin]
    );
  }

  async deleteSevrage(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM sevrages WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES INGRÉDIENTS
   * ============================================
   */

  async createIngredient(ingredient: Omit<Ingredient, 'id' | 'date_creation'>): Promise<Ingredient> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `ingredient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO ingredients (
        id, nom, unite, prix_unitaire, proteine_pourcent, energie_kcal, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        ingredient.nom,
        ingredient.unite,
        ingredient.prix_unitaire,
        ingredient.proteine_pourcent || null,
        ingredient.energie_kcal || null,
        date_creation,
      ]
    );

    return this.getIngredientById(id);
  }

  async getIngredientById(id: string): Promise<Ingredient> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Ingredient>(
      'SELECT * FROM ingredients WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Ingrédient avec l'id ${id} non trouvé`);
    }

    return result;
  }

  async getAllIngredients(): Promise<Ingredient[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Ingredient>(
      'SELECT * FROM ingredients ORDER BY nom ASC'
    );
  }

  async updateIngredient(id: string, updates: Partial<Ingredient>): Promise<Ingredient> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getIngredientById(id);
    }

    values.push(id);

    await this.db.runAsync(
      `UPDATE ingredients SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getIngredientById(id);
  }

  async deleteIngredient(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM ingredients WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES RATIONS
   * ============================================
   */

  async createRation(ration: {
    type_porc: string;
    poids_kg: number;
    nombre_porcs?: number;
    ingredients: { ingredient_id: string; quantite: number }[];
    cout_total?: number;
    cout_par_kg?: number;
    notes?: string;
  }): Promise<Ration> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `ration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();

    // Créer la ration
    await this.db.runAsync(
      `INSERT INTO rations (
        id, type_porc, poids_kg, nombre_porcs, cout_total, cout_par_kg, notes, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        ration.type_porc,
        ration.poids_kg,
        ration.nombre_porcs || null,
        ration.cout_total || null,
        ration.cout_par_kg || null,
        ration.notes || null,
        date_creation,
      ]
    );

    // Ajouter les ingrédients
    for (const ing of ration.ingredients) {
      const ingId = `ing_ration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.db.runAsync(
        `INSERT INTO ingredients_ration (id, ration_id, ingredient_id, quantite)
         VALUES (?, ?, ?, ?)`,
        [ingId, id, ing.ingredient_id, ing.quantite]
      );
    }

    return this.getRationById(id);
  }

  async getRationById(id: string): Promise<Ration> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const ration = await this.db.getFirstAsync<any>(
      'SELECT * FROM rations WHERE id = ?',
      [id]
    );

    if (!ration) {
      throw new Error(`Ration avec l'id ${id} non trouvée`);
    }

    // Récupérer les ingrédients
    const ingredientsRation = await this.db.getAllAsync<any>(
      `SELECT ir.*, i.nom, i.unite, i.prix_unitaire, i.proteine_pourcent, i.energie_kcal
       FROM ingredients_ration ir
       JOIN ingredients i ON ir.ingredient_id = i.id
       WHERE ir.ration_id = ?`,
      [id]
    );

    return {
      ...ration,
      ingredients: ingredientsRation.map((ir) => ({
        id: ir.id,
        ration_id: ir.ration_id,
        ingredient_id: ir.ingredient_id,
        quantite: ir.quantite,
        ingredient: {
          id: ir.ingredient_id,
          nom: ir.nom,
          unite: ir.unite,
          prix_unitaire: ir.prix_unitaire,
          proteine_pourcent: ir.proteine_pourcent,
          energie_kcal: ir.energie_kcal,
          date_creation: '',
        },
      })),
    };
  }

  async getAllRations(): Promise<Ration[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const rations = await this.db.getAllAsync<any>(
      'SELECT * FROM rations ORDER BY date_creation DESC'
    );

    // Récupérer les ingrédients pour chaque ration
    const rationsWithIngredients = await Promise.all(
      rations.map(async (ration) => {
        const ingredientsRation = await this.db!.getAllAsync<any>(
          `SELECT ir.*, i.nom, i.unite, i.prix_unitaire, i.proteine_pourcent, i.energie_kcal
           FROM ingredients_ration ir
           JOIN ingredients i ON ir.ingredient_id = i.id
           WHERE ir.ration_id = ?`,
          [ration.id]
        );

        return {
          ...ration,
          ingredients: ingredientsRation.map((ir) => ({
            id: ir.id,
            ration_id: ir.ration_id,
            ingredient_id: ir.ingredient_id,
            quantite: ir.quantite,
            ingredient: {
              id: ir.ingredient_id,
              nom: ir.nom,
              unite: ir.unite,
              prix_unitaire: ir.prix_unitaire,
              proteine_pourcent: ir.proteine_pourcent,
              energie_kcal: ir.energie_kcal,
              date_creation: '',
            },
          })),
        };
      })
    );

    return rationsWithIngredients;
  }

  async deleteRation(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Supprimer d'abord les ingrédients de la ration
    await this.db.runAsync('DELETE FROM ingredients_ration WHERE ration_id = ?', [id]);
    // Puis supprimer la ration
    await this.db.runAsync('DELETE FROM rations WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES RAPPORTS DE CROISSANCE
   * ============================================
   */

  async createRapportCroissance(rapport: Omit<RapportCroissance, 'id' | 'date_creation'>): Promise<RapportCroissance> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `rapport_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO rapports_croissance (
        id, projet_id, date, poids_moyen, nombre_porcs,
        gain_quotidien, poids_cible, notes, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        rapport.projet_id,
        rapport.date,
        rapport.poids_moyen,
        rapport.nombre_porcs,
        rapport.gain_quotidien || null,
        rapport.poids_cible || null,
        rapport.notes || null,
        date_creation,
      ]
    );

    return this.getRapportCroissanceById(id);
  }

  async getRapportCroissanceById(id: string): Promise<RapportCroissance> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<RapportCroissance>(
      'SELECT * FROM rapports_croissance WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Rapport avec l'id ${id} non trouvé`);
    }

    return result;
  }

  async getAllRapportsCroissance(): Promise<RapportCroissance[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<RapportCroissance>(
      'SELECT * FROM rapports_croissance ORDER BY date DESC'
    );
  }

  async getRapportsCroissanceParProjet(projetId: string): Promise<RapportCroissance[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<RapportCroissance>(
      'SELECT * FROM rapports_croissance WHERE projet_id = ? ORDER BY date ASC',
      [projetId]
    );
  }

  async getRapportsCroissanceParDateRange(dateDebut: string, dateFin: string): Promise<RapportCroissance[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<RapportCroissance>(
      'SELECT * FROM rapports_croissance WHERE date >= ? AND date <= ? ORDER BY date ASC',
      [dateDebut, dateFin]
    );
  }

  async deleteRapportCroissance(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM rapports_croissance WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES MORTALITÉS
   * ============================================
   */

  async createMortalite(mortalite: Omit<Mortalite, 'id' | 'date_creation'>): Promise<Mortalite> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `mortalite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO mortalites (
        id, projet_id, nombre_porcs, date, cause, categorie, notes, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        mortalite.projet_id,
        mortalite.nombre_porcs,
        mortalite.date,
        mortalite.cause || null,
        mortalite.categorie,
        mortalite.notes || null,
        date_creation,
      ]
    );

    return this.getMortaliteById(id);
  }

  async getMortaliteById(id: string): Promise<Mortalite> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Mortalite>(
      'SELECT * FROM mortalites WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Mortalité avec l'id ${id} non trouvée`);
    }

    return result;
  }

  async getAllMortalites(): Promise<Mortalite[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Mortalite>(
      'SELECT * FROM mortalites ORDER BY date DESC'
    );
  }

  async getMortalitesParProjet(projetId: string): Promise<Mortalite[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Mortalite>(
      'SELECT * FROM mortalites WHERE projet_id = ? ORDER BY date DESC',
      [projetId]
    );
  }

  async getMortalitesParDateRange(dateDebut: string, dateFin: string): Promise<Mortalite[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Mortalite>(
      'SELECT * FROM mortalites WHERE date >= ? AND date <= ? ORDER BY date DESC',
      [dateDebut, dateFin]
    );
  }

  async getMortalitesParCategorie(categorie: string): Promise<Mortalite[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Mortalite>(
      'SELECT * FROM mortalites WHERE categorie = ? ORDER BY date DESC',
      [categorie]
    );
  }

  async updateMortalite(id: string, updates: Partial<Mortalite>): Promise<Mortalite> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getMortaliteById(id);
    }

    values.push(id);

    await this.db.runAsync(
      `UPDATE mortalites SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getMortaliteById(id);
  }

  async deleteMortalite(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM mortalites WHERE id = ?', [id]);
  }

  async getStatistiquesMortalite(projetId: string): Promise<{
    total_morts: number;
    taux_mortalite: number;
    mortalites_par_categorie: {
      porcelet: number;
      truie: number;
      verrat: number;
      autre: number;
    };
    mortalites_par_mois: Array<{
      mois: string;
      nombre: number;
    }>;
  }> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Récupérer toutes les mortalités du projet
    const mortalites = await this.getMortalitesParProjet(projetId);

    // Calculer le total
    const total_morts = mortalites.reduce((sum, m) => sum + m.nombre_porcs, 0);

    // Récupérer le projet pour calculer le taux
    const projet = await this.getProjetById(projetId);
    const nombrePorcsTotal =
      projet.nombre_truies + projet.nombre_verrats + projet.nombre_porcelets;
    const taux_mortalite = nombrePorcsTotal > 0 ? (total_morts / nombrePorcsTotal) * 100 : 0;

    // Compter par catégorie
    const mortalites_par_categorie = {
      porcelet: mortalites.filter((m) => m.categorie === 'porcelet').reduce((sum, m) => sum + m.nombre_porcs, 0),
      truie: mortalites.filter((m) => m.categorie === 'truie').reduce((sum, m) => sum + m.nombre_porcs, 0),
      verrat: mortalites.filter((m) => m.categorie === 'verrat').reduce((sum, m) => sum + m.nombre_porcs, 0),
      autre: mortalites.filter((m) => m.categorie === 'autre').reduce((sum, m) => sum + m.nombre_porcs, 0),
    };

    // Grouper par mois
    const mortalitesParMoisMap = new Map<string, number>();
    mortalites.forEach((m) => {
      const date = new Date(m.date);
      const mois = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = mortalitesParMoisMap.get(mois) || 0;
      mortalitesParMoisMap.set(mois, current + m.nombre_porcs);
    });

    const mortalites_par_mois = Array.from(mortalitesParMoisMap.entries())
      .map(([mois, nombre]) => ({ mois, nombre }))
      .sort((a, b) => a.mois.localeCompare(b.mois));

    return {
      total_morts,
      taux_mortalite,
      mortalites_par_categorie,
      mortalites_par_mois,
    };
  }

  /**
   * ============================================
   * GESTION DES PLANIFICATIONS
   * ============================================
   */

  async createPlanification(planification: Omit<Planification, 'id' | 'date_creation' | 'derniere_modification'>): Promise<Planification> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `planification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    await this.db.runAsync(
      `INSERT INTO planifications (
        id, projet_id, type, titre, description, date_prevue, date_echeance,
        rappel, statut, recurrence, lien_gestation_id, lien_sevrage_id, notes,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        planification.projet_id,
        planification.type,
        planification.titre,
        planification.description || null,
        planification.date_prevue,
        planification.date_echeance || null,
        planification.rappel || null,
        planification.statut,
        planification.recurrence || null,
        planification.lien_gestation_id || null,
        planification.lien_sevrage_id || null,
        planification.notes || null,
        date_creation,
        derniere_modification,
      ]
    );

    return this.getPlanificationById(id);
  }

  async getPlanificationById(id: string): Promise<Planification> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<Planification>(
      'SELECT * FROM planifications WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Planification avec l'id ${id} non trouvée`);
    }

    return result;
  }

  async getAllPlanifications(): Promise<Planification[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Planification>(
      'SELECT * FROM planifications ORDER BY date_prevue ASC'
    );
  }

  async getPlanificationsParProjet(projetId: string): Promise<Planification[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Planification>(
      'SELECT * FROM planifications WHERE projet_id = ? ORDER BY date_prevue ASC',
      [projetId]
    );
  }

  async getPlanificationsParStatut(statut: string): Promise<Planification[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Planification>(
      'SELECT * FROM planifications WHERE statut = ? ORDER BY date_prevue ASC',
      [statut]
    );
  }

  async getPlanificationsParDateRange(dateDebut: string, dateFin: string): Promise<Planification[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return await this.db.getAllAsync<Planification>(
      'SELECT * FROM planifications WHERE date_prevue >= ? AND date_prevue <= ? ORDER BY date_prevue ASC',
      [dateDebut, dateFin]
    );
  }

  async getPlanificationsAVenir(projetId: string, jours: number = 7): Promise<Planification[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const aujourdhui = new Date().toISOString().split('T')[0];
    const dateFin = new Date();
    dateFin.setDate(dateFin.getDate() + jours);
    const dateFinStr = dateFin.toISOString().split('T')[0];

    return await this.db.getAllAsync<Planification>(
      `SELECT * FROM planifications 
       WHERE projet_id = ? 
       AND date_prevue >= ? 
       AND date_prevue <= ? 
       AND statut IN ('a_faire', 'en_cours')
       ORDER BY date_prevue ASC`,
      [projetId, aujourdhui, dateFinStr]
    );
  }

  async updatePlanification(id: string, updates: Partial<Planification>): Promise<Planification> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getPlanificationById(id);
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.db.runAsync(
      `UPDATE planifications SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getPlanificationById(id);
  }

  async deletePlanification(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM planifications WHERE id = ?', [id]);
  }

  /**
   * ============================================
   * GESTION DES COLLABORATIONS
   * ============================================
   */

  async createCollaborateur(collaborateur: Omit<Collaborateur, 'id' | 'date_creation' | 'derniere_modification'>): Promise<Collaborateur> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const id = `collaborateur_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date_creation = new Date().toISOString();
    const derniere_modification = date_creation;

    await this.db.runAsync(
      `INSERT INTO collaborations (
        id, projet_id, nom, prenom, email, telephone, role, statut,
        permission_reproduction, permission_nutrition, permission_finance,
        permission_rapports, permission_planification, permission_mortalites,
        date_invitation, date_acceptation, notes, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        collaborateur.projet_id,
        collaborateur.nom,
        collaborateur.prenom,
        collaborateur.email,
        collaborateur.telephone || null,
        collaborateur.role,
        collaborateur.statut || 'en_attente',
        collaborateur.permissions.reproduction ? 1 : 0,
        collaborateur.permissions.nutrition ? 1 : 0,
        collaborateur.permissions.finance ? 1 : 0,
        collaborateur.permissions.rapports ? 1 : 0,
        collaborateur.permissions.planification ? 1 : 0,
        collaborateur.permissions.mortalites ? 1 : 0,
        collaborateur.date_invitation,
        collaborateur.date_acceptation || null,
        collaborateur.notes || null,
        date_creation,
        derniere_modification,
      ]
    );

    return this.getCollaborateurById(id);
  }

  async getCollaborateurById(id: string): Promise<Collaborateur> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM collaborations WHERE id = ?',
      [id]
    );

    if (!result) {
      throw new Error(`Collaborateur avec l'id ${id} non trouvé`);
    }

    return this.mapRowToCollaborateur(result);
  }

  async getAllCollaborateurs(): Promise<Collaborateur[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM collaborations ORDER BY nom ASC, prenom ASC'
    );

    return results.map((row) => this.mapRowToCollaborateur(row));
  }

  async getCollaborateursParProjet(projetId: string): Promise<Collaborateur[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM collaborations WHERE projet_id = ? ORDER BY nom ASC, prenom ASC',
      [projetId]
    );

    return results.map((row) => this.mapRowToCollaborateur(row));
  }

  async getCollaborateursParStatut(statut: string): Promise<Collaborateur[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM collaborations WHERE statut = ? ORDER BY nom ASC, prenom ASC',
      [statut]
    );

    return results.map((row) => this.mapRowToCollaborateur(row));
  }

  async getCollaborateursParRole(role: string): Promise<Collaborateur[]> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM collaborations WHERE role = ? ORDER BY nom ASC, prenom ASC',
      [role]
    );

    return results.map((row) => this.mapRowToCollaborateur(row));
  }

  async updateCollaborateur(id: string, updates: UpdateCollaborateurInput): Promise<Collaborateur> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    // Récupérer les permissions actuelles si des permissions partielles sont fournies
    let currentCollaborateur: Collaborateur | null = null;
    if (updates.permissions) {
      currentCollaborateur = await this.getCollaborateurById(id);
    }

    const derniere_modification = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'date_creation' && key !== 'projet_id' && value !== undefined) {
        if (key === 'permissions') {
          const perms = value as UpdateCollaborateurInput['permissions'];
          // Fusionner les permissions partielles avec les permissions actuelles
          const mergedPerms = {
            reproduction: perms?.reproduction ?? currentCollaborateur!.permissions.reproduction,
            nutrition: perms?.nutrition ?? currentCollaborateur!.permissions.nutrition,
            finance: perms?.finance ?? currentCollaborateur!.permissions.finance,
            rapports: perms?.rapports ?? currentCollaborateur!.permissions.rapports,
            planification: perms?.planification ?? currentCollaborateur!.permissions.planification,
            mortalites: perms?.mortalites ?? currentCollaborateur!.permissions.mortalites,
          };
          fields.push('permission_reproduction = ?');
          values.push(mergedPerms.reproduction ? 1 : 0);
          fields.push('permission_nutrition = ?');
          values.push(mergedPerms.nutrition ? 1 : 0);
          fields.push('permission_finance = ?');
          values.push(mergedPerms.finance ? 1 : 0);
          fields.push('permission_rapports = ?');
          values.push(mergedPerms.rapports ? 1 : 0);
          fields.push('permission_planification = ?');
          values.push(mergedPerms.planification ? 1 : 0);
          fields.push('permission_mortalites = ?');
          values.push(mergedPerms.mortalites ? 1 : 0);
        } else if (key === 'date_acceptation') {
          fields.push(`${key} = ?`);
          values.push(value);
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    if (fields.length === 0) {
      return this.getCollaborateurById(id);
    }

    fields.push('derniere_modification = ?');
    values.push(derniere_modification);
    values.push(id);

    await this.db.runAsync(
      `UPDATE collaborations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getCollaborateurById(id);
  }

  async deleteCollaborateur(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    await this.db.runAsync('DELETE FROM collaborations WHERE id = ?', [id]);
  }

  // Helper pour mapper les lignes de la base de données vers l'objet Collaborateur
  private mapRowToCollaborateur(row: any): Collaborateur {
    return {
      id: row.id,
      projet_id: row.projet_id,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      telephone: row.telephone || undefined,
      role: row.role,
      statut: row.statut,
      permissions: {
        reproduction: row.permission_reproduction === 1,
        nutrition: row.permission_nutrition === 1,
        finance: row.permission_finance === 1,
        rapports: row.permission_rapports === 1,
        planification: row.permission_planification === 1,
        mortalites: row.permission_mortalites === 1,
      },
      date_invitation: row.date_invitation,
      date_acceptation: row.date_acceptation || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }
}

// Instance singleton
export const databaseService = new DatabaseService();

