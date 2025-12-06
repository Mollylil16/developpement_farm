import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { VaccinationsService, CreateVaccinationDto } from './vaccinations.service';

@Controller('vaccinations')
export class VaccinationsController {
  constructor(private readonly service: VaccinationsService) {}

  @Post()
  create(@Body() dto: CreateVaccinationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('projet_id') projetId?: string, @Query('animal_id') animalId?: string) {
    if (animalId) {
      return this.service.findByAnimal(animalId);
    }
    if (projetId) {
      return this.service.findByProjet(projetId);
    }
    return [];
  }

  @Get('retard')
  findEnRetard(@Query('projet_id') projetId: string) {
    return this.service.findEnRetard(projetId);
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
  update(@Param('id') id: string, @Body() updates: Partial<CreateVaccinationDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

