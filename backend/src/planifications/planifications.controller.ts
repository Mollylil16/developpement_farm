import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PlanificationsService, CreatePlanificationDto } from './planifications.service';

@Controller('planifications')
export class PlanificationsController {
  constructor(private readonly service: PlanificationsService) {}

  @Post()
  create(@Body() dto: CreatePlanificationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('projet_id') projetId?: string,
    @Query('statut') statut?: string,
    @Query('debut') dateDebut?: string,
    @Query('fin') dateFin?: string,
  ) {
    if (projetId && statut) {
      return this.service.findByStatut(projetId, statut);
    }
    if (projetId && dateDebut && dateFin) {
      return this.service.findByDateRange(projetId, dateDebut, dateFin);
    }
    if (projetId) {
      return this.service.findByProjet(projetId);
    }
    return [];
  }

  @Get('avenir')
  findAVenir(@Query('projet_id') projetId: string, @Query('jours') jours?: string) {
    return this.service.findAVenir(projetId, jours ? parseInt(jours, 10) : 7);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updates: Partial<CreatePlanificationDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

