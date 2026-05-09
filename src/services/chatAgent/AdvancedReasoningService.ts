/**
 * Service de raisonnement avancé pour Kouakou
 * Implémente le chain-of-thought et l'analyse contextuelle intelligente
 */

import { ChatMessage, AgentContext, AgentAction } from '../../types/chatAgent';
import { getDatabase } from '../database';
import {
  AnimalRepository,
  StockRepository,
  RevenuRepository,
  DepensePonctuelleRepository,
  VaccinationRepository,
  TraitementRepository,
  GestationRepository,
} from '../../database/repositories';
import { format, differenceInDays, addDays } from 'date-fns';

export interface ReasoningContext {
  userIntent: string;
  conversationHistory: ChatMessage[];
  availableData: {
    animals?: any[];
    stocks?: any[];
    recentRevenus?: any[];
    recentDepenses?: any[];
    upcomingVaccinations?: any[];
    upcomingTreatments?: any[];
    upcomingSevrages?: any[];
    upcomingGestations?: any[];
  };
  possibleActions: AgentAction[];
  recommendations: string[];
  proactiveSuggestions: string[];
}

export class AdvancedReasoningService {
  private context: AgentContext | null = null;

  async initialize(context: AgentContext): Promise<void> {
    this.context = context;
  }

  /**
   * Analyse avancée avec chain-of-thought
   * Étape 1 : Analyser l'intention de l'utilisateur
   * Étape 2 : Examiner le contexte historique
   * Étape 3 : Charger les données disponibles depuis la DB
   * Étape 4 : Identifier les actions possibles
   * Étape 5 : Générer des recommandations et suggestions proactives
   */
  async analyzeWithChainOfThought(
    userMessage: string,
    conversationHistory: ChatMessage[]
  ): Promise<ReasoningContext> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    // Étape 1 : Analyser l'intention de l'utilisateur
    const userIntent = this.analyzeUserIntent(userMessage, conversationHistory);

    // Étape 2 : Examiner le contexte historique
    const historicalContext = this.analyzeHistoricalContext(conversationHistory);

    // Étape 3 : Charger les données disponibles depuis la DB
    const availableData = await this.loadAvailableData();

    // Étape 4 : Identifier les actions possibles
    const possibleActions = this.identifyPossibleActions(userIntent, availableData, historicalContext);

    // Étape 5 : Générer des recommandations et suggestions proactives
    const recommendations = this.generateRecommendations(availableData, historicalContext);
    const proactiveSuggestions = await this.generateProactiveSuggestions(availableData);

