import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjetsModule } from './projets/projets.module';
import { FinanceModule } from './finance/finance.module';
import { ReproductionModule } from './reproduction/reproduction.module';
import { ProductionModule } from './production/production.module';
import { SanteModule } from './sante/sante.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { CollaborationsModule } from './collaborations/collaborations.module';
import { PlanificationsModule } from './planifications/planifications.module';
import { MortalitesModule } from './mortalites/mortalites.module';
import { ReportsModule } from './reports/reports.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AiWeightModule } from './ai-weight/ai-weight.module';
import { AdminModule } from './admin/admin.module';
import { BatchesModule } from './batches/batches.module';
import { MigrationModule } from './migration/migration.module';
import { CommonModule } from './common/common.module';
import { AgentLearningsModule } from './agent-learnings/agent-learnings.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { AppController } from './app.controller';
import { JwtAuthGlobalGuard } from './common/guards/jwt-auth.global.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate limiting global
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requêtes par minute par défaut
      },
      {
        name: 'long',
        ttl: 600000, // 10 minutes
        limit: 500, // 500 requêtes par 10 minutes
      },
    ]),
    CommonModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule, // Nouveau module Auth
    ProjetsModule,
    FinanceModule,
    ReproductionModule,
    ProductionModule,
    SanteModule,
    NutritionModule,
    CollaborationsModule,
    PlanificationsModule,
    MortalitesModule,
    ReportsModule,
    MarketplaceModule,
    AiWeightModule,
    AdminModule,
    BatchesModule,
    MigrationModule,
    AgentLearningsModule,
    KnowledgeBaseModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => {
        return new JwtAuthGlobalGuard(reflector);
      },
      inject: [Reflector],
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
