import { Module } from '@nestjs/common';
import { AnimauxController } from './animaux.controller';
import { PeseesController } from './pesees.controller';
import { RapportsCroissanceController } from './rapports-croissance.controller';
import { AnimauxService } from './animaux.service';
import { PeseesService } from './pesees.service';
import { RapportsCroissanceService } from './rapports-croissance.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AnimauxController, PeseesController, RapportsCroissanceController],
  providers: [AnimauxService, PeseesService, RapportsCroissanceService],
  exports: [AnimauxService, PeseesService, RapportsCroissanceService],
})
export class ProductionModule {}

