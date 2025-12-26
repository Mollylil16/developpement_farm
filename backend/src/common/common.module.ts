import { Module, Global } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { CacheService } from './services/cache.service';
import { ImageService } from './services/image.service';

/**
 * Module commun pour les services partagés
 * Décoré avec @Global() pour être disponible dans tous les modules sans import explicite
 */
@Global()
@Module({
  providers: [EmailService, CacheService, ImageService],
  exports: [EmailService, CacheService, ImageService],
})
export class CommonModule {}

