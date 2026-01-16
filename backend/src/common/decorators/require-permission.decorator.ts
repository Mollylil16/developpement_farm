import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '../services/permissions.service';

/**
 * Clé de métadonnée pour stocker la permission requise
 */
export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * Décorateur pour marquer un endpoint comme nécessitant une permission spécifique
 * 
 * @param permission Clé de la permission requise
 * 
 * @example
 * ```typescript
 * @Post(':projetId/transactions')
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 * @RequirePermission('finance')
 * async createTransaction(@Param('projetId') projetId: string, @CurrentUser('id') userId: string) {
 *   // ...
 * }
 * ```
 */
export const RequirePermission = (permission: PermissionKey) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);
