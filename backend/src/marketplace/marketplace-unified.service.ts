import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateBatchListingDto } from './dto/create-batch-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

/**
 * Service unifié pour la gestion du marketplace
 * Gère de manière cohérente les modes d'élevage individuel et par bande
 */
@Injectable()
export class MarketplaceUnifiedService {
  private readonly logger = new Logger(MarketplaceUnifiedService.name);

  constructor(private databaseService: DatabaseService) {}

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Vérifie que l'utilisateur est propriétaire du projet
   */
  private async checkProjetOwnership(projetId: string, userId: string): Promise<void> {
    const result = await this.databaseService.query(
      'SELECT id FROM projets WHERE id = $1 AND proprietaire_id = $2',
      [projetId, userId]
    );

    if (result.rows.length === 0) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce projet');
    }
  }

  /**
   * Crée un listing unifié (individuel ou bande)
   * Cette méthode remplace createListing et createBatchListing
   */
  async createUnifiedListing(
    dto: CreateListingDto | CreateBatchListingDto,
    userId: string,
    listingType: 'individual' | 'batch'
  ) {
    try {
      // Vérification de propriété
      await this.checkProjetOwnership(dto.farmId, userId);

      // Validation commune
      if (!dto.pricePerKg || dto.pricePerKg <= 0) {
        throw new BadRequestException('Le prix au kg doit être supérieur à 0');
      }

      if (!dto.lastWeightDate) {
        throw new BadRequestException('La date de dernière pesée est requise');
      }

      if (!dto.location?.latitude || !dto.location?.longitude) {
        throw new BadRequestException('La localisation complète est requise');
      }

      // Branchement selon le type
      if (listingType === 'individual') {
        return await this.createIndividualListing(dto as CreateListingDto, userId);
      } else {
        return await this.createBatchListingUnified(dto as CreateBatchListingDto, userId);
      }
    } catch (error: any) {
      this.logger.error(`[createUnifiedListing] Erreur: ${error.message}`, {
        listingType,
        dto,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Crée un listing individuel
   */
  private async createIndividualListing(dto: CreateListingDto, userId: string) {
    // Vérifier que le sujet existe et appartient au projet
    const animal = await this.databaseService.query(
      'SELECT id, poids_actuel FROM production_animaux WHERE id = $1 AND projet_id = $2 AND statut = $3',
      [dto.subjectId, dto.farmId, 'actif']
    );

    if (animal.rows.length === 0) {
      throw new NotFoundException('Animal introuvable, inactif ou ne vous appartient pas');
    }

    // Vérifier qu'il n'y a pas déjà un listing actif
    const existingListing = await this.databaseService.query(
      `SELECT id FROM marketplace_listings 
       WHERE subject_id = $1 AND status IN ('available', 'reserved')`,
      [dto.subjectId]
    );

    if (existingListing.rows.length > 0) {
      throw new BadRequestException('Cet animal est déjà en vente sur le marketplace');
    }

    return await this.databaseService.transaction(async (client) => {
      const id = this.generateId('listing');
      const now = new Date().toISOString();
      const weight = parseFloat(dto.weight.toString());
      const pricePerKg = parseFloat(dto.pricePerKg.toString());
      const calculatedPrice = pricePerKg * weight;

      const defaultSaleTerms = {
        transport: 'buyer_responsibility',
        slaughter: 'buyer_responsibility',
        paymentTerms: 'on_delivery',
        warranty: 'Tous les documents sanitaires et certificats seront fournis.',
        cancellationPolicy: "Annulation possible jusqu'à 48h avant la date de livraison.",
      };

      // Insertion du listing
      const result = await client.query(
        `INSERT INTO marketplace_listings (
          id, listing_type, subject_id, producer_id, farm_id, 
          price_per_kg, weight, calculated_price, pig_count,
          status, listed_at, updated_at, last_weight_date,
          location_latitude, location_longitude, location_address, location_city, location_region,
          sale_terms, views, inquiries, date_creation, derniere_modification, pig_ids
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *`,
        [
          id,
          'individual',
          dto.subjectId,
          userId,
          dto.farmId,
          pricePerKg,
          weight,
          calculatedPrice,
          1, // pig_count = 1 pour individuel
          'available',
          now,
          now,
          dto.lastWeightDate,
          dto.location.latitude,
          dto.location.longitude,
          dto.location.address || dto.location.city || dto.location.region || 'Non spécifié',
          dto.location.city || 'Non spécifié',
          dto.location.region || 'Non spécifié',
          JSON.stringify(dto.saleTerms || defaultSaleTerms),
          0, // views
          0, // inquiries
          now,
          now,
          '[]', // pig_ids vide pour individuel
        ]
      );

      // Mettre à jour le statut marketplace de l'animal
      await client.query(
        `UPDATE production_animaux 
         SET marketplace_status = $1, marketplace_listing_id = $2 
         WHERE id = $3`,
        ['available', id, dto.subjectId]
      );

      this.logger.log(`[createIndividualListing] Listing créé: ${id} pour animal ${dto.subjectId}`);
      return this.mapRowToListing(result.rows[0]);
    });
  }

  /**
   * Crée un listing de bande (unifié)
   */
  private async createBatchListingUnified(dto: CreateBatchListingDto, userId: string) {
    try {
      // Vérifier que averageWeight est fourni
      if (!dto.averageWeight || dto.averageWeight <= 0) {
        throw new BadRequestException('Le poids moyen doit être supérieur à 0');
      }

      // Validation des champs requis
      if (!dto.batchId) {
        throw new BadRequestException('L\'ID de la bande est requis');
      }
      if (!dto.farmId) {
        throw new BadRequestException('L\'ID du projet/ferme est requis');
      }
      if (!dto.location?.latitude || !dto.location?.longitude) {
        throw new BadRequestException('La localisation complète (latitude et longitude) est requise');
      }
      if (!dto.lastWeightDate) {
        throw new BadRequestException('La date de dernière pesée est requise');
      }

    // Vérifier que la bande existe et appartient au projet
    const batch = await this.databaseService.query(
      `SELECT b.id, b.total_count, b.projet_id, b.average_weight_kg, b.category
       FROM batches b
       JOIN projets p ON b.projet_id = p.id
       WHERE b.id = $1 AND p.id = $2 AND p.proprietaire_id = $3`,
      [dto.batchId, dto.farmId, userId]
    );

    if (batch.rows.length === 0) {
      throw new NotFoundException('Bande introuvable ou ne vous appartient pas');
    }

    const batchData = batch.rows[0];
    const totalCount = parseInt(batchData.total_count) || 0;

    if (totalCount === 0) {
      throw new BadRequestException('Cette bande est vide');
    }

    // Déterminer les porcs à lister
    let pigCount: number;
    let pigIds: string[] = [];

    if (dto.pigIds && dto.pigIds.length > 0) {
      // Cas 1: IDs spécifiques fournis
      pigIds = dto.pigIds;
      pigCount = pigIds.length;

      // Vérifier que tous les porcs appartiennent à la bande et ne sont pas déjà listés
      const pigsCheck = await this.databaseService.query(
        `SELECT id, marketplace_status 
         FROM batch_pigs 
         WHERE id = ANY($1::varchar[]) AND batch_id = $2`,
        [pigIds, dto.batchId]
      );

      if (pigsCheck.rows.length !== pigIds.length) {
        throw new BadRequestException('Certains porcs ne font pas partie de cette bande');
      }

      const alreadyListed = pigsCheck.rows.filter(
        (pig) => pig.marketplace_status === 'available' || pig.marketplace_status === 'pending_sale'
      );

      if (alreadyListed.length > 0) {
        throw new BadRequestException(
          `${alreadyListed.length} porc(s) sont déjà en vente sur le marketplace`
        );
      }
    } else if (dto.pigCount) {
      // Cas 2: Nombre spécifié
      pigCount = dto.pigCount;

      if (pigCount > totalCount) {
        throw new BadRequestException(
          `La bande ne contient que ${totalCount} porc(s), impossible de vendre ${pigCount}`
        );
      }

      // Sélectionner les N porcs les plus lourds non listés
      const pigsResult = await this.databaseService.query(
        `SELECT id FROM batch_pigs 
         WHERE batch_id = $1 
           AND (marketplace_status IS NULL OR marketplace_status = 'not_listed')
         ORDER BY current_weight_kg DESC NULLS LAST
         LIMIT $2`,
        [dto.batchId, pigCount]
      );

      if (pigsResult.rows.length < pigCount) {
        throw new BadRequestException(
          `Seulement ${pigsResult.rows.length} porc(s) disponible(s) dans cette bande (${pigCount} demandé(s))`
        );
      }

      pigIds = pigsResult.rows.map((row) => row.id);
    } else {
      // Cas 3: Toute la bande
      const pigsResult = await this.databaseService.query(
        `SELECT id FROM batch_pigs 
         WHERE batch_id = $1 
           AND (marketplace_status IS NULL OR marketplace_status = 'not_listed')`,
        [dto.batchId]
      );

      pigIds = pigsResult.rows.map((row) => row.id);
      pigCount = pigIds.length;

      if (pigCount === 0) {
        throw new BadRequestException('Tous les porcs de cette bande sont déjà en vente');
      }
    }

    return await this.databaseService.transaction(async (client) => {
      const id = this.generateId('listing');
      const now = new Date().toISOString();
      const weight = parseFloat(dto.averageWeight.toString());
      const pricePerKg = parseFloat(dto.pricePerKg.toString());
      const calculatedPrice = pricePerKg * weight * pigCount;

      const defaultSaleTerms = {
        transport: 'buyer_responsibility',
        slaughter: 'buyer_responsibility',
        paymentTerms: 'on_delivery',
        warranty: 'Tous les documents sanitaires et certificats seront fournis.',
        cancellationPolicy: "Annulation possible jusqu'à 48h avant la date de livraison.",
      };

      // Vérifier quelles colonnes existent dans marketplace_listings
      const columnsCheck = await client.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'marketplace_listings' 
         AND column_name IN ('weight', 'listing_type', 'batch_id', 'pig_ids', 'pig_count')`
      );
      const existingColumns = columnsCheck.rows.map((r) => r.column_name);
      const hasWeight = existingColumns.includes('weight');
      const hasListingType = existingColumns.includes('listing_type');
      const hasBatchId = existingColumns.includes('batch_id');
      const hasPigIds = existingColumns.includes('pig_ids');
      const hasPigCount = existingColumns.includes('pig_count');

      // Construire la requête INSERT dynamiquement selon les colonnes disponibles
      let insertColumns: string[] = [
        'id',
        'producer_id',
        'farm_id',
        'price_per_kg',
        'calculated_price',
        'status',
        'listed_at',
        'updated_at',
        'last_weight_date',
        'location_latitude',
        'location_longitude',
        'location_address',
        'location_city',
        'location_region',
        'sale_terms',
        'views',
        'inquiries',
        'date_creation',
        'derniere_modification',
      ];
      let insertValues: any[] = [
        id,
        userId,
        dto.farmId,
        pricePerKg,
        calculatedPrice,
        'available',
        now,
        now,
        dto.lastWeightDate,
        dto.location.latitude,
        dto.location.longitude,
        dto.location.address || dto.location.city || dto.location.region || 'Non spécifié',
        dto.location.city || 'Non spécifié',
        dto.location.region || 'Non spécifié',
        JSON.stringify(dto.saleTerms || defaultSaleTerms),
        0,
        0,
        now,
        now,
      ];
      let paramIndex = insertValues.length + 1;

      // Ajouter les colonnes optionnelles si elles existent
      if (hasListingType) {
        insertColumns.push('listing_type');
        insertValues.push('batch');
        paramIndex++;
      }
      if (hasBatchId) {
        insertColumns.push('batch_id');
        insertValues.push(dto.batchId);
        paramIndex++;
      }
      if (hasPigIds) {
        insertColumns.push('pig_ids');
        insertValues.push(JSON.stringify(pigIds));
        paramIndex++;
      }
      if (hasPigCount) {
        insertColumns.push('pig_count');
        insertValues.push(pigCount);
        paramIndex++;
      }
      if (hasWeight) {
        insertColumns.push('weight');
        insertValues.push(weight);
        paramIndex++;
      }

      const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
      const columnsStr = insertColumns.join(', ');

      // Insertion du listing
      const result = await client.query(
        `INSERT INTO marketplace_listings (${columnsStr}) VALUES (${placeholders}) RETURNING *`,
        insertValues
      );

      // Mettre à jour le statut marketplace des porcs individuels (seulement si les colonnes existent)
      try {
        const batchPigsColumnsCheck = await client.query(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name = 'batch_pigs' 
           AND column_name IN ('marketplace_status', 'marketplace_listing_id', 'listed_at')`
        );
        const batchPigsColumns = batchPigsColumnsCheck.rows.map((r) => r.column_name);
        const hasMarketplaceStatus = batchPigsColumns.includes('marketplace_status');
        const hasMarketplaceListingId = batchPigsColumns.includes('marketplace_listing_id');
        const hasListedAt = batchPigsColumns.includes('listed_at');

        if (hasMarketplaceStatus || hasMarketplaceListingId || hasListedAt) {
          let updateColumns: string[] = [];
          let updateValues: any[] = [];
          let updateParamIndex = 1;

          if (hasMarketplaceStatus) {
            updateColumns.push(`marketplace_status = $${updateParamIndex}`);
            updateValues.push('available');
            updateParamIndex++;
          }
          if (hasMarketplaceListingId) {
            updateColumns.push(`marketplace_listing_id = $${updateParamIndex}`);
            updateValues.push(id);
            updateParamIndex++;
          }
          if (hasListedAt) {
            updateColumns.push(`listed_at = $${updateParamIndex}`);
            updateValues.push(now);
            updateParamIndex++;
          }

          if (updateColumns.length > 0) {
            updateValues.push(pigIds);
            await client.query(
              `UPDATE batch_pigs 
               SET ${updateColumns.join(', ')}
               WHERE id = ANY($${updateParamIndex}::varchar[])`,
              updateValues
            );
          }
        }
      } catch (error: any) {
        // Si la mise à jour échoue, logger un warning mais ne pas faire échouer la création du listing
        this.logger.warn(
          `[createBatchListingUnified] Erreur lors de la mise à jour du statut marketplace des porcs: ${error.message}`
        );
      }

      // Le trigger update_batch_marketplace_status() mettra à jour automatiquement le statut de la bande

      this.logger.log(
        `[createBatchListingUnified] Listing créé: ${id} pour bande ${dto.batchId} (${pigCount} porcs)`
      );
      return this.mapRowToListing(result.rows[0]);
    });
    } catch (error: any) {
      this.logger.error(`[createBatchListingUnified] Erreur détaillée:`, {
        message: error.message,
        stack: error.stack,
        dto: {
          batchId: dto.batchId,
          farmId: dto.farmId,
          averageWeight: dto.averageWeight,
          pricePerKg: dto.pricePerKg,
          pigCount: dto.pigCount,
          pigIds: dto.pigIds?.length || 0,
          hasLocation: !!dto.location,
        },
      });
      // Si c'est déjà une exception NestJS, la relancer telle quelle
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      // Sinon, encapsuler dans une BadRequestException avec plus de détails
      throw new BadRequestException(
        `Erreur lors de la création du listing de bande: ${error.message || 'Erreur inconnue'}`
      );
    }
  }

  /**
   * Met à jour un listing (unifié pour les deux modes)
   */
  async updateUnifiedListing(listingId: string, dto: UpdateListingDto, userId: string) {
    // Vérifier que le listing existe et appartient à l'utilisateur
    const listing = await this.databaseService.query(
      'SELECT * FROM marketplace_listings WHERE id = $1',
      [listingId]
    );

    if (listing.rows.length === 0) {
      throw new NotFoundException('Listing introuvable');
    }

    const listingData = listing.rows[0];

    if (listingData.producer_id !== userId) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à modifier ce listing');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.pricePerKg !== undefined) {
      updates.push(`price_per_kg = $${paramIndex}`);
      values.push(parseFloat(dto.pricePerKg.toString()));
      paramIndex++;

      // Recalculer le prix total
      const weight = parseFloat(listingData.weight);
      const pigCount = parseInt(listingData.pig_count) || 1;
      const newCalculatedPrice = parseFloat(dto.pricePerKg.toString()) * weight * pigCount;
      updates.push(`calculated_price = $${paramIndex}`);
      values.push(newCalculatedPrice);
      paramIndex++;
    }

    if (dto.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(dto.status);
      paramIndex++;

      // Si le statut change, mettre à jour les entités sources
      if (dto.status === 'sold' || dto.status === 'removed') {
        // Pour individuel: mettre à jour l'animal
        if (listingData.listing_type === 'individual' && listingData.subject_id) {
          await this.databaseService.query(
            `UPDATE production_animaux 
             SET marketplace_status = $1, marketplace_listing_id = NULL
             WHERE id = $2`,
            [dto.status === 'sold' ? 'sold' : 'not_listed', listingData.subject_id]
          );
        }

        // Pour bande: mettre à jour les porcs individuels
        if (listingData.listing_type === 'batch' && listingData.pig_ids) {
          const pigIds = JSON.parse(listingData.pig_ids);
          await this.databaseService.query(
            `UPDATE batch_pigs 
             SET marketplace_status = $1, 
                 marketplace_listing_id = NULL,
                 sold_at = CASE WHEN $1 = 'sold' THEN NOW() ELSE NULL END
             WHERE id = ANY($2::varchar[])`,
            [dto.status === 'sold' ? 'sold' : 'not_listed', pigIds]
          );
          // Le trigger mettra à jour le statut de la bande automatiquement
        }
      }
    }

    if (dto.location !== undefined) {
      if (dto.location.latitude !== undefined) {
        updates.push(`location_latitude = $${paramIndex}`);
        values.push(dto.location.latitude);
        paramIndex++;
      }
      if (dto.location.longitude !== undefined) {
        updates.push(`location_longitude = $${paramIndex}`);
        values.push(dto.location.longitude);
        paramIndex++;
      }
      if (dto.location.address !== undefined) {
        updates.push(`location_address = $${paramIndex}`);
        values.push(dto.location.address);
        paramIndex++;
      }
      if (dto.location.city !== undefined) {
        updates.push(`location_city = $${paramIndex}`);
        values.push(dto.location.city);
        paramIndex++;
      }
      if (dto.location.region !== undefined) {
        updates.push(`location_region = $${paramIndex}`);
        values.push(dto.location.region);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new BadRequestException('Aucun paramètre valide à mettre à jour');
    }

    updates.push(`updated_at = NOW()`, `derniere_modification = NOW()`);
    values.push(listingId);

    const result = await this.databaseService.query(
      `UPDATE marketplace_listings SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    this.logger.log(`[updateUnifiedListing] Listing ${listingId} mis à jour`);
    return this.mapRowToListing(result.rows[0]);
  }

  /**
   * Supprime un listing (unifié pour les deux modes)
   */
  async deleteUnifiedListing(listingId: string, userId: string) {
    // Vérifier que le listing existe et appartient à l'utilisateur
    const listing = await this.databaseService.query(
      'SELECT * FROM marketplace_listings WHERE id = $1',
      [listingId]
    );

    if (listing.rows.length === 0) {
      throw new NotFoundException('Listing introuvable');
    }

    const listingData = listing.rows[0];

    if (listingData.producer_id !== userId) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à supprimer ce listing');
    }

    // Vérifier qu'il n'y a pas d'offres en attente
    const pendingOffers = await this.databaseService.query(
      'SELECT id FROM marketplace_offers WHERE listing_id = $1 AND status = $2',
      [listingId, 'pending']
    );

    if (pendingOffers.rows.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer ce listing : il y a des offres en attente'
      );
    }

    return await this.databaseService.transaction(async (client) => {
      try {
        // Marquer le listing comme removed
        await client.query(
          `UPDATE marketplace_listings 
           SET status = 'removed', updated_at = NOW(), derniere_modification = NOW()
           WHERE id = $1`,
          [listingId]
        );

        // Nettoyer les références pour les listings individuels
        // Note: Si listing_type est null/undefined, c'est un ancien listing (forcément individuel)
        if (
          (listingData.listing_type === 'individual' || !listingData.listing_type) &&
          listingData.subject_id
        ) {
          try {
            await client.query(
              `UPDATE production_animaux 
               SET marketplace_status = 'not_listed', marketplace_listing_id = NULL
               WHERE id = $1`,
              [listingData.subject_id]
            );
          } catch (error: any) {
            // Si les colonnes marketplace_status ou marketplace_listing_id n'existent pas, ignorer l'erreur
            if (
              error.message?.includes('does not exist') ||
              error.message?.includes("n'existe pas") ||
              error.message?.includes('column') ||
              error.message?.includes('colonne')
            ) {
              this.logger.warn(
                `[deleteUnifiedListing] Colonnes marketplace_status/marketplace_listing_id non disponibles dans production_animaux, ignoré`
              );
            } else {
              throw error;
            }
          }
        }

        // Nettoyer les références pour les listings batch
        // Note: listing_type peut être null pour les anciens listings (qui sont forcément individuels)
        if (listingData.listing_type === 'batch' && listingData.pig_ids) {
          try {
            // Parser pig_ids de manière sécurisée
            // PostgreSQL retourne JSONB comme objet JavaScript directement
            let pigIds: string[] = [];
            if (Array.isArray(listingData.pig_ids)) {
              pigIds = listingData.pig_ids;
            } else if (typeof listingData.pig_ids === 'string') {
              try {
                const parsed = JSON.parse(listingData.pig_ids);
                pigIds = Array.isArray(parsed) ? parsed : [];
              } catch (parseError) {
                this.logger.warn(
                  `[deleteUnifiedListing] Impossible de parser pig_ids pour le listing ${listingId}: ${parseError}`
                );
                pigIds = [];
              }
            } else if (listingData.pig_ids && typeof listingData.pig_ids === 'object') {
              // Si c'est déjà un objet (JSONB), essayer de le convertir en array
              pigIds = Object.values(listingData.pig_ids) as string[];
            }

            // Mettre à jour batch_pigs seulement si on a des IDs valides
            if (pigIds.length > 0 && pigIds.every(id => typeof id === 'string' && id.length > 0)) {
              await client.query(
                `UPDATE batch_pigs 
                 SET marketplace_status = 'not_listed', marketplace_listing_id = NULL
                 WHERE id = ANY($1::varchar[])`,
                [pigIds]
              );
              // Le trigger mettra à jour le statut de la bande automatiquement
            }
          } catch (error: any) {
            // Si les colonnes marketplace_status ou marketplace_listing_id n'existent pas, ignorer l'erreur
            if (
              error.message?.includes('does not exist') ||
              error.message?.includes("n'existe pas") ||
              error.message?.includes('column') ||
              error.message?.includes('colonne') ||
              error.message?.includes('operator does not exist')
            ) {
              this.logger.warn(
                `[deleteUnifiedListing] Colonnes marketplace_status/marketplace_listing_id non disponibles dans batch_pigs, ignoré`
              );
            } else {
              this.logger.error(
                `[deleteUnifiedListing] Erreur lors de la mise à jour de batch_pigs pour le listing ${listingId}:`,
                error
              );
              throw error;
            }
          }
        }

        this.logger.log(`[deleteUnifiedListing] Listing ${listingId} supprimé`);
      } catch (error: any) {
        this.logger.error(`[deleteUnifiedListing] Erreur lors de la suppression du listing ${listingId}:`, error);
        throw error;
      }
    });
  }

  /**
   * Mapper pour convertir une ligne DB en objet Listing
   */
  private mapRowToListing(row: any): any {
    return {
      id: row.id,
      listingType: row.listing_type,
      subjectId: row.subject_id || undefined,
      batchId: row.batch_id || undefined,
      pigIds: row.pig_ids ? (typeof row.pig_ids === 'string' ? JSON.parse(row.pig_ids) : row.pig_ids) : [],
      pigCount: row.pig_count ? parseInt(row.pig_count) : 1,
      producerId: row.producer_id,
      farmId: row.farm_id,
      pricePerKg: parseFloat(row.price_per_kg),
      weight: parseFloat(row.weight),
      calculatedPrice: parseFloat(row.calculated_price),
      status: row.status,
      listedAt: row.listed_at ? new Date(row.listed_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      lastWeightDate: row.last_weight_date ? new Date(row.last_weight_date).toISOString() : undefined,
      location: {
        latitude: parseFloat(row.location_latitude),
        longitude: parseFloat(row.location_longitude),
        address: row.location_address || undefined,
        city: row.location_city || undefined,
        region: row.location_region || undefined,
      },
      saleTerms:
        typeof row.sale_terms === 'string' ? JSON.parse(row.sale_terms) : row.sale_terms || undefined,
      views: row.views || 0,
      inquiries: row.inquiries || 0,
      dateCreation: row.date_creation ? new Date(row.date_creation).toISOString() : undefined,
      derniereModification: row.derniere_modification
        ? new Date(row.derniere_modification).toISOString()
        : undefined,
    };
  }
}

