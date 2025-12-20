import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCalendrierVaccinationDto } from './dto/create-calendrier-vaccination.dto';
import { UpdateCalendrierVaccinationDto } from './dto/update-calendrier-vaccination.dto';
import { CreateVaccinationDto } from './dto/create-vaccination.dto';
import { UpdateVaccinationDto } from './dto/update-vaccination.dto';
import { CreateMaladieDto } from './dto/create-maladie.dto';
import { UpdateMaladieDto } from './dto/update-maladie.dto';
import { CreateTraitementDto } from './dto/create-traitement.dto';
import { UpdateTraitementDto } from './dto/update-traitement.dto';
import { CreateVisiteVeterinaireDto } from './dto/create-visite-veterinaire.dto';
import { UpdateVisiteVeterinaireDto } from './dto/update-visite-veterinaire.dto';

@Injectable()
export class SanteService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Génère un ID comme le frontend : calendrier_${Date.now()}_${random}
   */
  private generateCalendrierId(): string {
    return `calendrier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID comme le frontend : vaccination_${Date.now()}_${random}
   */
  private generateVaccinationId(): string {
    return `vaccination_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID comme le frontend : maladie_${Date.now()}_${random}
   */
  private generateMaladieId(): string {
    return `maladie_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID comme le frontend : traitement_${Date.now()}_${random}
   */
  private generateTraitementId(): string {
    return `traitement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID comme le frontend : visite_${Date.now()}_${random}
   */
  private generateVisiteId(): string {
    return `visite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID comme le frontend : rappel_${Date.now()}_${random}
   */
  private generateRappelId(): string {
    return `rappel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur
   */
  private async checkProjetOwnership(projetId: string, userId: string): Promise<void> {
    const result = await this.databaseService.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [projetId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Projet introuvable');
    }
    if (result.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  /**
   * Parse JSON array string ou retourne undefined
   */
  private parseJsonArray(value: any): string[] | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        // Si ce n'est pas du JSON, traiter comme une chaîne séparée par virgules
        return value
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
      }
    }
    return undefined;
  }

  /**
   * Stringify array en JSON string pour stockage
   */
  private stringifyArray(value: string[] | undefined): string | null {
    if (!value || !Array.isArray(value) || value.length === 0) return null;
    return JSON.stringify(value);
  }

  // ==================== CALENDRIER VACCINATIONS ====================

  private mapRowToCalendrierVaccination(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      vaccin: row.vaccin,
      nom_vaccin: row.nom_vaccin || undefined,
      categorie: row.categorie,
      age_jours: row.age_jours || undefined,
      date_planifiee: row.date_planifiee || undefined,
      frequence_jours: row.frequence_jours || undefined,
      obligatoire: row.obligatoire || false,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
    };
  }

  async createCalendrierVaccination(
    createCalendrierVaccinationDto: CreateCalendrierVaccinationDto,
    userId: string
  ) {
    await this.checkProjetOwnership(createCalendrierVaccinationDto.projet_id, userId);

    const id = this.generateCalendrierId();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO calendrier_vaccinations (
        id, projet_id, vaccin, nom_vaccin, categorie, age_jours,
        date_planifiee, frequence_jours, obligatoire, notes, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id,
        createCalendrierVaccinationDto.projet_id,
        createCalendrierVaccinationDto.vaccin,
        createCalendrierVaccinationDto.nom_vaccin || null,
        createCalendrierVaccinationDto.categorie,
        createCalendrierVaccinationDto.age_jours || null,
        createCalendrierVaccinationDto.date_planifiee || null,
        createCalendrierVaccinationDto.frequence_jours || null,
        createCalendrierVaccinationDto.obligatoire || false,
        createCalendrierVaccinationDto.notes || null,
        now,
      ]
    );

    return this.mapRowToCalendrierVaccination(result.rows[0]);
  }

  async findAllCalendrierVaccinations(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM calendrier_vaccinations WHERE projet_id = $1 ORDER BY age_jours ASC, categorie ASC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToCalendrierVaccination(row));
  }

  async findOneCalendrierVaccination(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT c.* FROM calendrier_vaccinations c
       JOIN projets p ON c.projet_id = p.id
       WHERE c.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToCalendrierVaccination(result.rows[0]) : null;
  }

  async updateCalendrierVaccination(
    id: string,
    updateCalendrierVaccinationDto: UpdateCalendrierVaccinationDto,
    userId: string
  ) {
    const existing = await this.findOneCalendrierVaccination(id, userId);
    if (!existing) {
      throw new NotFoundException('Calendrier de vaccination introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateCalendrierVaccinationDto.vaccin !== undefined) {
      fields.push(`vaccin = $${paramIndex}`);
      values.push(updateCalendrierVaccinationDto.vaccin);
      paramIndex++;
    }
    if (updateCalendrierVaccinationDto.nom_vaccin !== undefined) {
      fields.push(`nom_vaccin = $${paramIndex}`);
      values.push(updateCalendrierVaccinationDto.nom_vaccin || null);
      paramIndex++;
    }
    if (updateCalendrierVaccinationDto.categorie !== undefined) {
      fields.push(`categorie = $${paramIndex}`);
      values.push(updateCalendrierVaccinationDto.categorie);
      paramIndex++;
    }
    if (updateCalendrierVaccinationDto.age_jours !== undefined) {
      fields.push(`age_jours = $${paramIndex}`);
      values.push(updateCalendrierVaccinationDto.age_jours || null);
      paramIndex++;
    }
    if (updateCalendrierVaccinationDto.date_planifiee !== undefined) {
      fields.push(`date_planifiee = $${paramIndex}`);
      values.push(updateCalendrierVaccinationDto.date_planifiee || null);
      paramIndex++;
    }
    if (updateCalendrierVaccinationDto.frequence_jours !== undefined) {
      fields.push(`frequence_jours = $${paramIndex}`);
      values.push(updateCalendrierVaccinationDto.frequence_jours || null);
      paramIndex++;
    }
    if (updateCalendrierVaccinationDto.obligatoire !== undefined) {
      fields.push(`obligatoire = $${paramIndex}`);
      values.push(updateCalendrierVaccinationDto.obligatoire);
      paramIndex++;
    }
    if (updateCalendrierVaccinationDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateCalendrierVaccinationDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    values.push(id);
    const query = `UPDATE calendrier_vaccinations SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToCalendrierVaccination(result.rows[0]);
  }

  async deleteCalendrierVaccination(id: string, userId: string) {
    const existing = await this.findOneCalendrierVaccination(id, userId);
    if (!existing) {
      throw new NotFoundException('Calendrier de vaccination introuvable');
    }

    await this.databaseService.query('DELETE FROM calendrier_vaccinations WHERE id = $1', [id]);
    return { id };
  }

  // ==================== VACCINATIONS ====================

  private mapRowToVaccination(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      calendrier_id: row.calendrier_id || undefined,
      animal_id: row.animal_id || undefined,
      animal_ids: this.parseJsonArray(row.animal_ids),
      lot_id: row.lot_id || undefined,
      vaccin: row.vaccin || undefined,
      nom_vaccin: row.nom_vaccin || undefined,
      type_prophylaxie: row.type_prophylaxie || 'vitamine',
      produit_administre: row.produit_administre || undefined,
      photo_flacon: row.photo_flacon || undefined,
      date_vaccination: row.date_vaccination,
      date_rappel: row.date_rappel || undefined,
      numero_lot_vaccin: row.numero_lot_vaccin || undefined,
      dosage: row.dosage || undefined,
      unite_dosage: row.unite_dosage || 'ml',
      raison_traitement: row.raison_traitement || 'suivi_normal',
      raison_autre: row.raison_autre || undefined,
      veterinaire: row.veterinaire || undefined,
      cout: row.cout ? parseFloat(row.cout) : undefined,
      statut: row.statut || 'effectue',
      effets_secondaires: row.effets_secondaires || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  async createVaccination(createVaccinationDto: CreateVaccinationDto, userId: string) {
    await this.checkProjetOwnership(createVaccinationDto.projet_id, userId);

    const id = this.generateVaccinationId();
    const now = new Date().toISOString();
    const statut = createVaccinationDto.statut || 'effectue';

    // Si animal_ids est fourni, utiliser le premier comme animal_id pour compatibilité
    const animalId =
      createVaccinationDto.animal_ids && createVaccinationDto.animal_ids.length > 0
        ? createVaccinationDto.animal_ids[0]
        : null;

    const result = await this.databaseService.query(
      `INSERT INTO vaccinations (
        id, projet_id, calendrier_id, animal_id, animal_ids, lot_id, vaccin, nom_vaccin,
        type_prophylaxie, produit_administre, photo_flacon, date_vaccination, date_rappel,
        numero_lot_vaccin, dosage, unite_dosage, raison_traitement, raison_autre,
        veterinaire, cout, statut, effets_secondaires, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *`,
      [
        id,
        createVaccinationDto.projet_id,
        createVaccinationDto.calendrier_id || null,
        animalId,
        this.stringifyArray(createVaccinationDto.animal_ids),
        createVaccinationDto.lot_id || null,
        createVaccinationDto.vaccin || null,
        createVaccinationDto.nom_vaccin || null,
        createVaccinationDto.type_prophylaxie,
        createVaccinationDto.produit_administre,
        createVaccinationDto.photo_flacon || null,
        createVaccinationDto.date_vaccination,
        createVaccinationDto.date_rappel || null,
        createVaccinationDto.numero_lot_vaccin || null,
        createVaccinationDto.dosage,
        createVaccinationDto.unite_dosage || 'ml',
        createVaccinationDto.raison_traitement,
        createVaccinationDto.raison_autre || null,
        createVaccinationDto.veterinaire || null,
        createVaccinationDto.cout || null,
        statut,
        createVaccinationDto.effets_secondaires || null,
        createVaccinationDto.notes || null,
        now,
        now,
      ]
    );

    return this.mapRowToVaccination(result.rows[0]);
  }

  async findAllVaccinations(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM vaccinations WHERE projet_id = $1 ORDER BY date_vaccination DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToVaccination(row));
  }

  async findVaccinationsEnRetard(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const now = new Date().toISOString();
    const result = await this.databaseService.query(
      `SELECT * FROM vaccinations 
       WHERE projet_id = $1 AND date_rappel IS NOT NULL AND date_rappel < $2
       ORDER BY date_rappel ASC`,
      [projetId, now]
    );
    return result.rows.map((row) => this.mapRowToVaccination(row));
  }

  async findVaccinationsAVenir(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const now = new Date().toISOString();
    const result = await this.databaseService.query(
      `SELECT * FROM vaccinations 
       WHERE projet_id = $1 AND date_rappel IS NOT NULL AND date_rappel >= $2
       ORDER BY date_rappel ASC`,
      [projetId, now]
    );
    return result.rows.map((row) => this.mapRowToVaccination(row));
  }

  async findOneVaccination(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT v.* FROM vaccinations v
       JOIN projets p ON v.projet_id = p.id
       WHERE v.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToVaccination(result.rows[0]) : null;
  }

  async updateVaccination(id: string, updateVaccinationDto: UpdateVaccinationDto, userId: string) {
    const existing = await this.findOneVaccination(id, userId);
    if (!existing) {
      throw new NotFoundException('Vaccination introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateVaccinationDto.animal_ids !== undefined) {
      fields.push(`animal_ids = $${paramIndex}`);
      values.push(this.stringifyArray(updateVaccinationDto.animal_ids));
      paramIndex++;
      // Mettre à jour animal_id pour compatibilité
      const animalId =
        updateVaccinationDto.animal_ids && updateVaccinationDto.animal_ids.length > 0
          ? updateVaccinationDto.animal_ids[0]
          : null;
      fields.push(`animal_id = $${paramIndex}`);
      values.push(animalId);
      paramIndex++;
    }
    if (updateVaccinationDto.type_prophylaxie !== undefined) {
      fields.push(`type_prophylaxie = $${paramIndex}`);
      values.push(updateVaccinationDto.type_prophylaxie);
      paramIndex++;
    }
    if (updateVaccinationDto.produit_administre !== undefined) {
      fields.push(`produit_administre = $${paramIndex}`);
      values.push(updateVaccinationDto.produit_administre);
      paramIndex++;
    }
    if (updateVaccinationDto.photo_flacon !== undefined) {
      fields.push(`photo_flacon = $${paramIndex}`);
      values.push(updateVaccinationDto.photo_flacon || null);
      paramIndex++;
    }
    if (updateVaccinationDto.date_vaccination !== undefined) {
      fields.push(`date_vaccination = $${paramIndex}`);
      values.push(updateVaccinationDto.date_vaccination);
      paramIndex++;
    }
    if (updateVaccinationDto.date_rappel !== undefined) {
      fields.push(`date_rappel = $${paramIndex}`);
      values.push(updateVaccinationDto.date_rappel || null);
      paramIndex++;
    }
    if (updateVaccinationDto.numero_lot_vaccin !== undefined) {
      fields.push(`numero_lot_vaccin = $${paramIndex}`);
      values.push(updateVaccinationDto.numero_lot_vaccin || null);
      paramIndex++;
    }
    if (updateVaccinationDto.dosage !== undefined) {
      fields.push(`dosage = $${paramIndex}`);
      values.push(updateVaccinationDto.dosage);
      paramIndex++;
    }
    if (updateVaccinationDto.unite_dosage !== undefined) {
      fields.push(`unite_dosage = $${paramIndex}`);
      values.push(updateVaccinationDto.unite_dosage);
      paramIndex++;
    }
    if (updateVaccinationDto.raison_traitement !== undefined) {
      fields.push(`raison_traitement = $${paramIndex}`);
      values.push(updateVaccinationDto.raison_traitement);
      paramIndex++;
    }
    if (updateVaccinationDto.raison_autre !== undefined) {
      fields.push(`raison_autre = $${paramIndex}`);
      values.push(updateVaccinationDto.raison_autre || null);
      paramIndex++;
    }
    if (updateVaccinationDto.veterinaire !== undefined) {
      fields.push(`veterinaire = $${paramIndex}`);
      values.push(updateVaccinationDto.veterinaire || null);
      paramIndex++;
    }
    if (updateVaccinationDto.cout !== undefined) {
      fields.push(`cout = $${paramIndex}`);
      values.push(updateVaccinationDto.cout || null);
      paramIndex++;
    }
    if (updateVaccinationDto.statut !== undefined) {
      fields.push(`statut = $${paramIndex}`);
      values.push(updateVaccinationDto.statut);
      paramIndex++;
    }
    if (updateVaccinationDto.effets_secondaires !== undefined) {
      fields.push(`effets_secondaires = $${paramIndex}`);
      values.push(updateVaccinationDto.effets_secondaires || null);
      paramIndex++;
    }
    if (updateVaccinationDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateVaccinationDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE vaccinations SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToVaccination(result.rows[0]);
  }

  async deleteVaccination(id: string, userId: string) {
    const existing = await this.findOneVaccination(id, userId);
    if (!existing) {
      throw new NotFoundException('Vaccination introuvable');
    }

    await this.databaseService.query('DELETE FROM vaccinations WHERE id = $1', [id]);
    return { id };
  }

  // ==================== MALADIES ====================

  private mapRowToMaladie(row: any): any {
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
      contagieux: row.contagieux || false,
      nombre_animaux_affectes: row.nombre_animaux_affectes || undefined,
      nombre_deces: row.nombre_deces || undefined,
      veterinaire: row.veterinaire || undefined,
      cout_traitement: row.cout_traitement ? parseFloat(row.cout_traitement) : undefined,
      gueri: row.gueri || false,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  async createMaladie(createMaladieDto: CreateMaladieDto, userId: string) {
    await this.checkProjetOwnership(createMaladieDto.projet_id, userId);

    const id = this.generateMaladieId();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO maladies (
        id, projet_id, animal_id, lot_id, type, nom_maladie, gravite,
        date_debut, date_fin, symptomes, diagnostic, contagieux,
        nombre_animaux_affectes, nombre_deces, veterinaire, cout_traitement,
        gueri, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        id,
        createMaladieDto.projet_id,
        createMaladieDto.animal_id || null,
        createMaladieDto.lot_id || null,
        createMaladieDto.type,
        createMaladieDto.nom_maladie,
        createMaladieDto.gravite,
        createMaladieDto.date_debut,
        createMaladieDto.date_fin || null,
        createMaladieDto.symptomes,
        createMaladieDto.diagnostic || null,
        createMaladieDto.contagieux || false,
        createMaladieDto.nombre_animaux_affectes || null,
        createMaladieDto.nombre_deces || null,
        createMaladieDto.veterinaire || null,
        createMaladieDto.cout_traitement || null,
        createMaladieDto.gueri || false,
        createMaladieDto.notes || null,
        now,
        now,
      ]
    );

    return this.mapRowToMaladie(result.rows[0]);
  }

  async findAllMaladies(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM maladies WHERE projet_id = $1 ORDER BY date_debut DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToMaladie(row));
  }

  async findMaladiesEnCours(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM maladies 
       WHERE projet_id = $1 AND gueri = FALSE AND (date_fin IS NULL OR date_fin > NOW())
       ORDER BY date_debut DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToMaladie(row));
  }

  async findOneMaladie(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT m.* FROM maladies m
       JOIN projets p ON m.projet_id = p.id
       WHERE m.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToMaladie(result.rows[0]) : null;
  }

  async updateMaladie(id: string, updateMaladieDto: UpdateMaladieDto, userId: string) {
    const existing = await this.findOneMaladie(id, userId);
    if (!existing) {
      throw new NotFoundException('Maladie introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateMaladieDto.type !== undefined) {
      fields.push(`type = $${paramIndex}`);
      values.push(updateMaladieDto.type);
      paramIndex++;
    }
    if (updateMaladieDto.nom_maladie !== undefined) {
      fields.push(`nom_maladie = $${paramIndex}`);
      values.push(updateMaladieDto.nom_maladie);
      paramIndex++;
    }
    if (updateMaladieDto.gravite !== undefined) {
      fields.push(`gravite = $${paramIndex}`);
      values.push(updateMaladieDto.gravite);
      paramIndex++;
    }
    if (updateMaladieDto.date_debut !== undefined) {
      fields.push(`date_debut = $${paramIndex}`);
      values.push(updateMaladieDto.date_debut);
      paramIndex++;
    }
    if (updateMaladieDto.date_fin !== undefined) {
      fields.push(`date_fin = $${paramIndex}`);
      values.push(updateMaladieDto.date_fin || null);
      paramIndex++;
    }
    if (updateMaladieDto.symptomes !== undefined) {
      fields.push(`symptomes = $${paramIndex}`);
      values.push(updateMaladieDto.symptomes);
      paramIndex++;
    }
    if (updateMaladieDto.diagnostic !== undefined) {
      fields.push(`diagnostic = $${paramIndex}`);
      values.push(updateMaladieDto.diagnostic || null);
      paramIndex++;
    }
    if (updateMaladieDto.contagieux !== undefined) {
      fields.push(`contagieux = $${paramIndex}`);
      values.push(updateMaladieDto.contagieux);
      paramIndex++;
    }
    if (updateMaladieDto.nombre_animaux_affectes !== undefined) {
      fields.push(`nombre_animaux_affectes = $${paramIndex}`);
      values.push(updateMaladieDto.nombre_animaux_affectes || null);
      paramIndex++;
    }
    if (updateMaladieDto.nombre_deces !== undefined) {
      fields.push(`nombre_deces = $${paramIndex}`);
      values.push(updateMaladieDto.nombre_deces || null);
      paramIndex++;
    }
    if (updateMaladieDto.veterinaire !== undefined) {
      fields.push(`veterinaire = $${paramIndex}`);
      values.push(updateMaladieDto.veterinaire || null);
      paramIndex++;
    }
    if (updateMaladieDto.cout_traitement !== undefined) {
      fields.push(`cout_traitement = $${paramIndex}`);
      values.push(updateMaladieDto.cout_traitement || null);
      paramIndex++;
    }
    if (updateMaladieDto.gueri !== undefined) {
      fields.push(`gueri = $${paramIndex}`);
      values.push(updateMaladieDto.gueri);
      paramIndex++;
    }
    if (updateMaladieDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateMaladieDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE maladies SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToMaladie(result.rows[0]);
  }

  async deleteMaladie(id: string, userId: string) {
    const existing = await this.findOneMaladie(id, userId);
    if (!existing) {
      throw new NotFoundException('Maladie introuvable');
    }

    await this.databaseService.query('DELETE FROM maladies WHERE id = $1', [id]);
    return { id };
  }

  // ==================== TRAITEMENTS ====================

  private mapRowToTraitement(row: any): any {
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
      cout: row.cout ? parseFloat(row.cout) : undefined,
      termine: row.termine || false,
      efficace: row.efficace || undefined,
      effets_secondaires: row.effets_secondaires || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  async createTraitement(createTraitementDto: CreateTraitementDto, userId: string) {
    await this.checkProjetOwnership(createTraitementDto.projet_id, userId);

    const id = this.generateTraitementId();
    const now = new Date().toISOString();
    const termine = createTraitementDto.termine || false;

    const result = await this.databaseService.query(
      `INSERT INTO traitements (
        id, projet_id, maladie_id, animal_id, lot_id, type, nom_medicament,
        voie_administration, dosage, frequence, date_debut, date_fin,
        duree_jours, temps_attente_jours, veterinaire, cout, termine,
        efficace, effets_secondaires, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        id,
        createTraitementDto.projet_id,
        createTraitementDto.maladie_id || null,
        createTraitementDto.animal_id || null,
        createTraitementDto.lot_id || null,
        createTraitementDto.type,
        createTraitementDto.nom_medicament,
        createTraitementDto.voie_administration,
        createTraitementDto.dosage,
        createTraitementDto.frequence,
        createTraitementDto.date_debut,
        createTraitementDto.date_fin || null,
        createTraitementDto.duree_jours || null,
        createTraitementDto.temps_attente_jours || null,
        createTraitementDto.veterinaire || null,
        createTraitementDto.cout || null,
        termine,
        createTraitementDto.efficace || null,
        createTraitementDto.effets_secondaires || null,
        createTraitementDto.notes || null,
        now,
        now,
      ]
    );

    return this.mapRowToTraitement(result.rows[0]);
  }

  async findAllTraitements(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM traitements WHERE projet_id = $1 ORDER BY date_debut DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToTraitement(row));
  }

  async findTraitementsEnCours(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM traitements 
       WHERE projet_id = $1 AND termine = FALSE
       ORDER BY date_debut DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToTraitement(row));
  }

  async findOneTraitement(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT t.* FROM traitements t
       JOIN projets p ON t.projet_id = p.id
       WHERE t.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToTraitement(result.rows[0]) : null;
  }

  async updateTraitement(id: string, updateTraitementDto: UpdateTraitementDto, userId: string) {
    const existing = await this.findOneTraitement(id, userId);
    if (!existing) {
      throw new NotFoundException('Traitement introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateTraitementDto.type !== undefined) {
      fields.push(`type = $${paramIndex}`);
      values.push(updateTraitementDto.type);
      paramIndex++;
    }
    if (updateTraitementDto.nom_medicament !== undefined) {
      fields.push(`nom_medicament = $${paramIndex}`);
      values.push(updateTraitementDto.nom_medicament);
      paramIndex++;
    }
    if (updateTraitementDto.voie_administration !== undefined) {
      fields.push(`voie_administration = $${paramIndex}`);
      values.push(updateTraitementDto.voie_administration);
      paramIndex++;
    }
    if (updateTraitementDto.dosage !== undefined) {
      fields.push(`dosage = $${paramIndex}`);
      values.push(updateTraitementDto.dosage);
      paramIndex++;
    }
    if (updateTraitementDto.frequence !== undefined) {
      fields.push(`frequence = $${paramIndex}`);
      values.push(updateTraitementDto.frequence);
      paramIndex++;
    }
    if (updateTraitementDto.date_debut !== undefined) {
      fields.push(`date_debut = $${paramIndex}`);
      values.push(updateTraitementDto.date_debut);
      paramIndex++;
    }
    if (updateTraitementDto.date_fin !== undefined) {
      fields.push(`date_fin = $${paramIndex}`);
      values.push(updateTraitementDto.date_fin || null);
      paramIndex++;
    }
    if (updateTraitementDto.duree_jours !== undefined) {
      fields.push(`duree_jours = $${paramIndex}`);
      values.push(updateTraitementDto.duree_jours || null);
      paramIndex++;
    }
    if (updateTraitementDto.temps_attente_jours !== undefined) {
      fields.push(`temps_attente_jours = $${paramIndex}`);
      values.push(updateTraitementDto.temps_attente_jours || null);
      paramIndex++;
    }
    if (updateTraitementDto.veterinaire !== undefined) {
      fields.push(`veterinaire = $${paramIndex}`);
      values.push(updateTraitementDto.veterinaire || null);
      paramIndex++;
    }
    if (updateTraitementDto.cout !== undefined) {
      fields.push(`cout = $${paramIndex}`);
      values.push(updateTraitementDto.cout || null);
      paramIndex++;
    }
    if (updateTraitementDto.termine !== undefined) {
      fields.push(`termine = $${paramIndex}`);
      values.push(updateTraitementDto.termine);
      paramIndex++;
    }
    if (updateTraitementDto.efficace !== undefined) {
      fields.push(`efficace = $${paramIndex}`);
      values.push(updateTraitementDto.efficace || null);
      paramIndex++;
    }
    if (updateTraitementDto.effets_secondaires !== undefined) {
      fields.push(`effets_secondaires = $${paramIndex}`);
      values.push(updateTraitementDto.effets_secondaires || null);
      paramIndex++;
    }
    if (updateTraitementDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateTraitementDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE traitements SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToTraitement(result.rows[0]);
  }

  async deleteTraitement(id: string, userId: string) {
    const existing = await this.findOneTraitement(id, userId);
    if (!existing) {
      throw new NotFoundException('Traitement introuvable');
    }

    await this.databaseService.query('DELETE FROM traitements WHERE id = $1', [id]);
    return { id };
  }

  // ==================== VISITES VÉTÉRINAIRES ====================

  private mapRowToVisiteVeterinaire(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      date_visite: row.date_visite,
      veterinaire: row.veterinaire,
      motif: row.motif,
      animaux_examines: this.parseJsonArray(row.animaux_examines),
      diagnostic: row.diagnostic || undefined,
      prescriptions: row.prescriptions || undefined,
      recommandations: row.recommandations || undefined,
      traitement: row.traitement || undefined,
      cout: parseFloat(row.cout),
      prochaine_visite: row.prochaine_visite || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  async createVisiteVeterinaire(
    createVisiteVeterinaireDto: CreateVisiteVeterinaireDto,
    userId: string
  ) {
    await this.checkProjetOwnership(createVisiteVeterinaireDto.projet_id, userId);

    const id = this.generateVisiteId();
    const now = new Date().toISOString();

    // Convertir animaux_examines en JSON si c'est une string
    const animauxExamines =
      typeof createVisiteVeterinaireDto.animaux_examines === 'string'
        ? createVisiteVeterinaireDto.animaux_examines
        : this.stringifyArray(
            createVisiteVeterinaireDto.animaux_examines
              ? [createVisiteVeterinaireDto.animaux_examines]
              : undefined
          );

    const result = await this.databaseService.query(
      `INSERT INTO visites_veterinaires (
        id, projet_id, date_visite, veterinaire, motif, animaux_examines,
        diagnostic, prescriptions, recommandations, traitement, cout,
        prochaine_visite, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id,
        createVisiteVeterinaireDto.projet_id,
        createVisiteVeterinaireDto.date_visite,
        createVisiteVeterinaireDto.veterinaire,
        createVisiteVeterinaireDto.motif,
        animauxExamines,
        createVisiteVeterinaireDto.diagnostic || null,
        createVisiteVeterinaireDto.prescriptions || null,
        createVisiteVeterinaireDto.recommandations || null,
        createVisiteVeterinaireDto.traitement || null,
        createVisiteVeterinaireDto.cout,
        createVisiteVeterinaireDto.prochaine_visite || null,
        createVisiteVeterinaireDto.notes || null,
        now,
        now,
      ]
    );

    return this.mapRowToVisiteVeterinaire(result.rows[0]);
  }

  async findAllVisitesVeterinaires(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM visites_veterinaires WHERE projet_id = $1 ORDER BY date_visite DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToVisiteVeterinaire(row));
  }

  async findOneVisiteVeterinaire(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT v.* FROM visites_veterinaires v
       JOIN projets p ON v.projet_id = p.id
       WHERE v.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToVisiteVeterinaire(result.rows[0]) : null;
  }

  async updateVisiteVeterinaire(
    id: string,
    updateVisiteVeterinaireDto: UpdateVisiteVeterinaireDto,
    userId: string
  ) {
    const existing = await this.findOneVisiteVeterinaire(id, userId);
    if (!existing) {
      throw new NotFoundException('Visite vétérinaire introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateVisiteVeterinaireDto.date_visite !== undefined) {
      fields.push(`date_visite = $${paramIndex}`);
      values.push(updateVisiteVeterinaireDto.date_visite);
      paramIndex++;
    }
    if (updateVisiteVeterinaireDto.veterinaire !== undefined) {
      fields.push(`veterinaire = $${paramIndex}`);
      values.push(updateVisiteVeterinaireDto.veterinaire);
      paramIndex++;
    }
    if (updateVisiteVeterinaireDto.motif !== undefined) {
      fields.push(`motif = $${paramIndex}`);
      values.push(updateVisiteVeterinaireDto.motif);
      paramIndex++;
    }
    if (updateVisiteVeterinaireDto.animaux_examines !== undefined) {
      const animauxExamines =
        typeof updateVisiteVeterinaireDto.animaux_examines === 'string'
          ? updateVisiteVeterinaireDto.animaux_examines
          : this.stringifyArray(
              updateVisiteVeterinaireDto.animaux_examines
                ? [updateVisiteVeterinaireDto.animaux_examines]
                : undefined
            );
      fields.push(`animaux_examines = $${paramIndex}`);
      values.push(animauxExamines);
      paramIndex++;
    }
    if (updateVisiteVeterinaireDto.diagnostic !== undefined) {
      fields.push(`diagnostic = $${paramIndex}`);
      values.push(updateVisiteVeterinaireDto.diagnostic || null);
      paramIndex++;
    }
    if (updateVisiteVeterinaireDto.prescriptions !== undefined) {
      fields.push(`prescriptions = $${paramIndex}`);
      values.push(updateVisiteVeterinaireDto.prescriptions || null);
      paramIndex++;
    }
    if (updateVisiteVeterinaireDto.recommandations !== undefined) {
      fields.push(`recommandations = $${paramIndex}`);
      values.push(updateVisiteVeterinaireDto.recommandations || null);
      paramIndex++;
    }
    if (updateVisiteVeterinaireDto.traitement !== undefined) {
      fields.push(`traitement = $${paramIndex}`);
      values.push(updateVisiteVeterinaireDto.traitement || null);
      paramIndex++;
    }
    if (updateVisiteVeterinaireDto.cout !== undefined) {
      fields.push(`cout = $${paramIndex}`);
      values.push(updateVisiteVeterinaireDto.cout);
      paramIndex++;
    }
    if (updateVisiteVeterinaireDto.prochaine_visite !== undefined) {
      fields.push(`prochaine_visite = $${paramIndex}`);
      values.push(updateVisiteVeterinaireDto.prochaine_visite || null);
      paramIndex++;
    }
    if (updateVisiteVeterinaireDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateVisiteVeterinaireDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE visites_veterinaires SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToVisiteVeterinaire(result.rows[0]);
  }

  async deleteVisiteVeterinaire(id: string, userId: string) {
    const existing = await this.findOneVisiteVeterinaire(id, userId);
    if (!existing) {
      throw new NotFoundException('Visite vétérinaire introuvable');
    }

    await this.databaseService.query('DELETE FROM visites_veterinaires WHERE id = $1', [id]);
    return { id };
  }

  // ==================== RAPPELS VACCINATIONS ====================

  private mapRowToRappelVaccination(row: any): any {
    return {
      id: row.id,
      vaccination_id: row.vaccination_id,
      date_rappel: row.date_rappel,
      envoi: row.envoi || false,
      date_envoi: row.date_envoi || undefined,
    };
  }

  async findRappelsByVaccination(vaccinationId: string, userId: string) {
    // Vérifier que la vaccination appartient à l'utilisateur
    const vaccination = await this.findOneVaccination(vaccinationId, userId);
    if (!vaccination) {
      throw new NotFoundException('Vaccination introuvable');
    }

    const result = await this.databaseService.query(
      `SELECT * FROM rappels_vaccinations 
       WHERE vaccination_id = $1 
       ORDER BY date_rappel ASC`,
      [vaccinationId]
    );
    return result.rows.map((row) => this.mapRowToRappelVaccination(row));
  }

  async findRappelsAVenir(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const now = new Date().toISOString();
    const result = await this.databaseService.query(
      `SELECT r.* FROM rappels_vaccinations r
       JOIN vaccinations v ON r.vaccination_id = v.id
       WHERE v.projet_id = $1 AND r.date_rappel >= $2 AND r.envoi = FALSE
       ORDER BY r.date_rappel ASC`,
      [projetId, now]
    );
    return result.rows.map((row) => this.mapRowToRappelVaccination(row));
  }

  async findRappelsEnRetard(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const now = new Date().toISOString();
    const result = await this.databaseService.query(
      `SELECT r.* FROM rappels_vaccinations r
       JOIN vaccinations v ON r.vaccination_id = v.id
       WHERE v.projet_id = $1 AND r.date_rappel < $2 AND r.envoi = FALSE
       ORDER BY r.date_rappel ASC`,
      [projetId, now]
    );
    return result.rows.map((row) => this.mapRowToRappelVaccination(row));
  }

  async marquerRappelEnvoye(id: string, userId: string) {
    // Vérifier que le rappel existe et appartient à l'utilisateur
    const result = await this.databaseService.query(
      `SELECT r.* FROM rappels_vaccinations r
       JOIN vaccinations v ON r.vaccination_id = v.id
       JOIN projets p ON v.projet_id = p.id
       WHERE r.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Rappel introuvable');
    }

    const now = new Date().toISOString();
    await this.databaseService.query(
      `UPDATE rappels_vaccinations SET envoi = TRUE, date_envoi = $1 WHERE id = $2`,
      [now, id]
    );
    return { id };
  }

  // ==================== STATISTIQUES ====================

  async getStatistiquesVaccinations(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM vaccinations WHERE projet_id = $1`,
      [projetId]
    );

    const vaccinations = result.rows.map((row) => this.mapRowToVaccination(row));

    const total = vaccinations.length;
    const effectuees = vaccinations.filter((v) => v.statut === 'effectue').length;
    const enAttente = vaccinations.filter((v) => v.statut === 'planifie').length;
    const enRetard = vaccinations.filter((v) => v.statut === 'en_retard').length;
    const coutTotal = vaccinations.reduce((sum, v) => sum + (v.cout || 0), 0);

    // Calculer le taux de couverture (basé sur les vaccinations effectuées)
    const tauxCouverture = total > 0 ? (effectuees / total) * 100 : 0;

    return {
      total,
      effectuees,
      en_attente: enAttente,
      en_retard: enRetard,
      taux_couverture: tauxCouverture,
      cout_total: coutTotal,
    };
  }

  async getStatistiquesMaladies(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(`SELECT * FROM maladies WHERE projet_id = $1`, [
      projetId,
    ]);

    const maladies = result.rows.map((row) => this.mapRowToMaladie(row));

    const total = maladies.length;
    const enCours = maladies.filter((m) => !m.gueri).length;
    const gueries = maladies.filter((m) => m.gueri).length;

    const parType: { [key: string]: number } = {};
    const parGravite: { [key: string]: number } = {};

    maladies.forEach((m) => {
      parType[m.type] = (parType[m.type] || 0) + 1;
      parGravite[m.gravite] = (parGravite[m.gravite] || 0) + 1;
    });

    const tauxGuerison = total > 0 ? (gueries / total) * 100 : 0;

    return {
      total,
      en_cours: enCours,
      gueries,
      par_type: parType,
      par_gravite: parGravite,
      taux_guerison: tauxGuerison,
    };
  }

  async getStatistiquesTraitements(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM traitements WHERE projet_id = $1`,
      [projetId]
    );

    const traitements = result.rows.map((row) => this.mapRowToTraitement(row));

    const total = traitements.length;
    const enCours = traitements.filter((t) => !t.termine).length;
    const termines = traitements.filter((t) => t.termine).length;
    const coutTotal = traitements.reduce((sum, t) => sum + (t.cout || 0), 0);

    return {
      total,
      en_cours: enCours,
      termines,
      cout_total: coutTotal,
    };
  }

  // ==================== INITIALISATION PROTOCOLES STANDARD ====================

  async initProtocolesVaccinationStandard(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // Protocoles standards de vaccination pour porcs
    const protocoles = [
      {
        nom: 'Vaccination Porcelets - 1ère dose',
        type_porc: 'porcelet',
        age_jours: 21,
        vaccin: 'PRRS + Mycoplasma',
        rappel_jours: 14,
        notes: 'Première vaccination standard pour porcelets',
      },
      {
        nom: 'Vaccination Porcelets - Rappel',
        type_porc: 'porcelet',
        age_jours: 35,
        vaccin: 'PRRS + Mycoplasma',
        rappel_jours: null,
        notes: 'Rappel de la première vaccination',
      },
      {
        nom: 'Vaccination Reproducteurs',
        type_porc: 'reproducteur',
        age_jours: null,
        vaccin: 'PRRS + Parvovirus + Erysipèle',
        rappel_jours: 180,
        notes: 'Vaccination annuelle pour reproducteurs',
      },
    ];

    const calendriers = [];
    const now = new Date().toISOString();

    for (const protocole of protocoles) {
      const id = this.generateCalendrierId();
      const result = await this.databaseService.query(
        `INSERT INTO calendrier_vaccinations (
          id, projet_id, nom, type_porc, age_jours, vaccin, rappel_jours, notes, date_creation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          id,
          projetId,
          protocole.nom,
          protocole.type_porc,
          protocole.age_jours || null,
          protocole.vaccin,
          protocole.rappel_jours || null,
          protocole.notes || null,
          now,
        ]
      );
      calendriers.push(this.mapRowToCalendrierVaccination(result.rows[0]));
    }

    return calendriers;
  }

  // ==================== RECOMMANDATIONS SANITAIRES ====================

  /**
   * Génère des recommandations sanitaires basées sur l'historique
   */
  async getRecommandations(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const recommendations: any[] = [];

    // 1. Vérifier les rappels de vaccination en retard
    const rappelsResult = await this.databaseService.query(
      `SELECT r.*, c.nom as calendrier_nom
       FROM rappels_vaccinations r
       JOIN calendrier_vaccinations c ON r.calendrier_id = c.id
       WHERE c.projet_id = $1 
       AND r.date_rappel < NOW()::date
       AND r.statut = 'en_attente'
       ORDER BY r.date_rappel ASC`,
      [projetId]
    );

    if (rappelsResult.rows.length > 0) {
      recommendations.push({
        type: 'vaccination',
        priorite: 'haute',
        message: `${rappelsResult.rows.length} rappel(s) de vaccination en retard`,
        data: { rappels: rappelsResult.rows },
      });
    }

    // 2. Vérifier les rappels à venir (7 prochains jours)
    const dateDans7Jours = new Date();
    dateDans7Jours.setDate(dateDans7Jours.getDate() + 7);
    const rappelsAVenirResult = await this.databaseService.query(
      `SELECT r.*, c.nom as calendrier_nom
       FROM rappels_vaccinations r
       JOIN calendrier_vaccinations c ON r.calendrier_id = c.id
       WHERE c.projet_id = $1 
       AND r.date_rappel >= NOW()::date
       AND r.date_rappel <= $2
       AND r.statut = 'en_attente'
       ORDER BY r.date_rappel ASC`,
      [projetId, dateDans7Jours.toISOString().split('T')[0]]
    );

    if (rappelsAVenirResult.rows.length > 0) {
      recommendations.push({
        type: 'vaccination',
        priorite: 'moyenne',
        message: `${rappelsAVenirResult.rows.length} vaccination(s) prévue(s) cette semaine`,
        data: { rappels: rappelsAVenirResult.rows },
      });
    }

    // 3. Vérifier les maladies en cours
    const maladiesResult = await this.databaseService.query(
      `SELECT * FROM maladies 
       WHERE projet_id = $1 
       AND gueri = FALSE
       ORDER BY date_debut DESC`,
      [projetId]
    );

    if (maladiesResult.rows.length > 0) {
      const critiques = maladiesResult.rows.filter((m) => m.gravite === 'critique');
      if (critiques.length > 0) {
        recommendations.push({
          type: 'alerte',
          priorite: 'haute',
          message: `${critiques.length} maladie(s) critique(s) en cours`,
          data: { maladies: critiques },
        });
      }
    }

    // 4. Vérifier les traitements en cours
    const traitementsResult = await this.databaseService.query(
      `SELECT * FROM traitements 
       WHERE projet_id = $1 
       AND date_fin IS NULL
       ORDER BY date_debut DESC`,
      [projetId]
    );

    if (traitementsResult.rows.length > 0) {
      recommendations.push({
        type: 'traitement',
        priorite: 'moyenne',
        message: `${traitementsResult.rows.length} traitement(s) en cours`,
        data: { traitements: traitementsResult.rows },
      });
    }

    // 5. Vérifier si une visite vétérinaire est prévue
    const visiteResult = await this.databaseService.query(
      `SELECT * FROM visites_veterinaires 
       WHERE projet_id = $1 
       AND prochaine_visite IS NOT NULL
       AND prochaine_visite >= NOW()::date
       ORDER BY prochaine_visite ASC
       LIMIT 1`,
      [projetId]
    );

    if (visiteResult.rows.length > 0) {
      const visite = visiteResult.rows[0];
      recommendations.push({
        type: 'visite',
        priorite: 'basse',
        message: `Visite vétérinaire prévue le ${new Date(visite.prochaine_visite).toLocaleDateString()}`,
        data: { visite },
      });
    }

    return recommendations;
  }

  /**
   * Calcule le taux de mortalité par cause
   */
  async getTauxMortaliteParCause(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM mortalites 
       WHERE projet_id = $1 
       ORDER BY date DESC`,
      [projetId]
    );

    const mortalites = result.rows;
    const total = mortalites.reduce((sum, m) => sum + (m.nombre_porcs || 0), 0);

    // Grouper par cause
    const parCause = new Map<string, number>();
    for (const mortalite of mortalites) {
      const cause = mortalite.cause || 'Non spécifiée';
      const current = parCause.get(cause) || 0;
      parCause.set(cause, current + (mortalite.nombre_porcs || 0));
    }

    // Convertir en array et calculer les pourcentages
    const resultArray = Array.from(parCause.entries())
      .map(([cause, nombre]) => ({
        cause,
        nombre,
        pourcentage: total > 0 ? (nombre / total) * 100 : 0,
      }))
      .sort((a, b) => b.nombre - a.nombre);

    return resultArray;
  }

  /**
   * Récupère l'historique médical complet d'un animal
   */
  async getHistoriqueAnimal(animalId: string, userId: string) {
    // Vérifier que l'animal existe et appartient à un projet de l'utilisateur
    const animalResult = await this.databaseService.query(
      `SELECT p.proprietaire_id 
       FROM production_animaux a
       JOIN projets p ON a.projet_id = p.id
       WHERE a.id = $1`,
      [animalId]
    );

    if (animalResult.rows.length === 0) {
      throw new NotFoundException('Animal introuvable');
    }

    if (animalResult.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException("Cet animal ne vous appartient pas");
    }

    // Récupérer toutes les données médicales de l'animal
    const [vaccinationsResult, maladiesResult, traitementsResult, visitesResult] = await Promise.all([
      this.databaseService.query(
        `SELECT * FROM vaccinations 
         WHERE animal_id = $1 OR $1 = ANY(animal_ids)
         ORDER BY date_vaccination DESC`,
        [animalId]
      ),
      this.databaseService.query(
        `SELECT * FROM maladies 
         WHERE animal_id = $1
         ORDER BY date_debut DESC`,
        [animalId]
      ),
      this.databaseService.query(
        `SELECT * FROM traitements 
         WHERE animal_id = $1
         ORDER BY date_debut DESC`,
        [animalId]
      ),
      this.databaseService.query(
        `SELECT * FROM visites_veterinaires 
         WHERE animal_id = $1
         ORDER BY date_visite DESC`,
        [animalId]
      ),
    ]);

    return {
      vaccinations: vaccinationsResult.rows.map((row) => this.mapRowToVaccination(row)),
      maladies: maladiesResult.rows.map((row) => this.mapRowToMaladie(row)),
      traitements: traitementsResult.rows.map((row) => this.mapRowToTraitement(row)),
      visites: visitesResult.rows.map((row) => this.mapRowToVisiteVeterinaire(row)),
    };
  }

  /**
   * Récupère les animaux en période d'attente avant abattage
   */
  async getAnimauxEnAttente(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM traitements 
       WHERE projet_id = $1 
       AND temps_attente_abattage_jours IS NOT NULL 
       AND animal_id IS NOT NULL
       AND date_fin IS NULL
       ORDER BY date_debut DESC`,
      [projetId]
    );

    const now = new Date();
    const animauxAvecAttente: any[] = [];

    for (const row of result.rows) {
      const traitement = this.mapRowToTraitement(row);
      
      if (
        !traitement.date_debut ||
        !traitement.temps_attente_abattage_jours ||
        !traitement.animal_id
      ) {
        continue;
      }

      const dateDebut = new Date(traitement.date_debut);
      const tempsAttente = traitement.temps_attente_abattage_jours;
      const dateFinAttente = new Date(
        dateDebut.getTime() + tempsAttente * 24 * 60 * 60 * 1000
      );

      // Vérifier si le temps d'attente est toujours actif
      if (dateFinAttente > now) {
        const joursRestants = Math.ceil(
          (dateFinAttente.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        animauxAvecAttente.push({
          animal_id: traitement.animal_id,
          traitement,
          date_fin_attente: dateFinAttente.toISOString(),
          jours_restants: joursRestants,
        });
      }
    }

    // Trier par jours restants (plus urgent en premier)
    return animauxAvecAttente.sort((a, b) => a.jours_restants - b.jours_restants);
  }

  /**
   * Calcule les coûts vétérinaires totaux pour un projet
   */
  async getCoutsVeterinaires(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // Récupérer toutes les vaccinations avec coût
    const vaccinationsResult = await this.databaseService.query(
      `SELECT COALESCE(SUM(cout), 0) as total
       FROM vaccinations 
       WHERE projet_id = $1 AND cout IS NOT NULL`,
      [projetId]
    );

    // Récupérer tous les traitements avec coût
    const traitementsResult = await this.databaseService.query(
      `SELECT COALESCE(SUM(cout), 0) as total
       FROM traitements 
       WHERE projet_id = $1 AND cout IS NOT NULL`,
      [projetId]
    );

    // Récupérer toutes les visites avec coût
    const visitesResult = await this.databaseService.query(
      `SELECT COALESCE(SUM(cout), 0) as total
       FROM visites_veterinaires 
       WHERE projet_id = $1 AND cout IS NOT NULL`,
      [projetId]
    );

    const coutVaccinations = parseFloat(vaccinationsResult.rows[0]?.total || '0');
    const coutTraitements = parseFloat(traitementsResult.rows[0]?.total || '0');
    const coutVisites = parseFloat(visitesResult.rows[0]?.total || '0');

    return {
      vaccinations: coutVaccinations,
      traitements: coutTraitements,
      visites: coutVisites,
      total: coutVaccinations + coutTraitements + coutVisites,
    };
  }

  /**
   * Calcule les coûts vétérinaires sur une période donnée
   */
  async getCoutsVeterinairesPeriode(
    projetId: string,
    dateDebut: string,
    dateFin: string,
    userId: string
  ) {
    await this.checkProjetOwnership(projetId, userId);

    // Vaccinations dans la période
    const vaccinationsResult = await this.databaseService.query(
      `SELECT * FROM vaccinations 
       WHERE projet_id = $1 
       AND date_vaccination >= $2 
       AND date_vaccination <= $3 
       AND cout IS NOT NULL
       ORDER BY date_vaccination DESC`,
      [projetId, dateDebut, dateFin]
    );

    // Traitements dans la période
    const traitementsResult = await this.databaseService.query(
      `SELECT * FROM traitements 
       WHERE projet_id = $1 
       AND date_debut >= $2 
       AND date_debut <= $3 
       AND cout IS NOT NULL
       ORDER BY date_debut DESC`,
      [projetId, dateDebut, dateFin]
    );

    // Visites dans la période
    const visitesResult = await this.databaseService.query(
      `SELECT * FROM visites_veterinaires 
       WHERE projet_id = $1 
       AND date_visite >= $2 
       AND date_visite <= $3 
       AND cout IS NOT NULL
       ORDER BY date_visite DESC`,
      [projetId, dateDebut, dateFin]
    );

    const vaccinations = vaccinationsResult.rows.map((row) => this.mapRowToVaccination(row));
    const traitements = traitementsResult.rows.map((row) => this.mapRowToTraitement(row));
    const visites = visitesResult.rows.map((row) => this.mapRowToVisiteVeterinaire(row));

    const coutVaccinations = vaccinations.reduce((sum, v) => sum + (v.cout || 0), 0);
    const coutTraitements = traitements.reduce((sum, t) => sum + (t.cout || 0), 0);
    const coutVisites = visites.reduce((sum, v) => sum + (v.cout || 0), 0);

    return {
      vaccinations: coutVaccinations,
      traitements: coutTraitements,
      visites: coutVisites,
      total: coutVaccinations + coutTraitements + coutVisites,
      details: {
        vaccinations,
        traitements,
        visites,
      },
    };
  }
}
