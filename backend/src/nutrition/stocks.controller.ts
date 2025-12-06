import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { StocksService, CreateStockAlimentDto, CreateStockMouvementDto } from './stocks.service';

@Controller('stocks')
export class StocksController {
  constructor(private readonly service: StocksService) {}

  // ========== STOCKS ALIMENTS ==========

  @Post('aliments')
  createStock(@Body() dto: CreateStockAlimentDto) {
    return this.service.createStock(dto);
  }

  @Get('aliments')
  findStocks(@Query('projet_id') projetId?: string, @Query('alerte') alerte?: string) {
    if (projetId && alerte === 'true') {
      return this.service.findStocksEnAlerte(projetId);
    }
    if (projetId) {
      return this.service.findStocksByProjet(projetId);
    }
    return [];
  }

  @Get('aliments/:id')
  findStockById(@Param('id') id: string) {
    return this.service.findStockById(id);
  }

  @Patch('aliments/:id')
  updateStock(@Param('id') id: string, @Body() updates: Partial<CreateStockAlimentDto>) {
    return this.service.updateStock(id, updates);
  }

  @Delete('aliments/:id')
  removeStock(@Param('id') id: string) {
    return this.service.removeStock(id);
  }

  // ========== STOCKS MOUVEMENTS ==========

  @Post('mouvements')
  createMouvement(@Body() dto: CreateStockMouvementDto) {
    return this.service.createMouvement(dto);
  }

  @Get('mouvements')
  findMouvements(
    @Query('projet_id') projetId?: string,
    @Query('aliment_id') alimentId?: string,
    @Query('recentes') recentes?: string,
    @Query('limit') limit?: string,
  ) {
    if (alimentId) {
      return this.service.findMouvementsByAliment(alimentId);
    }
    if (projetId && recentes === 'true') {
      return this.service.findMouvementsRecents(projetId, limit ? parseInt(limit, 10) : 20);
    }
    if (projetId) {
      return this.service.findMouvementsByProjet(projetId);
    }
    return [];
  }

  @Get('mouvements/:id')
  findMouvementById(@Param('id') id: string) {
    return this.service.findMouvementById(id);
  }

  @Delete('mouvements/:id')
  removeMouvement(@Param('id') id: string) {
    return this.service.removeMouvement(id);
  }
}

