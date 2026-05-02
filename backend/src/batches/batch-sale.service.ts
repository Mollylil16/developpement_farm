import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class BatchSaleService {
  constructor(private db: DatabaseService) {}

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
   * Génère un ID pour un mouvement
   */
  private generateMovementId(): string {
    return `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sélectionne automatiquement les porcs les plus lourds pour la vente
   */
  private async selectPigsForSale(
    batchId: string,
    count: number,
  ): Promise<string[]> {
    const result = await this.db.query(
      `SELECT id 
       FROM batch_pigs 
       WHERE batch_id = $1 
       ORDER BY current_weight_kg DESC
       LIMIT $2`,
      [batchId, count],
    );

    return result.rows.map((row) => row.id);
  }

  /**
   * Crée une vente pour une bande
   */
  async createSale(dto: CreateSaleDto, userId: string): Promise<any> {
    await this.checkBatchOwnership(dto.batch_id, userId);

    // Vérifier que la bande a assez de porcs
    const batchResult = await this.db.query(
      'SELECT total_count, projet_id FROM batches WHERE id = $1',
      [dto.batch_id],
    );
    if (batchResult.rows.length === 0) {
      throw new NotFoundException('Bande non trouvée');
    }
    const batch = batchResult.rows[0];
    const totalCount = batch.total_count;
    if (dto.count > totalCount) {
      throw new BadRequestException(
        `La bande ne contient que ${totalCount} porc(s), impossible de vendre ${dto.count}`,
      );
    }

    // Sélectionner les porcs à vendre (les plus lourds)
    const pigIds = await this.selectPigsForSale(dto.batch_id, dto.count);

    if (pigIds.length === 0) {
      throw new BadRequestException('Aucun porc disponible pour la vente');
    }

    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pricePerKg = dto.price_per_kg || dto.total_price / dto.total_weight_kg;

    // Créer l'enregistrement de vente
    await this.db.query(
      `INSERT INTO batch_sales (
        id, batch_id, sale_date, buyer_name, buyer_contact,
        sold_pigs, count, total_weight_kg, price_per_kg, total_price, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        saleId,
        dto.batch_id,
        dto.sale_date,
        dto.buyer_name || null,
        dto.buyer_contact || null,
        JSON.stringify(pigIds),
        pigIds.length,
        dto.total_weight_kg,
        pricePerKg,
        dto.total_price,
        dto.notes || null,
      ],
    );

    // Créer les mouvements de retrait pour chaque porc
    const movements = [];
    for (const pigId of pigIds) {
      const movementId = this.generateMovementId();
      await this.db.query(
        `INSERT INTO batch_pig_movements (
          id, pig_id, movement_type, from_batch_id, removal_reason,
          sale_price, sale_weight_kg, buyer_name, movement_date, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          movementId,
          pigId,
          'removal',
          dto.batch_id,
          'sale',
          dto.total_price / pigIds.length, // Prix approximatif par porc
          dto.total_weight_kg / pigIds.length, // Poids approximatif par porc
          dto.buyer_name || null,
          dto.sale_date,
          dto.notes || null,
        ],
      );
      movements.push(movementId);
    }

    // Supprimer les porcs de batch_pigs
    // Le trigger update_batch_counts() mettra automatiquement à jour total_count, donc pas besoin de le faire manuellement
    await this.db.query(
      `DELETE FROM batch_pigs 
       WHERE id = ANY($1::varchar[])`,
      [pigIds],
    );

    // Créer un revenu dans la table revenus pour la comptabilité
    const revenuId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db.query(
      `INSERT INTO revenus (
        id, projet_id, montant, date, categorie, libelle_categorie,
        description, poids_kg, commentaire
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        revenuId,
        batch.projet_id,
        dto.total_price,
        dto.sale_date,
        'vente_porc',
        'Vente de porcs',
        `Vente de ${pigIds.length} porc(s) - ${dto.buyer_name || 'Acheteur non spécifié'}`,
        dto.total_weight_kg,
        dto.notes || null,
      ],
    );

    // Récupérer l'enregistrement de vente créé
    const saleResult = await this.db.query(
      'SELECT * FROM batch_sales WHERE id = $1',
      [saleId],
    );

    return {
      ...saleResult.rows[0],
      revenu_id: revenuId,
    };
  }

  /**
   * Récupère l'historique des ventes pour une bande
   */
  async getSaleHistory(batchId: string, userId: string): Promise<any[]> {
    await this.checkBatchOwnership(batchId, userId);

    const result = await this.db.query(
      `SELECT * 
       FROM batch_sales
       WHERE batch_id = $1
       ORDER BY sale_date DESC
       LIMIT 50`,
      [batchId],
    );

    return result.rows;
  }
}

