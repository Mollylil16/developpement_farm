import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { ProjetsModule } from './projets/projets.module';
import { FinanceModule } from './finance/finance.module';
import { ReproductionModule } from './reproduction/reproduction.module';
import { ProductionModule } from './production/production.module';
import { SanteModule } from './sante/sante.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { CollaborationsModule } from './collaborations/collaborations.module';
import { PlanificationsModule } from './planifications/planifications.module';
import { MortalitesModule } from './mortalites/mortalites.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    UsersModule,
    ProjetsModule,
    FinanceModule,
    ReproductionModule,
    ProductionModule,
    SanteModule,
    NutritionModule,
    CollaborationsModule,
    PlanificationsModule,
    MortalitesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

