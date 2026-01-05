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
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { CreatePurchaseRequestOfferDto } from './dto/create-purchase-request-offer.dto';
import { CreateBatchListingDto } from './dto/create-batch-listing.dto';
import { SaleAutomationService } from './sale-automation.service';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private databaseService: DatabaseService,
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

    // Vérifier qu'il n'y a pas déjà un listing actif pour ce sujet
    const existingListing = await this.databaseService.query(
      'SELECT id FROM marketplace_listings WHERE subject_id = $1 AND status = $2',
      [createListingDto.subjectId, 'available']
    );

    if (existingListing.rows.length > 0) {
      throw new BadRequestException('Ce sujet est déjà en vente sur le marketplace');
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
      if (!createBatchListingDto.averageWeight || createBatchListingDto.averageWeight <= 0) {
        throw new BadRequestException('Le poids moyen doit être supérieur à 0');
      }

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

      // Utiliser une transaction pour garantir la cohérence des données
      return await this.databaseService.transaction(async (client) => {
        const id = this.generateId('listing');
        const now = new Date().toISOString();
        
        // S'assurer que averageWeight est un nombre valide
        const averageWeight = parseFloat(String(createBatchListingDto.averageWeight)) || 0;
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

  async findAllListings(projetId?: string, userId?: string, limit?: number, offset?: number) {
    // Déclarer les variables avant le try pour qu'elles soient accessibles dans le catch
    let query = '';
    let params: any[] = [];
    const defaultLimit = 100; // Marketplace: limite plus basse car liste publique
    const effectiveLimit = limit ? Math.min(limit, 500) : defaultLimit;
    const effectiveOffset = offset || 0;
    
    try {
      this.logger.debug(`[findAllListings] Paramètres: projetId=${projetId}, userId=${userId}, limit=${effectiveLimit}, offset=${effectiveOffset}`);

      // Colonnes nécessaires pour mapRowToListing (optimisation: éviter SELECT *)
      const listingColumns = `id, listing_type, subject_id, batch_id, pig_ids, pig_count, 
        producer_id, farm_id, price_per_kg, calculated_price, weight,
        status, listed_at, updated_at, last_weight_date, 
        location_latitude, location_longitude, location_address, location_city, location_region,
        sale_terms, views, inquiries, date_creation, derniere_modification`;

      query = `SELECT ${listingColumns} FROM marketplace_listings WHERE status != $1`;
      params.push('removed');

      if (projetId) {
        query += ` AND farm_id = $${params.length + 1}`;
        params.push(projetId);
        this.logger.debug(`[findAllListings] Filtre par projet: farm_id = ${projetId}`);
      }

      if (userId) {
        query += ` AND producer_id = $${params.length + 1}`;
        params.push(userId);
        this.logger.debug(`[findAllListings] Filtre par producteur: producer_id = ${userId}`);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketplace.service.ts:472',message:'Paramètres de recherche findAllListings',data:{userId,projetId,userId_type:typeof userId,projetId_type:typeof projetId,params_count:params.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      }

      query += ` ORDER BY listed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
        this.logger.warn(`[findAllListings] Aucun listing trouvé. Statistiques:`, checkResult.rows[0]);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketplace.service.ts:502',message:'Statistiques listings - valeurs recherchées',data:{userId,projetId,userId_type:typeof userId,projetId_type:typeof projetId,stats:checkResult.rows[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        // Récupérer les valeurs réelles dans la base pour comparaison
        const actualValuesQuery = `SELECT id, producer_id, farm_id, status, 
          pg_typeof(producer_id) as producer_id_type, 
          pg_typeof(farm_id) as farm_id_type
          FROM marketplace_listings WHERE status != 'removed' LIMIT 5`;
        const actualValues = await this.databaseService.query(actualValuesQuery);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketplace.service.ts:510',message:'Valeurs réelles dans la base',data:{actualListings:actualValues.rows.map(r=>({id:r.id,producer_id:r.producer_id,farm_id:r.farm_id,producer_id_type:r.producer_id_type,farm_id_type:r.farm_id_type}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        this.logger.warn(`[findAllListings] Valeurs réelles dans la base:`, actualValues.rows);
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
      
      this.logger.debug(`[findAllListings] ${listings.length} listings mappés avec succès`);
      return listings;
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
              minimalQuery += ` AND farm_id = $${minimalParams.length + 1}`;
              minimalParams.push(projetId);
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
            return minimalListings;
          } catch (fallbackError: any) {
            this.logger.error('Erreur même avec requête minimale:', fallbackError.message);
            return [];
          }
        }
        
        // Si c'est la table qui n'existe pas, retourner un tableau vide
        this.logger.warn(
          'Table marketplace_listings n\'existe pas encore, retour d\'un tableau vide'
        );
        return [];
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
      sale_terms, views, inquiries, date_creation, derniere_modification`;
    
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

  async updateListing(id: string, updateListingDto: UpdateListingDto, userId: string) {
    const listing = await this.findOneListing(id);

    // Vérifier la propriété
    if (listing.producerId !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette annonce");
    }

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

      // Mettre à jour le listing
      await client.query(
        'UPDATE marketplace_listings SET status = $1, derniere_modification = $2 WHERE id = $3',
        ['reserved', now, offerData.listing_id]
      );

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

      // Notifier l'autre partie
      const notifyUserId = role === 'producer' ? offerData.buyer_id : offerData.producer_id;
      await this.createNotification({
        userId: notifyUserId,
        type: 'offer_accepted',
        title: 'Offre acceptée',
        message: role === 'producer' 
          ? 'Votre offre a été acceptée par le producteur'
          : 'Votre contre-proposition a été acceptée par l\'acheteur',
        relatedId: transactionId,
        relatedType: 'transaction',
      });

      return this.mapRowToTransaction(transaction.rows[0]);
    });
  }

  async rejectOffer(offerId: string, producerId: string) {
    const offer = await this.databaseService.query(
      'SELECT * FROM marketplace_offers WHERE id = $1',
      [offerId]
    );

    if (offer.rows.length === 0) {
      throw new NotFoundException('Offre introuvable');
    }

    if (offer.rows[0].producer_id !== producerId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à rejeter cette offre");
    }

    await this.databaseService.query(
      'UPDATE marketplace_offers SET status = $1, responded_at = $2, derniere_modification = $2 WHERE id = $3',
      ['rejected', new Date().toISOString(), offerId]
    );

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

    // Récupérer le listing pour vérifier qu'il est toujours disponible
    const listing = await this.findOneListing(originalOfferData.listing_id);
    if (listing.status !== 'available') {
      throw new BadRequestException("Cette annonce n'est plus disponible");
    }

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
      await this.createNotification({
        userId: originalOfferData.buyer_id,
        type: 'counter_offer_received',
        title: 'Contre-proposition reçue',
        message: `Le producteur vous propose un nouveau prix de ${counterOfferDto.nouveau_prix_total.toLocaleString('fr-FR')} FCFA`,
        relatedId: counterOfferId,
        relatedType: 'offer',
      });

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

  async findAllNotifications(userId: string) {
    try {
      const result = await this.databaseService.query(
        'SELECT * FROM marketplace_notifications WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );

      return result.rows.map((row) => this.mapRowToNotification(row));
    } catch (error: any) {
      // Si la table n'existe pas encore, retourner un tableau vide
      if (error.message?.includes('does not exist') || error.message?.includes('n\'existe pas')) {
        this.logger.warn('Table marketplace_notifications n\'existe pas encore, retour d\'un tableau vide');
        return [];
      }
      throw error;
    }
  }

  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    relatedType?: string;
  }) {
    try {
      const id = this.generateId('notif');
      const now = new Date().toISOString();

      await this.databaseService.query(
        `INSERT INTO marketplace_notifications (
          id, user_id, type, title, message, related_id, related_type, read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          data.userId,
          data.type,
          data.title,
          data.message,
          data.relatedId || null,
          data.relatedType || null,
          false,
          now,
        ]
      );

      return { id };
    } catch (error: any) {
      // Si la table n'existe pas encore, logger un warning mais ne pas faire échouer
      if (error.message?.includes('does not exist') || error.message?.includes('n\'existe pas')) {
        this.logger.warn('Table marketplace_notifications n\'existe pas encore, notification non créée');
        return null;
      }
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string, userId: string) {
    const result = await this.databaseService.query(
      'UPDATE marketplace_notifications SET read = $1, read_at = $2 WHERE id = $3 AND user_id = $4 RETURNING id',
      [true, new Date().toISOString(), notificationId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Notification introuvable');
    }

    return { id: notificationId };
  }

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

  private mapRowToNotification(row: any): any {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      body: row.body || undefined,
      relatedId: row.related_id,
      relatedType: row.related_type,
      read: row.read,
      actionUrl: row.action_url || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      readAt: row.read_at ? new Date(row.read_at).toISOString() : undefined,
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
        await this.createNotification({
          userId: match.producerId,
          type: 'purchase_request_match',
          title: 'Nouvelle demande correspondant à vos sujets',
          message: `Une demande correspond à vos critères avec un score de ${Math.round(match.matchScore)}%`,
          relatedId: requestId,
          relatedType: 'purchase_request',
        });

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
}
