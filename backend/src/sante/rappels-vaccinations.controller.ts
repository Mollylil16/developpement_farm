import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RappelsVaccinationsService, CreateRappelVaccinationDto } from './rappels-vaccinations.service';

@Controller('rappels-vaccinations')
export class RappelsVaccinationsController {
  constructor(private readonly service: RappelsVaccinationsService) {}

  @Post()
  create(@Body() dto: CreateRappelVaccinationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('projet_id') projetId?: string) {
    if (projetId) {
      return this.service.findByProjet(projetId);
    }
    return [];
  }

  @Get('avenir')
  findAVenir(@Query('projet_id') projetId: string, @Query('jours') jours?: string) {
    return this.service.findAVenir(projetId, jours ? parseInt(jours, 10) : 7);
  }

  @Get('retard')
  findEnRetard(@Query('projet_id') projetId: string) {
    return this.service.findEnRetard(projetId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updates: Partial<CreateRappelVaccinationDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

