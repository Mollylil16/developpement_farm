import { Module } from '@nestjs/common';
import { BatchPigsController } from './batch-pigs.controller';
import { BatchPigsService } from './batch-pigs.service';
import { BatchVaccinationController } from './batch-vaccination.controller';
import { BatchVaccinationService } from './batch-vaccination.service';
import { BatchGestationController } from './batch-gestation.controller';
import { BatchGestationService } from './batch-gestation.service';
import { BatchWeighingController } from './batch-weighing.controller';
import { BatchWeighingService } from './batch-weighing.service';
import { BatchDiseaseController } from './batch-disease.controller';
import { BatchDiseaseService } from './batch-disease.service';
import { BatchMortalityController } from './batch-mortality.controller';
import { BatchMortalityService } from './batch-mortality.service';
import { BatchSaleController } from './batch-sale.controller';
import { BatchSaleService } from './batch-sale.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    BatchPigsController,
    BatchVaccinationController,
    BatchGestationController,
    BatchWeighingController,
    BatchDiseaseController,
    BatchMortalityController,
    BatchSaleController,
  ],
  providers: [
    BatchPigsService,
    BatchVaccinationService,
    BatchGestationService,
    BatchWeighingService,
    BatchDiseaseService,
    BatchMortalityService,
    BatchSaleService,
  ],
  exports: [
    BatchPigsService,
    BatchVaccinationService,
    BatchGestationService,
    BatchWeighingService,
    BatchDiseaseService,
    BatchMortalityService,
    BatchSaleService,
  ],
})
export class BatchesModule {}

