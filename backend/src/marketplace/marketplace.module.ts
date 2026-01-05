import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceUnifiedService } from './marketplace-unified.service';
import { SaleAutomationService } from './sale-automation.service';
import { MarketplaceController } from './marketplace.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MarketplaceUnifiedService, SaleAutomationService],
  exports: [MarketplaceService, MarketplaceUnifiedService, SaleAutomationService],
})
export class MarketplaceModule {}
