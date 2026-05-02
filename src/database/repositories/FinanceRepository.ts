/**
 * FinanceRepository - Gestion des finances
 *
 * Responsabilités:
 * - CRUD des revenus
 * - CRUD des dépenses ponctuelles
 * - CRUD des charges fixes
 * - Calculs financiers (solde, statistiques)
 * 
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { Revenu, DepensePonctuelle, ChargeFixe } from '../../types/finance';

/**
 * Repository pour les Revenus
 */
export class RevenuRepository extends BaseRepository<Revenu> {
  constructor() {
    super('revenus', '/finance/revenus');
  }

  /**
   * Surcharge de findAll pour parser les photos
   */
  async findAll(projetId?: string): Promise<Revenu[]> {
    try {
      const params: Record<string, unknown> = {};
      if (projetId) params.projet_id = projetId;

      const rows = await this.query<Revenu>('/finance/revenus', params);
      return rows.map((row) => ({
        ...row,
        photos: this.parsePhotos(row.photos as string | string[] | null | undefined),
      }));
    } catch (error) {
      console.error('Error finding revenus:', error);
      return [];
    }
  }

  /**
   * Surcharge de findById pour parser les photos
   */
  async findById(id: string): Promise<Revenu | null> {
    try {
      const row = await this.queryOne<Revenu>(`/finance/revenus/${id}`);
      if (!row) return null;
      return {
        ...row,
        photos: this.parsePhotos(row.photos as string | string[] | null | undefined),
      };
    } catch (error) {
      console.error('Error finding revenu by id:', error);
      return null;
    }
  }

  /**
   * Récupérer tous les revenus d'un projet
   */
  async findByProjet(projetId: string): Promise<Revenu[]> {
    return this.findAll(projetId);
  }

  async create(data: Partial<Revenu>): Promise<Revenu> {
    const revenuData = {
      projet_id: data.projet_id,
      montant: data.montant,
      categorie: data.categorie,
      date: data.date || new Date().toISOString(),
      commentaire: data.commentaire || null,
      description: data.description || null,
      libelle_categorie: data.libelle_categorie || null,
      photos: data.photos || null,
      poids_kg: data.poids_kg || null,
      animal_id: data.animal_id || null,
    };

    const created = await this.executePost<Revenu>('/finance/revenus', revenuData);
    return {
      ...created,
      photos: this.parsePhotos(created.photos as string | string[] | null | undefined),
    };
  }

