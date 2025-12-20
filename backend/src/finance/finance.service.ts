import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateChargeFixeDto } from './dto/create-charge-fixe.dto';
import { UpdateChargeFixeDto } from './dto/update-charge-fixe.dto';
import { CreateDepensePonctuelleDto } from './dto/create-depense-ponctuelle.dto';
import { UpdateDepensePonctuelleDto } from './dto/update-depense-ponctuelle.dto';
import { CreateRevenuDto } from './dto/create-revenu.dto';
import { UpdateRevenuDto } from './dto/update-revenu.dto';

@Injectable()
export class FinanceService {
  constructor(private databaseService: DatabaseService) {}

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
    if (result.rows[0].proprietaire_id !== userId) {
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

    const result = await this.databaseService.query(
      `SELECT * FROM charges_fixes 
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
        this.stringifyArray(createDepensePonctuelleDto.photos),
        now,
        now,
      ]
    );

    return this.mapRowToDepensePonctuelle(result.rows[0]);
  }

  async findAllDepensesPonctuelles(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM depenses_ponctuelles 
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
      fields.push(`photos = $${paramIndex}`);
      values.push(this.stringifyArray(updateDepensePonctuelleDto.photos));
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
        this.stringifyArray(createRevenuDto.photos),
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

    const result = await this.databaseService.query(
      `SELECT * FROM revenus 
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
      fields.push(`photos = $${paramIndex}`);
      values.push(this.stringifyArray(updateRevenuDto.photos));
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

  async calculerMargesVente(venteId: string, poidsKg: number, userId: string) {
    const vente = await this.findOneRevenu(venteId, userId);
    if (!vente) {
      throw new NotFoundException('Vente introuvable');
    }

    // Récupérer les coûts OPEX et complets depuis le projet
    const projetResult = await this.databaseService.query(
      `SELECT prix_kg_vif, prix_kg_carcasse FROM projets WHERE id = $1`,
      [vente.projet_id]
    );
    const projet = projetResult.rows[0];

    // Calculer les prix par kg
    const prixKgVif = vente.montant / poidsKg;
    const prixKgCarcasse = projet?.prix_kg_carcasse || prixKgVif * 0.75;

    // Calculer les coûts
    const coutReelOpex = (vente.cout_kg_opex || 0) * poidsKg;
    const coutReelComplet = (vente.cout_kg_complet || 0) * poidsKg;

    // Calculer les marges
    const margeOpex = vente.montant - coutReelOpex;
    const margeComplete = vente.montant - coutReelComplet;
    const margeOpexPourcent = vente.montant > 0 ? (margeOpex / vente.montant) * 100 : 0;
    const margeCompletePourcent = vente.montant > 0 ? (margeComplete / vente.montant) * 100 : 0;

    // Mettre à jour le revenu avec le poids et les marges calculées
    const result = await this.databaseService.query(
      `UPDATE revenus 
       SET poids_kg = $1, 
           cout_reel_opex = $2,
           cout_reel_complet = $3,
           marge_opex = $4,
           marge_complete = $5,
           marge_opex_pourcent = $6,
           marge_complete_pourcent = $7,
           derniere_modification = $8
       WHERE id = $9
       RETURNING *`,
      [
        poidsKg,
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
    userId: string
  ) {
    await this.checkProjetOwnership(projetId, userId);

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
    const depensesResult = await this.databaseService.query(
      `SELECT * FROM depenses_ponctuelles 
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

    // 3. Calculer le total OPEX de la période
    const dateDebutObj = new Date(dateDebut);
    const dateFinObj = new Date(dateFin);

    const depensesOpex = depenses.filter(
      (d) => !d.type_opex_capex || d.type_opex_capex.toLowerCase() === 'opex'
    );
    const totalOpex = depensesOpex
      .filter((d) => {
        const dateDepense = new Date(d.date);
        return dateDepense >= dateDebutObj && dateDepense <= dateFinObj;
      })
      .reduce((sum, d) => sum + d.montant, 0);

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
}
