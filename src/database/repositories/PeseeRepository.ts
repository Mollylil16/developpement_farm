/**
 * PeseeRepository - Gestion des pesées
 *
 * Responsabilités:
 * - CRUD des pesées
 * - Suivi de croissance
 * - Calcul du GMQ (Gain Moyen Quotidien)
 * - Historique et courbes de croissance
 * 
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { ProductionPesee } from '../../types/production';
import { AnimalRepository } from './AnimalRepository';
import { getCategoriePoids } from '../../utils/animalUtils';
import { differenceInDays, parseISO } from 'date-fns';

export class PeseeRepository extends BaseRepository<ProductionPesee> {
  constructor() {
    super('production_pesees', '/production/pesees');
  }

  /**
   * Créer une nouvelle pesée
   */
  async create(data: Partial<ProductionPesee>): Promise<ProductionPesee> {
    // Validation des champs obligatoires
    if (!data.projet_id || data.projet_id.trim() === '') {
      throw new Error('Le projet_id est obligatoire');
    }
    if (!data.animal_id || data.animal_id.trim() === '') {
      throw new Error("L'animal_id est obligatoire");
    }
    if (!data.poids_kg || data.poids_kg <= 0) {
      throw new Error('Le poids doit être supérieur à 0');
    }

    const peseeData = {
      projet_id: data.projet_id,
      animal_id: data.animal_id,
      date: data.date || new Date().toISOString(),
      poids_kg: data.poids_kg,
      commentaire: data.commentaire || null,
    };

    const created = await this.executePost<ProductionPesee>('/production/pesees', peseeData);

    // Mettre à jour la catégorie de poids de l'animal
    await this.updateCategoriePoidsAnimal(data.animal_id, data.poids_kg);

    return created;
  }

  /**
   * Mettre à jour une pesée
   */
  async update(id: string, data: Partial<ProductionPesee>): Promise<ProductionPesee> {
    const updateData: Record<string, unknown> = {};

    if (data.date !== undefined) updateData.date = data.date;
    if (data.poids_kg !== undefined) updateData.poids_kg = data.poids_kg;
    if (data.commentaire !== undefined) updateData.commentaire = data.commentaire;

    if (Object.keys(updateData).length === 0) {
      throw new Error('Aucune donnée à mettre à jour');
    }

    const updated = await this.executePatch<ProductionPesee>(`/production/pesees/${id}`, updateData);

    // Mettre à jour la catégorie de poids si le poids a changé
    if (data.poids_kg !== undefined && updated) {
      await this.updateCategoriePoidsAnimal(updated.animal_id, data.poids_kg);
    }

    return updated;
  }

  /**
   * Récupérer toutes les pesées d'un animal
   */
  async findByAnimal(animalId: string): Promise<ProductionPesee[]> {
    try {
      const pesees = await this.query<ProductionPesee>('/production/pesees', {
        animal_id: animalId,
      });
      return pesees || [];
    } catch (error) {
      console.error('Error finding pesees by animal:', error);
      return [];
    }
  }

  /**
   * Récupérer la dernière pesée d'un animal
   */
  async findLastByAnimal(animalId: string): Promise<ProductionPesee | null> {
    try {
      const pesees = await this.findByAnimal(animalId);
      if (pesees.length === 0) return null;
      
      // Trier par date décroissante
      pesees.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return pesees[0];
    } catch (error) {
      console.error('Error finding last pesee by animal:', error);
      return null;
    }
  }

  /**
   * Récupérer la dernière pesée d'un animal avant une date donnée
   */
  async findLastBeforeDate(animalId: string, date: string): Promise<ProductionPesee | null> {
    try {
      const pesees = await this.findByAnimal(animalId);
      const filtered = pesees.filter(p => p.date <= date);
      if (filtered.length === 0) return null;
      
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return filtered[0];
    } catch (error) {
      console.error('Error finding last pesee before date:', error);
      return null;
    }
  }

  /**
   * Récupérer les pesées par période pour un animal
   */
  async findByAnimalAndPeriod(
    animalId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<ProductionPesee[]> {
    try {
      const pesees = await this.findByAnimal(animalId);
      return pesees.filter(p => p.date >= dateDebut && p.date <= dateFin)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error finding pesees by period:', error);
      return [];
    }
  }

  /**
   * Calculer le GMQ (Gain Moyen Quotidien) pour un animal
   */
  async calculateGMQ(animalId: string): Promise<number | null> {
    try {
      // Utiliser l'endpoint backend si disponible
      const result = await this.queryOne<{ gmq: number }>(`/production/animaux/${animalId}/gmq`);
      if (result?.gmq !== undefined) {
        return result.gmq;
      }

      // Fallback: calculer côté client
      const pesees = await this.findByAnimal(animalId);
      if (pesees.length < 2) return null;

      const sorted = pesees.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const premiere = sorted[0];
      const derniere = sorted[sorted.length - 1];

      const poidsInitial = premiere.poids_kg;
      const poidsFinal = derniere.poids_kg;
      const dateInitiale = parseISO(premiere.date);
      const dateFinale = parseISO(derniere.date);
      const nombreJours = differenceInDays(dateFinale, dateInitiale);

      if (nombreJours === 0) return null;

      const gmq = ((poidsFinal - poidsInitial) * 1000) / nombreJours;
      return Math.round(gmq);
    } catch (error) {
      console.error('Error calculating GMQ:', error);
      return null;
    }
  }

  /**
   * Mettre à jour le GMQ pour toutes les pesées d'un animal
   * Note: Le backend devrait gérer cela automatiquement
   */
  async updateGMQForAnimal(animalId: string): Promise<void> {
    // Le backend devrait recalculer automatiquement le GMQ
    // Cette méthode est maintenue pour compatibilité
    console.log('GMQ update should be handled by backend');
  }

  /**
   * Calculer le GMQ entre deux pesées spécifiques
   */
  async calculateGMQBetween(
    peseeInitialeId: string,
    peseeFinaleId: string
  ): Promise<number | null> {
    try {
      const peseeInitiale = await this.findById(peseeInitialeId);
      const peseeFinale = await this.findById(peseeFinaleId);

      if (!peseeInitiale || !peseeFinale) return null;

      const poidsInitial = peseeInitiale.poids_kg;
      const poidsFinal = peseeFinale.poids_kg;
      const dateInitiale = parseISO(peseeInitiale.date);
      const dateFinale = parseISO(peseeFinale.date);
      const nombreJours = differenceInDays(dateFinale, dateInitiale);

      if (nombreJours === 0) return null;

      const gmq = ((poidsFinal - poidsInitial) * 1000) / nombreJours;
      return Math.round(gmq);
    } catch (error) {
      console.error('Error calculating GMQ between:', error);
      return null;
    }
  }

  /**
   * Obtenir l'évolution de poids d'un animal
   */
  async getEvolutionPoids(animalId: string): Promise<
    Array<{
      date: string;
      poids_kg: number;
      gmq: number | null;
    }>
  > {
    try {
      const pesees = await this.findByAnimal(animalId);
      const sorted = pesees.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return sorted.map((pesee, index) => {
        let gmq: number | null = null;

        if (index > 0) {
          const peseePrecedente = sorted[index - 1];
          const poidsGagne = pesee.poids_kg - peseePrecedente.poids_kg;
          const jours = differenceInDays(parseISO(pesee.date), parseISO(peseePrecedente.date));

          if (jours > 0) {
            gmq = Math.round((poidsGagne * 1000) / jours);
          }
        }

        return {
          date: pesee.date,
          poids_kg: pesee.poids_kg,
          gmq,
        };
      });
    } catch (error) {
      console.error('Error getting evolution poids:', error);
      return [];
    }
  }

  /**
   * Statistiques globales des pesées pour un projet
   */
  async getStatsProjet(projetId: string): Promise<{
    nombrePesees: number;
    poidsMoyen: number;
    poidsMin: number;
    poidsMax: number;
  }> {
    try {
      const pesees = await this.query<ProductionPesee>('/production/pesees', {
        projet_id: projetId,
      });

      if (pesees.length === 0) {
        return {
          nombrePesees: 0,
          poidsMoyen: 0,
          poidsMin: 0,
          poidsMax: 0,
        };
      }

      const poids = pesees.map(p => p.poids_kg);
      const poidsMoyen = poids.reduce((a, b) => a + b, 0) / poids.length;
      const poidsMin = Math.min(...poids);
      const poidsMax = Math.max(...poids);

      return {
        nombrePesees: pesees.length,
        poidsMoyen: Math.round(poidsMoyen * 10) / 10,
        poidsMin,
        poidsMax,
      };
    } catch (error) {
      console.error('Error getting stats projet:', error);
      return {
        nombrePesees: 0,
        poidsMoyen: 0,
        poidsMin: 0,
        poidsMax: 0,
      };
    }
  }

  /**
   * Récupérer les pesées récentes d'un projet
   */
  async findRecentsByProjet(projetId: string, limit: number = 10): Promise<ProductionPesee[]> {
    try {
      const pesees = await this.query<ProductionPesee>('/production/pesees', {
        projet_id: projetId,
        limit,
      });
      
      return pesees
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding recent pesees:', error);
      return [];
    }
  }

  /**
   * Supprimer une pesée par ID
   */
  async delete(id: string): Promise<void> {
    await this.deleteById(id);
  }

  /**
   * Supprimer toutes les pesées d'un animal
   */
  async deleteByAnimal(animalId: string): Promise<void> {
    try {
      const pesees = await this.findByAnimal(animalId);
      await Promise.all(pesees.map(p => this.deleteById(p.id)));
    } catch (error) {
      console.error('Error deleting pesees by animal:', error);
      throw error;
    }
  }

  /**
   * Compter les pesées pour un animal
   */
  async countByAnimal(animalId: string): Promise<number> {
    try {
      const pesees = await this.findByAnimal(animalId);
      return pesees.length;
    } catch (error) {
      console.error('Error counting pesees:', error);
      return 0;
    }
  }

  /**
   * Vérifier si un animal a des pesées
   */
  async animalHasPesees(animalId: string): Promise<boolean> {
    const count = await this.countByAnimal(animalId);
    return count > 0;
  }

  /**
   * Récupérer le poids actuel estimé d'un animal
   */
  async getPoidsActuelEstime(animalId: string): Promise<number | null> {
    try {
      // Utiliser l'endpoint backend si disponible
      const result = await this.queryOne<{ poids_estime: number }>(
        `/production/animaux/${animalId}/poids-estime`
      );
      if (result?.poids_estime !== undefined) {
        return result.poids_estime;
      }

      // Fallback: calculer côté client
      const dernierePesee = await this.findLastByAnimal(animalId);
      if (!dernierePesee) return null;

      const joursDepuisPesee = differenceInDays(new Date(), parseISO(dernierePesee.date));
      if (joursDepuisPesee <= 7) {
        return dernierePesee.poids_kg;
      }

      const gmq = await this.calculateGMQ(animalId);
      if (!gmq) return dernierePesee.poids_kg;

      const poidsEstime = dernierePesee.poids_kg + (gmq * joursDepuisPesee) / 1000;
      return Math.round(poidsEstime * 10) / 10;
    } catch (error) {
      console.error('Error getting poids estime:', error);
      return null;
    }
  }

  /**
   * Met à jour la catégorie de poids d'un animal selon son poids actuel
   */
  async updateCategoriePoidsAnimal(animalId: string, poidsKg: number): Promise<void> {
    try {
      const animalRepo = new AnimalRepository();
      const animal = await animalRepo.findById(animalId);

      if (!animal) return;

      // Ne pas mettre à jour la catégorie pour les reproducteurs
      if (animal.reproducteur) return;

      const nouvelleCategorie = getCategoriePoids(poidsKg);

      if (animal.categorie_poids !== nouvelleCategorie) {
        await animalRepo.update(animalId, { categorie_poids: nouvelleCategorie });

        // Si l'animal passe de porcelet à croissance, mettre à jour son code
        if (animal.categorie_poids === 'porcelet' && nouvelleCategorie === 'croissance') {
          const nouveauCode = await this.generateCodeCroissance(animal.projet_id);
          await animalRepo.update(animalId, { code: nouveauCode });
        }
      }
    } catch (error) {
      console.error('Error updating categorie poids:', error);
    }
  }

  /**
   * Génère un code unique pour un porc en croissance (préfixe "C")
   */
  private async generateCodeCroissance(projetId: string): Promise<string> {
    try {
      const animalRepo = new AnimalRepository();
      const animauxProjet = await animalRepo.findByProjet(projetId);

      let maxNum = 0;
      animauxProjet.forEach((animal) => {
        const codeUpper = animal.code.toUpperCase();
        if (codeUpper.startsWith('C')) {
          const num = parseInt(codeUpper.substring(1));
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });

      const nouveauNum = maxNum + 1;
      return `C${String(nouveauNum).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating code croissance:', error);
      return `C${Date.now()}`;
    }
  }
}