  async update(id: string, data: Partial<Revenu>): Promise<Revenu> {
    const updateData: Record<string, unknown> = {};

    if (data.montant !== undefined) updateData.montant = data.montant;
    if (data.categorie !== undefined) updateData.categorie = data.categorie;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.commentaire !== undefined) updateData.commentaire = data.commentaire;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.libelle_categorie !== undefined) updateData.libelle_categorie = data.libelle_categorie;
    if (data.photos !== undefined) updateData.photos = data.photos;
    if (data.poids_kg !== undefined) updateData.poids_kg = data.poids_kg;
    if (data.animal_id !== undefined) updateData.animal_id = data.animal_id;

    const updated = await this.executePatch<Revenu>(`/finance/revenus/${id}`, updateData);
    return {
      ...updated,
      photos: this.parsePhotos(updated.photos as string | string[] | null | undefined),
    };
  }

  /**
   * Récupérer les revenus par période
   */
  async findByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<Revenu[]> {
    try {
      const rows = await this.query<Revenu>('/finance/revenus', {
        projet_id: projetId,
        date_debut: dateDebut,
        date_fin: dateFin,
      });
      return rows.map((row) => ({
        ...row,
        photos: this.parsePhotos(row.photos as string | string[] | null | undefined),
      }));
    } catch (error) {
      console.error('Error finding revenus by period:', error);
      return [];
    }
  }

  /**
   * Récupérer les revenus par période avec pagination
   */
  async findByPeriodPaginated(
    projetId: string,
    dateDebut: string,
    dateFin: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    data: Revenu[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const { limit = 50, offset = 0 } = options;

    try {
      const rows = await this.query<Revenu>('/finance/revenus', {
        projet_id: projetId,
        date_debut: dateDebut,
        date_fin: dateFin,
        limit,
        offset,
      });

      const data = rows.map((row) => ({
        ...row,
        photos: this.parsePhotos(row.photos as string | string[] | null | undefined),
      }));

      return {
        data,
        total: data.length,
        limit,
        offset,
        hasMore: data.length === limit,
      };
    } catch (error) {
      console.error('Error finding revenus by period paginated:', error);
      return {
        data: [],
        total: 0,
        limit,
        offset,
        hasMore: false,
      };
    }
  }

  /**
   * Calculer le total des revenus pour une période
   */
  async getTotalByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<number> {
    try {
      const revenus = await this.findByPeriod(projetId, dateDebut, dateFin);
      return revenus.reduce((total, r) => total + (r.montant || 0), 0);
    } catch (error) {
      console.error('Error getting total by period:', error);
      return 0;
    }
  }

  /**
   * Statistiques par catégorie
   */
  async getStatsByCategory(
    projetId: string,
    dateDebut?: string,
    dateFin?: string
  ): Promise<Array<{ categorie: string; total: number; count: number }>> {
    try {
      const revenus = dateDebut && dateFin
        ? await this.findByPeriod(projetId, dateDebut, dateFin)
        : await this.findByProjet(projetId);

      const stats = new Map<string, { total: number; count: number }>();

      revenus.forEach((revenu) => {
        const categorie = revenu.categorie || 'autre';
        const existing = stats.get(categorie) || { total: 0, count: 0 };
        stats.set(categorie, {
          total: existing.total + (revenu.montant || 0),
          count: existing.count + 1,
        });
      });

      return Array.from(stats.entries())
        .map(([categorie, data]) => ({ categorie, ...data }))
        .sort((a, b) => b.total - a.total);
    } catch (error) {
      console.error('Error getting stats by category:', error);
      return [];
    }
  }
}

/**
 * Repository pour les Dépenses Ponctuelles
 */
export class DepensePonctuelleRepository extends BaseRepository<DepensePonctuelle> {
  constructor() {
    super('depenses_ponctuelles', '/finance/depenses-ponctuelles');
  }

  /**
   * Surcharge de findAll pour parser les photos
   */
  async findAll(projetId?: string): Promise<DepensePonctuelle[]> {
    try {
      const params: Record<string, unknown> = {};
      if (projetId) params.projet_id = projetId;

      const rows = await this.query<DepensePonctuelle>('/finance/depenses-ponctuelles', params);
      return rows.map((row) => ({
        ...row,
        photos: this.parsePhotos(row.photos as string | string[] | null | undefined),
      }));
    } catch (error) {
      console.error('Error finding depenses:', error);
      return [];
    }
  }

  /**
   * Surcharge de findById pour parser les photos
   */
  async findById(id: string): Promise<DepensePonctuelle | null> {
    try {
      const row = await this.queryOne<DepensePonctuelle>(`/finance/depenses-ponctuelles/${id}`);
      if (!row) return null;
      return {
        ...row,
        photos: this.parsePhotos(row.photos as string | string[] | null | undefined),
      };
    } catch (error) {
      console.error('Error finding depense by id:', error);
      return null;
    }
  }

  /**
   * Récupérer toutes les dépenses d'un projet
   */
  async findByProjet(projetId: string): Promise<DepensePonctuelle[]> {
    return this.findAll(projetId);
  }

  async create(data: Partial<DepensePonctuelle>): Promise<DepensePonctuelle> {
    const depenseData = {
      projet_id: data.projet_id,
      montant: data.montant,
      categorie: data.categorie,
      libelle_categorie: data.libelle_categorie || null,
      date: data.date || new Date().toISOString(),
      commentaire: data.commentaire || null,
      photos: data.photos || null,
    };

    const created = await this.executePost<DepensePonctuelle>('/finance/depenses-ponctuelles', depenseData);
    return {
      ...created,
      photos: this.parsePhotos(created.photos as string | string[] | null | undefined),
    };
  }

