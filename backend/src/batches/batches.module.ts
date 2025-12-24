import { Module } from '@nestjs/common';
import { BatchPigsController } from './batch-pigs.controller';
import { BatchPigsService } from './batch-pigs.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BatchPigsController],
  providers: [BatchPigsService],
  exports: [BatchPigsService],
})
export class BatchesModule {}

