import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceUnifiedService } from './marketplace-unified.service';
import { SaleAutomationService } from './sale-automation.service';
import { NotificationsService } from './notifications.service';
import { AutoSaleService } from './auto-sale.service';
import { MarketplaceController } from './marketplace.controller';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [MarketplaceController],
  providers: [
    MarketplaceService,
    MarketplaceUnifiedService,
    SaleAutomationService,
    NotificationsService,
    AutoSaleService,
  ],
  exports: [
    MarketplaceService,
    MarketplaceUnifiedService,
    SaleAutomationService,
    NotificationsService,
    AutoSaleService,
  ],
})
export class MarketplaceModule {}
