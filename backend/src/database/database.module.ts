import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { MigrationService } from './migration.service';

@Global()
@Module({
  providers: [DatabaseService, MigrationService],
  exports: [DatabaseService, MigrationService],
})
export class DatabaseModule {}
