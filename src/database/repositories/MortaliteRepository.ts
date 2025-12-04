/**
 * MortaliteRepository - Gestion des mortalités
 * 
 * Responsabilités:
 * - CRUD des mortalités
 * - Statistiques de mortalité
 * - Suivi des causes
 * - Alertes de mortalité anormale
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Mortalite } from '../../types/mortalite';
import { ProductionAnimal } from '../../types/production';
import uuid from 'react-native-uuid';
import { AnimalRepository } from './AnimalRepository';

export class MortaliteRepository extends BaseRepository<Mortalite> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'mortalites');
  }

  async create(data: Partial<Mortalite>): Promise<Mortalite> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO mortalites (
        id, projet_id, nombre_porcs, date, cause,
        categorie, animal_code, notes, date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.nombre_porcs || 1,
        data.date || now,
        data.cause || null,
        data.categorie || 'autre',
        data.animal_code || null,
        data.notes || null,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la mortalité');
    }
    return created;
  }

  /**
   * Créer une mortalité et mettre à jour automatiquement le statut des animaux concernés
   * Cette méthode inclut la logique de validation et de mise à jour des animaux
   */
  async createWithAnimalUpdate(data: Partial<Mortalite>): Promise<Mortalite> {
    if (!data.projet_id) {
      throw new Error('projet_id est requis');
    }

    const animalRepo = new AnimalRepository(this.db);
    const animauxProjet = await animalRepo.findByProjet(data.projet_id);
    const animauxActifs = animauxProjet.filter((a) => a.statut?.toLowerCase() === 'actif');

    // Fonction helper pour déterminer si un animal correspond à la catégorie
    const animalCorrespondCategorie = (animal: ProductionAnimal, categorie: string): boolean => {
      if (categorie === 'autre') return true; // Catégorie "autre" accepte tous les animaux

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

    // Filtrer les animaux actifs correspondant à la catégorie
    const animauxCorrespondants = animauxActifs.filter((a) =>
      animalCorrespondCategorie(a, data.categorie || 'autre')
    );

    // Validation : vérifier qu'il y a assez d'animaux actifs disponibles
    const nombrePorcs = data.nombre_porcs || 1;
    if (nombrePorcs > animauxCorrespondants.length) {
      throw new Error(
        `Impossible d'enregistrer ${nombrePorcs} mortalité(s) de ${data.categorie || 'autre'}(s). ` +
          `Il n'y a que ${animauxCorrespondants.length} ${data.categorie || 'autre'}(s) actif(s) disponible(s).`
      );
    }

    // Créer la mortalité
    const mortalite = await this.create(data);
    const derniere_modification = new Date().toISOString();

    // Mettre à jour le statut des animaux concernés
    if (data.animal_code) {
      // Cas 1 : Code d'animal spécifique renseigné
      try {
        const animal = animauxProjet.find(
          (a) => a.code === data.animal_code && a.statut?.toLowerCase() === 'actif'
        );

        if (animal) {
          // Changer le statut en "mort"
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
      // Cas 2 : Mortalité générique (sans code spécifique)
      // Mettre à jour automatiquement les N premiers animaux actifs correspondant à la catégorie
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
    const fields: string[] = [];
    const values: any[] = [];

    if (data.nombre_porcs !== undefined) {
      fields.push('nombre_porcs = ?');
      values.push(data.nombre_porcs);
    }
    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date);
    }
    if (data.cause !== undefined) {
      fields.push('cause = ?');
      values.push(data.cause);
    }
    if (data.categorie !== undefined) {
      fields.push('categorie = ?');
      values.push(data.categorie);
    }
    if (data.animal_code !== undefined) {
      fields.push('animal_code = ?');
      values.push(data.animal_code);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    if (fields.length === 0) {
      // Aucun champ à mettre à jour
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Mortalité introuvable');
      }
      return existing;
    }

    values.push(id);
    await this.execute(`UPDATE mortalites SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Mortalité introuvable');
    }
    return updated;
  }

  async findByProjet(projetId: string): Promise<Mortalite[]> {
    return this.query<Mortalite>(
      `SELECT * FROM mortalites 
       WHERE projet_id = ?
       ORDER BY date DESC`,
      [projetId]
    );
  }

  async findByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<Mortalite[]> {
    return this.query<Mortalite>(
      `SELECT * FROM mortalites 
       WHERE projet_id = ? AND date >= ? AND date <= ?
       ORDER BY date DESC`,
      [projetId, dateDebut, dateFin]
    );
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
    const total = await this.count(projetId);

    const parCauseResult = await this.query<{ cause: string; count: number }>(
      `SELECT cause, COUNT(*) as count FROM mortalites WHERE projet_id = ? GROUP BY cause`,
      [projetId]
    );

    const parCause: Record<string, number> = {};
    parCauseResult.forEach((row) => {
      parCause[row.cause] = row.count;
    });

    // Taux de mortalité = (morts / total animaux) * 100
    const totalAnimauxResult = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM production_animaux WHERE projet_id = ?`,
      [projetId]
    );

    const totalAnimaux = totalAnimauxResult?.count || 0;
    const tauxMortalite = totalAnimaux > 0 ? (total / totalAnimaux) * 100 : 0;

    // Note: age_jours n'existe pas dans la table mortalites
    // L'âge moyen n'est pas disponible avec la structure actuelle
    return {
      total,
      parCause,
      tauxMortalite,
      ageMoyen: 0, // Non disponible - la colonne age_jours n'existe pas dans la table
    };
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
    console.log('📊 [MortaliteRepository] Calcul des statistiques pour projet:', projetId);
    
    // Total des morts
    const totalResult = await this.queryOne<{ total: number }>(
      `SELECT SUM(nombre_porcs) as total FROM mortalites WHERE projet_id = ?`,
      [projetId]
    );
    const total_morts = totalResult?.total || 0;
    console.log('💀 Total morts calculé:', total_morts);

    // Par catégorie
    const parCategorieResult = await this.query<{ categorie: string; total: number }>(
      `SELECT categorie, SUM(nombre_porcs) as total 
       FROM mortalites 
       WHERE projet_id = ? 
       GROUP BY categorie`,
      [projetId]
    );

    const mortalites_par_categorie = {
      truie: 0,
      verrat: 0,
      porcelet: 0,
      autre: 0,
    };

    parCategorieResult.forEach((row) => {
      if (row.categorie === 'truie') mortalites_par_categorie.truie = row.total;
      else if (row.categorie === 'verrat') mortalites_par_categorie.verrat = row.total;
      else if (row.categorie === 'porcelet') mortalites_par_categorie.porcelet = row.total;
      else mortalites_par_categorie.autre += row.total;
    });
    console.log('📈 Morts par catégorie:', mortalites_par_categorie);

    // Calculer le taux de mortalité
    // Compter tous les animaux du projet (actifs + morts + vendus + autres)
    const totalAnimauxResult = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM production_animaux WHERE projet_id = ?`,
      [projetId]
    );
    const totalAnimaux = totalAnimauxResult?.count || 0;
    const taux_mortalite = totalAnimaux > 0 ? (total_morts / totalAnimaux) * 100 : 0;
    console.log('📊 Taux de mortalité:', taux_mortalite.toFixed(2), '% (', total_morts, '/', totalAnimaux, ')');

    // Évolution par mois (6 derniers mois)
    const evolutionResult = await this.query<{ mois: string; nombre: number }>(
      `SELECT strftime('%Y-%m', date) as mois, SUM(nombre_porcs) as nombre
       FROM mortalites 
       WHERE projet_id = ? AND date >= date('now', '-6 months')
       GROUP BY strftime('%Y-%m', date)
       ORDER BY mois ASC`,
      [projetId]
    );

    const mortalites_par_mois = evolutionResult.map((row) => ({
      mois: row.mois,
      nombre: row.nombre,
    }));

    return {
      total_morts,
      taux_mortalite,
      mortalites_par_categorie,
      mortalites_par_mois,
    };
  }
}

