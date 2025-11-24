/**
 * PeseeRepository - Gestion des pesées
 * 
 * Responsabilités:
 * - CRUD des pesées
 * - Suivi de croissance
 * - Calcul du GMQ (Gain Moyen Quotidien)
 * - Historique et courbes de croissance
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { ProductionPesee } from '../../types/production';
import uuid from 'react-native-uuid';
import { differenceInDays, parseISO } from 'date-fns';

export class PeseeRepository extends BaseRepository<ProductionPesee> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'production_pesees');
  }

  /**
   * Créer une nouvelle pesée
   */
  async create(data: Partial<ProductionPesee>): Promise<ProductionPesee> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    // Validation des champs obligatoires
    if (!data.projet_id || data.projet_id.trim() === '') {
      throw new Error('Le projet_id est obligatoire');
    }
    if (!data.animal_id || data.animal_id.trim() === '') {
      throw new Error('L\'animal_id est obligatoire');
    }
    if (!data.poids_kg || data.poids_kg <= 0) {
      throw new Error('Le poids doit être supérieur à 0');
    }

    await this.execute(
      `INSERT INTO production_pesees (
        id, projet_id, animal_id, date, poids_kg, commentaire,
        date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        data.animal_id,
        data.date || now,
        data.poids_kg,
        data.commentaire || null,
        now,
      ]
    );

    // Calculer et mettre à jour le GMQ pour cette pesée et les suivantes
    await this.updateGMQForAnimal(data.animal_id);

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la pesée');
    }
    return created;
  }

  /**
   * Mettre à jour une pesée
   */
  async update(id: string, data: Partial<ProductionPesee>): Promise<ProductionPesee> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date);
    }
    if (data.poids_kg !== undefined) {
      fields.push('poids_kg = ?');
      values.push(data.poids_kg);
    }
    if (data.commentaire !== undefined) {
      fields.push('commentaire = ?');
      values.push(data.commentaire);
    }

    if (fields.length === 0) {
      throw new Error('Aucune donnée à mettre à jour');
    }

    values.push(id);

    await this.execute(`UPDATE production_pesees SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Pesée introuvable après mise à jour');
    }

    // Recalculer le GMQ pour cet animal (car date ou poids a pu changer)
    await this.updateGMQForAnimal(updated.animal_id);

    // Recharger la pesée avec le GMQ mis à jour
    const final = await this.findById(id);
    return final || updated;
  }

  /**
   * Récupérer toutes les pesées d'un animal
   */
  async findByAnimal(animalId: string): Promise<ProductionPesee[]> {
    return this.query<ProductionPesee>(
      `SELECT * FROM production_pesees 
       WHERE animal_id = ?
       ORDER BY date ASC`,
      [animalId]
    );
  }

  /**
   * Récupérer la dernière pesée d'un animal
   */
  async findLastByAnimal(animalId: string): Promise<ProductionPesee | null> {
    return this.queryOne<ProductionPesee>(
      `SELECT * FROM production_pesees 
       WHERE animal_id = ?
       ORDER BY date DESC
       LIMIT 1`,
      [animalId]
    );
  }

  /**
   * Récupérer les pesées par période pour un animal
   */
  async findByAnimalAndPeriod(
    animalId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<ProductionPesee[]> {
    return this.query<ProductionPesee>(
      `SELECT * FROM production_pesees 
       WHERE animal_id = ? 
       AND date >= ? 
       AND date <= ?
       ORDER BY date ASC`,
      [animalId, dateDebut, dateFin]
    );
  }

  /**
   * Calculer le GMQ (Gain Moyen Quotidien) pour un animal
   * GMQ = (Poids Final - Poids Initial) × 1000 / Nombre de jours
   */
  async calculateGMQ(animalId: string): Promise<number | null> {
    const pesees = await this.findByAnimal(animalId);

    if (pesees.length < 2) {
      return null;
    }

    const premiere = pesees[0];
    const derniere = pesees[pesees.length - 1];

    const poidsInitial = premiere.poids_kg;
    const poidsFinal = derniere.poids_kg;
    const dateInitiale = parseISO(premiere.date);
    const dateFinale = parseISO(derniere.date);

    const nombreJours = differenceInDays(dateFinale, dateInitiale);

    if (nombreJours === 0) {
      return null;
    }

    // GMQ en grammes par jour
    const gmq = ((poidsFinal - poidsInitial) * 1000) / nombreJours;

    return Math.round(gmq);
  }

  /**
   * Mettre à jour le GMQ pour toutes les pesées d'un animal
   * Calcule le GMQ entre chaque pesée et la précédente
   */
  async updateGMQForAnimal(animalId: string): Promise<void> {
    const pesees = await this.findByAnimal(animalId);

    if (pesees.length < 2) {
      return; // Pas assez de pesées pour calculer un GMQ
    }

    // Parcourir toutes les pesées (sauf la première)
    for (let i = 1; i < pesees.length; i++) {
      const peseeActuelle = pesees[i];
      const peseePrecedente = pesees[i - 1];

      // Calculer le GMQ entre les deux pesées
      const poidsGagne = peseeActuelle.poids_kg - peseePrecedente.poids_kg;
      const dateActuelle = parseISO(peseeActuelle.date);
      const datePrecedente = parseISO(peseePrecedente.date);
      const nombreJours = differenceInDays(dateActuelle, datePrecedente);

      let gmq: number | null = null;
      if (nombreJours > 0) {
        gmq = Math.round((poidsGagne * 1000) / nombreJours); // GMQ en grammes par jour
      }

      // Mettre à jour la pesée avec le GMQ calculé
      await this.execute(
        `UPDATE production_pesees SET gmq = ? WHERE id = ?`,
        [gmq, peseeActuelle.id]
      );
    }
  }

  /**
   * Calculer le GMQ entre deux pesées spécifiques
   */
  async calculateGMQBetween(
    peseeInitialeId: string,
    peseeFinaleId: string
  ): Promise<number | null> {
    const peseeInitiale = await this.findById(peseeInitialeId);
    const peseeFinale = await this.findById(peseeFinaleId);

    if (!peseeInitiale || !peseeFinale) {
      return null;
    }

    const poidsInitial = peseeInitiale.poids_kg;
    const poidsFinal = peseeFinale.poids_kg;
    const dateInitiale = parseISO(peseeInitiale.date);
    const dateFinale = parseISO(peseeFinale.date);

    const nombreJours = differenceInDays(dateFinale, dateInitiale);

    if (nombreJours === 0) {
      return null;
    }

    const gmq = ((poidsFinal - poidsInitial) * 1000) / nombreJours;

    return Math.round(gmq);
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
    const pesees = await this.findByAnimal(animalId);

    return pesees.map((pesee, index) => {
      let gmq: number | null = null;

      if (index > 0) {
        const peseePrecedente = pesees[index - 1];
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
    const stats = await this.queryOne<any>(
      `SELECT 
        COUNT(*) as nombrePesees,
        AVG(p.poids_kg) as poidsMoyen,
        MIN(p.poids_kg) as poidsMin,
        MAX(p.poids_kg) as poidsMax
       FROM production_pesees p
       INNER JOIN production_animaux a ON p.animal_id = a.id
       WHERE a.projet_id = ?`,
      [projetId]
    );

    return {
      nombrePesees: stats?.nombrePesees || 0,
      poidsMoyen: stats?.poidsMoyen || 0,
      poidsMin: stats?.poidsMin || 0,
      poidsMax: stats?.poidsMax || 0,
    };
  }

  /**
   * Récupérer les pesées récentes d'un projet
   */
  async findRecentsByProjet(projetId: string, limit: number = 10): Promise<ProductionPesee[]> {
    return this.query<ProductionPesee>(
      `SELECT p.* FROM production_pesees p
       INNER JOIN production_animaux a ON p.animal_id = a.id
       WHERE a.projet_id = ?
       ORDER BY p.date DESC
       LIMIT ?`,
      [projetId, limit]
    );
  }

  /**
   * Supprimer toutes les pesées d'un animal
   */
  async deleteByAnimal(animalId: string): Promise<void> {
    await this.execute(`DELETE FROM production_pesees WHERE animal_id = ?`, [animalId]);
  }

  /**
   * Compter les pesées pour un animal
   */
  async countByAnimal(animalId: string): Promise<number> {
    const result = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM production_pesees WHERE animal_id = ?`,
      [animalId]
    );
    return result?.count || 0;
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
   * (dernière pesée + estimation basée sur GMQ)
   */
  async getPoidsActuelEstime(animalId: string): Promise<number | null> {
    const dernierePesee = await this.findLastByAnimal(animalId);
    
    if (!dernierePesee) {
      return null;
    }

    // Si la pesée date de moins de 7 jours, on retourne le poids direct
    const joursDepuisPesee = differenceInDays(new Date(), parseISO(dernierePesee.date));
    
    if (joursDepuisPesee <= 7) {
      return dernierePesee.poids_kg;
    }

    // Sinon, on estime basé sur le GMQ
    const gmq = await this.calculateGMQ(animalId);
    
    if (!gmq) {
      return dernierePesee.poids_kg;
    }

    // Estimation: poids dernier pesée + (GMQ × jours écoulés)
    const poidsEstime = dernierePesee.poids_kg + (gmq * joursDepuisPesee) / 1000;

    return Math.round(poidsEstime * 10) / 10; // Arrondir à 1 décimale
  }
}

