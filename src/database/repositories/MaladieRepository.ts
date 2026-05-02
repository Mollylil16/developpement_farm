/**
 * MaladieRepository - Gestion des maladies
 *
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { Maladie, CreateMaladieInput } from '../../types/sante';

// Type pour les données brutes de la base de données
interface MaladieRow {
  id: string;
  projet_id: string;
  animal_id?: string | null;
  lot_id?: string | null;
  type: string;
  nom_maladie: string;
  gravite: string;
  date_debut: string;
  date_fin?: string | null;
  symptomes: string;
  diagnostic?: string | null;
  contagieux?: boolean | number | null;
  nombre_animaux_affectes?: number | null;
  nombre_deces?: number | null;
  veterinaire?: string | null;
  cout_traitement?: number | null;
  gueri?: boolean | number | null;
  notes?: string | null;
  date_creation: string;
  derniere_modification: string;
}

export class MaladieRepository extends BaseRepository<Maladie> {
  constructor() {
    super('maladies', '/sante/maladies');
  }

  private mapRow(row: MaladieRow): Maladie {
    return {
      id: row.id,
      projet_id: row.projet_id,
      animal_id: row.animal_id || undefined,
      lot_id: row.lot_id || undefined,
      type: row.type,
      nom_maladie: row.nom_maladie,
      gravite: row.gravite,
      date_debut: row.date_debut,
      date_fin: row.date_fin || undefined,
      symptomes: row.symptomes,
      diagnostic: row.diagnostic || undefined,
      contagieux: Boolean(row.contagieux),
      nombre_animaux_affectes: row.nombre_animaux_affectes || undefined,
      nombre_deces: row.nombre_deces || undefined,
      veterinaire: row.veterinaire || undefined,
      cout_traitement: row.cout_traitement || undefined,
      gueri: Boolean(row.gueri),
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  async create(input: CreateMaladieInput): Promise<Maladie> {
    const maladieData = {
      projet_id: input.projet_id,
      animal_id: input.animal_id || null,
      lot_id: input.lot_id || null,
      type: input.type,
      nom_maladie: input.nom_maladie,
      gravite: input.gravite,
      symptomes: input.symptomes,
      diagnostic: input.diagnostic || null,
      date_debut: input.date_debut,
      date_fin: input.date_fin || null,
      gueri: input.gueri || false,
      contagieux: input.contagieux || false,
      nombre_animaux_affectes: input.nombre_animaux_affectes || null,
      nombre_deces: input.nombre_deces || null,
      veterinaire: input.veterinaire || null,
      cout_traitement: input.cout_traitement || null,
      notes: input.notes || null,
    };

    const created = await this.executePost<MaladieRow>('/sante/maladies', maladieData);
    return this.mapRow(created);
  }

  async findById(id: string): Promise<Maladie | null> {
    try {
      const row = await this.queryOne<MaladieRow>(`/sante/maladies/${id}`);
      return row ? this.mapRow(row) : null;
    } catch (error) {
      console.error('Error finding maladie by id:', error);
      return null;
    }
  }

  async findByProjet(projetId: string): Promise<Maladie[]> {
    try {
      const rows = await this.query<MaladieRow>('/sante/maladies', { projet_id: projetId });
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      console.error('Error finding maladies by projet:', error);
      return [];
    }
  }

  async findByAnimal(animalId: string): Promise<Maladie[]> {
    try {
      const rows = await this.query<MaladieRow>('/sante/maladies', { animal_id: animalId });
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      console.error('Error finding maladies by animal:', error);
      return [];
    }
  }

  async findEnCours(projetId: string): Promise<Maladie[]> {
    try {
      const maladies = await this.findByProjet(projetId);
      return maladies.filter(m => !m.gueri);
    } catch (error) {
      console.error('Error finding maladies en cours:', error);
      return [];
    }
  }

  async update(id: string, updates: Partial<CreateMaladieInput>): Promise<Maladie> {
    const updateData: Record<string, unknown> = {};

    if (updates.animal_id !== undefined) updateData.animal_id = updates.animal_id || null;
    if (updates.lot_id !== undefined) updateData.lot_id = updates.lot_id || null;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.nom_maladie !== undefined) updateData.nom_maladie = updates.nom_maladie;
    if (updates.gravite !== undefined) updateData.gravite = updates.gravite;
    if (updates.symptomes !== undefined) updateData.symptomes = updates.symptomes;
    if (updates.diagnostic !== undefined) updateData.diagnostic = updates.diagnostic || null;
    if (updates.date_debut !== undefined) updateData.date_debut = updates.date_debut;
    if (updates.date_fin !== undefined) updateData.date_fin = updates.date_fin || null;
    if (updates.gueri !== undefined) updateData.gueri = updates.gueri;
    if (updates.contagieux !== undefined) updateData.contagieux = updates.contagieux;
    if (updates.nombre_animaux_affectes !== undefined) updateData.nombre_animaux_affectes = updates.nombre_animaux_affectes || null;
    if (updates.nombre_deces !== undefined) updateData.nombre_deces = updates.nombre_deces || null;
    if (updates.veterinaire !== undefined) updateData.veterinaire = updates.veterinaire || null;
    if (updates.cout_traitement !== undefined) updateData.cout_traitement = updates.cout_traitement || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;

    if (Object.keys(updateData).length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Maladie introuvable');
      }
      return existing;
    }

    const updated = await this.executePatch<MaladieRow>(`/sante/maladies/${id}`, updateData);
    return this.mapRow(updated);
  }

  async delete(id: string): Promise<void> {
    await this.deleteById(id);
  }

  async getStatistiquesMaladies(projetId: string): Promise<{
    total: number;
    enCours: number;
    gueries: number;
    parType: { [key: string]: number };
    parGravite: { [key: string]: number };
    tauxGuerison: number;
  }> {
    try {
      const maladies = await this.findByProjet(projetId);
      const total = maladies.length;
      const enCours = maladies.filter(m => !m.gueri).length;
      const gueries = maladies.filter(m => m.gueri).length;

      const parType: { [key: string]: number } = {};
      const parGravite: { [key: string]: number } = {};

      maladies.forEach(m => {
        parType[m.type] = (parType[m.type] || 0) + 1;
        parGravite[m.gravite] = (parGravite[m.gravite] || 0) + 1;
      });

      const tauxGuerison = total > 0 ? (gueries / total) * 100 : 0;

      return {
        total,
        enCours,
        gueries,
        parType,
        parGravite,
        tauxGuerison,
      };
    } catch (error) {
      console.error('Error getting statistiques maladies:', error);
      return {
        total: 0,
        enCours: 0,
        gueries: 0,
        parType: {},
        parGravite: {},
        tauxGuerison: 0,
      };
    }
  }
}
