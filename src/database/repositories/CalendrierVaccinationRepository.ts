/**
 * CalendrierVaccinationRepository - Gestion des calendriers de vaccination
 *
 * Responsabilités:
 * - CRUD des calendriers de vaccination
 * - Recherche par projet et catégorie
 */

import { BaseRepository } from './BaseRepository';
import { CalendrierVaccination, CreateCalendrierVaccinationInput } from '../../types/sante';

export class CalendrierVaccinationRepository extends BaseRepository<CalendrierVaccination> {
  constructor() {
    super('calendrier_vaccinations', '/sante/calendrier-vaccinations');
  }

  /**
   * Mapper une ligne de la base vers CalendrierVaccination
   */
  private mapRow(row: any): CalendrierVaccination {
    return {
      id: row.id,
      projet_id: row.projet_id,
      vaccin: row.vaccin,
      nom_vaccin: row.nom_vaccin || undefined,
      categorie: row.categorie,
      age_jours: row.age_jours || undefined,
      date_planifiee: row.date_planifiee || undefined,
      frequence_jours: row.frequence_jours || undefined,
      obligatoire: Boolean(row.obligatoire),
      notes: row.notes || undefined,
      date_creation: row.date_creation,
    };
  }

  /**
   * Créer un nouveau calendrier de vaccination
   */
  async create(input: CreateCalendrierVaccinationInput): Promise<CalendrierVaccination> {
    const created = await this.executePost<unknown>(this.apiBasePath, input);
    return this.mapRow(created);
  }

  async update(
    id: string,
    updates: Partial<CreateCalendrierVaccinationInput>
  ): Promise<CalendrierVaccination> {
    const updated = await this.executePatch<unknown>(`${this.apiBasePath}/${id}`, updates);
    return this.mapRow(updated);
  }

  /**
   * Override findById pour mapper correctement
   */
  async findById(id: string): Promise<CalendrierVaccination | null> {
    const row = await this.queryOne<unknown>(`${this.apiBasePath}/${id}`);
    return row ? this.mapRow(row) : null;
  }

  /**
   * Récupérer tous les calendriers d'un projet
   */
  async findByProjet(projetId: string): Promise<CalendrierVaccination[]> {
    const rows = await this.query<unknown>(this.apiBasePath, { projet_id: projetId });
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Récupérer les calendriers par catégorie d'animal
   */
  async findByCategorie(projetId: string, categorie: string): Promise<CalendrierVaccination[]> {
    const rows = await this.query<unknown>(this.apiBasePath, { projet_id: projetId, categorie });
    return rows.map((row) => this.mapRow(row));
  }
}
