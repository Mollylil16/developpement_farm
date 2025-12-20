/**
 * VisiteVeterinaireRepository - Gestion des visites vétérinaires
 *
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { VisiteVeterinaire, CreateVisiteVeterinaireInput } from '../../types/sante';

export class VisiteVeterinaireRepository extends BaseRepository<VisiteVeterinaire> {
  constructor() {
    super('visites_veterinaires', '/sante/visites-veterinaires');
  }

  private mapRow(row: unknown): VisiteVeterinaire {
    return {
      id: row.id,
      projet_id: row.projet_id,
      date_visite: row.date_visite,
      veterinaire: row.veterinaire || undefined,
      motif: row.motif,
      animaux_examines: row.animaux_examines || undefined,
      diagnostic: row.diagnostic || undefined,
      prescriptions: row.prescriptions || undefined,
      recommandations: row.recommandations || undefined,
      cout: row.cout || 0,
      prochaine_visite: row.prochaine_visite_prevue || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  async create(input: CreateVisiteVeterinaireInput): Promise<VisiteVeterinaire> {
    const visiteData = {
      projet_id: input.projet_id,
      date_visite: input.date_visite,
      veterinaire: input.veterinaire || null,
      motif: input.motif,
      animaux_examines: input.animaux_examines || null,
      diagnostic: input.diagnostic || null,
      prescriptions: input.prescriptions || null,
      recommandations: input.recommandations || null,
      cout: input.cout || null,
      prochaine_visite_prevue: input.prochaine_visite || null,
      notes: input.notes || null,
    };

    const created = await this.executePost<unknown>('/sante/visites-veterinaires', visiteData);
    return this.mapRow(created);
  }

  async findById(id: string): Promise<VisiteVeterinaire | null> {
    try {
      const row = await this.queryOne<unknown>(`/sante/visites-veterinaires/${id}`);
      return row ? this.mapRow(row) : null;
    } catch (error) {
      console.error('Error finding visite by id:', error);
      return null;
    }
  }

  async findByProjet(projetId: string): Promise<VisiteVeterinaire[]> {
    try {
      const rows = await this.query<unknown>('/sante/visites-veterinaires', { projet_id: projetId });
      return rows.map(this.mapRow)
        .sort((a, b) => new Date(b.date_visite).getTime() - new Date(a.date_visite).getTime());
    } catch (error) {
      console.error('Error finding visites by projet:', error);
      return [];
    }
  }

  async findProchaineVisite(projetId: string): Promise<VisiteVeterinaire | null> {
    try {
      const visites = await this.findByProjet(projetId);
      const visitesFutures = visites
        .filter(v => v.prochaine_visite && new Date(v.prochaine_visite) > new Date())
        .sort((a, b) => new Date(a.prochaine_visite || '').getTime() - new Date(b.prochaine_visite || '').getTime());
      
      return visitesFutures.length > 0 ? visitesFutures[0] : null;
    } catch (error) {
      console.error('Error finding prochaine visite:', error);
      return null;
    }
  }

  async update(id: string, updates: Partial<CreateVisiteVeterinaireInput>): Promise<VisiteVeterinaire> {
    const updateData: Record<string, unknown> = {};

    if (updates.date_visite !== undefined) updateData.date_visite = updates.date_visite;
    if (updates.veterinaire !== undefined) updateData.veterinaire = updates.veterinaire || null;
    if (updates.motif !== undefined) updateData.motif = updates.motif;
    if (updates.animaux_examines !== undefined) updateData.animaux_examines = updates.animaux_examines || null;
    if (updates.diagnostic !== undefined) updateData.diagnostic = updates.diagnostic || null;
    if (updates.prescriptions !== undefined) updateData.prescriptions = updates.prescriptions || null;
    if (updates.recommandations !== undefined) updateData.recommandations = updates.recommandations || null;
    if (updates.cout !== undefined) updateData.cout = updates.cout || null;
    if (updates.prochaine_visite !== undefined) updateData.prochaine_visite_prevue = updates.prochaine_visite || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;

    if (Object.keys(updateData).length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Visite introuvable');
      }
      return existing;
    }

    const updated = await this.executePatch<unknown>(`/sante/visites-veterinaires/${id}`, updateData);
    return this.mapRow(updated);
  }
}
