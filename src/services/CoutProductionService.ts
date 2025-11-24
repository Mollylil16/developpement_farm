/**
 * Service de calcul des coûts de production
 * Gère les calculs OPEX/CAPEX et les marges sur les ventes
 */

import * as SQLite from 'expo-sqlite';
import { Projet, DepensePonctuelle, Revenu } from '../types';
import { DEFAULT_DUREE_AMORTISSEMENT_MOIS } from '../types/projet';
import {
  calculateCoutsPeriode,
  CoutProductionPeriode,
} from '../utils/financeCalculations';
import {
  calculateMargeVente,
  MargeVente,
} from '../utils/margeCalculations';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

class CoutProductionService {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialise le service avec une instance de base de données
   */
  setDatabase(db: SQLite.SQLiteDatabase): void {
    this.db = db;
  }

  /**
   * Charge toutes les dépenses d'un projet
   */
  private async loadDepenses(projetId: string): Promise<DepensePonctuelle[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    const result = await this.db.getAllAsync<any>(
      'SELECT * FROM depenses_ponctuelles WHERE projet_id = ? ORDER BY date DESC',
      [projetId]
    );

    return result.map((row) => ({
      ...row,
      photos: row.photos ? JSON.parse(row.photos) : [],
    }));
  }

  /**
   * Charge toutes les ventes de porcs d'un projet pour une période
   */
  private async loadVentesPorc(
    projetId: string,
    dateDebut: Date,
    dateFin: Date
  ): Promise<Revenu[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    const result = await this.db.getAllAsync<any>(
      `SELECT * FROM revenus 
       WHERE projet_id = ? 
       AND categorie = 'vente_porc'
       AND date >= ? 
       AND date <= ?
       ORDER BY date DESC`,
      [projetId, dateDebut.toISOString(), dateFin.toISOString()]
    );

    return result.map((row) => ({
      ...row,
      photos: row.photos ? JSON.parse(row.photos) : [],
    }));
  }

  /**
   * Calcule les coûts de production pour une période donnée
   */
  async calculateCoutsPeriode(
    projetId: string,
    dateDebut: Date,
    dateFin: Date,
    projet: Projet
  ): Promise<CoutProductionPeriode> {
    // Charger toutes les dépenses du projet
    const depenses = await this.loadDepenses(projetId);

    // Charger toutes les ventes de porcs de la période
    const ventes = await this.loadVentesPorc(projetId, dateDebut, dateFin);

    // Calculer le total de kg vendus
    const totalKgVendus = ventes.reduce((sum, v) => sum + (v.poids_kg || 0), 0);

    // Durée d'amortissement du projet (ou défaut)
    const dureeAmortissementMois =
      projet.duree_amortissement_par_defaut_mois || DEFAULT_DUREE_AMORTISSEMENT_MOIS;

    // Calculer tous les coûts de la période
    return calculateCoutsPeriode(
      depenses,
      totalKgVendus,
      dateDebut,
      dateFin,
      dureeAmortissementMois
    );
  }

  /**
   * Calcule les coûts du mois en cours
   */
  async calculateCoutsMoisActuel(
    projetId: string,
    projet: Projet
  ): Promise<CoutProductionPeriode> {
    const maintenant = new Date();
    const debutMois = startOfMonth(maintenant);
    const finMois = endOfMonth(maintenant);

    return this.calculateCoutsPeriode(projetId, debutMois, finMois, projet);
  }

  /**
   * Met à jour les marges d'une vente de porc
   */
  async updateMargesVente(
    vente: Revenu,
    poidsKg: number,
    coutsPeriode: CoutProductionPeriode
  ): Promise<Revenu> {
    if (!this.db) throw new Error('Base de données non initialisée');

    // Calculer toutes les marges
    const marges: MargeVente = calculateMargeVente(
      vente,
      poidsKg,
      coutsPeriode.cout_kg_opex,
      coutsPeriode.cout_kg_complet
    );

    // Mettre à jour l'objet vente
    const venteUpdated: Revenu = {
      ...vente,
      poids_kg: marges.poids_kg,
      cout_kg_opex: marges.cout_kg_opex,
      cout_kg_complet: marges.cout_kg_complet,
      cout_reel_opex: marges.cout_reel_opex,
      cout_reel_complet: marges.cout_reel_complet,
      marge_opex: marges.marge_opex,
      marge_complete: marges.marge_complete,
      marge_opex_pourcent: marges.marge_opex_pourcent,
      marge_complete_pourcent: marges.marge_complete_pourcent,
    };

    // Sauvegarder en base de données
    await this.db.runAsync(
      `UPDATE revenus SET 
        poids_kg = ?,
        cout_kg_opex = ?,
        cout_kg_complet = ?,
        cout_reel_opex = ?,
        cout_reel_complet = ?,
        marge_opex = ?,
        marge_complete = ?,
        marge_opex_pourcent = ?,
        marge_complete_pourcent = ?
      WHERE id = ?`,
      [
        venteUpdated.poids_kg,
        venteUpdated.cout_kg_opex,
        venteUpdated.cout_kg_complet,
        venteUpdated.cout_reel_opex,
        venteUpdated.cout_reel_complet,
        venteUpdated.marge_opex,
        venteUpdated.marge_complete,
        venteUpdated.marge_opex_pourcent,
        venteUpdated.marge_complete_pourcent,
        venteUpdated.id,
      ]
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
    projet: Projet
  ): Promise<number> {
    // Calculer les coûts de la période
    const coutsPeriode = await this.calculateCoutsPeriode(
      projetId,
      dateDebut,
      dateFin,
      projet
    );

    // Charger toutes les ventes de la période avec un poids
    const ventes = await this.loadVentesPorc(projetId, dateDebut, dateFin);
    const ventesAvecPoids = ventes.filter((v) => v.poids_kg && v.poids_kg > 0);

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
  async recalculerMargesAnneeActuelle(
    projetId: string,
    projet: Projet
  ): Promise<number> {
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
    projet: Projet
  ): Promise<{
    coutsPeriode: CoutProductionPeriode;
    nombreVentes: number;
    chiffreAffaires: number;
    beneficeTotal: number;
    margeMoyenne: number;
  }> {
    const coutsPeriode = await this.calculateCoutsPeriode(
      projetId,
      dateDebut,
      dateFin,
      projet
    );

    const ventes = await this.loadVentesPorc(projetId, dateDebut, dateFin);

    const nombreVentes = ventes.length;
    const chiffreAffaires = ventes.reduce((sum, v) => sum + v.montant, 0);
    // Utiliser uniquement les marges OPEX pour le bénéfice
    const beneficeTotal = ventes.reduce((sum, v) => sum + (v.marge_opex || 0), 0);

    // Utiliser uniquement les marges OPEX pour la marge moyenne
    const ventesAvecMarge = ventes.filter((v) => v.marge_opex_pourcent !== undefined);
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

