import { Module } from '@nestjs/common';
import { CollaborationsService } from './collaborations.service';
import { CollaborationsController } from './collaborations.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CollaborationsController],
  providers: [CollaborationsService],
  exports: [CollaborationsService],
})
export class CollaborationsModule {}
