import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProjetsService, CreateProjetDto, UpdateProjetDto } from './projets.service';

@Controller('projets')
export class ProjetsController {
  constructor(private readonly projetsService: ProjetsService) {}

  @Post()
  create(@Body() createProjetDto: CreateProjetDto) {
    return this.projetsService.create(createProjetDto);
  }

  @Get()
  findAll(@Query('proprietaire_id') proprietaireId?: string) {
    if (proprietaireId) {
      return this.projetsService.findByProprietaire(proprietaireId);
    }
    return this.projetsService.findAll();
  }

  @Get('actif')
  findActif(@Query('user_id') userId: string) {
    return this.projetsService.findActifByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projetsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjetDto: UpdateProjetDto) {
    return this.projetsService.update(id, updateProjetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projetsService.remove(id);
  }
}

