import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { DepensesService, CreateDepenseDto } from './depenses.service';

@Controller('depenses')
export class DepensesController {
  constructor(private readonly service: DepensesService) {}

  @Post()
  create(@Body() dto: CreateDepenseDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('projet_id') projetId?: string,
    @Query('debut') dateDebut?: string,
    @Query('fin') dateFin?: string,
  ) {
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
  update(@Param('id') id: string, @Body() updates: Partial<CreateDepenseDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

