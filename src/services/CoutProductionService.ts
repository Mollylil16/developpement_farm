/**
 * Service de calcul des coûts de production
 * Utilise l'API backend pour calculer les coûts OPEX/CAPEX et les marges sur les ventes
 */

import apiClient from './api/apiClient';
import type { Projet } from '../types/projet';
import type { Revenu } from '../types/finance';
import { CoutProductionPeriode } from '../utils/financeCalculations';
import { calculateMargeVente, MargeVente } from '../utils/margeCalculations';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

interface CoutsProductionResponse {
  date_debut: string;
  date_fin: string;
  total_opex: number;
  total_amortissement_capex: number;
  total_kg_vendus: number;
  cout_kg_opex: number;
  cout_kg_complet: number;
}

class CoutProductionService {

  /**
   * Calcule les coûts de production pour une période donnée via l'API backend
   */
  async calculateCoutsPeriode(
    projetId: string,
    dateDebut: Date,
    dateFin: Date,
    projet?: Projet
  ): Promise<CoutProductionPeriode> {
    const response = await apiClient.get<CoutsProductionResponse>('/finance/couts-production', {
      params: {
        projet_id: projetId,
        date_debut: dateDebut.toISOString(),
        date_fin: dateFin.toISOString(),
      },
    });

    // Convertir la réponse backend en format frontend
    return {
      dateDebut: response.date_debut,
      dateFin: response.date_fin,
      total_opex: response.total_opex,
      total_amortissement_capex: response.total_amortissement_capex,
      total_kg_vendus: response.total_kg_vendus,
      cout_kg_opex: response.cout_kg_opex,
      cout_kg_complet: response.cout_kg_complet,
    };
  }

  /**
   * Calcule les coûts du mois en cours
   */
  async calculateCoutsMoisActuel(projetId: string, projet: Projet): Promise<CoutProductionPeriode> {
    const maintenant = new Date();
    const debutMois = startOfMonth(maintenant);
    const finMois = endOfMonth(maintenant);

    return this.calculateCoutsPeriode(projetId, debutMois, finMois, projet);
  }

  /**
   * Met à jour les marges d'une vente de porc via l'API backend
   */
  async updateMargesVente(
    vente: Revenu,
    poidsKg: number,
    coutsPeriode: CoutProductionPeriode
  ): Promise<Revenu> {
    // Calculer toutes les marges
    const marges: MargeVente = calculateMargeVente(
      vente,
      poidsKg,
      coutsPeriode.cout_kg_opex,
      coutsPeriode.cout_kg_complet
    );

    // Mettre à jour via l'API backend
    const venteUpdated = await apiClient.post<Revenu>(
      `/finance/revenus/${vente.id}/calculer-marges`,
      {
        poids_kg: poidsKg,
      }
    );

    return venteUpdated;
  }

  /**
   * Calcule et sauvegarde les marges lors de la création d'une vente
   */
  async calculateAndSaveMargesForNewVente(
    vente: Revenu,
    poidsKg: number,
    projet: Projet
  ): Promise<Revenu> {
    // Calculer les coûts de la période de la vente
    const dateVente = parseISO(vente.date);
    const debutMois = startOfMonth(dateVente);
    const finMois = endOfMonth(dateVente);

    const coutsPeriode = await this.calculateCoutsPeriode(
      vente.projet_id,
      debutMois,
      finMois,
      projet
    );

    // Mettre à jour et sauvegarder les marges
    return this.updateMargesVente(vente, poidsKg, coutsPeriode);
  }

  /**
   * Recalcule toutes les marges des ventes d'une période
   * Utile après modification de la durée d'amortissement ou ajout de dépenses
   */
  async recalculerMargesPeriode(
    projetId: string,
    dateDebut: Date,
    dateFin: Date,
    projet?: Projet
  ): Promise<number> {
    // Calculer les coûts de la période
    const coutsPeriode = await this.calculateCoutsPeriode(projetId, dateDebut, dateFin, projet);

    // Charger toutes les ventes de la période via l'API
    const ventes = await apiClient.get<Revenu[]>('/finance/revenus', {
      params: {
        projet_id: projetId,
      },
    });

    // Filtrer les ventes de porc de la période avec un poids
    const ventesAvecPoids = ventes
      .filter(
        (v) =>
          v.categorie === 'vente_porc' &&
          v.poids_kg &&
          v.poids_kg > 0 &&
          new Date(v.date) >= dateDebut &&
          new Date(v.date) <= dateFin
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Recalculer les marges pour chaque vente
    let compteur = 0;
    for (const vente of ventesAvecPoids) {
      await this.updateMargesVente(vente, vente.poids_kg!, coutsPeriode);
      compteur++;
    }

    return compteur;
  }

  /**
   * Recalcule toutes les marges de l'année en cours
   */
  async recalculerMargesAnneeActuelle(projetId: string, projet: Projet): Promise<number> {
    const maintenant = new Date();
    const debutAnnee = new Date(maintenant.getFullYear(), 0, 1);
    const finAnnee = new Date(maintenant.getFullYear(), 11, 31);

    return this.recalculerMargesPeriode(projetId, debutAnnee, finAnnee, projet);
  }

  /**
   * Obtient les statistiques financières d'une période
   */
  async getStatistiquesPeriode(
    projetId: string,
    dateDebut: Date,
    dateFin: Date,
    projet?: Projet
  ): Promise<{
    coutsPeriode: CoutProductionPeriode;
    nombreVentes: number;
    chiffreAffaires: number;
    beneficeTotal: number;
    margeMoyenne: number;
  }> {
    const coutsPeriode = await this.calculateCoutsPeriode(projetId, dateDebut, dateFin, projet);

    // Charger toutes les ventes de la période via l'API
    const ventes = await apiClient.get<Revenu[]>('/finance/revenus', {
      params: {
        projet_id: projetId,
      },
    });

    // Filtrer les ventes de porc de la période
    const ventesPeriode = ventes.filter(
      (v) =>
        v.categorie === 'vente_porc' &&
        new Date(v.date) >= dateDebut &&
        new Date(v.date) <= dateFin
    );

    const nombreVentes = ventesPeriode.length;
    const chiffreAffaires = ventesPeriode.reduce((sum, v) => sum + v.montant, 0);
    // Utiliser uniquement les marges OPEX pour le bénéfice
    const beneficeTotal = ventesPeriode.reduce((sum, v) => sum + (v.marge_opex || 0), 0);

    // Utiliser uniquement les marges OPEX pour la marge moyenne
    const ventesAvecMarge = ventesPeriode.filter((v) => v.marge_opex_pourcent !== undefined);
    const margeMoyenne =
      ventesAvecMarge.length > 0
        ? ventesAvecMarge.reduce((sum, v) => sum + (v.marge_opex_pourcent || 0), 0) /
          ventesAvecMarge.length
        : 0;

    return {
      coutsPeriode,
      nombreVentes,
      chiffreAffaires,
      beneficeTotal,
      margeMoyenne,
    };
  }

  /**
   * Obtient les statistiques du mois en cours
   */
  async getStatistiquesMoisActuel(
    projetId: string,
    projet: Projet
  ): Promise<{
    coutsPeriode: CoutProductionPeriode;
    nombreVentes: number;
    chiffreAffaires: number;
    beneficeTotal: number;
    margeMoyenne: number;
  }> {
    const maintenant = new Date();
    const debutMois = startOfMonth(maintenant);
    const finMois = endOfMonth(maintenant);

    return this.getStatistiquesPeriode(projetId, debutMois, finMois, projet);
  }
}

// Export singleton
export default new CoutProductionService();
