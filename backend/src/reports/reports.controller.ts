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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateRapportCroissanceDto } from './dto/create-rapport-croissance.dto';
import { UpdateRapportCroissanceDto } from './dto/update-rapport-croissance.dto';
import { IndicateursPerformanceDto } from './dto/indicateurs-performance.dto';
import { PerformanceGlobaleDto } from './dto/performance-globale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('rapports-croissance')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un nouveau rapport de croissance' })
  @ApiResponse({ status: 201, description: 'Rapport de croissance créé avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 403, description: "Vous n'êtes pas propriétaire de ce projet." })
  async create(
    @Body() createRapportDto: CreateRapportCroissanceDto,
    @CurrentUser('id') userId: string
  ) {
    return this.reportsService.create(createRapportDto, userId);
  }

  @Get('rapports-croissance')
  @ApiOperation({ summary: "Récupérer tous les rapports de croissance d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des rapports de croissance.' })
  @ApiResponse({ status: 404, description: 'Projet introuvable.' })
  async findAll(@Query('projet_id') projetId: string, @CurrentUser('id') userId: string) {
    return this.reportsService.findAll(projetId, userId);
  }

  @Get('rapports-croissance/:id')
  @ApiOperation({ summary: 'Récupérer un rapport de croissance par son ID' })
  @ApiResponse({ status: 200, description: 'Détails du rapport de croissance.' })
  @ApiResponse({ status: 404, description: 'Rapport introuvable.' })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.reportsService.findOne(id, userId);
  }

  @Patch('rapports-croissance/:id')
  @ApiOperation({ summary: 'Mettre à jour un rapport de croissance' })
  @ApiResponse({ status: 200, description: 'Rapport de croissance mis à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Rapport introuvable.' })
  async update(
    @Param('id') id: string,
    @Body() updateRapportDto: UpdateRapportCroissanceDto,
    @CurrentUser('id') userId: string
  ) {
    return this.reportsService.update(id, updateRapportDto, userId);
  }

  @Delete('rapports-croissance/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un rapport de croissance' })
  @ApiResponse({ status: 204, description: 'Rapport de croissance supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Rapport introuvable.' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.reportsService.delete(id, userId);
  }

  @Get('indicateurs-performance')
  @ApiOperation({
    summary: "Calculer les indicateurs de performance d'un projet",
    description:
      'Calcule les indicateurs de performance incluant le taux de croissance (basé sur le gain de poids réel), ' +
      "l'efficacité alimentaire (en kg), l'indice de consommation et d'autres métriques sur une période donnée.",
  })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiQuery({
    name: 'periode_jours',
    required: false,
    description: 'Période de calcul en jours (défaut: 30)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Indicateurs de performance calculés avec succès.',
    type: IndicateursPerformanceDto,
  })
  @ApiResponse({ status: 404, description: 'Projet introuvable.' })
  @ApiResponse({ status: 403, description: "Vous n'êtes pas propriétaire de ce projet." })
  async calculerIndicateursPerformance(
    @Query('projet_id') projetId: string,
    @Query('periode_jours') periodeJours?: string,
    @CurrentUser('id') userId?: string
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    if (!projetId) {
      throw new BadRequestException('Project ID is required');
    }
    const periode = periodeJours ? parseInt(periodeJours, 10) : 30;
    if (isNaN(periode) || periode <= 0) {
      throw new BadRequestException('periode_jours must be a positive number');
    }
    return this.reportsService.calculerIndicateursPerformance(projetId, userId, periode);
  }

  @Get('performance-globale')
  @ApiOperation({
    summary: "Calculer la performance globale d'un projet",
    description:
      'Calcule la performance globale en comparant le coût de production (OPEX + CAPEX amorti) avec le prix du marché. ' +
      "Génère un diagnostic et des suggestions d'amélioration.",
  })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({
    status: 200,
    description: 'Performance globale calculée avec succès.',
    type: PerformanceGlobaleDto,
  })
  @ApiResponse({ status: 404, description: 'Projet introuvable ou pas assez de données.' })
  @ApiResponse({ status: 403, description: "Vous n'êtes pas propriétaire de ce projet." })
  async calculerPerformanceGlobale(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    const result = await this.reportsService.calculerPerformanceGlobale(projetId, userId);

    // IMPORTANT: Toujours renvoyer un JSON objet (évite réponses vides / parse errors côté mobile)
    if (result === null) {
      return {
        available: false,
        reason: 'not_enough_data',
        message: "Pas assez de données pour calculer la performance globale (aucune vente 'vente_porc').",
        data: null,
      };
    }

    return { available: true, data: result };
  }
}
