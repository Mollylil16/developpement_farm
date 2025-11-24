/**
 * VaccinationRepository - Gestion des vaccinations
 * 
 * Responsabilités:
 * - CRUD des vaccinations
 * - Suivi des calendriers vaccinaux
 * - Rappels de vaccination
 * - Statistiques de couverture vaccinale
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Vaccination } from '../../types/veterinaire';
import uuid from 'react-native-uuid';

export class VaccinationRepository extends BaseRepository<Vaccination> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'vaccinations');
  }

  /**
   * Créer une nouvelle vaccination
   */
  async create(data: Partial<Vaccination>): Promise<Vaccination> {
    const id = uuid.v4().toString();
    const now = new Date().toISOString();

    // Utiliser date de rappel si fournie
    const dateRappel = data.date_rappel || null;

    await this.execute(
      `INSERT INTO vaccinations (
        id, projet_id, animal_ids, vaccin, nom_vaccin,
        date_vaccination, numero_lot_vaccin, veterinaire,
        date_rappel, notes,
        type_prophylaxie, produit_administre, dosage, unite_dosage,
        cout, statut, raison_traitement,
        date_creation, derniere_modification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.projet_id,
        JSON.stringify(data.animal_ids || []),
        data.vaccin || data.type_vaccin || null,
        data.nom_vaccin || null,
        data.date_vaccination || data.date_administration || now,
        data.numero_lot_vaccin || data.lot_numero || null,
        data.veterinaire || data.veterinaire_id || null,
        dateRappel,
        data.notes || null,
        data.type_prophylaxie || 'vitamine',
        data.produit_administre || null,
        data.dosage || null,
        data.unite_dosage || 'ml',
        data.cout || null,
        data.statut || 'effectue',
        data.raison_traitement || 'suivi_normal',
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer la vaccination');
    }
    return created;
  }

  /**
   * Mettre à jour une vaccination
   */
  async update(id: string, data: Partial<Vaccination>): Promise<Vaccination> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.animal_ids !== undefined) {
      fields.push('animal_ids = ?');
      values.push(JSON.stringify(data.animal_ids));
    }
    if (data.vaccin !== undefined || data.type_vaccin !== undefined) {
      fields.push('vaccin = ?');
      values.push(data.vaccin || data.type_vaccin);
    }
    if (data.nom_vaccin !== undefined) {
      fields.push('nom_vaccin = ?');
      values.push(data.nom_vaccin);
    }
    if (data.date_vaccination !== undefined || data.date_administration !== undefined) {
      fields.push('date_vaccination = ?');
      values.push(data.date_vaccination || data.date_administration);
    }
    if (data.numero_lot_vaccin !== undefined || data.lot_numero !== undefined) {
      fields.push('numero_lot_vaccin = ?');
      values.push(data.numero_lot_vaccin || data.lot_numero);
    }
    if (data.veterinaire !== undefined || data.veterinaire_id !== undefined) {
      fields.push('veterinaire = ?');
      values.push(data.veterinaire || data.veterinaire_id);
    }
    if (data.date_rappel !== undefined) {
      fields.push('date_rappel = ?');
      values.push(data.date_rappel);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }
    if (data.type_prophylaxie !== undefined) {
      fields.push('type_prophylaxie = ?');
      values.push(data.type_prophylaxie);
    }
    if (data.produit_administre !== undefined) {
      fields.push('produit_administre = ?');
      values.push(data.produit_administre);
    }
    if (data.dosage !== undefined) {
      fields.push('dosage = ?');
      values.push(data.dosage);
    }
    if (data.unite_dosage !== undefined) {
      fields.push('unite_dosage = ?');
      values.push(data.unite_dosage);
    }
    if (data.cout !== undefined) {
      fields.push('cout = ?');
      values.push(data.cout);
    }
    if (data.statut !== undefined) {
      fields.push('statut = ?');
      values.push(data.statut);
    }
    if (data.raison_traitement !== undefined) {
      fields.push('raison_traitement = ?');
      values.push(data.raison_traitement);
    }

    fields.push('derniere_modification = ?');
    values.push(now);
    values.push(id);

    await this.execute(
      `UPDATE vaccinations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Vaccination introuvable après mise à jour');
    }
    return updated;
  }

  /**
   * Récupérer les vaccinations d'un projet
   */
  async findByProjet(projetId: string): Promise<Vaccination[]> {
    return this.query<Vaccination>(
      `SELECT * FROM vaccinations 
       WHERE projet_id = ?
       ORDER BY date_vaccination DESC`,
      [projetId]
    );
  }

  /**
   * Récupérer les vaccinations d'un animal
   */
  async findByAnimal(animalId: string): Promise<Vaccination[]> {
    const allVaccinations = await this.query<Vaccination>(
      `SELECT * FROM vaccinations 
       ORDER BY date_administration DESC`
    );

    // Filtrer côté application car animal_ids est JSON
    return allVaccinations.filter((v) => {
      try {
        const animalIds = typeof v.animal_ids === 'string' ? JSON.parse(v.animal_ids) : v.animal_ids;
        return Array.isArray(animalIds) && animalIds.includes(animalId);
      } catch {
        return false;
      }
    });
  }

  /**
   * Récupérer les vaccinations par type
   */
  async findByType(
    projetId: string,
    typeVaccin: string
  ): Promise<Vaccination[]> {
    return this.query<Vaccination>(
      `SELECT * FROM vaccinations 
       WHERE projet_id = ? AND type_vaccin = ?
       ORDER BY date_vaccination DESC`,
      [projetId, typeVaccin]
    );
  }

  /**
   * Récupérer les vaccinations nécessitant un rappel
   */
  async findRappelsDus(projetId: string, joursAvance: number = 7): Promise<Vaccination[]> {
    const dateAujourdhui = new Date().toISOString();
    const dateLimite = addDays(new Date(), joursAvance).toISOString();

    return this.query<Vaccination>(
      `SELECT * FROM vaccinations 
       WHERE projet_id = ? 
       AND date_rappel IS NOT NULL
       AND date_rappel >= ?
       AND date_rappel <= ?
       ORDER BY date_rappel ASC`,
      [projetId, dateAujourdhui, dateLimite]
    );
  }

  /**
   * Récupérer les vaccinations par période
   */
  async findByPeriod(
    projetId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<Vaccination[]> {
    return this.query<Vaccination>(
      `SELECT * FROM vaccinations 
       WHERE projet_id = ? 
       AND date_vaccination >= ? 
       AND date_vaccination <= ?
       ORDER BY date_vaccination DESC`,
      [projetId, dateDebut, dateFin]
    );
  }

  /**
   * Statistiques des vaccinations
   */
  async getStats(projetId: string): Promise<{
    total: number;
    parType: Record<string, number>;
    dernierMois: number;
    rappelsDus: number;
  }> {
    const total = await this.count(projetId);
    
    // Par type
    const parTypeResult = await this.query<{ type_vaccin: string; count: number }>(
      `SELECT type_vaccin, COUNT(*) as count 
       FROM vaccinations 
       WHERE projet_id = ?
       GROUP BY type_vaccin`,
      [projetId]
    );

    const parType: Record<string, number> = {};
    parTypeResult.forEach((row) => {
      parType[row.type_vaccin] = row.count;
    });

    // Dernier mois
    const dateDebut = new Date();
    dateDebut.setMonth(dateDebut.getMonth() - 1);
    const dernierMoisResult = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM vaccinations 
       WHERE projet_id = ? AND date_vaccination >= ?`,
      [projetId, dateDebut.toISOString()]
    );

    // Rappels dus
    const rappelsDusResult = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM vaccinations 
       WHERE projet_id = ? 
       AND date_rappel IS NOT NULL
       AND date_rappel <= ?`,
      [projetId, new Date().toISOString()]
    );

    return {
      total,
      parType,
      dernierMois: dernierMoisResult?.count || 0,
      rappelsDus: rappelsDusResult?.count || 0,
    };
  }

  /**
   * Vérifier la couverture vaccinale d'un projet
   */
  async getCouvertureVaccinale(projetId: string): Promise<{
    nombreAnimauxVaccines: number;
    nombreAnimauxTotal: number;
    tauxCouverture: number;
  }> {
    // Récupérer tous les IDs d'animaux vaccinés
    const vaccinations = await this.findByProjet(projetId);
    const animauxVaccinesSet = new Set<string>();

    vaccinations.forEach((v) => {
      try {
        const animalIds = typeof v.animal_ids === 'string' ? JSON.parse(v.animal_ids) : v.animal_ids;
        if (Array.isArray(animalIds)) {
          animalIds.forEach((id) => animauxVaccinesSet.add(id));
        }
      } catch {
        // Ignorer les erreurs de parsing
      }
    });

    const nombreAnimauxVaccines = animauxVaccinesSet.size;

    // Compter le nombre total d'animaux actifs
    const totalResult = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM production_animaux 
       WHERE projet_id = ? AND statut = 'actif'`,
      [projetId]
    );

    const nombreAnimauxTotal = totalResult?.count || 0;
    const tauxCouverture =
      nombreAnimauxTotal > 0 ? (nombreAnimauxVaccines / nombreAnimauxTotal) * 100 : 0;

    return {
      nombreAnimauxVaccines,
      nombreAnimauxTotal,
      tauxCouverture,
    };
  }

  /**
   * Marquer un rappel comme effectué (créer nouvelle vaccination)
   */
  async effectuerRappel(vaccinationOriginaleId: string): Promise<Vaccination> {
    const originale = await this.findById(vaccinationOriginaleId);
    
    if (!originale) {
      throw new Error('Vaccination originale introuvable');
    }

    // Créer une nouvelle vaccination basée sur l'originale
    return this.create({
      projet_id: originale.projet_id,
      animal_ids: typeof originale.animal_ids === 'string' ? JSON.parse(originale.animal_ids) : originale.animal_ids,
      vaccin: originale.vaccin || originale.type_vaccin,
      nom_vaccin: originale.nom_vaccin,
      date_vaccination: new Date().toISOString(),
      numero_lot_vaccin: undefined, // Nouveau lot
      veterinaire: originale.veterinaire || originale.veterinaire_id,
      notes: `Rappel de vaccination ${originale.id}`,
    });
  }
}

