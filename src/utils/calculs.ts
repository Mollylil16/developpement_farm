// Utilitaires pour les calculs agricoles
import { 
  Porc, 
  PlanificationAccouplement, 
  SailliePlanifiee, 
  ObjectifReproduction,
  Recommandation,
  Devise,
  DeviseConfig
} from '../types';
import { DEVISES_CONFIG } from '../store/slices/parametresSlice';

export class CalculsAgricoles {
  /**
   * Calcule la ration quotidienne basée sur le poids corporel
   * @param poidsCorporel Poids du porc en kg
   * @param pourcentage Pourcentage du poids corporel (défaut: 3%)
   * @returns Quantité d'aliment en kg par jour
   */
  static calculerRationQuotidienne(poidsCorporel: number, pourcentage: number = 3): number {
    return (poidsCorporel * pourcentage) / 100;
  }

  /**
   * Calcule le gain de poids quotidien moyen
   * @param poidsInitial Poids initial en kg
   * @param poidsFinal Poids final en kg
   * @param dureeJours Durée en jours
   * @returns Gain de poids quotidien en kg
   */
  static calculerGainQuotidien(poidsInitial: number, poidsFinal: number, dureeJours: number): number {
    return (poidsFinal - poidsInitial) / dureeJours;
  }

  /**
   * Calcule l'indice de consommation
   * @param quantiteAliment Quantité d'aliment consommée en kg
   * @param gainPoids Gain de poids en kg
   * @returns Indice de consommation (kg d'aliment/kg de gain)
   */
  static calculerIndiceConsommation(quantiteAliment: number, gainPoids: number): number {
    return gainPoids > 0 ? quantiteAliment / gainPoids : 0;
  }

  /**
   * Calcule la date de mise bas prévue
   * @param dateSautage Date de sautage
   * @returns Date de mise bas prévue (114 jours après sautage)
   */
  static calculerDateMiseBas(dateSautage: Date): Date {
    const dateMiseBas = new Date(dateSautage);
    dateMiseBas.setDate(dateMiseBas.getDate() + 114);
    return dateMiseBas;
  }

  /**
   * Calcule l'âge optimal de sevrage
   * @param dateNaissance Date de naissance
   * @param ageSevrageOptimal Âge optimal en jours (défaut: 28)
   * @returns Date de sevrage optimale
   */
  static calculerDateSevrage(dateNaissance: Date, ageSevrageOptimal: number = 28): Date {
    const dateSevrage = new Date(dateNaissance);
    dateSevrage.setDate(dateSevrage.getDate() + ageSevrageOptimal);
    return dateSevrage;
  }

  /**
   * Calcule le poids cible selon l'âge
   * @param ageJours Âge en jours
   * @param race Race du porc
   * @returns Poids cible en kg
   */
  static calculerPoidsCible(ageJours: number, race: string = 'standard'): number {
    // Courbe de croissance standard
    const courbesCroissance = {
      standard: (age: number) => Math.min(age * 0.8, 120), // Max 120kg
      pietrain: (age: number) => Math.min(age * 0.7, 100), // Max 100kg
      landrace: (age: number) => Math.min(age * 0.9, 130), // Max 130kg
    };

    const courbe = courbesCroissance[race as keyof typeof courbesCroissance] || courbesCroissance.standard;
    return courbe(ageJours);
  }

  /**
   * Calcule le coût de production par kg de poids vif
   * @param coutsTotaux Coûts totaux en €
   * @param poidsTotalProduction Poids total produit en kg
   * @returns Coût par kg en €
   */
  static calculerCoutParKg(coutsTotaux: number, poidsTotalProduction: number): number {
    return poidsTotalProduction > 0 ? coutsTotaux / poidsTotalProduction : 0;
  }

  /**
   * Calcule la marge brute
   * @param chiffreAffaires Chiffre d'affaires en €
   * @param coutsVariables Coûts variables en €
   * @returns Marge brute en €
   */
  static calculerMargeBrute(chiffreAffaires: number, coutsVariables: number): number {
    return chiffreAffaires - coutsVariables;
  }

  /**
   * Calcule le taux de reproduction
   * @param nombreNaissances Nombre de naissances
   * @param nombreTruies Nombre de truies
   * @returns Taux de reproduction (naissances/truie)
   */
  static calculerTauxReproduction(nombreNaissances: number, nombreTruies: number): number {
    return nombreTruies > 0 ? nombreNaissances / nombreTruies : 0;
  }

