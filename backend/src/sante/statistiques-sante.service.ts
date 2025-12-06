import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class StatistiquesSanteService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Statistiques des vaccinations
   */
  async getStatistiquesVaccinations(projetId: string): Promise<any> {
    const total = await this.databaseService.query(
      'SELECT COUNT(*) as count FROM vaccinations WHERE projet_id = $1',
      [projetId],
    );

    const effectuees = await this.databaseService.query(
      "SELECT COUNT(*) as count FROM vaccinations WHERE projet_id = $1 AND statut = 'effectue'",
      [projetId],
    );

    const enAttente = await this.databaseService.query(
      "SELECT COUNT(*) as count FROM vaccinations WHERE projet_id = $1 AND statut = 'planifie'",
      [projetId],
    );

    const now = new Date().toISOString().split('T')[0];
    const enRetard = await this.databaseService.query(
      `SELECT COUNT(*) as count FROM vaccinations 
       WHERE projet_id = $1 AND statut = 'planifie' AND date_vaccination < $2`,
      [projetId, now],
    );

    const cout = await this.databaseService.query(
      'SELECT COALESCE(SUM(cout), 0) as total FROM vaccinations WHERE projet_id = $1',
      [projetId],
    );

    const totalCount = total.rows[0]?.count || 0;
    const effectueesCount = effectuees.rows[0]?.count || 0;

    return {
      total: totalCount,
      effectuees: effectueesCount,
      enAttente: enAttente.rows[0]?.count || 0,
      enRetard: enRetard.rows[0]?.count || 0,
      tauxCouverture: totalCount > 0 ? (effectueesCount / totalCount) * 100 : 0,
      coutTotal: cout.rows[0]?.total || 0,
    };
  }

  /**
   * Statistiques des maladies
   */
  async getStatistiquesMaladies(projetId: string): Promise<any> {
    const total = await this.databaseService.query(
      'SELECT COUNT(*) as count FROM maladies WHERE projet_id = $1',
      [projetId],
    );

    const enCours = await this.databaseService.query(
      'SELECT COUNT(*) as count FROM maladies WHERE projet_id = $1 AND gueri = false',
      [projetId],
    );

    const gueries = await this.databaseService.query(
      'SELECT COUNT(*) as count FROM maladies WHERE projet_id = $1 AND gueri = true',
      [projetId],
    );

    const parType = await this.databaseService.query(
      'SELECT type, COUNT(*) as count FROM maladies WHERE projet_id = $1 GROUP BY type',
      [projetId],
    );

    const parGravite = await this.databaseService.query(
      'SELECT gravite, COUNT(*) as count FROM maladies WHERE projet_id = $1 GROUP BY gravite',
      [projetId],
    );

    const totalCount = total.rows[0]?.count || 0;
    const gueriesCount = gueries.rows[0]?.count || 0;

    return {
      total: totalCount,
      enCours: enCours.rows[0]?.count || 0,
      gueries: gueriesCount,
      parType: parType.rows.reduce((acc: any, item: any) => ({ ...acc, [item.type]: item.count }), {}),
      parGravite: parGravite.rows.reduce((acc: any, item: any) => ({ ...acc, [item.gravite]: item.count }), {}),
      tauxGuerison: totalCount > 0 ? (gueriesCount / totalCount) * 100 : 0,
    };
  }

  /**
   * Statistiques des traitements
   */
  async getStatistiquesTraitements(projetId: string): Promise<any> {
    const total = await this.databaseService.query(
      'SELECT COUNT(*) as count FROM traitements WHERE projet_id = $1',
      [projetId],
    );

    const enCours = await this.databaseService.query(
      'SELECT COUNT(*) as count FROM traitements WHERE projet_id = $1 AND termine = false',
      [projetId],
    );

    const termines = await this.databaseService.query(
      'SELECT COUNT(*) as count FROM traitements WHERE projet_id = $1 AND termine = true',
      [projetId],
    );

    const cout = await this.databaseService.query(
      'SELECT COALESCE(SUM(cout), 0) as total FROM traitements WHERE projet_id = $1',
      [projetId],
    );

    const efficacite = await this.databaseService.query(
      'SELECT COALESCE(AVG(efficacite), 0) as avg FROM traitements WHERE projet_id = $1 AND efficacite IS NOT NULL',
      [projetId],
    );

    return {
      total: total.rows[0]?.count || 0,
      enCours: enCours.rows[0]?.count || 0,
      termines: termines.rows[0]?.count || 0,
      coutTotal: cout.rows[0]?.total || 0,
      efficaciteMoyenne: efficacite.rows[0]?.avg || 0,
    };
  }

  /**
   * Coûts vétérinaires totaux
   */
  async getCoutsVeterinaires(projetId: string): Promise<any> {
    const coutVaccinations = await this.databaseService.query(
      'SELECT COALESCE(SUM(cout), 0) as total FROM vaccinations WHERE projet_id = $1',
      [projetId],
    );

    const coutTraitements = await this.databaseService.query(
      'SELECT COALESCE(SUM(cout), 0) as total FROM traitements WHERE projet_id = $1',
      [projetId],
    );

    const coutVisites = await this.databaseService.query(
      'SELECT COALESCE(SUM(cout), 0) as total FROM visites_veterinaires WHERE projet_id = $1',
      [projetId],
    );

    const totalVaccinations = coutVaccinations.rows[0]?.total || 0;
    const totalTraitements = coutTraitements.rows[0]?.total || 0;
    const totalVisites = coutVisites.rows[0]?.total || 0;

    return {
      vaccinations: totalVaccinations,
      traitements: totalTraitements,
      visites: totalVisites,
      total: totalVaccinations + totalTraitements + totalVisites,
    };
  }

  /**
   * Recommandations sanitaires basées sur l'historique
   */
  async getRecommandationsSanitaires(projetId: string): Promise<any[]> {
    const recommendations: any[] = [];

    // Vérifier les rappels en retard
    const rappelsEnRetard = await this.databaseService.query(
      `SELECT r.* FROM rappels_vaccinations r
       INNER JOIN vaccinations v ON r.vaccination_id = v.id
       WHERE v.projet_id = $1
       AND r.date_rappel < CURRENT_DATE
       AND (r.envoi = false OR r.envoi IS NULL)`,
      [projetId],
    );

    if (rappelsEnRetard.rows.length > 0) {
      recommendations.push({
        type: 'vaccination',
        priorite: 'haute',
        message: `${rappelsEnRetard.rows.length} rappel(s) de vaccination en retard`,
        data: { rappels: rappelsEnRetard.rows },
      });
    }

    // Vérifier les rappels à venir
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + 7);
    const rappelsAVenir = await this.databaseService.query(
      `SELECT r.* FROM rappels_vaccinations r
       INNER JOIN vaccinations v ON r.vaccination_id = v.id
       WHERE v.projet_id = $1
       AND r.date_rappel >= CURRENT_DATE
       AND r.date_rappel <= $2`,
      [projetId, dateLimite.toISOString().split('T')[0]],
    );

    if (rappelsAVenir.rows.length > 0) {
      recommendations.push({
        type: 'vaccination',
        priorite: 'moyenne',
        message: `${rappelsAVenir.rows.length} vaccination(s) prévue(s) cette semaine`,
        data: { rappels: rappelsAVenir.rows },
      });
    }

    // Vérifier les maladies en cours
    const maladiesEnCours = await this.databaseService.query(
      'SELECT * FROM maladies WHERE projet_id = $1 AND gueri = false',
      [projetId],
    );

    if (maladiesEnCours.rows.length > 0) {
      const critiques = maladiesEnCours.rows.filter((m: any) => m.gravite === 'critique');
      if (critiques.length > 0) {
        recommendations.push({
          type: 'alerte',
          priorite: 'haute',
          message: `${critiques.length} maladie(s) critique(s) en cours`,
          data: { maladies: critiques },
        });
      }
    }

    // Vérifier les traitements en cours
    const traitementsEnCours = await this.databaseService.query(
      'SELECT * FROM traitements WHERE projet_id = $1 AND termine = false',
      [projetId],
    );

    if (traitementsEnCours.rows.length > 0) {
      recommendations.push({
        type: 'traitement',
        priorite: 'moyenne',
        message: `${traitementsEnCours.rows.length} traitement(s) en cours`,
        data: { traitements: traitementsEnCours.rows },
      });
    }

    // Vérifier si une visite vétérinaire est prévue
    const prochaineVisite = await this.databaseService.query(
      `SELECT * FROM visites_veterinaires 
       WHERE projet_id = $1 
       AND prochaine_visite_prevue >= CURRENT_DATE
       ORDER BY prochaine_visite_prevue ASC
       LIMIT 1`,
      [projetId],
    );

    if (prochaineVisite.rows.length > 0) {
      recommendations.push({
        type: 'visite',
        priorite: 'basse',
        message: `Visite vétérinaire prévue le ${new Date(prochaineVisite.rows[0].prochaine_visite_prevue).toLocaleDateString()}`,
        data: { visite: prochaineVisite.rows[0] },
      });
    }

    return recommendations;
  }

  /**
   * Alertes sanitaires urgentes
   */
  async getAlertesSanitaires(projetId: string): Promise<any[]> {
    const alertes: any[] = [];

    // Rappels en retard
    const rappelsEnRetard = await this.databaseService.query(
      `SELECT r.* FROM rappels_vaccinations r
       INNER JOIN vaccinations v ON r.vaccination_id = v.id
       WHERE v.projet_id = $1
       AND r.date_rappel < CURRENT_DATE
       AND (r.envoi = false OR r.envoi IS NULL)`,
      [projetId],
    );

    if (rappelsEnRetard.rows.length > 0) {
      alertes.push({
        type: 'rappel_retard',
        gravite: 'elevee',
        message: `${rappelsEnRetard.rows.length} rappel(s) de vaccination en retard`,
        date: new Date().toISOString(),
        data: { rappels: rappelsEnRetard.rows },
      });
    }

    // Maladies critiques
    const maladiesCritiques = await this.databaseService.query(
      "SELECT * FROM maladies WHERE projet_id = $1 AND gravite = 'critique' AND gueri = false",
      [projetId],
    );

    if (maladiesCritiques.rows.length > 0) {
      alertes.push({
        type: 'maladie_critique',
        gravite: 'critique',
        message: `${maladiesCritiques.rows.length} maladie(s) critique(s) nécessitant une attention immédiate`,
        date: new Date().toISOString(),
        data: { maladies: maladiesCritiques.rows },
      });
    }

    // Détection d'épidémie (maladies contagieuses multiples)
    const maladiesContagieuses = await this.databaseService.query(
      'SELECT COUNT(*) as count FROM maladies WHERE projet_id = $1 AND contagieux = true AND gueri = false',
      [projetId],
    );

    if (maladiesContagieuses.rows[0]?.count >= 3) {
      alertes.push({
        type: 'epidemie',
        gravite: 'critique',
        message: `Risque d'épidémie détecté : ${maladiesContagieuses.rows[0].count} cas de maladies contagieuses actives`,
        date: new Date().toISOString(),
        data: { nombre: maladiesContagieuses.rows[0].count },
      });
    }

    // Mortalité élevée (derniers 30 jours)
    const date30JoursAvant = new Date();
    date30JoursAvant.setDate(date30JoursAvant.getDate() - 30);
    const mortalitesRecentes = await this.databaseService.query(
      'SELECT COUNT(*) as count FROM mortalites WHERE projet_id = $1 AND date > $2',
      [projetId, date30JoursAvant.toISOString().split('T')[0]],
    );

    if (mortalitesRecentes.rows[0]?.count >= 5) {
      alertes.push({
        type: 'mortalite_elevee',
        gravite: 'elevee',
        message: `Taux de mortalité élevé : ${mortalitesRecentes.rows[0].count} décès dans les 30 derniers jours`,
        date: new Date().toISOString(),
        data: { nombre: mortalitesRecentes.rows[0].count },
      });
    }

    return alertes;
  }

  /**
   * Historique médical complet d'un animal
   */
  async getHistoriqueMedicalAnimal(animalId: string): Promise<any> {
    // Vaccinations
    const vaccinations = await this.databaseService.query(
      `SELECT * FROM vaccinations 
       WHERE animal_id = $1 
       OR animal_ids LIKE $2
       ORDER BY date_vaccination DESC`,
      [animalId, `%${animalId}%`],
    );

    // Maladies
    const maladies = await this.databaseService.query(
      'SELECT * FROM maladies WHERE animal_id = $1 ORDER BY date_debut DESC',
      [animalId],
    );

    // Traitements
    const traitements = await this.databaseService.query(
      'SELECT * FROM traitements WHERE animal_id = $1 ORDER BY date_debut DESC',
      [animalId],
    );

    // Visites vétérinaires
    const visites = await this.databaseService.query(
      `SELECT * FROM visites_veterinaires 
       WHERE animaux_examines LIKE $1
       ORDER BY date_visite DESC`,
      [`%${animalId}%`],
    );

    return {
      vaccinations: vaccinations.rows,
      maladies: maladies.rows,
      traitements: traitements.rows,
      visites: visites.rows.map((row: any) => ({
        ...row,
        animaux_examines: row.animaux_examines ? JSON.parse(row.animaux_examines) : null,
      })),
    };
  }

  /**
   * Animaux avec temps d'attente actif (avant abattage)
   */
  async getAnimauxTempsAttente(projetId: string): Promise<any[]> {
    const now = new Date();

    const traitements = await this.databaseService.query(
      `SELECT * FROM traitements 
       WHERE projet_id = $1 
       AND temps_attente_abattage_jours IS NOT NULL 
       AND animal_id IS NOT NULL
       ORDER BY date_debut DESC`,
      [projetId],
    );

    const animauxAvecAttente: any[] = [];

    for (const row of traitements.rows) {
      const dateDebut = new Date(row.date_debut);
      const tempsAttente = row.temps_attente_abattage_jours;
      const dateFinAttente = new Date(dateDebut.getTime() + tempsAttente * 24 * 60 * 60 * 1000);

      // Vérifier si le temps d'attente est toujours actif
      if (dateFinAttente > now) {
        const joursRestants = Math.ceil(
          (dateFinAttente.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );

        animauxAvecAttente.push({
          animal_id: row.animal_id,
          traitement: {
            id: row.id,
            projet_id: row.projet_id,
            maladie_id: row.maladie_id,
            animal_id: row.animal_id,
            medicament: row.medicament,
            date_debut: row.date_debut,
            temps_attente_abattage_jours: row.temps_attente_abattage_jours,
            termine: row.termine,
          },
          date_fin_attente: dateFinAttente.toISOString(),
          jours_restants: joursRestants,
        });
      }
    }

    return animauxAvecAttente;
  }
}

