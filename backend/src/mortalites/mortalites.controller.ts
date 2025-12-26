import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MortalitesService } from './mortalites.service';
import { CreateMortaliteDto } from './dto/create-mortalite.dto';
import { UpdateMortaliteDto } from './dto/update-mortalite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('mortalites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mortalites')
export class MortalitesController {
  constructor(private readonly mortalitesService: MortalitesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle mortalité' })
  @ApiResponse({ status: 201, description: 'Mortalité créée avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 403, description: "Vous n'êtes pas propriétaire de ce projet." })
  async create(@Body() createMortaliteDto: CreateMortaliteDto, @CurrentUser('id') userId: string) {
    return this.mortalitesService.create(createMortaliteDto, userId);
  }

  @Get()
  @ApiOperation({ summary: "Récupérer toutes les mortalités d'un projet (avec pagination optionnelle)" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Nombre maximum de résultats (défaut: 500, max: 500)',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Nombre d\'éléments à ignorer pour la pagination',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Liste des mortalités.' })
  async findAll(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    return this.mortalitesService.findAll(projetId, userId, limitNum, offsetNum);
  }

  @Get('statistiques')
  @ApiOperation({ summary: "Récupérer les statistiques de mortalité d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Statistiques de mortalité.' })
  async getStatistiques(@Query('projet_id') projetId: string, @CurrentUser('id') userId: string) {
    return this.mortalitesService.getStatistiques(projetId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une mortalité par son ID' })
  @ApiResponse({ status: 200, description: 'Détails de la mortalité.' })
  @ApiResponse({ status: 404, description: 'Mortalité introuvable.' })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.mortalitesService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une mortalité' })
  @ApiResponse({ status: 200, description: 'Mortalité mise à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Mortalité introuvable.' })
  async update(
    @Param('id') id: string,
    @Body() updateMortaliteDto: UpdateMortaliteDto,
    @CurrentUser('id') userId: string
  ) {
    return this.mortalitesService.update(id, updateMortaliteDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une mortalité' })
  @ApiResponse({ status: 204, description: 'Mortalité supprimée avec succès.' })
  @ApiResponse({ status: 404, description: 'Mortalité introuvable.' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.mortalitesService.delete(id, userId);
  }
}
