import { Module, forwardRef } from '@nestjs/common';
import { ProjetsController } from './projets.controller';
import { ProjetsService } from './projets.service';
import { DatabaseModule } from '../database/database.module';
import { BatchesModule } from '../batches/batches.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => BatchesModule)],
  controllers: [ProjetsController],
  providers: [ProjetsService],
  exports: [ProjetsService],
})
export class ProjetsModule {}
