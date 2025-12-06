import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MaladiesService, CreateMaladieDto } from './maladies.service';

@Controller('maladies')
export class MaladiesController {
  constructor(private readonly service: MaladiesService) {}

  @Post()
  create(@Body() dto: CreateMaladieDto) {
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

  @Get('en-cours')
  findEnCours(@Query('projet_id') projetId: string) {
    return this.service.findEnCours(projetId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updates: Partial<CreateMaladieDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

