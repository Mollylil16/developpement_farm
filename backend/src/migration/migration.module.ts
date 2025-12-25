import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MigrationController } from './migration.controller';
import { PigMigrationService } from './pig-migration.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MigrationController],
  providers: [PigMigrationService],
  exports: [PigMigrationService],
})
export class MigrationModule {}

