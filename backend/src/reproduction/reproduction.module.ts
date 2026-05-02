import { Module } from '@nestjs/common';
import { ReproductionController } from './reproduction.controller';
import { ReproductionService } from './reproduction.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReproductionController],
  providers: [ReproductionService],
  exports: [ReproductionService],
})
export class ReproductionModule {}
