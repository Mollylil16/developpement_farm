import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BatchGestationService } from './batch-gestation.service';
import { CreateBatchGestationDto, UpdateBatchGestationDto } from './dto/create-gestation.dto';

@ApiTags('batch-gestations')
@Controller('batch-gestations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BatchGestationController {
  constructor(private readonly gestationService: BatchGestationService) {}

  // ==================== CRUD ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une gestation pour une truie dans une bande' })
  @ApiResponse({ status: 201, description: 'Gestation créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides ou aucune truie disponible' })
  @ApiResponse({ status: 404, description: 'Bande non trouvée' })
  async createGestation(
    @Body() dto: CreateBatchGestationDto,
    @CurrentUser() user: any,
  ) {
    return await this.gestationService.createGestation(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une gestation (mise bas, avortement, etc.)' })
  @ApiResponse({ status: 200, description: 'Gestation mise à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Gestation non trouvée' })
  async updateGestation(
    @Param('id') id: string,
    @Body() dto: UpdateBatchGestationDto,
    @CurrentUser() user: any,
  ) {
    return await this.gestationService.updateGestation(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une gestation' })
  @ApiResponse({ status: 200, description: 'Gestation supprimée avec succès' })
  @ApiResponse({ status: 404, description: 'Gestation non trouvée' })
  async deleteGestation(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return await this.gestationService.deleteGestation(id, user.id);
  }

  // ==================== LECTURE ====================

  @Get('projet/:projetId')
  @ApiOperation({ summary: 'Récupérer toutes les gestations d\'un projet' })
  @ApiQuery({ name: 'en_cours', required: false, description: 'Filtrer les gestations en cours', type: Boolean })
  @ApiResponse({ status: 200, description: 'Liste des gestations' })
  async getGestationsByProjet(
    @Param('projetId') projetId: string,
    @Query('en_cours') enCours: string,
    @CurrentUser() user: any,
  ) {
    if (enCours === 'true') {
      return await this.gestationService.getGestationsEnCoursByProjet(projetId, user.id);
    }
    return await this.gestationService.getGestationsByProjet(projetId, user.id);
  }

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Récupérer les gestations d\'une bande' })
  @ApiResponse({ status: 200, description: 'Liste des gestations de la bande' })
  async getGestationsByBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() user: any,
  ) {
    return await this.gestationService.getGestationsByBatch(batchId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une gestation par ID' })
  @ApiResponse({ status: 200, description: 'Détails de la gestation' })
  @ApiResponse({ status: 404, description: 'Gestation non trouvée' })
  async getGestationById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return await this.gestationService.getGestationById(id, user.id);
  }

  // ==================== STATISTIQUES ====================

  @Get('stats/projet/:projetId')
  @ApiOperation({ summary: 'Récupérer les statistiques de gestations d\'un projet (mode batch)' })
  @ApiResponse({ status: 200, description: 'Statistiques des gestations' })
  async getStatistiquesGestations(
    @Param('projetId') projetId: string,
    @CurrentUser() user: any,
  ) {
    return await this.gestationService.getStatistiquesGestations(projetId, user.id);
  }

  @Get('stats/taux-survie/:projetId')
  @ApiOperation({ summary: 'Récupérer le taux de survie des porcelets (mode batch)' })
  @ApiResponse({ status: 200, description: 'Taux de survie des porcelets' })
  async getTauxSurvie(
    @Param('projetId') projetId: string,
    @CurrentUser() user: any,
  ) {
    return await this.gestationService.getTauxSurvie(projetId, user.id);
  }
}
