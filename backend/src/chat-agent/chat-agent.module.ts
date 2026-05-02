import { Module } from '@nestjs/common';
import { ChatAgentController } from './chat-agent.controller';
import { ChatAgentService } from './chat-agent.service';
import { FinanceModule } from '../finance/finance.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { ProductionModule } from '../production/production.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { SanteModule } from '../sante/sante.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { ReproductionModule } from '../reproduction/reproduction.module';
import { MortalitesModule } from '../mortalites/mortalites.module';
import { BatchesModule } from '../batches/batches.module';
import { PlanificationsModule } from '../planifications/planifications.module';
import { KouakouRateLimitGuard } from './guards/kouakou-rate-limit.guard';

@Module({
  imports: [
    FinanceModule,
    KnowledgeBaseModule,
    ProductionModule,
    MarketplaceModule,
    SanteModule,
    NutritionModule,
    ReproductionModule,
    MortalitesModule,
    BatchesModule,
    PlanificationsModule,
  ],
  controllers: [ChatAgentController],
  providers: [ChatAgentService, KouakouRateLimitGuard],
  exports: [ChatAgentService],
})
export class ChatAgentModule {}