    return {
      userIntent,
      conversationHistory,
      availableData,
      possibleActions,
      recommendations,
      proactiveSuggestions,
    };
  }

  /**
   * Étape 1 : Analyser l'intention de l'utilisateur
   */
  private analyzeUserIntent(userMessage: string, conversationHistory: ChatMessage[]): string {
    const normalized = userMessage.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Analyser les mots-clés pour déterminer l'intention
    const intentKeywords: Record<string, string[]> = {
      vente: ['vendu', 'vendre', 'vente', 'vendu des porcs', 'vendu un porc'],
      mortalite: ['mort', 'morts', 'creve', 'decede', 'mortalite'],
      depense: ['depense', 'depenses', 'achete', 'paye', 'payer'],
      statistiques: ['statistique', 'statistiques', 'bilan', 'combien', 'nombre'],
      stocks: ['stock', 'stocks', 'nourriture', 'aliment', 'provende'],
      sante: ['malade', 'maladie', 'vaccin', 'traitement', 'veterinaire'],
      analyse: ['analyse', 'analyser', 'performance', 'rentabilite'],
    };

    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      if (keywords.some(keyword => normalized.includes(keyword))) {
        return intent;
      }
    }

    // Vérifier le contexte historique pour les intentions implicites
    const lastAssistantMessage = conversationHistory
      .filter(msg => msg.role === 'assistant')
      .pop();
    
    if (lastAssistantMessage?.metadata?.pendingAction) {
      return 'clarification'; // Réponse à une question précédente
    }

    return 'general'; // Intention générale
  }

  /**
   * Étape 2 : Examiner le contexte historique
   */
  private analyzeHistoricalContext(conversationHistory: ChatMessage[]): {
    recentTopics: string[];
    pendingActions: AgentAction[];
    userExperience: 'beginner' | 'intermediate' | 'expert';
  } {
    const recentMessages = conversationHistory.slice(-10);
    const recentTopics: string[] = [];
    const pendingActions: AgentAction[] = [];

    // Extraire les sujets récents
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        const topics = this.extractTopics(msg.content);
        recentTopics.push(...topics);
      }
      if (msg.metadata?.pendingAction) {
        pendingActions.push(msg.metadata.pendingAction);
      }
    }

    // Déterminer le niveau d'expérience de l'utilisateur
    const userExperience = this.determineUserExperience(conversationHistory);

    return {
      recentTopics: [...new Set(recentTopics)], // Dédupliquer
      pendingActions,
      userExperience,
    };
  }

  /**
   * Étape 3 : Charger les données disponibles depuis la DB
   */
  private async loadAvailableData(): Promise<ReasoningContext['availableData']> {
    if (!this.context) {
      return {};
    }

    const db = await getDatabase();
    const animalRepo = new AnimalRepository();
    const stockRepo = new StockRepository();
    const revenuRepo = new RevenuRepository();
    const depenseRepo = new DepensePonctuelleRepository();
    const vaccinationRepo = new VaccinationRepository();
    const traitementRepo = new TraitementRepository();
    const gestationRepo = new GestationRepository();

    const now = new Date();
    const in7Days = addDays(now, 7);
    const in3Days = addDays(now, 3);

    try {
      // Animaux actifs
      const animals = await animalRepo.findByProjet(this.context.projetId);
      const activeAnimals = animals.filter(a => a.statut?.toLowerCase() === 'actif');

      // Stocks (vérifier les niveaux bas)
      const stocks = await stockRepo.findByProjet(this.context.projetId);
      const lowStocks = stocks.filter(s => {
        const quantite = s.quantite || 0;
        const seuilMin = s.seuil_min || 0;
        return quantite <= seuilMin;
      });

      // Revenus récents (30 derniers jours)
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - 30);
      const recentRevenus = await revenuRepo.findByPeriod(
        this.context.projetId,
        format(dateDebut, 'yyyy-MM-dd'),
        format(now, 'yyyy-MM-dd')
      );

      // Dépenses récentes (30 derniers jours)
      const recentDepenses = await depenseRepo.findByPeriod(
        this.context.projetId,
        format(dateDebut, 'yyyy-MM-dd'),
        format(now, 'yyyy-MM-dd')
      );

      // Vaccinations à venir (7 prochains jours)
      const vaccinations = await vaccinationRepo.findByProjet(this.context.projetId);
      const upcomingVaccinations = vaccinations.filter(v => {
        const dateVacc = new Date(v.date_vaccination);
        return dateVacc >= now && dateVacc <= in7Days && v.statut === 'planifie';
      });

      // Traitements en cours ou à venir
      const traitements = await traitementRepo.findByProjet(this.context.projetId);
      const upcomingTreatments = traitements.filter(t => {
        const dateFin = new Date(t.date_fin);
        return dateFin >= now && dateFin <= in7Days;
      });

      // Sevrages à venir (porcelets de 18 jours)
      const upcomingSevrages = activeAnimals.filter(animal => {
        if (!animal.date_naissance) return false;
        const age = differenceInDays(now, new Date(animal.date_naissance));
        return age >= 15 && age <= 21; // Prêt pour sevrage entre 15 et 21 jours
      });

      // Gestations à venir (mise bas dans 7 jours)
      // Utiliser findEnCoursByProjet (méthode correcte du repository)
      let upcomingGestations: any[] = [];
      try {
        const gestations = await gestationRepo.findEnCoursByProjet(this.context.projetId);
        upcomingGestations = gestations.filter(g => {
          if (!g.date_mise_bas_prevue) return false;
          const dateMiseBas = new Date(g.date_mise_bas_prevue);
          return dateMiseBas >= now && dateMiseBas <= in7Days && g.statut === 'en_cours';
        });
      } catch (gestationError) {
        console.warn('[AdvancedReasoningService] Erreur chargement gestations:', gestationError);
        // Continuer sans les gestations si erreur
        upcomingGestations = [];
      }

      return {
        animals: activeAnimals,
        stocks: lowStocks,
        recentRevenus,
        recentDepenses,
        upcomingVaccinations,
        upcomingTreatments,
        upcomingSevrages,
        upcomingGestations,
      };
    } catch (error) {
      console.error('[AdvancedReasoningService] Erreur chargement données:', error);
      return {};
    }
  }

  /**
   * Étape 4 : Identifier les actions possibles
   */
  private identifyPossibleActions(
    userIntent: string,
    availableData: ReasoningContext['availableData'],
    historicalContext: ReturnType<typeof this.analyzeHistoricalContext>
  ): AgentAction[] {
    const actions: AgentAction[] = [];

    // Si une action est en attente, la prioriser
    if (historicalContext.pendingActions.length > 0) {
      return historicalContext.pendingActions.map(action => ({
        ...action,
        params: { ...action.params },
      }));
    }

    // Actions basées sur l'intention
    switch (userIntent) {
      case 'statistiques':
        actions.push({ type: 'get_statistics', params: {} });
        break;
      case 'stocks':
        actions.push({ type: 'get_stock_status', params: {} });
        break;
      case 'analyse':
        actions.push({ type: 'analyze_data', params: {} });
        break;
    }

    return actions;
  }

  /**
   * Étape 5 : Générer des recommandations
   */
  private generateRecommendations(
    availableData: ReasoningContext['availableData'],
    historicalContext: ReturnType<typeof this.analyzeHistoricalContext>
  ): string[] {
    const recommendations: string[] = [];

    // Recommandations basées sur les données
    if (availableData.stocks && availableData.stocks.length > 0) {
      recommendations.push(`Attention : ${availableData.stocks.length} stock(s) en niveau bas. Pense à réapprovisionner.`);
    }

    if (availableData.recentRevenus && availableData.recentDepenses) {
      const totalRevenus = availableData.recentRevenus.reduce((sum, r) => sum + (r.montant || 0), 0);
      const totalDepenses = availableData.recentDepenses.reduce((sum, d) => sum + (d.montant || 0), 0);
      const benefice = totalRevenus - totalDepenses;
      
      if (benefice < 0) {
        recommendations.push(`Bénéfice négatif ce mois : ${Math.abs(benefice).toLocaleString('fr-FR')} FCFA. Analyse les coûts pour optimiser.`);
      } else if (benefice > 0) {
        recommendations.push(`Excellent bénéfice ce mois : ${benefice.toLocaleString('fr-FR')} FCFA ! Continue comme ça.`);
      }
    }

    return recommendations;
  }

  /**
   * Génère des suggestions proactives basées sur les données
   */
  private async generateProactiveSuggestions(
    availableData: ReasoningContext['availableData']
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Suggestions basées sur les stocks
    if (availableData.stocks && availableData.stocks.length > 0) {
      const stockNames = availableData.stocks.map(s => s.nom || 'aliment').join(', ');
      suggestions.push(`Je vois que tes stocks de ${stockNames} baissent. Veux-tu que je te propose des fournisseurs ou que je calcule la quantité à commander ?`);
    }

    // Suggestions basées sur les sevrages à venir
    if (availableData.upcomingSevrages && availableData.upcomingSevrages.length > 0) {
      suggestions.push(`Tes porcelets du lot sont prêts au sevrage dans quelques jours (${availableData.upcomingSevrages.length} porcelet(s)). On programme le sevrage ?`);
    }

    // Suggestions basées sur les gestations
    if (availableData.upcomingGestations && availableData.upcomingGestations.length > 0) {
      suggestions.push(`Attention : ${availableData.upcomingGestations.length} truie(s) vont mettre bas dans moins de 7 jours. Prépare les enclos de mise bas !`);
    }

    // Suggestions basées sur les vaccinations
    if (availableData.upcomingVaccinations && availableData.upcomingVaccinations.length > 0) {
      suggestions.push(`Rappel : ${availableData.upcomingVaccinations.length} vaccination(s) prévue(s) cette semaine. N'oublie pas !`);
    }

    return suggestions;
  }

  /**
   * Extrait les sujets d'un message
   */
  private extractTopics(message: string): string[] {
    const topics: string[] = [];
    const normalized = message.toLowerCase();

    if (normalized.includes('porc') || normalized.includes('animal')) topics.push('animaux');
    if (normalized.includes('vente') || normalized.includes('vendu')) topics.push('ventes');
    if (normalized.includes('depense') || normalized.includes('achete')) topics.push('depenses');
    if (normalized.includes('sante') || normalized.includes('maladie')) topics.push('sante');
    if (normalized.includes('stock') || normalized.includes('aliment')) topics.push('stocks');

    return topics;
  }

  /**
   * Détermine le niveau d'expérience de l'utilisateur
   */
  private determineUserExperience(conversationHistory: ChatMessage[]): 'beginner' | 'intermediate' | 'expert' {
    // Analyser la complexité des requêtes et la fréquence d'utilisation
    const userMessages = conversationHistory.filter(msg => msg.role === 'user');
    
    if (userMessages.length < 5) {
      return 'beginner';
    }

    // Compter les actions complexes (analyses, optimisations, etc.)
    const complexActions = conversationHistory.filter(
      msg => msg.metadata?.actionExecuted && 
      ['analyze_data', 'calculate_costs'].includes(msg.metadata.actionExecuted)
    ).length;

    if (complexActions > 3) {
      return 'expert';
    }

    return 'intermediate';
  }
}

