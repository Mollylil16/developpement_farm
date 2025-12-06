/**
 * Service de calcul de la performance globale de l'élevage
 * Calcule le coût de production moyen sur toute la période
 * Compare avec le prix du marché et génère des diagnostics
 */

import * as SQLite from 'expo-sqlite';
import { Projet, DepensePonctuelle, Revenu } from '../types';
import { DEFAULT_DUREE_AMORTISSEMENT_MOIS } from '../types/projet';
import { getTypeDepense } from '../types/finance';
import { parseISO, differenceInMonths } from 'date-fns';

export interface PerformanceGlobale {
  // Données brutes
  total_kg_vendus_global: number;
  total_opex_global: number;
  total_amortissement_capex_global: number;
  
  // Coûts par kg
  cout_kg_opex_global: number;
  cout_kg_complet_global: number;
  
  // Prix du marché
  prix_kg_marche: number;
  
  // Écarts
  ecart_absolu: number;
  ecart_pourcentage: number;
  
  // Diagnostic
  statut: 'rentable' | 'fragile' | 'perte';
  message_diagnostic: string;
  
  // Suggestions
  suggestions: string[];
}

class PerformanceGlobaleService {
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
  private async loadAllDepenses(projetId: string): Promise<DepensePonctuelle[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    const result = await this.db.getAllAsync<any>(
      'SELECT * FROM depenses_ponctuelles WHERE projet_id = ? ORDER BY date ASC',
      [projetId]
    );

    return result.map((row) => ({
      ...row,
      photos: row.photos ? JSON.parse(row.photos) : [],
    }));
  }

  /**
   * Charge toutes les ventes de porcs d'un projet
   */
  private async loadAllVentesPorc(projetId: string): Promise<Revenu[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    const result = await this.db.getAllAsync<any>(
      `SELECT * FROM revenus 
       WHERE projet_id = ? 
       AND categorie = 'vente_porc'
       ORDER BY date ASC`,
      [projetId]
    );

    return result.map((row) => ({
      ...row,
      photos: row.photos ? JSON.parse(row.photos) : [],
    }));
  }

  /**
   * Calcule le total des kg vendus depuis le début
   */
  private calculateTotalKgVendus(ventes: Revenu[]): number {
    const total = ventes.reduce((sum, v) => sum + (v.poids_kg || 0), 0);
    
    console.log('📊 [PerformanceGlobale] Calcul kg vendus:', {
      totalVentes: ventes.length,
      totalKg: total,
      ventesAvecPoids: ventes.filter(v => v.poids_kg && v.poids_kg > 0).length
    });
    
    return total;
  }

  /**
   * Calcule le total OPEX global
   */
  private calculateTotalOpexGlobal(depenses: DepensePonctuelle[]): number {
    const depensesOpex = depenses.filter((d) => getTypeDepense(d.categorie) === 'OPEX');
    const total = depensesOpex.reduce((sum, d) => sum + d.montant, 0);
    
    console.log('📊 [PerformanceGlobale] Calcul OPEX:', {
      totalDepenses: depenses.length,
      depensesOpex: depensesOpex.length,
      totalOpex: total,
      typesDepenses: depenses.map(d => getTypeDepense(d.categorie)).filter((v, i, a) => a.indexOf(v) === i)
    });
    
    return total;
  }

  /**
   * Calcule l'amortissement CAPEX global sur la période couverte
   */
  private calculateTotalAmortissementCapexGlobal(
    depenses: DepensePonctuelle[],
    dateDebutProduction: Date,
    dateFinProduction: Date,
    dureeAmortissementMois: number
  ): number {
    const depensesCapex = depenses.filter((d) => getTypeDepense(d.categorie) === 'CAPEX');
    
    let totalAmortissement = 0;

    for (const depense of depensesCapex) {
      const dateDepense = parseISO(depense.date);
      
      // Date de fin d'amortissement
      const dateFinAmortissement = new Date(dateDepense);
      dateFinAmortissement.setMonth(dateFinAmortissement.getMonth() + dureeAmortissementMois);
      
      // Amortissement mensuel
      const amortissementMensuel = depense.montant / dureeAmortissementMois;
      
      // Calculer le nombre de mois où cette dépense CAPEX a été amortie durant la période
      const debutAmortissement = dateDepense > dateDebutProduction ? dateDepense : dateDebutProduction;
      const finAmortissement = dateFinAmortissement < dateFinProduction ? dateFinAmortissement : dateFinProduction;
      
      if (debutAmortissement < finAmortissement) {
        const moisAmortis = Math.max(1, differenceInMonths(finAmortissement, debutAmortissement) + 1);
        totalAmortissement += amortissementMensuel * moisAmortis;
      }
    }

    return totalAmortissement;
  }

  /**
   * Détermine le statut de performance
   */
  private determinerStatut(
    coutKgComplet: number,
    prixKgMarche: number
  ): 'rentable' | 'fragile' | 'perte' {
    const ecartPourcentage = (prixKgMarche - coutKgComplet) / prixKgMarche;
    
    if (coutKgComplet > prixKgMarche) {
      return 'perte';
    } else if (Math.abs(ecartPourcentage) <= 0.05) {
      return 'fragile';
    } else {
      return 'rentable';
    }
  }

  /**
   * Génère le message de diagnostic
   */
  private genererMessageDiagnostic(
    statut: 'rentable' | 'fragile' | 'perte',
    coutKgComplet: number,
    prixKgMarche: number
  ): string {
    switch (statut) {
      case 'rentable':
        return 'Votre coût de production est inférieur au prix du marché. Vous travaillez avec une marge positive. 🎉';
      case 'fragile':
        return 'Votre coût de production est très proche du prix du marché. Votre marge est faible, prudence. ⚠️';
      case 'perte':
        return 'Votre coût de production est supérieur au prix du marché. Vous travaillez à perte. 🚨';
      default:
        return 'Données insuffisantes pour établir un diagnostic.';
    }
  }

