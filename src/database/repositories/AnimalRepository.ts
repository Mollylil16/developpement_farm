/**
 * AnimalRepository - Gestion des animaux de production
 * 
 * Responsabilités:
 * - CRUD des animaux (truies, verrats, porcelets)
 * - Recherche et filtrage
 * - Statistiques du cheptel
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { ProductionAnimal } from '../../types/production';
import uuid from 'react-native-uuid';

export class AnimalRepository extends BaseRepository<ProductionAnimal> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'production_animaux');
  }

  /**
   * Synchroniser automatiquement actif avec statut
   * actif = true si statut === 'actif', sinon false
   */
  private syncActifWithStatut(statut: string): boolean {
    return statut === 'actif';
  }

  /**
   * Créer un nouvel animal
   * Synchronise automatiquement actif avec statut
   */
  async create(data: Partial<ProductionAnimal>): Promise<ProductionAnimal> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();
    const statut = data.statut || 'actif';
    const actif = this.syncActifWithStatut(statut);

    await this.execute(
      `INSERT INTO production_animaux (
        id, projet_id, code, nom, sexe, race, date_naissance,
        reproducteur, statut, actif, photo_uri, origine, date_entree, poids_initial, 
        categorie_poids, notes, pere_id, mere_id, date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.code,
        data.nom || null,
        data.sexe,
        data.race || null,
        data.date_naissance || null,
        data.reproducteur ? 1 : 0,
        statut,
        actif ? 1 : 0,
        data.photo_uri || null,
        data.origine || null,
        data.date_entree || null,
        data.poids_initial || null,
        data.categorie_poids || null,
        data.notes || null,
        data.pere_id || null,
        data.mere_id || null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer l\'animal');
    }
    return created;
  }

  /**
   * Mettre à jour un animal
   */
  async update(id: string, data: Partial<ProductionAnimal>): Promise<ProductionAnimal> {
    console.log('🔄 [AnimalRepository.update] ID:', id);
    console.log('🔄 [AnimalRepository.update] photo_uri dans data:', data.photo_uri);
    console.log('🔄 [AnimalRepository.update] photo_uri === undefined?', data.photo_uri === undefined);
    
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    // Construire dynamiquement la requête UPDATE - TOUS les champs supportés
    if (data.code !== undefined) {
      fields.push('code = ?');
      values.push(data.code);
    }
    if (data.nom !== undefined) {
      fields.push('nom = ?');
      values.push(data.nom);
    }
    if (data.sexe !== undefined) {
      fields.push('sexe = ?');
      values.push(data.sexe);
    }
    if (data.race !== undefined) {
      fields.push('race = ?');
      values.push(data.race);
    }
    if (data.date_naissance !== undefined) {
      fields.push('date_naissance = ?');
      values.push(data.date_naissance);
    }
    if (data.reproducteur !== undefined) {
      fields.push('reproducteur = ?');
      values.push(data.reproducteur ? 1 : 0);
    }
    if (data.statut !== undefined) {
      fields.push('statut = ?');
      values.push(data.statut);
      // Synchroniser automatiquement actif avec statut
      fields.push('actif = ?');
      values.push(this.syncActifWithStatut(data.statut) ? 1 : 0);
    } else if (data.actif !== undefined) {
      // Si actif est modifié directement, synchroniser statut (pour compatibilité)
      // Mais préférer modifier statut pour maintenir la cohérence
      fields.push('actif = ?');
      values.push(data.actif ? 1 : 0);
    }
    if (data.photo_uri !== undefined) {
      fields.push('photo_uri = ?');
      values.push(data.photo_uri);
    }
    if (data.pere_id !== undefined) {
      fields.push('pere_id = ?');
      values.push(data.pere_id);
    }
    if (data.mere_id !== undefined) {
      fields.push('mere_id = ?');
      values.push(data.mere_id);
    }
    if (data.origine !== undefined) {
      fields.push('origine = ?');
      values.push(data.origine);
    }
    if (data.date_entree !== undefined) {
      fields.push('date_entree = ?');
      values.push(data.date_entree);
    }
    if (data.poids_initial !== undefined) {
      fields.push('poids_initial = ?');
      // Convertir 0 en null pour respecter la contrainte CHECK (poids_initial IS NULL OR poids_initial > 0)
      values.push(data.poids_initial === 0 || data.poids_initial === null ? null : data.poids_initial);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }
    if (data.categorie_poids !== undefined) {
      fields.push('categorie_poids = ?');
      values.push(data.categorie_poids);
    }

    // Toujours mettre à jour derniere_modification
    fields.push('derniere_modification = ?');
    values.push(now);

    if (fields.length === 1) { // Si seulement derniere_modification
      throw new Error('Aucune donnée à mettre à jour');
    }

    values.push(id);
    
    console.log('🔄 [AnimalRepository.update] SQL:', `UPDATE production_animaux SET ${fields.join(', ')} WHERE id = ?`);
    console.log('🔄 [AnimalRepository.update] Values:', values);
    
    await this.execute(
      `UPDATE production_animaux SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Animal introuvable après mise à jour');
    }
    
    console.log('✅ [AnimalRepository.update] Animal mis à jour, photo_uri:', updated.photo_uri);
    return updated;
  }

  /**
   * Récupérer tous les animaux d'un projet (actifs et inactifs)
   * ⚠️ Attention: Peut charger beaucoup de données en mémoire
   * Utilisez findByProjetPaginated() pour les projets avec beaucoup d'animaux
   */
  async findByProjet(projetId: string): Promise<ProductionAnimal[]> {
    const animaux = await this.query<ProductionAnimal>(
      `SELECT * FROM production_animaux 
       WHERE projet_id = ?
       ORDER BY date_creation DESC`,
      [projetId]
    );
    
    // Log des photos pour diagnostic
    const animauxAvecPhoto = animaux.filter(a => a.photo_uri);
    console.log(`📊 [AnimalRepository] ${animaux.length} animaux chargés, ${animauxAvecPhoto.length} avec photo`);
    if (animauxAvecPhoto.length > 0) {
      console.log('📸 Exemple photo URI:', animauxAvecPhoto[0].photo_uri);
    }
    
    return animaux;
  }

  /**
   * Récupérer les animaux d'un projet avec pagination
   */
  async findByProjetPaginated(
    projetId: string,
    options: {
      limit?: number;
      offset?: number;
      actif?: boolean;
      statut?: string;
    } = {}
  ): Promise<{
    data: ProductionAnimal[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const { limit = 50, offset = 0, actif, statut } = options;

    // Construire la clause WHERE
    let whereClause = 'WHERE projet_id = ?';
    const params: unknown[] = [projetId];

    if (actif !== undefined) {
      whereClause += ' AND actif = ?';
      params.push(actif ? 1 : 0);
    }

    if (statut) {
      whereClause += ' AND statut = ?';
      params.push(statut);
    }

    // Compter le total
    const countResult = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM production_animaux ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    // Récupérer les données paginées
    const data = await this.query<ProductionAnimal>(
      `SELECT * FROM production_animaux ${whereClause} ORDER BY date_creation DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
  }

  /**
   * Récupérer les animaux actifs d'un projet
   * Utilise actif (booléen) pour meilleures performances
   */
  async findActiveByProjet(projetId: string): Promise<ProductionAnimal[]> {
    return this.query<ProductionAnimal>(
      `SELECT * FROM production_animaux 
       WHERE projet_id = ? AND actif = 1
       ORDER BY date_creation DESC`,
      [projetId]
    );
  }

  /**
   * Récupérer les reproducteurs (truies et verrats)
   * Utilise actif (booléen) pour meilleures performances
   */
  async findReproducteursByProjet(
    projetId: string,
    sexe?: 'male' | 'femelle'
  ): Promise<ProductionAnimal[]> {
    let sql = `SELECT * FROM production_animaux 
               WHERE projet_id = ? AND reproducteur = 1 AND actif = 1`;
    const params: unknown[] = [projetId];

    if (sexe) {
      sql += ` AND sexe = ?`;
      params.push(sexe);
    }

    sql += ` ORDER BY code ASC`;
    return this.query<ProductionAnimal>(sql, params);
  }

  /**
   * Rechercher un animal par son code
   */
  async findByCode(code: string, projetId?: string): Promise<ProductionAnimal | null> {
    if (projetId) {
      return this.queryOne<ProductionAnimal>(
        `SELECT * FROM production_animaux WHERE code = ? AND projet_id = ?`,
        [code, projetId]
      );
    }
    return this.queryOne<ProductionAnimal>(
      `SELECT * FROM production_animaux WHERE code = ?`,
      [code]
    );
  }

  /**
   * Vérifier si un code existe déjà
   */
  async codeExists(code: string, projetId?: string, excludeId?: string): Promise<boolean> {
    let sql = `SELECT COUNT(*) as count FROM production_animaux WHERE code = ?`;
      const params: unknown[] = [code];

    if (projetId) {
      sql += ` AND projet_id = ?`;
      params.push(projetId);
    }

    if (excludeId) {
      sql += ` AND id != ?`;
      params.push(excludeId);
    }

    const result = await this.queryOne<{ count: number }>(sql, params);
    return (result?.count || 0) > 0;
  }

  /**
   * Statistiques du cheptel
   * Utilise actif (booléen) pour meilleures performances dans les comptages
   */
  async getStats(projetId: string): Promise<{
    total: number;
    actifs: number;
    truies: number;
    verrats: number;
    porcelets: number;
    vendus: number;
    morts: number;
  }> {
    const stats = await this.queryOne<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN actif = 1 THEN 1 ELSE 0 END) as actifs,
        SUM(CASE WHEN sexe = 'femelle' AND reproducteur = 1 AND actif = 1 THEN 1 ELSE 0 END) as truies,
        SUM(CASE WHEN sexe = 'male' AND reproducteur = 1 AND actif = 1 THEN 1 ELSE 0 END) as verrats,
        SUM(CASE WHEN reproducteur = 0 AND actif = 1 THEN 1 ELSE 0 END) as porcelets,
        SUM(CASE WHEN statut = 'vendu' THEN 1 ELSE 0 END) as vendus,
        SUM(CASE WHEN statut = 'mort' THEN 1 ELSE 0 END) as morts
       FROM production_animaux
       WHERE projet_id = ?`,
      [projetId]
    );

    return {
      total: stats?.total || 0,
      actifs: stats?.actifs || 0,
      truies: stats?.truies || 0,
      verrats: stats?.verrats || 0,
      porcelets: stats?.porcelets || 0,
      vendus: stats?.vendus || 0,
      morts: stats?.morts || 0,
    };
  }

  /**
   * Marquer un animal comme vendu
   */
  async markAsSold(id: string, dateVente?: string): Promise<ProductionAnimal> {
    return this.update(id, {
      statut: 'vendu',
      // On pourrait ajouter un champ date_vente si nécessaire
    });
  }

  /**
   * Marquer un animal comme mort
   */
  async markAsDead(id: string): Promise<ProductionAnimal> {
    return this.update(id, {
      statut: 'mort',
    });
  }

  /**
   * Récupérer les animaux par statut
   */
  async findByStatut(
    projetId: string,
    statut: 'actif' | 'vendu' | 'mort'
  ): Promise<ProductionAnimal[]> {
    return this.query<ProductionAnimal>(
      `SELECT * FROM production_animaux 
       WHERE projet_id = ? AND statut = ?
       ORDER BY derniere_modification DESC`,
      [projetId, statut]
    );
  }
}