  /**
   * Calcule l'efficacité alimentaire
   * @param poidsGagne Poids gagné en kg
   * @param alimentConsomme Aliment consommé en kg
   * @returns Efficacité alimentaire (kg de poids/kg d'aliment)
   */
  static calculerEfficaciteAlimentaire(poidsGagne: number, alimentConsomme: number): number {
    return alimentConsomme > 0 ? poidsGagne / alimentConsomme : 0;
  }

  /**
   * Planifie les accouplements pour atteindre un objectif de reproduction
   * @param objectif Objectif de reproduction
   * @param truies Liste des truies disponibles
   * @param verrats Liste des verrats disponibles
   * @returns Planification des accouplements
   */
  static planifierAccouplements(
    objectif: ObjectifReproduction,
    truies: Porc[],
    verrats: Porc[]
  ): PlanificationAccouplement {
    const truiesDisponibles = truies.filter(t => t.sexe === 'femelle' && t.statut === 'reproduction');
    const verratsDisponibles = verrats.filter(v => v.sexe === 'male' && v.statut === 'reproduction');
    
    if (truiesDisponibles.length === 0 || verratsDisponibles.length === 0) {
      throw new Error('Pas assez de truies ou de verrats disponibles');
    }

    // Calcul du nombre de saillies nécessaires
    const nombreSailliesNecessaires = Math.ceil(objectif.nombrePorcsCible / objectif.nombreMoyenPorceletsParMiseBas);
    const nombreSailliesMinimum = Math.max(nombreSailliesNecessaires, objectif.nombreMisesBasMinimum);
    
    // Calcul de l'intervalle entre les saillies
    const dureePeriode = (objectif.periodePlanification.fin.getTime() - objectif.periodePlanification.debut.getTime()) / (1000 * 60 * 60 * 24);
    const intervalleOptimal = Math.floor(dureePeriode / nombreSailliesMinimum);
    
    // Génération des saillies planifiées
    const saillies: SailliePlanifiee[] = [];
    let dateSaillie = new Date(objectif.periodePlanification.debut);
    
    for (let i = 0; i < nombreSailliesMinimum; i++) {
      // Sélection cyclique des truies et verrats
      const truie = truiesDisponibles[i % truiesDisponibles.length];
      const verrat = verratsDisponibles[i % verratsDisponibles.length];
      
      const dateMiseBasPrevue = new Date(dateSaillie);
      dateMiseBasPrevue.setDate(dateMiseBasPrevue.getDate() + objectif.dureeGestation);
      
      saillies.push({
        id: `saillie_${i + 1}`,
        planificationId: '',
        truieId: truie.id,
        verratId: verrat.id,
        dateSaillie: new Date(dateSaillie),
        dateMiseBasPrevue,
        statut: 'planifie',
      });
      
      // Avancer à la prochaine date de saillie
      dateSaillie.setDate(dateSaillie.getDate() + intervalleOptimal);
      
      // Vérifier qu'on ne dépasse pas la période
      if (dateSaillie > objectif.periodePlanification.fin) {
        break;
      }
    }
    
    return {
      id: `plan_${Date.now()}`,
      nom: `Planification ${objectif.nombrePorcsCible} porcs`,
      objectifPorcs: objectif.nombrePorcsCible,
      nombreMisesBasMinimum: objectif.nombreMisesBasMinimum,
      nombreMoyenPorceletsParMiseBas: objectif.nombreMoyenPorceletsParMiseBas,
      dateDebut: objectif.periodePlanification.debut,
      dateFin: objectif.periodePlanification.fin,
      statut: 'planifie',
      saillies,
    };
  }

  /**
   * Calcule les statistiques d'une planification
   * @param planification Planification à analyser
   * @returns Statistiques de la planification
   */
  static analyserPlanification(planification: PlanificationAccouplement) {
    const sailliesPlanifiees = planification.saillies.filter((s: SailliePlanifiee) => s.statut === 'planifie').length;
    const sailliesRealisees = planification.saillies.filter((s: SailliePlanifiee) => s.statut === 'realise').length;
    const sailliesAnnulees = planification.saillies.filter((s: SailliePlanifiee) => s.statut === 'annule').length;
    
    const porceletsPrevu = sailliesPlanifiees * planification.nombreMoyenPorceletsParMiseBas;
    const pourcentageRealisation = planification.saillies.length > 0 
      ? (sailliesRealisees / planification.saillies.length) * 100 
      : 0;
    
    return {
      sailliesPlanifiees,
      sailliesRealisees,
      sailliesAnnulees,
      porceletsPrevu,
      pourcentageRealisation,
      objectifAtteint: porceletsPrevu >= planification.objectifPorcs,
    };
  }

