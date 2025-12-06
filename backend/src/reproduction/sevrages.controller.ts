import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SevragesService, CreateSevrageDto } from './sevrages.service';

@Controller('sevrages')
export class SevragesController {
  constructor(private readonly service: SevragesService) {}

  @Post()
  create(@Body() dto: CreateSevrageDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('projet_id') projetId?: string,
    @Query('gestation_id') gestationId?: string,
    @Query('debut') dateDebut?: string,
    @Query('fin') dateFin?: string,
  ) {
    if (gestationId) {
      return this.service.findByGestation(gestationId);
    }
    if (projetId && dateDebut && dateFin) {
      return this.service.findByDateRange(projetId, dateDebut, dateFin);
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
  update(@Param('id') id: string, @Body() updates: Partial<CreateSevrageDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

