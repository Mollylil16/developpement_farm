import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MortalitesService, CreateMortaliteDto } from './mortalites.service';

@Controller('mortalites')
export class MortalitesController {
  constructor(private readonly service: MortalitesService) {}

  @Post()
  create(@Body() dto: CreateMortaliteDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('projet_id') projetId?: string,
    @Query('categorie') categorie?: string,
    @Query('debut') dateDebut?: string,
    @Query('fin') dateFin?: string,
  ) {
    if (projetId && categorie) {
      return this.service.findByCategorie(projetId, categorie);
    }
    if (projetId && dateDebut && dateFin) {
      return this.service.findByDateRange(projetId, dateDebut, dateFin);
    }
    if (projetId) {
      return this.service.findByProjet(projetId);
    }
    return [];
  }

  @Get('statistiques')
  getStatistiques(@Query('projet_id') projetId: string) {
    return this.service.getStatistiques(projetId);
  }

  @Get('taux-par-cause')
  getTauxParCause(@Query('projet_id') projetId: string) {
    return this.service.getTauxParCause(projetId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updates: Partial<CreateMortaliteDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

