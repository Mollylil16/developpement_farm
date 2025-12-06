import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { VisitesVeterinairesService, CreateVisiteVeterinaireDto } from './visites-veterinaires.service';

@Controller('visites-veterinaires')
export class VisitesVeterinairesController {
  constructor(private readonly service: VisitesVeterinairesService) {}

  @Post()
  create(@Body() dto: CreateVisiteVeterinaireDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('projet_id') projetId?: string) {
    if (projetId) {
      return this.service.findByProjet(projetId);
    }
    return [];
  }

  @Get('prochaine')
  findProchaineVisite(@Query('projet_id') projetId: string) {
    return this.service.findProchaineVisite(projetId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updates: Partial<CreateVisiteVeterinaireDto>) {
    return this.service.update(id, updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

