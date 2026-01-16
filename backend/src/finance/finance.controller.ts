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
import { FinanceService } from './finance.service';
import { CreateChargeFixeDto } from './dto/create-charge-fixe.dto';
import { UpdateChargeFixeDto } from './dto/update-charge-fixe.dto';
import { CreateDepensePonctuelleDto } from './dto/create-depense-ponctuelle.dto';
import { UpdateDepensePonctuelleDto } from './dto/update-depense-ponctuelle.dto';
import { CreateRevenuDto } from './dto/create-revenu.dto';
import { UpdateRevenuDto } from './dto/update-revenu.dto';
import { CreateVentePorcDto } from './dto/create-vente-porc.dto';
import { CoutsProductionDto } from './dto/couts-production.dto';
import { CreateDetteDto } from './dto/create-dette.dto';
import { UpdateDetteDto } from './dto/update-dette.dto';
import { CalculerMargesDto } from './dto/calculer-marges.dto';
import { RecalculerMargesDto } from './dto/recalculer-marges.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('finance')
@Controller('finance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ==================== CHARGES FIXES ====================

  @Post('charges-fixes')
  @ApiOperation({ summary: 'Créer une nouvelle charge fixe' })
  createChargeFixe(@Body() createChargeFixeDto: CreateChargeFixeDto, @CurrentUser() user: any) {
    return this.financeService.createChargeFixe(createChargeFixeDto, user.id);
  }

  @Get('charges-fixes')
  @ApiOperation({ summary: "Récupérer toutes les charges fixes d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  findAllChargesFixes(@Query('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.financeService.findAllChargesFixes(projetId, user.id);
  }

  @Get('charges-fixes/:id')
  @ApiOperation({ summary: 'Récupérer une charge fixe par ID' })
  findOneChargeFixe(@Param('id') id: string, @CurrentUser() user: any) {
    return this.financeService.findOneChargeFixe(id, user.id);
  }

  @Patch('charges-fixes/:id')
  @ApiOperation({ summary: 'Modifier une charge fixe' })
  updateChargeFixe(
    @Param('id') id: string,
    @Body() updateChargeFixeDto: UpdateChargeFixeDto,
    @CurrentUser() user: any
  ) {
    return this.financeService.updateChargeFixe(id, updateChargeFixeDto, user.id);
  }

  @Delete('charges-fixes/:id')
  @ApiOperation({ summary: 'Supprimer une charge fixe' })
  deleteChargeFixe(@Param('id') id: string, @CurrentUser() user: any) {
    return this.financeService.deleteChargeFixe(id, user.id);
  }

  // ==================== DÉPENSES PONCTUELLES ====================

  @Post('depenses-ponctuelles')
  @ApiOperation({ summary: 'Créer une nouvelle dépense ponctuelle' })
  createDepensePonctuelle(
    @Body() createDepensePonctuelleDto: CreateDepensePonctuelleDto,
    @CurrentUser() user: any
  ) {
    return this.financeService.createDepensePonctuelle(createDepensePonctuelleDto, user.id);
  }

  @Get('depenses-ponctuelles')
  @ApiOperation({ summary: "Récupérer toutes les dépenses ponctuelles d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  findAllDepensesPonctuelles(@Query('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.financeService.findAllDepensesPonctuelles(projetId, user.id);
  }

  @Get('depenses-ponctuelles/:id')
  @ApiOperation({ summary: 'Récupérer une dépense ponctuelle par ID' })
  findOneDepensePonctuelle(@Param('id') id: string, @CurrentUser() user: any) {
    return this.financeService.findOneDepensePonctuelle(id, user.id);
  }

  @Patch('depenses-ponctuelles/:id')
  @ApiOperation({ summary: 'Modifier une dépense ponctuelle' })
  updateDepensePonctuelle(
    @Param('id') id: string,
    @Body() updateDepensePonctuelleDto: UpdateDepensePonctuelleDto,
    @CurrentUser() user: any
  ) {
    return this.financeService.updateDepensePonctuelle(id, updateDepensePonctuelleDto, user.id);
  }

  @Delete('depenses-ponctuelles/:id')
  @ApiOperation({ summary: 'Supprimer une dépense ponctuelle' })
  deleteDepensePonctuelle(@Param('id') id: string, @CurrentUser() user: any) {
    return this.financeService.deleteDepensePonctuelle(id, user.id);
  }

  // ==================== REVENUS ====================

  @Post('revenus')
  @UseGuards(PermissionGuard)
  @RequirePermission('finance')
  @ApiOperation({ summary: 'Créer un nouveau revenu' })
  createRevenu(@Body() createRevenuDto: CreateRevenuDto, @CurrentUser() user: any) {
    // Le projetId est extrait automatiquement depuis createRevenuDto.projet_id par le guard
    return this.financeService.createRevenu(createRevenuDto, user.id);
  }

  @Post('ventes-porcs')
  @ApiOperation({
    summary: 'Créer une vente de porc avec validation stricte',
    description:
      'Crée une vente de porc en validant obligatoirement l\'identification des sujets vendus. ' +
      'Met à jour automatiquement le cheptel (statut "vendu", date_vente). ' +
      'En mode individuel : fournir animal_ids. En mode bande : fournir batch_id et quantite.',
  })
  createVentePorc(@Body() createVentePorcDto: CreateVentePorcDto, @CurrentUser() user: any) {
    return this.financeService.createVentePorc(createVentePorcDto, user.id);
  }

  @Get('revenus')
  @ApiOperation({ summary: "Récupérer tous les revenus d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  findAllRevenus(@Query('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.financeService.findAllRevenus(projetId, user.id);
  }

  @Get('revenus/:id')
  @ApiOperation({ summary: 'Récupérer un revenu par ID' })
  findOneRevenu(@Param('id') id: string, @CurrentUser() user: any) {
    return this.financeService.findOneRevenu(id, user.id);
  }

  @Patch('revenus/:id')
  @ApiOperation({ summary: 'Modifier un revenu' })
  updateRevenu(
    @Param('id') id: string,
    @Body() updateRevenuDto: UpdateRevenuDto,
    @CurrentUser() user: any
  ) {
    return this.financeService.updateRevenu(id, updateRevenuDto, user.id);
  }

  @Delete('revenus/:id')
  @ApiOperation({ summary: 'Supprimer un revenu' })
  deleteRevenu(@Param('id') id: string, @CurrentUser() user: any) {
    return this.financeService.deleteRevenu(id, user.id);
  }

  // ==================== CALCUL DES MARGES ====================

  @Post('revenus/:id/calculer-marges')
  @ApiOperation({
    summary: 'Calculer les marges pour une vente',
    description:
      'Calcule les marges OPEX et complètes pour une vente de porc en utilisant les coûts de production calculés sur une période glissante de 30 jours avant la vente.',
  })
  calculerMargesVente(
    @Param('id') id: string,
    @Body() calculerMargesDto: CalculerMargesDto,
    @CurrentUser() user: any
  ) {
    return this.financeService.calculerMargesVente(id, calculerMargesDto.poids_kg, user.id);
  }

  @Post('revenus/recalculer-marges')
  @ApiOperation({
    summary: 'Recalculer les marges pour toutes les ventes d\'une période',
    description:
      'Recalcule les marges OPEX et complètes pour toutes les ventes de porcs d\'une période donnée. Utilise les coûts moyens de la période pour tous les calculs.',
  })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  recalculerMargesPeriode(
    @Query('projet_id') projetId: string,
    @Body() recalculerMargesDto: RecalculerMargesDto,
    @CurrentUser() user: any
  ) {
    return this.financeService.recalculerMargesPeriode(
      projetId,
      recalculerMargesDto.date_debut,
      recalculerMargesDto.date_fin,
      user.id
    );
  }

  // ==================== STATISTIQUES ====================

  @Get('stats/mois-actuel')
  @ApiOperation({ summary: 'Récupérer les statistiques financières du mois en cours' })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  getStatsMoisActuel(@Query('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.financeService.getStatsMoisActuel(projetId, user.id);
  }

  // ==================== CALCUL DES COÛTS DE PRODUCTION ====================

  @Get('couts-production')
  @ApiOperation({
    summary: 'Calculer les coûts de production pour une période',
    description:
      'Calcule les coûts OPEX et CAPEX (amorti) pour une période donnée, utilisés pour calculer les marges sur les ventes.',
  })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiQuery({ name: 'date_debut', required: true, description: 'Date de début (ISO 8601)' })
  @ApiQuery({ name: 'date_fin', required: true, description: 'Date de fin (ISO 8601)' })
  calculerCoutsProduction(
    @Query('projet_id') projetId: string,
    @Query('date_debut') dateDebut: string,
    @Query('date_fin') dateFin: string,
    @CurrentUser() user: any
  ) {
    return this.financeService.calculerCoutsProduction(projetId, dateDebut, dateFin, user.id);
  }

  // ==================== DETTES ====================

  @Post('dettes')
  @UseGuards(PermissionGuard)
  @RequirePermission('finance')
  @ApiOperation({ summary: 'Créer une nouvelle dette' })
  createDette(@Body() createDetteDto: CreateDetteDto, @CurrentUser() user: any) {
    // Le projetId est extrait automatiquement depuis createDetteDto.projet_id par le guard
    return this.financeService.createDette(createDetteDto, user.id);
  }

  @Get('dettes')
  @ApiOperation({ summary: "Récupérer toutes les dettes d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  findAllDettes(@Query('projet_id') projetId: string, @CurrentUser() user: any) {
    return this.financeService.findAllDettes(projetId, user.id);
  }

  @Get('dettes/:id')
  @ApiOperation({ summary: 'Récupérer une dette par ID' })
  findOneDette(@Param('id') id: string, @CurrentUser() user: any) {
    return this.financeService.findOneDette(id, user.id);
  }

  @Patch('dettes/:id')
  @ApiOperation({ summary: 'Mettre à jour une dette' })
  updateDette(
    @Param('id') id: string,
    @Body() updateDetteDto: UpdateDetteDto,
    @CurrentUser() user: any
  ) {
    return this.financeService.updateDette(id, updateDetteDto, user.id);
  }

  @Delete('dettes/:id')
  @ApiOperation({ summary: 'Supprimer une dette' })
  removeDette(@Param('id') id: string, @CurrentUser() user: any) {
    return this.financeService.removeDette(id, user.id);
  }

  // ==================== BILAN COMPLET ====================

  @Get('bilan-complet')
  @ApiOperation({ summary: 'Récupérer le bilan financier complet' })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiQuery({ name: 'date_debut', required: false, description: 'Date de début (ISO)' })
  @ApiQuery({ name: 'date_fin', required: false, description: 'Date de fin (ISO)' })
  getBilanComplet(
    @Query('projet_id') projetId: string,
    @Query('date_debut') dateDebut: string,
    @Query('date_fin') dateFin: string,
    @CurrentUser() user: any
  ) {
    return this.financeService.getBilanComplet(projetId, user.id, dateDebut, dateFin);
  }
}
