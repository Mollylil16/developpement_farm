import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Logger,
  ForbiddenException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QRCodeService } from '../common/services/qrcode.service';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { Throttle } from '@nestjs/throttler';
import { RateLimitInterceptor } from '../common/interceptors/rate-limit.interceptor';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { ProfilePhotoInterceptor, ProfilePhotoValidationInterceptor } from './interceptors/file-upload.interceptor';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly qrCodeService: QRCodeService
  ) {}

  @Public() // Permettre la création d'utilisateur sans auth (via register)
  @Post()
  create(@Body() createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('veterinarians')
  @ApiOperation({ 
    summary: 'Récupérer tous les vétérinaires validés',
    description: 'Retourne la liste de tous les utilisateurs avec un profil vétérinaire validé (validationStatus = approved)'
  })
  @ApiResponse({ status: 200, description: 'Liste des vétérinaires validés.' })
  async findAllVeterinarians() {
    return this.usersService.findAllVeterinarians();
  }

  /**
   * 🆕 NOUVEAUX ENDPOINTS : Vérification d'existence (ne retournent que { exists: boolean })
   * Plus sécurisé que de retourner l'utilisateur complet
   */
  @Public()
  @Get('check/email/:email')
  async checkEmailExists(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    return { exists: !!user };
  }

  @Public()
  @Get('check/phone/:phone')
  async checkPhoneExists(@Param('phone') phone: string) {
    const user = await this.usersService.findByTelephone(phone);
    return { exists: !!user };
  }

  /**
   * ANCIENS ENDPOINTS : Retournent l'utilisateur complet (pour compatibilité)
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min — prevents email enumeration
  @Get('email/:email')
  async findByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    return user || null;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min — prevents phone enumeration
  @Get('telephone/:telephone')
  async findByTelephone(@Param('telephone') telephone: string) {
    const user = await this.usersService.findByTelephone(telephone);
    return user || null;
  }

  @Get('identifier/:identifier')
  findByIdentifier(@Param('identifier') identifier: string) {
    return this.usersService.findByIdentifier(identifier);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: any) {
    this.logger.debug(`update: mise à jour utilisateur ${id} avec ${Object.keys(updateUserDto).join(', ')}`);
    try {
      const result = await this.usersService.update(id, updateUserDto);
      this.logger.log(`update: utilisateur mis à jour avec succès, userId=${result?.id}`);
      return result;
    } catch (error: any) {
      this.logger.error(`update: erreur pour userId=${id}`, error);
      throw error;
    }
  }

  /**
   * Upload une photo de profil
   */
  @Post(':id/photo')
  @RateLimit({ maxRequests: 5, windowMs: 60 * 1000 }) // 5 uploads par minute
  @UseInterceptors(RateLimitInterceptor, ProfilePhotoInterceptor, ProfilePhotoValidationInterceptor)
  @ApiOperation({
    summary: 'Uploader une photo de profil',
    description: 'Upload et redimensionne une photo de profil (max 5MB, formats: JPG, JPEG, PNG, WEBP). L\'image est redimensionnée à 500x500px.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Fichier image (max 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Photo uploadée avec succès',
    schema: {
      type: 'object',
      properties: {
        photoUrl: {
          type: 'string',
          example: 'http://localhost:3000/uploads/profile-photos/user_123_1234567890.jpg',
        },
        message: {
          type: 'string',
          example: 'Photo de profil uploadée avec succès',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Fichier invalide (taille, format, etc.)',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur introuvable',
  })
  async uploadProfilePhoto(
    @Param('id') id: string,
    @CurrentUser() currentUser: any,
    @UploadedFile() file: { fieldname: string; originalname: string; encoding: string; mimetype: string; size: number; buffer?: Buffer; path?: string; filename?: string },
    @Req() req: Request,
  ) {
    // Vérifier que l'utilisateur modifie son propre profil
    if (currentUser.id !== id) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre propre photo de profil');
    }

    if (!file) {
      this.logger.warn(`[DEBUG-UPLOAD] Aucun fichier fourni pour userId=${id}`);
      throw new BadRequestException('Aucun fichier fourni');
    }

    try {
      const photoUrl = await this.usersService.uploadProfilePhoto(id, file, req);
      return {
        photoUrl,
        message: 'Photo de profil uploadée avec succès',
      };
    } catch (error: any) {
      this.logger.error(`[uploadProfilePhoto] Erreur pour userId=${id}:`, {
        errorType: error?.constructor?.name,
        status: error?.status,
        // Ne pas logger le message complet qui peut contenir des chemins
      });
      throw error;
    }
  }

  /**
   * Supprimer la photo de profil
   */
  @Delete(':id/photo')
  @RateLimit({ maxRequests: 10, windowMs: 60 * 1000 }) // 10 suppressions par minute
  @UseInterceptors(RateLimitInterceptor)
  @ApiOperation({
    summary: 'Supprimer la photo de profil',
    description: 'Supprime la photo de profil de l\'utilisateur',
  })
  @ApiResponse({
    status: 200,
    description: 'Photo supprimée avec succès',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Photo de profil supprimée avec succès',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur introuvable ou pas de photo',
  })
  @ApiResponse({
    status: 403,
    description: 'Non autorisé à supprimer cette photo',
  })
  async deleteProfilePhoto(
    @Param('id') id: string,
    @CurrentUser() currentUser: any,
  ) {
    // Vérifier que l'utilisateur modifie son propre profil
    if (currentUser.id !== id) {
      throw new ForbiddenException('Vous ne pouvez supprimer que votre propre photo de profil');
    }

    try {
      await this.usersService.deleteProfilePhoto(id);
      return {
        message: 'Photo de profil supprimée avec succès',
      };
    } catch (error: any) {
      this.logger.error(`[deleteProfilePhoto] Erreur pour userId=${id}:`, {
        errorType: error?.constructor?.name,
        status: error?.status,
      });
      throw error;
    }
  }

  @Post(':id/profiles/:profile')
  async addProfile(
    @Param('id') id: string,
    @Param('profile') profile: string,
    @CurrentUser() user: any,
  ) {
    // Vérifier que l'utilisateur modifie son propre profil
    if (user.id !== id) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre propre profil');
    }
    try {
      return await this.usersService.addProfile(id, profile);
    } catch (error: any) {
      this.logger.error(`[addProfile] Erreur pour userId=${id}, profile=${profile}:`, {
        message: error?.message,
        stack: error?.stack?.substring(0, 500),
        errorName: error?.name,
        errorCode: error?.code,
      });
      if (error?.message?.includes('introuvable')) {
        throw new NotFoundException(error.message);
      }
      if (error?.message?.includes('invalide')) {
        throw new BadRequestException(error.message);
      }
      // Convertir toute autre erreur en InternalServerErrorException avec un message explicite
      throw new InternalServerErrorException(
        `Erreur lors de l'ajout du profil ${profile}: ${error?.message || 'Erreur inconnue'}`
      );
    }
  }

  @Delete(':id/profiles/:profile')
  async removeProfile(
    @Param('id') id: string,
    @Param('profile') profile: string,
    @CurrentUser() user: any,
  ) {
    // Vérifier que l'utilisateur modifie son propre profil
    if (user.id !== id) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre propre profil');
    }
    try {
      return await this.usersService.removeProfile(id, profile);
    } catch (error: any) {
      this.logger.error(`[removeProfile] Erreur pour userId=${id}, profile=${profile}:`, {
        message: error?.message,
        stack: error?.stack?.substring(0, 500),
        errorName: error?.name,
        errorCode: error?.code,
      });
      if (error?.message?.includes('introuvable')) {
        throw new NotFoundException(error.message);
      }
      if (error?.message?.includes('invalide') || error?.message?.includes('au moins un profil')) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        `Erreur lors de la suppression du profil ${profile}: ${error?.message || 'Erreur inconnue'}`
      );
    }
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('me/qr-code')
  @UseInterceptors(RateLimitInterceptor)
  @RateLimit({ maxRequests: 10, windowMs: 3600000 }) // 10 générations par heure
  @ApiOperation({
    summary: 'Générer un QR code pour invitations de collaboration',
    description:
      'Génère un QR code sécurisé et temporaire permettant à d\'autres utilisateurs de vous inviter rapidement. Le QR code expire après 5 minutes par défaut (configurable).',
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
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Trop de requêtes. Limite: 10 générations par heure.',
  })
  async generateQRCode(
    @CurrentUser('id') userId: string,
    @Query('expiry') expiry?: string
  ) {
    const expiryMinutes = expiry
      ? Math.min(60, Math.max(1, parseInt(expiry, 10)))
      : undefined;

    const qrCode = await this.qrCodeService.generateUserQRCode(
      userId,
      expiryMinutes
    );

    return {
      qr_code: qrCode,
      expires_in: (expiryMinutes || 5) * 60,
    };
  }

  @Post('validate-qr')
  @UseInterceptors(RateLimitInterceptor)
  @RateLimit({ maxRequests: 20, windowMs: 3600000 }) // 20 validations par heure
  @Public() // Accessible sans authentification (pour scanner le QR)
  @ApiOperation({
    summary: 'Valider un QR code et récupérer les informations utilisateur',
    description:
      'Valide un QR code scanné et retourne les informations de l\'utilisateur (nom, prénom, email, téléphone, photo) pour créer une invitation de collaboration.',
  })
  @ApiResponse({
    status: 200,
    description: 'QR code valide, informations utilisateur retournées',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            nom: { type: 'string' },
            prenom: { type: 'string' },
            email: { type: 'string' },
            telephone: { type: 'string', nullable: true },
            photo: { type: 'string', nullable: true },
          },
        },
        expires_at: {
          type: 'string',
          format: 'date-time',
          description: 'Date d\'expiration du QR code',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'QR code invalide, expiré ou déjà utilisé',
  })
  @ApiResponse({
    status: 429,
    description: 'Trop de requêtes. Limite: 20 validations par heure.',
  })
  async validateQR(@Body() validateQrDto: ValidateQrDto) {
    // Décoder et valider le QR code (le service gère l'extraction du base64)
    const { userId, exp } = await this.qrCodeService.decodeQRData(
      validateQrDto.qr_data
    );

    // Récupérer les informations de l'utilisateur
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new ForbiddenException('Utilisateur introuvable');
    }

    // Marquer le QR code comme utilisé (anti-replay)
    await this.qrCodeService.markQRAsUsed(validateQrDto.qr_data);

    // Retourner uniquement les informations nécessaires pour l'invitation
    return {
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone || null,
        photo: user.photo || null,
      },
      expires_at: new Date(exp).toISOString(),
    };
  }
}