  async update(id: string, data: Partial<DepensePonctuelle>): Promise<DepensePonctuelle> {
    const updateData: Record<string, unknown> = {};

    if (data.montant !== undefined) updateData.montant = data.montant;
    if (data.categorie !== undefined) updateData.categorie = data.categorie;
    if (data.libelle_categorie !== undefined) updateData.libelle_categorie = data.libelle_categorie;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.commentaire !== undefined) updateData.commentaire = data.commentaire;
    if (data.photos !== undefined) updateData.photos = data.photos;

    const updated = await this.executePatch<DepensePonctuelle>(`/finance/depenses-ponctuelles/${id}`, updateData);
    return {
      ...updated,
      photos: this.parsePhotos(updated.photos as string | string[] | null | undefined),
    };
  }

  /**
   * Récupérer les dépenses par période
   */
  async findByPeriod(
    projetId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<DepensePonctuelle[]> {
    try {
      const rows = await this.query<DepensePonctuelle>('/finance/depenses-ponctuelles', {
        projet_id: projetId,
        date_debut: dateDebut,
        date_fin: dateFin,
      });
      return rows.map((row) => ({
        ...row,
        photos: this.parsePhotos(row.photos as string | string[] | null | undefined),
      }));
    } catch (error) {
      console.error('Error finding depenses by period:', error);
      return [];
    }
  }

  /**
   * Récupérer les dépenses par période avec pagination
   */
  async findByPeriodPaginated(
    projetId: string,
    dateDebut: string,
    dateFin: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    data: DepensePonctuelle[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const { limit = 50, offset = 0 } = options;

    try {
      const rows = await this.query<DepensePonctuelle>('/finance/depenses-ponctuelles', {
        projet_id: projetId,
        date_debut: dateDebut,
        date_fin: dateFin,
        limit,
        offset,
      });

      const data = rows.map((row) => ({
        ...row,
        photos: this.parsePhotos(row.photos as string | string[] | null | undefined),
      }));

      return {
        data,
        total: data.length,
        limit,
        offset,
        hasMore: data.length === limit,
      };
    } catch (error) {
      console.error('Error finding depenses by period paginated:', error);
      return {
        data: [],
        total: 0,
        limit,
        offset,
        hasMore: false,
      };
    }
  }

  async getTotalByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<number> {
    try {
      const depenses = await this.findByPeriod(projetId, dateDebut, dateFin);
      return depenses.reduce((total, d) => total + (d.montant || 0), 0);
    } catch (error) {
      console.error('Error getting total by period:', error);
      return 0;
    }
  }

  async getStatsByCategory(
    projetId: string,
    dateDebut?: string,
    dateFin?: string
  ): Promise<Array<{ categorie: string; total: number; count: number }>> {
    try {
      const depenses = dateDebut && dateFin
        ? await this.findByPeriod(projetId, dateDebut, dateFin)
        : await this.findByProjet(projetId);

      const stats = new Map<string, { total: number; count: number }>();

      depenses.forEach((depense) => {
        const categorie = depense.categorie || 'autre';
        const existing = stats.get(categorie) || { total: 0, count: 0 };
        stats.set(categorie, {
          total: existing.total + (depense.montant || 0),
          count: existing.count + 1,
        });
      });

      return Array.from(stats.entries())
        .map(([categorie, data]) => ({ categorie, ...data }))
        .sort((a, b) => b.total - a.total);
    } catch (error) {
      console.error('Error getting stats by category:', error);
      return [];
    }
  }
}

/**
 * Repository pour les Charges Fixes
 */
export class ChargeFixeRepository extends BaseRepository<ChargeFixe> {
  constructor() {
    super('charges_fixes', '/finance/charges-fixes');
  }

  async create(data: Partial<ChargeFixe>): Promise<ChargeFixe> {
    const chargeData = {
      projet_id: data.projet_id || null,
      categorie: data.categorie,
      libelle: data.libelle,
      montant: data.montant,
      date_debut: data.date_debut || new Date().toISOString(),
      frequence: data.frequence,
      jour_paiement: data.jour_paiement || null,
      notes: data.notes || null,
      statut: data.statut || 'actif',
    };

    return this.executePost<ChargeFixe>('/finance/charges-fixes', chargeData);
  }

  async update(id: string, data: Partial<ChargeFixe>): Promise<ChargeFixe> {
    const updateData: Record<string, unknown> = {};

    if (data.projet_id !== undefined) updateData.projet_id = data.projet_id;
    if (data.categorie !== undefined) updateData.categorie = data.categorie;
    if (data.libelle !== undefined) updateData.libelle = data.libelle;
    if (data.montant !== undefined) updateData.montant = data.montant;
    if (data.date_debut !== undefined) updateData.date_debut = data.date_debut;
    if (data.frequence !== undefined) updateData.frequence = data.frequence;
    if (data.jour_paiement !== undefined) updateData.jour_paiement = data.jour_paiement;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.statut !== undefined) updateData.statut = data.statut;

    return this.executePatch<ChargeFixe>(`/finance/charges-fixes/${id}`, updateData);
  }

  /**
   * Récupérer toutes les charges fixes d'un projet
   */
  async findByProjet(projetId: string): Promise<ChargeFixe[]> {
    try {
      return this.query<ChargeFixe>('/finance/charges-fixes', { projet_id: projetId });
    } catch (error) {
      console.error('Error finding charges fixes by projet:', error);
      return [];
    }
  }

  /**
   * Récupérer uniquement les charges actives
   */
  async findActiveByProjet(projetId: string): Promise<ChargeFixe[]> {
    try {
      const charges = await this.findByProjet(projetId);
      return charges.filter(c => c.statut === 'actif');
    } catch (error) {
      console.error('Error finding active charges fixes:', error);
      return [];
    }
  }

  /**
   * Calculer le total mensuel des charges fixes actives
   */
  async getTotalMensuelActif(projetId: string): Promise<number> {
    try {
      const charges = await this.findActiveByProjet(projetId);
      return charges.reduce((total, c) => total + (c.montant || 0), 0);
    } catch (error) {
      console.error('Error getting total mensuel actif:', error);
      return 0;
    }
  }

  /**
   * Activer/Désactiver une charge
   */
  async toggleStatus(id: string): Promise<ChargeFixe> {
    const charge = await this.findById(id);
    if (!charge) {
      throw new Error('Charge fixe introuvable');
    }
    const newStatus = charge.statut === 'actif' ? 'inactif' : 'actif';
    return this.update(id, { statut: newStatus });
  }
}

