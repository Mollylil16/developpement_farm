import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../common/services/cache.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
// NOTE: CreateInquiryDto, UpdateInquiryDto obsolètes - les offres utilisent marketplace_offers via createOffer
import * as fs from 'fs/promises';
import * as path from 'path';
import { ImageService } from '../common/services/image.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './dto/notification.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { CreatePurchaseRequestOfferDto } from './dto/create-purchase-request-offer.dto';
import { CreateBatchListingDto } from './dto/create-batch-listing.dto';
import { SaleAutomationService } from './sale-automation.service';
import { 
  CompleteSaleDto, 
  CompleteSaleResponseDto,
  SaleCleanupResult,
  SaleTransactionInfo,
  SaleFinanceInfo
} from './dto/complete-sale.dto';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private databaseService: DatabaseService,
    private cacheService: CacheService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => SaleAutomationService))
    private saleAutomationService: SaleAutomationService
  ) {}

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ========================================
  // LISTINGS
  // ========================================

  async createListing(createListingDto: CreateListingDto, userId: string) {
    // Vérifier que l'utilisateur est propriétaire du projet
    await this.checkProjetOwnership(createListingDto.farmId, userId);

    // Vérifier que le sujet existe et appartient au projet
    const animal = await this.databaseService.query(
      'SELECT id FROM production_animaux WHERE id = $1 AND projet_id = $2',
      [createListingDto.subjectId, createListingDto.farmId]
    );

    if (animal.rows.length === 0) {
      throw new NotFoundException('Sujet introuvable ou ne vous appartient pas');
    }

    // NOUVELLE RÈGLE: Un sujet PEUT être dans plusieurs listings simultanément
    // Le nettoyage se fera automatiquement lors de la vente (completeSale)
    const existingListing = await this.databaseService.query(
      'SELECT id FROM marketplace_listings WHERE subject_id = $1 AND status = $2',
      [createListingDto.subjectId, 'available']
    );

    if (existingListing.rows.length > 0) {
      this.logger.warn(
        `[createListing] Sujet ${createListingDto.subjectId} déjà dans ${existingListing.rows.length} listing(s). ` +
        `Un nouveau listing sera créé, les anciens seront nettoyés lors de la vente.`
      );
    }

    // Utiliser une transaction pour garantir la cohérence des données
    return await this.databaseService.transaction(async (client) => {
      const id = this.generateId('listing');
      const now = new Date().toISOString();
      const calculatedPrice = createListingDto.pricePerKg * createListingDto.weight;

      const result = await client.query(
        `INSERT INTO marketplace_listings (
          id, subject_id, producer_id, farm_id, price_per_kg, calculated_price,
          status, listed_at, updated_at, last_weight_date,
          location_latitude, location_longitude, location_address, location_city, location_region,
          sale_terms, views, inquiries, date_creation, derniere_modification
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          id,
          createListingDto.subjectId,
          userId, // producerId = userId
          createListingDto.farmId,
          createListingDto.pricePerKg,
          calculatedPrice,
          'available',
          now,
          now,
          createListingDto.lastWeightDate,
          createListingDto.location.latitude,
          createListingDto.location.longitude,
          createListingDto.location.address,
          createListingDto.location.city,
          createListingDto.location.region,
          JSON.stringify(
            createListingDto.saleTerms || {
              transport: 'buyer_responsibility',
              slaughter: 'buyer_responsibility',
              paymentTerms: 'on_delivery',
              warranty: 'Tous les documents sanitaires et certificats seront fournis.',
              cancellationPolicy: "Annulation possible jusqu'à 48h avant la date de livraison.",
            }
          ),
          0, // views
          0, // inquiries
          now,
          now,
        ]
      );

      // Mettre à jour le statut marketplace de l'animal (si les colonnes existent)
      try {
        await client.query(
          'UPDATE production_animaux SET marketplace_status = $1, marketplace_listing_id = $2 WHERE id = $3',
          ['available', id, createListingDto.subjectId]
        );
      } catch (error: any) {
        // Ignorer si les colonnes n'existent pas (erreur SQL)
        if (!error.message?.includes('does not exist') && !error.message?.includes('n\'existe pas')) {
          throw error; // Re-throw si c'est une autre erreur
        }
      }

      return this.mapRowToListing(result.rows[0]);
    });
  }

  async createBatchListing(createBatchListingDto: CreateBatchListingDto, userId: string) {
    try {
      // Vérifier que l'utilisateur est propriétaire du projet
      await this.checkProjetOwnership(createBatchListingDto.farmId, userId);

      // Valider les champs requis
      if (!createBatchListingDto.pricePerKg || createBatchListingDto.pricePerKg <= 0) {
        throw new BadRequestException('Le prix au kg doit être supérieur à 0');
      }

      if (!createBatchListingDto.lastWeightDate) {
        throw new BadRequestException('La date de dernière pesée est requise');
      }

      // Valider que location est fournie
      if (!createBatchListingDto.location || !createBatchListingDto.location.latitude || !createBatchListingDto.location.longitude) {
        throw new BadRequestException('La localisation (latitude et longitude) est requise');
      }

      // Vérifier que la bande existe et appartient au projet
      const batch = await this.databaseService.query(
        `SELECT b.id, b.total_count, b.projet_id, b.average_weight_kg, b.category
         FROM batches b
         JOIN projets p ON b.projet_id = p.id
         WHERE b.id = $1 AND p.id = $2 AND p.proprietaire_id = $3`,
        [createBatchListingDto.batchId, createBatchListingDto.farmId, userId]
      );

      if (batch.rows.length === 0) {
        throw new NotFoundException('Bande introuvable ou ne vous appartient pas');
      }

      const batchData = batch.rows[0];
      const totalCount = parseInt(batchData.total_count) || 0;

      // Déterminer le nombre de porcs et les IDs
      let pigCount: number;
      let pigIds: string[] = [];

      if (createBatchListingDto.pigIds && createBatchListingDto.pigIds.length > 0) {
        // Si pigIds est fourni, l'utiliser
        pigIds = createBatchListingDto.pigIds;
        pigCount = pigIds.length;

        // Vérifier que tous les porcs appartiennent à la bande
        const pigsCheck = await this.databaseService.query(
          `SELECT id FROM batch_pigs 
           WHERE id = ANY($1::varchar[]) AND batch_id = $2`,
          [pigIds, createBatchListingDto.batchId]
        );

        if (pigsCheck.rows.length !== pigIds.length) {
          throw new BadRequestException('Certains porcs ne font pas partie de cette bande');
        }
      } else if (createBatchListingDto.pigCount) {
        // Si pigCount est fourni, sélectionner les N porcs les plus lourds
        pigCount = createBatchListingDto.pigCount;

        if (pigCount > totalCount) {
          throw new BadRequestException(
            `La bande ne contient que ${totalCount} porc(s), impossible de vendre ${pigCount}`
          );
        }

        const pigsResult = await this.databaseService.query(
          `SELECT id FROM batch_pigs 
           WHERE batch_id = $1 
           ORDER BY current_weight_kg DESC NULLS LAST
           LIMIT $2`,
          [createBatchListingDto.batchId, pigCount]
        );

        pigIds = pigsResult.rows.map((row) => row.id);
      } else {
        // Si ni pigIds ni pigCount, vendre toute la bande
        pigCount = totalCount;

        const pigsResult = await this.databaseService.query(
          `SELECT id FROM batch_pigs WHERE batch_id = $1`,
          [createBatchListingDto.batchId]
        );

        pigIds = pigsResult.rows.map((row) => row.id);
      }

      if (pigIds.length === 0) {
        throw new BadRequestException('Aucun porc disponible dans cette bande');
      }

      // Vérifier qu'il n'y a pas déjà un listing actif pour cette bande avec les mêmes porcs
      // Utiliser une requête qui compare les arrays JSON de manière fiable
      let existingListing;
      try {
        // Trier les IDs pour une comparaison cohérente
        const sortedPigIds = [...pigIds].sort();
        existingListing = await this.databaseService.query(
          `SELECT id FROM marketplace_listings 
           WHERE batch_id = $1 AND listing_type = 'batch' AND status IN ('available', 'reserved')
           AND pig_ids::text = $2::text`,
          [createBatchListingDto.batchId, JSON.stringify(sortedPigIds)]
        );
      } catch (error: any) {
        // Si la colonne pig_ids n'existe pas ou n'est pas JSONB, ignorer cette vérification
        if (
          error.message?.includes('does not exist') ||
          error.message?.includes("n'existe pas") ||
          error.message?.includes('operator does not exist') ||
          error.message?.includes('cannot cast')
        ) {
          this.logger.warn(
            'Colonne pig_ids non disponible ou type incompatible, vérification des doublons ignorée'
          );
          existingListing = { rows: [] };
        } else {
          throw error;
        }
      }

      if (existingListing.rows.length > 0) {
        throw new BadRequestException('Ces porcs sont déjà en vente sur le marketplace');
      }

      // ✅ Calculer le poids moyen automatiquement à partir des poids réels des porcs
      let averageWeight: number;
      
      if (createBatchListingDto.averageWeight && createBatchListingDto.averageWeight > 0) {
        // Si le poids moyen est fourni, l'utiliser
        averageWeight = parseFloat(String(createBatchListingDto.averageWeight));
      } else {
        // Calculer automatiquement depuis les poids réels des porcs sélectionnés
        const pigsWeightResult = await this.databaseService.query(
          `SELECT AVG(current_weight_kg) as avg_weight, SUM(current_weight_kg) as total_weight
           FROM batch_pigs 
           WHERE id = ANY($1::varchar[]) AND current_weight_kg IS NOT NULL AND current_weight_kg > 0`,
          [pigIds]
        );
        
        const calculatedAvgWeight = parseFloat(pigsWeightResult.rows[0]?.avg_weight) || 0;
        
        if (calculatedAvgWeight <= 0) {
          // Fallback: utiliser le poids moyen de la bande si disponible
          averageWeight = parseFloat(batchData.average_weight_kg) || 0;
          
          if (averageWeight <= 0) {
            throw new BadRequestException(
              'Impossible de calculer le poids moyen. Veuillez d\'abord peser les porcs ou renseigner un poids moyen pour la bande.'
            );
          }
          
          this.logger.warn(`[createBatchListing] Aucun poids individuel disponible, utilisation du poids moyen de la bande: ${averageWeight} kg`);
        } else {
          averageWeight = calculatedAvgWeight;
          this.logger.log(`[createBatchListing] Poids moyen calculé automatiquement: ${averageWeight.toFixed(2)} kg pour ${pigIds.length} porcs`);
        }
      }

      // Utiliser une transaction pour garantir la cohérence des données
      return await this.databaseService.transaction(async (client) => {
        const id = this.generateId('listing');
        const now = new Date().toISOString();
        
        const pricePerKg = parseFloat(String(createBatchListingDto.pricePerKg)) || 0;
        
        if (averageWeight <= 0 || pricePerKg <= 0) {
          throw new BadRequestException('Le poids moyen et le prix au kg doivent être des nombres positifs');
        }
        
        const calculatedPrice = pricePerKg * averageWeight * pigCount;

        // S'assurer que lastWeightDate est une date valide
        let lastWeightDateValue: string;
        try {
          // Si c'est déjà une date ISO, l'utiliser directement
          if (typeof createBatchListingDto.lastWeightDate === 'string') {
            // Valider que c'est une date valide
            const date = new Date(createBatchListingDto.lastWeightDate);
            if (isNaN(date.getTime())) {
              throw new BadRequestException('La date de dernière pesée n\'est pas valide');
            }
            lastWeightDateValue = date.toISOString();
          } else {
            throw new BadRequestException('La date de dernière pesée doit être une chaîne de caractères (ISO 8601)');
          }
        } catch (error: any) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(`Erreur lors de la validation de la date de dernière pesée: ${error.message}`);
        }

        // Vérifier si la colonne weight existe dans la table
        let weightColumnExists = true;
        try {
          const checkColumn = await client.query(
            `SELECT column_name 
             FROM information_schema.columns 
             WHERE table_name = 'marketplace_listings' AND column_name = 'weight'`
          );
          weightColumnExists = checkColumn.rows.length > 0;
        } catch (error) {
          // En cas d'erreur, supposer que la colonne n'existe pas
          weightColumnExists = false;
        }

        // Construire la requête INSERT selon que la colonne weight existe ou non
        let insertQuery: string;
        let insertValues: any[];

        if (weightColumnExists) {
          // Colonne weight existe : utiliser la requête complète
          insertQuery = `INSERT INTO marketplace_listings (
            id, listing_type, batch_id, pig_ids, pig_count, producer_id, farm_id, 
            price_per_kg, calculated_price, weight, status, listed_at, updated_at, last_weight_date,
            location_latitude, location_longitude, location_address, location_city, location_region,
            sale_terms, views, inquiries, date_creation, derniere_modification
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          RETURNING *`;
          insertValues = [
            id,
            'batch',
            createBatchListingDto.batchId,
            JSON.stringify(pigIds),
            pigCount,
            userId, // producerId = userId
            createBatchListingDto.farmId,
            pricePerKg,
            calculatedPrice,
            averageWeight, // Poids moyen stocké
            'available',
            now,
            now,
            lastWeightDateValue,
            createBatchListingDto.location.latitude,
            createBatchListingDto.location.longitude,
            createBatchListingDto.location.address || null,
            createBatchListingDto.location.city || null,
            createBatchListingDto.location.region || null,
            JSON.stringify(
              createBatchListingDto.saleTerms || {
                transport: 'buyer_responsibility',
                slaughter: 'buyer_responsibility',
                paymentTerms: 'on_delivery',
                warranty: 'Tous les documents sanitaires et certificats seront fournis.',
                cancellationPolicy: "Annulation possible jusqu'à 48h avant la date de livraison.",
              }
            ),
            0, // views
            0, // inquiries
            now,
            now,
          ];
        } else {
          // Colonne weight n'existe pas : utiliser une requête sans weight
          // Le poids sera stocké dans calculated_price / price_per_kg / pig_count si nécessaire
          this.logger.warn(
            'Colonne weight non trouvée dans marketplace_listings. La migration 052_add_batch_support_to_marketplace_listings.sql doit être exécutée. ' +
            'Le listing sera créé sans la colonne weight, mais le poids moyen est disponible via calculated_price / (price_per_kg * pig_count).'
          );
          insertQuery = `INSERT INTO marketplace_listings (
            id, listing_type, batch_id, pig_ids, pig_count, producer_id, farm_id, 
            price_per_kg, calculated_price, status, listed_at, updated_at, last_weight_date,
            location_latitude, location_longitude, location_address, location_city, location_region,
            sale_terms, views, inquiries, date_creation, derniere_modification
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          RETURNING *`;
          insertValues = [
            id,
            'batch',
            createBatchListingDto.batchId,
            JSON.stringify(pigIds),
            pigCount,
            userId, // producerId = userId
            createBatchListingDto.farmId,
            pricePerKg,
            calculatedPrice,
            'available',
            now,
            now,
            lastWeightDateValue,
            createBatchListingDto.location.latitude,
            createBatchListingDto.location.longitude,
            createBatchListingDto.location.address || null,
            createBatchListingDto.location.city || null,
            createBatchListingDto.location.region || null,
            JSON.stringify(
              createBatchListingDto.saleTerms || {
                transport: 'buyer_responsibility',
                slaughter: 'buyer_responsibility',
                paymentTerms: 'on_delivery',
                warranty: 'Tous les documents sanitaires et certificats seront fournis.',
                cancellationPolicy: "Annulation possible jusqu'à 48h avant la date de livraison.",
              }
            ),
            0, // views
            0, // inquiries
            now,
            now,
          ];
        }

        const result = await client.query(insertQuery, insertValues);

        this.logger.log(
          `Annonce marketplace créée pour bande ${createBatchListingDto.batchId}: ${pigCount} porc(s)`
        );

        return this.mapRowToListing(result.rows[0]);
      });
    } catch (error: any) {
      // Logger l'erreur pour le débogage
      this.logger.error('[MarketplaceService] Erreur dans createBatchListing:', {
        batchId: createBatchListingDto.batchId,
        farmId: createBatchListingDto.farmId,
        userId,
        error: error.message,
        stack: error.stack,
      });

      // Si c'est une exception NestJS, la relancer
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }

      // Sinon, lancer une erreur générique avec plus de détails
      this.logger.error('[MarketplaceService] Erreur détaillée createBatchListing:', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        dto: {
          batchId: createBatchListingDto.batchId,
          farmId: createBatchListingDto.farmId,
          averageWeight: createBatchListingDto.averageWeight,
          pricePerKg: createBatchListingDto.pricePerKg,
          lastWeightDate: createBatchListingDto.lastWeightDate,
          hasLocation: !!createBatchListingDto.location,
        },
      });

      throw new BadRequestException(
        `Erreur lors de la création de l'annonce de bande: ${error.message || 'Erreur inconnue'}. Veuillez vérifier que tous les champs requis sont correctement remplis.`
      );
    }
  }

  async findAllListings(
    projetId?: string, 
    userId?: string, 
    limit?: number, 
    offset?: number,
    excludeUserId?: string,
    sort?: string
  ) {
    // Déclarer les variables avant le try pour qu'elles soient accessibles dans le catch
    let query = '';
    let countQuery = '';
    let params: any[] = [];
    let countParams: any[] = [];
    const defaultLimit = 20; // Limite par défaut pour pagination efficace
    const effectiveLimit = limit ? Math.min(limit, 500) : defaultLimit;
    const effectiveOffset = offset || 0;
    
    try {
      this.logger.debug(`[findAllListings] Paramètres: projetId=${projetId}, userId=${userId}, excludeUserId=${excludeUserId}, limit=${effectiveLimit}, offset=${effectiveOffset}, sort=${sort}`);

      // Colonnes nécessaires pour mapRowToListing (optimisation: éviter SELECT *)
      const listingColumns = `id, listing_type, subject_id, batch_id, pig_ids, pig_count, 
        producer_id, farm_id, price_per_kg, calculated_price, weight,
        status, listed_at, updated_at, last_weight_date, 
        location_latitude, location_longitude, location_address, location_city, location_region,
        sale_terms, views, inquiries, photos, date_creation, derniere_modification`;

      // Construire la clause WHERE de base
      let whereClause = 'WHERE status != $1';
      params.push('removed');
      countParams.push('removed');

      if (projetId) {
        // farm_id et projet_id sont tous deux de type TEXT, pas besoin de CAST
        whereClause += ` AND farm_id = $${params.length + 1}`;
        params.push(projetId.trim());
        countParams.push(projetId.trim());
        this.logger.debug(`[findAllListings] Filtre par projet: farm_id = ${projetId}`);
      }

      // Filtrer pour INCLURE uniquement les listings d'un utilisateur spécifique (pour "Mes annonces")
      if (userId && !excludeUserId) {
        whereClause += ` AND producer_id = $${params.length + 1}`;
        params.push(userId);
        countParams.push(userId);
        this.logger.debug(`[findAllListings] Filtre par producteur (include): producer_id = ${userId}`);
      }

      // Filtrer pour EXCLURE les listings d'un utilisateur spécifique (pour "Acheter")
      if (excludeUserId) {
        whereClause += ` AND producer_id != $${params.length + 1}`;
        params.push(excludeUserId);
        countParams.push(excludeUserId);
        this.logger.debug(`[findAllListings] Filtre par producteur (exclude): producer_id != ${excludeUserId}`);
      }

      // Requête COUNT pour obtenir le total (sans pagination)
      // whereClause contient déjà "WHERE", donc on l'utilise tel quel
      countQuery = `SELECT COUNT(*) as total FROM marketplace_listings ${whereClause}`;
      const countResult = await this.databaseService.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Construire l'ORDER BY selon le paramètre sort
      let orderByClause = '';
      if (sort === 'newest' || !sort) {
        // Prioriser les listings "Nouveau" (créés dans les 7 derniers jours), puis par date DESC
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        orderByClause = `ORDER BY 
          CASE WHEN listed_at >= '${sevenDaysAgo.toISOString()}' THEN 0 ELSE 1 END,
          listed_at DESC`;
      } else if (sort === 'oldest') {
        orderByClause = `ORDER BY listed_at ASC`;
      } else if (sort === 'price_asc') {
        orderByClause = `ORDER BY calculated_price ASC, listed_at DESC`;
      } else if (sort === 'price_desc') {
        orderByClause = `ORDER BY calculated_price DESC, listed_at DESC`;
      } else {
        // Par défaut : tri par date DESC
        orderByClause = `ORDER BY listed_at DESC`;
      }

      // Requête principale avec pagination
      query = `SELECT ${listingColumns} FROM marketplace_listings ${whereClause} ${orderByClause} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(effectiveLimit, effectiveOffset);

      const result = await this.databaseService.query(query, params);
      
      this.logger.log(`[findAllListings] Requête SQL: ${query}`);
      this.logger.log(`[findAllListings] Paramètres: ${JSON.stringify(params)}`);
      this.logger.log(`[findAllListings] Requête exécutée: ${result.rows.length} lignes trouvées`);
      if (result.rows.length > 0) {
        this.logger.log(`[findAllListings] Exemples de listings:`, {
          premier: {
            id: result.rows[0].id,
            producer_id: result.rows[0].producer_id,
            farm_id: result.rows[0].farm_id,
            status: result.rows[0].status,
            listed_at: result.rows[0].listed_at,
          },
        });
      } else {
        // Si aucun résultat, vérifier s'il y a des listings dans la base sans les filtres
        const checkQuery = `SELECT COUNT(*) as total, 
          COUNT(CASE WHEN producer_id = $1 THEN 1 END) as by_producer,
          COUNT(CASE WHEN farm_id = $2 THEN 1 END) as by_farm,
          COUNT(CASE WHEN producer_id = $1 AND farm_id = $2 THEN 1 END) as by_both
          FROM marketplace_listings WHERE status != 'removed'`;
        const checkResult = await this.databaseService.query(checkQuery, [userId || '', projetId || '']);
        this.logger.debug(`[findAllListings] Aucun listing trouvé. Statistiques:`, checkResult.rows[0]);
        // Récupérer les valeurs réelles dans la base pour comparaison (debug uniquement)
        if (process.env.NODE_ENV !== 'production') {
          const actualValuesQuery = `SELECT id, producer_id, farm_id, status, 
            pg_typeof(producer_id) as producer_id_type, 
            pg_typeof(farm_id) as farm_id_type
            FROM marketplace_listings WHERE status != 'removed' LIMIT 5`;
          const actualValues = await this.databaseService.query(actualValuesQuery);
          this.logger.debug(`[findAllListings] Valeurs réelles dans la base:`, actualValues.rows);
        }
      }
      
      // Mapper les résultats avec gestion d'erreur pour chaque ligne
      const listings = [];
      for (const row of result.rows) {
        try {
          listings.push(this.mapRowToListing(row));
        } catch (error: any) {
          this.logger.error(`Erreur lors du mapping d'un listing (id: ${row?.id || 'unknown'}):`, {
            error: error.message,
            stack: error.stack,
            rowData: {
              id: row?.id,
              listing_type: row?.listing_type,
              status: row?.status,
            },
          });
          // Continuer avec les autres listings au lieu de tout faire échouer
          // Skip ce listing problématique
        }
      }
      
      this.logger.debug(`[findAllListings] ${listings.length} listings mappés avec succès, total: ${total}`);
      
      // Calculer les informations de pagination
      const currentPage = Math.floor(effectiveOffset / effectiveLimit) + 1;
      const totalPages = Math.ceil(total / effectiveLimit);
      const hasMore = effectiveOffset + listings.length < total;
      
      // Retourner un objet avec pagination pour compatibilité avec le frontend
      return {
        listings,
        total,
        page: currentPage,
        totalPages,
        hasMore,
        limit: effectiveLimit,
        offset: effectiveOffset,
      };
    } catch (error: any) {
      // Si la table n'existe pas encore, retourner un tableau vide
      if (error.message?.includes('does not exist') || error.message?.includes("n'existe pas")) {
        // Si c'est une erreur de colonne manquante dans la requête SELECT, essayer avec moins de colonnes
        if (error.message?.includes('column')) {
          this.logger.warn(
            'Colonne manquante détectée, tentative avec colonnes de base uniquement',
            { error: error.message }
          );
          try {
            // Requête minimale avec seulement les colonnes essentielles
            let minimalQuery = `SELECT id, listing_type, subject_id, batch_id, producer_id, farm_id, 
              price_per_kg, calculated_price, status, listed_at, updated_at
              FROM marketplace_listings WHERE status != $1`;
            const minimalParams: any[] = ['removed'];
            
            if (projetId) {
              // farm_id et projet_id sont tous deux de type TEXT, pas besoin de CAST
              minimalQuery += ` AND farm_id = $${minimalParams.length + 1}`;
              minimalParams.push(projetId.trim()); // Trim pour éviter les espaces
            }
            
            if (userId) {
              minimalQuery += ` AND producer_id = $${minimalParams.length + 1}`;
              minimalParams.push(userId);
            }
            
            minimalQuery += ` ORDER BY listed_at DESC LIMIT $${minimalParams.length + 1} OFFSET $${minimalParams.length + 2}`;
            minimalParams.push(effectiveLimit, effectiveOffset);
            
            const minimalResult = await this.databaseService.query(minimalQuery, minimalParams);
            const minimalListings = [];
            for (const row of minimalResult.rows) {
              try {
                minimalListings.push(this.mapRowToListing(row));
              } catch (mapError: any) {
                this.logger.warn(`Erreur mapping listing minimal (id: ${row?.id}):`, mapError.message);
              }
            }
            // Retourner avec structure de pagination (approximation du total)
            const currentPage = Math.floor(effectiveOffset / effectiveLimit) + 1;
            return {
              listings: minimalListings,
              total: minimalListings.length,
              page: currentPage,
              totalPages: 1,
              hasMore: false,
              limit: effectiveLimit,
              offset: effectiveOffset,
            };
          } catch (fallbackError: any) {
            this.logger.error('Erreur même avec requête minimale:', fallbackError.message);
            return {
              listings: [],
              total: 0,
              page: 1,
              totalPages: 0,
              hasMore: false,
              limit: effectiveLimit,
              offset: effectiveOffset,
            };
          }
        }
        
        // Si c'est la table qui n'existe pas, retourner un objet vide avec structure de pagination
        this.logger.warn(
          'Table marketplace_listings n\'existe pas encore, retour d\'un tableau vide'
        );
        return {
          listings: [],
          total: 0,
          page: 1,
          totalPages: 0,
          hasMore: false,
          limit: effectiveLimit,
          offset: effectiveOffset,
        };
      }
      
      this.logger.error('Erreur lors de la récupération des listings:', {
        error: error.message,
        stack: error.stack,
        query: query.substring(0, 200), // Log les 200 premiers caractères de la requête
        params: params,
      });
      throw error;
    }
  }

  async findOneListing(id: string) {
    // Colonnes nécessaires pour mapRowToListing
    const listingColumns = `id, listing_type, subject_id, batch_id, pig_ids, pig_count, 
      producer_id, farm_id, price_per_kg, calculated_price, 
      status, listed_at, updated_at, last_weight_date, 
      location_latitude, location_longitude, location_address, location_city, location_region,
      sale_terms, views, inquiries, photos, date_creation, derniere_modification`;
    
    const result = await this.databaseService.query(
      `SELECT ${listingColumns} FROM marketplace_listings WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Listing introuvable');
    }

    // Incrémenter les vues
    await this.databaseService.query(
      'UPDATE marketplace_listings SET views = views + 1 WHERE id = $1',
      [id]
    );

    return this.mapRowToListing(result.rows[0]);
  }

  /**
   * Récupérer le listing actif d'un sujet
   * Optimisé pour éviter de charger tous les listings
   */
  async findActiveListingBySubject(subjectId: string) {
    const listingColumns = `id, listing_type, subject_id, batch_id, pig_ids, pig_count, 
      producer_id, farm_id, price_per_kg, calculated_price, 
      status, listed_at, updated_at, last_weight_date, 
      location_latitude, location_longitude, location_address, location_city, location_region,
      sale_terms, views, inquiries, photos, date_creation, derniere_modification`;
    
    // Rechercher un listing actif pour ce sujet (individual ou batch)
    const result = await this.databaseService.query(
      `SELECT ${listingColumns} FROM marketplace_listings 
       WHERE (subject_id = $1 OR (pig_ids IS NOT NULL AND pig_ids @> to_jsonb(ARRAY[$1])))
       AND status IN ('available', 'reserved')
       ORDER BY listed_at DESC
       LIMIT 1`,
      [subjectId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Aucun listing actif pour ce sujet');
    }

    return this.mapRowToListing(result.rows[0]);
  }

  /**
   * Récupérer les informations publiques d'un animal listé sur le marketplace
   * Cette méthode permet aux acheteurs de voir les animaux d'autres producteurs
   * sans vérifier l'appartenance de l'animal
   */
  async getMarketplaceAnimalInfo(animalId: string) {
    try {
      this.logger.log(`[getMarketplaceAnimalInfo] Récupération info animal ${animalId}`);
      
      // Vérifier que l'animal existe
      const animalResult = await this.databaseService.query(
        `SELECT id, code, nom, sexe, race, date_naissance, poids_initial, 
                categorie_poids, statut, reproducteur, photo_uri
         FROM production_animaux 
         WHERE id = $1`,
        [animalId]
      );

      if (animalResult.rows.length === 0) {
        this.logger.warn(`[getMarketplaceAnimalInfo] Animal ${animalId} introuvable`);
        throw new NotFoundException('Animal introuvable');
      }

      // Vérifier que l'animal est listé sur le marketplace
      // Soit via subject_id (listing individuel), soit via pig_ids (listing batch)
      // Pour JSONB, utiliser l'opérateur @> (contient) au lieu de ANY()
      const listingCheck = await this.databaseService.query(
        `SELECT id FROM marketplace_listings 
         WHERE (subject_id = $1 OR (pig_ids IS NOT NULL AND pig_ids @> to_jsonb(ARRAY[$1]))) 
         AND status = 'available'
         LIMIT 1`,
        [animalId]
      );

      if (listingCheck.rows.length === 0) {
        this.logger.warn(`[getMarketplaceAnimalInfo] Animal ${animalId} non listé sur le marketplace`);
        throw new NotFoundException('Cet animal n\'est pas actuellement listé sur le marketplace');
      }

      const animal = animalResult.rows[0];

      // Récupérer la dernière pesée (informations publiques pour les acheteurs)
      let dernierePesee = null;
      try {
        const peseeResult = await this.databaseService.query(
          `SELECT poids_kg, date 
           FROM production_pesees 
           WHERE animal_id = $1 
           ORDER BY date DESC 
           LIMIT 1`,
          [animalId]
        );
        dernierePesee = peseeResult.rows[0] || null;
      } catch (peseeError) {
        this.logger.warn(`[getMarketplaceAnimalInfo] Erreur récupération pesée pour ${animalId}:`, peseeError);
        // Continuer sans la pesée si erreur
      }

      const result = {
        id: animal.id,
        code: animal.code,
        nom: animal.nom,
        sexe: animal.sexe,
        race: animal.race,
        date_naissance: animal.date_naissance,
        poids_initial: animal.poids_initial ? parseFloat(animal.poids_initial) : null,
        categorie_poids: animal.categorie_poids,
        statut: animal.statut,
        reproducteur: animal.reproducteur,
        photo_uri: animal.photo_uri,
        derniere_pesee: dernierePesee ? {
          poids_kg: parseFloat(dernierePesee.poids_kg),
          date: dernierePesee.date,
        } : null,
      };

      this.logger.log(`[getMarketplaceAnimalInfo] Info animal ${animalId} récupérée avec succès`);
      return result;
    } catch (error) {
      this.logger.error(`[getMarketplaceAnimalInfo] Erreur récupération info animal ${animalId}:`, error);
      // Si c'est déjà une NotFoundException, la relancer
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Sinon, relancer comme erreur interne
      throw error;
    }
  }

  /**
   * Récupérer les sujets d'un listing avec leurs détails
   * Permet aux acheteurs de voir les informations des sujets listés
   * ✅ Utilise un cache pour éviter les requêtes répétées (TTL: 2 minutes)
   */
  async getListingSubjects(listingId: string) {
    // ✅ Cache : TTL de 2 minutes pour les données de listings (sujets + dernières pesées)
    const cacheKey = `listing_subjects:${listingId}`;
    
    const cached = this.cacheService.get<{
      listing: any;
      subjects: any[];
    }>(cacheKey);
    
    if (cached) {
      this.logger.debug(`[getListingSubjects] Cache hit pour listing ${listingId}`);
      return {
        listing: this.mapRowToListing(cached.listing),
        subjects: cached.subjects,
      };
    }

    // ✅ Log de diagnostic : voir quel ID est recherché
    this.logger.debug(`[getListingSubjects] Recherche listing avec ID: ${listingId}`);

    const listingResult = await this.databaseService.query(
      `SELECT * FROM marketplace_listings WHERE id = $1`,
      [listingId]
    );

    if (listingResult.rows.length === 0) {
      // ✅ Log de diagnostic : voir pourquoi le listing n'est pas trouvé
      this.logger.warn(`[getListingSubjects] Listing non trouvé pour ID: ${listingId} (type: ${typeof listingId}, longueur: ${listingId?.length})`);
      
      // Vérifier si c'est peut-être un pigId au lieu d'un listingId
      const pigIdCheck = await this.databaseService.query(
        `SELECT id FROM production_animaux WHERE id = $1 LIMIT 1`,
        [listingId]
      );
      
      if (pigIdCheck.rows.length > 0) {
        this.logger.warn(`[getListingSubjects] L'ID ${listingId} correspond à un animal (pigId), pas à un listing. Vérifier que originalListingId est utilisé.`);
      }
      
      // Lancer NotFoundException après la vérification pigId
      throw new NotFoundException(`Listing non trouvé pour l'ID: ${listingId}`);
    }

    const listing = listingResult.rows[0];
    let subjects: any[] = [];

    // Récupérer les informations des animaux selon le type de listing
    // ✅ Pour les listings batch, subject_id est NULL (normal)
    if (listing.listing_type === 'individual' && listing.subject_id) {
      // Listing individuel : un seul animal
      const animalResult = await this.databaseService.query(
        `SELECT 
          a.id, a.code, a.nom, a.race, a.sexe, a.date_naissance, 
          a.poids_initial, a.categorie_poids, a.statut, a.photo_uri,
          (
            SELECT poids_kg 
            FROM production_pesees 
            WHERE animal_id = a.id 
            ORDER BY date DESC 
            LIMIT 1
          ) as derniere_pesee_poids,
          (
            SELECT date 
            FROM production_pesees 
            WHERE animal_id = a.id 
            ORDER BY date DESC 
            LIMIT 1
          ) as derniere_pesee_date
        FROM production_animaux a
        WHERE a.id = $1`,
        [listing.subject_id]
      );

      subjects = animalResult.rows.map((row: any) => ({
        id: row.id,
        code: row.code,
        nom: row.nom,
        race: row.race,
        sexe: row.sexe,
        date_naissance: row.date_naissance,
        poids_initial: row.poids_initial ? parseFloat(row.poids_initial) : null,
        categorie_poids: row.categorie_poids,
        statut: row.statut,
        photo_uri: row.photo_uri,
        derniere_pesee: row.derniere_pesee_poids ? {
          poids_kg: parseFloat(row.derniere_pesee_poids),
          date: row.derniere_pesee_date,
        } : null,
      }));
    } else if (listing.listing_type === 'batch' && listing.pig_ids) {
      // Listing batch : plusieurs animaux
      // ✅ Log de diagnostic : voir ce que contient pig_ids
      this.logger.debug(`[getListingSubjects] Listing batch - pig_ids type: ${typeof listing.pig_ids}, isArray: ${Array.isArray(listing.pig_ids)}, value: ${JSON.stringify(listing.pig_ids)}`);
      
      // ✅ Convertir pig_ids JSONB en array PostgreSQL pour la requête ANY()
      // pig_ids peut être un JSONB array ou déjà un array JavaScript selon le driver
      let pigIdsArray: string[];
      if (Array.isArray(listing.pig_ids)) {
        pigIdsArray = listing.pig_ids;
        this.logger.debug(`[getListingSubjects] pig_ids est déjà un array JavaScript: ${pigIdsArray.length} éléments`);
      } else if (typeof listing.pig_ids === 'string') {
        try {
          pigIdsArray = JSON.parse(listing.pig_ids);
          this.logger.debug(`[getListingSubjects] pig_ids était une string JSON, parsée en array: ${pigIdsArray.length} éléments`);
        } catch (error) {
          this.logger.warn(`[getListingSubjects] Erreur parsing pig_ids JSON pour listing ${listingId}:`, error);
          pigIdsArray = [];
        }
      } else {
        // Si c'est un JSONB, extraire les valeurs avec jsonb_array_elements_text
        // On va utiliser une requête qui convertit le JSONB en array
        this.logger.debug(`[getListingSubjects] pig_ids est un JSONB, conversion nécessaire`);
        const pigIdsResult = await this.databaseService.query(
          `SELECT ARRAY(SELECT jsonb_array_elements_text($1::jsonb))::varchar[] as pig_ids_array`,
          [JSON.stringify(listing.pig_ids)]
        );
        pigIdsArray = pigIdsResult.rows[0]?.pig_ids_array || [];
        this.logger.debug(`[getListingSubjects] pig_ids JSONB converti en array: ${pigIdsArray.length} éléments`);
      }

      // ✅ Log de diagnostic : voir les pigIds extraits
      this.logger.debug(`[getListingSubjects] pigIdsArray final: ${JSON.stringify(pigIdsArray)}`);

      if (pigIdsArray.length === 0) {
        this.logger.warn(`[getListingSubjects] Aucun pigId valide trouvé dans pig_ids pour listing ${listingId}. pig_ids original: ${JSON.stringify(listing.pig_ids)}`);
        subjects = [];
      } else {
        // ✅ Log de diagnostic : voir la requête qui sera exécutée
        this.logger.debug(`[getListingSubjects] Exécution requête SQL avec ${pigIdsArray.length} pigIds: ${JSON.stringify(pigIdsArray.slice(0, 5))}...`);
        
        // ✅ IMPORTANT: Pour les listings batch, les animaux sont dans batch_pigs, pas production_animaux
        const animalsResult = await this.databaseService.query(
          `SELECT 
            bp.id,
            COALESCE(bp.name, bp.id::text) as code, -- batch_pigs n'a pas de code, utiliser name ou id
            bp.name as nom,
            NULL as race, -- batches n'a pas de race, sera null
            bp.sex as sexe, -- batch_pigs a une colonne sex
            bp.birth_date as date_naissance, -- batch_pigs a birth_date
            bp.current_weight_kg as poids_initial, -- Utiliser current_weight_kg comme poids
            NULL as categorie_poids, -- batch_pigs n'a pas de categorie_poids
            'vivant' as statut, -- batch_pigs n'a pas de colonne status, utiliser 'vivant' par défaut
            bp.photo_url as photo_uri, -- batch_pigs a photo_url, pas photo_uri
            bp.current_weight_kg as derniere_pesee_poids, -- Utiliser current_weight_kg comme dernière pesée
            bp.last_weighing_date as derniere_pesee_date -- Utiliser last_weighing_date si disponible
          FROM batch_pigs bp
          WHERE bp.id = ANY($1::varchar[])`,
          [pigIdsArray]
        );

        // ✅ Log de diagnostic : voir combien d'animaux ont été trouvés
        this.logger.debug(`[getListingSubjects] Requête SQL retournée ${animalsResult.rows.length} animaux sur ${pigIdsArray.length} pigIds recherchés`);
        
        if (animalsResult.rows.length < pigIdsArray.length) {
          // Trouver les pigIds qui n'ont pas été trouvés
          const foundIds = new Set(animalsResult.rows.map((r: any) => r.id));
          const missingIds = pigIdsArray.filter(id => !foundIds.has(id));
          this.logger.warn(`[getListingSubjects] ${missingIds.length} pigIds non trouvés dans production_animaux: ${JSON.stringify(missingIds)}`);
        }

        subjects = animalsResult.rows.map((row: any) => ({
          id: row.id,
          code: row.code || `#${row.id.slice(0, 8)}`, // Fallback si pas de code
          nom: row.nom || null,
          race: row.race || null,
          sexe: row.sexe || null,
          date_naissance: row.date_naissance || null,
          poids_initial: row.poids_initial ? parseFloat(row.poids_initial) : (row.derniere_pesee_poids ? parseFloat(row.derniere_pesee_poids) : null),
          categorie_poids: row.categorie_poids || null,
          statut: row.statut || 'vivant',
          photo_uri: row.photo_uri || null,
          derniere_pesee: row.derniere_pesee_poids ? {
            poids_kg: parseFloat(row.derniere_pesee_poids),
            date: row.derniere_pesee_date || new Date().toISOString(),
          } : null,
        }));
      }
    }

    const result = {
      listing: this.mapRowToListing(listing),
      subjects,
    };

    // ✅ Mettre en cache (TTL: 2 minutes - données publiques, changement peu fréquent)
    this.cacheService.set(cacheKey, {
      listing: listingResult.rows[0], // Stocker la ligne DB brute pour mapRowToListing
      subjects,
    }, 120); // 2 minutes

    return result;
  }

  /**
   * Récupérer plusieurs listings avec leurs sujets en une seule requête
   */
  async getListingsWithSubjects(listingIds: string[]) {
    // ✅ Log de diagnostic : voir quels IDs sont reçus
    this.logger.log(`[getListingsWithSubjects] Appelé avec ${listingIds.length} listingIds:`, listingIds);

    const results = await Promise.allSettled(
      listingIds.map(id => this.getListingSubjects(id))
    );

    // ✅ Log de diagnostic : voir quels IDs ont réussi/échoué
    const successful: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    results.forEach((result, index) => {
      const listingId = listingIds[index];
      if (result.status === 'fulfilled') {
        successful.push(listingId);
      } else {
        failed.push({
          id: listingId,
          reason: result.reason?.message || String(result.reason) || 'Unknown error',
        });
      }
    });

    this.logger.log(`[getListingsWithSubjects] Résultats: ${successful.length} réussis, ${failed.length} échoués`);
    
    if (failed.length > 0) {
      this.logger.warn(`[getListingsWithSubjects] IDs échoués:`, failed);
    }

    return results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  async updateListing(id: string, updateListingDto: UpdateListingDto, userId: string) {
    const listing = await this.findOneListing(id);

    // Vérifier la propriété
    if (listing.producerId !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette annonce");
    }

    // ✅ Invalider le cache du listing modifié
    this.cacheService.delete(`listing_subjects:${id}`);

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateListingDto.pricePerKg !== undefined) {
      fields.push(`price_per_kg = $${paramIndex}`);
      values.push(updateListingDto.pricePerKg);
      paramIndex++;
    }

    if (updateListingDto.status) {
      fields.push(`status = $${paramIndex}`);
      values.push(updateListingDto.status);
      paramIndex++;
    }

    if (updateListingDto.location) {
      fields.push(`location_latitude = $${paramIndex}`);
      values.push(updateListingDto.location.latitude);
      paramIndex++;
      fields.push(`location_longitude = $${paramIndex}`);
      values.push(updateListingDto.location.longitude);
      paramIndex++;
      fields.push(`location_address = $${paramIndex}`);
      values.push(updateListingDto.location.address);
      paramIndex++;
      fields.push(`location_city = $${paramIndex}`);
      values.push(updateListingDto.location.city);
      paramIndex++;
      fields.push(`location_region = $${paramIndex}`);
      values.push(updateListingDto.location.region);
      paramIndex++;
    }

    if (fields.length === 0) {
      return listing;
    }

    values.push(new Date().toISOString()); // updated_at
    values.push(id);
    values.push(userId);

    const query = `
      UPDATE marketplace_listings 
      SET ${fields.join(', ')}, updated_at = $${paramIndex}, derniere_modification = $${paramIndex}
      WHERE id = $${paramIndex + 1} AND producer_id = $${paramIndex + 2}
      RETURNING *
    `;

    const result = await this.databaseService.query(query, values);

    if (result.rows.length === 0) {
      throw new NotFoundException('Listing introuvable ou non autorisé');
    }

    return this.mapRowToListing(result.rows[0]);
  }

  async deleteListing(id: string, userId: string) {
    const listing = await this.findOneListing(id);

    if (listing.producerId !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer cette annonce");
    }

    // ✅ Invalider le cache du listing supprimé
    this.cacheService.delete(`listing_subjects:${id}`);

    // Vérifier qu'il n'y a pas d'offres en attente
    const offers = await this.databaseService.query(
      'SELECT id FROM marketplace_offers WHERE listing_id = $1 AND status = $2',
      [id, 'pending']
    );

    if (offers.rows.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer cette annonce, des offres sont en attente'
      );
    }

    await this.databaseService.query(
      'UPDATE marketplace_listings SET status = $1, derniere_modification = $2 WHERE id = $3',
      ['removed', new Date().toISOString(), id]
    );

    // Mettre à jour le statut selon le type de listing
    if (listing.listingType === 'individual' && listing.subjectId) {
      // Mettre à jour le statut de l'animal individuel
      await this.databaseService
        .query(
          'UPDATE production_animaux SET marketplace_status = NULL, marketplace_listing_id = NULL WHERE id = $1',
          [listing.subjectId]
        )
        .catch(() => {
          // Ignorer si les colonnes n'existent pas
        });
    }
    // Pour les listings de bande, on ne modifie pas les batch_pigs car ils restent dans la bande

    return { id };
  }

  // ========================================
  // OFFERS
  // ========================================

  async createOffer(createOfferDto: CreateOfferDto, userId: string) {
    const listing = await this.findOneListing(createOfferDto.listingId);

    // Vérifier que l'utilisateur n'est pas le producteur
    if (listing.producerId === userId) {
      throw new ForbiddenException("Vous ne pouvez pas faire d'offre sur vos propres sujets");
    }

    if (listing.status !== 'available') {
      throw new BadRequestException("Cette annonce n'est plus disponible");
    }

    // Vérifier si l'acheteur a déjà une offre acceptée pour ce listing
    const existingAcceptedOffer = await this.databaseService.query(
      `SELECT id, status FROM marketplace_offers 
       WHERE buyer_id = $1 
       AND listing_id = $2 
       AND status = 'accepted'
       LIMIT 1`,
      [userId, createOfferDto.listingId]
    );

    if (existingAcceptedOffer.rows.length > 0) {
      throw new BadRequestException(
        "Vous avez déjà une offre acceptée par le producteur pour ce sujet. Merci de consulter vos offres reçues."
      );
    }

    const id = this.generateId('offer');
    const now = new Date().toISOString();
    const expiresAt =
      createOfferDto.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO marketplace_offers (
        id, listing_id, subject_ids, buyer_id, producer_id,
        proposed_price, original_price, message, status,
        terms_accepted, created_at, expires_at, date_recuperation_souhaitee,
        date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id,
        createOfferDto.listingId,
        createOfferDto.subjectIds,
        userId,
        listing.producerId,
        createOfferDto.proposedPrice,
        listing.calculatedPrice,
        createOfferDto.message || null,
        'pending',
        false,
        now,
        expiresAt,
        createOfferDto.dateRecuperationSouhaitee || null,
        now,
        now,
      ]
    );

    // Incrémenter les inquiries du listing
    await this.databaseService.query(
      'UPDATE marketplace_listings SET inquiries = inquiries + 1 WHERE id = $1',
      [createOfferDto.listingId]
    );

    // ✅ Notifier le producteur de la nouvelle offre
    try {
      const offerSubjectCount = createOfferDto.subjectIds?.length || 1;
      await this.notificationsService.createNotification({
        userId: listing.producerId,
        type: NotificationType.NEW_OFFER,
        title: 'Nouvelle offre reçue',
        message: `Vous avez reçu une offre de ${createOfferDto.proposedPrice.toLocaleString('fr-FR')} FCFA pour ${offerSubjectCount} sujet(s)`,
        relatedType: 'offer',
        relatedId: id,
      });
      this.logger.log(`[createOffer] Notification envoyée au producteur ${listing.producerId} pour offre ${id}`);
    } catch (error) {
      this.logger.warn(`[createOffer] Erreur notification au producteur: ${error.message}`);
    }

    return this.mapRowToOffer(result.rows[0]);
  }

  async findAllOffers(listingId?: string, buyerId?: string, producerId?: string) {
    try {
      let query = 'SELECT * FROM marketplace_offers WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (listingId) {
        query += ` AND listing_id = $${paramIndex}`;
        params.push(listingId);
        paramIndex++;
      }

      if (buyerId) {
        query += ` AND buyer_id = $${paramIndex}`;
        params.push(buyerId);
        paramIndex++;
      }

      if (producerId) {
        query += ` AND producer_id = $${paramIndex}`;
        params.push(producerId);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.databaseService.query(query, params);
      return result.rows.map((row) => this.mapRowToOffer(row));
    } catch (error: any) {
      // Si la table n'existe pas encore, retourner un tableau vide
      if (error.message?.includes('does not exist') || error.message?.includes('n\'existe pas')) {
        this.logger.warn('Table marketplace_offers n\'existe pas encore, retour d\'un tableau vide');
        return [];
      }
      throw error;
    }
  }

  async acceptOffer(offerId: string, userId: string, role: 'producer' | 'buyer' = 'producer') {
    // Récupérer l'offre avant la transaction pour validation
    const offer = await this.databaseService.query(
      'SELECT * FROM marketplace_offers WHERE id = $1',
      [offerId]
    );

    if (offer.rows.length === 0) {
      throw new NotFoundException('Offre introuvable');
    }

    const offerData = offer.rows[0];

    // Vérifier les permissions selon le rôle
    if (role === 'producer') {
      if (offerData.producer_id !== userId) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à accepter cette offre");
      }
      if (offerData.status !== 'pending') {
        throw new BadRequestException('Cette offre ne peut plus être acceptée');
      }
    } else if (role === 'buyer') {
      // L'acheteur ne peut accepter que les contre-propositions
      if (offerData.buyer_id !== userId) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à accepter cette offre");
      }
      if (offerData.status !== 'countered') {
        throw new BadRequestException('Vous ne pouvez accepter que les contre-propositions');
      }
    }

    // Utiliser une transaction pour garantir la cohérence des données
    return await this.databaseService.transaction(async (client) => {
      const now = new Date().toISOString();

      // Mettre à jour l'offre avec prix_total_final
      await client.query(
        'UPDATE marketplace_offers SET status = $1, responded_at = $2, prix_total_final = $3, derniere_modification = $2 WHERE id = $4',
        ['accepted', now, offerData.proposed_price, offerId]
      );

      // ✅ Récupérer le listing pour déterminer la mise à jour appropriée
      const listingResult = await client.query(
        'SELECT pig_ids, pig_count, listing_type, price_per_kg, weight FROM marketplace_listings WHERE id = $1',
        [offerData.listing_id]
      );
      
      const listing = listingResult.rows[0];
      const offerSubjectIds = Array.isArray(offerData.subject_ids) 
        ? offerData.subject_ids 
        : JSON.parse(offerData.subject_ids || '[]');
      const listingPigIds = Array.isArray(listing?.pig_ids) 
        ? listing.pig_ids 
        : JSON.parse(listing?.pig_ids || '[]');
      
      // ✅ Déterminer si l'offre concerne tous les sujets ou seulement une partie
      const isPartialSale = listing?.listing_type === 'batch' && 
                           listingPigIds.length > 0 && 
                           offerSubjectIds.length > 0 &&
                           offerSubjectIds.length < listingPigIds.length;
      
      if (isPartialSale) {
        // ✅ VENTE PARTIELLE: Retirer les sujets vendus du listing et le garder actif
        const remainingPigIds = listingPigIds.filter((id: string) => !offerSubjectIds.includes(id));
        const newPigCount = remainingPigIds.length;
        
        // Recalculer le poids moyen et le prix pour les sujets restants
        // Optimisation: utiliser le poids moyen existant du listing comme approximation
        // Cela évite une requête SQL coûteuse sur batch_pigs qui peut prendre plusieurs secondes
        // Le poids moyen reste généralement stable pour un lot
        const newAvgWeight = listing.weight || 0;
        const pricePerKg = parseFloat(listing.price_per_kg) || 0;
        const newCalculatedPrice = pricePerKg * newAvgWeight * newPigCount;
        
        await client.query(
          `UPDATE marketplace_listings 
           SET pig_ids = $1, pig_count = $2, weight = $3, calculated_price = $4, 
               status = 'available', derniere_modification = $5 
           WHERE id = $6`,
          [JSON.stringify(remainingPigIds), newPigCount, newAvgWeight, newCalculatedPrice, now, offerData.listing_id]
        );
        
        this.logger.log(`[acceptOffer] Vente partielle: ${offerSubjectIds.length} sujet(s) vendu(s), ${remainingPigIds.length} restant(s) sur le listing ${offerData.listing_id}`);
      } else {
        // ✅ VENTE TOTALE: Marquer le listing comme réservé/vendu
        await client.query(
          'UPDATE marketplace_listings SET status = $1, derniere_modification = $2 WHERE id = $3',
          ['reserved', now, offerData.listing_id]
        );
        
        this.logger.log(`[acceptOffer] Vente totale: listing ${offerData.listing_id} marqué comme 'reserved'`);
      }

      // Créer la transaction
      const transactionId = this.generateId('transaction');
      const transaction = await client.query(
        `INSERT INTO marketplace_transactions (
          id, offer_id, listing_id, subject_ids, buyer_id, producer_id,
          final_price, status, created_at, date_creation, derniere_modification
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          transactionId,
          offerId,
          offerData.listing_id,
          offerData.subject_ids,
          offerData.buyer_id,
          offerData.producer_id,
          offerData.proposed_price, // Prix final négocié
          'confirmed',
          now,
          now,
          now,
        ]
      );

      // ✅ Rejeter automatiquement les autres offres pending sur ce listing (si vente totale)
      if (!isPartialSale) {
        const rejectedOffersResult = await client.query(
          `UPDATE marketplace_offers 
           SET status = 'rejected', responded_at = $1, derniere_modification = $1
           WHERE listing_id = $2 AND id != $3 AND status IN ('pending', 'countered')
           RETURNING id, buyer_id`,
          [now, offerData.listing_id, offerId]
        );

        // Notifier les autres acheteurs que leurs offres ont été automatiquement rejetées
        // Optimisation: envoyer les notifications en parallèle au lieu de séquentiellement
        if (rejectedOffersResult.rows.length > 0) {
          const notificationPromises = rejectedOffersResult.rows.map((rejectedOffer) =>
            this.notificationsService.createNotification({
              userId: rejectedOffer.buyer_id,
              type: NotificationType.OFFER_REJECTED,
              title: 'Offre non retenue',
              message: 'Votre offre n\'a pas été retenue car une autre offre a été acceptée sur cette annonce',
              relatedType: 'offer',
              relatedId: rejectedOffer.id,
            }).catch((e) => {
              this.logger.warn(`[acceptOffer] Erreur notification offre rejetée ${rejectedOffer.id}: ${e.message}`);
            })
          );
          
          // Attendre toutes les notifications en parallèle (avec timeout pour éviter de bloquer trop longtemps)
          await Promise.allSettled(notificationPromises);
        }

        if (rejectedOffersResult.rows.length > 0) {
          this.logger.log(`[acceptOffer] ${rejectedOffersResult.rows.length} autre(s) offre(s) automatiquement rejetée(s)`);
        }
      }

      // ✅ NOTIFICATIONS ENRICHIES avec contact et localisation
      // Récupérer les informations complètes du producteur et de l'acheteur
      const [producerResult, buyerResult, listingLocationResult] = await Promise.all([
        client.query(
          'SELECT id, nom, prenom, email, telephone FROM users WHERE id = $1',
          [offerData.producer_id]
        ),
        client.query(
          'SELECT id, nom, prenom, email, telephone FROM users WHERE id = $1',
          [offerData.buyer_id]
        ),
        client.query(
          `SELECT location_latitude, location_longitude, location_address, location_city, location_region, farm_id
           FROM marketplace_listings WHERE id = $1`,
          [offerData.listing_id]
        ),
      ]);

      const producer = producerResult.rows[0];
      const buyer = buyerResult.rows[0];
      const listingLocation = listingLocationResult.rows[0];

      // Récupérer le nom de la ferme si disponible
      let farmName = 'Ferme';
      if (listingLocation?.farm_id) {
        const farmResult = await client.query(
          'SELECT nom FROM projets WHERE id = $1',
          [listingLocation.farm_id]
        );
        if (farmResult.rows[0]?.nom) {
          farmName = farmResult.rows[0].nom;
        }
      }

      const subjectCount = offerSubjectIds.length || 1;
      const finalPrice = parseFloat(offerData.proposed_price) || 0;
      const pickupDate = offerData.date_recuperation_souhaitee 
        ? new Date(offerData.date_recuperation_souhaitee).toLocaleDateString('fr-FR')
        : null;

      // Envoyer les notifications enrichies en parallèle (sans bloquer)
      const notificationPromises = [];

      // Notification pour l'ACHETEUR avec détails de la ferme et contact producteur
      if (buyer) {
        notificationPromises.push(
          this.notificationsService.notifySaleConfirmedToBuyer(
            offerData.buyer_id,
            transactionId,
            {
              producerName: `${producer?.prenom || ''} ${producer?.nom || ''}`.trim() || 'Producteur',
              producerPhone: producer?.telephone || null,
              producerEmail: producer?.email || null,
              farmName,
              farmAddress: listingLocation?.location_address || 'Adresse non disponible',
              farmCity: listingLocation?.location_city || '',
              farmRegion: listingLocation?.location_region || null,
              latitude: listingLocation?.location_latitude ? parseFloat(listingLocation.location_latitude) : null,
              longitude: listingLocation?.location_longitude ? parseFloat(listingLocation.location_longitude) : null,
              finalPrice,
              subjectCount,
              pickupDate,
            }
          ).catch((e) => {
            this.logger.warn(`[acceptOffer] Erreur notification enrichie acheteur: ${e.message}`);
          })
        );
      }

      // Notification pour le PRODUCTEUR avec contact acheteur
      if (producer) {
        notificationPromises.push(
          this.notificationsService.notifySaleConfirmedToProducer(
            offerData.producer_id,
            transactionId,
            {
              buyerName: `${buyer?.prenom || ''} ${buyer?.nom || ''}`.trim() || 'Acheteur',
              buyerPhone: buyer?.telephone || null,
              buyerEmail: buyer?.email || null,
              finalPrice,
              subjectCount,
              pickupDate,
            }
          ).catch((e) => {
            this.logger.warn(`[acceptOffer] Erreur notification enrichie producteur: ${e.message}`);
          })
        );
      }

      // Attendre les notifications en parallèle (non-bloquant pour la réponse)
      Promise.allSettled(notificationPromises).then(() => {
        this.logger.log(`[acceptOffer] Notifications enrichies envoyées pour transaction ${transactionId}`);
      });

      return this.mapRowToTransaction(transaction.rows[0]);
    });
  }

  /**
   * Rejeter une offre
   * - Producteur peut rejeter une offre 'pending'
   * - Acheteur peut rejeter une contre-proposition 'countered'
   */
  async rejectOffer(offerId: string, userId: string, role: 'producer' | 'buyer' = 'producer') {
    const offer = await this.databaseService.query(
      'SELECT * FROM marketplace_offers WHERE id = $1',
      [offerId]
    );

    if (offer.rows.length === 0) {
      throw new NotFoundException('Offre introuvable');
    }

    const offerData = offer.rows[0];

    // Validation selon le rôle
    if (role === 'producer') {
      // Producteur peut rejeter une offre pending
      if (offerData.producer_id !== userId) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à rejeter cette offre");
      }
      if (offerData.status !== 'pending') {
        throw new BadRequestException('Cette offre ne peut plus être rejetée (statut: ' + offerData.status + ')');
      }
    } else if (role === 'buyer') {
      // Acheteur peut rejeter une contre-proposition
      if (offerData.buyer_id !== userId) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à rejeter cette offre");
      }
      if (offerData.status !== 'countered') {
        throw new BadRequestException('Vous ne pouvez rejeter que les contre-propositions reçues');
      }
    }

    const now = new Date().toISOString();

    await this.databaseService.query(
      'UPDATE marketplace_offers SET status = $1, responded_at = $2, derniere_modification = $2 WHERE id = $3',
      ['rejected', now, offerId]
    );

    // Notifier l'autre partie
    // Optimisation: notification en arrière-plan pour ne pas bloquer la réponse
    const notifyUserId = role === 'producer' ? offerData.buyer_id : offerData.producer_id;
    this.notificationsService.createNotification({
      userId: notifyUserId,
      type: NotificationType.OFFER_REJECTED,
      title: role === 'producer' ? 'Offre refusée' : 'Contre-proposition refusée',
      message: role === 'producer' 
        ? 'Le producteur a refusé votre offre'
        : 'L\'acheteur a refusé votre contre-proposition',
      relatedType: 'offer',
      relatedId: offerId,
    }).catch((error) => {
      this.logger.warn(`[rejectOffer] Erreur notification: ${error.message}`);
    });

    this.logger.log(`[rejectOffer] Offre ${offerId} rejetée par ${role} ${userId}`);
    return { id: offerId };
  }

  /**
   * Créer une contre-proposition (producteur propose un nouveau prix)
   */
  async counterOffer(
    offerId: string,
    producerId: string,
    counterOfferDto: { nouveau_prix_total: number; message?: string }
  ) {
    // Récupérer l'offre originale
    const originalOffer = await this.databaseService.query(
      'SELECT * FROM marketplace_offers WHERE id = $1',
      [offerId]
    );

    if (originalOffer.rows.length === 0) {
      throw new NotFoundException('Offre introuvable');
    }

    const originalOfferData = originalOffer.rows[0];

    // Vérifier que l'utilisateur est le producteur
    if (originalOfferData.producer_id !== producerId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à faire une contre-proposition sur cette offre");
    }

    // Vérifier que l'offre est en statut 'pending'
    if (originalOfferData.status !== 'pending') {
      throw new BadRequestException('Vous ne pouvez faire une contre-proposition que sur une offre en attente');
    }

    // Optimisation: vérifier le statut du listing avec une requête simple au lieu de findOneListing
    const listingStatusResult = await this.databaseService.query(
      'SELECT status, listing_type, pig_count FROM marketplace_listings WHERE id = $1',
      [originalOfferData.listing_id]
    );
    
    if (listingStatusResult.rows.length === 0 || listingStatusResult.rows[0].status !== 'available') {
      throw new BadRequestException("Cette annonce n'est plus disponible");
    }
    
    const listingInfo = listingStatusResult.rows[0];

    // Utiliser une transaction pour garantir la cohérence
    return await this.databaseService.transaction(async (client) => {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Créer une nouvelle offre (contre-proposition)
      const counterOfferId = this.generateId('offer');
      const counterOfferResult = await client.query(
        `INSERT INTO marketplace_offers (
          id, listing_id, subject_ids, buyer_id, producer_id,
          proposed_price, original_price, message, status,
          terms_accepted, counter_offer_of, created_at, expires_at, date_creation, derniere_modification
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          counterOfferId,
          originalOfferData.listing_id,
          originalOfferData.subject_ids,
          originalOfferData.buyer_id,
          producerId,
          counterOfferDto.nouveau_prix_total,
          originalOfferData.original_price,
          counterOfferDto.message || null,
          'countered',
          true, // terms_accepted (hérité de l'offre originale)
          offerId, // counter_offer_of : lien vers l'offre originale
          now,
          expiresAt,
          now,
          now,
        ]
      );

      // Mettre à jour l'offre originale : status = 'countered'
      await client.query(
        'UPDATE marketplace_offers SET status = $1, responded_at = $2, derniere_modification = $2 WHERE id = $3',
        ['countered', now, offerId]
      );

      // Notifier l'acheteur
      // Optimisation: utiliser les données du listing déjà récupérées au lieu de refaire findOneListing
      try {
        const listingTitle = listingInfo.listing_type === 'batch' 
          ? `Lot de ${listingInfo.pig_count || 1} sujet(s)`
          : 'Annonce';
        
        await this.notificationsService.notifyOfferCountered(
          originalOfferData.buyer_id,
          counterOfferId,
          listingTitle,
          counterOfferDto.nouveau_prix_total
        );
      } catch (error) {
        this.logger.warn(`[counterOffer] Impossible d'envoyer la notification: ${error.message}`);
        // Créer la notification de base si l'envoi échoue
        await this.notificationsService.createNotification({
          userId: originalOfferData.buyer_id,
          type: NotificationType.OFFER_COUNTERED,
          title: 'Contre-proposition reçue',
          message: `Le producteur vous propose un nouveau prix de ${counterOfferDto.nouveau_prix_total.toLocaleString('fr-FR')} FCFA`,
          relatedId: counterOfferId,
          relatedType: 'offer',
        }).catch((e) => {
          this.logger.warn(`[counterOffer] Erreur notification de base: ${e.message}`);
        });
      }

      return this.mapRowToOffer(counterOfferResult.rows[0]);
    });
  }

  // ========================================
  // TRANSACTIONS
  // ========================================

  async findAllTransactions(userId: string, role?: 'buyer' | 'producer') {
    try {
      let query = 'SELECT * FROM marketplace_transactions WHERE';
      const params: any[] = [];

      if (role === 'buyer') {
        query += ' buyer_id = $1';
        params.push(userId);
      } else if (role === 'producer') {
        query += ' producer_id = $1';
        params.push(userId);
      } else {
        query += ' (buyer_id = $1 OR producer_id = $1)';
        params.push(userId);
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.databaseService.query(query, params);
      return result.rows.map((row) => this.mapRowToTransaction(row));
    } catch (error: any) {
      // Si la table n'existe pas encore, retourner un tableau vide
      if (error.message?.includes('does not exist') || error.message?.includes('n\'existe pas')) {
        this.logger.warn('Table marketplace_transactions n\'existe pas encore, retour d\'un tableau vide');
        return [];
      }
      throw error;
    }
  }

  async confirmDelivery(transactionId: string, userId: string, role: 'producer' | 'buyer') {
    const transaction = await this.databaseService.query(
      'SELECT * FROM marketplace_transactions WHERE id = $1',
      [transactionId]
    );

    if (transaction.rows.length === 0) {
      throw new NotFoundException('Transaction introuvable');
    }

    const transactionData = transaction.rows[0];

    if (role === 'producer' && transactionData.producer_id !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à confirmer cette livraison");
    }

    if (role === 'buyer' && transactionData.buyer_id !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à confirmer cette livraison");
    }

    const deliveryDetails = transactionData.delivery_details || {};

    if (role === 'producer') {
      deliveryDetails.producerConfirmed = true;
      deliveryDetails.producerConfirmedAt = new Date().toISOString();
    } else {
      deliveryDetails.buyerConfirmed = true;
      deliveryDetails.buyerConfirmedAt = new Date().toISOString();
    }

    // Si les deux ont confirmé, passer à "completed"
    let newStatus = transactionData.status;
    const bothConfirmed = deliveryDetails.producerConfirmed && deliveryDetails.buyerConfirmed;

    if (bothConfirmed) {
      newStatus = 'completed';
    } else if (deliveryDetails.producerConfirmed || deliveryDetails.buyerConfirmed) {
      newStatus = 'delivered';
    }

    await this.databaseService.query(
      'UPDATE marketplace_transactions SET delivery_details = $1, status = $2, derniere_modification = $3 WHERE id = $4',
      [JSON.stringify(deliveryDetails), newStatus, new Date().toISOString(), transactionId]
    );

    // Si les deux ont confirmé, déclencher l'automatisation complète de la vente
    if (bothConfirmed && this.saleAutomationService) {
      try {
        await this.saleAutomationService.processSaleFromTransaction(transactionId);
        this.logger.log(`Automatisation de vente déclenchée pour la transaction ${transactionId}`);
      } catch (error) {
        this.logger.error(
          `Erreur lors de l'automatisation de la vente pour la transaction ${transactionId}:`,
          error
        );
        // Ne pas faire échouer la confirmation si l'automatisation échoue
        // L'erreur sera loggée et pourra être traitée manuellement
      }
    }

    return { transactionId, role };
  }

  // ========================================
  // RATINGS
  // ========================================

  async createRating(createRatingDto: CreateRatingDto, userId: string) {
    // Vérifier que la transaction existe et que l'utilisateur est l'acheteur
    const transaction = await this.databaseService.query(
      'SELECT * FROM marketplace_transactions WHERE id = $1 AND buyer_id = $2',
      [createRatingDto.transactionId, userId]
    );

    if (transaction.rows.length === 0) {
      throw new NotFoundException("Transaction introuvable ou vous n'êtes pas l'acheteur");
    }

    // Vérifier qu'il n'y a pas déjà une notation
    const existingRating = await this.databaseService.query(
      'SELECT id FROM marketplace_ratings WHERE transaction_id = $1',
      [createRatingDto.transactionId]
    );

    if (existingRating.rows.length > 0) {
      throw new BadRequestException('Une notation existe déjà pour cette transaction');
    }

    const id = this.generateId('rating');
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO marketplace_ratings (
        id, producer_id, buyer_id, transaction_id, ratings, overall,
        comment, photos, verified_purchase, status, created_at, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id,
        createRatingDto.producerId,
        userId,
        createRatingDto.transactionId,
        JSON.stringify(createRatingDto.ratings),
        createRatingDto.overall,
        createRatingDto.comment || null,
        createRatingDto.photos || [],
        true,
        'published',
        now,
        now,
        now,
      ]
    );

    return this.mapRowToRating(result.rows[0]);
  }

  async findAllRatings(producerId?: string) {
    let query = 'SELECT * FROM marketplace_ratings WHERE status = $1';
    const params: any[] = ['published'];

    if (producerId) {
      query += ' AND producer_id = $2';
      params.push(producerId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.databaseService.query(query, params);
    return result.rows.map((row) => this.mapRowToRating(row));
  }

  // ========================================
  // NOTIFICATIONS
  // ========================================


  // ========================================
  // HELPERS
  // ========================================

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

  private mapRowToListing(row: any): any {
    // Fonction helper pour parser JSON de manière sécurisée
    const safeJsonParse = (value: any, defaultValue: any = null): any => {
      // Si c'est déjà un objet/array, le retourner tel quel
      if (value && (typeof value === 'object' && !Array.isArray(value) || Array.isArray(value))) {
        return value;
      }
      // Si c'est null/undefined, retourner la valeur par défaut
      if (!value) {
        return defaultValue;
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
      listingType: row.listing_type || 'individual',
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

  private mapRowToOffer(row: any): any {
    return {
      id: row.id,
      listingId: row.listing_id,
      subjectIds: Array.isArray(row.subject_ids) ? row.subject_ids : [],
      buyerId: row.buyer_id,
      producerId: row.producer_id,
      proposedPrice: parseFloat(row.proposed_price),
      originalPrice: parseFloat(row.original_price),
      prixTotalFinal: row.prix_total_final ? parseFloat(row.prix_total_final) : undefined,
      message: row.message || undefined,
      status: row.status,
      termsAccepted: row.terms_accepted,
      termsAcceptedAt: row.terms_accepted_at
        ? new Date(row.terms_accepted_at).toISOString()
        : undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      respondedAt: row.responded_at ? new Date(row.responded_at).toISOString() : undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
      dateRecuperationSouhaitee: row.date_recuperation_souhaitee
        ? new Date(row.date_recuperation_souhaitee).toISOString()
        : undefined,
      counterOfferOf: row.counter_offer_of || undefined,
    };
  }

  private mapRowToTransaction(row: any): any {
    return {
      id: row.id,
      offerId: row.offer_id,
      listingId: row.listing_id,
      subjectIds: Array.isArray(row.subject_ids) ? row.subject_ids : [],
      buyerId: row.buyer_id,
      producerId: row.producer_id,
      finalPrice: parseFloat(row.final_price),
      status: row.status,
      deliveryDetails:
        typeof row.delivery_details === 'string'
          ? JSON.parse(row.delivery_details)
          : row.delivery_details,
      documents:
        typeof row.documents === 'string' ? JSON.parse(row.documents) : row.documents || {},
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : undefined,
      cancellationReason: row.cancellation_reason || undefined,
    };
  }

  private mapRowToRating(row: any): any {
    return {
      id: row.id,
      producerId: row.producer_id,
      buyerId: row.buyer_id,
      transactionId: row.transaction_id,
      ratings: typeof row.ratings === 'string' ? JSON.parse(row.ratings) : row.ratings,
      overall: parseFloat(row.overall),
      comment: row.comment || undefined,
      photos: Array.isArray(row.photos) ? row.photos : [],
      verifiedPurchase: row.verified_purchase,
      status: row.status,
      producerResponse:
        typeof row.producer_response === 'string'
          ? JSON.parse(row.producer_response)
          : row.producer_response,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      helpfulCount: row.helpful_count || 0,
    };
  }

  // ========================================
  // PURCHASE REQUESTS
  // ========================================

  async createPurchaseRequest(createPurchaseRequestDto: CreatePurchaseRequestDto, userId: string) {
    const id = this.generateId('pr');
    const now = new Date().toISOString();
    
    // Détecter le type d'émetteur
    const senderType = createPurchaseRequestDto.senderType || 'buyer';
    const senderId = createPurchaseRequestDto.senderId || userId;
    
    // Préparer les seuils de matching
    const matchingThresholds = createPurchaseRequestDto.matchingThresholds || {
      weightTolerance: 10,
      priceTolerance: 20,
      locationRadius: 50,
    };

    // Vérifier si les colonnes existent (pour compatibilité avec anciennes migrations)
    const columnCheck = await this.databaseService.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'purchase_requests' 
      AND column_name IN ('sender_type', 'sender_id', 'management_mode', 'growth_stage', 'matching_thresholds', 'farm_id')
    `);
    const existingColumns = columnCheck.rows.map((r) => r.column_name);
    const hasNewColumns = existingColumns.length > 0;

    // Construire la requête dynamiquement selon les colonnes disponibles
    let columns = [
      'id', 'buyer_id', 'title', 'race', 'min_weight', 'max_weight', 'age_category',
      'min_age_months', 'max_age_months', 'quantity', 'delivery_location',
      'max_price_per_kg', 'max_total_price', 'delivery_date', 'delivery_period_start',
      'delivery_period_end', 'message', 'status', 'views', 'matched_producers_count',
      'offers_count', 'expires_at', 'created_at', 'updated_at'
    ];
    let values = [
      id,
      senderId, // buyer_id pour compatibilité
      createPurchaseRequestDto.title,
      createPurchaseRequestDto.race,
      createPurchaseRequestDto.minWeight,
      createPurchaseRequestDto.maxWeight,
      createPurchaseRequestDto.ageCategory || null,
      createPurchaseRequestDto.minAgeMonths || null,
      createPurchaseRequestDto.maxAgeMonths || null,
      createPurchaseRequestDto.quantity,
      createPurchaseRequestDto.deliveryLocation
        ? JSON.stringify(createPurchaseRequestDto.deliveryLocation)
        : null,
      createPurchaseRequestDto.maxPricePerKg || null,
      createPurchaseRequestDto.maxTotalPrice || null,
      createPurchaseRequestDto.deliveryDate || null,
      createPurchaseRequestDto.deliveryPeriodStart || null,
      createPurchaseRequestDto.deliveryPeriodEnd || null,
      createPurchaseRequestDto.message || null,
      'published',
      0, // views
      0, // matched_producers_count
      0, // offers_count
      createPurchaseRequestDto.expiresAt || null,
      now,
      now,
    ];
    let paramIndex = values.length + 1;

    // Ajouter les nouveaux champs si les colonnes existent
    if (hasNewColumns) {
      if (existingColumns.includes('sender_type')) {
        columns.push('sender_type');
        values.push(senderType);
        paramIndex++;
      }
      if (existingColumns.includes('sender_id')) {
        columns.push('sender_id');
        values.push(senderId);
        paramIndex++;
      }
      if (existingColumns.includes('management_mode') && createPurchaseRequestDto.managementMode) {
        columns.push('management_mode');
        values.push(createPurchaseRequestDto.managementMode);
        paramIndex++;
      }
      if (existingColumns.includes('growth_stage') && createPurchaseRequestDto.growthStage) {
        columns.push('growth_stage');
        values.push(createPurchaseRequestDto.growthStage);
        paramIndex++;
      }
      if (existingColumns.includes('matching_thresholds')) {
        columns.push('matching_thresholds');
        values.push(JSON.stringify(matchingThresholds));
        paramIndex++;
      }
      if (existingColumns.includes('farm_id') && createPurchaseRequestDto.farmId) {
        columns.push('farm_id');
        values.push(createPurchaseRequestDto.farmId);
        paramIndex++;
      }
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const columnsStr = columns.join(', ');

    const result = await this.databaseService.query(
      `INSERT INTO purchase_requests (${columnsStr}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    const request = this.mapRowToPurchaseRequest(result.rows[0]);
    
    // Déclencher le matching automatique si les colonnes existent
    if (hasNewColumns) {
      try {
        await this.findMatchingProducersForRequest(id, matchingThresholds);
      } catch (error) {
        this.logger.warn(`Erreur lors du matching automatique pour la demande ${id}:`, error);
        // Ne pas faire échouer la création si le matching échoue
      }
    }

    return request;
  }

  async findAllPurchaseRequests(userId: string, buyerId?: string, status?: string) {
    let query = 'SELECT * FROM purchase_requests WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Vérifier si sender_id existe
    const hasSenderId = await this.databaseService.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'purchase_requests' AND column_name = 'sender_id'
    `);
    const useSenderId = hasSenderId.rows.length > 0;

    if (buyerId) {
      if (useSenderId) {
        query += ` AND sender_id = $${paramIndex}`;
      } else {
        query += ` AND buyer_id = $${paramIndex}`;
      }
      params.push(buyerId);
      paramIndex++;
    } else {
      // Si pas de buyerId spécifié, retourner uniquement les demandes publiées
      query += ` AND status = 'published'`;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.databaseService.query(query, params);
    return result.rows.map((row) => this.mapRowToPurchaseRequest(row));
  }

  /**
   * Récupère les demandes envoyées par l'utilisateur (acheteur ou producteur)
   */
  async findSentPurchaseRequests(userId: string) {
    try {
      // Vérifier d'abord si la table existe
      const tableExists = await this.databaseService.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'purchase_requests'
      `);
      
      if (tableExists.rows.length === 0) {
        this.logger.warn('Table purchase_requests n\'existe pas encore, retour d\'un tableau vide');
        return [];
      }

      const hasSenderId = await this.databaseService.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'purchase_requests' AND column_name = 'sender_id'
      `);
      const useSenderId = hasSenderId.rows.length > 0;

      const query = useSenderId
        ? 'SELECT * FROM purchase_requests WHERE sender_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC'
        : 'SELECT * FROM purchase_requests WHERE buyer_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC';

      const result = await this.databaseService.query(query, [userId]);
      return result.rows.map((row) => this.mapRowToPurchaseRequest(row));
    } catch (error: any) {
      // Si la table n'existe pas encore, retourner un tableau vide
      if (error.message?.includes('does not exist') || error.message?.includes("n'existe pas")) {
        this.logger.warn('Table purchase_requests n\'existe pas encore, retour d\'un tableau vide');
        return [];
      }
      throw error;
    }
  }

  /**
   * Récupère les demandes reçues par l'utilisateur (producteur ou autre)
   * Inclut les demandes où l'utilisateur est un producteur correspondant
   */
  async findReceivedPurchaseRequests(userId: string) {
    try {
      // Vérifier d'abord si la table purchase_requests existe
      const tableExists = await this.databaseService.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'purchase_requests'
      `);
      
      if (tableExists.rows.length === 0) {
        this.logger.warn('Table purchase_requests n\'existe pas encore, retour d\'un tableau vide');
        return [];
      }

      // Récupérer les demandes où l'utilisateur est un producteur correspondant
      // via purchase_request_matches
      const hasMatchesTable = await this.databaseService.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'purchase_request_matches'
      `);

      if (hasMatchesTable.rows.length > 0) {
        // Récupérer les demandes où l'utilisateur est matché
        const matchesQuery = `
          SELECT DISTINCT pr.*
          FROM purchase_requests pr
          INNER JOIN purchase_request_matches prm ON pr.id = prm.purchase_request_id
          WHERE prm.producer_id = $1
          AND pr.status = 'published'
          AND pr.deleted_at IS NULL
          ORDER BY pr.created_at DESC
        `;
        const matchesResult = await this.databaseService.query(matchesQuery, [userId]);
        return matchesResult.rows.map((row) => this.mapRowToPurchaseRequest(row));
      }

      // Fallback : retourner les demandes publiées (pour compatibilité)
      const fallbackQuery = `
        SELECT * FROM purchase_requests 
        WHERE status = 'published' 
        AND deleted_at IS NULL 
        ORDER BY created_at DESC
      `;
      const result = await this.databaseService.query(fallbackQuery);
      return result.rows.map((row) => this.mapRowToPurchaseRequest(row));
    } catch (error: any) {
      // Si la table n'existe pas encore, retourner un tableau vide
      if (error.message?.includes('does not exist') || error.message?.includes("n'existe pas")) {
        this.logger.warn('Table purchase_requests n\'existe pas encore, retour d\'un tableau vide');
        return [];
      }
      throw error;
    }
  }

  /**
   * Trouve les producteurs correspondant à une demande avec seuils configurables
   */
  async findMatchingProducersForRequest(
    requestId: string,
    thresholds?: { weightTolerance?: number; priceTolerance?: number; locationRadius?: number }
  ) {
    const request = await this.databaseService.query(
      'SELECT * FROM purchase_requests WHERE id = $1',
      [requestId]
    );

    if (request.rows.length === 0) {
      throw new NotFoundException('Demande introuvable');
    }

    const requestData = request.rows[0];
    const managementMode = requestData.management_mode || 'both';
    const effectiveThresholds = {
      weightTolerance: thresholds?.weightTolerance || 10, // %
      priceTolerance: thresholds?.priceTolerance || 20, // %
      locationRadius: thresholds?.locationRadius || 50, // km
    };

    // Récupérer les seuils depuis la demande si disponibles
    let requestThresholds = effectiveThresholds;
    if (requestData.matching_thresholds) {
      try {
        const parsed = typeof requestData.matching_thresholds === 'string'
          ? JSON.parse(requestData.matching_thresholds)
          : requestData.matching_thresholds;
        requestThresholds = {
          weightTolerance: parsed.weightTolerance || effectiveThresholds.weightTolerance,
          priceTolerance: parsed.priceTolerance || effectiveThresholds.priceTolerance,
          locationRadius: parsed.locationRadius || effectiveThresholds.locationRadius,
        };
      } catch (error) {
        this.logger.warn('Erreur parsing matching_thresholds, utilisation des valeurs par défaut');
      }
    }

    const matches: any[] = [];
    const now = new Date().toISOString();

    // Mode individuel
    if (managementMode === 'individual' || managementMode === 'both') {
      const individualQuery = `
        SELECT DISTINCT
          p.proprietaire_id as producer_id,
          p.id as farm_id,
          ml.id as listing_id,
          AVG(pp.poids_kg) as avg_weight,
          ml.price_per_kg,
          COUNT(DISTINCT pa.id) as available_count
        FROM projets p
        INNER JOIN production_animaux pa ON pa.projet_id = p.id
        LEFT JOIN (
          SELECT animal_id, poids_kg, ROW_NUMBER() OVER (PARTITION BY animal_id ORDER BY date DESC) as rn
          FROM production_pesees
        ) pp ON pa.id = pp.animal_id AND pp.rn = 1
        LEFT JOIN marketplace_listings ml ON ml.subject_id = pa.id AND ml.status = 'available'
        WHERE pa.statut = 'actif'
        AND pa.race = $1
        AND (pp.poids_kg BETWEEN $2 AND $3 OR pa.poids_initial BETWEEN $2 AND $3)
        AND (ml.price_per_kg IS NULL OR ml.price_per_kg <= $4)
        GROUP BY p.proprietaire_id, p.id, ml.id, ml.price_per_kg
        HAVING COUNT(DISTINCT pa.id) >= $5
      `;

      const minWeight = requestData.min_weight * (1 - requestThresholds.weightTolerance / 100);
      const maxWeight = requestData.max_weight * (1 + requestThresholds.weightTolerance / 100);
      const maxPrice = requestData.max_price_per_kg
        ? requestData.max_price_per_kg * (1 + requestThresholds.priceTolerance / 100)
        : null;

      try {
        const individualMatches = await this.databaseService.query(individualQuery, [
          requestData.race,
          minWeight,
          maxWeight,
          maxPrice || 999999999,
          requestData.quantity,
        ]);

        for (const match of individualMatches.rows) {
          const matchScore = this.calculateMatchScore(requestData, match, requestThresholds, 'individual');
          if (matchScore >= 50) {
            // Seuil minimum de 50% pour créer un match
            matches.push({
              producerId: match.producer_id,
              farmId: match.farm_id,
              listingId: match.listing_id,
              matchScore,
              mode: 'individual',
            });
          }
        }
      } catch (error) {
        this.logger.warn('Erreur lors du matching individuel:', error);
      }
    }

    // Mode batch
    if (managementMode === 'batch' || managementMode === 'both') {
      const batchQuery = `
        SELECT DISTINCT
          p.proprietaire_id as producer_id,
          p.id as farm_id,
          ml.id as listing_id,
          b.average_weight_kg as avg_weight,
          ml.price_per_kg,
          b.total_count as available_count
        FROM projets p
        INNER JOIN batches b ON b.projet_id = p.id
        LEFT JOIN marketplace_listings ml ON ml.batch_id = b.id AND ml.status = 'available'
        WHERE b.total_count > 0
        AND b.category NOT IN ('truie_reproductrice', 'verrat_reproducteur')
        AND b.average_weight_kg BETWEEN $1 AND $2
        AND (ml.price_per_kg IS NULL OR ml.price_per_kg <= $3)
        AND b.total_count >= $4
      `;

      const minWeight = requestData.min_weight * (1 - requestThresholds.weightTolerance / 100);
      const maxWeight = requestData.max_weight * (1 + requestThresholds.weightTolerance / 100);
      const maxPrice = requestData.max_price_per_kg
        ? requestData.max_price_per_kg * (1 + requestThresholds.priceTolerance / 100)
        : null;

      try {
        const batchMatches = await this.databaseService.query(batchQuery, [
          minWeight,
          maxWeight,
          maxPrice || 999999999,
          requestData.quantity,
        ]);

        for (const match of batchMatches.rows) {
          const matchScore = this.calculateMatchScore(requestData, match, requestThresholds, 'batch');
          if (matchScore >= 50) {
            matches.push({
              producerId: match.producer_id,
              farmId: match.farm_id,
              listingId: match.listing_id,
              matchScore,
              mode: 'batch',
            });
          }
        }
      } catch (error) {
        this.logger.warn('Erreur lors du matching batch:', error);
      }
    }

    // Créer les enregistrements de match et envoyer les notifications
    const createdMatches = [];
    for (const match of matches) {
      try {
        const matchId = this.generateId('prm');
        await this.databaseService.query(
          `INSERT INTO purchase_request_matches (
            id, purchase_request_id, producer_id, farm_id, listing_id, match_score, notified, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING`,
          [matchId, requestId, match.producerId, match.farmId, match.listingId, match.matchScore, false, now]
        );

        // Envoyer notification
        try {
          await this.notificationsService.createNotification({
            userId: match.producerId,
            type: NotificationType.OFFER_RECEIVED, // Utiliser OFFER_RECEIVED car c'est une demande qui correspond
            title: 'Nouvelle demande correspondant à vos sujets',
            message: `Une demande correspond à vos critères avec un score de ${Math.round(match.matchScore)}%`,
            relatedId: requestId,
            relatedType: 'purchase_request',
          });
        } catch (error) {
          this.logger.warn(`[findMatchingProducersForRequest] Erreur notification pour producteur ${match.producerId}:`, error);
          // Ne pas bloquer le processus si la notification échoue
        }

        // Marquer comme notifié
        await this.databaseService.query(
          'UPDATE purchase_request_matches SET notified = true, notification_sent_at = $1 WHERE id = $2',
          [now, matchId]
        );

        createdMatches.push({ id: matchId, ...match });
      } catch (error) {
        this.logger.warn(`Erreur lors de la création du match pour producteur ${match.producerId}:`, error);
      }
    }

    // Mettre à jour le compteur de correspondances
    await this.databaseService.query(
      'UPDATE purchase_requests SET matched_producers_count = $1 WHERE id = $2',
      [createdMatches.length, requestId]
    );

    return createdMatches;
  }

  /**
   * Calcule le score de correspondance (0-100)
   */
  private calculateMatchScore(
    request: any,
    match: any,
    thresholds: { weightTolerance: number; priceTolerance: number },
    mode: 'individual' | 'batch'
  ): number {
    let score = 0;
    const maxScore = 100;

    // Poids (40 points)
    const weightDiff = Math.abs(match.avg_weight - (request.min_weight + request.max_weight) / 2);
    const weightRange = request.max_weight - request.min_weight;
    const weightScore = Math.max(0, 40 * (1 - weightDiff / (weightRange * (1 + thresholds.weightTolerance / 100))));
    score += weightScore;

    // Prix (30 points)
    if (request.max_price_per_kg && match.price_per_kg) {
      if (match.price_per_kg <= request.max_price_per_kg) {
        score += 30;
      } else if (match.price_per_kg <= request.max_price_per_kg * (1 + thresholds.priceTolerance / 100)) {
        const priceDiff = match.price_per_kg - request.max_price_per_kg;
        const priceToleranceRange = request.max_price_per_kg * (thresholds.priceTolerance / 100);
        score += 30 * (1 - priceDiff / priceToleranceRange);
      }
    } else {
      score += 15; // Pas de critère prix = score partiel
    }

    // Quantité (20 points)
    if (match.available_count >= request.quantity) {
      score += 20;
    } else {
      score += 20 * (match.available_count / request.quantity);
    }

    // Race (10 points)
    // Supposé déjà filtré dans la requête

    return Math.min(maxScore, Math.round(score));
  }

  async findOnePurchaseRequest(id: string, userId: string) {
    const result = await this.databaseService.query(
      'SELECT * FROM purchase_requests WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Demande d\'achat introuvable');
    }

    const request = result.rows[0];

    // Vérifier que l'utilisateur est le propriétaire ou que la demande est publiée
    if (request.buyer_id !== userId && request.status !== 'published') {
      throw new ForbiddenException('Vous n\'avez pas accès à cette demande');
    }

    return this.mapRowToPurchaseRequest(request);
  }

  async updatePurchaseRequest(
    id: string,
    updatePurchaseRequestDto: UpdatePurchaseRequestDto,
    userId: string
  ) {
    const existing = await this.findOnePurchaseRequest(id, userId);

    if (existing.buyerId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres demandes');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updatePurchaseRequestDto.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.title);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.race !== undefined) {
      fields.push(`race = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.race);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.minWeight !== undefined) {
      fields.push(`min_weight = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.minWeight);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.maxWeight !== undefined) {
      fields.push(`max_weight = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.maxWeight);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.ageCategory !== undefined) {
      fields.push(`age_category = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.ageCategory);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.minAgeMonths !== undefined) {
      fields.push(`min_age_months = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.minAgeMonths);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.maxAgeMonths !== undefined) {
      fields.push(`max_age_months = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.maxAgeMonths);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.quantity !== undefined) {
      fields.push(`quantity = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.quantity);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.deliveryLocation !== undefined) {
      fields.push(`delivery_location = $${paramIndex}`);
      values.push(JSON.stringify(updatePurchaseRequestDto.deliveryLocation));
      paramIndex++;
    }
    if (updatePurchaseRequestDto.maxPricePerKg !== undefined) {
      fields.push(`max_price_per_kg = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.maxPricePerKg);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.maxTotalPrice !== undefined) {
      fields.push(`max_total_price = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.maxTotalPrice);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.deliveryDate !== undefined) {
      fields.push(`delivery_date = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.deliveryDate);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.deliveryPeriodStart !== undefined) {
      fields.push(`delivery_period_start = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.deliveryPeriodStart);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.deliveryPeriodEnd !== undefined) {
      fields.push(`delivery_period_end = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.deliveryPeriodEnd);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.message !== undefined) {
      fields.push(`message = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.message);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.status);
      paramIndex++;
    }
    if (updatePurchaseRequestDto.expiresAt !== undefined) {
      fields.push(`expires_at = $${paramIndex}`);
      values.push(updatePurchaseRequestDto.expiresAt);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE purchase_requests SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToPurchaseRequest(result.rows[0]);
  }

  async deletePurchaseRequest(id: string, userId: string) {
    const existing = await this.findOnePurchaseRequest(id, userId);

    if (existing.buyerId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres demandes');
    }

    await this.databaseService.query('DELETE FROM purchase_requests WHERE id = $1', [id]);
    return { id };
  }

  async archivePurchaseRequest(id: string, userId: string) {
    return this.updatePurchaseRequest(id, { status: 'archived' }, userId);
  }

  async restorePurchaseRequest(id: string, userId: string) {
    return this.updatePurchaseRequest(id, { status: 'published' }, userId);
  }

  // ========================================
  // PURCHASE REQUEST OFFERS
  // ========================================

  async createPurchaseRequestOffer(
    createPurchaseRequestOfferDto: CreatePurchaseRequestOfferDto,
    userId: string
  ) {
    // Vérifier que la demande existe et est publiée
    const request = await this.findOnePurchaseRequest(
      createPurchaseRequestOfferDto.purchaseRequestId,
      userId
    );

    if (request.status !== 'published') {
      throw new BadRequestException('Cette demande n\'est plus active');
    }

    // Utiliser une transaction pour garantir la cohérence des données
    return await this.databaseService.transaction(async (client) => {
      const id = this.generateId('pro');
      const now = new Date().toISOString();

      const result = await client.query(
        `INSERT INTO purchase_request_offers (
          id, purchase_request_id, producer_id, listing_id, subject_ids,
          proposed_price_per_kg, proposed_total_price, quantity,
          available_date, message, status, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          id,
          createPurchaseRequestOfferDto.purchaseRequestId,
          userId,
          createPurchaseRequestOfferDto.listingId || null,
          JSON.stringify(createPurchaseRequestOfferDto.subjectIds),
          createPurchaseRequestOfferDto.proposedPricePerKg,
          createPurchaseRequestOfferDto.proposedTotalPrice,
          createPurchaseRequestOfferDto.quantity,
          createPurchaseRequestOfferDto.availableDate || null,
          createPurchaseRequestOfferDto.message || null,
          'pending',
          now,
          createPurchaseRequestOfferDto.expiresAt || null,
        ]
      );

      // Mettre à jour le compteur d'offres de la demande
      await client.query(
        'UPDATE purchase_requests SET offers_count = offers_count + 1 WHERE id = $1',
        [createPurchaseRequestOfferDto.purchaseRequestId]
      );

      return this.mapRowToPurchaseRequestOffer(result.rows[0]);
    });
  }

  async findAllPurchaseRequestOffers(purchaseRequestId?: string, producerId?: string) {
    let query = 'SELECT * FROM purchase_request_offers WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (purchaseRequestId) {
      query += ` AND purchase_request_id = $${paramIndex}`;
      params.push(purchaseRequestId);
      paramIndex++;
    }

    if (producerId) {
      query += ` AND producer_id = $${paramIndex}`;
      params.push(producerId);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.databaseService.query(query, params);
    return result.rows.map((row) => this.mapRowToPurchaseRequestOffer(row));
  }

  async findOnePurchaseRequestOffer(id: string, userId: string) {
    const result = await this.databaseService.query(
      'SELECT * FROM purchase_request_offers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Offre introuvable');
    }

    return this.mapRowToPurchaseRequestOffer(result.rows[0]);
  }

  /**
   * Mettre à jour le statut d'une offre sur demande d'achat
   */
  async updatePurchaseRequestOfferStatus(offerId: string, status: string, userId: string) {
    // Vérifier que l'offre existe
    const offerResult = await this.databaseService.query(
      'SELECT * FROM purchase_request_offers WHERE id = $1',
      [offerId]
    );

    if (offerResult.rows.length === 0) {
      throw new NotFoundException('Offre introuvable');
    }

    const offer = offerResult.rows[0];

    // Vérifier que l'utilisateur est autorisé (acheteur de la demande ou producteur de l'offre)
    const requestResult = await this.databaseService.query(
      'SELECT * FROM purchase_requests WHERE id = $1',
      [offer.purchase_request_id]
    );

    if (requestResult.rows.length === 0) {
      throw new NotFoundException('Demande d\'achat introuvable');
    }

    const request = requestResult.rows[0];

    // L'acheteur peut accepter/rejeter, le producteur peut retirer
    const isBuyer = request.buyer_id === userId;
    const isProducer = offer.producer_id === userId;

    if (!isBuyer && !isProducer) {
      throw new ForbiddenException('Non autorisé à modifier cette offre');
    }

    // Valider les transitions de statut
    const validStatuses = ['pending', 'accepted', 'rejected', 'withdrawn', 'expired'];
    if (!validStatuses.includes(status)) {
      throw new ForbiddenException(`Statut invalide: ${status}`);
    }

    // Le producteur ne peut que retirer, l'acheteur peut accepter/rejeter
    if (isProducer && !isBuyer && status !== 'withdrawn') {
      throw new ForbiddenException('Le producteur ne peut que retirer son offre');
    }

    // Mettre à jour le statut
    await this.databaseService.query(
      'UPDATE purchase_request_offers SET status = $1, responded_at = NOW() WHERE id = $2',
      [status, offerId]
    );

    this.logger.log(`[PurchaseRequestOffer] Offre ${offerId} mise à jour: ${status}`);

    // Envoyer une notification
    if (status === 'accepted') {
      await this.notificationsService.createNotification({
        userId: offer.producer_id,
        type: NotificationType.OFFER_ACCEPTED,
        title: 'Offre acceptée',
        message: 'Votre offre sur une demande d\'achat a été acceptée !',
        relatedId: offerId,
        relatedType: 'purchase_request_offer',
      });
    } else if (status === 'rejected') {
      await this.notificationsService.createNotification({
        userId: offer.producer_id,
        type: NotificationType.OFFER_REJECTED,
        title: 'Offre refusée',
        message: 'Votre offre sur une demande d\'achat a été refusée.',
        relatedId: offerId,
        relatedType: 'purchase_request_offer',
      });
    }

    return { id: offerId, status };
  }

  // ========================================
  // PURCHASE REQUEST MATCHES
  // ========================================

  async findPurchaseRequestMatches(producerId: string) {
    try {
      const result = await this.databaseService.query(
        'SELECT * FROM purchase_request_matches WHERE producer_id = $1 ORDER BY match_score DESC, created_at DESC',
        [producerId]
      );
      return result.rows.map((row) => this.mapRowToPurchaseRequestMatch(row));
    } catch (error: any) {
      // Si la table n'existe pas encore, retourner un tableau vide
      if (error.message?.includes('does not exist') || error.message?.includes('n\'existe pas')) {
        this.logger.warn('Table purchase_request_matches n\'existe pas encore, retour d\'un tableau vide');
        return [];
      }
      throw error;
    }
  }

  // ========================================
  // MAPPERS
  // ========================================

  private mapRowToPurchaseRequest(row: any): any {
    return {
      id: row.id,
      buyerId: row.buyer_id,
      title: row.title,
      race: row.race,
      minWeight: parseFloat(row.min_weight),
      maxWeight: parseFloat(row.max_weight),
      ageCategory: row.age_category || undefined,
      minAgeMonths: row.min_age_months ? parseInt(row.min_age_months) : undefined,
      maxAgeMonths: row.max_age_months ? parseInt(row.max_age_months) : undefined,
      quantity: parseInt(row.quantity),
      deliveryLocation: row.delivery_location
        ? typeof row.delivery_location === 'string'
          ? JSON.parse(row.delivery_location)
          : row.delivery_location
        : undefined,
      maxPricePerKg: row.max_price_per_kg ? parseFloat(row.max_price_per_kg) : undefined,
      maxTotalPrice: row.max_total_price ? parseFloat(row.max_total_price) : undefined,
      deliveryDate: row.delivery_date ? new Date(row.delivery_date).toISOString() : undefined,
      deliveryPeriodStart: row.delivery_period_start
        ? new Date(row.delivery_period_start).toISOString()
        : undefined,
      deliveryPeriodEnd: row.delivery_period_end
        ? new Date(row.delivery_period_end).toISOString()
        : undefined,
      message: row.message || undefined,
      status: row.status,
      views: row.views || 0,
      matchedProducersCount: row.matched_producers_count || 0,
      offersCount: row.offers_count || 0,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : undefined,
    };
  }

  private mapRowToPurchaseRequestOffer(row: any): any {
    return {
      id: row.id,
      purchaseRequestId: row.purchase_request_id,
      producerId: row.producer_id,
      listingId: row.listing_id || undefined,
      subjectIds: Array.isArray(row.subject_ids)
        ? row.subject_ids
        : typeof row.subject_ids === 'string'
        ? JSON.parse(row.subject_ids)
        : [],
      proposedPricePerKg: parseFloat(row.proposed_price_per_kg),
      proposedTotalPrice: parseFloat(row.proposed_total_price),
      quantity: parseInt(row.quantity),
      availableDate: row.available_date ? new Date(row.available_date).toISOString() : undefined,
      message: row.message || undefined,
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      respondedAt: row.responded_at ? new Date(row.responded_at).toISOString() : undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
    };
  }

  private mapRowToPurchaseRequestMatch(row: any): any {
    return {
      id: row.id,
      purchaseRequestId: row.purchase_request_id,
      producerId: row.producer_id,
      listingId: row.listing_id,
      matchScore: row.match_score ? parseFloat(row.match_score) : undefined,
      notified: row.notified || false,
      notificationSentAt: row.notification_sent_at
        ? new Date(row.notification_sent_at).toISOString()
        : undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    };
  }

  // ========================================
  // COMPLETE SALE - NOUVELLE LOGIQUE DE VENTE
  // ========================================

  /**
   * Complète une vente directe sans passer par le workflow d'offres
   * 
   * RÈGLES IMPLÉMENTÉES:
   * 1. Un sujet PEUT être dans plusieurs listings (NOUVELLE règle)
   * 2. Quand vendu: nettoyer TOUS les autres listings contenant ce sujet
   * 3. Créer la transaction marketplace
   * 4. Mettre à jour le statut des animaux
   * 5. Créer le revenu en finance
   */
  async completeSale(
    dto: CompleteSaleDto,
    sellerId: string
  ): Promise<CompleteSaleResponseDto> {
    this.logger.log(`[completeSale] Début de la vente - Listing: ${dto.listingId}, Vendeur: ${sellerId}`);

    return await this.databaseService.transaction(async (client) => {
      const now = new Date().toISOString();

      // 1. VÉRIFIER QUE LE LISTING EXISTE ET APPARTIENT AU VENDEUR
      const listingResult = await client.query(
        'SELECT * FROM marketplace_listings WHERE id = $1',
        [dto.listingId]
      );

      if (listingResult.rows.length === 0) {
        throw new NotFoundException('Listing introuvable');
      }

      const listing = listingResult.rows[0];

      if (listing.producer_id !== sellerId) {
        throw new ForbiddenException('Vous n\'êtes pas autorisé à vendre ce listing');
      }

      if (listing.status !== 'available' && listing.status !== 'reserved') {
        throw new BadRequestException(`Ce listing n'est pas disponible pour la vente (statut: ${listing.status})`);
      }

      // 2. RÉCUPÉRER LE/LES SUBJECT_ID DU LISTING
      const listingType = listing.listing_type || 'individual';
      let subjectIds: string[] = [];

      if (listingType === 'individual') {
        if (!listing.subject_id) {
          throw new BadRequestException('Listing individuel sans subject_id');
        }
        subjectIds = [listing.subject_id];
      } else if (listingType === 'batch') {
        const pigIds = Array.isArray(listing.pig_ids)
          ? listing.pig_ids
          : typeof listing.pig_ids === 'string'
          ? JSON.parse(listing.pig_ids)
          : [];
        
        if (pigIds.length === 0) {
          throw new BadRequestException('Listing batch sans pig_ids');
        }
        subjectIds = pigIds;
      }

      this.logger.debug(`[completeSale] Sujets à vendre: ${subjectIds.length}`);

      // 3. RÉCUPÉRER LES INFOS DE L'ACHETEUR ET DU VENDEUR
      const [buyerResult, sellerResult] = await Promise.all([
        client.query('SELECT id, prenom, nom FROM users WHERE id = $1', [dto.buyerId]),
        client.query('SELECT id, prenom, nom FROM users WHERE id = $1', [sellerId]),
      ]);

      if (buyerResult.rows.length === 0) {
        throw new NotFoundException('Acheteur introuvable');
      }

      const buyerName = buyerResult.rows[0].prenom && buyerResult.rows[0].nom
        ? `${buyerResult.rows[0].prenom} ${buyerResult.rows[0].nom}`.trim()
        : 'Acheteur';
      const sellerName = sellerResult.rows[0]?.prenom && sellerResult.rows[0]?.nom
        ? `${sellerResult.rows[0].prenom} ${sellerResult.rows[0].nom}`.trim()
        : 'Vendeur';

      // 4. MARQUER LE LISTING COMME 'SOLD'
      await client.query(
        `UPDATE marketplace_listings 
         SET status = 'sold', updated_at = $1, derniere_modification = $1 
         WHERE id = $2`,
        [now, dto.listingId]
      );

      this.logger.debug(`[completeSale] Listing ${dto.listingId} marqué comme 'sold'`);

      // 5. CRÉER UNE OFFRE PLACEHOLDER POUR LA VENTE DIRECTE (offer_id est NOT NULL)
      const offerId = this.generateId('offer');
      await client.query(
        `INSERT INTO marketplace_offers (
          id, listing_id, subject_ids, buyer_id, producer_id,
          proposed_price, original_price, message, status,
          terms_accepted, created_at, expires_at, prix_total_final,
          date_creation, derniere_modification
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          offerId,
          dto.listingId,
          subjectIds,
          dto.buyerId,
          sellerId,
          dto.finalPrice,
          listing.calculated_price || dto.finalPrice,
          'Vente directe via completeSale',
          'accepted',
          true,
          now,
          now,
          dto.finalPrice,
          now,
          now,
        ]
      );

      // 6. CRÉER LA TRANSACTION MARKETPLACE
      const transactionId = this.generateId('transaction');
      await client.query(
        `INSERT INTO marketplace_transactions (
          id, offer_id, listing_id, subject_ids, buyer_id, producer_id,
          final_price, status, delivery_details, documents, 
          created_at, date_creation, derniere_modification
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          transactionId,
          offerId, // Offre placeholder pour vente directe
          dto.listingId,
          subjectIds,
          dto.buyerId,
          sellerId,
          dto.finalPrice,
          'completed',
          JSON.stringify({
            paymentMethod: dto.paymentMethod || 'cash',
            dateRecuperation: dto.dateRecuperation || null,
            notes: dto.notes || null,
            directSale: true,
          }),
          JSON.stringify({}),
          now,
          now,
          now,
        ]
      );

      this.logger.debug(`[completeSale] Offre placeholder créée: ${offerId}, Transaction créée: ${transactionId}`);

      // 7. NETTOYER LES AUTRES LISTINGS CONTENANT CES SUJETS
      const cleanupResult = await this.removeSubjectFromOtherListings(
        client,
        subjectIds,
        dto.listingId,
        listingType
      );

      // ✅ Invalider le cache des listings affectés par le nettoyage
      if (cleanupResult.affectedListingIds && cleanupResult.affectedListingIds.length > 0) {
        cleanupResult.affectedListingIds.forEach((listingId: string) => {
          this.cacheService.delete(`listing_subjects:${listingId}`);
        });
        this.logger.debug(`[completeSale] Cache invalidé pour ${cleanupResult.affectedListingIds.length} listing(s)`);
      }

      this.logger.debug(`[completeSale] Nettoyage: ${cleanupResult.listingsRemoved} supprimés, ${cleanupResult.listingsUpdated} mis à jour`);

      // 8. METTRE À JOUR LE STATUT DES ANIMAUX
      const animalsUpdated = await this.updateAnimalsSoldStatus(
        client,
        subjectIds,
        listingType,
        now
      );
      cleanupResult.animalsUpdated = animalsUpdated;

      this.logger.debug(`[completeSale] ${animalsUpdated} animaux mis à jour`);

      // 9. CRÉER LE REVENU EN FINANCE
      const financeResult = await this.createRevenueFromSale(client, {
        farmId: listing.farm_id,
        amount: dto.finalPrice,
        description: `Vente marketplace - ${subjectIds.length} sujet(s)${listingType === 'batch' ? ' (batch)' : ''}`,
        transactionId,
        buyerName,
        subjectIds,
        poidsTotalKg: await this.calculateTotalWeight(client, subjectIds, listingType),
      });

      this.logger.debug(`[completeSale] Revenu créé: ${financeResult.revenueId}`);

      // 10. METTRE À JOUR LA TRANSACTION AVEC LES RÉFÉRENCES
      await client.query(
        `UPDATE marketplace_transactions 
         SET vente_id = $1, revenu_id = $2, poids_total = $3, nombre_sujets = $4, date_vente = $5
         WHERE id = $6`,
        [
          financeResult.venteId,
          financeResult.revenueId,
          financeResult.poidsTotalKg,
          subjectIds.length,
          now,
          transactionId,
        ]
      );

      // 11. CRÉER LES NOTIFICATIONS
      const listingTitle = (listing as any)?.code || `Annonce ${dto.listingId}`;
      try {
        await this.notificationsService.notifyListingSold(
          sellerId,
          dto.listingId,
          listingTitle,
          dto.finalPrice
        );
      } catch (error) {
        this.logger.warn(`[completeSale] Erreur notification vendeur: ${error.message}`);
        // Créer la notification de base si notifyListingSold échoue
        await this.notificationsService.createNotification({
          userId: sellerId,
          type: NotificationType.LISTING_SOLD,
          title: 'Vente confirmée',
          message: `${subjectIds.length} sujet(s) vendu(s) pour ${dto.finalPrice.toLocaleString('fr-FR')} FCFA`,
          relatedId: transactionId,
          relatedType: 'transaction',
        });
      }

      // Notifier l'acheteur (pas de helper method pour achat, utiliser createNotification)
      try {
        await this.notificationsService.createNotification({
          userId: dto.buyerId,
          type: NotificationType.LISTING_SOLD, // Utiliser LISTING_SOLD car c'est une vente
          title: 'Achat confirmé',
          message: `Achat de ${subjectIds.length} sujet(s) pour ${dto.finalPrice.toLocaleString('fr-FR')} FCFA`,
          relatedId: transactionId,
          relatedType: 'transaction',
        });
      } catch (error) {
        this.logger.warn(`[completeSale] Erreur notification acheteur: ${error.message}`);
      }

      this.logger.log(`[completeSale] Vente complétée avec succès - Transaction: ${transactionId}`);

      // 12. RETOURNER LE RÉSUMÉ
      return {
        success: true,
        transaction: {
          id: transactionId,
          amount: dto.finalPrice,
          seller: { id: sellerId, name: sellerName },
          buyer: { id: dto.buyerId, name: buyerName },
          listing: {
            id: dto.listingId,
            type: listingType as 'individual' | 'batch',
            subjectIds,
          },
        },
        cleanup: cleanupResult,
        finance: {
          revenueId: financeResult.revenueId,
          amount: dto.finalPrice,
          venteId: financeResult.venteId,
        },
        message: `Vente de ${subjectIds.length} sujet(s) complétée avec succès`,
      };
    });
  }

  /**
   * HELPER: Retire un sujet de tous les autres listings
   * 
   * RÈGLES:
   * - Si listing individual (1 seul sujet) : status='removed', removed_reason='sold_elsewhere'
   * - Si listing batch : retirer le sujet de pig_ids et décrémenter pig_count
   * - Si listing batch devient vide : status='removed', removed_reason='all_pigs_sold'
   */
  private async removeSubjectFromOtherListings(
    client: any,
    subjectIds: string[],
    excludeListingId: string,
    sourceListingType: string
  ): Promise<SaleCleanupResult & { affectedListingIds?: string[] }> {
    const result: SaleCleanupResult & { affectedListingIds?: string[] } = {
      listingsRemoved: 0,
      listingsUpdated: 0,
      animalsUpdated: 0,
      affectedListingIds: [],
    };

    const now = new Date().toISOString();

    // Trouver tous les listings contenant ces sujets (sauf le listing vendu)
    const affectedListingsQuery = `
      SELECT id, listing_type, subject_id, pig_ids, pig_count, status
      FROM marketplace_listings
      WHERE status IN ('available', 'reserved', 'pending_delivery')
      AND id != $1
      AND (
        subject_id = ANY($2)
        OR pig_ids ?| $2
      )
    `;

    try {
      const affectedListings = await client.query(affectedListingsQuery, [
        excludeListingId,
        subjectIds,
      ]);

      this.logger.debug(`[removeSubjectFromOtherListings] ${affectedListings.rows.length} listings affectés trouvés`);

      for (const listing of affectedListings.rows) {
        // ✅ Ajouter l'ID du listing à la liste des listings affectés pour invalidation du cache
        if (result.affectedListingIds) {
          result.affectedListingIds.push(listing.id);
        }
        const listingType = listing.listing_type || 'individual';

        if (listingType === 'individual') {
          // Listing individuel : le sujet est vendu, donc supprimer le listing
          await client.query(
            `UPDATE marketplace_listings
             SET status = 'removed', 
                 updated_at = $1,
                 derniere_modification = $1
             WHERE id = $2`,
            [now, listing.id]
          );
          result.listingsRemoved++;
          this.logger.debug(`[removeSubjectFromOtherListings] Listing individuel ${listing.id} supprimé (sold_elsewhere)`);

        } else if (listingType === 'batch') {
          // Listing batch : retirer les sujets vendus du batch
          const currentPigIds: string[] = Array.isArray(listing.pig_ids)
            ? listing.pig_ids
            : typeof listing.pig_ids === 'string'
            ? JSON.parse(listing.pig_ids)
            : [];

          const remainingPigIds = currentPigIds.filter(
            (pigId) => !subjectIds.includes(pigId)
          );

          if (remainingPigIds.length === 0) {
            // Batch vide après retrait
            await client.query(
              `UPDATE marketplace_listings
               SET status = 'removed',
                   pig_ids = '[]'::jsonb,
                   pig_count = 0,
                   updated_at = $1,
                   derniere_modification = $1
               WHERE id = $2`,
              [now, listing.id]
            );
            result.listingsRemoved++;
            this.logger.debug(`[removeSubjectFromOtherListings] Listing batch ${listing.id} supprimé (all_pigs_sold)`);

          } else {
            // Mettre à jour le batch avec les porcs restants
            await client.query(
              `UPDATE marketplace_listings
               SET pig_ids = $1::jsonb,
                   pig_count = $2,
                   updated_at = $3,
                   derniere_modification = $3
               WHERE id = $4`,
              [JSON.stringify(remainingPigIds), remainingPigIds.length, now, listing.id]
            );
            result.listingsUpdated++;
            this.logger.debug(`[removeSubjectFromOtherListings] Listing batch ${listing.id} mis à jour: ${currentPigIds.length} → ${remainingPigIds.length} porcs`);
          }
        }
      }
    } catch (error: any) {
      // Si l'opérateur JSONB ?| n'existe pas (ancienne version), utiliser une approche alternative
      if (error.message?.includes('operator does not exist')) {
        this.logger.warn('[removeSubjectFromOtherListings] Opérateur JSONB non supporté, utilisation de la méthode alternative');
        
        // Méthode alternative : chercher séparément pour individual et batch
        for (const subjectId of subjectIds) {
          // Individual listings
          const individualListings = await client.query(
            `SELECT id FROM marketplace_listings
             WHERE status IN ('available', 'reserved', 'pending_delivery')
             AND id != $1
             AND listing_type = 'individual'
             AND subject_id = $2`,
            [excludeListingId, subjectId]
          );

          for (const listing of individualListings.rows) {
            await client.query(
              `UPDATE marketplace_listings SET status = 'removed', updated_at = $1 WHERE id = $2`,
              [now, listing.id]
            );
            result.listingsRemoved++;
            // ✅ Ajouter l'ID à la liste pour invalidation du cache
            if (result.affectedListingIds) {
              result.affectedListingIds.push(listing.id);
            }
          }
        }
      } else {
        throw error;
      }
    }

    return result;
  }

  /**
   * HELPER: Met à jour le statut des animaux vendus
   */
  private async updateAnimalsSoldStatus(
    client: any,
    subjectIds: string[],
    listingType: string,
    now: string
  ): Promise<number> {
    let updatedCount = 0;

    if (listingType === 'individual') {
      // Mode individuel : production_animaux
      for (const subjectId of subjectIds) {
        try {
          const result = await client.query(
            `UPDATE production_animaux 
             SET statut = 'vendu', 
                 actif = false, 
                 derniere_modification = $1,
                 marketplace_status = 'sold'
             WHERE id = $2
             RETURNING id`,
            [now, subjectId]
          );
          if (result.rowCount > 0) {
            updatedCount++;
          }
        } catch (error: any) {
          // Si marketplace_status n'existe pas, réessayer sans
          if (error.message?.includes('marketplace_status')) {
            await client.query(
              `UPDATE production_animaux 
               SET statut = 'vendu', actif = false, derniere_modification = $1
               WHERE id = $2`,
              [now, subjectId]
            );
            updatedCount++;
          } else {
            throw error;
          }
        }
      }
    } else if (listingType === 'batch') {
      // Mode batch : batch_pigs - créer un mouvement et supprimer
      for (const subjectId of subjectIds) {
        try {
          // Récupérer les infos du batch_pig
          const pigResult = await client.query(
            'SELECT batch_id, current_weight_kg FROM batch_pigs WHERE id = $1',
            [subjectId]
          );

          if (pigResult.rows.length > 0) {
            const pig = pigResult.rows[0];
            const movementId = this.generateId('movement');

            // Créer le mouvement de retrait
            try {
              await client.query(
                `INSERT INTO batch_pig_movements (
                  id, pig_id, movement_type, removal_reason,
                  sale_weight_kg, movement_date, notes, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                  movementId,
                  subjectId,
                  'removal',
                  'sale',
                  pig.current_weight_kg || 0,
                  now.split('T')[0],
                  'Vente via marketplace - completeSale',
                  now,
                ]
              );
            } catch (movementError) {
              this.logger.warn(`[updateAnimalsSoldStatus] Erreur création mouvement pour ${subjectId}: ${movementError}`);
            }

            // Supprimer le batch_pig
            await client.query('DELETE FROM batch_pigs WHERE id = $1', [subjectId]);
            updatedCount++;
          }
        } catch (error: any) {
          this.logger.error(`[updateAnimalsSoldStatus] Erreur pour batch_pig ${subjectId}:`, error.message);
        }
      }
    }

    return updatedCount;
  }

  /**
   * HELPER: Crée le revenu et la vente en finance
   */
  private async createRevenueFromSale(
    client: any,
    saleData: {
      farmId: string;
      amount: number;
      description: string;
      transactionId: string;
      buyerName: string;
      subjectIds: string[];
      poidsTotalKg: number;
    }
  ): Promise<SaleFinanceInfo & { poidsTotalKg: number; venteId: string }> {
    const now = new Date().toISOString();
    const venteId = this.generateId('vente');
    const revenueId = this.generateId('revenu');

    // Récupérer le producteur du projet
    const projetResult = await client.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [saleData.farmId]
    );
    const producteurId = projetResult.rows[0]?.proprietaire_id;

    // 1. Créer l'entrée dans la table ventes (si elle existe)
    try {
      await client.query(
        `INSERT INTO ventes (
          id, transaction_id, projet_id, producteur_id, acheteur_id,
          prix_total, nombre_sujets, poids_total, statut,
          date_vente, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          venteId,
          saleData.transactionId,
          saleData.farmId,
          producteurId,
          null, // acheteur_id sera récupéré si nécessaire
          saleData.amount,
          saleData.subjectIds.length,
          Math.round(saleData.poidsTotalKg),
          'confirmee',
          now,
          now,
          now,
        ]
      );
    } catch (venteError: any) {
      // Table ventes peut ne pas exister
      if (!venteError.message?.includes('does not exist')) {
        this.logger.warn(`[createRevenueFromSale] Erreur création vente: ${venteError.message}`);
      }
    }

    // 2. Créer l'entrée de revenu
    try {
      await client.query(
        `INSERT INTO revenus (
          id, projet_id, montant, date, categorie, description,
          acheteur, poids_total, nombre_animaux, vente_id, animal_ids, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          revenueId,
          saleData.farmId,
          saleData.amount,
          now.split('T')[0],
          'vente_porc',
          saleData.description,
          saleData.buyerName,
          Math.round(saleData.poidsTotalKg),
          saleData.subjectIds.length,
          venteId,
          JSON.stringify(saleData.subjectIds),
          now,
        ]
      );
    } catch (revenusError: any) {
      // Si la table revenus n'existe pas, essayer finance_revenus_ponctuels
      if (revenusError.message?.includes('does not exist')) {
        try {
          await client.query(
            `INSERT INTO finance_revenus_ponctuels (
              id, projet_id, montant, categorie, description,
              date_transaction, source_marketplace_transaction_id,
              date_creation, derniere_modification
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              revenueId,
              saleData.farmId,
              saleData.amount,
              'vente_animaux',
              saleData.description,
              now,
              saleData.transactionId,
              now,
              now,
            ]
          );
        } catch (fallbackError) {
          this.logger.error('[createRevenueFromSale] Erreur création revenu fallback:', fallbackError);
        }
      } else {
        this.logger.error('[createRevenueFromSale] Erreur création revenu:', revenusError.message);
      }
    }

    return {
      revenueId,
      amount: saleData.amount,
      venteId,
      poidsTotalKg: saleData.poidsTotalKg,
    };
  }

  /**
   * HELPER: Calcule le poids total des animaux
   */
  private async calculateTotalWeight(
    client: any,
    subjectIds: string[],
    listingType: string
  ): Promise<number> {
    let totalWeight = 0;

    if (listingType === 'individual') {
      for (const subjectId of subjectIds) {
        // Récupérer le poids depuis la dernière pesée
        const peseeResult = await client.query(
          `SELECT poids_kg FROM production_pesees 
           WHERE animal_id = $1 
           ORDER BY date DESC 
           LIMIT 1`,
          [subjectId]
        );

        if (peseeResult.rows.length > 0) {
          totalWeight += parseFloat(peseeResult.rows[0].poids_kg) || 0;
        } else {
          // Fallback : poids initial
          const animalResult = await client.query(
            'SELECT poids_initial FROM production_animaux WHERE id = $1',
            [subjectId]
          );
          if (animalResult.rows.length > 0) {
            totalWeight += parseFloat(animalResult.rows[0].poids_initial) || 0;
          }
        }
      }
    } else if (listingType === 'batch') {
      for (const subjectId of subjectIds) {
        const result = await client.query(
          'SELECT current_weight_kg FROM batch_pigs WHERE id = $1',
          [subjectId]
        );
        if (result.rows.length > 0) {
          totalWeight += parseFloat(result.rows[0].current_weight_kg) || 0;
        }
      }
    }

    return totalWeight;
  }

  // ========================================
  // OFFERS (Système d'offres d'achat)
  // ========================================

  /**
   * Récupérer toutes les offres créées par l'acheteur
   */
  async getBuyerInquiries(buyerId: string) {
    this.logger.log(`[getBuyerInquiries] Recherche offres pour buyerId: ${buyerId}`);

    // NOTE: Les offres sont stockées dans marketplace_offers (pas marketplace_inquiries)
    // ✅ IMPORTANT: Récupérer o.subject_ids pour savoir quels sujets SPÉCIFIQUES ont été sélectionnés
    const offersResult = await this.databaseService.query(
      `SELECT
        o.id,
        o.listing_id,
        o.buyer_id,
        o.producer_id as seller_id,
        o.proposed_price,
        o.original_price,
        o.message,
        o.status,
        o.terms_accepted,
        o.expires_at,
        o.counter_offer_of,
        o.date_recuperation_souhaitee,
        o.subject_ids as offer_subject_ids,
        TO_CHAR(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at_iso,
        TO_CHAR(o.responded_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as responded_at_iso,
        o.created_at,
        o.responded_at,
        l.calculated_price as listing_price,
        l.listing_type,
        l.pig_count as listing_pig_count,
        l.subject_id,
        l.pig_ids,
        u.nom as seller_nom,
        u.prenom as seller_prenom,
        u.telephone as seller_telephone
      FROM marketplace_offers o
      LEFT JOIN marketplace_listings l ON o.listing_id = l.id
      LEFT JOIN users u ON o.producer_id = u.id
      WHERE o.buyer_id = $1 
        AND (o.counter_offer_of IS NULL)
      ORDER BY o.created_at DESC`,
      [buyerId]
    );

    this.logger.log(`[getBuyerInquiries] ${buyerId}: ${offersResult.rows.length} offres initiales trouvées (sans contre-propositions)`);

    if (offersResult.rows.length > 0) {
      this.logger.debug('[getBuyerInquiries] Première offre brute:', {
        id: offersResult.rows[0].id,
        proposed_price: offersResult.rows[0].proposed_price,
        offer_subject_ids: offersResult.rows[0].offer_subject_ids,
        created_at: offersResult.rows[0].created_at,
        status: offersResult.rows[0].status,
        seller_nom: offersResult.rows[0].seller_nom,
      });
    }

    return offersResult.rows.map((row: any) => {
      // ✅ Calculer le nombre réel de sujets dans l'offre
      const offerSubjectIds = Array.isArray(row.offer_subject_ids) 
        ? row.offer_subject_ids 
        : (row.offer_subject_ids ? JSON.parse(row.offer_subject_ids) : []);
      const offerPigCount = offerSubjectIds.length || 1;
      
      return {
        id: row.id,
        listingId: row.listing_id,
        buyerId: row.buyer_id,
        sellerId: row.seller_id,
        inquiryType: 'offer', // Les offres marketplace sont toujours de type 'offer'
        offeredAmount: row.proposed_price ? parseFloat(row.proposed_price) : null,
        proposedPrice: row.proposed_price ? parseFloat(row.proposed_price) : null,
        originalPrice: row.original_price ? parseFloat(row.original_price) : null,
        message: row.message,
        status: row.status,
        termsAccepted: row.terms_accepted,
        expiresAt: row.expires_at,
        counterOfferOf: row.counter_offer_of,
        dateRecuperationSouhaitee: row.date_recuperation_souhaitee,
        createdAt: row.created_at_iso || row.created_at,
        respondedAt: row.responded_at_iso || row.responded_at,
        // ✅ CORRECTION: Utiliser les subjectIds de l'OFFRE (pas du listing)
        subjectIds: offerSubjectIds,
        pig_count: offerPigCount, // Nombre de sujets dans l'offre
        // Propriétés aplaties pour compatibilité frontend
        listing_price: row.listing_price ? parseFloat(row.listing_price) : null,
        listing_type: row.listing_type,
        listing_pig_count: row.listing_pig_count, // Nombre total de sujets dans le listing
        subject_id: row.subject_id,
        pig_ids: row.pig_ids,
        seller_nom: row.seller_nom,
        seller_prenom: row.seller_prenom,
        seller_telephone: row.seller_telephone,
        // Objets nested aussi gardés pour compatibilité future
        listing: {
          id: row.listing_id,
          price: row.listing_price ? parseFloat(row.listing_price) : null,
          listingType: row.listing_type,
          pigCount: row.listing_pig_count,
        },
        seller: {
          id: row.seller_id,
          nom: row.seller_nom,
          prenom: row.seller_prenom,
          telephone: row.seller_telephone,
        },
      };
    });
  }

  /**
   * Récupérer toutes les offres reçues par le vendeur (producteur)
   */
  async getSellerInquiries(sellerId: string) {
    try {
      this.logger.log(`[getSellerInquiries] Recherche offres reçues pour vendeur ${sellerId}`);

      // NOTE: Les offres sont stockées dans marketplace_offers (pas marketplace_inquiries)
      // ✅ IMPORTANT: Récupérer o.subject_ids pour savoir quels sujets SPÉCIFIQUES ont été sélectionnés par l'acheteur
      const offersResult = await this.databaseService.query(
        `SELECT
          o.id,
          o.listing_id,
          o.buyer_id,
          o.producer_id as seller_id,
          o.proposed_price,
          o.original_price,
          o.message,
          o.status,
          o.terms_accepted,
          o.expires_at,
          o.counter_offer_of,
          o.date_recuperation_souhaitee,
          o.subject_ids as offer_subject_ids,
          TO_CHAR(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at_iso,
          TO_CHAR(o.responded_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as responded_at_iso,
          o.created_at,
          o.responded_at,
          l.calculated_price as listing_price,
          l.listing_type,
          l.pig_count as listing_pig_count,
          l.subject_id,
          l.pig_ids,
          u.nom as buyer_nom,
          u.prenom as buyer_prenom,
          u.telephone as buyer_telephone,
          u.email as buyer_email
        FROM marketplace_offers o
        LEFT JOIN marketplace_listings l ON o.listing_id = l.id
        LEFT JOIN users u ON o.buyer_id = u.id
        WHERE o.producer_id = $1 AND o.counter_offer_of IS NULL
        ORDER BY o.created_at DESC`,
        [sellerId]
      );

      // Récupérer aussi les contre-propositions reçues par l'utilisateur (quand il est acheteur)
      const counterOffersResult = await this.databaseService.query(
        `SELECT
          o.id,
          o.listing_id,
          o.buyer_id,
          o.producer_id as seller_id,
          o.proposed_price,
          o.original_price,
          o.message,
          o.status,
          o.terms_accepted,
          o.expires_at,
          o.counter_offer_of,
          o.date_recuperation_souhaitee,
          o.subject_ids as offer_subject_ids,
          TO_CHAR(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at_iso,
          TO_CHAR(o.responded_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as responded_at_iso,
          o.created_at,
          o.responded_at,
          l.calculated_price as listing_price,
          l.listing_type,
          l.pig_count as listing_pig_count,
          l.subject_id,
          l.pig_ids,
          u2.nom as buyer_nom,
          u2.prenom as buyer_prenom,
          u2.telephone as buyer_telephone,
          u2.email as buyer_email,
          u.nom as seller_nom,
          u.prenom as seller_prenom,
          'counter_proposal_received' as offer_category
        FROM marketplace_offers o
        LEFT JOIN marketplace_listings l ON o.listing_id = l.id
        LEFT JOIN users u ON o.producer_id = u.id
        LEFT JOIN users u2 ON o.buyer_id = u2.id
        WHERE o.buyer_id = $1 AND o.counter_offer_of IS NOT NULL
        ORDER BY o.created_at DESC`,
        [sellerId]
      );

      this.logger.log(`[getSellerInquiries] ${offersResult.rows.length} offres initiales + ${counterOffersResult.rows.length} contre-propositions reçues pour user ${sellerId}`);

      // Fonction helper pour conversion sécurisée
      const safeParseFloat = (value: any): number | null => {
        if (value === null || value === undefined || value === '') {
          return null;
        }
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      };

      // Fonction de mapping commune
      const mapOfferRow = (row: any, isCounterProposal: boolean = false) => {
        const offerSubjectIds = Array.isArray(row.offer_subject_ids) 
          ? row.offer_subject_ids 
          : (row.offer_subject_ids ? JSON.parse(row.offer_subject_ids) : []);
        const offerPigCount = offerSubjectIds.length || 1;
        
        return {
          id: row.id,
          listingId: row.listing_id,
          buyerId: row.buyer_id,
          sellerId: row.seller_id,
          inquiryType: 'offer',
          offeredAmount: safeParseFloat(row.proposed_price),
          proposedPrice: safeParseFloat(row.proposed_price),
          originalPrice: safeParseFloat(row.original_price),
          message: row.message,
          status: row.status,
          termsAccepted: row.terms_accepted,
          expiresAt: row.expires_at,
          counterOfferOf: row.counter_offer_of,
          dateRecuperationSouhaitee: row.date_recuperation_souhaitee,
          createdAt: row.created_at_iso || row.created_at,
          respondedAt: row.responded_at_iso || row.responded_at,
          subjectIds: offerSubjectIds,
          pig_count: offerPigCount,
          listing_price: safeParseFloat(row.listing_price),
          listing_type: row.listing_type,
          listing_pig_count: row.listing_pig_count,
          subject_id: row.subject_id,
          pig_ids: row.pig_ids,
          // Pour les offres normales, buyer_nom vient du buyer
          // Pour les contre-propositions reçues, on affiche le nom du producteur
          buyer_nom: isCounterProposal ? row.seller_nom : row.buyer_nom,
          buyer_prenom: isCounterProposal ? row.seller_prenom : row.buyer_prenom,
          buyer_telephone: row.buyer_telephone,
          buyer_email: row.buyer_email,
          // Indicateur pour le frontend
          isCounterProposalReceived: isCounterProposal,
          // Nom du producteur pour les contre-propositions
          seller_nom: row.seller_nom,
          seller_prenom: row.seller_prenom,
          listing: {
            id: row.listing_id,
            price: safeParseFloat(row.listing_price),
            listingType: row.listing_type,
            pigCount: row.listing_pig_count,
          },
          buyer: {
            id: row.buyer_id,
            nom: row.buyer_nom,
            prenom: row.buyer_prenom,
            telephone: row.buyer_telephone,
            email: row.buyer_email,
          },
        };
      };

      // Mapper les offres reçues (en tant que producteur)
      const producerOffers = offersResult.rows.map((row: any) => mapOfferRow(row, false));
      
      // Mapper les contre-propositions reçues (en tant qu'acheteur)
      const counterProposals = counterOffersResult.rows.map((row: any) => mapOfferRow(row, true));

      // Fusionner et trier par date de création (plus récent en premier)
      const result = [...producerOffers, ...counterProposals].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      this.logger.log(`[getSellerInquiries] ${result.length} offres formatées pour user ${sellerId} (${producerOffers.length} offres + ${counterProposals.length} contre-propositions)`);
      return result;
    } catch (error) {
      this.logger.error(`[getSellerInquiries] Erreur récupération offres pour vendeur ${sellerId}:`, error);
      throw error;
    }
  }

  // ========================================
  // PHOTOS DES LISTINGS
  // ========================================

  /**
   * Ajouter une photo à un listing
   */
  async addPhotoToListing(
    listingId: string,
    file: { fieldname: string; originalname: string; encoding: string; mimetype: string; size: number; buffer?: Buffer; path?: string; filename?: string },
    caption: string | undefined,
    userId: string
  ) {
    return await this.databaseService.transaction(async (client) => {
      // Vérifier que le listing appartient à l'utilisateur
      const listingResult = await client.query(
        `SELECT producer_id, photos FROM marketplace_listings WHERE id = $1`,
        [listingId]
      );

      if (listingResult.rows.length === 0) {
        throw new NotFoundException('Listing non trouvé');
      }

      if (listingResult.rows[0].producer_id !== userId) {
        throw new ForbiddenException('Vous n\'êtes pas autorisé à modifier ce listing');
      }

      // Optimiser l'image avec ImageService
      let thumbnailPath: string | undefined;
      try {
        // Créer une miniature
        thumbnailPath = await this.createThumbnail(file.path);
      } catch (error) {
        this.logger.warn(`[addPhotoToListing] Erreur création thumbnail: ${error.message}`);
        // Continuer sans thumbnail si erreur
      }
      
      const photoUrl = `/uploads/marketplace/${file.filename}`;
      const thumbnailUrl = thumbnailPath 
        ? `/uploads/marketplace/${path.basename(thumbnailPath)}`
        : photoUrl;

      // Récupérer les photos existantes
      const existingPhotos = listingResult.rows[0].photos || [];

      // Ajouter la nouvelle photo
      const newPhoto = {
        url: photoUrl,
        thumbnailUrl,
        order: existingPhotos.length + 1,
        caption: caption || null,
        uploadedAt: new Date().toISOString(),
      };

      const updatedPhotos = [...existingPhotos, newPhoto];

      // Mettre à jour la base de données
      await client.query(
        `UPDATE marketplace_listings 
         SET photos = $1::jsonb, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(updatedPhotos), listingId]
      );

      // Invalider le cache du listing
      this.cacheService.delete(`listing_subjects:${listingId}`);

      this.logger.log(`[addPhotoToListing] Photo ajoutée au listing ${listingId}`);

      return {
        photo: newPhoto,
        totalPhotos: updatedPhotos.length,
      };
    });
  }

  /**
   * Ajouter plusieurs photos à un listing
   */
  async addMultiplePhotos(
    listingId: string,
    files: Array<{ fieldname: string; originalname: string; encoding: string; mimetype: string; size: number; buffer?: Buffer; path?: string; filename?: string }>,
    userId: string
  ) {
    return await this.databaseService.transaction(async (client) => {
      const listingResult = await client.query(
        `SELECT producer_id, photos FROM marketplace_listings WHERE id = $1`,
        [listingId]
      );

      if (listingResult.rows.length === 0) {
        throw new NotFoundException('Listing non trouvé');
      }

      if (listingResult.rows[0].producer_id !== userId) {
        throw new ForbiddenException('Vous n\'êtes pas autorisé à modifier ce listing');
      }

      const existingPhotos = listingResult.rows[0].photos || [];
      const newPhotos = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let thumbnailPath: string | undefined;
        
        try {
          thumbnailPath = await this.createThumbnail(file.path);
        } catch (error) {
          this.logger.warn(`[addMultiplePhotos] Erreur création thumbnail pour ${file.filename}: ${error.message}`);
        }

        newPhotos.push({
          url: `/uploads/marketplace/${file.filename}`,
          thumbnailUrl: thumbnailPath 
            ? `/uploads/marketplace/${path.basename(thumbnailPath)}`
            : `/uploads/marketplace/${file.filename}`,
          order: existingPhotos.length + i + 1,
          caption: null,
          uploadedAt: new Date().toISOString(),
        });
      }

      const updatedPhotos = [...existingPhotos, ...newPhotos];

      await client.query(
        `UPDATE marketplace_listings 
         SET photos = $1::jsonb, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(updatedPhotos), listingId]
      );

      // Invalider le cache
      this.cacheService.delete(`listing_subjects:${listingId}`);

      this.logger.log(`[addMultiplePhotos] ${newPhotos.length} photo(s) ajoutée(s) au listing ${listingId}`);

      return {
        addedPhotos: newPhotos.length,
        totalPhotos: updatedPhotos.length,
        photos: newPhotos,
      };
    });
  }

  /**
   * Supprimer une photo d'un listing
   */
  async deletePhoto(listingId: string, photoIndex: number, userId: string) {
    return await this.databaseService.transaction(async (client) => {
      const listingResult = await client.query(
        `SELECT producer_id, photos FROM marketplace_listings WHERE id = $1`,
        [listingId]
      );

      if (listingResult.rows.length === 0) {
        throw new NotFoundException('Listing non trouvé');
      }

      if (listingResult.rows[0].producer_id !== userId) {
        throw new ForbiddenException('Vous n\'êtes pas autorisé à modifier ce listing');
      }

      const photos = listingResult.rows[0].photos || [];
      
      if (photoIndex < 0 || photoIndex >= photos.length) {
        throw new BadRequestException('Index de photo invalide');
      }

      // Supprimer les fichiers physiques
      const photoToDelete = photos[photoIndex];
      await this.deletePhotoFiles(photoToDelete.url, photoToDelete.thumbnailUrl);

      // Retirer la photo du tableau
      const updatedPhotos = photos.filter((_, index) => index !== photoIndex);

      // Réorganiser les ordres
      updatedPhotos.forEach((photo, index) => {
        photo.order = index + 1;
      });

      await client.query(
        `UPDATE marketplace_listings 
         SET photos = $1::jsonb, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(updatedPhotos), listingId]
      );

      // Invalider le cache
      this.cacheService.delete(`listing_subjects:${listingId}`);

      this.logger.log(`[deletePhoto] Photo supprimée du listing ${listingId}`);

      return { 
        message: 'Photo supprimée avec succès', 
        remainingPhotos: updatedPhotos.length 
      };
    });
  }

  /**
   * Créer une miniature d'une image
   */
  private async createThumbnail(originalPath: string): Promise<string> {
    try {
      const thumbnailPath = originalPath.replace(
        path.basename(originalPath),
        `thumb_${path.basename(originalPath)}`
      );

      // Utiliser sharp directement pour créer les thumbnails
      const sharp = await import('sharp');
      await sharp.default(originalPath)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return thumbnailPath;
    } catch (error) {
      this.logger.error(`[createThumbnail] Erreur: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupérer une offre par son ID
   */
  async getOfferById(offerId: string, userId: string) {
    try {
      this.logger.log(`[getOfferById] Recherche offre ${offerId} pour user ${userId}`);

      // NOTE: Les offres sont dans marketplace_offers (pas marketplace_inquiries)
      const offerResult = await this.databaseService.query(
        `SELECT
          o.id,
          o.listing_id,
          o.buyer_id,
          o.producer_id as seller_id,
          o.proposed_price,
          o.original_price,
          o.message,
          o.status,
          o.terms_accepted,
          o.expires_at,
          o.counter_offer_of,
          o.date_recuperation_souhaitee,
          TO_CHAR(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at_iso,
          TO_CHAR(o.responded_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as responded_at_iso,
          o.created_at,
          o.responded_at,
          l.calculated_price as listing_price,
          l.listing_type,
          l.pig_count,
          l.subject_id,
          l.pig_ids,
          u.nom as seller_nom,
          u.prenom as seller_prenom,
          u.telephone as seller_telephone
        FROM marketplace_offers o
        LEFT JOIN marketplace_listings l ON o.listing_id = l.id
        LEFT JOIN users u ON o.producer_id = u.id
        WHERE o.id = $1`,
        [offerId]
      );

      this.logger.log(`[getOfferById] Résultat requête: ${offerResult.rows.length} lignes`);

      if (offerResult.rows.length === 0) {
        this.logger.warn(`[getOfferById] Offre ${offerId} non trouvée`);
        throw new NotFoundException('Offre non trouvée');
      }

      const offerData = offerResult.rows[0];
      this.logger.log(`[getOfferById] Données récupérées: buyer_id=${offerData.buyer_id}, seller_id=${offerData.seller_id}`);

      // Vérifier que l'utilisateur a le droit de voir cette offre
      // (soit l'acheteur, soit le vendeur)
      if (offerData.buyer_id !== userId && offerData.seller_id !== userId) {
        this.logger.warn(`[getOfferById] Accès refusé pour user ${userId} sur offre ${offerId}`);
        throw new ForbiddenException('Vous n\'avez pas accès à cette offre');
      }

      this.logger.log(`[getOfferById] Offre ${offerId} récupérée par user ${userId}`);

      // Fonction helper pour conversion sécurisée
      const safeParseFloat = (value: any): number | null => {
        if (value === null || value === undefined || value === '') {
          return null;
        }
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      };

      const result = {
        id: offerData.id,
        listingId: offerData.listing_id,
        buyerId: offerData.buyer_id,
        sellerId: offerData.seller_id,
        inquiryType: 'offer',
        offeredAmount: safeParseFloat(offerData.proposed_price),
        proposedPrice: safeParseFloat(offerData.proposed_price),
        originalPrice: safeParseFloat(offerData.original_price),
        message: offerData.message,
        status: offerData.status,
        termsAccepted: offerData.terms_accepted,
        expiresAt: offerData.expires_at,
        counterOfferOf: offerData.counter_offer_of,
        dateRecuperationSouhaitee: offerData.date_recuperation_souhaitee,
        createdAt: offerData.created_at_iso || offerData.created_at,
        respondedAt: offerData.responded_at_iso || offerData.responded_at,
        // Propriétés aplaties pour compatibilité frontend
        listing_price: safeParseFloat(offerData.listing_price),
        listing_type: offerData.listing_type,
        pig_count: offerData.pig_count,
        subject_id: offerData.subject_id,
        pig_ids: offerData.pig_ids,
        seller_nom: offerData.seller_nom,
        seller_prenom: offerData.seller_prenom,
        seller_telephone: offerData.seller_telephone,
        // Objets nested aussi gardés pour compatibilité future
        listing: {
          id: offerData.listing_id,
          price: safeParseFloat(offerData.listing_price),
          listingType: offerData.listing_type,
          pigCount: offerData.pig_count,
        },
        seller: {
          id: offerData.seller_id,
          nom: offerData.seller_nom,
          prenom: offerData.seller_prenom,
          telephone: offerData.seller_telephone,
        },
      };

      this.logger.log(`[getOfferById] Offre ${offerId} récupérée avec succès pour user ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`[getOfferById] Erreur récupération offre ${offerId}:`, error);
      throw error;
    }
  }

  async withdrawOffer(offerId: string, userId: string) {
    // Récupérer les données de l'offre avant la transaction pour la notification
    const offerResult = await this.databaseService.query(
      `SELECT id, buyer_id, producer_id, status FROM marketplace_offers WHERE id = $1`,
      [offerId]
    );

    if (offerResult.rows.length === 0) {
      throw new NotFoundException('Offre non trouvée');
    }

    const offerData = offerResult.rows[0];

    // Vérifier que c'est bien l'acheteur qui fait la demande
    if (offerData.buyer_id !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas retirer cette offre');
    }

    // Vérifier que l'offre est encore en attente
    if (offerData.status !== 'pending') {
      throw new BadRequestException(
        'Impossible de retirer une offre déjà acceptée ou refusée'
      );
    }

    // Transaction pour mettre à jour le statut
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `UPDATE marketplace_offers
         SET status = 'withdrawn', derniere_modification = NOW()
         WHERE id = $1`,
        [offerId]
      );
    });

    // Notifier le vendeur en arrière-plan (après la transaction pour ne pas bloquer)
    // Optimisation: notification en arrière-plan pour ne pas bloquer la réponse
    this.notificationsService.createNotification({
      userId: offerData.producer_id,
      type: NotificationType.OFFER_WITHDRAWN,
      title: 'Offre retirée',
      message: 'Un acheteur a retiré son offre',
      relatedType: 'offer',
      relatedId: offerId,
    }).then(() => {
      this.logger.log(`[withdrawOffer] Notification envoyée au vendeur ${offerData.producer_id}`);
    }).catch((error) => {
      this.logger.error(`[withdrawOffer] Erreur notification: ${error.message}`);
      // Ne pas bloquer le retrait si la notification échoue
    });

    this.logger.log(`[withdrawOffer] Offre ${offerId} retirée par acheteur ${userId}`);
    return {
      message: 'Offre retirée avec succès',
      offerId,
    };
  }

  /**
   * Supprimer les fichiers physiques d'une photo
   */
  private async deletePhotoFiles(photoUrl: string, thumbnailUrl?: string) {
    try {
      const photoPath = path.join(process.cwd(), photoUrl.replace(/^\//, ''));
      if (await fs.access(photoPath).then(() => true).catch(() => false)) {
        await fs.unlink(photoPath);
      }

      if (thumbnailUrl && thumbnailUrl !== photoUrl) {
        const thumbPath = path.join(process.cwd(), thumbnailUrl.replace(/^\//, ''));
        if (await fs.access(thumbPath).then(() => true).catch(() => false)) {
          await fs.unlink(thumbPath);
        }
      }
    } catch (error) {
      this.logger.warn(`[deletePhotoFiles] Erreur suppression fichiers: ${error.message}`);
      // Ne pas bloquer si suppression échoue
    }
  }

  // ========================================
  // PRICE TRENDS - Tendances de prix hebdomadaires
  // ========================================

  /**
   * Récupérer les tendances de prix des N dernières semaines
   */
  async getPriceTrends(weeksCount: number = 27) {
    try {
      // Vérifier si la table existe
      const tableCheck = await this.databaseService.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'weekly_pork_price_trends'
        ) as exists`
      );

      if (!tableCheck.rows[0]?.exists) {
        this.logger.warn('[getPriceTrends] Table weekly_pork_price_trends n\'existe pas encore');
        // Calculer et retourner les tendances à la volée
        return this.calculatePriceTrendsFromListings(weeksCount);
      }

      // Récupérer les tendances stockées
      const result = await this.databaseService.query(
        `SELECT 
          id, year, week_number, 
          avg_price_platform, avg_price_regional,
          transactions_count, offers_count, listings_count,
          source_priority, total_weight_kg, total_price_fcfa,
          created_at, updated_at
        FROM weekly_pork_price_trends
        ORDER BY year DESC, week_number DESC
        LIMIT $1`,
        [weeksCount]
      );

      // Si pas assez de données, calculer et compléter
      if (result.rows.length < weeksCount) {
        this.logger.log(`[getPriceTrends] Seulement ${result.rows.length} tendances trouvées, calcul en cours...`);
        const calculatedTrends = await this.calculatePriceTrendsFromListings(weeksCount);
        return calculatedTrends;
      }

      // Mapper et retourner (ordre chronologique)
      return result.rows.reverse().map(row => this.mapRowToPriceTrend(row));
    } catch (error) {
      this.logger.error('[getPriceTrends] Erreur:', error);
      // En cas d'erreur, essayer de calculer à la volée
      return this.calculatePriceTrendsFromListings(weeksCount);
    }
  }

  /**
   * Calculer les tendances de prix depuis les listings du marketplace
   */
  async calculatePriceTrendsFromListings(weeksCount: number = 27) {
    const trends = [];
    const now = new Date();
    const { year: currentYear, weekNumber: currentWeek } = this.getWeekNumber(now);

    for (let i = 0; i < weeksCount; i++) {
      let year = currentYear;
      let week = currentWeek - i;

      // Gérer le passage d'année
      while (week < 1) {
        year--;
        week += 52;
      }

      const trend = await this.calculateWeekTrend(year, week);
      trends.push(trend);
    }

    // Retourner dans l'ordre chronologique (du plus ancien au plus récent)
    return trends.reverse();
  }

  /**
   * Calculer la tendance pour une semaine spécifique
   */
  private async calculateWeekTrend(year: number, weekNumber: number) {
    // Calculer les dates de début et fin de la semaine
    const weekStart = this.getWeekStartDate(year, weekNumber);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // 1. Récupérer les listings disponibles cette semaine
    const listingsResult = await this.databaseService.query(
      `SELECT 
        id, price_per_kg, calculated_price, weight, pig_count, listing_type,
        listed_at
      FROM marketplace_listings
      WHERE status = 'available'
        AND listed_at >= $1
        AND listed_at < $2`,
      [weekStart.toISOString(), weekEnd.toISOString()]
    );

    // 2. Récupérer les transactions complétées cette semaine
    const transactionsResult = await this.databaseService.query(
      `SELECT 
        t.id, t.final_price, t.completed_at,
        l.weight, l.pig_count
      FROM marketplace_transactions t
      LEFT JOIN marketplace_listings l ON t.listing_id = l.id
      WHERE t.status = 'completed'
        AND t.completed_at >= $1
        AND t.completed_at < $2`,
      [weekStart.toISOString(), weekEnd.toISOString()]
    );

    // 3. Calculer le prix moyen pondéré
    let totalWeightKg = 0;
    let totalPriceFcfa = 0;
    let listingsCount = listingsResult.rows.length;
    let transactionsCount = transactionsResult.rows.length;

    // Prix depuis les transactions (prioritaire)
    for (const t of transactionsResult.rows) {
      const weight = parseFloat(t.weight) || (parseFloat(t.pig_count) * 80); // 80kg par défaut
      if (weight > 0 && t.final_price > 0) {
        totalWeightKg += weight;
        totalPriceFcfa += parseFloat(t.final_price);
      }
    }

    // Si pas assez de transactions, utiliser les listings
    if (totalWeightKg === 0) {
      for (const l of listingsResult.rows) {
        const weight = parseFloat(l.weight) || (parseFloat(l.pig_count) * 80);
        const pricePerKg = parseFloat(l.price_per_kg) || 0;
        if (weight > 0 && pricePerKg > 0) {
          totalWeightKg += weight;
          totalPriceFcfa += pricePerKg * weight;
        }
      }
    }

    // Calculer le prix moyen
    const avgPricePlatform = totalWeightKg > 0 
      ? Math.round(totalPriceFcfa / totalWeightKg) 
      : null;

    // Prix régional de référence (fallback)
    const avgPriceRegional = 2300; // FCFA/kg par défaut

    // Déterminer la source
    let sourcePriority = 'regional';
    if (transactionsCount > 0 && avgPricePlatform) {
      sourcePriority = 'platform';
    } else if (listingsCount > 0 && avgPricePlatform) {
      sourcePriority = 'listings';
    }

    const trend = {
      id: `${year}-W${weekNumber.toString().padStart(2, '0')}`,
      year,
      weekNumber,
      avgPricePlatform: avgPricePlatform || avgPriceRegional,
      avgPriceRegional,
      transactionsCount,
      offersCount: 0,
      listingsCount,
      sourcePriority,
      totalWeightKg: totalWeightKg > 0 ? Math.round(totalWeightKg * 100) / 100 : null,
      totalPriceFcfa: totalPriceFcfa > 0 ? Math.round(totalPriceFcfa) : null,
      updatedAt: new Date().toISOString(),
    };

    // Essayer de sauvegarder si la table existe
    try {
      await this.upsertPriceTrend(trend);
    } catch (e) {
      // Ignorer si la table n'existe pas encore
    }

    return trend;
  }

  /**
   * Créer ou mettre à jour une tendance de prix
   */
  async upsertPriceTrend(trendData: any) {
    const id = trendData.id || `${trendData.year}-W${trendData.weekNumber.toString().padStart(2, '0')}`;
    
    try {
      // Vérifier si la table existe
      const tableCheck = await this.databaseService.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'weekly_pork_price_trends'
        ) as exists`
      );

      if (!tableCheck.rows[0]?.exists) {
        this.logger.debug('[upsertPriceTrend] Table n\'existe pas, retour données sans sauvegarde');
        return { ...trendData, id };
      }

      const result = await this.databaseService.query(
        `INSERT INTO weekly_pork_price_trends (
          id, year, week_number, avg_price_platform, avg_price_regional,
          transactions_count, offers_count, listings_count,
          source_priority, total_weight_kg, total_price_fcfa, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (year, week_number) DO UPDATE SET
          avg_price_platform = EXCLUDED.avg_price_platform,
          avg_price_regional = EXCLUDED.avg_price_regional,
          transactions_count = EXCLUDED.transactions_count,
          offers_count = EXCLUDED.offers_count,
          listings_count = EXCLUDED.listings_count,
          source_priority = EXCLUDED.source_priority,
          total_weight_kg = EXCLUDED.total_weight_kg,
          total_price_fcfa = EXCLUDED.total_price_fcfa,
          updated_at = NOW()
        RETURNING *`,
        [
          id,
          trendData.year,
          trendData.weekNumber,
          trendData.avgPricePlatform || trendData.avg_price_platform,
          trendData.avgPriceRegional || trendData.avg_price_regional || 2300,
          trendData.transactionsCount || trendData.transactions_count || 0,
          trendData.offersCount || trendData.offers_count || 0,
          trendData.listingsCount || trendData.listings_count || 0,
          trendData.sourcePriority || trendData.source_priority || 'regional',
          trendData.totalWeightKg || trendData.total_weight_kg,
          trendData.totalPriceFcfa || trendData.total_price_fcfa,
        ]
      );

      return this.mapRowToPriceTrend(result.rows[0]);
    } catch (error) {
      this.logger.error('[upsertPriceTrend] Erreur:', error);
      return { ...trendData, id };
    }
  }

  /**
   * Forcer le recalcul des tendances de prix
   */
  async calculatePriceTrends(weeksCount: number = 4) {
    this.logger.log(`[calculatePriceTrends] Recalcul des ${weeksCount} dernières semaines...`);
    const trends = await this.calculatePriceTrendsFromListings(weeksCount);
    this.logger.log(`[calculatePriceTrends] ${trends.length} tendances calculées`);
    return trends;
  }

  /**
   * Mapper une ligne DB vers un objet tendance
   */
  private mapRowToPriceTrend(row: any) {
    return {
      id: row.id,
      year: row.year,
      weekNumber: row.week_number,
      avgPricePlatform: row.avg_price_platform ? parseFloat(row.avg_price_platform) : null,
      avgPriceRegional: row.avg_price_regional ? parseFloat(row.avg_price_regional) : 2300,
      transactionsCount: row.transactions_count || 0,
      offersCount: row.offers_count || 0,
      listingsCount: row.listings_count || 0,
      sourcePriority: row.source_priority || 'regional',
      totalWeightKg: row.total_weight_kg ? parseFloat(row.total_weight_kg) : null,
      totalPriceFcfa: row.total_price_fcfa ? parseFloat(row.total_price_fcfa) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Obtenir le numéro de semaine ISO
   */
  private getWeekNumber(date: Date): { year: number; weekNumber: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { year: d.getUTCFullYear(), weekNumber };
  }

  /**
   * Obtenir la date de début d'une semaine ISO
   */
  private getWeekStartDate(year: number, weekNumber: number): Date {
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const daysToMonday = jan4Day - 1;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - daysToMonday);
    
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
    weekStart.setHours(0, 0, 0, 0);
    
    return weekStart;
  }
}
