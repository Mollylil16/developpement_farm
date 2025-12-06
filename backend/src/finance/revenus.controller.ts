import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RevenusService, CreateRevenuDto } from './revenus.service';

@Controller('revenus')
export class RevenusController {
  constructor(private readonly service: RevenusService) {}

  @Post()
  create(@Body() dto: CreateRevenuDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('projet_id') projetId?: string,
    @Query('debut') dateDebut?: string,
    @Query('fin') dateFin?: string,
  ) {
    if (projetId && dateDebut && dateFin) {
      return this.service.findByDateRange(projetId, dateDebut, dateFin);
    }
    if (projetId) {
      return this.service.findByProjet(projetId);
    }
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updates: Partial<CreateRevenuDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

