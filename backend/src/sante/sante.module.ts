import { Module } from '@nestjs/common';
import { VaccinationsController } from './vaccinations.controller';
import { MaladiesController } from './maladies.controller';
import { TraitementsController } from './traitements.controller';
import { VisitesVeterinairesController } from './visites-veterinaires.controller';
import { CalendrierVaccinationsController } from './calendrier-vaccinations.controller';
import { RappelsVaccinationsController } from './rappels-vaccinations.controller';
import { StatistiquesSanteController } from './statistiques-sante.controller';
import { VaccinationsService } from './vaccinations.service';
import { MaladiesService } from './maladies.service';
import { TraitementsService } from './traitements.service';
import { VisitesVeterinairesService } from './visites-veterinaires.service';
import { CalendrierVaccinationsService } from './calendrier-vaccinations.service';
import { RappelsVaccinationsService } from './rappels-vaccinations.service';
import { StatistiquesSanteService } from './statistiques-sante.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    VaccinationsController,
    MaladiesController,
    TraitementsController,
    VisitesVeterinairesController,
    CalendrierVaccinationsController,
    RappelsVaccinationsController,
    StatistiquesSanteController,
  ],
  providers: [
    VaccinationsService,
    MaladiesService,
    TraitementsService,
    VisitesVeterinairesService,
    CalendrierVaccinationsService,
    RappelsVaccinationsService,
    StatistiquesSanteService,
  ],
  exports: [
    VaccinationsService,
    MaladiesService,
    TraitementsService,
    VisitesVeterinairesService,
    CalendrierVaccinationsService,
    RappelsVaccinationsService,
    StatistiquesSanteService,
  ],
})
export class SanteModule {}