  /**
   * Génère des suggestions d'actions basées sur le diagnostic
   */
  private genererSuggestions(
    statut: 'rentable' | 'fragile' | 'perte'
  ): string[] {
    switch (statut) {
      case 'perte':
        return [
          'Réduire le coût de l\'aliment en optimisant la formulation des rations',
          'Améliorer la croissance (GMQ) pour vendre des porcs plus lourds',
          'Analyser les mortalités pour réduire les pertes',
          'Revoir le prix de vente si le marché local le permet',
        ];
      case 'fragile':
        return [
          'Surveiller l\'évolution du coût de l\'aliment',
          'Limiter les dépenses non essentielles (OPEX)',
          'Optimiser les performances par lot',
        ];
      case 'rentable':
        return [
          'Vos performances sont bonnes. Vous pouvez envisager d\'augmenter le volume',
          'Continuez à suivre vos coûts pour maintenir cette rentabilité',
        ];
      default:
        return [];
    }
  }

  /**
   * Calcule la performance globale de l'élevage
   */
  async calculatePerformanceGlobale(
    projetId: string,
    projet: Projet
  ): Promise<PerformanceGlobale | null> {
    if (!this.db) throw new Error('Base de données non initialisée');

    // Charger toutes les données
    const depenses = await this.loadAllDepenses(projetId);
    const ventes = await this.loadAllVentesPorc(projetId);

    console.log('📊 [PerformanceGlobale] Données chargées:', {
      totalDepensesChargees: depenses.length,
      totalVentesChargees: ventes.length
    });

    // 1. Calculer total_kg_vendus_global
    const total_kg_vendus_global = this.calculateTotalKgVendus(ventes);

    // Gérer le cas où il n'y a pas de ventes
    if (total_kg_vendus_global === 0) {
      console.log('⚠️ [PerformanceGlobale] Aucun kg vendu, impossible de calculer');
      return null; // Pas assez de données
    }

    // 2. Calculer total_opex_global
    const total_opex_global = this.calculateTotalOpexGlobal(depenses);
    
    // Calculer aussi le total de TOUTES les dépenses pour comparaison
    const total_toutes_depenses = depenses.reduce((sum, d) => sum + d.montant, 0);
    console.log('💰 [PerformanceGlobale] Comparaison totaux:', {
      total_toutes_depenses: total_toutes_depenses,
      total_opex_global: total_opex_global,
      difference: total_toutes_depenses - total_opex_global
    });

    // 3. Trouver la période de production (première vente à aujourd'hui)
    const datesVentes = ventes.map((v) => parseISO(v.date));
    const dateDebutProduction = new Date(Math.min(...datesVentes.map((d) => d.getTime())));
    const dateFinProduction = new Date(); // Aujourd'hui

    // 4. Durée d'amortissement
    const dureeAmortissementMois =
      projet.duree_amortissement_par_defaut_mois || DEFAULT_DUREE_AMORTISSEMENT_MOIS;

    // 5. Calculer total_amortissement_capex_global
    const total_amortissement_capex_global = this.calculateTotalAmortissementCapexGlobal(
      depenses,
      dateDebutProduction,
      dateFinProduction,
      dureeAmortissementMois
    );

    // 6. Calculer coûts par kg
    const cout_kg_opex_global = total_opex_global / total_kg_vendus_global;
    const cout_kg_complet_global =
      (total_opex_global + total_amortissement_capex_global) / total_kg_vendus_global;

    // 7. Récupérer prix du marché
    const prix_kg_marche = projet.prix_kg_carcasse || 1300; // Valeur par défaut

    // 8. Calculer écarts
    const ecart_absolu = prix_kg_marche - cout_kg_complet_global;
    const ecart_pourcentage = (ecart_absolu / prix_kg_marche) * 100;

    // 9. Déterminer le statut
    const statut = this.determinerStatut(cout_kg_complet_global, prix_kg_marche);

    // 10. Générer le diagnostic et les suggestions
    const message_diagnostic = this.genererMessageDiagnostic(
      statut,
      cout_kg_complet_global,
      prix_kg_marche
    );
    const suggestions = this.genererSuggestions(statut);

    // Log final du résultat
    console.log('');
    console.log('✅ ========================================');
    console.log('✅ RÉSULTAT FINAL - Performance Globale');
    console.log('✅ ========================================');
    console.log('📊 Kg vendus:', total_kg_vendus_global);
    console.log('💰 OPEX total:', total_opex_global.toLocaleString(), 'FCFA');
    console.log('🏗️ CAPEX amorti:', total_amortissement_capex_global.toLocaleString(), 'FCFA');
    console.log('📈 Coût/kg OPEX:', cout_kg_opex_global.toFixed(2), 'FCFA/kg');
    console.log('📈 Coût/kg complet:', cout_kg_complet_global.toFixed(2), 'FCFA/kg');
    console.log('💵 Prix marché:', prix_kg_marche, 'FCFA/kg');
    console.log('➖ Écart:', ecart_absolu.toFixed(2), 'FCFA/kg (', ecart_pourcentage.toFixed(1), '%)');
    console.log('🎯 Statut:', statut);
    console.log('✅ ========================================');
    console.log('');

    return {
      total_kg_vendus_global,
      total_opex_global,
      total_amortissement_capex_global,
      cout_kg_opex_global,
      cout_kg_complet_global,
      prix_kg_marche,
      ecart_absolu,
      ecart_pourcentage,
      statut,
      message_diagnostic,
      suggestions,
    };
  }
}

// Export singleton
export default new PerformanceGlobaleService();

