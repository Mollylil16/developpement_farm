import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
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

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(private databaseService: DatabaseService) {}

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
      'SELECT id, poids_actuel FROM production_animaux WHERE id = $1 AND projet_id = $2',
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
    // Vérifier que l'utilisateur est propriétaire du projet
    await this.checkProjetOwnership(createBatchListingDto.farmId, userId);

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
    const existingListing = await this.databaseService.query(
      `SELECT id FROM marketplace_listings 
       WHERE batch_id = $1 AND listing_type = 'batch' AND status IN ('available', 'reserved')
       AND pig_ids @> $2::jsonb`,
      [createBatchListingDto.batchId, JSON.stringify(pigIds)]
    );

    if (existingListing.rows.length > 0) {
      throw new BadRequestException('Ces porcs sont déjà en vente sur le marketplace');
    }

    // Utiliser une transaction pour garantir la cohérence des données
    return await this.databaseService.transaction(async (client) => {
      const id = this.generateId('listing');
      const now = new Date().toISOString();
      const calculatedPrice = createBatchListingDto.pricePerKg * createBatchListingDto.averageWeight * pigCount;

      const result = await client.query(
        `INSERT INTO marketplace_listings (
          id, listing_type, batch_id, pig_ids, pig_count, producer_id, farm_id, 
          price_per_kg, calculated_price, weight, status, listed_at, updated_at, last_weight_date,
          location_latitude, location_longitude, location_address, location_city, location_region,
          sale_terms, views, inquiries, date_creation, derniere_modification
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *`,
        [
          id,
          'batch',
          createBatchListingDto.batchId,
          JSON.stringify(pigIds),
          pigCount,
          userId, // producerId = userId
          createBatchListingDto.farmId,
          createBatchListingDto.pricePerKg,
          calculatedPrice,
          createBatchListingDto.averageWeight, // Poids moyen stocké
          'available',
          now,
          now,
          createBatchListingDto.lastWeightDate,
          createBatchListingDto.location.latitude,
          createBatchListingDto.location.longitude,
          createBatchListingDto.location.address,
          createBatchListingDto.location.city,
          createBatchListingDto.location.region,
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
        ]
      );

      this.logger.log(
        `Annonce marketplace créée pour bande ${createBatchListingDto.batchId}: ${pigCount} porc(s)`
      );

      return this.mapRowToListing(result.rows[0]);
    });
  }

  async findAllListings(projetId?: string, userId?: string, limit?: number, offset?: number) {
    try {
      const defaultLimit = 100; // Marketplace: limite plus basse car liste publique
      const effectiveLimit = limit ? Math.min(limit, 500) : defaultLimit;
      const effectiveOffset = offset || 0;

      // Colonnes nécessaires pour mapRowToListing (optimisation: éviter SELECT *)
      const listingColumns = `id, listing_type, subject_id, batch_id, pig_ids, pig_count, 
        producer_id, farm_id, price_per_kg, calculated_price, weight,
        status, listed_at, updated_at, last_weight_date, 
        location_latitude, location_longitude, location_address, location_city, location_region,
        sale_terms, views, inquiries, date_creation, derniere_modification`;

      let query = `SELECT ${listingColumns} FROM marketplace_listings WHERE status != $1`;
      const params: any[] = ['removed'];

      if (projetId) {
        query += ` AND farm_id = $${params.length + 1}`;
        params.push(projetId);
      }

      if (userId) {
        query += ` AND producer_id = $${params.length + 1}`;
        params.push(userId);
      }

      query += ` ORDER BY listed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(effectiveLimit, effectiveOffset);

      const result = await this.databaseService.query(query, params);
      return result.rows.map((row) => this.mapRowToListing(row));
    } catch (error: any) {
      // Si la table n'existe pas encore, retourner un tableau vide
      if (error.message?.includes('does not exist') || error.message?.includes('n\'existe pas')) {
        this.logger.warn('Table marketplace_listings n\'existe pas encore, retour d\'un tableau vide');
        return [];
      }
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
        terms_accepted, created_at, expires_at, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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

  async acceptOffer(offerId: string, producerId: string) {
    // Récupérer l'offre avant la transaction pour validation
    const offer = await this.databaseService.query(
      'SELECT * FROM marketplace_offers WHERE id = $1',
      [offerId]
    );

    if (offer.rows.length === 0) {
      throw new NotFoundException('Offre introuvable');
    }

    const offerData = offer.rows[0];

    if (offerData.producer_id !== producerId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à accepter cette offre");
    }

    if (offerData.status !== 'pending') {
      throw new BadRequestException('Cette offre ne peut plus être acceptée');
    }

    // Utiliser une transaction pour garantir la cohérence des données
    return await this.databaseService.transaction(async (client) => {
      const now = new Date().toISOString();

      // Mettre à jour l'offre
      await client.query(
        'UPDATE marketplace_offers SET status = $1, responded_at = $2, derniere_modification = $2 WHERE id = $3',
        ['accepted', now, offerId]
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
          offerData.proposed_price,
          'confirmed',
          now,
          now,
          now,
        ]
      );

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
    if (deliveryDetails.producerConfirmed && deliveryDetails.buyerConfirmed) {
      newStatus = 'completed';
    } else if (deliveryDetails.producerConfirmed || deliveryDetails.buyerConfirmed) {
      newStatus = 'delivered';
    }

    await this.databaseService.query(
      'UPDATE marketplace_transactions SET delivery_details = $1, status = $2, derniere_modification = $3 WHERE id = $4',
      [JSON.stringify(deliveryDetails), newStatus, new Date().toISOString(), transactionId]
    );

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
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'marketplace.service.ts:805',message:'checkProjetOwnership entry',data:{projetId,userId,projetIdType:typeof projetId,userIdType:typeof userId,projetIdLength:projetId?.length,userIdLength:userId?.length,projetIdJSON:JSON.stringify(projetId),userIdJSON:JSON.stringify(userId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})+'\n'); } catch(e) {}
    // #endregion
    const result = await this.databaseService.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [projetId]
    );
    if (result.rows.length === 0) {
      // #region agent log
      try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); fs.appendFileSync(logPath, JSON.stringify({location:'marketplace.service.ts:810',message:'checkProjetOwnership: projet introuvable',data:{projetId,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})+'\n'); } catch(e) {}
      // #endregion
      throw new NotFoundException('Projet introuvable');
    }
    const rawProprietaireId = result.rows[0].proprietaire_id;
    const proprietaireId = String(rawProprietaireId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); fs.appendFileSync(logPath, JSON.stringify({location:'marketplace.service.ts:813',message:'checkProjetOwnership: comparaison détaillée',data:{projetId,userId,rawProprietaireId,proprietaireId,normalizedUserId,proprietaireIdType:typeof proprietaireId,normalizedUserIdType:typeof normalizedUserId,areEqual:proprietaireId===normalizedUserId,proprietaireIdLength:proprietaireId?.length,normalizedUserIdLength:normalizedUserId?.length,proprietaireIdJSON:JSON.stringify(proprietaireId),normalizedUserIdJSON:JSON.stringify(normalizedUserId),proprietaireIdCharCodes:proprietaireId?.split('').map(c=>c.charCodeAt(0)),normalizedUserIdCharCodes:normalizedUserId?.split('').map(c=>c.charCodeAt(0))},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})+'\n'); } catch(e) {}
    // #endregion
    if (proprietaireId !== normalizedUserId) {
      // #region agent log
      try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); fs.appendFileSync(logPath, JSON.stringify({location:'marketplace.service.ts:814',message:'checkProjetOwnership: accès refusé',data:{projetId,userId,proprietaireId,normalizedUserId,reason:'proprietaireId !== normalizedUserId',diffLength:Math.abs(proprietaireId.length-normalizedUserId.length)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})+'\n'); } catch(e) {}
      // #endregion
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  private mapRowToListing(row: any): any {
    const listing: any = {
      id: row.id,
      listingType: row.listing_type || 'individual',
      producerId: row.producer_id,
      farmId: row.farm_id,
      pricePerKg: parseFloat(row.price_per_kg),
      calculatedPrice: parseFloat(row.calculated_price),
      weight: row.weight ? parseFloat(row.weight) : undefined, // Poids moyen (batch) ou individuel
      status: row.status,
      listedAt: row.listed_at ? new Date(row.listed_at).toISOString() : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      lastWeightDate: row.last_weight_date
        ? new Date(row.last_weight_date).toISOString()
        : undefined,
      location: {
        latitude: parseFloat(row.location_latitude),
        longitude: parseFloat(row.location_longitude),
        address: row.location_address,
        city: row.location_city,
        region: row.location_region,
      },
      saleTerms: typeof row.sale_terms === 'string' ? JSON.parse(row.sale_terms) : row.sale_terms,
      views: row.views || 0,
      inquiries: row.inquiries || 0,
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
        : typeof row.pig_ids === 'string'
        ? JSON.parse(row.pig_ids)
        : [];
      listing.pigCount = row.pig_count ? parseInt(row.pig_count) : listing.pigIds.length;
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
      message: row.message || undefined,
      status: row.status,
      termsAccepted: row.terms_accepted,
      termsAcceptedAt: row.terms_accepted_at
        ? new Date(row.terms_accepted_at).toISOString()
        : undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      respondedAt: row.responded_at ? new Date(row.responded_at).toISOString() : undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
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

    const result = await this.databaseService.query(
      `INSERT INTO purchase_requests (
        id, buyer_id, title, race, min_weight, max_weight, age_category,
        min_age_months, max_age_months, quantity, delivery_location,
        max_price_per_kg, max_total_price, delivery_date, delivery_period_start,
        delivery_period_end, message, status, views, matched_producers_count,
        offers_count, expires_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *`,
      [
        id,
        userId,
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
      ]
    );

    return this.mapRowToPurchaseRequest(result.rows[0]);
  }

  async findAllPurchaseRequests(userId: string, buyerId?: string, status?: string) {
    let query = 'SELECT * FROM purchase_requests WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (buyerId) {
      query += ` AND buyer_id = $${paramIndex}`;
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
