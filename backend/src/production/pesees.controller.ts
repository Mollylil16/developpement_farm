import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PeseesService, CreatePeseeDto } from './pesees.service';

@Controller('pesees')
export class PeseesController {
  constructor(private readonly service: PeseesService) {}

  @Post()
  create(@Body() dto: CreatePeseeDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('projet_id') projetId?: string,
    @Query('animal_id') animalId?: string,
    @Query('recentes') recentes?: string,
    @Query('limit') limit?: string,
  ) {
    if (animalId) {
      return this.service.findByAnimal(animalId);
    }
    if (projetId && recentes === 'true') {
      return this.service.findRecent(projetId, limit ? parseInt(limit, 10) : 20);
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
  update(@Param('id') id: string, @Body() updates: Partial<CreatePeseeDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

