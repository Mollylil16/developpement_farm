/**
 * TraitementRepository - Gestion des traitements médicaux
 *
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { Traitement, CreateTraitementInput } from '../../types/sante';

export class TraitementRepository extends BaseRepository<Traitement> {
  constructor() {
    super('traitements', '/sante/traitements');
  }

  private mapRow(row: unknown): Traitement {
    return {
      id: row.id,
      projet_id: row.projet_id,
      maladie_id: row.maladie_id || undefined,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      type: row.type,
      nom_medicament: row.nom_medicament,
      voie_administration: row.voie_administration,
      dosage: row.dosage,
      frequence: row.frequence,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      duree_jours: row.duree_jours || undefined,
      temps_attente_jours: row.temps_attente_jours || undefined,
      veterinaire: row.veterinaire || undefined,
      cout: row.cout || undefined,
      termine: Boolean(row.termine),
      efficace: row.efficace !== null && row.efficace !== undefined ? Boolean(row.efficace) : undefined,
      effets_secondaires: row.effets_secondaires || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  async create(input: CreateTraitementInput): Promise<Traitement> {
    const traitementData = {
      projet_id: input.projet_id,
      maladie_id: input.maladie_id || null,
      animal_id: input.animal_id || null,
      lot_id: input.lot_id || null,
      type: input.type,
      nom_medicament: input.nom_medicament,
      voie_administration: input.voie_administration,
      dosage: input.dosage,
      frequence: input.frequence,
      date_debut: input.date_debut,
      date_fin: input.date_fin || null,
      duree_jours: input.duree_jours || null,
      temps_attente_jours: input.temps_attente_jours || null,
      veterinaire: input.veterinaire || null,
      cout: input.cout || null,
      termine: input.termine || false,
      efficace: input.efficace !== undefined ? input.efficace : null,
      effets_secondaires: input.effets_secondaires || null,
      notes: input.notes || null,
    };

    const created = await this.executePost<unknown>('/sante/traitements', traitementData);
    return this.mapRow(created);
  }

  async findById(id: string): Promise<Traitement | null> {
    try {
      const row = await this.queryOne<unknown>(`/sante/traitements/${id}`);
      return row ? this.mapRow(row) : null;
    } catch (error) {
      console.error('Error finding traitement by id:', error);
      return null;
    }
  }

  async findByProjet(projetId: string): Promise<Traitement[]> {
    try {
      const rows = await this.query<unknown>('/sante/traitements', { projet_id: projetId });
      return rows.map(this.mapRow);
    } catch (error) {
      console.error('Error finding traitements by projet:', error);
      return [];
    }
  }

  async findByMaladie(maladieId: string): Promise<Traitement[]> {
    try {
      const rows = await this.query<unknown>('/sante/traitements', { maladie_id: maladieId });
      return rows.map(this.mapRow);
    } catch (error) {
      console.error('Error finding traitements by maladie:', error);
      return [];
    }
  }

  async findByAnimal(animalId: string): Promise<Traitement[]> {
    try {
      const rows = await this.query<unknown>('/sante/traitements', { animal_id: animalId });
      return rows.map(this.mapRow);
    } catch (error) {
      console.error('Error finding traitements by animal:', error);
      return [];
    }
  }

  async findEnCours(projetId: string): Promise<Traitement[]> {
    try {
      const traitements = await this.findByProjet(projetId);
      return traitements.filter(t => !t.termine);
    } catch (error) {
      console.error('Error finding traitements en cours:', error);
      return [];
    }
  }

  async update(id: string, updates: Partial<CreateTraitementInput>): Promise<Traitement> {
    const updateData: Record<string, unknown> = {};

    if (updates.maladie_id !== undefined) updateData.maladie_id = updates.maladie_id || null;
    if (updates.animal_id !== undefined) updateData.animal_id = updates.animal_id || null;
    if (updates.lot_id !== undefined) updateData.lot_id = updates.lot_id || null;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.nom_medicament !== undefined) updateData.nom_medicament = updates.nom_medicament;
    if (updates.voie_administration !== undefined) updateData.voie_administration = updates.voie_administration;
    if (updates.dosage !== undefined) updateData.dosage = updates.dosage;
    if (updates.frequence !== undefined) updateData.frequence = updates.frequence;
    if (updates.date_debut !== undefined) updateData.date_debut = updates.date_debut;
    if (updates.date_fin !== undefined) updateData.date_fin = updates.date_fin || null;
    if (updates.duree_jours !== undefined) updateData.duree_jours = updates.duree_jours || null;
    if (updates.temps_attente_jours !== undefined) updateData.temps_attente_jours = updates.temps_attente_jours || null;
    if (updates.veterinaire !== undefined) updateData.veterinaire = updates.veterinaire || null;
    if (updates.cout !== undefined) updateData.cout = updates.cout || null;
    if (updates.termine !== undefined) updateData.termine = updates.termine;
    if (updates.efficace !== undefined) updateData.efficace = updates.efficace !== undefined ? updates.efficace : null;
    if (updates.effets_secondaires !== undefined) updateData.effets_secondaires = updates.effets_secondaires || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;

    if (Object.keys(updateData).length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Traitement introuvable');
      }
      return existing;
    }

    const updated = await this.executePatch<unknown>(`/sante/traitements/${id}`, updateData);
    return this.mapRow(updated);
  }

  async getStatistiquesTraitements(projetId: string): Promise<{
    total: number;
    enCours: number;
    termines: number;
    coutTotal: number;
    efficaciteMoyenne: number;
  }> {
    try {
      const traitements = await this.findByProjet(projetId);
      const total = traitements.length;
      const enCours = traitements.filter(t => !t.termine).length;
      const termines = traitements.filter(t => t.termine).length;
      const coutTotal = traitements.reduce((sum, t) => sum + (t.cout || 0), 0);
      
      const traitementsEfficaces = traitements.filter(t => t.efficace !== undefined && t.efficace !== null);
      const efficaciteMoyenne = traitementsEfficaces.length > 0
        ? traitementsEfficaces.filter(t => t.efficace).length / traitementsEfficaces.length
        : 0;

      return {
        total,
        enCours,
        termines,
        coutTotal,
        efficaciteMoyenne,
      };
    } catch (error) {
      console.error('Error getting statistiques traitements:', error);
      return {
        total: 0,
        enCours: 0,
        termines: 0,
        coutTotal: 0,
        efficaciteMoyenne: 0,
      };
    }
  }
}
