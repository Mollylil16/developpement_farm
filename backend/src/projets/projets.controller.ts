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
