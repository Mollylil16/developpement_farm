import { Module, forwardRef } from '@nestjs/common';
import { CollaborationsService } from './collaborations.service';
import { CollaborationsController } from './collaborations.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [CollaborationsController],
  providers: [CollaborationsService],
  exports: [CollaborationsService],
})
export class CollaborationsModule {}
