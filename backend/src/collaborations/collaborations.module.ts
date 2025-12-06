import { Module } from '@nestjs/common';
import { CollaborationsController } from './collaborations.controller';
import { CollaborationsService } from './collaborations.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CollaborationsController],
  providers: [CollaborationsService],
  exports: [CollaborationsService],
})
export class CollaborationsModule {}

