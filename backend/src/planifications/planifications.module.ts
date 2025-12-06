import { Module } from '@nestjs/common';
import { PlanificationsController } from './planifications.controller';
import { PlanificationsService } from './planifications.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PlanificationsController],
  providers: [PlanificationsService],
  exports: [PlanificationsService],
})
export class PlanificationsModule {}

