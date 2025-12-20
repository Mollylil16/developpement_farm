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
import { ReproductionService } from './reproduction.service';
import { CreateGestationDto } from './dto/create-gestation.dto';
import { UpdateGestationDto } from './dto/update-gestation.dto';
import { CreateSevrageDto } from './dto/create-sevrage.dto';
import { UpdateSevrageDto } from './dto/update-sevrage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('reproduction')
@Controller('reproduction')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReproductionController {
  constructor(private readonly reproductionService: ReproductionService) {}

  // ==================== GESTATIONS ====================

  @Post('gestations')
  @ApiOperation({ summary: 'Créer une nouvelle gestation' })
  createGestation(@Body() createGestationDto: CreateGestationDto, @CurrentUser() user: any) {
    return this.reproductionService.createGestation(createGestationDto, user.id);
  }

  @Get('gestations')
  @ApiOperation({ summary: "Récupérer toutes les gestations d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiQuery({
    name: 'en_cours',
    required: false,
    description: 'Filtrer les gestations en cours',
    type: Boolean,
  })
  findAllGestations(
    @Query('projet_id') projetId: string,
    @Query('en_cours') enCours: string,
    @CurrentUser() user: any
  ) {
    if (enCours === 'true') {
      return this.reproductionService.findGestationsEnCours(projetId, user.id);
    }
    return this.reproductionService.findAllGestations(projetId, user.id);
  }

  @Get('gestations/:id')
  @ApiOperation({ summary: 'Récupérer une gestation par ID' })
  findOneGestation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reproductionService.findOneGestation(id, user.id);
  }

  @Patch('gestations/:id')
  @ApiOperation({ summary: 'Modifier une gestation' })
  updateGestation(
    @Param('id') id: string,
    @Body() updateGestationDto: UpdateGestationDto,
    @CurrentUser() user: any
  ) {
    return this.reproductionService.updateGestation(id, updateGestationDto, user.id);
  }

  @Delete('gestations/:id')
  @ApiOperation({ summary: 'Supprimer une gestation' })
  deleteGestation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reproductionService.deleteGestation(id, user.id);
  }

  // ==================== SEVRAGES ====================

  @Post('sevrages')
  @ApiOperation({ summary: 'Créer un nouveau sevrage' })
  createSevrage(@Body() createSevrageDto: CreateSevrageDto, @CurrentUser() user: any) {
    return this.reproductionService.createSevrage(createSevrageDto, user.id);
  }

  @Get('sevrages')
  @ApiOperation({ summary: 'Récupérer les sevrages' })
  @ApiQuery({ name: 'projet_id', required: false, description: 'ID du projet' })
  @ApiQuery({ name: 'gestation_id', required: false, description: 'ID de la gestation' })
  findSevrages(
    @Query('projet_id') projetId: string | undefined,
    @Query('gestation_id') gestationId: string | undefined,
    @CurrentUser() user: any
  ) {
    if (gestationId) {
      return this.reproductionService
        .findSevrageByGestation(gestationId, user.id)
        .then((sevrage) => (sevrage ? [sevrage] : []));
    }
    if (projetId) {
      return this.reproductionService.findAllSevrages(projetId, user.id);
    }
    throw new Error('projet_id ou gestation_id requis');
  }

  @Get('sevrages/:id')
  @ApiOperation({ summary: 'Récupérer un sevrage par ID' })
  findOneSevrage(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reproductionService.findOneSevrage(id, user.id);
  }

  @Patch('sevrages/:id')
  @ApiOperation({ summary: 'Modifier un sevrage' })
  updateSevrage(
    @Param('id') id: string,
    @Body() updateSevrageDto: UpdateSevrageDto,
    @CurrentUser() user: any
  ) {
    return this.reproductionService.updateSevrage(id, updateSevrageDto, user.id);
  }

  @Delete('sevrages/:id')
  @ApiOperation({ summary: 'Supprimer un sevrage' })
  deleteSevrage(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reproductionService.deleteSevrage(id, user.id);
  }

  // ==================== STATISTIQUES ====================

  @Get('stats/gestations')
  @ApiOperation({ summary: "Récupérer les statistiques de gestations d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  getStatistiquesGestations(@Query('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.reproductionService.getStatistiquesGestations(projetId, user.id);
  }

  @Get('stats/sevrages')
  @ApiOperation({ summary: "Récupérer les statistiques de sevrages d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  getStatistiquesSevrages(@Query('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.reproductionService.getStatistiquesSevrages(projetId, user.id);
  }

  @Get('stats/taux-survie')
  @ApiOperation({ summary: "Récupérer le taux de survie d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  getTauxSurvie(@Query('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.reproductionService.getTauxSurvie(projetId, user.id);
  }
}
