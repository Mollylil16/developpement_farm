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
  UnauthorizedException,
  Headers,
  BadRequestException,
  ConflictException,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiHeader, ApiBody } from '@nestjs/swagger';
import { CollaborationsService, Collaborateur, FindAllOptions } from './collaborations.service';
import { CreateCollaborateurDto } from './dto/create-collaborateur.dto';
import { UpdateCollaborateurDto } from './dto/update-collaborateur.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QRCodeService } from '../common/services/qrcode.service';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { RateLimitInterceptor } from '../common/interceptors/rate-limit.interceptor';
import { DatabaseService } from '../database/database.service';

@ApiTags('collaborations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('collaborations')
export class CollaborationsController {
  constructor(
    private readonly collaborationsService: CollaborationsService,
    private readonly qrCodeService: QRCodeService,
    private readonly databaseService: DatabaseService
  ) {}

  @Post()
  @UseInterceptors(RateLimitInterceptor)
  @RateLimit({ maxRequests: 30, windowMs: 3600000 }) // 30 créations par heure
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un nouveau collaborateur' })
  @ApiResponse({ status: 201, description: 'Collaborateur créé avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 403, description: "Vous n'êtes pas propriétaire de ce projet." })
  @ApiResponse({ status: 429, description: 'Trop de requêtes. Limite de 30 créations par heure.' })
  async create(
    @Body() createCollaborateurDto: CreateCollaborateurDto,
    @CurrentUser('id') userId: string,
    @Req() req: ExpressRequest
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.collaborationsService.create(createCollaborateurDto, userId, ipAddress, userAgent);
  }

  @Post('validate-qr')
  @UseInterceptors(RateLimitInterceptor)
  @RateLimit({ maxRequests: 20, windowMs: 3600000 }) // 20 validations par heure
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Valider un QR code et récupérer les infos du collaborateur',
    description: 'Valide un QR code scanné (basé sur userId ou profileId), vérifie que l\'utilisateur peut être ajouté au projet, et retourne ses informations. Ne crée pas encore la collaboration. Supporte les QR codes basés sur userId (anciens) et profileId (nouveaux pour vétérinaire/technicien).'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['qr_data', 'projet_id'],
      properties: {
        qr_data: {
          type: 'string',
          description: 'Données du QR code (base64 ou data URL)',
          example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        },
        projet_id: {
          type: 'string',
          description: 'ID du projet où ajouter le collaborateur',
        },
      },
    },
  })
  @ApiResponse({ 
    status: 200, 
    description: 'QR code valide, informations utilisateur retournées.',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', nullable: true },
        profileId: { type: 'string', nullable: true },
        profileType: { type: 'string', nullable: true, enum: ['veterinarian', 'technician'] },
        nom: { type: 'string' },
        prenom: { type: 'string' },
        email: { type: 'string', nullable: true },
        telephone: { type: 'string', nullable: true },
        photo: { type: 'string', nullable: true },
        canBeAdded: { type: 'boolean' },
        reason: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'QR code invalide, expiré ou déjà utilisé.' })
  @ApiResponse({ status: 403, description: "Vous n'êtes pas propriétaire de ce projet ou le profil scanné n'est pas compatible." })
  @ApiResponse({ status: 409, description: 'Cet utilisateur/profil est déjà collaborateur sur ce projet.' })
  @ApiResponse({ status: 429, description: 'Trop de requêtes. Limite: 20 validations par heure.' })
  async validateQR(
    @Body() body: { qr_data: string; projet_id: string },
    @CurrentUser('id') userId: string
  ) {
    // Vérifier que le projet appartient à l'utilisateur connecté
    const projetResult = await this.databaseService.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [body.projet_id]
    );
    if (projetResult.rows.length === 0) {
      throw new BadRequestException('Projet introuvable');
    }
    if (projetResult.rows[0].proprietaire_id !== userId) {
      throw new UnauthorizedException('Ce projet ne vous appartient pas');
    }

    // Essayer de décoder comme QR code de profil (nouveau format)
    let scannedProfileId: string | null = null;
    let scannedProfileType: string | null = null;
    let scannedUserId: string | null = null;

    try {
      const profileData = await this.qrCodeService.decodeProfileQRData(body.qr_data);
      scannedProfileId = profileData.profileId;
      scannedProfileType = profileData.profileType;

      // Vérifier que le profil est bien vétérinaire ou technicien
      if (scannedProfileType !== 'veterinarian' && scannedProfileType !== 'technician') {
        throw new BadRequestException('Seuls les profils vétérinaire et technicien peuvent être ajoutés via QR code');
      }

      // Extraire userId depuis profileId (format: profile_${userId}_${role})
      const profileIdMatch = scannedProfileId.match(/^profile_(.+)_(veterinarian|technician)$/);
      if (!profileIdMatch) {
        throw new BadRequestException('Format de profileId invalide');
      }
      scannedUserId = profileIdMatch[1];

      // Vérifier que ce profil n'est pas déjà collaborateur sur ce projet
      const existingResult = await this.databaseService.query(
        `SELECT id, statut FROM collaborations 
         WHERE projet_id = $1 AND profile_id = $2 AND statut IN ('actif', 'en_attente')`,
        [body.projet_id, scannedProfileId]
      );

      if (existingResult.rows.length > 0) {
        throw new ConflictException('Ce profil est déjà collaborateur sur ce projet');
      }
    } catch (error) {
      // Si ce n'est pas un QR code de profil, essayer comme QR code utilisateur (ancien format)
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        try {
          const userData = await this.qrCodeService.decodeQRData(body.qr_data);
          scannedUserId = userData.userId;

          // Vérifier que l'utilisateur scanné n'est pas déjà collaborateur
          const existingResult = await this.databaseService.query(
            `SELECT id, statut FROM collaborations 
             WHERE projet_id = $1 AND user_id = $2 AND statut IN ('actif', 'en_attente')`,
            [body.projet_id, scannedUserId]
          );

          if (existingResult.rows.length > 0) {
            throw new ConflictException('Cet utilisateur est déjà collaborateur sur ce projet');
          }
        } catch (userError) {
          // Si les deux échouent, propager l'erreur originale
          throw error;
        }
      } else {
        throw error;
      }
    }

    // Récupérer les infos complètes de l'utilisateur scanné
    const userResult = await this.databaseService.query(
      `SELECT id, nom, prenom, email, telephone, photo FROM users WHERE id = $1`,
      [scannedUserId]
    );

    if (userResult.rows.length === 0) {
      throw new BadRequestException('Utilisateur scanné introuvable');
    }

    const user = userResult.rows[0];

    return {
      userId: scannedUserId,
      profileId: scannedProfileId || null,
      profileType: scannedProfileType || null,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email || null,
      telephone: user.telephone || null,
      photo: user.photo || null,
      canBeAdded: true,
    };
  }

  @Post('from-qr')
  @UseInterceptors(RateLimitInterceptor)
  @RateLimit({ maxRequests: 10, windowMs: 3600000 }) // 10 créations par heure
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Créer une invitation via QR scan',
    description: 'Crée une invitation en attente (statut "en_attente") après scan d\'un QR code. Le collaborateur doit accepter l\'invitation pour devenir actif. Supporte les QR codes basés sur userId (anciens) et profileId (nouveaux pour vétérinaire/technicien). Les permissions sont obligatoires. Toutes les validations de sécurité sont appliquées.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['scanned_user_id', 'projet_id', 'role', 'permissions'],
      properties: {
        scanned_user_id: {
          type: 'string',
          description: 'ID de l\'utilisateur scanné (depuis validate-qr)',
        },
        profile_id: {
          type: 'string',
          nullable: true,
          description: 'ID du profil scanné (depuis validate-qr, pour QR codes de profil)',
        },
        profile_type: {
          type: 'string',
          nullable: true,
          enum: ['veterinarian', 'technician'],
          description: 'Type de profil scanné (depuis validate-qr, pour QR codes de profil)',
        },
        projet_id: {
          type: 'string',
          description: 'ID du projet',
        },
          role: {
            type: 'string',
            nullable: true,
            enum: ['proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur'],
            description: 'Rôle du collaborateur. Si profile_type est fourni, peut être omis (sera auto-mappé: veterinarian → veterinaire, technician → ouvrier).',
          },
        permissions: {
          type: 'object',
          required: ['reproduction', 'nutrition', 'finance', 'rapports', 'planification', 'mortalites', 'sante'],
          description: 'Permissions du collaborateur (OBLIGATOIRE pour invitations QR)',
          properties: {
            reproduction: { type: 'boolean' },
            nutrition: { type: 'boolean' },
            finance: { type: 'boolean' },
            rapports: { type: 'boolean' },
            planification: { type: 'boolean' },
            mortalites: { type: 'boolean' },
            sante: { type: 'boolean' },
          },
        },
        notes: {
          type: 'string',
          nullable: true,
          description: 'Notes optionnelles',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Invitation créée avec succès depuis le QR code. En attente d\'acceptation du collaborateur.' })
  @ApiResponse({ status: 400, description: 'Données invalides ou auto-invitation.' })
  @ApiResponse({ status: 403, description: "Vous n'êtes pas propriétaire de ce projet." })
  @ApiResponse({ status: 404, description: 'Utilisateur scanné introuvable.' })
  @ApiResponse({ status: 409, description: 'Collaborateur déjà existant sur ce projet.' })
  @ApiResponse({ status: 429, description: 'Trop de requêtes. Limite: 10 créations par heure.' })
  async createFromQRScan(
    @Body() body: {
      scanned_user_id: string;
      profile_id?: string;
      profile_type?: string;
      projet_id: string;
      role: string;
      permissions: {
        reproduction: boolean;
        nutrition: boolean;
        finance: boolean;
        rapports: boolean;
        planification: boolean;
        mortalites: boolean;
        sante: boolean;
      };
      notes?: string;
    },
    @CurrentUser('id') userId: string,
    @Req() req: ExpressRequest
  ) {
    // Validation: permissions obligatoires pour invitations QR
    if (!body.permissions || Object.keys(body.permissions).length === 0) {
      throw new BadRequestException('Les permissions sont obligatoires pour créer une invitation via QR code');
    }

    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.collaborationsService.createFromQRScan(
      body.scanned_user_id,
      body.projet_id,
      body.role,
      body.permissions,
      userId,
      ipAddress,
      userAgent,
      body.profile_id,
      body.profile_type
    );
  }

  // Routes spécifiques AVANT les routes avec paramètres dynamiques
  // L'ordre est important dans NestJS : les routes spécifiques doivent être définies en premier

  @Get('actuel')
  @ApiOperation({ summary: 'Récupérer le collaborateur actuel pour un projet' })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Collaborateur actuel.' })
  @ApiResponse({ status: 404, description: 'Aucun collaborateur actif trouvé.' })
  async findCollaborateurActuel(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.collaborationsService.findCollaborateurActuel(userId, projetId);
  }

  @Get('invitations')
  @ApiOperation({ summary: "Récupérer les invitations en attente pour l'utilisateur" })
  @ApiQuery({ name: 'email', required: false, description: "Email de l'utilisateur" })
  @ApiQuery({ name: 'telephone', required: false, description: "Téléphone de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Liste des invitations en attente.' })
  async findInvitationsEnAttente(
    @CurrentUser('id') userId: string,
    @Query('email') email?: string,
    @Query('telephone') telephone?: string,
    @Req() req?: ExpressRequest
  ) {
    try {
      const ipAddress = req?.ip || req?.connection?.remoteAddress;
      const userAgent = req?.get('user-agent');
      
      // Récupérer active_role depuis la base de données (pas du JWT qui ne le contient pas)
      const userResult = await this.databaseService.query(
        `SELECT active_role FROM users WHERE id = $1`,
        [userId]
      );
      const activeRole = userResult.rows[0]?.active_role;
      const profileId = activeRole && activeRole !== 'producer' ? `profile_${userId}_${activeRole}` : undefined;

      return await this.collaborationsService.findInvitationsEnAttente(
        userId,
        email,
        telephone,
        profileId,
        ipAddress,
        userAgent
      );
    } catch (error: unknown) {
      console.error('[CollaborationsController] Erreur dans findInvitationsEnAttente:', error);
      throw error;
    }
  }

  @Get('mes-projets')
  @ApiOperation({ 
    summary: "Récupérer les projets accessibles via collaborations actives (pour vétérinaires/techniciens)",
    description: "Retourne la liste des collaborations actives de l'utilisateur, représentant les projets des producteurs auxquels il a accès"
  })
  @ApiQuery({ name: 'email', required: false, description: "Email de l'utilisateur" })
  @ApiQuery({ name: 'telephone', required: false, description: "Téléphone de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Liste des collaborations actives avec les infos des projets.' })
  async findMesProjetsAccessibles(
    @CurrentUser('id') userId: string,
    @Query('email') email?: string,
    @Query('telephone') telephone?: string
  ) {
    try {
      // Récupérer active_role depuis la base de données
      const userResult = await this.databaseService.query(
        `SELECT active_role FROM users WHERE id = $1`,
        [userId]
      );
      const activeRole = userResult.rows[0]?.active_role;
      const profileId = activeRole && activeRole !== 'producer' ? `profile_${userId}_${activeRole}` : undefined;

      return await this.collaborationsService.findMesCollaborationsActives(
        userId,
        email,
        telephone,
        profileId
      );
    } catch (error: unknown) {
      console.error('[CollaborationsController] Erreur dans findMesProjetsAccessibles:', error);
      throw error;
    }
  }

  @Get('statistics')
  @ApiOperation({ 
    summary: "Récupérer les statistiques des collaborations d'un projet",
    description: 'Retourne des statistiques détaillées sur les collaborateurs d\'un projet (total, par statut, par rôle, etc.)'
  })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistiques des collaborations.',
    schema: {
      type: 'object',
      properties: {
        total_collaborateurs: { type: 'number' },
        actifs: { type: 'number' },
        en_attente: { type: 'number' },
        rejetes: { type: 'number' },
        expires: { type: 'number' },
        par_role: {
          type: 'object',
          properties: {
            veterinaire: { type: 'number' },
            gestionnaire: { type: 'number' },
            ouvrier: { type: 'number' },
            observateur: { type: 'number' },
            proprietaire: { type: 'number' },
          },
        },
        derniere_invitation: { type: 'string', format: 'date-time', nullable: true },
        derniere_acceptation: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 403, description: "Vous n'êtes pas propriétaire de ce projet." })
  async getProjetStatistics(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.collaborationsService.getProjetStatistics(projetId, userId);
  }

  @Get()
  @ApiOperation({ 
    summary: "Récupérer tous les collaborateurs d'un projet",
    description: 'Supporte la recherche, le filtrage, le tri et la pagination. Accessible uniquement par le propriétaire du projet.'
  })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiQuery({ name: 'search', required: false, description: 'Recherche dans nom, prénom ou email' })
  @ApiQuery({ 
    name: 'role', 
    required: false, 
    enum: ['proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur'],
    description: 'Filtrer par rôle' 
  })
  @ApiQuery({ 
    name: 'statut', 
    required: false, 
    enum: ['actif', 'en_attente', 'rejete', 'expire', 'suspendu'],
    description: 'Filtrer par statut' 
  })
  @ApiQuery({ 
    name: 'invitation_type', 
    required: false, 
    enum: ['manual', 'email', 'telephone', 'qr_scan'],
    description: 'Filtrer par type d\'invitation' 
  })
  @ApiQuery({ 
    name: 'sortBy', 
    required: false, 
    enum: ['nom', 'prenom', 'date_creation', 'role', 'statut', 'date_acceptation', 'last_activity'],
    description: 'Champ de tri (défaut: date_creation)' 
  })
  @ApiQuery({ 
    name: 'sortOrder', 
    required: false, 
    enum: ['ASC', 'DESC'],
    description: 'Ordre de tri (défaut: DESC)' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page (défaut: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page (défaut: 20)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste paginée des collaborateurs.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: "Vous n'êtes pas propriétaire de ce projet." })
  async findAll(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('statut') statut?: string,
    @Query('invitation_type') invitationType?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    if (!projetId) {
      throw new BadRequestException('Le paramètre projet_id est requis');
    }

    const options: {
      search?: string;
      role?: string;
      statut?: string;
      invitation_type?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      page?: number;
      limit?: number;
    } = {};
    
    if (search) options.search = search;
    if (role) options.role = role;
    if (statut) options.statut = statut;
    if (invitationType) options.invitation_type = invitationType;
    if (sortBy) options.sortBy = sortBy;
    if (sortOrder) options.sortOrder = sortOrder;
    if (page) options.page = parseInt(page, 10);
    if (limit) options.limit = parseInt(limit, 10);

    return this.collaborationsService.findAll(projetId, userId, options);
  }

  @Get('my-collaborations')
  @ApiOperation({ 
    summary: 'Récupérer toutes les collaborations de l\'utilisateur connecté',
    description: 'Retourne toutes les collaborations où l\'utilisateur est lié (tous projets confondus). Cet endpoint remplace l\'utilisation de projet_id=\'all\'.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des collaborations de l\'utilisateur.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projet_id: { type: 'string' },
          user_id: { type: 'string' },
          nom: { type: 'string' },
          prenom: { type: 'string' },
          email: { type: 'string', nullable: true },
          telephone: { type: 'string', nullable: true },
          role: { type: 'string' },
          statut: { type: 'string' },
          permissions: { type: 'object' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  async getMyCollaborations(@CurrentUser('id') userId: string) {
    return this.collaborationsService.findMyCollaborations(userId);
  }

  @Delete('cleanup-expired')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Nettoyer les invitations expirées (cron job)',
    description: 'Endpoint protégé par secret header pour nettoyer automatiquement les invitations expirées. À appeler quotidiennement via un cron job.'
  })
  @ApiHeader({ 
    name: 'X-Cron-Secret', 
    required: true, 
    description: 'Secret pour authentifier l\'appel cron (doit correspondre à CLEANUP_SECRET dans .env)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Nombre d\'invitations expirées nettoyées.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        expired_count: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Secret invalide ou manquant.' })
  async cleanupExpiredInvitations(@Headers('x-cron-secret') secret: string) {
    // Vérifier le secret (doit correspondre à CLEANUP_SECRET dans .env)
    const expectedSecret = process.env.CLEANUP_SECRET || 'default-cleanup-secret-change-me';
    if (!secret || secret !== expectedSecret) {
      throw new UnauthorizedException('Secret invalide ou manquant');
    }

    const count = await this.collaborationsService.cleanupExpiredInvitations();
    return {
      success: true,
      expired_count: count,
      message: `${count} invitation(s) expirée(s) ont été nettoyée(s)`,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un collaborateur par son ID' })
  @ApiResponse({ status: 200, description: 'Détails du collaborateur.' })
  @ApiResponse({ status: 404, description: 'Collaborateur introuvable.' })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.collaborationsService.findOne(id, userId);
  }

  @Patch(':id')
  @UseInterceptors(RateLimitInterceptor)
  @RateLimit({ maxRequests: 50, windowMs: 3600000 }) // 50 mises à jour par heure
  @ApiOperation({ summary: 'Mettre à jour un collaborateur' })
  @ApiResponse({ status: 200, description: 'Collaborateur mis à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Collaborateur introuvable.' })
  @ApiResponse({ status: 429, description: 'Trop de requêtes. Limite de 50 mises à jour par heure.' })
  async update(
    @Param('id') id: string,
    @Body() updateCollaborateurDto: UpdateCollaborateurDto,
    @CurrentUser('id') userId: string,
    @Req() req: ExpressRequest
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.collaborationsService.update(id, updateCollaborateurDto, userId, ipAddress, userAgent);
  }

  @Patch(':id/accepter')
  @ApiOperation({ summary: 'Accepter une invitation de collaboration' })
  @ApiResponse({ status: 200, description: 'Invitation acceptée avec succès.' })
  @ApiResponse({ status: 404, description: 'Invitation introuvable.' })
  @ApiResponse({ status: 400, description: "Cette invitation n'est plus en attente ou a expiré." })
  async accepterInvitation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: ExpressRequest
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.collaborationsService.accepterInvitation(id, userId, ipAddress, userAgent);
  }

  @Patch(':id/rejeter')
  @ApiOperation({ summary: 'Rejeter une invitation de collaboration' })
  @ApiQuery({ name: 'rejection_reason', required: false, description: 'Raison du rejet (optionnel)' })
  @ApiResponse({ status: 200, description: 'Invitation rejetée avec succès.' })
  @ApiResponse({ status: 404, description: 'Invitation introuvable.' })
  async rejeterInvitation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: ExpressRequest,
    @Query('rejection_reason') rejectionReason?: string
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.collaborationsService.rejeterInvitation(id, userId, rejectionReason, ipAddress, userAgent);
  }

  @Delete(':id')
  @UseInterceptors(RateLimitInterceptor)
  @RateLimit({ maxRequests: 20, windowMs: 3600000 }) // 20 suppressions par heure
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un collaborateur' })
  @ApiResponse({ status: 204, description: 'Collaborateur supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Collaborateur introuvable.' })
  @ApiResponse({ status: 429, description: 'Trop de requêtes. Limite de 20 suppressions par heure.' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: ExpressRequest
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.collaborationsService.delete(id, userId, ipAddress, userAgent);
  }

  @Patch(':id/link')
  @ApiOperation({ summary: 'Lier manuellement une invitation à un utilisateur' })
  @ApiResponse({ status: 200, description: 'Invitation liée avec succès.' })
  @ApiResponse({ status: 404, description: 'Invitation introuvable.' })
  @ApiResponse({ status: 400, description: "Cette invitation n'est plus en attente ou a expiré." })
  @ApiResponse({ status: 403, description: "L'email ou téléphone ne correspond pas à votre compte." })
  async linkInvitationToUser(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: ExpressRequest
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.collaborationsService.linkInvitationToUser(id, userId, ipAddress, userAgent);
  }

  @Get(':id/history')
  @ApiOperation({ summary: "Récupérer l'historique complet d'une collaboration" })
  @ApiResponse({ status: 200, description: "Historique de la collaboration." })
  @ApiResponse({ status: 404, description: 'Collaboration introuvable.' })
  async getCollaborationHistory(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.collaborationsService.getCollaborationHistory(id, userId);
  }

  @Get('qr-code/profile')
  @UseInterceptors(RateLimitInterceptor)
  @RateLimit({ maxRequests: 10, windowMs: 3600000 }) // 10 générations par heure
  @ApiOperation({
    summary: 'Générer un QR code pour le profil actif (vétérinaire/technicien)',
    description:
      'Génère un QR code sécurisé et temporaire basé sur le profileId du profil actif (vétérinaire ou technicien). Le QR code expire après 5 minutes par défaut. Accessible uniquement aux profils vétérinaire et technicien.',
  })
  @ApiQuery({
    name: 'expiry',
    required: false,
    type: Number,
    description: 'Durée de validité en minutes (défaut: 5, max: 60)',
  })
  @ApiResponse({
    status: 200,
    description: 'QR code généré avec succès (base64 PNG)',
    schema: {
      type: 'object',
      properties: {
        qr_code: {
          type: 'string',
          description: 'QR code en base64 (format data:image/png;base64,...)',
        },
        expires_in: {
          type: 'number',
          description: 'Durée de validité en secondes',
        },
        profileId: {
          type: 'string',
          description: 'ID du profil (ex: profile_user123_veterinarian)',
        },
        profileType: {
          type: 'string',
          enum: ['veterinarian', 'technician'],
          description: 'Type de profil',
        },
        profileName: {
          type: 'string',
          description: 'Nom du profil',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé. Seuls les profils vétérinaire et technicien peuvent générer un QR code.',
  })
  @ApiResponse({
    status: 429,
    description: 'Trop de requêtes. Limite: 10 générations par heure.',
  })
  async generateProfileQRCode(
    @CurrentUser('id') userId: string,
    @Query('expiry') expiry?: string
  ) {
    // Récupérer les informations de l'utilisateur depuis la base de données
    // NOTE: On n'utilise PAS @CurrentUser('activeRole') car le JWT ne contient pas cette info
    // La source de vérité est active_role dans la base de données
    const userResult = await this.databaseService.query(
      `SELECT id, nom, prenom, roles, active_role FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    const user = userResult.rows[0];
    const activeRole = user.active_role; // Utiliser active_role de la DB, pas du JWT
    const roles = typeof user.roles === 'string' ? JSON.parse(user.roles) : (user.roles || {});
    
    // Vérifier que l'utilisateur a un profil vétérinaire ou technicien actif
    if (!activeRole || (activeRole !== 'veterinarian' && activeRole !== 'technician')) {
      throw new UnauthorizedException(
        `Seuls les profils vétérinaire et technicien peuvent générer un QR code de profil. Votre profil actif est: ${activeRole || 'non défini'}`
      );
    }

    // Générer le profileId unique : profile_${userId}_${activeRole}
    const profileId = `profile_${userId}_${activeRole}`;
    
    // Récupérer le nom du profil depuis roles
    const profileName = roles[activeRole]?.name || `${user.prenom} ${user.nom} (${activeRole === 'veterinarian' ? 'Vétérinaire' : 'Technicien'})`;

    const expiryMinutes = expiry
      ? Math.min(60, Math.max(1, parseInt(expiry, 10)))
      : 5;

    const qrCode = await this.qrCodeService.generateProfileQRCode(
      profileId,
      activeRole,
      expiryMinutes
    );

    return {
      qr_code: qrCode,
      expires_in: expiryMinutes * 60,
      profileId,
      profileType: activeRole,
      profileName,
    };
  }

  @Get(':id/activity')
  @ApiOperation({ 
    summary: "Récupérer l'activité d'un collaborateur",
    description: 'Retourne la dernière connexion, le nombre d\'actions et les 10 dernières actions d\'un collaborateur. Accessible par le propriétaire du projet ou le collaborateur concerné.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Activité du collaborateur.',
    schema: {
      type: 'object',
      properties: {
        derniere_connexion: { type: 'string', format: 'date-time', nullable: true },
        nombre_actions: { type: 'number' },
        actions_recentes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              date: { type: 'string', format: 'date-time' },
              details: {
                type: 'object',
                properties: {
                  old_value: { type: 'object', nullable: true },
                  new_value: { type: 'object', nullable: true },
                  performed_by: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      nom: { type: 'string' },
                      prenom: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Collaboration introuvable.' })
  @ApiResponse({ status: 403, description: 'Vous n\'avez pas accès à cette activité.' })
  async getCollaborateurActivity(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.collaborationsService.getCollaborateurActivity(id, userId);
  }

  @Get(':id/audit-trail')
  @ApiOperation({
    summary: "Récupérer l'audit trail complet d'une collaboration",
    description:
      'Retourne l\'audit trail détaillé d\'une collaboration, incluant toutes les métadonnées enrichies pour les invitations QR (scan QR, définition des permissions, envoi de l\'invitation, visualisation, acceptation/rejet). Accessible uniquement par le producteur propriétaire du projet.',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit trail de la collaboration.',
    schema: {
      type: 'object',
      properties: {
        collaboration_id: { type: 'string' },
        invitation_type: { type: 'string', enum: ['qr_scan', 'manual'] },
        timeline: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              actor: {
                type: 'object',
                nullable: true,
                properties: {
                  user_id: { type: 'string' },
                  profile_id: { type: 'string', nullable: true },
                  nom: { type: 'string', nullable: true },
                  prenom: { type: 'string', nullable: true },
                },
              },
              metadata: { type: 'object' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Collaboration introuvable.' })
  @ApiResponse({ status: 403, description: 'Vous n\'avez pas accès à cet audit trail.' })
  async getAuditTrail(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.collaborationsService.getAuditTrail(id, userId);
  }
}
