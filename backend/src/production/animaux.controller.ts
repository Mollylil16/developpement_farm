import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AnimauxService, CreateAnimalDto } from './animaux.service';

@Controller('animaux')
export class AnimauxController {
  constructor(private readonly service: AnimauxService) {}

  @Post()
  create(@Body() dto: CreateAnimalDto) {
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
  update(@Param('id') id: string, @Body() updates: Partial<CreateAnimalDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

