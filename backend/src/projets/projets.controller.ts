import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjetsService } from './projets.service';
import { CreateProjetDto } from './dto/create-projet.dto';
import { UpdateProjetDto } from './dto/update-projet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('projets')
@Controller('projets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjetsController {
  private readonly logger = new Logger(ProjetsController.name);

  constructor(private readonly projetsService: ProjetsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau projet' })
  create(@Body() createProjetDto: CreateProjetDto, @CurrentUser() user: any) {
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'projets.controller.ts:20',message:'create projet entry',data:{userId:user?.id,userIdType:typeof user?.id,userIdLength:user?.id?.length,userIdJSON:JSON.stringify(user?.id),userIdCharCodes:user?.id?.split('').map(c=>c.charCodeAt(0)),userKeys:user?Object.keys(user):[],nom:createProjetDto.nom},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})+'\n'); } catch(e) {}
    // #endregion
    this.logger.debug(`Création projet: userId=${user.id}, nom=${createProjetDto.nom}`);
    return this.projetsService.create(createProjetDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: "Récupérer tous les projets de l'utilisateur" })
  findAll(@CurrentUser() user: any) {
    return this.projetsService.findAll(user.id);
  }

  @Get('actif')
  @ApiOperation({ summary: "Récupérer le projet actif de l'utilisateur" })
  findActive(@CurrentUser() user: any) {
    return this.projetsService.findActive(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un projet par ID' })
  findOne(@Param('id') id: string) {
    return this.projetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un projet' })
  update(
    @Param('id') id: string,
    @Body() updateProjetDto: UpdateProjetDto,
    @CurrentUser() user: any
  ) {
    return this.projetsService.update(id, updateProjetDto, user.id);
  }

  @Patch(':id/activer')
  @ApiOperation({ summary: 'Activer un projet (et archiver les autres)' })
  switchActive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projetsService.switchActive(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un projet' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projetsService.remove(id, user.id);
  }
}
