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
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'mortalites.controller.ts:54',message:'findAll entry',data:{projetId,userId,projetIdType:typeof projetId,userIdType:typeof userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n'); } catch(e) {}
    // #endregion
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    return this.mortalitesService.findAll(projetId, userId, limitNum, offsetNum);
  }

  @Get('statistiques')
  @ApiOperation({ summary: "Récupérer les statistiques de mortalité d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Statistiques de mortalité.' })
  async getStatistiques(@Query('projet_id') projetId: string, @CurrentUser('id') userId: string) {
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'mortalites.controller.ts:69',message:'getStatistiques entry',data:{projetId,userId,projetIdType:typeof projetId,userIdType:typeof userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n'); } catch(e) {}
    // #endregion
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
