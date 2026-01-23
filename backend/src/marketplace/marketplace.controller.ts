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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Request,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
import { GetListingsDetailsDto } from './dto/get-listings-details.dto';
// NOTE: CreateInquiryDto, UpdateInquiryDto obsolètes - les offres utilisent marketplace_offers
import { UploadPhotoDto } from './dto/listing-photo.dto';
import { CreateNotificationDto, MarkAsReadDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';
import { AutoSaleService, CreateAutoSaleSettingsDto } from './auto-sale.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// ✅ Fonction HORS de la classe (avant le @Controller)
function getMulterOptions() {
  return {
    storage: diskStorage({
      destination: './uploads/marketplace',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `listing-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return callback(new Error('Seules les images sont autorisées'), false);
      }
      callback(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  };
}

@ApiTags('marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('marketplace')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly marketplaceUnifiedService: MarketplaceUnifiedService,
    private readonly notificationsService: NotificationsService,
    private readonly autoSaleService: AutoSaleService,
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
  @ApiQuery({ name: 'user_id', required: false, description: "ID de l'utilisateur (producteur) - pour filtrer les listings d'un utilisateur spécifique (ex: 'Mes annonces')" })
  @ApiQuery({
    name: 'exclude_own_listings',
    required: false,
    description: 'Exclure les listings de l\'utilisateur connecté (true/false) - pour l\'onglet "Acheter"',
    type: Boolean,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Nombre maximum de résultats (défaut: 20, max: 500)',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Nombre d\'éléments à ignorer pour la pagination',
    type: Number,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Option de tri : "newest" (par défaut, priorise les nouveaux), "oldest", "price_asc", "price_desc"',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Liste des annonces avec pagination.' })
  async findAllListings(
    @Query('projet_id') projetId?: string,
    @Query('user_id') userId?: string,
    @Query('exclude_own_listings') excludeOwnListings?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sort') sort?: string,
    @CurrentUser('id') currentUserId?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    const excludeOwn = excludeOwnListings === 'true' || excludeOwnListings === '1';
    
    // Logique : 
    // - Si exclude_own_listings=true : exclure les listings de l'utilisateur connecté (pour "Acheter")
    // - Si user_id est fourni (sans exclude_own_listings) : filtrer pour n'afficher que cet utilisateur (pour "Mes annonces")
    // Ces deux cas sont mutuellement exclusifs
    
    const userIdToExclude = excludeOwn && currentUserId ? currentUserId : undefined;
    const userIdToInclude = !excludeOwn && userId ? userId : undefined;
    
    return this.marketplaceService.findAllListings(
      projetId,
      userIdToInclude, // Filtrer pour inclure uniquement cet utilisateur (si fourni)
      limitNum,
      offsetNum,
      userIdToExclude, // Exclure les listings de cet utilisateur (si exclude_own_listings=true)
      sort
    );
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Récupérer une annonce par son ID' })
  @ApiResponse({ status: 200, description: "Détails de l'annonce." })
  @ApiResponse({ status: 404, description: 'Annonce introuvable.' })
  async findOneListing(@Param('id') id: string) {
    return this.marketplaceService.findOneListing(id);
  }

  @Get('listings/subject/:subjectId')
  @ApiOperation({ 
    summary: 'Récupérer le listing actif d\'un sujet',
    description: 'Retourne le listing actif (available ou reserved) pour un sujet donné. Retourne 404 si aucun listing actif.'
  })
  @ApiResponse({ status: 200, description: 'Listing actif du sujet.' })
  @ApiResponse({ status: 404, description: 'Aucun listing actif pour ce sujet.' })
  async findListingBySubject(@Param('subjectId') subjectId: string) {
    return this.marketplaceService.findActiveListingBySubject(subjectId);
  }

  @Get('animals/:animalId')
  @ApiOperation({ 
    summary: 'Récupérer les informations publiques d\'un animal listé sur le marketplace',
    description: 'Permet aux acheteurs de voir les informations des animaux mis en vente par d\'autres producteurs. Ne vérifie pas l\'appartenance.'
  })
  @ApiResponse({ status: 200, description: "Informations de l'animal." })
  @ApiResponse({ status: 404, description: 'Animal non trouvé ou non listé sur le marketplace.' })
  async getMarketplaceAnimalInfo(@Param('animalId') animalId: string) {
    return this.marketplaceService.getMarketplaceAnimalInfo(animalId);
  }

  @Get('listings/:listingId/subjects')
  @ApiOperation({
    summary: 'Récupérer les sujets d\'un listing avec leurs détails',
    description: 'Permet aux acheteurs de voir les sujets d\'un listing avec toutes les informations publiques disponibles.'
  })
  @ApiResponse({ status: 200, description: "Listing avec ses sujets." })
  @ApiResponse({ status: 404, description: 'Listing non trouvé.' })
  async getListingSubjects(@Param('listingId') listingId: string) {
    try {
      console.log('[Controller] getListingSubjects pour listing:', listingId);
      const result = await this.marketplaceService.getListingSubjects(listingId);
      console.log('[Controller] Sujets retournés:', result?.subjects?.length || 0);
      return result;
    } catch (error) {
      console.error('[Controller] Erreur getListingSubjects:', error);
      throw error;
    }
  }

  @Post('listings/details')
  @ApiOperation({ 
    summary: 'Récupérer plusieurs listings avec leurs sujets',
    description: 'Endpoint batch pour récupérer plusieurs listings avec leurs sujets en une seule requête. Maximum 50 listings par requête.'
  })
  @ApiResponse({ status: 200, description: "Liste des listings avec leurs sujets." })
  @ApiResponse({ status: 400, description: 'Données invalides (validation DTO).' })
  async getMultipleListingsDetails(@Body() dto: GetListingsDetailsDto) {
    return this.marketplaceService.getListingsWithSubjects(dto.listingIds);
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
  @ApiResponse({ status: 403, description: 'Non autorisé.' })
  @ApiResponse({ status: 400, description: 'Impossible de supprimer (offres en attente).' })
  async deleteListing(@Param('id') id: string, @CurrentUser('id') userId: string) {
    try {
      this.logger.debug(`[deleteListing] Tentative de suppression du listing ${id} par l'utilisateur ${userId}`);
      await this.marketplaceUnifiedService.deleteUnifiedListing(id, userId);
      this.logger.debug(`[deleteListing] Listing ${id} supprimé avec succès`);
    } catch (error: any) {
      this.logger.error(`[deleteListing] Erreur lors de la suppression du listing ${id}:`, {
        message: error?.message,
        stack: error?.stack?.substring(0, 500),
        userId,
        listingId: id,
        errorName: error?.constructor?.name,
      });
      throw error; // Re-throw pour que NestJS gère la réponse HTTP appropriée
    }
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
    // 1. Créer l'offre
    const offer = await this.marketplaceService.createOffer(createOfferDto, userId);
    
    // 2. Déclencher le traitement automatique si le vendeur a activé la gestion auto
    try {
      const autoSaleResult = await this.autoSaleService.processOffer(offer.id);
      this.logger.log(`[AutoSale] Offre ${offer.id} traitée automatiquement: ${autoSaleResult.action}`);
      
      // Enrichir la réponse avec le résultat du traitement auto
      return {
        ...offer,
        autoSaleResult: {
          action: autoSaleResult.action,
          message: autoSaleResult.message,
          pendingDecisionId: autoSaleResult.pendingDecisionId,
        },
      };
    } catch (autoSaleError) {
      // Si pas de settings auto-sale ou erreur, retourner l'offre normalement
      this.logger.debug(`[AutoSale] Pas de traitement auto pour offre ${offer.id}: ${autoSaleError.message}`);
      return offer;
    }
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
  @ApiOperation({ 
    summary: 'Rejeter une offre',
    description: `
      - Producteur peut rejeter une offre 'pending'
      - Acheteur peut rejeter une contre-proposition 'countered' en passant role=buyer
    `
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['producer', 'buyer'],
    description: "Rôle de l'utilisateur (défaut: producer). Utiliser 'buyer' pour rejeter une contre-proposition.",
  })
  @ApiResponse({ status: 200, description: 'Offre rejetée avec succès.' })
  @ApiResponse({ status: 404, description: 'Offre introuvable.' })
  @ApiResponse({ status: 400, description: 'Offre ne peut plus être rejetée.' })
  async rejectOffer(
    @Param('id') id: string, 
    @CurrentUser('id') userId: string,
    @Query('role') role: 'producer' | 'buyer' = 'producer'
  ) {
    return this.marketplaceService.rejectOffer(id, userId, role);
  }

  // ========================================
  // MES OFFRES (Acheteur/Vendeur)
  // ========================================

  @Get('my-offers')
  @ApiOperation({ 
    summary: 'Récupérer mes offres envoyées (acheteur)',
    description: 'Retourne toutes les offres créées par l\'utilisateur connecté'
  })
  @ApiResponse({ status: 200, description: 'Liste de mes offres.' })
  async getMyOffers(@CurrentUser('id') userId: string) {
    try {
      const result = await this.marketplaceService.getBuyerInquiries(userId);
      return result || [];
    } catch (error) {
      throw error;
    }
  }

  @Get('my-received-offers')
  @ApiOperation({
    summary: 'Récupérer les offres reçues (vendeur)',
    description: 'Retourne toutes les offres reçues par l\'utilisateur connecté (producteur)'
  })
  @ApiResponse({ status: 200, description: 'Liste des offres reçues.' })
  async getReceivedOffers(@CurrentUser('id') userId: string) {
    try {
      console.log('[Controller] my-received-offers pour user:', userId);
      const offers = await this.marketplaceService.getSellerInquiries(userId);
      console.log('[Controller] Offres reçues retournées:', offers?.length || 0);
      return offers || [];
    } catch (error) {
      console.error('[Controller] Erreur critique getReceivedOffers:', error);
      // Retourner tableau vide au lieu de 500 pour éviter le crash
      return [];
    }
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

  @Patch('purchase-request-offers/:id')
  @ApiOperation({ 
    summary: 'Mettre à jour le statut d\'une offre sur demande d\'achat',
    description: 'Permet d\'accepter, rejeter ou retirer une offre sur une demande d\'achat'
  })
  @ApiResponse({ status: 200, description: 'Offre mise à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Offre introuvable.' })
  @ApiResponse({ status: 403, description: 'Non autorisé à modifier cette offre.' })
  async updatePurchaseRequestOffer(
    @Param('id') id: string,
    @Body() updateDto: { status: string },
    @CurrentUser('id') userId: string
  ) {
    return this.marketplaceService.updatePurchaseRequestOfferStatus(id, updateDto.status, userId);
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
  // PHOTOS DES LISTINGS
  // ========================================

  @Post('listings/:listingId/photos')
  @UseInterceptors(FileInterceptor('photo', getMulterOptions()))
  @ApiOperation({ 
    summary: 'Uploader une photo pour un listing',
    description: 'Ajoute une photo à un listing. L\'utilisateur doit être propriétaire du listing.'
  })
  @ApiResponse({ status: 201, description: 'Photo uploadée avec succès.' })
  @ApiResponse({ status: 403, description: 'Non autorisé. Seul le propriétaire peut ajouter des photos.' })
  @ApiResponse({ status: 404, description: 'Listing non trouvé.' })
  async uploadListingPhoto(
    @Param('listingId') listingId: string,
    @UploadedFile() file: { fieldname: string; originalname: string; encoding: string; mimetype: string; size: number; buffer?: Buffer; path?: string; filename?: string },
    @Body() dto: UploadPhotoDto,
    @CurrentUser('id') userId: string
  ) {
    if (!file) {
      throw new ForbiddenException('Aucun fichier fourni');
    }
    return this.marketplaceService.addPhotoToListing(
      listingId,
      file,
      dto.caption,
      userId
    );
  }

  @Post('listings/:listingId/photos/bulk')
  @UseInterceptors(FilesInterceptor('photos', 10, getMulterOptions()))
  @ApiOperation({ 
    summary: 'Uploader plusieurs photos pour un listing',
    description: 'Ajoute plusieurs photos (max 10) à un listing en une seule requête.'
  })
  @ApiResponse({ status: 201, description: 'Photos uploadées avec succès.' })
  async uploadMultiplePhotos(
    @Param('listingId') listingId: string,
    @UploadedFiles() files: Array<{ fieldname: string; originalname: string; encoding: string; mimetype: string; size: number; buffer?: Buffer; path?: string; filename?: string }>,
    @CurrentUser('id') userId: string
  ) {
    if (!files || files.length === 0) {
      throw new ForbiddenException('Aucun fichier fourni');
    }
    return this.marketplaceService.addMultiplePhotos(
      listingId,
      files,
      userId
    );
  }

  @Delete('listings/:listingId/photos/:photoIndex')
  @ApiOperation({ 
    summary: 'Supprimer une photo d\'un listing',
    description: 'Supprime une photo par son index dans le tableau photos.'
  })
  @ApiResponse({ status: 200, description: 'Photo supprimée avec succès.' })
  @ApiResponse({ status: 403, description: 'Non autorisé.' })
  @ApiResponse({ status: 404, description: 'Listing ou photo non trouvé(e).' })
  async deleteListingPhoto(
    @Param('listingId') listingId: string,
    @Param('photoIndex') photoIndex: string,
    @CurrentUser('id') userId: string
  ) {
    const index = parseInt(photoIndex, 10);
    if (isNaN(index)) {
      throw new ForbiddenException('Index de photo invalide');
    }
    return this.marketplaceService.deletePhoto(
      listingId,
      index,
      userId
    );
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
         WHERE farm_id = $1 AND status != $2`,
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

  // ========================================
  // OFFERS MANAGEMENT
  // ========================================

  @Get('offers/:offerId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Récupérer une offre par ID',
    description: 'Permet de récupérer les détails d\'une offre spécifique'
  })
  @ApiResponse({ status: 200, description: 'Détails de l\'offre.' })
  @ApiResponse({ status: 404, description: 'Offre non trouvée.' })
  async getOfferById(
    @Param('offerId') offerId: string,
    @CurrentUser('id') userId: string
  ) {
    return await this.marketplaceService.getOfferById(offerId, userId);
  }

  @Delete('offers/:offerId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Retirer/annuler une offre',
    description: 'Permet à un acheteur de retirer une offre en attente'
  })
  @ApiResponse({ status: 200, description: 'Offre retirée avec succès.' })
  @ApiResponse({ status: 404, description: 'Offre non trouvée.' })
  @ApiResponse({ status: 403, description: 'Non autorisé à retirer cette offre.' })
  async withdrawOffer(
    @Param('offerId') offerId: string,
    @CurrentUser('id') userId: string
  ) {
    return await this.marketplaceService.withdrawOffer(offerId, userId);
  }

  // ========================================
  // PRICE TRENDS - Tendances de prix hebdomadaires
  // ========================================

  @Get('price-trends')
  @ApiOperation({
    summary: 'Récupérer les tendances de prix hebdomadaires',
    description: 'Retourne l\'historique des prix moyens du porc poids vif par semaine, calculés depuis les listings du marketplace'
  })
  @ApiQuery({ name: 'weeks', required: false, description: 'Nombre de semaines à récupérer (défaut: 27)' })
  @ApiResponse({ status: 200, description: 'Liste des tendances de prix.' })
  async getPriceTrends(
    @Query('weeks') weeks?: string
  ) {
    const weeksCount = weeks ? parseInt(weeks, 10) : 27;
    return this.marketplaceService.getPriceTrends(weeksCount);
  }

  @Post('price-trends')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer ou mettre à jour une tendance de prix',
    description: 'Enregistre une nouvelle tendance de prix hebdomadaire'
  })
  @ApiResponse({ status: 201, description: 'Tendance créée/mise à jour.' })
  async createPriceTrend(@Body() trendData: any) {
    return this.marketplaceService.upsertPriceTrend(trendData);
  }

  @Post('price-trends/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recalculer les tendances de prix',
    description: 'Force le recalcul des tendances de prix pour les dernières semaines'
  })
  @ApiQuery({ name: 'weeks', required: false, description: 'Nombre de semaines à recalculer (défaut: 4)' })
  @ApiResponse({ status: 200, description: 'Tendances recalculées.' })
  async calculatePriceTrends(
    @Query('weeks') weeks?: string
  ) {
    const weeksCount = weeks ? parseInt(weeks, 10) : 4;
    return this.marketplaceService.calculatePriceTrends(weeksCount);
  }

  // ========================================
  // NOTIFICATIONS
  // ========================================

  @Post('notifications')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 créations par minute max
  @ApiOperation({
    summary: 'Créer une notification manuellement',
    description: 'Endpoint pour créer une notification (principalement pour les tests)'
  })
  @ApiResponse({ status: 201, description: 'Notification créée avec succès.' })
  async createNotification(
    @Body() dto: CreateNotificationDto,
    @Request() req
  ) {
    return await this.notificationsService.createNotification(dto);
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requêtes par minute max
  @ApiOperation({
    summary: 'Récupérer les notifications de l\'utilisateur',
    description: 'Retourne toutes les notifications ou seulement les non lues'
  })
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    type: Boolean,
    description: 'Ne retourner que les notifications non lues'
  })
  @ApiResponse({ status: 200, description: 'Liste des notifications.' })
  async getNotifications(
    @Request() req,
    @Query('unreadOnly') unreadOnly?: string
  ) {
    return await this.notificationsService.getUserNotifications(
      req.user.id,
      unreadOnly === 'true'
    );
  }

  @Get('notifications/unread-count')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requêtes par minute max (utilisé pour polling)
  @ApiOperation({
    summary: 'Obtenir le nombre de notifications non lues',
    description: 'Retourne le compteur de notifications non lues pour l\'utilisateur'
  })
  @ApiResponse({ status: 200, description: 'Nombre de notifications non lues.' })
  async getUnreadCount(@Request() req) {
    return await this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch('notifications/mark-read')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 mises à jour par minute max
  @ApiOperation({
    summary: 'Marquer des notifications comme lues',
    description: 'Marque une ou plusieurs notifications comme lues'
  })
  @ApiResponse({ status: 200, description: 'Notifications marquées comme lues.' })
  async markAsRead(
    @Body() dto: MarkAsReadDto,
    @Request() req
  ) {
    return await this.notificationsService.markAsRead(
      dto.notificationIds,
      req.user.id
    );
  }

  @Patch('notifications/mark-all-read')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 opérations par minute max
  @ApiOperation({
    summary: 'Marquer toutes les notifications comme lues',
    description: 'Marque toutes les notifications non lues de l\'utilisateur comme lues'
  })
  @ApiResponse({ status: 200, description: 'Toutes les notifications marquées comme lues.' })
  async markAllAsRead(@Request() req) {
    return await this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete('notifications/:notificationId')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 suppressions par minute max
  @ApiOperation({
    summary: 'Supprimer une notification',
    description: 'Supprime une notification spécifique'
  })
  @ApiResponse({ status: 200, description: 'Notification supprimée avec succès.' })
  @ApiResponse({ status: 404, description: 'Notification non trouvée.' })
  async deleteNotification(
    @Param('notificationId') notificationId: string,
    @Request() req
  ) {
    return await this.notificationsService.deleteNotification(
      notificationId,
      req.user.id
    );
  }

  // ============================================
  // VENTE AUTOMATIQUE - Gérée par Kouakou
  // ============================================

  @Post('auto-sale-settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Créer/Mettre à jour les paramètres de vente automatique',
    description: 'Configure la gestion automatique des offres par Kouakou pour une annonce'
  })
  @ApiResponse({ status: 201, description: 'Paramètres enregistrés avec succès.' })
  async createAutoSaleSettings(
    @Body() dto: CreateAutoSaleSettingsDto,
    @CurrentUser('id') userId: string
  ) {
    this.logger.log(`[AutoSale] Création settings pour listing ${dto.listingId} par user ${userId}`);
    return await this.autoSaleService.upsertSettings(dto);
  }

  @Get('auto-sale-settings/:listingId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Récupérer les paramètres de vente automatique',
    description: 'Récupère la configuration de gestion automatique pour une annonce'
  })
  @ApiResponse({ status: 200, description: 'Paramètres récupérés.' })
  async getAutoSaleSettings(
    @Param('listingId') listingId: string,
    @CurrentUser('id') userId: string
  ) {
    return await this.autoSaleService.getSettings(listingId);
  }

  @Post('auto-sale/process-offer/:offerId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Traiter une offre avec la logique automatique',
    description: 'Déclenche le traitement automatique d\'une offre (acceptation/refus/confirmation)'
  })
  @ApiResponse({ status: 200, description: 'Offre traitée.' })
  async processOfferAutomatically(
    @Param('offerId') offerId: string,
    @CurrentUser('id') userId: string
  ) {
    this.logger.log(`[AutoSale] Traitement offre ${offerId} par user ${userId}`);
    return await this.autoSaleService.processOffer(offerId);
  }

  @Get('pending-decisions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Récupérer les décisions en attente',
    description: 'Liste les offres nécessitant une confirmation de l\'utilisateur'
  })
  @ApiResponse({ status: 200, description: 'Décisions en attente.' })
  async getPendingDecisions(@CurrentUser('id') userId: string) {
    return await this.autoSaleService.getPendingDecisions(userId);
  }

  @Post('pending-decisions/:decisionId/respond')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Répondre à une décision en attente',
    description: 'Accepter, refuser ou contre-proposer sur une offre en attente de confirmation'
  })
  @ApiResponse({ status: 200, description: 'Décision traitée.' })
  async respondToPendingDecision(
    @Param('decisionId') decisionId: string,
    @Body() body: { response: 'accept' | 'reject' | 'counter'; counterPrice?: number },
    @CurrentUser('id') userId: string
  ) {
    this.logger.log(`[AutoSale] Réponse décision ${decisionId}: ${body.response} par user ${userId}`);
    await this.autoSaleService.respondToPendingDecision(
      decisionId,
      userId,
      body.response,
      body.counterPrice
    );
    return { success: true, message: 'Décision traitée avec succès' };
  }
}
