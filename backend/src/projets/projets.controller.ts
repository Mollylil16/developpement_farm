import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
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
  constructor(private readonly projetsService: ProjetsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau projet' })
  create(@Body() createProjetDto: CreateProjetDto, @CurrentUser() user: any) {
    console.log('🐛 [ProjetsController] Données reçues pour création projet:', {
      userId: user.id,
      body: createProjetDto,
      types: {
        nom: typeof createProjetDto.nom,
        nombre_truies: typeof createProjetDto.nombre_truies,
        nombre_verrats: typeof createProjetDto.nombre_verrats,
        nombre_porcelets: typeof createProjetDto.nombre_porcelets,
        poids_moyen_actuel: typeof createProjetDto.poids_moyen_actuel,
        age_moyen_actuel: typeof createProjetDto.age_moyen_actuel,
      }
    });
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
