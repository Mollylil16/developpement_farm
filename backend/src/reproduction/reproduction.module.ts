import { Module } from '@nestjs/common';
import { GestationsController } from './gestations.controller';
import { SevragesController } from './sevrages.controller';
import { GestationsService } from './gestations.service';
import { SevragesService } from './sevrages.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [GestationsController, SevragesController],
  providers: [GestationsService, SevragesService],
  exports: [GestationsService, SevragesService],
})
export class ReproductionModule {}