/**
 * Service principal Finance regroupant tous les repositories
 */
export class FinanceService {
  public revenus: RevenuRepository;
  public depenses: DepensePonctuelleRepository;
  public charges: ChargeFixeRepository;

  constructor() {
    this.revenus = new RevenuRepository();
    this.depenses = new DepensePonctuelleRepository();
    this.charges = new ChargeFixeRepository();
  }

  /**
   * Calculer le solde pour une période
   */
  async getSoldeByPeriod(
    projetId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<{
    revenus: number;
    depenses: number;
    charges: number;
    solde: number;
  }> {
    const [totalRevenus, totalDepenses, totalCharges] = await Promise.all([
      this.revenus.getTotalByPeriod(projetId, dateDebut, dateFin),
      this.depenses.getTotalByPeriod(projetId, dateDebut, dateFin),
      this.charges.getTotalMensuelActif(projetId),
    ]);

    // Pour les charges, multiplier par le nombre de mois dans la période
    const moisDebut = new Date(dateDebut);
    const moisFin = new Date(dateFin);
    const nombreMois =
      (moisFin.getFullYear() - moisDebut.getFullYear()) * 12 +
      (moisFin.getMonth() - moisDebut.getMonth()) +
      1;
    const chargesTotal = totalCharges * nombreMois;

    const solde = totalRevenus - (totalDepenses + chargesTotal);

    return {
      revenus: totalRevenus,
      depenses: totalDepenses,
      charges: chargesTotal,
      solde,
    };
  }
}
