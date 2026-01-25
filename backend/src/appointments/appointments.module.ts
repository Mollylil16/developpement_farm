import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentRemindersService } from './appointment-reminders.service';
import { DatabaseModule } from '../database/database.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [DatabaseModule, MarketplaceModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentRemindersService],
  exports: [AppointmentsService, AppointmentRemindersService],
})
export class AppointmentsModule {}
