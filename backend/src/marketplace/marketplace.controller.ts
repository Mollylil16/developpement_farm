import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceUnifiedService } from './marketplace-unified.service';
import { DatabaseService } from '../database/database.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { CounterOfferDto } from './dto/counter-offer.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { CreatePurchaseRequestOfferDto } from './dto/create-purchase-request-offer.dto';
import { CreateBatchListingDto } from './dto/create-batch-listing.dto';
import { CompleteSaleDto } from './dto/complete-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('marketplace')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly marketplaceUnifiedService: MarketplaceUnifiedService,
    private readonly databaseService: DatabaseService
  ) {}

  // ========================================
  // LISTINGS
  // ========================================

  @Post('listings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle annonce (animal individuel) - Unifié' })
  @ApiResponse({ status: 201, description: 'Annonce créée avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  async createListing(
    @Body() createListingDto: CreateListingDto,
    @CurrentUser('id') userId: string
  ) {
    // ✅ DEBUG: Logger les valeurs reçues du frontend
    // Utiliser le nouveau service unifié
    return await this.marketplaceUnifiedService.createUnifiedListing(createListingDto, userId, 'individual');
  }

  @Post('listings/batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle annonce pour une bande (batch) - Unifié' })
  @ApiResponse({ status: 201, description: 'Annonce de bande créée avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  async createBatchListing(
    @Body() createBatchListingDto: CreateBatchListingDto,
    @CurrentUser('id') userId: string
  ) {
    // Utiliser le nouveau service unifié
    return this.marketplaceUnifiedService.createUnifiedListing(createBatchListingDto, userId, 'batch');
  }

  @Get('listings')
  @ApiOperation({ summary: 'Récupérer toutes les annonces (avec pagination optionnelle)' })
  @ApiQuery({ name: 'projet_id', required: false, description: 'ID du projet' })
  @ApiQuery({ name: 'user_id', required: false, description: "ID de l'utilisateur (producteur)" })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Nombre maximum de résultats (défaut: 100, max: 500)',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Nombre d\'éléments à ignorer pour la pagination',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Liste des annonces.' })
  async findAllListings(
    @Query('projet_id') projetId?: string,
    @Query('user_id') userId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    return this.marketplaceService.findAllListings(projetId, userId, limitNum, offsetNum);
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Récupérer une annonce par son ID' })
  @ApiResponse({ status: 200, description: "Détails de l'annonce." })
  @ApiResponse({ status: 404, description: 'Annonce introuvable.' })
  async findOneListing(@Param('id') id: string) {
    return this.marketplaceService.findOneListing(id);
  }

  @Patch('listings/:id')
  @ApiOperation({ summary: 'Mettre à jour une annonce (individuelle ou bande) - Unifié' })
  @ApiResponse({ status: 200, description: 'Annonce mise à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Annonce introuvable.' })
  async updateListing(
    @Param('id') id: string,
    @Body() updateListingDto: UpdateListingDto,
    @CurrentUser('id') userId: string
  ) {
    // Utiliser le nouveau service unifié
    return this.marketplaceUnifiedService.updateUnifiedListing(id, updateListingDto, userId);
  }

  @Delete('listings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une annonce (individuelle ou bande) - Unifié' })
  @ApiResponse({ status: 204, description: 'Annonce supprimée avec succès.' })
  @ApiResponse({ status: 404, description: 'Annonce introuvable.' })
  async deleteListing(@Param('id') id: string, @CurrentUser('id') userId: string) {
    // Utiliser le nouveau service unifié
    await this.marketplaceUnifiedService.deleteUnifiedListing(id, userId);
  }

  @Post('listings/:listingId/complete-sale')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Compléter une vente directe',
    description: `
      Permet de finaliser une vente directe sans passer par le workflow d'offres.
      
      RÈGLES IMPLÉMENTÉES:
      - Le listing est marqué comme 'sold'
      - Tous les autres listings contenant les mêmes sujets sont nettoyés
      - Le statut des animaux est mis à jour (vendu/supprimé)
      - Un revenu est créé en finance
      - Une transaction marketplace est créée
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Vente complétée avec succès.',
    schema: {
      example: {
        success: true,
        transaction: {
          id: 'transaction_xxx',
          amount: 150000,
          seller: { id: 'user_xxx', name: 'Jean Dupont' },
          buyer: { id: 'user_yyy', name: 'Marie Martin' },
          listing: { id: 'listing_xxx', type: 'individual', subjectIds: ['animal_xxx'] }
        },
        cleanup: {
          listingsRemoved: 2,
          listingsUpdated: 1,
          animalsUpdated: 1
        },
        finance: {
          revenueId: 'revenu_xxx',
          amount: 150000,
          venteId: 'vente_xxx'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Données invalides ou listing non disponible.' })
  @ApiResponse({ status: 403, description: 'Non autorisé à vendre ce listing.' })
  @ApiResponse({ status: 404, description: 'Listing ou acheteur introuvable.' })
  async completeSale(
    @Param('listingId') listingId: string,
    @Body() dto: CompleteSaleDto,
    @CurrentUser('id') userId: string
  ) {
    // S'assurer que le listingId dans l'URL correspond à celui du DTO
    dto.listingId = listingId;
    return this.marketplaceService.completeSale(dto, userId);
  }

  // ========================================
  // OFFERS
  // ========================================

  @Post('offers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle offre' })
  @ApiResponse({ status: 201, description: 'Offre créée avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  async createOffer(@Body() createOfferDto: CreateOfferDto, @CurrentUser('id') userId: string) {
    return this.marketplaceService.createOffer(createOfferDto, userId);
  }

  @Get('offers')
  @ApiOperation({ summary: 'Récupérer toutes les offres' })
  @ApiQuery({ name: 'listing_id', required: false, description: 'ID du listing' })
  @ApiQuery({ name: 'buyer_id', required: false, description: "ID de l'acheteur" })
  @ApiQuery({ name: 'producer_id', required: false, description: 'ID du producteur' })
  @ApiResponse({ status: 200, description: 'Liste des offres.' })
  async findAllOffers(
    @Query('listing_id') listingId?: string,
    @Query('buyer_id') buyerId?: string,
    @Query('producer_id') producerId?: string
  ) {
    return this.marketplaceService.findAllOffers(listingId, buyerId, producerId);
  }

  @Patch('offers/:id/accept')
  @ApiOperation({ summary: 'Accepter une offre (producteur ou acheteur pour contre-proposition)' })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['producer', 'buyer'],
    description: "Rôle de l'utilisateur (défaut: producer)",
  })
  @ApiResponse({ status: 200, description: 'Offre acceptée avec succès.' })
  @ApiResponse({ status: 404, description: 'Offre introuvable.' })
  async acceptOffer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query('role') role: 'producer' | 'buyer' = 'producer'
  ) {
    return this.marketplaceService.acceptOffer(id, userId, role);
  }

  @Patch('offers/:id/counter')
  @ApiOperation({ summary: 'Faire une contre-proposition sur une offre (producteur seulement)' })
  @ApiResponse({ status: 200, description: 'Contre-proposition créée avec succès.' })
  @ApiResponse({ status: 404, description: 'Offre introuvable.' })
  @ApiResponse({ status: 400, description: 'Cette offre ne peut plus être modifiée.' })
  async counterOffer(
    @Param('id') id: string,
    @Body() counterOfferDto: CounterOfferDto,
    @CurrentUser('id') userId: string
  ) {
    return this.marketplaceService.counterOffer(id, userId, counterOfferDto);
  }

  @Patch('offers/:id/reject')
  @ApiOperation({ summary: 'Rejeter une offre' })
  @ApiResponse({ status: 200, description: 'Offre rejetée avec succès.' })
  @ApiResponse({ status: 404, description: 'Offre introuvable.' })
  async rejectOffer(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.marketplaceService.rejectOffer(id, userId);
  }

  // ========================================
  // TRANSACTIONS
  // ========================================

  @Get('transactions')
  @ApiOperation({ summary: 'Récupérer toutes les transactions' })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['buyer', 'producer'],
    description: "Rôle de l'utilisateur",
  })
  @ApiResponse({ status: 200, description: 'Liste des transactions.' })
  async findAllTransactions(
    @CurrentUser('id') userId: string,
    @Query('role') role?: 'buyer' | 'producer'
  ) {
    return this.marketplaceService.findAllTransactions(userId, role);
  }

  @Patch('transactions/:id/confirm-delivery')
  @ApiOperation({ summary: 'Confirmer la livraison' })
  @ApiQuery({
    name: 'role',
    required: true,
    enum: ['buyer', 'producer'],
    description: "Rôle de l'utilisateur",
  })
  @ApiResponse({ status: 200, description: 'Livraison confirmée avec succès.' })
  @ApiResponse({ status: 404, description: 'Transaction introuvable.' })
  async confirmDelivery(
    @Param('id') id: string,
    @Query('role') role: 'buyer' | 'producer',
    @CurrentUser('id') userId: string
  ) {
    return this.marketplaceService.confirmDelivery(id, userId, role);
  }

  // ========================================
  // RATINGS
  // ========================================

  @Post('ratings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle notation' })
  @ApiResponse({ status: 201, description: 'Notation créée avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  async createRating(@Body() createRatingDto: CreateRatingDto, @CurrentUser('id') userId: string) {
    return this.marketplaceService.createRating(createRatingDto, userId);
  }

  @Get('ratings')
  @ApiOperation({ summary: 'Récupérer toutes les notations' })
  @ApiQuery({ name: 'producer_id', required: false, description: 'ID du producteur' })
  @ApiResponse({ status: 200, description: 'Liste des notations.' })
  async findAllRatings(@Query('producer_id') producerId?: string) {
    return this.marketplaceService.findAllRatings(producerId);
  }

  // ========================================
  // NOTIFICATIONS
  // ========================================

  @Get('notifications')
  @ApiOperation({ summary: 'Récupérer toutes les notifications' })
  @ApiResponse({ status: 200, description: 'Liste des notifications.' })
  async findAllNotifications(@CurrentUser('id') userId: string) {
    return this.marketplaceService.findAllNotifications(userId);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiResponse({ status: 200, description: 'Notification marquée comme lue.' })
  @ApiResponse({ status: 404, description: 'Notification introuvable.' })
  async markNotificationAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.marketplaceService.markNotificationAsRead(id, userId);
  }

  // ========================================
  // PURCHASE REQUESTS
  // ========================================

  @Post('purchase-requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle demande d\'achat' })
  @ApiResponse({ status: 201, description: 'Demande d\'achat créée avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  async createPurchaseRequest(
    @Body() createPurchaseRequestDto: CreatePurchaseRequestDto,
    @CurrentUser('id') userId: string
  ) {
    return this.marketplaceService.createPurchaseRequest(createPurchaseRequestDto, userId);
  }

  @Get('purchase-requests')
  @ApiOperation({ summary: 'Récupérer les demandes d\'achat' })
  @ApiQuery({ name: 'buyer_id', required: false, description: 'ID de l\'acheteur' })
  @ApiQuery({ name: 'status', required: false, description: 'Statut de la demande' })
  @ApiResponse({ status: 200, description: 'Liste des demandes d\'achat.' })
  async findAllPurchaseRequests(
    @Query('buyer_id') buyerId: string | undefined,
    @Query('status') status: string | undefined,
    @CurrentUser('id') userId: string
  ) {
    return this.marketplaceService.findAllPurchaseRequests(userId, buyerId, status);
  }

  // IMPORTANT: Les routes spécifiques (/sent, /received) doivent être définies AVANT la route paramétrée (/:id)
  // pour éviter que NestJS ne match "sent" ou "received" comme un :id
  @Get('purchase-requests/sent')
  @ApiOperation({ summary: 'Récupérer les demandes envoyées par l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Liste des demandes envoyées.' })
  async getSentPurchaseRequests(@CurrentUser('id') userId: string) {
    return this.marketplaceService.findSentPurchaseRequests(userId);
  }

  @Get('purchase-requests/received')
  @ApiOperation({ summary: 'Récupérer les demandes reçues par l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Liste des demandes reçues.' })
  async getReceivedPurchaseRequests(@CurrentUser('id') userId: string) {
    return this.marketplaceService.findReceivedPurchaseRequests(userId);
  }

  // Route paramétrée :id doit être APRÈS les routes spécifiques
  @Get('purchase-requests/:id')
  @ApiOperation({ summary: 'Récupérer une demande d\'achat' })
  @ApiResponse({ status: 200, description: 'Demande d\'achat trouvée.' })
  @ApiResponse({ status: 404, description: 'Demande d\'achat introuvable.' })
  async findOnePurchaseRequest(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.marketplaceService.findOnePurchaseRequest(id, userId);
  }

  @Patch('purchase-requests/:id')
  @ApiOperation({ summary: 'Mettre à jour une demande d\'achat' })
  @ApiResponse({ status: 200, description: 'Demande d\'achat mise à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Demande d\'achat introuvable.' })
  async updatePurchaseRequest(
    @Param('id') id: string,
    @Body() updatePurchaseRequestDto: UpdatePurchaseRequestDto,
    @CurrentUser('id') userId: string
  ) {
    return this.marketplaceService.updatePurchaseRequest(id, updatePurchaseRequestDto, userId);
  }

  @Post('purchase-requests/:id/match')
  @ApiOperation({ summary: 'Déclencher le matching automatique pour une demande' })
  @ApiResponse({ status: 200, description: 'Matching effectué avec succès.' })
  @ApiResponse({ status: 404, description: 'Demande introuvable.' })
  async triggerMatching(@Param('id') id: string, @CurrentUser('id') userId: string) {
    // Vérifier que l'utilisateur est le propriétaire de la demande
    const request = await this.marketplaceService.findOnePurchaseRequest(id, userId);
    if (request.buyerId !== userId && (request as any).senderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez déclencher le matching que pour vos propres demandes');
    }
    return this.marketplaceService.findMatchingProducersForRequest(id);
  }

  @Delete('purchase-requests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une demande d\'achat' })
  @ApiResponse({ status: 204, description: 'Demande d\'achat supprimée avec succès.' })
  @ApiResponse({ status: 404, description: 'Demande d\'achat introuvable.' })
  async deletePurchaseRequest(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.marketplaceService.deletePurchaseRequest(id, userId);
  }

  @Patch('purchase-requests/:id/archive')
  @ApiOperation({ summary: 'Archiver une demande d\'achat' })
  @ApiResponse({ status: 200, description: 'Demande d\'achat archivée avec succès.' })
  async archivePurchaseRequest(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.marketplaceService.archivePurchaseRequest(id, userId);
  }

  @Patch('purchase-requests/:id/restore')
  @ApiOperation({ summary: 'Restaurer une demande d\'achat archivée' })
  @ApiResponse({ status: 200, description: 'Demande d\'achat restaurée avec succès.' })
  async restorePurchaseRequest(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.marketplaceService.restorePurchaseRequest(id, userId);
  }

  // ========================================
  // PURCHASE REQUEST OFFERS
  // ========================================

  @Post('purchase-request-offers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une offre sur une demande d\'achat' })
  @ApiResponse({ status: 201, description: 'Offre créée avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  async createPurchaseRequestOffer(
    @Body() createPurchaseRequestOfferDto: CreatePurchaseRequestOfferDto,
    @CurrentUser('id') userId: string
  ) {
    return this.marketplaceService.createPurchaseRequestOffer(createPurchaseRequestOfferDto, userId);
  }

  @Get('purchase-request-offers')
  @ApiOperation({ summary: 'Récupérer les offres sur demandes d\'achat' })
  @ApiQuery({ name: 'purchase_request_id', required: false, description: 'ID de la demande d\'achat' })
  @ApiQuery({ name: 'producer_id', required: false, description: 'ID du producteur' })
  @ApiResponse({ status: 200, description: 'Liste des offres.' })
  async findAllPurchaseRequestOffers(
    @Query('purchase_request_id') purchaseRequestId: string | undefined,
    @Query('producer_id') producerId: string | undefined,
    @CurrentUser('id') userId: string
  ) {
    return this.marketplaceService.findAllPurchaseRequestOffers(purchaseRequestId, producerId);
  }

  @Get('purchase-request-offers/:id')
  @ApiOperation({ summary: 'Récupérer une offre sur demande d\'achat' })
  @ApiResponse({ status: 200, description: 'Offre trouvée.' })
  @ApiResponse({ status: 404, description: 'Offre introuvable.' })
  async findOnePurchaseRequestOffer(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.marketplaceService.findOnePurchaseRequestOffer(id, userId);
  }

  // ========================================
  // PURCHASE REQUEST MATCHES
  // ========================================

  @Get('purchase-request-matches')
  @ApiOperation({ summary: 'Récupérer les matches de demandes d\'achat pour un producteur' })
  @ApiResponse({ status: 200, description: 'Liste des matches.' })
  async findPurchaseRequestMatches(@CurrentUser('id') userId: string) {
    return this.marketplaceService.findPurchaseRequestMatches(userId);
  }

  // ========================================
  // DEBUG ENDPOINTS
  // ========================================

  @Get('debug/test-insert')
  @ApiOperation({ summary: 'Endpoint de test pour diagnostiquer le problème d\'insertion' })
  @ApiResponse({ status: 200, description: 'Résultat du test d\'insertion.' })
  async testInsert() {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.log(`[TEST] Début test insertion avec ID: ${testId}`);
    
    // Test 1: INSERT direct sans transaction
    try {
      const directInsert = await this.databaseService.query(
        `INSERT INTO marketplace_listings (
          id, listing_type, subject_id, producer_id, farm_id,
          price_per_kg, calculated_price, weight, status, listed_at, updated_at,
          last_weight_date, location_latitude, location_longitude, location_address,
          location_city, location_region, sale_terms, views, inquiries,
          date_creation, derniere_modification
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *`,
        [
          testId,
          'individual',
          'test_subject',
          'user_1767600180501_h6go0mq84',
          'projet_1767633845447_4ynljhhok',
          2000,
          42000,
          21,
          'available',
          new Date().toISOString(),
          new Date().toISOString(),
          new Date().toISOString(),
          0.0, // latitude
          0.0, // longitude
          'Test Address',
          'Test City',
          'Test Region',
          JSON.stringify({ transport: 'buyer_responsibility' }),
          0, // views
          0, // inquiries
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
      
      this.logger.log(`[TEST] INSERT direct réussi:`, {
        id: directInsert.rows[0]?.id,
        farm_id: directInsert.rows[0]?.farm_id,
        producer_id: directInsert.rows[0]?.producer_id,
        status: directInsert.rows[0]?.status,
      });
      
      // Vérification immédiate
      const check1 = await this.databaseService.query(
        'SELECT id, farm_id, producer_id, status FROM marketplace_listings WHERE id = $1',
        [testId]
      );
      
      this.logger.log(`[TEST] Vérification immédiate (après INSERT):`, {
        found: check1.rows.length > 0,
        listing: check1.rows[0] || null,
      });
      
      // Attendre 1 seconde
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérification après 1 seconde
      const check2 = await this.databaseService.query(
        'SELECT id, farm_id, producer_id, status FROM marketplace_listings WHERE id = $1',
        [testId]
      );
      
      this.logger.log(`[TEST] Vérification après 1s:`, {
        found: check2.rows.length > 0,
        listing: check2.rows[0] || null,
      });
      
      // Compter tous les listings
      const count = await this.databaseService.query(
        'SELECT COUNT(*) as total FROM marketplace_listings WHERE status != $1',
        ['removed']
      );
      
      this.logger.log(`[TEST] Total listings dans la base: ${count.rows[0]?.total || 0}`);
      
      // Lister tous les IDs
      const allIds = await this.databaseService.query(
        'SELECT id, farm_id, producer_id, status, listed_at FROM marketplace_listings WHERE status != $1 ORDER BY listed_at DESC LIMIT 5',
        ['removed']
      );
      
      this.logger.log(`[TEST] 5 derniers listings:`, allIds.rows);
      
      // Vérifier spécifiquement les listings du projet
      const projectListings = await this.databaseService.query(
        `SELECT id, farm_id, producer_id, status 
         FROM marketplace_listings 
         WHERE CAST(farm_id AS TEXT) = CAST($1 AS TEXT) AND status != $2`,
        ['projet_1767633845447_4ynljhhok', 'removed']
      );
      
      this.logger.log(`[TEST] Listings du projet projet_1767633845447_4ynljhhok:`, projectListings.rows);
      
      return {
        success: true,
        testId,
        immediateCheck: check1.rows[0] || null,
        delayedCheck: check2.rows[0] || null,
        totalListings: count.rows[0]?.total || 0,
        recentListings: allIds.rows,
        projectListings: projectListings.rows,
      };
      
    } catch (error: any) {
      this.logger.error(`[TEST] Erreur:`, {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        detail: error?.detail,
      });
      return {
        success: false,
        error: error?.message || 'Erreur inconnue',
        stack: error?.stack,
        code: error?.code,
        detail: error?.detail,
      };
    }
  }
}
