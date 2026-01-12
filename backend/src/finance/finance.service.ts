import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ImageService } from '../common/services/image.service';
import { compressImagesArray } from '../common/helpers/image-compression.helper';
import { CreateChargeFixeDto } from './dto/create-charge-fixe.dto';
import { UpdateChargeFixeDto } from './dto/update-charge-fixe.dto';
import { CreateDepensePonctuelleDto } from './dto/create-depense-ponctuelle.dto';
import { UpdateDepensePonctuelleDto } from './dto/update-depense-ponctuelle.dto';
import { CreateRevenuDto } from './dto/create-revenu.dto';
import { UpdateRevenuDto } from './dto/update-revenu.dto';
import { CreateVentePorcDto } from './dto/create-vente-porc.dto';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class FinanceService {
  constructor(
    private databaseService: DatabaseService,
    private imageService: ImageService
  ) {}

  /**
   * Génère un ID comme le frontend : charge_fixe_${Date.now()}_${random}
   */
  private generateChargeFixeId(): string {
    return `charge_fixe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID comme le frontend : depense_${Date.now()}_${random}
   */
  private generateDepenseId(): string {
    return `depense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID comme le frontend : revenu_${Date.now()}_${random}
   */
  private generateRevenuId(): string {
    return `revenu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    const rawProprietaireId = result.rows[0].proprietaire_id;
    const proprietaireId = String(rawProprietaireId || '').trim();
    const normalizedUserId = String(userId || '').trim();
if (proprietaireId !== normalizedUserId) {
throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  /**
   * Détermine le type OPEX/CAPEX selon la catégorie
   */
  private getTypeOpexCapex(categorie: string): 'opex' | 'capex' {
    const categoriesCapex = ['amenagement_batiment', 'equipement_lourd', 'achat_sujet'];
    return categoriesCapex.includes(categorie) ? 'capex' : 'opex';
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
        return undefined;
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

  // ==================== CHARGES FIXES ====================

  private mapRowToChargeFixe(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id || undefined,
      categorie: row.categorie,
      libelle: row.libelle,
      montant: parseFloat(row.montant),
      date_debut: row.date_debut,
      frequence: row.frequence,
      jour_paiement: row.jour_paiement || undefined,
      notes: row.notes || undefined,
      statut: row.statut,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  async createChargeFixe(createChargeFixeDto: CreateChargeFixeDto, userId: string) {
    if (createChargeFixeDto.projet_id) {
      await this.checkProjetOwnership(createChargeFixeDto.projet_id, userId);
    }

    const id = this.generateChargeFixeId();
    const now = new Date().toISOString();
    const statut = 'actif';

    const result = await this.databaseService.query(
      `INSERT INTO charges_fixes (
        id, projet_id, categorie, libelle, montant, date_debut,
        frequence, jour_paiement, notes, statut, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        createChargeFixeDto.projet_id || null,
        createChargeFixeDto.categorie,
        createChargeFixeDto.libelle,
        createChargeFixeDto.montant,
        createChargeFixeDto.date_debut,
        createChargeFixeDto.frequence,
        createChargeFixeDto.jour_paiement || null,
        createChargeFixeDto.notes || null,
        statut,
        now,
        now,
      ]
    );

    return this.mapRowToChargeFixe(result.rows[0]);
  }

  async findAllChargesFixes(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // Colonnes nécessaires pour mapRowToChargeFixe (optimisation: éviter SELECT *)
    const chargeFixeColumns = `id, projet_id, categorie, libelle, montant, date_debut, 
      frequence, jour_paiement, notes, statut, date_creation, derniere_modification`;

    const result = await this.databaseService.query(
      `SELECT ${chargeFixeColumns} FROM charges_fixes 
       WHERE projet_id = $1 
       ORDER BY date_debut DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToChargeFixe(row));
  }

  async findOneChargeFixe(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT c.* FROM charges_fixes c
       LEFT JOIN projets p ON c.projet_id = p.id
       WHERE c.id = $1 AND (c.projet_id IS NULL OR p.proprietaire_id = $2)`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToChargeFixe(result.rows[0]) : null;
  }

  async updateChargeFixe(id: string, updateChargeFixeDto: UpdateChargeFixeDto, userId: string) {
    const existing = await this.findOneChargeFixe(id, userId);
    if (!existing) {
      throw new NotFoundException('Charge fixe introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateChargeFixeDto.categorie !== undefined) {
      fields.push(`categorie = $${paramIndex}`);
      values.push(updateChargeFixeDto.categorie);
      paramIndex++;
    }
    if (updateChargeFixeDto.libelle !== undefined) {
      fields.push(`libelle = $${paramIndex}`);
      values.push(updateChargeFixeDto.libelle);
      paramIndex++;
    }
    if (updateChargeFixeDto.montant !== undefined) {
      fields.push(`montant = $${paramIndex}`);
      values.push(updateChargeFixeDto.montant);
      paramIndex++;
    }
    if (updateChargeFixeDto.date_debut !== undefined) {
      fields.push(`date_debut = $${paramIndex}`);
      values.push(updateChargeFixeDto.date_debut);
      paramIndex++;
    }
    if (updateChargeFixeDto.frequence !== undefined) {
      fields.push(`frequence = $${paramIndex}`);
      values.push(updateChargeFixeDto.frequence);
      paramIndex++;
    }
    if (updateChargeFixeDto.jour_paiement !== undefined) {
      fields.push(`jour_paiement = $${paramIndex}`);
      values.push(updateChargeFixeDto.jour_paiement || null);
      paramIndex++;
    }
    if (updateChargeFixeDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateChargeFixeDto.notes || null);
      paramIndex++;
    }
    if (updateChargeFixeDto.statut !== undefined) {
      fields.push(`statut = $${paramIndex}`);
      values.push(updateChargeFixeDto.statut);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE charges_fixes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToChargeFixe(result.rows[0]);
  }

  async deleteChargeFixe(id: string, userId: string) {
    const existing = await this.findOneChargeFixe(id, userId);
    if (!existing) {
      throw new NotFoundException('Charge fixe introuvable');
    }

    await this.databaseService.query('DELETE FROM charges_fixes WHERE id = $1', [id]);
    return { id };
  }

  // ==================== DÉPENSES PONCTUELLES ====================

  private mapRowToDepensePonctuelle(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      montant: parseFloat(row.montant),
      categorie: row.categorie,
      libelle_categorie: row.libelle_categorie || undefined,
      type_opex_capex: row.type_opex_capex || undefined,
      duree_amortissement_mois: row.duree_amortissement_mois || undefined,
      date: row.date,
      commentaire: row.commentaire || undefined,
      photos: this.parseJsonArray(row.photos),
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  async createDepensePonctuelle(
    createDepensePonctuelleDto: CreateDepensePonctuelleDto,
    userId: string
  ) {
    await this.checkProjetOwnership(createDepensePonctuelleDto.projet_id, userId);

    const id = this.generateDepenseId();
    const now = new Date().toISOString();
    const typeOpexCapex =
      createDepensePonctuelleDto.type_opex_capex ||
      this.getTypeOpexCapex(createDepensePonctuelleDto.categorie);

    // Compresser les images avant stockage (Phase 3)
    const compressedPhotos = await compressImagesArray(
      createDepensePonctuelleDto.photos,
      this.imageService,
      { maxWidth: 1920, maxHeight: 1920, quality: 80 }
    );

    const result = await this.databaseService.query(
      `INSERT INTO depenses_ponctuelles (
        id, projet_id, montant, categorie, libelle_categorie, type_opex_capex,
        duree_amortissement_mois, date, commentaire, photos, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        createDepensePonctuelleDto.projet_id,
        createDepensePonctuelleDto.montant,
        createDepensePonctuelleDto.categorie,
        createDepensePonctuelleDto.libelle_categorie || null,
        typeOpexCapex,
        createDepensePonctuelleDto.duree_amortissement_mois || null,
        createDepensePonctuelleDto.date,
        createDepensePonctuelleDto.commentaire || null,
        this.stringifyArray(compressedPhotos),
        now,
        now,
      ]
    );

    return this.mapRowToDepensePonctuelle(result.rows[0]);
  }

  async findAllDepensesPonctuelles(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // Colonnes nécessaires pour mapRowToDepensePonctuelle (optimisation: éviter SELECT *)
    const depenseColumns = `id, projet_id, montant, categorie, libelle_categorie, 
      type_opex_capex, duree_amortissement_mois, date, commentaire, photos, 
      date_creation, derniere_modification`;

    const result = await this.databaseService.query(
      `SELECT ${depenseColumns} FROM depenses_ponctuelles 
       WHERE projet_id = $1 
       ORDER BY date DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToDepensePonctuelle(row));
  }

  async findOneDepensePonctuelle(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT d.* FROM depenses_ponctuelles d
       JOIN projets p ON d.projet_id = p.id
       WHERE d.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToDepensePonctuelle(result.rows[0]) : null;
  }

  async updateDepensePonctuelle(
    id: string,
    updateDepensePonctuelleDto: UpdateDepensePonctuelleDto,
    userId: string
  ) {
    const existing = await this.findOneDepensePonctuelle(id, userId);
    if (!existing) {
      throw new NotFoundException('Dépense ponctuelle introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateDepensePonctuelleDto.montant !== undefined) {
      fields.push(`montant = $${paramIndex}`);
      values.push(updateDepensePonctuelleDto.montant);
      paramIndex++;
    }
    if (updateDepensePonctuelleDto.categorie !== undefined) {
      fields.push(`categorie = $${paramIndex}`);
      values.push(updateDepensePonctuelleDto.categorie);
      // Recalculer type_opex_capex si catégorie change
      const newTypeOpexCapex = this.getTypeOpexCapex(updateDepensePonctuelleDto.categorie);
      fields.push(`type_opex_capex = $${paramIndex + 1}`);
      values.push(newTypeOpexCapex);
      paramIndex += 2;
    }
    if (updateDepensePonctuelleDto.libelle_categorie !== undefined) {
      fields.push(`libelle_categorie = $${paramIndex}`);
      values.push(updateDepensePonctuelleDto.libelle_categorie || null);
      paramIndex++;
    }
    if (updateDepensePonctuelleDto.type_opex_capex !== undefined) {
      fields.push(`type_opex_capex = $${paramIndex}`);
      values.push(updateDepensePonctuelleDto.type_opex_capex);
      paramIndex++;
    }
    if (updateDepensePonctuelleDto.duree_amortissement_mois !== undefined) {
      fields.push(`duree_amortissement_mois = $${paramIndex}`);
      values.push(updateDepensePonctuelleDto.duree_amortissement_mois || null);
      paramIndex++;
    }
    if (updateDepensePonctuelleDto.date !== undefined) {
      fields.push(`date = $${paramIndex}`);
      values.push(updateDepensePonctuelleDto.date);
      paramIndex++;
    }
    if (updateDepensePonctuelleDto.commentaire !== undefined) {
      fields.push(`commentaire = $${paramIndex}`);
      values.push(updateDepensePonctuelleDto.commentaire || null);
      paramIndex++;
    }
    if (updateDepensePonctuelleDto.photos !== undefined) {
      // Compresser les images avant stockage (Phase 3)
      const compressedPhotos = await compressImagesArray(
        updateDepensePonctuelleDto.photos,
        this.imageService,
        { maxWidth: 1920, maxHeight: 1920, quality: 80 }
      );
      fields.push(`photos = $${paramIndex}`);
      values.push(this.stringifyArray(compressedPhotos));
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE depenses_ponctuelles SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToDepensePonctuelle(result.rows[0]);
  }

  async deleteDepensePonctuelle(id: string, userId: string) {
    const existing = await this.findOneDepensePonctuelle(id, userId);
    if (!existing) {
      throw new NotFoundException('Dépense ponctuelle introuvable');
    }

    await this.databaseService.query('DELETE FROM depenses_ponctuelles WHERE id = $1', [id]);
    return { id };
  }

  // ==================== REVENUS ====================

  private mapRowToRevenu(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      montant: parseFloat(row.montant),
      categorie: row.categorie,
      libelle_categorie: row.libelle_categorie || undefined,
      date: row.date,
      description: row.description || undefined,
      commentaire: row.commentaire || undefined,
      photos: this.parseJsonArray(row.photos),
      poids_kg: row.poids_kg ? parseFloat(row.poids_kg) : undefined,
      animal_id: row.animal_id || undefined,
      cout_kg_opex: row.cout_kg_opex ? parseFloat(row.cout_kg_opex) : undefined,
      cout_kg_complet: row.cout_kg_complet ? parseFloat(row.cout_kg_complet) : undefined,
      cout_reel_opex: row.cout_reel_opex ? parseFloat(row.cout_reel_opex) : undefined,
      cout_reel_complet: row.cout_reel_complet ? parseFloat(row.cout_reel_complet) : undefined,
      marge_opex: row.marge_opex ? parseFloat(row.marge_opex) : undefined,
      marge_complete: row.marge_complete ? parseFloat(row.marge_complete) : undefined,
      marge_opex_pourcent: row.marge_opex_pourcent
        ? parseFloat(row.marge_opex_pourcent)
        : undefined,
      marge_complete_pourcent: row.marge_complete_pourcent
        ? parseFloat(row.marge_complete_pourcent)
        : undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  async createRevenu(createRevenuDto: CreateRevenuDto, userId: string) {
    await this.checkProjetOwnership(createRevenuDto.projet_id, userId);

    const id = this.generateRevenuId();
    const now = new Date().toISOString();

    // Compresser les images avant stockage (Phase 3)
    const compressedPhotos = await compressImagesArray(
      createRevenuDto.photos,
      this.imageService,
      { maxWidth: 1920, maxHeight: 1920, quality: 80 }
    );

    const result = await this.databaseService.query(
      `INSERT INTO revenus (
        id, projet_id, montant, categorie, libelle_categorie, date,
        description, commentaire, photos, poids_kg, animal_id,
        date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id,
        createRevenuDto.projet_id,
        createRevenuDto.montant,
        createRevenuDto.categorie,
        createRevenuDto.libelle_categorie || null,
        createRevenuDto.date,
        createRevenuDto.description || null,
        createRevenuDto.commentaire || null,
        this.stringifyArray(compressedPhotos),
        createRevenuDto.poids_kg || null,
        createRevenuDto.animal_id || null,
        now,
        now,
      ]
    );

    return this.mapRowToRevenu(result.rows[0]);
  }

  async findAllRevenus(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // Colonnes nécessaires pour mapRowToRevenu (optimisation: éviter SELECT *)
    const revenuColumns = `id, projet_id, montant, categorie, libelle_categorie, date, 
      description, commentaire, photos, poids_kg, animal_id, cout_kg_opex, 
      cout_kg_complet, cout_reel_opex, cout_reel_complet, marge_opex, marge_complete, 
      marge_opex_pourcent, marge_complete_pourcent, date_creation, derniere_modification`;

    const result = await this.databaseService.query(
      `SELECT ${revenuColumns} FROM revenus 
       WHERE projet_id = $1 
       ORDER BY date DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToRevenu(row));
  }

  async findOneRevenu(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT r.* FROM revenus r
       JOIN projets p ON r.projet_id = p.id
       WHERE r.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToRevenu(result.rows[0]) : null;
  }

  async updateRevenu(id: string, updateRevenuDto: UpdateRevenuDto, userId: string) {
    const existing = await this.findOneRevenu(id, userId);
    if (!existing) {
      throw new NotFoundException('Revenu introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateRevenuDto.montant !== undefined) {
      fields.push(`montant = $${paramIndex}`);
      values.push(updateRevenuDto.montant);
      paramIndex++;
    }
    if (updateRevenuDto.categorie !== undefined) {
      fields.push(`categorie = $${paramIndex}`);
      values.push(updateRevenuDto.categorie);
      paramIndex++;
    }
    if (updateRevenuDto.libelle_categorie !== undefined) {
      fields.push(`libelle_categorie = $${paramIndex}`);
      values.push(updateRevenuDto.libelle_categorie || null);
      paramIndex++;
    }
    if (updateRevenuDto.date !== undefined) {
      fields.push(`date = $${paramIndex}`);
      values.push(updateRevenuDto.date);
      paramIndex++;
    }
    if (updateRevenuDto.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(updateRevenuDto.description || null);
      paramIndex++;
    }
    if (updateRevenuDto.commentaire !== undefined) {
      fields.push(`commentaire = $${paramIndex}`);
      values.push(updateRevenuDto.commentaire || null);
      paramIndex++;
    }
    if (updateRevenuDto.photos !== undefined) {
      // Compresser les images avant stockage (Phase 3)
      const compressedPhotos = await compressImagesArray(
        updateRevenuDto.photos,
        this.imageService,
        { maxWidth: 1920, maxHeight: 1920, quality: 80 }
      );
      fields.push(`photos = $${paramIndex}`);
      values.push(this.stringifyArray(compressedPhotos));
      paramIndex++;
    }
    if (updateRevenuDto.poids_kg !== undefined) {
      fields.push(`poids_kg = $${paramIndex}`);
      values.push(updateRevenuDto.poids_kg || null);
      paramIndex++;
    }
    if (updateRevenuDto.animal_id !== undefined) {
      fields.push(`animal_id = $${paramIndex}`);
      values.push(updateRevenuDto.animal_id || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE revenus SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToRevenu(result.rows[0]);
  }

  async deleteRevenu(id: string, userId: string) {
    const existing = await this.findOneRevenu(id, userId);
    if (!existing) {
      throw new NotFoundException('Revenu introuvable');
    }

    await this.databaseService.query('DELETE FROM revenus WHERE id = $1', [id]);
    return { id };
  }

  // ==================== CALCUL DES MARGES ====================

  /**
   * Calcule les coûts par kg pour une date de vente donnée
   * Utilise une période glissante de 30 jours avant la vente pour calculer les coûts
   */
  private async calculerCoutsParKgPourVente(
    projetId: string,
    dateVente: string
  ): Promise<{ cout_kg_opex: number; cout_kg_complet: number }> {
    // Utiliser une période de 30 jours avant la vente pour calculer les coûts moyens
    const dateVenteObj = new Date(dateVente);
    const dateDebut = new Date(dateVenteObj);
    dateDebut.setDate(dateDebut.getDate() - 30);
    const dateFin = dateVenteObj.toISOString();

    // Calculer les coûts de production pour cette période
    // Note: userId non nécessaire ici car la propriété du projet a déjà été vérifiée dans calculerMargesVente
    const couts = await this.calculerCoutsProduction(
      projetId,
      dateDebut.toISOString(),
      dateFin,
      undefined // userId optionnel - la vérification de propriété sera sautée
    );

    // Si pas de kg vendus dans la période, utiliser les coûts moyens du projet
    if (couts.total_kg_vendus === 0 || (couts.cout_kg_opex === 0 && couts.cout_kg_complet === 0)) {
      // Récupérer le projet pour obtenir les coûts moyens si disponibles
      const projetResult = await this.databaseService.query(
        `SELECT cout_kg_opex_moyen, cout_kg_complet_moyen FROM projets WHERE id = $1`,
        [projetId]
      );
      const projet = projetResult.rows[0];
      
      if (projet?.cout_kg_opex_moyen && projet?.cout_kg_complet_moyen) {
        return {
          cout_kg_opex: parseFloat(projet.cout_kg_opex_moyen),
          cout_kg_complet: parseFloat(projet.cout_kg_complet_moyen),
        };
      }
      
      // Par défaut, utiliser les coûts calculés même s'ils sont 0
      return {
        cout_kg_opex: couts.cout_kg_opex,
        cout_kg_complet: couts.cout_kg_complet,
      };
    }

    return {
      cout_kg_opex: couts.cout_kg_opex,
      cout_kg_complet: couts.cout_kg_complet,
    };
  }

  /**
   * Calcule les marges pour une vente spécifique
   */
  async calculerMargesVente(venteId: string, poidsKg: number, userId: string) {
    const vente = await this.findOneRevenu(venteId, userId);
    if (!vente) {
      throw new NotFoundException('Vente introuvable');
    }

    if (!vente.projet_id) {
      throw new BadRequestException('La vente doit être associée à un projet');
    }

    // Vérifier la propriété du projet
    await this.checkProjetOwnership(vente.projet_id, userId);

    // Calculer les coûts par kg pour cette vente (période de 30 jours avant la vente)
    const coutsParKg = await this.calculerCoutsParKgPourVente(vente.projet_id, vente.date);

    // Calculer les coûts réels pour cette vente
    const coutReelOpex = coutsParKg.cout_kg_opex * poidsKg;
    const coutReelComplet = coutsParKg.cout_kg_complet * poidsKg;

    // Calculer les marges
    const margeOpex = vente.montant - coutReelOpex;
    const margeComplete = vente.montant - coutReelComplet;
    const margeOpexPourcent = vente.montant > 0 ? (margeOpex / vente.montant) * 100 : 0;
    const margeCompletePourcent = vente.montant > 0 ? (margeComplete / vente.montant) * 100 : 0;

    // Mettre à jour le revenu avec le poids, les coûts par kg et les marges calculées
    const result = await this.databaseService.query(
      `UPDATE revenus 
       SET poids_kg = $1, 
           cout_kg_opex = $2,
           cout_kg_complet = $3,
           cout_reel_opex = $4,
           cout_reel_complet = $5,
           marge_opex = $6,
           marge_complete = $7,
           marge_opex_pourcent = $8,
           marge_complete_pourcent = $9,
           derniere_modification = $10
       WHERE id = $11
       RETURNING *`,
      [
        poidsKg,
        coutsParKg.cout_kg_opex,
        coutsParKg.cout_kg_complet,
        coutReelOpex,
        coutReelComplet,
        margeOpex,
        margeComplete,
        margeOpexPourcent,
        margeCompletePourcent,
        new Date().toISOString(),
        venteId,
      ]
    );

    return this.mapRowToRevenu(result.rows[0]);
  }

  /**
   * Recalcule les marges pour toutes les ventes d'une période donnée
   */
  async recalculerMargesPeriode(
    projetId: string,
    dateDebut: string,
    dateFin: string,
    userId: string
  ) {
    await this.checkProjetOwnership(projetId, userId);

    // Récupérer toutes les ventes de porcs de la période qui ont un poids
    const ventesResult = await this.databaseService.query(
      `SELECT id, date, montant, poids_kg
       FROM revenus
       WHERE projet_id = $1
       AND categorie = 'vente_porc'
       AND date >= $2
       AND date <= $3
       AND poids_kg IS NOT NULL
       AND poids_kg > 0
       ORDER BY date ASC`,
      [projetId, dateDebut, dateFin]
    );

    const ventes = ventesResult.rows;
    let nombreVentesRecalculees = 0;
    const ventesMisesAJour = [];

    // Calculer les coûts moyens pour la période complète
    const coutsPeriod = await this.calculerCoutsProduction(projetId, dateDebut, dateFin, userId);

    for (const vente of ventes) {
      try {
        // Pour chaque vente, calculer les marges en utilisant les coûts de la période
        const poidsKg = parseFloat(vente.poids_kg);
        const montant = parseFloat(vente.montant);

        // Utiliser les coûts moyens de la période si disponibles, sinon recalculer pour la date spécifique
        let coutKgOpex = coutsPeriod.cout_kg_opex;
        let coutKgComplet = coutsPeriod.cout_kg_complet;

        if (coutKgOpex === 0 && coutKgComplet === 0) {
          // Si pas de coûts dans la période, utiliser une période glissante pour cette vente
          const coutsVente = await this.calculerCoutsParKgPourVente(projetId, vente.date);
          coutKgOpex = coutsVente.cout_kg_opex;
          coutKgComplet = coutsVente.cout_kg_complet;
        }

        // Calculer les coûts réels et marges
        const coutReelOpex = coutKgOpex * poidsKg;
        const coutReelComplet = coutKgComplet * poidsKg;
        const margeOpex = montant - coutReelOpex;
        const margeComplete = montant - coutReelComplet;
        const margeOpexPourcent = montant > 0 ? (margeOpex / montant) * 100 : 0;
        const margeCompletePourcent = montant > 0 ? (margeComplete / montant) * 100 : 0;

        // Mettre à jour la vente
        await this.databaseService.query(
          `UPDATE revenus 
           SET cout_kg_opex = $1,
               cout_kg_complet = $2,
               cout_reel_opex = $3,
               cout_reel_complet = $4,
               marge_opex = $5,
               marge_complete = $6,
               marge_opex_pourcent = $7,
               marge_complete_pourcent = $8,
               derniere_modification = $9
           WHERE id = $10`,
          [
            coutKgOpex,
            coutKgComplet,
            coutReelOpex,
            coutReelComplet,
            margeOpex,
            margeComplete,
            margeOpexPourcent,
            margeCompletePourcent,
            new Date().toISOString(),
            vente.id,
          ]
        );

        nombreVentesRecalculees++;
        ventesMisesAJour.push({
          id: vente.id,
          date: vente.date,
          poids_kg: poidsKg,
          montant: montant,
          marge_opex: margeOpex,
          marge_complete: margeComplete,
        });
      } catch (error) {
        // Logger l'erreur mais continuer avec les autres ventes
        console.error(`Erreur lors du recalcul des marges pour la vente ${vente.id}:`, error);
      }
    }

    return {
      nombre_ventes_recalculees: nombreVentesRecalculees,
      periode: {
        date_debut: dateDebut,
        date_fin: dateFin,
      },
      couts_periode: {
        cout_kg_opex: coutsPeriod.cout_kg_opex,
        cout_kg_complet: coutsPeriod.cout_kg_complet,
      },
      ventes: ventesMisesAJour,
    };
  }

  // ==================== STATISTIQUES ====================

  async getStatsMoisActuel(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Revenus du mois
    const revenusResult = await this.databaseService.query(
      `SELECT COALESCE(SUM(montant), 0) as total_revenus,
              COALESCE(SUM(marge_opex), 0) as total_marge_opex,
              COALESCE(SUM(marge_complete), 0) as total_marge_complete,
              COUNT(*) as nombre_ventes
       FROM revenus
       WHERE projet_id = $1 AND date >= $2 AND date <= $3`,
      [projetId, debutMois, finMois]
    );

    // Charges fixes du mois
    const chargesFixesResult = await this.databaseService.query(
      `SELECT COALESCE(SUM(montant), 0) as total_charges_fixes
       FROM charges_fixes
       WHERE projet_id = $1 AND statut = 'actif'`,
      [projetId]
    );

    // Dépenses ponctuelles du mois
    const depensesResult = await this.databaseService.query(
      `SELECT COALESCE(SUM(montant), 0) as total_depenses
       FROM depenses_ponctuelles
       WHERE projet_id = $1 AND date >= $2 AND date <= $3`,
      [projetId, debutMois, finMois]
    );

    const revenus = revenusResult.rows[0];
    const chargesFixes = chargesFixesResult.rows[0];
    const depenses = depensesResult.rows[0];

    const totalRevenus = parseFloat(revenus.total_revenus || '0');
    const totalCharges =
      parseFloat(chargesFixes.total_charges_fixes || '0') +
      parseFloat(depenses.total_depenses || '0');
    const solde = totalRevenus - totalCharges;

    return {
      periode: {
        debut: debutMois,
        fin: finMois,
      },
      revenus: {
        total: totalRevenus,
        nombre_ventes: parseInt(revenus.nombre_ventes || '0'),
        marge_opex: parseFloat(revenus.total_marge_opex || '0'),
        marge_complete: parseFloat(revenus.total_marge_complete || '0'),
      },
      charges: {
        fixes: parseFloat(chargesFixes.total_charges_fixes || '0'),
        ponctuelles: parseFloat(depenses.total_depenses || '0'),
        total: totalCharges,
      },
      solde: solde,
      taux_marge:
        totalRevenus > 0
          ? (parseFloat(revenus.total_marge_complete || '0') / totalRevenus) * 100
          : 0,
    };
  }

  // ==================== CALCUL DES COÛTS DE PRODUCTION ====================

  /**
   * Calcule les coûts de production pour une période donnée
   * Utilisé pour calculer les marges sur les ventes
   */
  async calculerCoutsProduction(
    projetId: string,
    dateDebut: string,
    dateFin: string,
    userId?: string
  ) {
    // Vérifier la propriété du projet seulement si userId est fourni
    if (userId) {
      await this.checkProjetOwnership(projetId, userId);
    }

    // 1. Récupérer le projet pour obtenir la durée d'amortissement
    const projetResult = await this.databaseService.query(
      'SELECT duree_amortissement_par_defaut_mois FROM projets WHERE id = $1',
      [projetId]
    );

    if (projetResult.rows.length === 0) {
      throw new NotFoundException('Projet introuvable');
    }

    const dureeAmortissementMois = parseInt(
      projetResult.rows[0].duree_amortissement_par_defaut_mois || '36'
    );

    // 2. Charger toutes les dépenses ponctuelles du projet
    // Colonnes nécessaires (optimisation: éviter SELECT *)
    const depenseColumns = `id, montant, date, categorie, type_opex_capex, duree_amortissement_mois`;
    
    const depensesResult = await this.databaseService.query(
      `SELECT ${depenseColumns} FROM depenses_ponctuelles 
       WHERE projet_id = $1 
       ORDER BY date ASC`,
      [projetId]
    );

    const depenses = depensesResult.rows.map((row) => ({
      id: row.id,
      montant: parseFloat(row.montant),
      date: row.date,
      categorie: row.categorie,
      type_opex_capex: row.type_opex_capex || (this.getTypeOpexCapex(row.categorie)),
      duree_amortissement_mois: row.duree_amortissement_mois
        ? parseInt(row.duree_amortissement_mois)
        : null,
    }));

    // 3. Calculer le total OPEX de la période (dépenses OPEX + charges fixes actives)
    const dateDebutObj = new Date(dateDebut);
    const dateFinObj = new Date(dateFin);

    const depensesOpex = depenses.filter(
      (d) => !d.type_opex_capex || d.type_opex_capex.toLowerCase() === 'opex'
    );
    const totalOpexDepenses = depensesOpex
      .filter((d) => {
        const dateDepense = new Date(d.date);
        return dateDepense >= dateDebutObj && dateDepense <= dateFinObj;
      })
      .reduce((sum, d) => sum + d.montant, 0);

    // Ajouter les charges fixes actives de la période
    const chargesFixesResult = await this.databaseService.query(
      `SELECT montant, frequence, date_debut
       FROM charges_fixes
       WHERE projet_id = $1
       AND statut = 'actif'`,
      [projetId]
    );

    let totalChargesFixes = 0;
    for (const charge of chargesFixesResult.rows) {
      const dateDebutCharge = new Date(charge.date_debut);
      const montant = parseFloat(charge.montant);
      const frequence = charge.frequence;

      // Calculer la période effective de la charge fixe
      if (dateDebutCharge > dateFinObj) {
        continue; // Charge fixe commencée après la période
      }

      const debutEffective = dateDebutCharge > dateDebutObj ? dateDebutCharge : dateDebutObj;
      const nombreMois = Math.max(
        1,
        Math.floor((dateFinObj.getTime() - debutEffective.getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1
      );

      // Calculer le montant selon la fréquence
      let montantPeriode = 0;
      if (frequence === 'mensuel') {
        montantPeriode = montant * nombreMois;
      } else if (frequence === 'trimestriel') {
        montantPeriode = montant * Math.ceil(nombreMois / 3);
      } else if (frequence === 'annuel') {
        montantPeriode = montant * Math.ceil(nombreMois / 12);
      }

      totalChargesFixes += montantPeriode;
    }

    const totalOpex = totalOpexDepenses + totalChargesFixes;

    // 4. Calculer le total des amortissements CAPEX de la période
    const depensesCapex = depenses.filter(
      (d) => d.type_opex_capex && d.type_opex_capex.toLowerCase() === 'capex'
    );

    let totalAmortissementCapex = 0;
    for (const depense of depensesCapex) {
      const dateDepense = new Date(depense.date);
      const dureeAmortissement =
        depense.duree_amortissement_mois || dureeAmortissementMois;

      // Date de fin d'amortissement
      const dateFinAmortissement = new Date(dateDepense);
      dateFinAmortissement.setMonth(dateFinAmortissement.getMonth() + dureeAmortissement);

      // Si la dépense n'est pas encore commencée ou est terminée avant la période
      if (dateDepense > dateFinObj || dateFinAmortissement < dateDebutObj) {
        continue;
      }

      // Amortissement mensuel
      const amortissementMensuel = depense.montant / dureeAmortissement;

      // Calculer le nombre de mois où cette dépense CAPEX a été amortie durant la période
      const debutAmortissement =
        dateDepense > dateDebutObj ? dateDepense : dateDebutObj;
      const finAmortissement =
        dateFinAmortissement < dateFinObj ? dateFinAmortissement : dateFinObj;

      if (debutAmortissement < finAmortissement) {
        const moisAmortis = Math.max(
          1,
          Math.floor(
            (finAmortissement.getTime() - debutAmortissement.getTime()) /
              (1000 * 60 * 60 * 24 * 30)
          ) + 1
        );
        totalAmortissementCapex += amortissementMensuel * moisAmortis;
      }
    }

    // 5. Calculer le total des kg vendus dans la période
    const ventesResult = await this.databaseService.query(
      `SELECT COALESCE(SUM(poids_kg), 0) as total_kg_vendus
       FROM revenus 
       WHERE projet_id = $1 
       AND categorie = 'vente_porc'
       AND date >= $2 
       AND date <= $3`,
      [projetId, dateDebut, dateFin]
    );

    const totalKgVendus = parseFloat(ventesResult.rows[0]?.total_kg_vendus || '0');

    // 6. Calculer les coûts par kg
    const coutKgOpex = totalKgVendus > 0 ? totalOpex / totalKgVendus : 0;
    const coutKgComplet =
      totalKgVendus > 0 ? (totalOpex + totalAmortissementCapex) / totalKgVendus : 0;

    return {
      date_debut: dateDebut,
      date_fin: dateFin,
      total_opex: totalOpex,
      total_amortissement_capex: totalAmortissementCapex,
      total_kg_vendus: totalKgVendus,
      cout_kg_opex: coutKgOpex,
      cout_kg_complet: coutKgComplet,
    };
  }

  // ==================== DETTES ====================

  async createDette(createDetteDto: any, userId: string) {
    await this.checkProjetOwnership(createDetteDto.projet_id, userId);

    const id = `dette_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO dettes (
        id, projet_id, libelle, type_dette, montant_initial, montant_restant,
        taux_interet, date_debut, date_echeance, frequence_remboursement,
        montant_remboursement, statut, preteur, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id,
        createDetteDto.projet_id,
        createDetteDto.libelle,
        createDetteDto.type_dette,
        createDetteDto.montant_initial,
        createDetteDto.montant_restant,
        createDetteDto.taux_interet || 0,
        createDetteDto.date_debut,
        createDetteDto.date_echeance || null,
        createDetteDto.frequence_remboursement || 'mensuel',
        createDetteDto.montant_remboursement || null,
        createDetteDto.statut || 'en_cours',
        createDetteDto.preteur || null,
        createDetteDto.notes || null,
        now,
        now,
      ]
    );

    return this.mapRowToDette(result.rows[0]);
  }

  async findAllDettes(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM dettes WHERE projet_id = $1 ORDER BY date_debut DESC`,
      [projetId]
    );

    return result.rows.map((row) => this.mapRowToDette(row));
  }

  async findOneDette(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT d.*, p.proprietaire_id 
       FROM dettes d
       JOIN projets p ON d.projet_id = p.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Dette introuvable');
    }

    if (result.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Cette dette ne vous appartient pas');
    }

    return this.mapRowToDette(result.rows[0]);
  }

  async updateDette(id: string, updateDetteDto: any, userId: string) {
    await this.findOneDette(id, userId); // Vérifie ownership

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields = [
      'libelle',
      'type_dette',
      'montant_initial',
      'montant_restant',
      'taux_interet',
      'date_debut',
      'date_echeance',
      'frequence_remboursement',
      'montant_remboursement',
      'statut',
      'preteur',
      'notes',
    ];

    fields.forEach((field) => {
      if (updateDetteDto[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(updateDetteDto[field]);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return this.findOneDette(id, userId);
    }

    updates.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);

    const result = await this.databaseService.query(
      `UPDATE dettes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return this.mapRowToDette(result.rows[0]);
  }

  async removeDette(id: string, userId: string) {
    await this.findOneDette(id, userId); // Vérifie ownership

    await this.databaseService.query('DELETE FROM dettes WHERE id = $1', [id]);
    return { message: 'Dette supprimée avec succès' };
  }

  private mapRowToDette(row: any) {
    return {
      id: row.id,
      projet_id: row.projet_id,
      libelle: row.libelle,
      type_dette: row.type_dette,
      montant_initial: parseFloat(row.montant_initial || '0'),
      montant_restant: parseFloat(row.montant_restant || '0'),
      taux_interet: parseFloat(row.taux_interet || '0'),
      date_debut: row.date_debut,
      date_echeance: row.date_echeance || null,
      frequence_remboursement: row.frequence_remboursement || 'mensuel',
      montant_remboursement: row.montant_remboursement
        ? parseFloat(row.montant_remboursement)
        : null,
      statut: row.statut || 'en_cours',
      preteur: row.preteur || null,
      notes: row.notes || null,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification,
    };
  }

  // ==================== BILAN COMPLET ====================

  async getBilanComplet(
    projetId: string,
    userId: string,
    dateDebut?: string,
    dateFin?: string
  ) {
    await this.checkProjetOwnership(projetId, userId);

    const maintenant = new Date();
    const debut = dateDebut
      ? new Date(dateDebut)
      : new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const fin = dateFin ? new Date(dateFin) : maintenant;

    // 1. REVENUS
    const revenus = await this.findAllRevenus(projetId, userId);
    const revenusPeriode = revenus.filter((r) => {
      const dateRevenu = new Date(r.date);
      return dateRevenu >= debut && dateRevenu <= fin;
    });
    const totalRevenus = revenusPeriode.reduce((sum, r) => sum + r.montant, 0);
    const revenusParCategorie = revenusPeriode.reduce((acc, r) => {
      const cat = r.categorie || 'autre';
      acc[cat] = (acc[cat] || 0) + r.montant;
      return acc;
    }, {} as Record<string, number>);

    // 2. DEPENSES OPEX
    const depenses = await this.findAllDepensesPonctuelles(projetId, userId);
    const depensesPeriode = depenses.filter((d) => {
      const dateDepense = new Date(d.date);
      return dateDepense >= debut && dateDepense <= fin;
    });
    // Filtrer seulement les OPEX (non CAPEX) - utiliser type_opex_capex comme dans getCoutsProduction
    const depensesOpex = depensesPeriode.filter(
      (d) => !d.type_opex_capex || d.type_opex_capex.toLowerCase() === 'opex'
    );
    const totalDepensesOpex = depensesOpex.reduce((sum, d) => sum + d.montant, 0);
    const depensesParCategorie = depensesOpex.reduce((acc, d) => {
      const cat = d.categorie || 'autre';
      acc[cat] = (acc[cat] || 0) + d.montant;
      return acc;
    }, {} as Record<string, number>);

    // 3. CHARGES FIXES
    const chargesFixes = await this.findAllChargesFixes(projetId, userId);
    const chargesActives = chargesFixes.filter((c) => c.statut === 'actif');
    
    // Calculer le nombre de mois calendaires dans la période (inclusif)
    // Exemple: 1er janvier à 31 décembre = 12 mois
    const moisDebut = new Date(debut);
    const moisFin = new Date(fin);
    const nombreMois =
      (moisFin.getFullYear() - moisDebut.getFullYear()) * 12 +
      (moisFin.getMonth() - moisDebut.getMonth()) +
      1;
    
    const totalChargesFixes = chargesActives.reduce((sum, c) => sum + c.montant, 0) * nombreMois;

    // 4. DETTES
    const dettes = await this.findAllDettes(projetId, userId);
    const dettesEnCours = dettes.filter((d) => d.statut === 'en_cours');
    const totalDettes = dettesEnCours.reduce((sum, d) => sum + d.montant_restant, 0);
    const totalInteretsMensuels = dettesEnCours.reduce((sum, d) => {
      const interetMensuel = (d.montant_restant * d.taux_interet) / 100 / 12;
      return sum + interetMensuel;
    }, 0);

    // 5. ACTIFS
    // Valeur du cheptel (estimation basée sur poids total * prix/kg)
    // Vérifier le mode de gestion du projet
    const projetResult = await this.databaseService.query(
      'SELECT prix_kg_vif, management_method FROM projets WHERE id = $1',
      [projetId]
    );
    const prixKgVif = parseFloat(projetResult.rows[0]?.prix_kg_vif || '0');
    const managementMethod = projetResult.rows[0]?.management_method || 'individual';

    let nombreAnimaux = 0;
    let poidsTotal = 0;
    let poidsMoyen = 0;

    if (managementMethod === 'batch') {
      // Mode batch : calculer à partir des batches
      const batchesResult = await this.databaseService.query(
        `SELECT 
          COALESCE(SUM(total_count), 0) as nombre_animaux,
          COALESCE(SUM(average_weight_kg * total_count), 0) as poids_total
        FROM batches
        WHERE projet_id = $1`,
        [projetId]
      );
      nombreAnimaux = parseInt(batchesResult.rows[0]?.nombre_animaux || '0');
      poidsTotal = parseFloat(batchesResult.rows[0]?.poids_total || '0');
      poidsMoyen = nombreAnimaux > 0 ? poidsTotal / nombreAnimaux : 0;
    } else {
      // Mode individuel : calculer à partir des animaux individuels
      // Calculer le poids total réel (somme des poids) au lieu de moyenne * nombre
      const animauxResult = await this.databaseService.query(
        `SELECT 
          COUNT(*) as count,
          COALESCE(SUM(p.poids_kg), 0) as poids_total,
          COALESCE(AVG(p.poids_kg), 0) as poids_moyen
        FROM production_animaux a
        LEFT JOIN (
          SELECT animal_id, poids_kg, ROW_NUMBER() OVER (PARTITION BY animal_id ORDER BY date DESC) as rn
          FROM production_pesees
        ) p ON a.id = p.animal_id AND p.rn = 1
        WHERE a.projet_id = $1 AND a.statut = 'actif'`,
        [projetId]
      );
      nombreAnimaux = parseInt(animauxResult.rows[0]?.count || '0');
      poidsTotal = parseFloat(animauxResult.rows[0]?.poids_total || '0');
      poidsMoyen = parseFloat(animauxResult.rows[0]?.poids_moyen || '0');
      
      // Si aucun poids n'est enregistré, utiliser le poids moyen du projet comme fallback
      if (poidsTotal === 0 && nombreAnimaux > 0) {
        const projetPoidsMoyen = await this.databaseService.query(
          'SELECT poids_moyen_actuel FROM projets WHERE id = $1',
          [projetId]
        );
        const poidsMoyenProjet = parseFloat(projetPoidsMoyen.rows[0]?.poids_moyen_actuel || '0');
        if (poidsMoyenProjet > 0) {
          poidsTotal = nombreAnimaux * poidsMoyenProjet;
          poidsMoyen = poidsMoyenProjet;
        }
      }
    }

    // Valeur du cheptel = poids total * prix au kg vif
    const valeurCheptel = poidsTotal * prixKgVif;

    // Valeur des stocks
    const stocksResult = await this.databaseService.query(
      `SELECT COALESCE(SUM(s.quantite_actuelle * COALESCE(i.prix_unitaire, 0)), 0) as valeur_totale
       FROM stocks_aliments s
       LEFT JOIN ingredients i ON s.nom = i.nom
       WHERE s.projet_id = $1`,
      [projetId]
    );
    const valeurStocks = parseFloat(stocksResult.rows[0]?.valeur_totale || '0');

    // 6. CALCULS FINANCIERS
    const totalDepenses = totalDepensesOpex + totalChargesFixes;
    const solde = totalRevenus - totalDepenses;
    const margeBrute = totalRevenus - totalDepensesOpex;
    const cashFlow = solde - totalInteretsMensuels * nombreMois;
    const totalActifs = valeurCheptel + valeurStocks;
    const tauxEndettement = totalActifs > 0 ? (totalDettes / totalActifs) * 100 : 0;
    const ratioRentabilite = totalRevenus > 0 ? (solde / totalRevenus) * 100 : 0;

    // 7. KG VENDUS (pour coût/kg)
    // Filtrer uniquement les revenus de catégorie 'vente_porc' pour la période
    const ventesPorc = revenusPeriode.filter((r) => r.categorie === 'vente_porc');
    
    // Calculer le total kg vendus : utiliser le poids si disponible, sinon approximation
    let totalKgVendus = 0;
    let totalKgVendusEstime = false;
    let totalKgVendusReel = 0;
    let totalKgVendusApprox = 0;
    
    for (const vente of ventesPorc) {
      if (vente.poids_kg && vente.poids_kg > 0) {
        // Poids disponible : utiliser la valeur réelle
        totalKgVendusReel += vente.poids_kg;
      } else {
        // Poids non disponible : approximation = revenu / prix_kg_vif
        if (prixKgVif > 0) {
          const kgApprox = vente.montant / prixKgVif;
          totalKgVendusApprox += kgApprox;
          totalKgVendusEstime = true; // Au moins une vente utilise l'approximation
        }
      }
    }
    
    totalKgVendus = totalKgVendusReel + totalKgVendusApprox;
    const coutKgOpex = totalKgVendus > 0 ? totalDepensesOpex / totalKgVendus : 0;

    return {
      periode: {
        date_debut: debut.toISOString(),
        date_fin: fin.toISOString(),
        nombre_mois: nombreMois,
      },
      revenus: {
        total: totalRevenus,
        par_categorie: revenusParCategorie,
        nombre_transactions: revenusPeriode.length,
      },
      depenses: {
        opex_total: totalDepensesOpex,
        charges_fixes_total: totalChargesFixes,
        total: totalDepenses,
        par_categorie: depensesParCategorie,
        nombre_transactions: depensesOpex.length,
      },
      dettes: {
        total: totalDettes,
        nombre: dettesEnCours.length,
        interets_mensuels: totalInteretsMensuels,
        liste: dettesEnCours.map((d) => ({
          id: d.id,
          libelle: d.libelle,
          montant_restant: d.montant_restant,
          date_echeance: d.date_echeance,
          taux_interet: d.taux_interet,
        })),
      },
      actifs: {
        valeur_cheptel: valeurCheptel,
        valeur_stocks: valeurStocks,
        total: totalActifs,
        nombre_animaux: nombreAnimaux,
        poids_moyen_cheptel: poidsMoyen,
      },
      resultats: {
        solde: solde,
        marge_brute: margeBrute,
        cash_flow: cashFlow,
      },
      indicateurs: {
        taux_endettement: tauxEndettement,
        ratio_rentabilite: ratioRentabilite,
        cout_kg_opex: coutKgOpex,
        total_kg_vendus: totalKgVendus,
        total_kg_vendus_estime: totalKgVendusEstime,
      },
    };
  }

  // ==================== VENTE DE PORCS AVEC VALIDATION STRICTE ====================

  /**
   * Crée une vente de porc avec validation stricte des sujets vendus
   * Met à jour automatiquement le cheptel (statut "vendu", date_vente)
   */
  async createVentePorc(createVentePorcDto: CreateVentePorcDto, userId: string) {
    await this.checkProjetOwnership(createVentePorcDto.projet_id, userId);

    // 1. VALIDATION : Vérifier que les sujets sont identifiés
    const hasAnimalIds = createVentePorcDto.animal_ids && createVentePorcDto.animal_ids.length > 0;
    const hasBatchId = createVentePorcDto.batch_id && createVentePorcDto.quantite && createVentePorcDto.quantite > 0;

    if (!hasAnimalIds && !hasBatchId) {
      throw new BadRequestException(
        'Pour enregistrer une vente, vous devez obligatoirement identifier les porcs vendus : ' +
        'en mode suivi individuel, fournissez les IDs des animaux (animal_ids), ' +
        'ou en mode élevage en bande, fournissez la loge (batch_id) et la quantité (quantite).'
      );
    }

    // 2. Récupérer le mode de gestion du projet
    const projetResult = await this.databaseService.query(
      'SELECT management_method FROM projets WHERE id = $1',
      [createVentePorcDto.projet_id]
    );

    if (projetResult.rows.length === 0) {
      throw new NotFoundException('Projet introuvable');
    }

    const managementMethod = projetResult.rows[0].management_method || 'individual';

    // 3. VALIDATION ET MISE À JOUR DU CHEPTEL selon le mode
    let animalIdsToUpdate: string[] = [];
    let totalPoidsKg = createVentePorcDto.poids_kg || 0;

    if (managementMethod === 'individual' || hasAnimalIds) {
      // MODE INDIVIDUEL : Vérifier que les animaux existent et sont actifs
      if (!hasAnimalIds) {
        throw new BadRequestException(
          'En mode suivi individuel, vous devez fournir les IDs des animaux vendus (animal_ids).'
        );
      }

      // Vérifier que tous les animaux existent, sont actifs et appartiennent au projet
      const animauxResult = await this.databaseService.query(
        `SELECT id, code, statut, projet_id, poids_kg 
         FROM production_animaux 
         WHERE id = ANY($1::varchar[]) AND projet_id = $2`,
        [createVentePorcDto.animal_ids, createVentePorcDto.projet_id]
      );

      if (animauxResult.rows.length !== createVentePorcDto.animal_ids.length) {
        throw new BadRequestException(
          'Certains animaux spécifiés n\'existent pas ou n\'appartiennent pas à ce projet.'
        );
      }

      // Vérifier que tous les animaux sont actifs
      const animauxInactifs = animauxResult.rows.filter((a) => a.statut !== 'actif');
      if (animauxInactifs.length > 0) {
        const codesInactifs = animauxInactifs.map((a) => a.code).join(', ');
        throw new BadRequestException(
          `Les animaux suivants ne sont pas actifs et ne peuvent pas être vendus : ${codesInactifs}`
        );
      }

      animalIdsToUpdate = createVentePorcDto.animal_ids;

      // Calculer le poids total si non fourni
      if (!createVentePorcDto.poids_kg || createVentePorcDto.poids_kg === 0) {
        const poidsResult = await this.databaseService.query(
          `SELECT COALESCE(SUM(p.poids_kg), 0) as poids_total
           FROM (
             SELECT DISTINCT ON (animal_id) poids_kg
             FROM production_pesees
             WHERE animal_id = ANY($1::varchar[])
             ORDER BY animal_id, date DESC
           ) p`,
          [animalIdsToUpdate]
        );
        totalPoidsKg = parseFloat(poidsResult.rows[0]?.poids_total) || 0;
      }
    } else if (managementMethod === 'batch' || hasBatchId) {
      // MODE BANDE : Vérifier que la bande existe et a assez de porcs
      if (!hasBatchId) {
        throw new BadRequestException(
          'En mode élevage en bande, vous devez fournir la loge (batch_id) et la quantité (quantite).'
        );
      }

      // Vérifier que la bande existe et appartient au projet
      const batchResult = await this.databaseService.query(
        `SELECT b.id, b.total_count, b.projet_id, b.pen_name
         FROM batches b
         WHERE b.id = $1 AND b.projet_id = $2`,
        [createVentePorcDto.batch_id, createVentePorcDto.projet_id]
      );

      if (batchResult.rows.length === 0) {
        throw new NotFoundException('Bande/loge introuvable ou n\'appartient pas à ce projet.');
      }

      const batch = batchResult.rows[0];
      if (createVentePorcDto.quantite > batch.total_count) {
        throw new BadRequestException(
          `La bande "${batch.pen_name}" ne contient que ${batch.total_count} porc(s), ` +
          `impossible de vendre ${createVentePorcDto.quantite} porc(s).`
        );
      }

      // Sélectionner les porcs les plus lourds pour la vente
      const pigsResult = await this.databaseService.query(
        `SELECT id, current_weight_kg
         FROM batch_pigs
         WHERE batch_id = $1
         ORDER BY current_weight_kg DESC
         LIMIT $2`,
        [createVentePorcDto.batch_id, createVentePorcDto.quantite]
      );

      if (pigsResult.rows.length < createVentePorcDto.quantite) {
        throw new BadRequestException(
          `Seulement ${pigsResult.rows.length} porc(s) disponible(s) dans la bande pour la vente.`
        );
      }

      animalIdsToUpdate = pigsResult.rows.map((row) => row.id);

      // Calculer le poids total si non fourni
      if (!createVentePorcDto.poids_kg || createVentePorcDto.poids_kg === 0) {
        totalPoidsKg = pigsResult.rows.reduce(
          (sum, row) => sum + (parseFloat(row.current_weight_kg) || 0),
          0
        );
      }

      // Supprimer les porcs de batch_pigs (le trigger mettra à jour total_count)
      await this.databaseService.query(
        `DELETE FROM batch_pigs WHERE id = ANY($1::varchar[])`,
        [animalIdsToUpdate]
      );
    }

    // 4. Mettre à jour le cheptel : marquer les animaux comme "vendu"
    const dateVente = createVentePorcDto.date || new Date().toISOString();

    if (managementMethod === 'individual' || hasAnimalIds) {
      // Mode individuel : mettre à jour production_animaux
      await this.databaseService.query(
        `UPDATE production_animaux
         SET statut = 'vendu',
             date_vente = $1,
             actif = false
         WHERE id = ANY($2::varchar[])`,
        [dateVente, animalIdsToUpdate]
      );
    }

    // 5. Créer le revenu
    const revenuId = this.generateRevenuId();
    const now = new Date().toISOString();

    // Compresser les images avant stockage
    const compressedPhotos = await compressImagesArray(
      createVentePorcDto.photos,
      this.imageService,
      { maxWidth: 1920, maxHeight: 1920, quality: 80 }
    );

    const description =
      createVentePorcDto.description ||
      (managementMethod === 'batch'
        ? `Vente de ${createVentePorcDto.quantite} porc(s) depuis la bande ${createVentePorcDto.batch_id}`
        : `Vente de ${animalIdsToUpdate.length} porc(s)`);

    const result = await this.databaseService.query(
      `INSERT INTO revenus (
        id, projet_id, montant, categorie, libelle_categorie, date,
        description, commentaire, photos, poids_kg, animal_id,
        date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        revenuId,
        createVentePorcDto.projet_id,
        createVentePorcDto.montant,
        'vente_porc',
        'Vente de porcs',
        dateVente,
        description,
        createVentePorcDto.commentaire || null,
        this.stringifyArray(compressedPhotos),
        totalPoidsKg > 0 ? totalPoidsKg : null,
        managementMethod === 'individual' && animalIdsToUpdate.length === 1
          ? animalIdsToUpdate[0]
          : null, // animal_id pour un seul animal en mode individuel
        now,
        now,
      ]
    );

    const revenu = this.mapRowToRevenu(result.rows[0]);

    // 6. Retourner le résultat avec les informations de mise à jour
    return {
      ...revenu,
      animaux_vendus: animalIdsToUpdate.length,
      animal_ids: animalIdsToUpdate,
      batch_id: createVentePorcDto.batch_id || null,
      quantite: createVentePorcDto.quantite || null,
      message: `Vente enregistrée avec succès. ${animalIdsToUpdate.length} porc(s) retiré(s) du cheptel actif.`,
    };
  }
}