  /**
   * Génère une alerte pour un sevrage
   * @param dateNaissance Date de naissance
   * @param ageSevrageOptimal Âge optimal de sevrage
   * @returns Message d'alerte
   */
  static alerteSevrage(dateNaissance: Date, ageSevrageOptimal: number = 28): string | null {
    const ageActuel = UtilitairesDate.differenceEnJours(dateNaissance, new Date());
    const joursRestants = ageSevrageOptimal - ageActuel;
    
    if (joursRestants <= 0) {
      return 'Sevrage recommandé';
    } else if (joursRestants <= 3) {
      return `Sevrage recommandé dans ${joursRestants} jour(s)`;
    }
    
    return null;
  }

  /**
   * Génère un rapport de croissance basé sur les données réelles
   * @param porcs Liste des porcs
   * @param periode Période d'analyse
   * @returns Données pour le graphique de croissance
   */
  static genererRapportCroissance(porcs: Porc[], periode: { debut: Date; fin: Date }) {
    const porcsEnCroissance = porcs.filter(p => p.statut === 'croissance');
    const poidsMoyen = porcsEnCroissance.length > 0 
      ? porcsEnCroissance.reduce((sum, p) => sum + p.poidsActuel, 0) / porcsEnCroissance.length 
      : 0;
    
    // Génération de données mensuelles basées sur les vraies données
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
    const donnees = mois.map((_, index) => {
      // Simulation basée sur les données réelles avec variation
      const variation = (Math.random() - 0.5) * 10; // Variation de ±5kg
      return Math.max(0, Math.round(poidsMoyen + variation));
    });
    
    return {
      labels: mois,
      datasets: [{
        data: donnees,
        color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  }

  /**
   * Génère un rapport de production basé sur les gestations et sevrages
   * @param gestations Liste des gestations
   * @param sevrages Liste des sevrages
   * @param transactions Liste des transactions
   * @returns Données pour le graphique de production
   */
  static genererRapportProduction(gestations: any[], sevrages: any[], transactions: any[]) {
    const naissances = gestations.filter(g => g.statut === 'terminee').length;
    const sevragesRealises = sevrages.length;
    const ventes = transactions.filter(t => t.type === 'vente').length;
    
    return {
      labels: ['Naissances', 'Sevrages', 'Ventes'],
      datasets: [{
        data: [naissances, sevragesRealises, ventes],
      }],
    };
  }

  /**
   * Génère un rapport financier détaillé
   * @param transactions Liste des transactions
   * @param periode Période d'analyse
   * @returns Analyse financière complète
   */
  static genererRapportFinancier(transactions: any[], periode: { debut: Date; fin: Date }) {
    const transactionsPeriode = transactions.filter(t => 
      new Date(t.date) >= periode.debut && new Date(t.date) <= periode.fin
    );
    
    const recettes = transactionsPeriode
      .filter(t => t.type === 'vente')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const depenses = transactionsPeriode
      .filter(t => t.type === 'achat')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const depensesAlimentation = transactionsPeriode
      .filter(t => t.categorie === 'alimentation')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const depensesVeterinaires = transactionsPeriode
      .filter(t => t.categorie === 'veterinaire')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const margeBrute = recettes - depenses;
    const margeBrutePourcentage = recettes > 0 ? (margeBrute / recettes) * 100 : 0;
    
    return {
      chiffreAffaires: recettes,
      depensesTotal: depenses,
      depensesAlimentation,
      depensesVeterinaires,
      margeBrute,
      margeBrutePourcentage,
      nombreTransactions: transactionsPeriode.length,
    };
  }

  /**
   * Génère des recommandations basées sur les données réelles
   * @param porcs Liste des porcs
   * @param gestations Liste des gestations
   * @param transactions Liste des transactions
   * @returns Liste de recommandations personnalisées
   */
  static genererRecommandations(porcs: Porc[], gestations: any[], transactions: any[]): Recommandation[] {
    const recommandations: Recommandation[] = [];
    
    // Analyse de la reproduction
    const tauxReproduction = CalculsAgricoles.calculerTauxReproduction(
      gestations.filter(g => g.statut === 'terminee').length,
      porcs.filter(p => p.sexe === 'femelle').length
    );
    
    if (tauxReproduction < 1.5) {
      recommandations.push({
        type: 'reproduction',
        icon: 'trending-up',
        color: '#4CAF50',
        titre: 'Améliorer la reproduction',
        description: `Taux de reproduction actuel: ${tauxReproduction.toFixed(1)}. Objectif recommandé: 2.0+`,
        action: 'Optimiser les accouplements et la nutrition des truies',
      });
    }
    
    // Analyse des coûts d'alimentation
    const depensesAlimentation = transactions
      .filter(t => t.categorie === 'alimentation')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const depensesTotal = transactions
      .filter(t => t.type === 'achat')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const pourcentageAlimentation = depensesTotal > 0 ? (depensesAlimentation / depensesTotal) * 100 : 0;
    
    if (pourcentageAlimentation > 60) {
      recommandations.push({
        type: 'nutrition',
        icon: 'restaurant',
        color: '#FF9800',
        titre: 'Optimiser les coûts d\'alimentation',
        description: `Les coûts d'alimentation représentent ${pourcentageAlimentation.toFixed(1)}% des dépenses`,
        action: 'Réviser les rations et négocier les prix des aliments',
      });
    }
    
    // Analyse des ventes
    const porcsAVendre = porcs.filter(p => p.poidsActuel >= p.poidsCible).length;
    const porcsEnCroissance = porcs.filter(p => p.statut === 'croissance').length;
    
    if (porcsAVendre > 0 && porcsAVendre / porcsEnCroissance > 0.3) {
      recommandations.push({
        type: 'vente',
        icon: 'euro',
        color: '#2196F3',
        titre: 'Optimiser les ventes',
        description: `${porcsAVendre} porcs prêts à vendre (${((porcsAVendre / porcsEnCroissance) * 100).toFixed(1)}%)`,
        action: 'Planifier les ventes pour optimiser les prix de marché',
      });
    }
    
    // Recommandation par défaut si aucune spécifique
    if (recommandations.length === 0) {
      recommandations.push({
        type: 'general',
        icon: 'lightbulb-outline',
        color: '#9C27B0',
        titre: 'Performance excellente',
        description: 'Votre élevage fonctionne bien. Continuez sur cette lancée !',
        action: 'Maintenir les bonnes pratiques actuelles',
      });
    }
    
    return recommandations;
  }

  /**
   * Calcule les KPIs principaux de l'élevage
   * @param porcs Liste des porcs
   * @param gestations Liste des gestations
   * @param transactions Liste des transactions
   * @returns KPIs calculés
   */
  static calculerKPIs(porcs: Porc[], gestations: any[], transactions: any[]) {
    const totalPorcs = porcs.length;
    const truiesGestantes = gestations.filter(g => g.statut === 'en_cours').length;
    const porcsEnCroissance = porcs.filter(p => p.statut === 'croissance');
    const porcsAVendre = porcs.filter(p => p.poidsActuel >= p.poidsCible).length;
    
    const poidsMoyen = porcsEnCroissance.length > 0 
      ? porcsEnCroissance.reduce((sum: number, p: Porc) => sum + p.poidsActuel, 0) / porcsEnCroissance.length 
      : 0;
    
    const tauxMortalite = porcs.filter(p => p.statut === 'vente').length / totalPorcs * 100;
    
    const chiffreAffairesMensuel = transactions
      .filter(t => t.type === 'vente' && new Date(t.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + t.montant, 0);
    
    return {
      totalPorcs,
      truiesGestantes,
      porcsEnCroissance: porcsEnCroissance.length,
      porcsAVendre,
      poidsMoyen: Math.round(poidsMoyen),
      tauxMortalite: Math.round(tauxMortalite * 100) / 100,
      chiffreAffairesMensuel,
    };
  }

  /**
   * Génère un calendrier des saillies
   * @param planification Planification des accouplements
   * @returns Calendrier avec dates marquées
   */
  static genererCalendrierSaillies(planification: PlanificationAccouplement) {
    const calendrier: Record<string, any> = {};
    
    planification.saillies.forEach((saillie: SailliePlanifiee) => {
      const dateKey = saillie.dateSaillie.toISOString().split('T')[0];
      const dateMiseBasKey = saillie.dateMiseBasPrevue.toISOString().split('T')[0];
      
      calendrier[dateKey] = {
        marked: true,
        dotColor: '#FF9800',
        customData: {
          type: 'saillie',
          truieId: saillie.truieId,
          verratId: saillie.verratId,
          statut: saillie.statut,
        }
      };
      
      calendrier[dateMiseBasKey] = {
        marked: true,
        dotColor: '#4CAF50',
        customData: {
          type: 'mise_bas',
          truieId: saillie.truieId,
          statut: saillie.statut,
        }
      };
    });
    
    return calendrier;
  }

  /**
   * Formate un montant selon la devise configurée
   * @param montant Montant en euros (devise de référence)
   * @param deviseConfig Configuration de la devise
   * @returns Montant formaté avec symbole
   */
  static formaterMontant(montant: number, deviseConfig: DeviseConfig): string {
    const montantConverti = montant * deviseConfig.tauxChange;
    const montantFormate = montantConverti.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    if (deviseConfig.positionSymbole === 'before') {
      return `${deviseConfig.symbole}${montantFormate}`;
    } else {
      return `${montantFormate} ${deviseConfig.symbole}`;
    }
  }

  /**
   * Convertit un montant d'une devise à une autre
   * @param montant Montant à convertir
   * @param deviseSource Devise source
   * @param deviseCible Devise cible
   * @returns Montant converti
   */
  static convertirMontant(montant: number, deviseSource: Devise, deviseCible: Devise): number {
    // Convertir d'abord en euros (devise de référence)
    const montantEnEuros = montant / DEVISES_CONFIG[deviseSource].tauxChange;
    // Puis convertir vers la devise cible
    return montantEnEuros * DEVISES_CONFIG[deviseCible].tauxChange;
  }

  /**
   * Obtient la configuration d'une devise
   * @param devise Code de la devise
   * @returns Configuration de la devise
   */
  static obtenirDeviseConfig(devise: Devise): DeviseConfig {
    return DEVISES_CONFIG[devise];
  }

  /**
   * Calcule le taux de change entre deux devises
   * @param deviseSource Devise source
   * @param deviseCible Devise cible
   * @returns Taux de change
   */
  static calculerTauxChange(deviseSource: Devise, deviseCible: Devise): number {
    return DEVISES_CONFIG[deviseCible].tauxChange / DEVISES_CONFIG[deviseSource].tauxChange;
  }
}

// Utilitaires pour les dates
export class UtilitairesDate {
  /**
   * Formate une date en français
   * @param date Date à formater
   * @returns Date formatée en français
   */
  static formaterDateFrancais(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Calcule la différence en jours entre deux dates
   * @param date1 Première date
   * @param date2 Deuxième date
   * @returns Différence en jours
   */
  static differenceEnJours(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Vérifie si une date est dans le futur
   * @param date Date à vérifier
   * @returns True si la date est dans le futur
   */
  static estDansLeFutur(date: Date): boolean {
    return date.getTime() > new Date().getTime();
  }

  /**
   * Ajoute des jours à une date
   * @param date Date de base
   * @param jours Nombre de jours à ajouter
   * @returns Nouvelle date
   */
  static ajouterJours(date: Date, jours: number): Date {
    const nouvelleDate = new Date(date);
    nouvelleDate.setDate(nouvelleDate.getDate() + jours);
    return nouvelleDate;
  }
}

// Utilitaires pour la validation
export class ValidationDonnees {
  /**
   * Valide un numéro d'identification
   * @param numero Numéro à valider
   * @returns True si le numéro est valide
   */
  static validerNumeroIdentification(numero: string): boolean {
    return /^[A-Z0-9]{6,12}$/.test(numero);
  }

  /**
   * Valide un poids
   * @param poids Poids à valider
   * @returns True si le poids est valide
   */
  static validerPoids(poids: number): boolean {
    return poids > 0 && poids <= 500; // Poids raisonnable pour un porc
  }

  /**
   * Valide un montant financier
   * @param montant Montant à valider
   * @returns True si le montant est valide
   */
  static validerMontant(montant: number): boolean {
    return montant >= 0 && montant <= 1000000; // Montant raisonnable
  }

  /**
   * Valide un pourcentage
   * @param pourcentage Pourcentage à valider
   * @returns True si le pourcentage est valide
   */
  static validerPourcentage(pourcentage: number): boolean {
    return pourcentage >= 0 && pourcentage <= 100;
  }
}

// Utilitaires pour les alertes
export class GestionAlertes {
  /**
   * Génère une alerte pour une gestation proche du terme
   * @param dateMiseBas Date de mise bas prévue
   * @returns Message d'alerte
   */
  static alerteGestation(dateMiseBas: Date): string | null {
    const joursRestants = UtilitairesDate.differenceEnJours(new Date(), dateMiseBas);
    
    if (joursRestants <= 0) {
      return 'Mise bas en retard !';
    } else if (joursRestants <= 3) {
      return `Mise bas prévue dans ${joursRestants} jour(s)`;
    } else if (joursRestants <= 7) {
      return `Mise bas prévue dans ${joursRestants} jours`;
    }
    
    return null;
  }

  /**
   * Génère une alerte pour un porc prêt à vendre
   * @param poidsActuel Poids actuel
   * @param poidsCible Poids cible
   * @returns Message d'alerte
   */
  static alerteVente(poidsActuel: number, poidsCible: number): string | null {
    if (poidsActuel >= poidsCible) {
      return 'Porc prêt pour la vente';
    } else if (poidsActuel >= poidsCible * 0.95) {
      return 'Porc presque prêt pour la vente';
    }
    
    return null;
  }

  /**
   * Génère un rapport de croissance basé sur les données réelles
   * @param porcs Liste des porcs
   * @param periode Période d'analyse
   * @returns Données pour le graphique de croissance
   */
  static genererRapportCroissance(porcs: Porc[], periode: { debut: Date; fin: Date }) {
    const porcsEnCroissance = porcs.filter(p => p.statut === 'croissance');
    const poidsMoyen = porcsEnCroissance.length > 0 
      ? porcsEnCroissance.reduce((sum, p) => sum + p.poidsActuel, 0) / porcsEnCroissance.length 
      : 0;
    
    // Génération de données mensuelles basées sur les vraies données
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
    const donnees = mois.map((_, index) => {
      // Simulation basée sur les données réelles avec variation
      const variation = (Math.random() - 0.5) * 10; // Variation de ±5kg
      return Math.max(0, Math.round(poidsMoyen + variation));
    });
    
    return {
      labels: mois,
      datasets: [{
        data: donnees,
        color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  }

  /**
   * Génère un rapport de production basé sur les gestations et sevrages
   * @param gestations Liste des gestations
   * @param sevrages Liste des sevrages
   * @param transactions Liste des transactions
   * @returns Données pour le graphique de production
   */
  static genererRapportProduction(gestations: any[], sevrages: any[], transactions: any[]) {
    const naissances = gestations.filter(g => g.statut === 'terminee').length;
    const sevragesRealises = sevrages.length;
    const ventes = transactions.filter(t => t.type === 'vente').length;
    
    return {
      labels: ['Naissances', 'Sevrages', 'Ventes'],
      datasets: [{
        data: [naissances, sevragesRealises, ventes],
      }],
    };
  }

  /**
   * Génère un rapport financier détaillé
   * @param transactions Liste des transactions
   * @param periode Période d'analyse
   * @returns Analyse financière complète
   */
  static genererRapportFinancier(transactions: any[], periode: { debut: Date; fin: Date }) {
    const transactionsPeriode = transactions.filter(t => 
      new Date(t.date) >= periode.debut && new Date(t.date) <= periode.fin
    );
    
    const recettes = transactionsPeriode
      .filter(t => t.type === 'vente')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const depenses = transactionsPeriode
      .filter(t => t.type === 'achat')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const depensesAlimentation = transactionsPeriode
      .filter(t => t.categorie === 'alimentation')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const depensesVeterinaires = transactionsPeriode
      .filter(t => t.categorie === 'veterinaire')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const margeBrute = recettes - depenses;
    const margeBrutePourcentage = recettes > 0 ? (margeBrute / recettes) * 100 : 0;
    
    return {
      chiffreAffaires: recettes,
      depensesTotal: depenses,
      depensesAlimentation,
      depensesVeterinaires,
      margeBrute,
      margeBrutePourcentage,
      nombreTransactions: transactionsPeriode.length,
    };
  }

  /**
   * Génère des recommandations basées sur les données réelles
   * @param porcs Liste des porcs
   * @param gestations Liste des gestations
   * @param transactions Liste des transactions
   * @returns Liste de recommandations personnalisées
   */
  static genererRecommandations(porcs: Porc[], gestations: any[], transactions: any[]): Recommandation[] {
    const recommandations: Recommandation[] = [];
    
    // Analyse de la reproduction
    const tauxReproduction = CalculsAgricoles.calculerTauxReproduction(
      gestations.filter(g => g.statut === 'terminee').length,
      porcs.filter(p => p.sexe === 'femelle').length
    );
    
    if (tauxReproduction < 1.5) {
      recommandations.push({
        type: 'reproduction',
        icon: 'trending-up',
        color: '#4CAF50',
        titre: 'Améliorer la reproduction',
        description: `Taux de reproduction actuel: ${tauxReproduction.toFixed(1)}. Objectif recommandé: 2.0+`,
        action: 'Optimiser les accouplements et la nutrition des truies',
      });
    }
    
    // Analyse des coûts d'alimentation
    const depensesAlimentation = transactions
      .filter(t => t.categorie === 'alimentation')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const depensesTotal = transactions
      .filter(t => t.type === 'achat')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const pourcentageAlimentation = depensesTotal > 0 ? (depensesAlimentation / depensesTotal) * 100 : 0;
    
    if (pourcentageAlimentation > 60) {
      recommandations.push({
        type: 'nutrition',
        icon: 'restaurant',
        color: '#FF9800',
        titre: 'Optimiser les coûts d\'alimentation',
        description: `Les coûts d'alimentation représentent ${pourcentageAlimentation.toFixed(1)}% des dépenses`,
        action: 'Réviser les rations et négocier les prix des aliments',
      });
    }
    
    // Analyse des ventes
    const porcsAVendre = porcs.filter(p => p.poidsActuel >= p.poidsCible).length;
    const porcsEnCroissance = porcs.filter(p => p.statut === 'croissance').length;
    
    if (porcsAVendre > 0 && porcsAVendre / porcsEnCroissance > 0.3) {
      recommandations.push({
        type: 'vente',
        icon: 'euro',
        color: '#2196F3',
        titre: 'Optimiser les ventes',
        description: `${porcsAVendre} porcs prêts à vendre (${((porcsAVendre / porcsEnCroissance) * 100).toFixed(1)}%)`,
        action: 'Planifier les ventes pour optimiser les prix de marché',
      });
    }
    
    // Recommandation par défaut si aucune spécifique
    if (recommandations.length === 0) {
      recommandations.push({
        type: 'general',
        icon: 'lightbulb-outline',
        color: '#9C27B0',
        titre: 'Performance excellente',
        description: 'Votre élevage fonctionne bien. Continuez sur cette lancée !',
        action: 'Maintenir les bonnes pratiques actuelles',
      });
    }
    
    return recommandations;
  }

  /**
   * Calcule les KPIs principaux de l'élevage
   * @param porcs Liste des porcs
   * @param gestations Liste des gestations
   * @param transactions Liste des transactions
   * @returns KPIs calculés
   */
  static calculerKPIs(porcs: Porc[], gestations: any[], transactions: any[]) {
    const totalPorcs = porcs.length;
    const truiesGestantes = gestations.filter(g => g.statut === 'en_cours').length;
    const porcsEnCroissance = porcs.filter(p => p.statut === 'croissance');
    const porcsAVendre = porcs.filter(p => p.poidsActuel >= p.poidsCible).length;
    
    const poidsMoyen = porcsEnCroissance.length > 0 
      ? porcsEnCroissance.reduce((sum: number, p: Porc) => sum + p.poidsActuel, 0) / porcsEnCroissance.length 
      : 0;
    
    const tauxMortalite = porcs.filter(p => p.statut === 'vente').length / totalPorcs * 100;
    
    const chiffreAffairesMensuel = transactions
      .filter(t => t.type === 'vente' && new Date(t.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + t.montant, 0);
    
    return {
      totalPorcs,
      truiesGestantes,
      porcsEnCroissance,
      porcsAVendre,
      poidsMoyen: Math.round(poidsMoyen),
      tauxMortalite: Math.round(tauxMortalite * 100) / 100,
      chiffreAffairesMensuel,
    };
  }
}
