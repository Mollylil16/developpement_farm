/**
 * MortaliteRepository - Gestion des mortalités
 *
 * Responsabilités:
 * - CRUD des mortalités
 * - Statistiques de mortalité
 * - Suivi des causes
 * - Alertes de mortalité anormale
 * 
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { Mortalite } from '../../types/mortalite';
import { ProductionAnimal } from '../../types/production';
import { AnimalRepository } from './AnimalRepository';

export class MortaliteRepository extends BaseRepository<Mortalite> {
  constructor() {
    super('mortalites', '/mortalites');
  }

  async create(data: Partial<Mortalite>): Promise<Mortalite> {
    const mortaliteData = {
      projet_id: data.projet_id,
      nombre_porcs: data.nombre_porcs || 1,
      date: data.date || new Date().toISOString(),
      cause: data.cause || null,
      categorie: data.categorie || 'autre',
      animal_code: data.animal_code || null,
      notes: data.notes || null,
    };

    return this.executePost<Mortalite>('/mortalites', mortaliteData);
  }

  /**
   * Créer une mortalité et mettre à jour automatiquement le statut des animaux concernés
   */
  async createWithAnimalUpdate(data: Partial<Mortalite>): Promise<Mortalite> {
    if (!data.projet_id) {
      throw new Error('projet_id est requis');
    }

    const animalRepo = new AnimalRepository();
    const animauxProjet = await animalRepo.findByProjet(data.projet_id);
    const animauxActifs = animauxProjet.filter(a => a.statut?.toLowerCase() === 'actif');

    const animalCorrespondCategorie = (animal: ProductionAnimal, categorie: string): boolean => {
      if (categorie === 'autre') return true;

      const isReproducteur = animal.reproducteur === true;
      const isMale = animal.sexe === 'male';
      const isFemelle = animal.sexe === 'femelle';

      switch (categorie) {
        case 'truie':
          return isFemelle && isReproducteur;
        case 'verrat':
          return isMale && isReproducteur;
        case 'porcelet':
          return (
            (isMale && !isReproducteur) ||
            (isFemelle && !isReproducteur) ||
            animal.sexe === 'indetermine'
          );
        default:
          return true;
      }
    };

    const animauxCorrespondants = animauxActifs.filter(a =>
      animalCorrespondCategorie(a, data.categorie || 'autre')
    );

    const nombrePorcs = data.nombre_porcs || 1;
    if (nombrePorcs > animauxCorrespondants.length) {
      throw new Error(
        `Impossible d'enregistrer ${nombrePorcs} mortalité(s) de ${data.categorie || 'autre'}(s). ` +
          `Il n'y a que ${animauxCorrespondants.length} ${data.categorie || 'autre'}(s) actif(s) disponible(s).`
      );
    }

    const mortalite = await this.create(data);

    if (data.animal_code) {
      try {
        const animal = animauxProjet.find(
          a => a.code === data.animal_code && a.statut?.toLowerCase() === 'actif'
        );

        if (animal) {
          await animalRepo.update(animal.id, {
            statut: 'mort' as const,
            actif: false,
          });
        }
      } catch (error) {
        console.warn(
          `Animal avec le code ${data.animal_code} non trouvé lors de la création de la mortalité`
        );
      }
    } else {
      const animauxAMarquer = animauxCorrespondants.slice(0, nombrePorcs);
      for (const animal of animauxAMarquer) {
        await animalRepo.update(animal.id, {
          statut: 'mort',
          actif: false,
        });
      }
    }

    return mortalite;
  }

  async update(id: string, data: Partial<Mortalite>): Promise<Mortalite> {
    const updateData: Record<string, unknown> = {};

    if (data.nombre_porcs !== undefined) updateData.nombre_porcs = data.nombre_porcs;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.cause !== undefined) updateData.cause = data.cause;
    if (data.categorie !== undefined) updateData.categorie = data.categorie;
    if (data.animal_code !== undefined) updateData.animal_code = data.animal_code;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (Object.keys(updateData).length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Mortalité introuvable');
      }
      return existing;
    }

    return this.executePatch<Mortalite>(`/mortalites/${id}`, updateData);
  }

  async findByProjet(projetId: string): Promise<Mortalite[]> {
    try {
      return this.query<Mortalite>('/mortalites', { projet_id: projetId });
    } catch (error) {
      console.error('Error finding mortalites by projet:', error);
      return [];
    }
  }

  async findByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<Mortalite[]> {
    try {
      const mortalites = await this.findByProjet(projetId);
      return mortalites.filter(m => m.date >= dateDebut && m.date <= dateFin)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error finding mortalites by period:', error);
      return [];
    }
  }

  /**
   * Supprimer une mortalité par ID
   */
  async delete(id: string): Promise<void> {
    await this.deleteById(id);
  }

  async getStats(projetId: string): Promise<{
    total: number;
    parCause: Record<string, number>;
    tauxMortalite: number;
    ageMoyen: number;
  }> {
    try {
      // Utiliser l'endpoint backend si disponible
      const result = await this.queryOne<{
        total: number;
        par_cause: Record<string, number>;
        taux_mortalite: number;
        age_moyen: number;
      }>(`/mortalites/statistiques`, { projet_id: projetId });

      if (result) {
        return {
          total: result.total,
          parCause: result.par_cause || {},
          tauxMortalite: result.taux_mortalite || 0,
          ageMoyen: result.age_moyen || 0,
        };
      }

      // Fallback: calculer côté client
      const mortalites = await this.findByProjet(projetId);
      const total = mortalites.reduce((sum, m) => sum + (m.nombre_porcs || 1), 0);

      const parCause: Record<string, number> = {};
      mortalites.forEach(m => {
        const cause = m.cause || 'inconnue';
        parCause[cause] = (parCause[cause] || 0) + (m.nombre_porcs || 1);
      });

      // Pour le taux de mortalité, il faudrait accéder aux animaux
      const animalRepo = new AnimalRepository();
      const animaux = await animalRepo.findByProjet(projetId);
      const totalAnimaux = animaux.length;
      const tauxMortalite = totalAnimaux > 0 ? (total / totalAnimaux) * 100 : 0;

      return {
        total,
        parCause,
        tauxMortalite,
        ageMoyen: 0, // Non disponible
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        total: 0,
        parCause: {},
        tauxMortalite: 0,
        ageMoyen: 0,
      };
    }
  }

  /**
   * Obtenir les statistiques de mortalité par catégorie
   */
  async getStatistiquesMortalite(projetId: string): Promise<{
    total_morts: number;
    taux_mortalite: number;
    mortalites_par_categorie: { truie: number; verrat: number; porcelet: number; autre: number };
    mortalites_par_mois: Array<{ mois: string; nombre: number }>;
  }> {
    try {
      // Utiliser l'endpoint backend si disponible
      const result = await this.queryOne<{
        total_morts: number;
        taux_mortalite: number;
        mortalites_par_categorie: { truie: number; verrat: number; porcelet: number; autre: number };
        mortalites_par_mois: Array<{ mois: string; nombre: number }>;
      }>(`/mortalites/statistiques`, { projet_id: projetId });

      if (result) {
        return result;
      }

      // Fallback: calculer côté client
      const mortalites = await this.findByProjet(projetId);
      const total_morts = mortalites.reduce((sum, m) => sum + (m.nombre_porcs || 1), 0);

      const mortalites_par_categorie = {
        truie: 0,
        verrat: 0,
        porcelet: 0,
        autre: 0,
      };

      mortalites.forEach(m => {
        const categorie = m.categorie || 'autre';
        const nombre = m.nombre_porcs || 1;
        if (categorie === 'truie') mortalites_par_categorie.truie += nombre;
        else if (categorie === 'verrat') mortalites_par_categorie.verrat += nombre;
        else if (categorie === 'porcelet') mortalites_par_categorie.porcelet += nombre;
        else mortalites_par_categorie.autre += nombre;
      });

      const animalRepo = new AnimalRepository();
      const animaux = await animalRepo.findByProjet(projetId);
      const totalAnimaux = animaux.length;
      const taux_mortalite = totalAnimaux > 0 ? (total_morts / totalAnimaux) * 100 : 0;

      // Grouper par mois (6 derniers mois)
      const mortalites_par_mois: Array<{ mois: string; nombre: number }> = [];
      const sixMoisAgo = new Date();
      sixMoisAgo.setMonth(sixMoisAgo.getMonth() - 6);

      const mortalitesRecentes = mortalites.filter(m => new Date(m.date) >= sixMoisAgo);
      const parMois = new Map<string, number>();

      mortalitesRecentes.forEach(m => {
        const date = new Date(m.date);
        const mois = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        parMois.set(mois, (parMois.get(mois) || 0) + (m.nombre_porcs || 1));
      });

      parMois.forEach((nombre, mois) => {
        mortalites_par_mois.push({ mois, nombre });
      });

      mortalites_par_mois.sort((a, b) => a.mois.localeCompare(b.mois));

      return {
        total_morts,
        taux_mortalite,
        mortalites_par_categorie,
        mortalites_par_mois,
      };
    } catch (error) {
      console.error('Error getting statistiques mortalite:', error);
      return {
        total_morts: 0,
        taux_mortalite: 0,
        mortalites_par_categorie: { truie: 0, verrat: 0, porcelet: 0, autre: 0 },
        mortalites_par_mois: [],
      };
    }
  }
}
