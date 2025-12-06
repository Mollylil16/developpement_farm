import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CalendrierVaccinationsService, CreateCalendrierVaccinationDto } from './calendrier-vaccinations.service';

@Controller('calendrier-vaccinations')
export class CalendrierVaccinationsController {
  constructor(private readonly service: CalendrierVaccinationsService) {}

  @Post()
  create(@Body() dto: CreateCalendrierVaccinationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('projet_id') projetId?: string) {
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
  update(@Param('id') id: string, @Body() updates: Partial<CreateCalendrierVaccinationDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

