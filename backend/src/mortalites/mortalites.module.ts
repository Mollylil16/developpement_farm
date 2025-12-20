import { Module } from '@nestjs/common';
import { MortalitesService } from './mortalites.service';
import { MortalitesController } from './mortalites.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MortalitesController],
  providers: [MortalitesService],
  exports: [MortalitesService],
})
export class MortalitesModule {}
