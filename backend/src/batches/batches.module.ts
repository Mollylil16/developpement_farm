import { Module, forwardRef } from '@nestjs/common';
import { BatchPigsController } from './batch-pigs.controller';
import { BatchPigsService } from './batch-pigs.service';
import { DatabaseModule } from '../database/database.module';
import { ProjetsModule } from '../projets/projets.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => ProjetsModule)],
  controllers: [BatchPigsController],
  providers: [BatchPigsService],
  exports: [BatchPigsService],
})
export class BatchesModule {}

