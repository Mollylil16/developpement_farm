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
import { PlanificationsService } from './planifications.service';
import { CreatePlanificationDto } from './dto/create-planification.dto';
import { UpdatePlanificationDto } from './dto/update-planification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('planifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planifications')
export class PlanificationsController {
  constructor(private readonly planificationsService: PlanificationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle planification' })
  @ApiResponse({ status: 201, description: 'Planification créée avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 403, description: "Vous n'êtes pas propriétaire de ce projet." })
  async create(
    @Body() createPlanificationDto: CreatePlanificationDto,
    @CurrentUser('id') userId: string
  ) {
    return this.planificationsService.create(createPlanificationDto, userId);
  }

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer plusieurs planifications en batch' })
  @ApiResponse({ status: 201, description: 'Planifications créées avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  async createBatch(
    @Body() createPlanificationDtos: CreatePlanificationDto[],
    @CurrentUser('id') userId: string
  ) {
    return this.planificationsService.createBatch(createPlanificationDtos, userId);
  }

  @Get()
  @ApiOperation({ summary: "Récupérer toutes les planifications d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des planifications.' })
  async findAll(@Query('projet_id') projetId: string, @CurrentUser('id') userId: string) {
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'planifications.controller.ts:57',message:'findAll entry',data:{projetId,userId,projetIdType:typeof projetId,userIdType:typeof userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'); } catch(e) {}
    // #endregion
    return this.planificationsService.findAll(projetId, userId);
  }

  @Get('a-venir')
  @ApiOperation({ summary: 'Récupérer les planifications à venir' })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiQuery({
    name: 'jours',
    required: false,
    type: Number,
    description: 'Nombre de jours à venir (défaut: 7)',
  })
  @ApiResponse({ status: 200, description: 'Liste des planifications à venir.' })
  async findAVenir(
    @Query('projet_id') projetId: string,
    @Query('jours') jours: string,
    @CurrentUser('id') userId: string
  ) {
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'planifications.controller.ts:71',message:'findAVenir entry',data:{projetId,userId,projetIdType:typeof projetId,userIdType:typeof userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'); } catch(e) {}
    // #endregion
    const joursNum = jours ? parseInt(jours, 10) : 7;
    return this.planificationsService.findAVenir(projetId, userId, joursNum);
  }

  @Get('en-retard')
  @ApiOperation({ summary: 'Récupérer les planifications en retard' })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des planifications en retard.' })
  async findEnRetard(@Query('projet_id') projetId: string, @CurrentUser('id') userId: string) {
    return this.planificationsService.findEnRetard(projetId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une planification par son ID' })
  @ApiResponse({ status: 200, description: 'Détails de la planification.' })
  @ApiResponse({ status: 404, description: 'Planification introuvable.' })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.planificationsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une planification' })
  @ApiResponse({ status: 200, description: 'Planification mise à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Planification introuvable.' })
  async update(
    @Param('id') id: string,
    @Body() updatePlanificationDto: UpdatePlanificationDto,
    @CurrentUser('id') userId: string
  ) {
    return this.planificationsService.update(id, updatePlanificationDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une planification' })
  @ApiResponse({ status: 204, description: 'Planification supprimée avec succès.' })
  @ApiResponse({ status: 404, description: 'Planification introuvable.' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.planificationsService.delete(id, userId);
  }
}
