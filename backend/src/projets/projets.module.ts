import { Module } from '@nestjs/common';
import { ProjetsController } from './projets.controller';
import { ProjetsService } from './projets.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ProjetsController],
  providers: [ProjetsService],
  exports: [ProjetsService],
})
export class ProjetsModule {}

