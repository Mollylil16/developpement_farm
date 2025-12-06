import { Controller, Get, Param, Query } from '@nestjs/common';
import { StatistiquesSanteService } from './statistiques-sante.service';

@Controller('sante')
export class StatistiquesSanteController {
  constructor(private readonly service: StatistiquesSanteService) {}

  @Get('statistiques/vaccinations')
  getStatistiquesVaccinations(@Query('projet_id') projetId: string) {
    return this.service.getStatistiquesVaccinations(projetId);
  }

  @Get('statistiques/maladies')
  getStatistiquesMaladies(@Query('projet_id') projetId: string) {
    return this.service.getStatistiquesMaladies(projetId);
  }

  @Get('statistiques/traitements')
  getStatistiquesTraitements(@Query('projet_id') projetId: string) {
    return this.service.getStatistiquesTraitements(projetId);
  }

  @Get('couts')
  getCoutsVeterinaires(@Query('projet_id') projetId: string) {
    return this.service.getCoutsVeterinaires(projetId);
  }

  @Get('recommandations')
  getRecommandationsSanitaires(@Query('projet_id') projetId: string) {
    return this.service.getRecommandationsSanitaires(projetId);
  }

  @Get('alertes')
  getAlertesSanitaires(@Query('projet_id') projetId: string) {
    return this.service.getAlertesSanitaires(projetId);
  }

  @Get('historique/animal/:animalId')
  getHistoriqueMedicalAnimal(@Param('animalId') animalId: string) {
    return this.service.getHistoriqueMedicalAnimal(animalId);
  }

  @Get('animaux-temps-attente')
  getAnimauxTempsAttente(@Query('projet_id') projetId: string) {
    return this.service.getAnimauxTempsAttente(projetId);
  }
}

