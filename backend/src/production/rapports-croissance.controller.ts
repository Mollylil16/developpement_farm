import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { RapportsCroissanceService, CreateRapportCroissanceDto } from './rapports-croissance.service';

@Controller('rapports-croissance')
export class RapportsCroissanceController {
  constructor(private readonly service: RapportsCroissanceService) {}

  @Post()
  create(@Body() dto: CreateRapportCroissanceDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('projet_id') projetId?: string, @Query('debut') dateDebut?: string, @Query('fin') dateFin?: string) {
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

