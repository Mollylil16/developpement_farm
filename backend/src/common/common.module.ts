import { Module, Global } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { CacheService } from './services/cache.service';
import { ImageService } from './services/image.service';
import { PermissionsService } from './services/permissions.service';
import { PermissionGuard } from './guards/permission.guard';
import { QRCodeService } from './services/qrcode.service';
import { CloudinaryService } from './services/cloudinary.service';
import { CollaborationsModule } from '../collaborations/collaborations.module';

/**
 * Module commun pour les services partagés
 * Décoré avec @Global() pour être disponible dans tous les modules sans import explicite
 */
@Global()
@Module({
  imports: [CollaborationsModule],
  providers: [EmailService, CacheService, ImageService, PermissionsService, PermissionGuard, QRCodeService, CloudinaryService],
  exports: [EmailService, CacheService, ImageService, PermissionsService, PermissionGuard, QRCodeService, CloudinaryService],
})
export class CommonModule {}

