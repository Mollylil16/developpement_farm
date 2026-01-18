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
      // Logger l'erreur complète avec tous les détails
      const errorDetails = {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        hint: error?.hint,
        constraint: error?.constraint,
        table: error?.table,
        column: error?.column,
        stack: error?.stack,
      };
      
      this.logger.error(`[createUnifiedListing] Erreur lors de la création du listing:`, {
        listingType,
        userId,
        subjectId: (dto as any).subjectId,
        farmId: dto.farmId,
        error: errorDetails,
      });
      
      // Si c'est une erreur de transaction (ROLLBACK), améliorer le message
      if (error?.message?.includes('ROLLBACK') || error?.code === '25P02') {
        throw new BadRequestException(
          `Erreur lors de la création du listing: ${error?.detail || error?.message || 'Transaction annulée'}. ` +
          `Vérifiez que toutes les données sont valides et que l'animal existe.`
        );
      }
      
      // Si c'est une erreur de contrainte, améliorer le message
      if (error?.code === '23505') { // Unique violation
        throw new BadRequestException(
          `Cet animal est déjà en vente ou une contrainte d'unicité a été violée.`
        );
      }
      
      // Sinon, propager l'erreur telle quelle (BadRequestException, NotFoundException, etc.)
      throw error;
    }
  }

  /**
   * Crée un listing individuel
   */
  private async createIndividualListing(dto: CreateListingDto, userId: string) {
    // Vérifier que le sujet existe et appartient au projet
    const animal = await this.databaseService.query(
      'SELECT id FROM production_animaux WHERE id = $1 AND projet_id = $2 AND statut = $3',
      [dto.subjectId, dto.farmId, 'actif']
    );

    if (animal.rows.length === 0) {
      throw new NotFoundException('Animal introuvable, inactif ou ne vous appartient pas');
    }

    // NOUVELLE RÈGLE: Un sujet PEUT être dans plusieurs listings simultanément
    // Le nettoyage des autres listings se fera automatiquement lors de la vente (completeSale)
    // On log juste un warning si l'animal est déjà dans d'autres listings pour info
    const existingListing = await this.databaseService.query(
      `SELECT id FROM marketplace_listings 
       WHERE subject_id = $1 AND status IN ('available', 'reserved')`,
      [dto.subjectId]
    );

    if (existingListing.rows.length > 0) {
      this.logger.warn(
        `[createIndividualListing] Animal ${dto.subjectId} déjà présent dans ${existingListing.rows.length} listing(s) actif(s). ` +
        `Un nouveau listing sera créé. Les anciens seront automatiquement nettoyés lors de la vente.`
      );
    }

    const listingId = this.generateId('listing');
    let pendingAnimalUpdate: { sql: string; values: any[] } | null = null;

    const result = await this.databaseService.transaction(async (client) => {
      const id = listingId;
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
      const hasPigIds = existingColumns.includes('pig_ids');
      const hasPigCount = existingColumns.includes('pig_count');

      // Construire la requête INSERT dynamiquement selon les colonnes disponibles
      let insertColumns: string[] = [
        'id',
        'subject_id',
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
      // S'assurer que farmId est bien une chaîne et qu'il n'y a pas d'espaces
      const farmIdToInsert = String(dto.farmId || '').trim();
      if (!farmIdToInsert) {
        throw new BadRequestException('farmId est requis et ne peut pas être vide');
      }
      
      let insertValues: any[] = [
        id,
        dto.subjectId,
        userId,
        farmIdToInsert,
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

      // Ajouter les colonnes optionnelles si elles existent
      if (hasListingType) {
        insertColumns.push('listing_type');
        insertValues.push('individual');
      }
      if (hasWeight) {
        insertColumns.push('weight');
        insertValues.push(weight);
      }
      if (hasPigCount) {
        insertColumns.push('pig_count');
        insertValues.push(1); // pig_count = 1 pour individuel
      }
      if (hasPigIds) {
        insertColumns.push('pig_ids');
        insertValues.push('[]'); // pig_ids vide pour individuel
      }

      const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
      const columnsStr = insertColumns.join(', ');

      // Insertion du listing
      const result = await client.query(
        `INSERT INTO marketplace_listings (${columnsStr}) VALUES (${placeholders}) RETURNING *`,
        insertValues
      );

      const createdListing = result.rows[0];

      // Vérifier les colonnes disponibles sur production_animaux pour éviter d'aborter la transaction
      // Cette vérification est faite DANS la transaction mais l'UPDATE sera fait HORS transaction
      // pour éviter qu'une erreur sur production_animaux ne fasse ROLLBACK du listing
      try {
        const productionColumnsCheck = await client.query(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name = 'production_animaux'
           AND column_name IN ('marketplace_status', 'marketplace_listing_id')`
        );
        const productionColumns = productionColumnsCheck.rows.map((r) => r.column_name);
        const hasMarketplaceStatusColumn = productionColumns.includes('marketplace_status');
        const hasMarketplaceListingIdColumn = productionColumns.includes('marketplace_listing_id');

        // Préparer (éventuellement) la mise à jour du statut marketplace de l'animal
        // Cette mise à jour sera faite HORS transaction pour ne pas bloquer le commit
        if (hasMarketplaceStatusColumn || hasMarketplaceListingIdColumn) {
          const updateFragments: string[] = [];
          const updateValues: any[] = [];

          if (hasMarketplaceStatusColumn) {
            updateFragments.push(`marketplace_status = $${updateValues.length + 1}`);
            updateValues.push('available');
          }
          if (hasMarketplaceListingIdColumn) {
            updateFragments.push(`marketplace_listing_id = $${updateValues.length + 1}`);
            updateValues.push(id);
          }
          updateValues.push(dto.subjectId);

          const updateSql = `
            UPDATE production_animaux
            SET ${updateFragments.join(', ')}
            WHERE id = $${updateValues.length}
          `;

          pendingAnimalUpdate = { sql: updateSql, values: updateValues };
          this.logger.debug(
            `[createIndividualListing] Mise à jour production_animaux préparée pour ${dto.subjectId} (sera exécutée après commit)`
          );
        } else {
          this.logger.warn(
            `[createIndividualListing] Colonnes marketplace_status/marketplace_listing_id non disponibles dans production_animaux, mise à jour ignorée`
          );
        }
      } catch (columnsCheckError: any) {
        // Si la vérification des colonnes échoue, on log mais on continue
        // Le listing a déjà été créé, on ne veut pas faire ROLLBACK pour ça
        this.logger.warn(
          `[createIndividualListing] Erreur lors de la vérification des colonnes production_animaux: ${columnsCheckError?.message}. Continuation sans mise à jour.`
        );
        // Ne pas throw - le listing est déjà créé, on continue
      }

      this.logger.log(`[createIndividualListing] Listing créé: ${id} pour animal ${dto.subjectId}`);
      
      // Vérifier que le résultat de l'INSERT est valide
      if (!result || !result.rows || result.rows.length === 0) {
        const error = new Error(`INSERT réussi mais aucune ligne retournée pour le listing ${id}`);
        this.logger.error(`[createIndividualListing] ${error.message}`);
        throw error;
      }
      
      const createdListingRow = result.rows[0];
      
      // Mapper le listing avec gestion d'erreur robuste
      let mappedListing;
      try {
        mappedListing = this.mapRowToListing(createdListingRow);
        this.logger.debug(`[createIndividualListing] Listing mappé avec succès: ${id}`);
      } catch (mappingError: any) {
        this.logger.error(
          `[createIndividualListing] Erreur lors du mapping du listing ${id}:`,
          mappingError
        );
        // Même en cas d'erreur de mapping, on retourne les données brutes plutôt que de faire ROLLBACK
        // Le listing a été créé avec succès, c'est juste le mapping qui a échoué
        mappedListing = {
          id: createdListingRow.id,
          listingType: createdListingRow.listing_type || 'individual',
          producerId: createdListingRow.producer_id,
          farmId: createdListingRow.farm_id,
          status: createdListingRow.status,
          subjectId: dto.subjectId,
          // Données brutes pour debug
          _raw: createdListingRow,
          _mappingError: mappingError?.message,
        };
      }
      
      // Vérifier que mappedListing est défini avant de retourner
      if (!mappedListing) {
        throw new Error(`Impossible de mapper le listing ${id}`);
      }
      
      return mappedListing;
    });
    // Exécuter la mise à jour (non bloquante) hors transaction si nécessaire
    if (pendingAnimalUpdate) {
      this.databaseService
        .query(pendingAnimalUpdate.sql, pendingAnimalUpdate.values)
        .catch((error: any) => {
          this.logger.warn(
            `[createIndividualListing] Mise à jour production_animaux ignorée pour ${dto.subjectId}: ${error?.message}`
          );
        });
    }
    
    this.logger.log(`[createIndividualListing] Listing ${listingId} créé pour animal ${dto.subjectId}`);
    return result;
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
      // S'assurer que farmId est bien une chaîne et qu'il n'y a pas d'espaces
      const farmIdToInsertBatch = String(dto.farmId || '').trim();
      if (!farmIdToInsertBatch) {
        throw new BadRequestException('farmId est requis et ne peut pas être vide');
      }
      
      let insertValues: any[] = [
        id,
        userId,
        farmIdToInsertBatch,
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
    this.logger.debug(`[deleteUnifiedListing] Début suppression listing ${listingId} par userId ${userId}`);
    
    // Vérifier que le listing existe et appartient à l'utilisateur
    const listing = await this.databaseService.query(
      'SELECT * FROM marketplace_listings WHERE id = $1',
      [listingId]
    );

    if (listing.rows.length === 0) {
      this.logger.warn(`[deleteUnifiedListing] Listing ${listingId} introuvable`);
      throw new NotFoundException('Listing introuvable');
    }

    const listingData = listing.rows[0];
    this.logger.debug(`[deleteUnifiedListing] Listing trouvé: type=${listingData.listing_type}, subject_id=${listingData.subject_id}, producer_id=${listingData.producer_id}`);

    if (listingData.producer_id !== userId) {
      this.logger.warn(`[deleteUnifiedListing] Tentative de suppression non autorisée: userId=${userId}, producer_id=${listingData.producer_id}`);
      throw new ForbiddenException('Vous n\'êtes pas autorisé à supprimer ce listing');
    }

    // Vérifier qu'il n'y a pas d'offres en attente
    const pendingOffers = await this.databaseService.query(
      'SELECT id FROM marketplace_offers WHERE listing_id = $1 AND status = $2',
      [listingId, 'pending']
    );

    if (pendingOffers.rows.length > 0) {
      this.logger.warn(`[deleteUnifiedListing] Impossible de supprimer: ${pendingOffers.rows.length} offre(s) en attente pour le listing ${listingId}`);
      throw new BadRequestException(
        'Impossible de supprimer ce listing : il y a des offres en attente'
      );
    }

    this.logger.debug(`[deleteUnifiedListing] Début transaction pour suppression listing ${listingId}`);

    return await this.databaseService.transaction(async (client) => {
      try {
        // Marquer le listing comme removed
        const updateResult = await client.query(
          `UPDATE marketplace_listings 
           SET status = 'removed', updated_at = NOW(), derniere_modification = NOW()
           WHERE id = $1
           RETURNING id`,
          [listingId]
        );

        if (updateResult.rows.length === 0) {
          this.logger.error(`[deleteUnifiedListing] Échec UPDATE: Listing ${listingId} introuvable lors de la mise à jour`);
          throw new NotFoundException('Listing introuvable lors de la mise à jour');
        }

        this.logger.debug(`[deleteUnifiedListing] Listing ${listingId} marqué comme 'removed' (${updateResult.rowCount} ligne(s) mise(s) à jour)`);

        // Nettoyer les références pour les listings individuels
        // Note: Si listing_type est null/undefined, c'est un ancien listing (forcément individuel)
        if (
          (listingData.listing_type === 'individual' || !listingData.listing_type) &&
          listingData.subject_id
        ) {
          try {
            // Vérifier d'abord si l'animal existe avant de le mettre à jour
            const animalCheck = await client.query(
              'SELECT id FROM production_animaux WHERE id = $1',
              [listingData.subject_id]
            );

            if (animalCheck.rows.length > 0) {
              // Vérifier si les colonnes existent avant de les utiliser
              const columnCheck = await client.query(
                `SELECT column_name 
                 FROM information_schema.columns 
                 WHERE table_name = 'production_animaux' 
                 AND column_name IN ('marketplace_status', 'marketplace_listing_id')`
              );

              const hasMarketplaceStatus = columnCheck.rows.some(r => r.column_name === 'marketplace_status');
              const hasMarketplaceListingId = columnCheck.rows.some(r => r.column_name === 'marketplace_listing_id');

              if (hasMarketplaceStatus && hasMarketplaceListingId) {
                const animalUpdateResult = await client.query(
                  `UPDATE production_animaux 
                   SET marketplace_status = 'not_listed', marketplace_listing_id = NULL
                   WHERE id = $1`,
                  [listingData.subject_id]
                );
                this.logger.debug(`[deleteUnifiedListing] Références nettoyées pour animal ${listingData.subject_id} (${animalUpdateResult.rowCount} ligne(s) mise(s) à jour)`);
              } else {
                this.logger.warn(
                  `[deleteUnifiedListing] Colonnes marketplace_status/marketplace_listing_id non disponibles dans production_animaux (hasMarketplaceStatus=${hasMarketplaceStatus}, hasMarketplaceListingId=${hasMarketplaceListingId}), ignoré`
                );
              }
            } else {
              this.logger.warn(
                `[deleteUnifiedListing] Animal ${listingData.subject_id} introuvable dans production_animaux, ignoré`
              );
            }
          } catch (error: any) {
            // Si les colonnes marketplace_status ou marketplace_listing_id n'existent pas, ignorer l'erreur
            if (
              error.message?.includes('does not exist') ||
              error.message?.includes("n'existe pas") ||
              error.message?.includes('column') ||
              error.message?.includes('colonne')
            ) {
              this.logger.warn(
                `[deleteUnifiedListing] Erreur de colonne ignorée pour animal ${listingData.subject_id}: ${error.message}`
              );
            } else {
              this.logger.error(
                `[deleteUnifiedListing] Erreur lors du nettoyage des références pour animal ${listingData.subject_id}:`,
                {
                  message: error.message,
                  stack: error.stack?.substring(0, 300),
                  listingId,
                  subjectId: listingData.subject_id,
                }
              );
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
              const batchUpdateResult = await client.query(
                `UPDATE batch_pigs 
                 SET marketplace_status = 'not_listed', marketplace_listing_id = NULL
                 WHERE id = ANY($1::varchar[])`,
                [pigIds]
              );
              this.logger.debug(`[deleteUnifiedListing] Références nettoyées pour ${batchUpdateResult.rowCount} batch_pig(s) du listing ${listingId}`);
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
                {
                  message: error.message,
                  stack: error.stack?.substring(0, 300),
                  listingId,
                  pigIdsCount: pigIds?.length || 0,
                }
              );
              throw error;
            }
          }
        }

        this.logger.log(`[deleteUnifiedListing] Listing ${listingId} supprimé avec succès (type=${listingData.listing_type || 'individual'})`);
        return { success: true, message: 'Listing supprimé avec succès' };
      } catch (error: any) {
        this.logger.error(`[deleteUnifiedListing] Erreur lors de la suppression du listing ${listingId}:`, {
          message: error.message,
          stack: error.stack?.substring(0, 500),
          listingId,
          userId,
          listingType: listingData.listing_type,
          subjectId: listingData.subject_id,
        });
        throw error;
      }
    });
  }

  /**
   * Mapper pour convertir une ligne DB en objet Listing
   */
  private mapRowToListing(row: any): any {
    // Fonction helper pour parser JSON de manière sécurisée
    const safeJsonParse = (value: any, defaultValue: any = null): any => {
      if (value === null || value === undefined) {
        return defaultValue;
      }
      // Si c'est déjà un objet/array, le retourner tel quel
      if (value && (typeof value === 'object' && !Array.isArray(value) || Array.isArray(value))) {
        return value;
      }
      // Si c'est une chaîne, essayer de la parser
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return defaultValue;
        }
      }
      return defaultValue;
    };

    // Fonction helper pour parser un float de manière sécurisée
    const safeParseFloat = (value: any): number | undefined => {
      if (value === null || value === undefined) return undefined;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    };

    // Fonction helper pour parser une date de manière sécurisée
    const safeParseDate = (value: any): string | undefined => {
      if (!value) return undefined;
      try {
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date.toISOString();
      } catch {
        return undefined;
      }
    };

    const listing: any = {
      id: row.id,
      listingType: row.listing_type || 'individual', // Par défaut 'individual' si non défini
      producerId: row.producer_id,
      farmId: row.farm_id,
      pricePerKg: safeParseFloat(row.price_per_kg),
      calculatedPrice: safeParseFloat(row.calculated_price),
      weight: safeParseFloat(row.weight), // Poids moyen (batch) ou individuel
      status: row.status,
      listedAt: safeParseDate(row.listed_at),
      updatedAt: safeParseDate(row.updated_at),
      lastWeightDate: safeParseDate(row.last_weight_date),
      location: {
        latitude: safeParseFloat(row.location_latitude),
        longitude: safeParseFloat(row.location_longitude),
        address: row.location_address || undefined,
        city: row.location_city || undefined,
        region: row.location_region || undefined,
      },
      saleTerms: safeJsonParse(row.sale_terms, {}),
      views: row.views ? parseInt(row.views, 10) || 0 : 0,
      inquiries: row.inquiries ? parseInt(row.inquiries, 10) || 0 : 0,
      dateCreation: safeParseDate(row.date_creation),
      derniereModification: safeParseDate(row.derniere_modification),
    };

    // Pour les listings individuels
    if (row.listing_type === 'individual' || !row.listing_type) {
      listing.subjectId = row.subject_id;
    }

    // Pour les listings de bande
    if (row.listing_type === 'batch') {
      listing.batchId = row.batch_id;
      listing.pigIds = Array.isArray(row.pig_ids)
        ? row.pig_ids
        : safeJsonParse(row.pig_ids, []);
      listing.pigCount = row.pig_count ? parseInt(row.pig_count, 10) || listing.pigIds.length : listing.pigIds.length;
    } else {
      // Pour les listings individuels, pigCount = 1 par défaut
      listing.pigCount = row.pig_count ? parseInt(row.pig_count, 10) || 1 : 1;
      listing.pigIds = [];
    }

    // ✅ Photos du listing (si disponibles)
    if (row.photos) {
      listing.photos = Array.isArray(row.photos)
        ? row.photos
        : safeJsonParse(row.photos, []);
    } else {
      listing.photos = [];
    }

    return listing;
  }
}

