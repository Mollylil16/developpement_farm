import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ChargesFixesService, CreateChargeFixeDto } from './charges-fixes.service';

@Controller('charges-fixes')
export class ChargesFixesController {
  constructor(private readonly service: ChargesFixesService) {}

  @Post()
  create(@Body() dto: CreateChargeFixeDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('projet_id') projetId?: string, @Query('actives') actives?: string) {
    if (projetId && actives === 'true') {
      return this.service.findActives(projetId);
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
  update(@Param('id') id: string, @Body() updates: Partial<CreateChargeFixeDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

