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
import { SanteService } from './sante.service';
import { CreateCalendrierVaccinationDto } from './dto/create-calendrier-vaccination.dto';
import { UpdateCalendrierVaccinationDto } from './dto/update-calendrier-vaccination.dto';
import { CreateVaccinationDto } from './dto/create-vaccination.dto';
import { UpdateVaccinationDto } from './dto/update-vaccination.dto';
import { CreateMaladieDto } from './dto/create-maladie.dto';
import { UpdateMaladieDto } from './dto/update-maladie.dto';
import { CreateTraitementDto } from './dto/create-traitement.dto';
import { UpdateTraitementDto } from './dto/update-traitement.dto';
import { CreateVisiteVeterinaireDto } from './dto/create-visite-veterinaire.dto';
import { UpdateVisiteVeterinaireDto } from './dto/update-visite-veterinaire.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('sante')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sante')
export class SanteController {
  constructor(private readonly santeService: SanteService) {}

  // ==================== CALENDRIER VACCINATIONS ====================

  @Post('calendrier-vaccinations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un calendrier de vaccination' })
  @ApiResponse({ status: 201, description: 'Calendrier créé avec succès.' })
  async createCalendrierVaccination(
    @Body() createCalendrierVaccinationDto: CreateCalendrierVaccinationDto,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.createCalendrierVaccination(createCalendrierVaccinationDto, userId);
  }

  @Get('calendrier-vaccinations')
  @ApiOperation({ summary: "Récupérer tous les calendriers de vaccination d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des calendriers.' })
  async findAllCalendrierVaccinations(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.findAllCalendrierVaccinations(projetId, userId);
  }

  @Get('calendrier-vaccinations/:id')
  @ApiOperation({ summary: 'Récupérer un calendrier de vaccination par son ID' })
  @ApiResponse({ status: 200, description: 'Détails du calendrier.' })
  @ApiResponse({ status: 404, description: 'Calendrier introuvable.' })
  async findOneCalendrierVaccination(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.santeService.findOneCalendrierVaccination(id, userId);
  }

  @Patch('calendrier-vaccinations/:id')
  @ApiOperation({ summary: 'Mettre à jour un calendrier de vaccination' })
  @ApiResponse({ status: 200, description: 'Calendrier mis à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Calendrier introuvable.' })
  async updateCalendrierVaccination(
    @Param('id') id: string,
    @Body() updateCalendrierVaccinationDto: UpdateCalendrierVaccinationDto,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.updateCalendrierVaccination(
      id,
      updateCalendrierVaccinationDto,
      userId
    );
  }

  @Delete('calendrier-vaccinations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un calendrier de vaccination' })
  @ApiResponse({ status: 204, description: 'Calendrier supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Calendrier introuvable.' })
  async deleteCalendrierVaccination(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.santeService.deleteCalendrierVaccination(id, userId);
  }

  // ==================== VACCINATIONS ====================

  @Post('vaccinations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une vaccination' })
  @ApiResponse({ status: 201, description: 'Vaccination créée avec succès.' })
  async createVaccination(
    @Body() createVaccinationDto: CreateVaccinationDto,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.createVaccination(createVaccinationDto, userId);
  }

  @Get('vaccinations')
  @ApiOperation({ summary: "Récupérer toutes les vaccinations d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des vaccinations.' })
  async findAllVaccinations(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'sante.controller.ts:110',message:'findAllVaccinations entry',data:{projetId,userId,projetIdType:typeof projetId,userIdType:typeof userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'); } catch(e) {}
    // #endregion
    return this.santeService.findAllVaccinations(projetId, userId);
  }

  @Get('vaccinations/en-retard')
  @ApiOperation({ summary: 'Récupérer les vaccinations en retard' })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des vaccinations en retard.' })
  async findVaccinationsEnRetard(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.findVaccinationsEnRetard(projetId, userId);
  }

  @Get('vaccinations/a-venir')
  @ApiOperation({ summary: 'Récupérer les vaccinations à venir' })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des vaccinations à venir.' })
  async findVaccinationsAVenir(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.findVaccinationsAVenir(projetId, userId);
  }

  @Get('vaccinations/:id')
  @ApiOperation({ summary: 'Récupérer une vaccination par son ID' })
  @ApiResponse({ status: 200, description: 'Détails de la vaccination.' })
  @ApiResponse({ status: 404, description: 'Vaccination introuvable.' })
  async findOneVaccination(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.santeService.findOneVaccination(id, userId);
  }

  @Patch('vaccinations/:id')
  @ApiOperation({ summary: 'Mettre à jour une vaccination' })
  @ApiResponse({ status: 200, description: 'Vaccination mise à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Vaccination introuvable.' })
  async updateVaccination(
    @Param('id') id: string,
    @Body() updateVaccinationDto: UpdateVaccinationDto,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.updateVaccination(id, updateVaccinationDto, userId);
  }

  @Delete('vaccinations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une vaccination' })
  @ApiResponse({ status: 204, description: 'Vaccination supprimée avec succès.' })
  @ApiResponse({ status: 404, description: 'Vaccination introuvable.' })
  async deleteVaccination(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.santeService.deleteVaccination(id, userId);
  }

  // ==================== MALADIES ====================

  @Post('maladies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une maladie' })
  @ApiResponse({ status: 201, description: 'Maladie créée avec succès.' })
  async createMaladie(
    @Body() createMaladieDto: CreateMaladieDto,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.createMaladie(createMaladieDto, userId);
  }

  @Get('maladies')
  @ApiOperation({ summary: "Récupérer toutes les maladies d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des maladies.' })
  async findAllMaladies(@Query('projet_id') projetId: string, @CurrentUser('id') userId: string) {
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'sante.controller.ts:185',message:'findAllMaladies entry',data:{projetId,userId,projetIdType:typeof projetId,userIdType:typeof userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n'); } catch(e) {}
    // #endregion
    return this.santeService.findAllMaladies(projetId, userId);
  }

  @Get('maladies/en-cours')
  @ApiOperation({ summary: 'Récupérer les maladies en cours' })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des maladies en cours.' })
  async findMaladiesEnCours(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.findMaladiesEnCours(projetId, userId);
  }

  @Get('maladies/:id')
  @ApiOperation({ summary: 'Récupérer une maladie par son ID' })
  @ApiResponse({ status: 200, description: 'Détails de la maladie.' })
  @ApiResponse({ status: 404, description: 'Maladie introuvable.' })
  async findOneMaladie(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.santeService.findOneMaladie(id, userId);
  }

  @Patch('maladies/:id')
  @ApiOperation({ summary: 'Mettre à jour une maladie' })
  @ApiResponse({ status: 200, description: 'Maladie mise à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Maladie introuvable.' })
  async updateMaladie(
    @Param('id') id: string,
    @Body() updateMaladieDto: UpdateMaladieDto,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.updateMaladie(id, updateMaladieDto, userId);
  }

  @Delete('maladies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une maladie' })
  @ApiResponse({ status: 204, description: 'Maladie supprimée avec succès.' })
  @ApiResponse({ status: 404, description: 'Maladie introuvable.' })
  async deleteMaladie(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.santeService.deleteMaladie(id, userId);
  }

  // ==================== TRAITEMENTS ====================

  @Post('traitements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un traitement' })
  @ApiResponse({ status: 201, description: 'Traitement créé avec succès.' })
  async createTraitement(
    @Body() createTraitementDto: CreateTraitementDto,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.createTraitement(createTraitementDto, userId);
  }

  @Get('traitements')
  @ApiOperation({ summary: "Récupérer tous les traitements d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des traitements.' })
  async findAllTraitements(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.findAllTraitements(projetId, userId);
  }

  @Get('traitements/en-cours')
  @ApiOperation({ summary: 'Récupérer les traitements en cours' })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des traitements en cours.' })
  async findTraitementsEnCours(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.findTraitementsEnCours(projetId, userId);
  }

  @Get('traitements/:id')
  @ApiOperation({ summary: 'Récupérer un traitement par son ID' })
  @ApiResponse({ status: 200, description: 'Détails du traitement.' })
  @ApiResponse({ status: 404, description: 'Traitement introuvable.' })
  async findOneTraitement(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.santeService.findOneTraitement(id, userId);
  }

  @Patch('traitements/:id')
  @ApiOperation({ summary: 'Mettre à jour un traitement' })
  @ApiResponse({ status: 200, description: 'Traitement mis à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Traitement introuvable.' })
  async updateTraitement(
    @Param('id') id: string,
    @Body() updateTraitementDto: UpdateTraitementDto,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.updateTraitement(id, updateTraitementDto, userId);
  }

  @Delete('traitements/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un traitement' })
  @ApiResponse({ status: 204, description: 'Traitement supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Traitement introuvable.' })
  async deleteTraitement(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.santeService.deleteTraitement(id, userId);
  }

  // ==================== VISITES VÉTÉRINAIRES ====================

  @Post('visites-veterinaires')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une visite vétérinaire' })
  @ApiResponse({ status: 201, description: 'Visite créée avec succès.' })
  async createVisiteVeterinaire(
    @Body() createVisiteVeterinaireDto: CreateVisiteVeterinaireDto,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.createVisiteVeterinaire(createVisiteVeterinaireDto, userId);
  }

  @Get('visites-veterinaires')
  @ApiOperation({ summary: "Récupérer toutes les visites vétérinaires d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des visites.' })
  async findAllVisitesVeterinaires(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.findAllVisitesVeterinaires(projetId, userId);
  }

  @Get('visites-veterinaires/:id')
  @ApiOperation({ summary: 'Récupérer une visite vétérinaire par son ID' })
  @ApiResponse({ status: 200, description: 'Détails de la visite.' })
  @ApiResponse({ status: 404, description: 'Visite introuvable.' })
  async findOneVisiteVeterinaire(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.santeService.findOneVisiteVeterinaire(id, userId);
  }

  @Patch('visites-veterinaires/:id')
  @ApiOperation({ summary: 'Mettre à jour une visite vétérinaire' })
  @ApiResponse({ status: 200, description: 'Visite mise à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Visite introuvable.' })
  async updateVisiteVeterinaire(
    @Param('id') id: string,
    @Body() updateVisiteVeterinaireDto: UpdateVisiteVeterinaireDto,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.updateVisiteVeterinaire(id, updateVisiteVeterinaireDto, userId);
  }

  @Delete('visites-veterinaires/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une visite vétérinaire' })
  @ApiResponse({ status: 204, description: 'Visite supprimée avec succès.' })
  @ApiResponse({ status: 404, description: 'Visite introuvable.' })
  async deleteVisiteVeterinaire(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.santeService.deleteVisiteVeterinaire(id, userId);
  }

  // ==================== RAPPELS VACCINATIONS ====================

  @Get('rappels-vaccinations')
  @ApiOperation({ summary: "Récupérer les rappels de vaccination d'une vaccination" })
  @ApiQuery({ name: 'vaccination_id', required: true, description: 'ID de la vaccination' })
  @ApiResponse({ status: 200, description: 'Liste des rappels.' })
  async findRappelsByVaccination(
    @Query('vaccination_id') vaccinationId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.findRappelsByVaccination(vaccinationId, userId);
  }

  @Get('rappels-vaccinations/a-venir')
  @ApiOperation({ summary: "Récupérer les rappels à venir d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des rappels à venir.' })
  async findRappelsAVenir(@Query('projet_id') projetId: string, @CurrentUser('id') userId: string) {
    return this.santeService.findRappelsAVenir(projetId, userId);
  }

  @Get('rappels-vaccinations/en-retard')
  @ApiOperation({ summary: "Récupérer les rappels en retard d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des rappels en retard.' })
  async findRappelsEnRetard(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.findRappelsEnRetard(projetId, userId);
  }

  @Patch('rappels-vaccinations/:id/marquer-envoye')
  @ApiOperation({ summary: 'Marquer un rappel comme envoyé' })
  @ApiResponse({ status: 200, description: 'Rappel marqué comme envoyé.' })
  @ApiResponse({ status: 404, description: 'Rappel introuvable.' })
  async marquerRappelEnvoye(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.santeService.marquerRappelEnvoye(id, userId);
  }

  // ==================== STATISTIQUES ====================

  @Get('stats/vaccinations')
  @ApiOperation({ summary: "Récupérer les statistiques de vaccinations d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Statistiques de vaccinations.' })
  async getStatistiquesVaccinations(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.getStatistiquesVaccinations(projetId, userId);
  }

  @Get('stats/maladies')
  @ApiOperation({ summary: "Récupérer les statistiques de maladies d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Statistiques de maladies.' })
  async getStatistiquesMaladies(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.getStatistiquesMaladies(projetId, userId);
  }

  @Get('stats/traitements')
  @ApiOperation({ summary: "Récupérer les statistiques de traitements d'un projet" })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Statistiques de traitements.' })
  async getStatistiquesTraitements(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.getStatistiquesTraitements(projetId, userId);
  }

  // ==================== INITIALISATION PROTOCOLES ====================

  @Post('calendrier-vaccinations/init-standard')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initialiser les protocoles de vaccination standard pour un projet' })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 201, description: 'Protocoles initialisés avec succès.' })
  async initProtocolesVaccinationStandard(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.initProtocolesVaccinationStandard(projetId, userId);
  }

  // ==================== RECOMMANDATIONS SANITAIRES ====================

  @Get('recommandations')
  @ApiOperation({
    summary: "Obtenir les recommandations sanitaires d'un projet",
    description:
      'Génère des recommandations basées sur les vaccinations en retard, maladies en cours, traitements, etc.',
  })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des recommandations sanitaires.' })
  async getRecommandations(@Query('projet_id') projetId: string, @CurrentUser('id') userId: string) {
    return this.santeService.getRecommandations(projetId, userId);
  }

  @Get('taux-mortalite-par-cause')
  @ApiOperation({
    summary: "Obtenir le taux de mortalité par cause d'un projet",
  })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Taux de mortalité par cause.' })
  async getTauxMortaliteParCause(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.getTauxMortaliteParCause(projetId, userId);
  }

  @Get('historique-animal/:animalId')
  @ApiOperation({
    summary: "Obtenir l'historique médical complet d'un animal",
  })
  @ApiResponse({ status: 200, description: "Historique médical de l'animal." })
  async getHistoriqueAnimal(
    @Param('animalId') animalId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.getHistoriqueAnimal(animalId, userId);
  }

  @Get('animaux-en-attente')
  @ApiOperation({
    summary: "Obtenir les animaux en période d'attente avant abattage",
    description:
      'Récupère tous les animaux qui ont reçu un traitement avec temps d attente et qui sont encore en période d attente.',
  })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Liste des animaux en attente.' })
  async getAnimauxEnAttente(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.getAnimauxEnAttente(projetId, userId);
  }

  // ==================== COÛTS VÉTÉRINAIRES ====================

  @Get('couts-veterinaires')
  @ApiOperation({
    summary: "Obtenir les coûts vétérinaires totaux d'un projet",
  })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiResponse({ status: 200, description: 'Coûts vétérinaires totaux.' })
  async getCoutsVeterinaires(
    @Query('projet_id') projetId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.getCoutsVeterinaires(projetId, userId);
  }

  @Get('couts-veterinaires/periode')
  @ApiOperation({
    summary: "Obtenir les coûts vétérinaires sur une période donnée",
  })
  @ApiQuery({ name: 'projet_id', required: true, description: 'ID du projet' })
  @ApiQuery({ name: 'date_debut', required: true, description: 'Date de début (ISO 8601)' })
  @ApiQuery({ name: 'date_fin', required: true, description: 'Date de fin (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Coûts vétérinaires de la période.' })
  async getCoutsVeterinairesPeriode(
    @Query('projet_id') projetId: string,
    @Query('date_debut') dateDebut: string,
    @Query('date_fin') dateFin: string,
    @CurrentUser('id') userId: string
  ) {
    return this.santeService.getCoutsVeterinairesPeriode(projetId, dateDebut, dateFin, userId);
  }
}
