import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceUnifiedService } from './marketplace-unified.service';
import { MarketplaceController } from './marketplace.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MarketplaceUnifiedService],
  exports: [MarketplaceService, MarketplaceUnifiedService],
})
export class MarketplaceModule {}
