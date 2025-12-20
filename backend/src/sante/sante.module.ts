import { Module } from '@nestjs/common';
import { SanteService } from './sante.service';
import { SanteController } from './sante.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SanteController],
  providers: [SanteService],
  exports: [SanteService],
})
export class SanteModule {}
