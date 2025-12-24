import { Module, Global } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { CacheService } from './services/cache.service';

/**
 * Module commun pour les services partagés
 * Décoré avec @Global() pour être disponible dans tous les modules sans import explicite
 */
@Global()
@Module({
  providers: [EmailService, CacheService],
  exports: [EmailService, CacheService],
})
export class CommonModule {}

