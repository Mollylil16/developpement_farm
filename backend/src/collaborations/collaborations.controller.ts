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
import { CollaborationsService } from './collaborations.service';
import { CreateCollaborateurDto } from './dto/create-collaborateur.dto';
import { UpdateCollaborateurDto } from './dto/update-collaborateur.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('collaborations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('collaborations')
export class CollaborationsController {
  constructor(private readonly collaborationsService: CollaborationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un nouveau collaborateur' })
  @ApiResponse({ status: 201, description: 'Collaborateur créé avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 403, description: "Vous n'êtes pas propriétaire de ce projet." })
  async create(
    @Body() createCollaborateurDto: CreateCollaborateurDto,
    @CurrentUser('id') userId: string
  ) {
    return this.collaborationsService.create(createCollaborateurDto, userId);
  }

  @Get()
  @ApiOperation({ summary: "Récupérer tous les collaborateurs d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des collaborateurs.' })
  async findAll(@Query('projet_id') projetId: string, @CurrentUser('id') userId: string) {
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'collaborations.controller.ts:45',message:'findAll entry',data:{projetId,userId,projetIdType:typeof projetId,userIdType:typeof userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'); } catch(e) {}
    // #endregion
    return this.collaborationsService.findAll(projetId, userId);
  }

  @Get('actuel')
  @ApiOperation({ summary: 'Récupérer le collaborateur actuel pour un projet' })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Collaborateur actuel.' })
  @ApiResponse({ status: 404, description: 'Aucun collaborateur actif trouvé.' })
  async findCollaborateurActuel(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.collaborationsService.findCollaborateurActuel(userId, projetId);
  }

  @Get('invitations')
  @ApiOperation({ summary: "Récupérer les invitations en attente pour l'utilisateur" })
  @ApiQuery({ name: 'email', required: false, description: "Email de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Liste des invitations en attente.' })
  async findInvitationsEnAttente(
    @CurrentUser('id') userId: string,
    @Query('email') email?: string
  ) {
    // Récupérer l'email de l'utilisateur si non fourni
    let userEmail = email;
    if (!userEmail) {
      // TODO: Récupérer l'email depuis la base de données
      // Pour l'instant, on utilise seulement userId
    }
    return this.collaborationsService.findInvitationsEnAttente(userId, userEmail);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un collaborateur par son ID' })
  @ApiResponse({ status: 200, description: 'Détails du collaborateur.' })
  @ApiResponse({ status: 404, description: 'Collaborateur introuvable.' })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.collaborationsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un collaborateur' })
  @ApiResponse({ status: 200, description: 'Collaborateur mis à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Collaborateur introuvable.' })
  async update(
    @Param('id') id: string,
    @Body() updateCollaborateurDto: UpdateCollaborateurDto,
    @CurrentUser('id') userId: string
  ) {
    return this.collaborationsService.update(id, updateCollaborateurDto, userId);
  }

  @Patch(':id/accepter')
  @ApiOperation({ summary: 'Accepter une invitation de collaboration' })
  @ApiResponse({ status: 200, description: 'Invitation acceptée avec succès.' })
  @ApiResponse({ status: 404, description: 'Invitation introuvable.' })
  @ApiResponse({ status: 400, description: "Cette invitation n'est plus en attente." })
  async accepterInvitation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.collaborationsService.accepterInvitation(id, userId);
  }

  @Patch(':id/rejeter')
  @ApiOperation({ summary: 'Rejeter une invitation de collaboration' })
  @ApiResponse({ status: 200, description: 'Invitation rejetée avec succès.' })
  @ApiResponse({ status: 404, description: 'Invitation introuvable.' })
  async rejeterInvitation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.collaborationsService.rejeterInvitation(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un collaborateur' })
  @ApiResponse({ status: 204, description: 'Collaborateur supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Collaborateur introuvable.' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.collaborationsService.delete(id, userId);
  }
}
