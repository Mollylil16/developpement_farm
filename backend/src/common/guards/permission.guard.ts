import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PermissionsService, PermissionKey } from '../services/permissions.service';

/**
 * Guard pour vérifier les permissions des collaborateurs
 * 
 * Utilisation :
 * ```typescript
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 * @RequirePermission('finance')
 * async createTransaction(@Param('projetId') projetId: string, @CurrentUser('id') userId: string) {
 *   // ...
 * }
 * ```
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Récupérer la permission requise depuis le décorateur
    const requiredPermission = this.reflector.getAllAndOverride<PermissionKey>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Si aucune permission n'est requise, laisser passer
    if (!requiredPermission) {
      return true;
    }

    // Récupérer l'utilisateur depuis la requête (doit être authentifié via JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const userId = user.id;

    // Récupérer le projetId depuis les paramètres de la requête
    // Peut être dans : params, query, ou body
    const projetId =
      request.params?.projetId ||
      request.params?.id ||
      request.query?.projet_id ||
      request.query?.projetId ||
      request.body?.projet_id ||
      request.body?.projetId;

    if (!projetId) {
      this.logger.warn(
        `ProjetId non trouvé dans la requête pour l'utilisateur ${userId}. Route: ${request.url}`
      );
      throw new BadRequestException(
        'ID du projet manquant. Le projetId doit être fourni dans les paramètres, query ou body.'
      );
    }

    // Vérifier la permission
    try {
      await this.permissionsService.enforcePermission(userId, projetId, requiredPermission);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `Erreur lors de la vérification de la permission ${requiredPermission} pour ${userId} sur ${projetId}:`,
        error
      );
      throw new ForbiddenException('Erreur lors de la vérification des permissions');
    }
  }
}
