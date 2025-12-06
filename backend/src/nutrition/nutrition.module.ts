import { Module } from '@nestjs/common';
import { IngredientsController } from './ingredients.controller';
import { StocksController } from './stocks.controller';
import { RationsController } from './rations.controller';
import { IngredientsService } from './ingredients.service';
import { StocksService } from './stocks.service';
import { RationsService } from './rations.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [IngredientsController, StocksController, RationsController],
  providers: [IngredientsService, StocksService, RationsService],
  exports: [IngredientsService, StocksService, RationsService],
})
export class NutritionModule {}

