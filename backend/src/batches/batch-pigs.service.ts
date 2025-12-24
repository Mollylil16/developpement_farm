import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateBatchPigDto,
  TransferPigDto,
  RemovePigDto,
  CreateBatchWithPigsDto,
} from './dto';

@Injectable()
export class BatchPigsService {
  constructor(private db: DatabaseService) {}

  /**
   * Génère un ID comme le frontend : pig_${Date.now()}_${random}
   */
  private generatePigId(): string {
    return `pig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID pour un mouvement : mov_${Date.now()}_${random}
   */
  private generateMovementId(): string {
    return `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Génère un ID pour une bande : batch_${Date.now()}_${random}
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Vérifie que la bande appartient au projet de l'utilisateur
   */
  private async checkBatchOwnership(
    batchId: string,
    userId: string,
  ): Promise<void> {
    const result = await this.db.query(
      `SELECT b.projet_id, p.proprietaire_id 
       FROM batches b
       JOIN projets p ON b.projet_id = p.id
       WHERE b.id = $1`,
      [batchId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Bande non trouvée');
    }
    if (result.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Cette bande ne vous appartient pas');
    }
  }

  /**
   * Mapper une ligne de la base de données vers un objet BatchPig
   */
  private mapRowToPig(row: any): any {
    return {
      id: row.id,
      batch_id: row.batch_id,
      name: row.name || undefined,
      sex: row.sex,
      birth_date: row.birth_date || undefined,
      age_months: row.age_months ? parseFloat(row.age_months) : undefined,
      current_weight_kg: parseFloat(row.current_weight_kg),
      origin: row.origin,
      origin_details: row.origin_details || undefined,
      supplier_name: row.supplier_name || undefined,
      purchase_price: row.purchase_price
        ? parseFloat(row.purchase_price)
        : undefined,
      health_status: row.health_status || 'healthy',
      last_vaccination_date: row.last_vaccination_date || undefined,
      notes: row.notes || undefined,
      photo_url: row.photo_url || undefined,
      entry_date: row.entry_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Mapper une ligne de mouvement vers un objet BatchPigMovement
   */
  private mapRowToMovement(row: any): any {
    return {
      id: row.id,
      pig_id: row.pig_id,
      movement_type: row.movement_type,
      from_batch_id: row.from_batch_id || undefined,
      to_batch_id: row.to_batch_id || undefined,
      removal_reason: row.removal_reason || undefined,
      removal_details: row.removal_details || undefined,
      sale_price: row.sale_price ? parseFloat(row.sale_price) : undefined,
      sale_weight_kg: row.sale_weight_kg
        ? parseFloat(row.sale_weight_kg)
        : undefined,
      buyer_name: row.buyer_name || undefined,
      death_cause: row.death_cause || undefined,
      veterinary_report: row.veterinary_report || undefined,
      movement_date: row.movement_date,
      notes: row.notes || undefined,
      created_at: row.created_at,
    };
  }

  /**
   * Ajouter un porc à une bande
   */
  async addPigToBatch(
    dto: CreateBatchPigDto,
    userId: string,
  ): Promise<any> {
    // Vérifier que la bande existe et appartient à l'utilisateur
    await this.checkBatchOwnership(dto.batch_id, userId);

    const pigId = this.generatePigId();
    const entryDate = dto.entry_date ? new Date(dto.entry_date) : new Date();

    // Insérer le porc
    await this.db.query(
      `INSERT INTO batch_pigs (
        id, batch_id, name, sex, birth_date, age_months, current_weight_kg,
        origin, origin_details, supplier_name, purchase_price, health_status,
        notes, photo_url, entry_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
      [
        pigId,
        dto.batch_id,
        dto.name || null,
        dto.sex,
        dto.birth_date ? new Date(dto.birth_date).toISOString() : null,
        dto.age_months || null,
        dto.current_weight_kg,
        dto.origin,
        dto.origin_details || null,
        dto.supplier_name || null,
        dto.purchase_price || null,
        'healthy',
        dto.notes || null,
        dto.photo_url || null,
        entryDate.toISOString().split('T')[0],
      ],
    );

    // Enregistrer mouvement d'entrée
    const movementId = this.generateMovementId();
    await this.db.query(
      `INSERT INTO batch_pig_movements (
        id, pig_id, movement_type, to_batch_id, movement_date, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        movementId,
        pigId,
        'entry',
        dto.batch_id,
        entryDate.toISOString().split('T')[0],
        `Ajout: ${dto.origin}`,
      ],
    );

    // Les triggers mettront à jour automatiquement les compteurs de la bande

    // Retourner le porc créé
    const result = await this.db.query(
      'SELECT * FROM batch_pigs WHERE id = $1',
      [pigId],
    );
    return this.mapRowToPig(result.rows[0]);
  }

  /**
   * Transférer un porc vers une autre bande
   */
  async transferPig(dto: TransferPigDto, userId: string): Promise<any> {
    // Vérifier que le porc existe
    const pigResult = await this.db.query(
      'SELECT * FROM batch_pigs WHERE id = $1',
      [dto.pig_id],
    );
    if (pigResult.rows.length === 0) {
      throw new NotFoundException('Porc non trouvé');
    }

    const pig = this.mapRowToPig(pigResult.rows[0]);

    // Vérifier que from_batch correspond
    if (pig.batch_id !== dto.from_batch_id) {
      throw new BadRequestException(
        "Le porc n'appartient pas à la bande source",
      );
    }

    // Vérifier que les deux bandes appartiennent à l'utilisateur
    await this.checkBatchOwnership(dto.from_batch_id, userId);
    await this.checkBatchOwnership(dto.to_batch_id, userId);

    // Vérifier que la bande destination existe
    const toBatchResult = await this.db.query(
      'SELECT * FROM batches WHERE id = $1',
      [dto.to_batch_id],
    );
    if (toBatchResult.rows.length === 0) {
      throw new NotFoundException('Bande de destination non trouvée');
    }

    // Mettre à jour le batch_id du porc
    await this.db.query(
      'UPDATE batch_pigs SET batch_id = $1, updated_at = NOW() WHERE id = $2',
      [dto.to_batch_id, dto.pig_id],
    );

    // Enregistrer mouvement de transfert
    const movementId = this.generateMovementId();
    await this.db.query(
      `INSERT INTO batch_pig_movements (
        id, pig_id, movement_type, from_batch_id, to_batch_id, movement_date, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        movementId,
        dto.pig_id,
        'transfer',
        dto.from_batch_id,
        dto.to_batch_id,
        new Date().toISOString().split('T')[0],
        dto.notes || null,
      ],
    );

    // Les triggers mettront à jour les compteurs des deux bandes

    // Retourner le porc mis à jour
    const updatedResult = await this.db.query(
      'SELECT * FROM batch_pigs WHERE id = $1',
      [dto.pig_id],
    );
    return this.mapRowToPig(updatedResult.rows[0]);
  }

  /**
   * Retirer un porc (vente, mort, don, etc.)
   */
  async removePig(dto: RemovePigDto, userId: string): Promise<void> {
    // Vérifier que le porc existe et appartient à l'utilisateur
    const pigResult = await this.db.query(
      `SELECT p.*, b.projet_id, pr.proprietaire_id 
       FROM batch_pigs p
       JOIN batches b ON p.batch_id = b.id
       JOIN projets pr ON b.projet_id = pr.id
       WHERE p.id = $1`,
      [dto.pig_id],
    );
    if (pigResult.rows.length === 0) {
      throw new NotFoundException('Porc non trouvé');
    }
    if (pigResult.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Ce porc ne vous appartient pas');
    }

    const pig = this.mapRowToPig(pigResult.rows[0]);
    const removalDate = dto.removal_date
      ? new Date(dto.removal_date)
      : new Date();

    // Enregistrer mouvement de retrait
    const movementId = this.generateMovementId();
    await this.db.query(
      `INSERT INTO batch_pig_movements (
        id, pig_id, movement_type, from_batch_id, removal_reason, removal_details,
        sale_price, sale_weight_kg, buyer_name, death_cause, veterinary_report,
        movement_date, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
      [
        movementId,
        dto.pig_id,
        'removal',
        pig.batch_id,
        dto.removal_reason,
        dto.removal_details || null,
        dto.sale_price || null,
        dto.sale_weight_kg || null,
        dto.buyer_name || null,
        dto.death_cause || null,
        dto.veterinary_report || null,
        removalDate.toISOString().split('T')[0],
        dto.notes || null,
      ],
    );

    // Supprimer le porc
    await this.db.query('DELETE FROM batch_pigs WHERE id = $1', [
      dto.pig_id,
    ]);

    // Le trigger mettra à jour les compteurs de la bande
  }

  /**
   * Obtenir tous les porcs d'une bande
   */
  async getPigsByBatch(batchId: string, userId: string): Promise<any[]> {
    // Vérifier la propriété
    await this.checkBatchOwnership(batchId, userId);

    const result = await this.db.query(
      'SELECT * FROM batch_pigs WHERE batch_id = $1 ORDER BY entry_date DESC',
      [batchId],
    );

    return result.rows.map((row) => this.mapRowToPig(row));
  }

  /**
   * Obtenir l'historique des mouvements d'un porc
   */
  async getPigMovements(pigId: string, userId: string): Promise<any[]> {
    // Vérifier que le porc existe et appartient à l'utilisateur
    const pigResult = await this.db.query(
      `SELECT p.*, b.projet_id, pr.proprietaire_id 
       FROM batch_pigs p
       JOIN batches b ON p.batch_id = b.id
       JOIN projets pr ON b.projet_id = pr.id
       WHERE p.id = $1`,
      [pigId],
    );
    if (pigResult.rows.length === 0) {
      throw new NotFoundException('Porc non trouvé');
    }
    if (pigResult.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Ce porc ne vous appartient pas');
    }

    const result = await this.db.query(
      'SELECT * FROM batch_pig_movements WHERE pig_id = $1 ORDER BY movement_date DESC, created_at DESC',
      [pigId],
    );

    return result.rows.map((row) => this.mapRowToMovement(row));
  }

  /**
   * Obtenir toutes les bandes d'un projet
   */
  async getAllBatchesByProjet(projetId: string, userId: string): Promise<any[]> {
    // Vérifier que le projet appartient à l'utilisateur
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.db.query(
      'SELECT * FROM batches WHERE projet_id = $1 ORDER BY batch_creation_date DESC, created_at DESC',
      [projetId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      projet_id: row.projet_id,
      pen_name: row.pen_name,
      category: row.category,
      total_count: parseInt(row.total_count),
      male_count: parseInt(row.male_count),
      female_count: parseInt(row.female_count),
      castrated_count: parseInt(row.castrated_count),
      average_age_months: parseFloat(row.average_age_months),
      average_weight_kg: parseFloat(row.average_weight_kg),
      batch_creation_date: row.batch_creation_date,
      expected_sale_date: row.expected_sale_date || undefined,
      notes: row.notes || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Obtenir statistiques d'une bande
   */
  async getBatchStats(batchId: string, userId: string): Promise<any> {
    // Vérifier la propriété
    await this.checkBatchOwnership(batchId, userId);

    const pigs = await this.getPigsByBatch(batchId, userId);

    const bySex = {
      male: pigs.filter((p) => p.sex === 'male').length,
      female: pigs.filter((p) => p.sex === 'female').length,
      castrated: pigs.filter((p) => p.sex === 'castrated').length,
    };

    const byHealth = {
      healthy: pigs.filter((p) => p.health_status === 'healthy').length,
      sick: pigs.filter((p) => p.health_status === 'sick').length,
      treatment: pigs.filter((p) => p.health_status === 'treatment').length,
      quarantine: pigs.filter((p) => p.health_status === 'quarantine').length,
    };

    const totalWeight = pigs.reduce(
      (sum, p) => sum + p.current_weight_kg,
      0,
    );
    const averageWeight = pigs.length > 0 ? totalWeight / pigs.length : 0;

    const totalAge = pigs.reduce(
      (sum, p) => sum + (p.age_months || 0),
      0,
    );
    const averageAge = pigs.length > 0 ? totalAge / pigs.length : 0;

    return {
      total: pigs.length,
      by_sex: bySex,
      by_health: byHealth,
      average_weight: averageWeight,
      average_age: averageAge,
    };
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur
   */
  private async checkProjetOwnership(
    projetId: string,
    userId: string,
  ): Promise<void> {
    const result = await this.db.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [projetId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Projet non trouvé');
    }
    if (result.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  /**
   * Créer une loge avec ou sans population initiale
   */
  async createBatchWithPigs(
    dto: CreateBatchWithPigsDto,
    userId: string,
  ): Promise<any> {
    // Vérifier que le projet appartient à l'utilisateur
    await this.checkProjetOwnership(dto.projet_id, userId);

    // Calculer le total de population
    const totalCount = dto.population
      ? dto.population.male_count +
        dto.population.female_count +
        dto.population.castrated_count
      : 0;

    // Validation : Si population fournie, âge et poids OBLIGATOIRES
    if (totalCount > 0) {
      if (!dto.average_age_months || dto.average_age_months <= 0) {
        throw new BadRequestException(
          "L'âge moyen est requis pour une loge avec population",
        );
      }
      if (!dto.average_weight_kg || dto.average_weight_kg <= 0) {
        throw new BadRequestException(
          'Le poids moyen est requis pour une loge avec population',
        );
      }
    }

    const batchId = this.generateBatchId();
    const now = new Date().toISOString();

    // Créer la bande
    await this.db.query(
      `INSERT INTO batches (
        id, projet_id, pen_name, category, total_count, male_count, female_count,
        castrated_count, average_age_months, average_weight_kg, batch_creation_date,
        notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        batchId,
        dto.projet_id,
        dto.pen_name,
        dto.category,
        totalCount,
        dto.population?.male_count || 0,
        dto.population?.female_count || 0,
        dto.population?.castrated_count || 0,
        dto.average_age_months || 0,
        dto.average_weight_kg || 0,
        now.split('T')[0],
        dto.notes || null,
        now,
        now,
      ],
    );

    // Si population fournie, créer les sujets individuels
    if (totalCount > 0 && dto.population && dto.average_age_months && dto.average_weight_kg) {
      await this.createIndividualPigs(
        batchId,
        dto.population,
        dto.average_age_months,
        dto.average_weight_kg,
      );
    }

    // Retourner la bande créée
    const result = await this.db.query('SELECT * FROM batches WHERE id = $1', [
      batchId,
    ]);

    return {
      id: result.rows[0].id,
      projet_id: result.rows[0].projet_id,
      pen_name: result.rows[0].pen_name,
      category: result.rows[0].category,
      total_count: parseInt(result.rows[0].total_count),
      male_count: parseInt(result.rows[0].male_count),
      female_count: parseInt(result.rows[0].female_count),
      castrated_count: parseInt(result.rows[0].castrated_count),
      average_age_months: parseFloat(result.rows[0].average_age_months),
      average_weight_kg: parseFloat(result.rows[0].average_weight_kg),
      batch_creation_date: result.rows[0].batch_creation_date,
      expected_sale_date: result.rows[0].expected_sale_date || undefined,
      notes: result.rows[0].notes || undefined,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at,
    };
  }

  /**
   * Créer les sujets individuels pour une bande
   */
  private async createIndividualPigs(
    batchId: string,
    population: {
      male_count: number;
      female_count: number;
      castrated_count: number;
    },
    averageAge: number,
    averageWeight: number,
  ): Promise<void> {
    const pigs: any[] = [];
    let pigIndex = 0;

    // Créer les mâles
    for (let i = 0; i < population.male_count; i++) {
      pigs.push(
        this.generatePig(batchId, 'male', averageAge, averageWeight, pigIndex++),
      );
    }

    // Créer les femelles
    for (let i = 0; i < population.female_count; i++) {
      pigs.push(
        this.generatePig(
          batchId,
          'female',
          averageAge,
          averageWeight,
          pigIndex++,
        ),
      );
    }

    // Créer les castrés
    for (let i = 0; i < population.castrated_count; i++) {
      pigs.push(
        this.generatePig(
          batchId,
          'castrated',
          averageAge,
          averageWeight,
          pigIndex++,
        ),
      );
    }

    // Insérer les porcs un par un (les triggers mettront à jour les compteurs)
    if (pigs.length > 0) {
      for (const pig of pigs) {
        await this.db.query(
          `INSERT INTO batch_pigs (
            id, batch_id, name, sex, birth_date, age_months, current_weight_kg,
            origin, origin_details, supplier_name, purchase_price, health_status,
            notes, photo_url, entry_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
          [
            pig.id,
            pig.batch_id,
            pig.name,
            pig.sex,
            pig.birth_date,
            pig.age_months,
            pig.current_weight_kg,
            pig.origin,
            pig.origin_details,
            pig.supplier_name,
            pig.purchase_price,
            pig.health_status,
            pig.notes,
            pig.photo_url,
            pig.entry_date,
          ],
        );

        // Enregistrer mouvement d'entrée
        const movementId = this.generateMovementId();
        await this.db.query(
          `INSERT INTO batch_pig_movements (
            id, pig_id, movement_type, to_batch_id, movement_date, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            movementId,
            pig.id,
            'entry',
            batchId,
            pig.entry_date,
            "Créé lors de l'initialisation de la bande",
          ],
        );
      }
    }
  }

  /**
   * Générer un sujet individuel avec variation autour de la moyenne
   */
  private generatePig(
    batchId: string,
    sex: 'male' | 'female' | 'castrated',
    averageAge: number,
    averageWeight: number,
    index: number,
  ): any {
    // Variation aléatoire ±10% pour simuler la diversité naturelle
    const ageVariation = averageAge * (0.9 + Math.random() * 0.2); // ±10%
    const weightVariation = averageWeight * (0.9 + Math.random() * 0.2); // ±10%

    return {
      id: `pig_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      batch_id: batchId,
      name: null,
      sex,
      birth_date: null,
      age_months: Math.round(ageVariation * 10) / 10, // Arrondir à 1 décimale
      current_weight_kg: Math.round(weightVariation * 10) / 10,
      origin: 'birth',
      origin_details: "Créé lors de l'initialisation de la bande",
      supplier_name: null,
      purchase_price: null,
      health_status: 'healthy',
      notes: null,
      photo_url: null,
      entry_date: new Date().toISOString().split('T')[0],
    };
  }
}

