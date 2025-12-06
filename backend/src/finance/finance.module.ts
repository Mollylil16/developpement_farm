import { Module } from '@nestjs/common';
import { ChargesFixesController } from './charges-fixes.controller';
import { DepensesController } from './depenses.controller';
import { RevenusController } from './revenus.controller';
import { ChargesFixesService } from './charges-fixes.service';
import { DepensesService } from './depenses.service';
import { RevenusService } from './revenus.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ChargesFixesController, DepensesController, RevenusController],
  providers: [ChargesFixesService, DepensesService, RevenusService],
  exports: [ChargesFixesService, DepensesService, RevenusService],
})
export class FinanceModule {}

