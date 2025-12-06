import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { GestationsService, CreateGestationDto } from './gestations.service';

@Controller('gestations')
export class GestationsController {
  constructor(private readonly service: GestationsService) {}

  @Post()
  create(@Body() dto: CreateGestationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('projet_id') projetId?: string,
    @Query('debut') dateDebut?: string,
    @Query('fin') dateFin?: string,
  ) {
    if (projetId && dateDebut && dateFin) {
      return this.service.findByDateMiseBas(projetId, dateDebut, dateFin);
    }
    if (projetId) {
      return this.service.findByProjet(projetId);
    }
    return [];
  }

  @Get('en-cours')
  findEnCours(@Query('projet_id') projetId: string) {
    return this.service.findEnCours(projetId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updates: any) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

