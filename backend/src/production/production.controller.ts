import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductionService } from './production.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { CreatePeseeDto } from './dto/create-pesee.dto';
import { UpdatePeseeDto } from './dto/update-pesee.dto';
import { PeseesStatsDto } from './dto/pesees-stats.dto';
import { PeseesEvolutionDto } from './dto/pesees-evolution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('production')
@Controller('production')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  // ==================== ANIMAUX ====================

  @Post('animaux')
  @ApiOperation({ summary: 'Créer un nouvel animal' })
  createAnimal(@Body() createAnimalDto: CreateAnimalDto, @CurrentUser() user: any) {
    return this.productionService.createAnimal(createAnimalDto, user.id);
  }

  @Get('animaux')
  @ApiOperation({ summary: "Récupérer tous les animaux d'un projet (avec pagination optionnelle)" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiQuery({
    name: 'inclure_inactifs',
    required: false,
    description: 'Inclure les animaux inactifs',
    type: Boolean,
  })
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
  findAllAnimals(
    @Query('projet_id') projetId: string,
    @Query('inclure_inactifs') inclureInactifs: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const inclureInactifsBool = inclureInactifs !== 'false';
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    return this.productionService.findAllAnimals(
      projetId,
      user.id,
      inclureInactifsBool,
      limitNum,
      offsetNum
    );
  }

  @Get('animaux/:id')
  @ApiOperation({ summary: 'Récupérer un animal par ID' })
  findOneAnimal(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productionService.findOneAnimal(id, user.id);
  }

  @Patch('animaux/:id')
  @ApiOperation({ summary: 'Modifier un animal' })
  updateAnimal(
    @Param('id') id: string,
    @Body() updateAnimalDto: UpdateAnimalDto,
    @CurrentUser() user: any
  ) {
    return this.productionService.updateAnimal(id, updateAnimalDto, user.id);
  }

  @Delete('animaux/:id')
  @ApiOperation({ summary: 'Supprimer un animal' })
  deleteAnimal(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productionService.deleteAnimal(id, user.id);
  }

  // ==================== PESÉES ====================

  @Post('pesees')
  @ApiOperation({ summary: 'Créer une nouvelle pesée' })
  createPesee(@Body() createPeseeDto: CreatePeseeDto, @CurrentUser() user: any) {
    return this.productionService.createPesee(createPeseeDto, user.id);
  }

  @Get('pesees')
  @ApiOperation({ summary: 'Récupérer les pesées' })
  @ApiQuery({ name: 'projet_id', required: false, description: 'ID du projet' })
  @ApiQuery({ name: 'animal_id', required: false, description: "ID de l'animal" })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Nombre maximum de résultats',
    type: Number,
  })
  findPesees(
    @Query('projet_id') projetId: string | undefined,
    @Query('animal_id') animalId: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: any
  ) {
    if (animalId) {
      return this.productionService.findPeseesByAnimal(animalId, user.id);
    }
    if (projetId) {
      const limitNum = limit ? parseInt(limit, 10) : undefined;
      return this.productionService.findPeseesByProjet(projetId, user.id, limitNum);
    }
    throw new Error('projet_id ou animal_id requis');
  }

  @Get('pesees/:id')
  @ApiOperation({ summary: 'Récupérer une pesée par ID' })
  findOnePesee(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productionService.findOnePesee(id, user.id);
  }

  @Patch('pesees/:id')
  @ApiOperation({ summary: 'Modifier une pesée' })
  updatePesee(
    @Param('id') id: string,
    @Body() updatePeseeDto: UpdatePeseeDto,
    @CurrentUser() user: any
  ) {
    return this.productionService.updatePesee(id, updatePeseeDto, user.id);
  }

  @Delete('pesees/:id')
  @ApiOperation({ summary: 'Supprimer une pesée' })
  deletePesee(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productionService.deletePesee(id, user.id);
  }

  // ==================== CALCULS ====================

  @Get('animaux/:id/gmq')
  @ApiOperation({ summary: "Calculer le GMQ (Gain Moyen Quotidien) d'un animal" })
  calculateGMQ(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productionService.calculateGMQ(id, user.id);
  }

  @Post('animaux/:id/recalculer-gmq')
  @ApiOperation({
    summary: "Recalculer le GMQ pour toutes les pesées suivantes d'un animal",
    description:
      'Recalcule le GMQ pour toutes les pesées après une date donnée. Utile après modification d une pesée.',
  })
  @ApiQuery({ name: 'date_modifiee', required: true, description: 'Date de la pesée modifiée (ISO 8601)' })
  recalculerGMQ(
    @Param('id') id: string,
    @Query('date_modifiee') dateModifiee: string,
    @CurrentUser() user: any
  ) {
    return this.productionService.recalculerGMQ(id, dateModifiee, user.id);
  }

  @Get('animaux/:id/evolution-poids')
  @ApiOperation({ summary: "Obtenir l'évolution du poids d'un animal" })
  getAnimalEvolutionPoids(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productionService.getAnimalEvolutionPoids(id, user.id);
  }

  @Get('animaux/:id/poids-estime')
  @ApiOperation({ summary: "Estimer le poids actuel d'un animal" })
  getAnimalPoidsActuelEstime(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productionService.getAnimalPoidsActuelEstime(id, user.id);
  }

  @Get('stats/:projet_id')
  @ApiOperation({ summary: "Obtenir les statistiques de production d'un projet" })
  getProjetStats(@Param('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.productionService.getProjetStats(projetId, user.id);
  }

  @Get('animaux/by-loges')
  @ApiOperation({ summary: 'Récupérer les animaux actifs par nom(s) de loge(s)' })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiQuery({ name: 'loges', required: true, description: 'Noms des loges séparés par des virgules (ex: LogeA,LogeB)' })
  getAnimauxByLoges(
    @Query('projet_id') projetId: string,
    @Query('loges') loges: string,
    @CurrentUser() user: any
  ) {
    const logesList = loges.split(',').map((l) => l.trim()).filter((l) => l.length > 0);
    return this.productionService.getAnimauxByLoges(projetId, logesList, user.id);
  }

  // ==================== STATISTIQUES ET ÉVOLUTION UNIFIÉES ====================

  @Post('pesees/stats')
  @ApiOperation({ summary: 'Calculer les statistiques globales des pesées pour un projet' })
  getPeseesStats(@Body() dto: PeseesStatsDto, @CurrentUser() user: any) {
    return this.productionService.getPeseesStats(
      dto.projet_id,
      dto.mode,
      dto.periode || '30j',
      user.id
    );
  }

  @Post('pesees/evolution')
  @ApiOperation({ summary: 'Récupérer l\'évolution du poids pour un projet' })
  getPeseesEvolution(@Body() dto: PeseesEvolutionDto, @CurrentUser() user: any) {
    return this.productionService.getPeseesEvolution(
      dto.projet_id,
      dto.mode,
      dto.periode || '30j',
      dto.sujet_ids,
      user.id
    );
  }

  @Get('animaux/:id/pesees')
  @ApiOperation({ summary: 'Récupérer les détails complets des pesées d\'un animal avec métriques' })
  getAnimalPeseesDetail(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productionService.getAnimalPeseesDetail(id, user.id);
  }
}
