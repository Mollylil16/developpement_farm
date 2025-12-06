import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TraitementsService, CreateTraitementDto } from './traitements.service';

@Controller('traitements')
export class TraitementsController {
  constructor(private readonly service: TraitementsService) {}

  @Post()
  create(@Body() dto: CreateTraitementDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('projet_id') projetId?: string,
    @Query('maladie_id') maladieId?: string,
    @Query('animal_id') animalId?: string,
  ) {
    if (maladieId) {
      return this.service.findByMaladie(maladieId);
    }
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
  update(@Param('id') id: string, @Body() updates: Partial<CreateTraitementDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

