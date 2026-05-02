import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiWeightController } from './ai-weight.controller';
import { AiWeightService } from './ai-weight.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 120000, // 2 minutes pour les requêtes IA
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [AiWeightController],
  providers: [AiWeightService],
  exports: [AiWeightService],
})
export class AiWeightModule {}

