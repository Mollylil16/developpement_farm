import { Module } from '@nestjs/common';
import { AgricoleController } from './agricole.controller';
import { AgricoleService } from './agricole.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AgricoleController],
  providers: [AgricoleService],
  exports: [AgricoleService],
})
export class AgricoleModule {}
