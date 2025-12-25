/**
 * Gestionnaire d'actions pour l'agent conversationnel
 * Orchestrateur léger qui délègue aux modules spécialisés par domaine
 * 
 * Version 3.0 - Refactorisé pour maintenabilité et évolutivité
 */

import { AgentAction, AgentActionResult, AgentContext } from '../../types/chatAgent';
import { RevenuActions } from './actions/finance/RevenuActions';
import { DepenseActions } from './actions/finance/DepenseActions';
import { ChargeFixeActions } from './actions/finance/ChargeFixeActions';
import { PeseeActions } from './actions/production/PeseeActions';
import { AnimalActions } from './actions/production/AnimalActions';
import { VaccinationActions } from './actions/sante/VaccinationActions';
import { TraitementActions } from './actions/sante/TraitementActions';
import { VisiteVetoActions } from './actions/sante/VisiteVetoActions';
import { StockAlimentActions } from './actions/nutrition/StockAlimentActions';
import { StatsActions } from './actions/info/StatsActions';
import { AnalyseActions } from './actions/info/AnalyseActions';
import apiClient from '../api/apiClient';
import { format } from 'date-fns';

export class AgentActionExecutor {
  private context: AgentContext | null = null;

  async initialize(context: AgentContext): Promise<void> {
    this.context = context;
  }

  async execute(action: AgentAction, context: AgentContext): Promise<AgentActionResult> {
    this.context = context;

    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    try {
      switch (action.type) {
        // Finance
        case 'create_revenu':
          return await RevenuActions.createRevenu(action.params, context);
        
        case 'create_depense':
          return await DepenseActions.createDepense(action.params, context);
        
        case 'create_charge_fixe':
          return await ChargeFixeActions.createChargeFixe(action.params, context);
        
        // Production
        case 'create_pesee':
          return await PeseeActions.createPesee(action.params, context);
        
        case 'search_animal':
          return await AnimalActions.searchAnimal(action.params, context);
        
        case 'search_lot':
          return await AnimalActions.searchLot(action.params, context);
        
        // Santé
        case 'create_visite_veterinaire':
          return await VisiteVetoActions.createVisiteVeterinaire(action.params, context);
        
        case 'create_vaccination':
          return await VaccinationActions.createVaccination(action.params, context);
        
        case 'create_traitement':
          return await TraitementActions.createTraitement(action.params, context);
        
        case 'create_maladie':
          return await this.createMaladie(action.params); // TODO: Migrer vers module dédié
        
        case 'get_reminders':
          return await this.getReminders(action.params); // TODO: Migrer vers module dédié
        
        case 'schedule_reminder':
          return await this.scheduleReminder(action.params); // TODO: Migrer vers module dédié
        
        // Nutrition
        case 'create_ingredient':
          return await StockAlimentActions.createIngredient(action.params, context);
        
        case 'get_stock_status':
          return await StockAlimentActions.getStockStatus(action.params, context);
        
        // Info
        case 'get_statistics':
          return await StatsActions.getStatistics(action.params, context);
        
        case 'calculate_costs':
          return await StatsActions.calculateCosts(action.params, context);
        
        case 'analyze_data':
          return await AnalyseActions.analyzeData(action.params, context);
        
        case 'create_planification':
          return await AnalyseActions.createPlanification(action.params, context);
        
        default:
          return {
            success: false,
            message: 'Je ne comprends pas cette action.',
          };
      }
    } catch (error: unknown) {
      console.error("Erreur lors de l'exécution de l'action:", error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        message: `Désolé, j'ai rencontré une erreur : ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  // ============================================
  // MÉTHODES TEMPORAIRES (À MIGRER VERS MODULES)
  // ============================================

  /**
   * Récupère les rappels
   * TODO: Migrer vers VaccinationActions ou créer RappelActions.ts
   */
  private async getReminders(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    // Récupérer toutes les vaccinations du projet depuis l'API backend
    const vaccinations = await apiClient.get<any[]>(`/sante/vaccinations`, {
      params: { projet_id: this.context.projetId },
    });

    const rappelsVaccination: unknown[] = [];
    for (const vacc of vaccinations) {
      if (vacc.date_rappel) {
        rappelsVaccination.push({
          vaccination_id: vacc.id,
          date_rappel: vacc.date_rappel,
        });
      }
    }

    // Récupérer les vaccinations avec date de rappel proche (7 jours)
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + 7);
    const maintenant = new Date();

    const rappelsProches = vaccinations.filter((v) => {
      if (!v.date_rappel) return false;
      const dateRappel = new Date(v.date_rappel);
      return dateRappel <= dateLimite && dateRappel >= maintenant;
    });

    const reminders = [
      ...rappelsVaccination.map((r: any) => {
        const vaccination = vaccinations.find((v) => v.id === r.vaccination_id);
        return {
          id: r.id,
          type: 'vaccination' as const,
          title: `Rappel vaccination : ${vaccination?.nom_vaccin || vaccination?.vaccin || 'Vaccin'}`,
          description: `Rappel de vaccination prévu`,
          dueDate: r.date_rappel,
          projetId: this.context!.projetId,
          isCompleted: r.envoi,
          createdAt: new Date().toISOString(),
        };
      }),
      ...rappelsProches.map((v) => ({
        id: `vacc_${v.id}`,
        type: 'vaccination' as const,
        title: `Rappel vaccination : ${v.nom_vaccin || v.vaccin || 'Vaccin'}`,
        description: `Rappel de vaccination prévu`,
        dueDate: v.date_rappel!,
        projetId: this.context!.projetId,
        isCompleted: false,
        createdAt: v.date_creation || new Date().toISOString(),
      })),
    ];

    const message =
      reminders.length > 0
        ? `Vous avez ${reminders.length} rappel(s) à venir. Souhaitez-vous les détails ?`
        : `Aucun rappel en attente. Tout est à jour.`;

    return {
      success: true,
      message,
      data: reminders,
    };
  }

  /**
   * Programme un rappel
   * TODO: Migrer vers VaccinationActions ou créer RappelActions.ts
   */
  private async scheduleReminder(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Si une vaccination_id est fournie, mettre à jour la vaccination avec la date de rappel
    if (paramsTyped.vaccination_id && typeof paramsTyped.vaccination_id === 'string') {
      const vaccination = await apiClient.patch<any>(
        `/sante/vaccinations/${paramsTyped.vaccination_id}`,
        {
          date_rappel:
            (paramsTyped.date_rappel && typeof paramsTyped.date_rappel === 'string'
              ? paramsTyped.date_rappel
              : undefined) ||
            (paramsTyped.date && typeof paramsTyped.date === 'string' ? paramsTyped.date : undefined),
        }
      );

      const message = `Rappel programmé pour le ${format(new Date(vaccination.date_rappel), 'dd/MM/yyyy')}. Vous serez notifié à temps.`;

      return {
        success: true,
        message,
        data: {
          vaccination_id: paramsTyped.vaccination_id,
          date_rappel: vaccination.date_rappel,
        },
      };
    }

    // Sinon, créer une vaccination planifiée avec date de rappel
    const animalIds = paramsTyped.animal_id && typeof paramsTyped.animal_id === 'string'
      ? [paramsTyped.animal_id]
      : undefined;
    const vaccination = await apiClient.post<any>('/sante/vaccinations', {
      projet_id: this.context.projetId,
      animal_ids: animalIds,
      lot_id:
        paramsTyped.lot_id && typeof paramsTyped.lot_id === 'string'
          ? paramsTyped.lot_id
          : undefined,
      vaccin:
        (paramsTyped.vaccin && typeof paramsTyped.vaccin === 'string'
          ? paramsTyped.vaccin
          : undefined) ||
        (paramsTyped.type_vaccin && typeof paramsTyped.type_vaccin === 'string'
          ? paramsTyped.type_vaccin
          : undefined),
      nom_vaccin:
        (paramsTyped.nom_vaccin && typeof paramsTyped.nom_vaccin === 'string'
          ? paramsTyped.nom_vaccin
          : undefined) ||
        (paramsTyped.vaccin && typeof paramsTyped.vaccin === 'string'
          ? paramsTyped.vaccin
          : undefined),
      date_vaccination:
        (paramsTyped.date_vaccination && typeof paramsTyped.date_vaccination === 'string'
          ? paramsTyped.date_vaccination
          : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      date_rappel:
        (paramsTyped.date_rappel && typeof paramsTyped.date_rappel === 'string'
          ? paramsTyped.date_rappel
          : undefined) ||
        (paramsTyped.date && typeof paramsTyped.date === 'string' ? paramsTyped.date : undefined),
      statut: 'planifie',
      notes:
        paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined,
      type_prophylaxie: 'vaccin_obligatoire',
      produit_administre:
        (paramsTyped.nom_vaccin && typeof paramsTyped.nom_vaccin === 'string'
          ? paramsTyped.nom_vaccin
          : undefined) ||
        (paramsTyped.vaccin && typeof paramsTyped.vaccin === 'string'
          ? paramsTyped.vaccin
          : undefined) ||
        'Vaccin',
      dosage:
        paramsTyped.dosage && typeof paramsTyped.dosage === 'string'
          ? paramsTyped.dosage
          : 'Selon prescription',
      raison_traitement: 'prevention',
    });

    // Créer le rappel associé via l'API
    if (vaccination.id && vaccination.date_rappel) {
      const rappel = await apiClient.post<any>('/sante/rappels-vaccinations', {
        vaccination_id: vaccination.id,
        date_rappel: vaccination.date_rappel,
        envoi: false,
      });

      const message = `Rappel programmé pour le ${format(new Date(rappel.date_rappel), 'dd/MM/yyyy')}. Vous serez notifié à temps.`;

      return {
        success: true,
        message,
        data: { vaccination, rappel },
      };
    }

    const message = `C'est noté ! Vaccination planifiée. Je te rappellerai à temps là.`;

    return {
      success: true,
      message,
      data: vaccination,
    };
  }

  /**
   * Crée une maladie
   * TODO: Migrer vers MaladieActions.ts
   */
  private async createMaladie(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Créer la maladie via l'API backend
    const maladie = await apiClient.post<any>('/sante/maladies', {
      projet_id: this.context.projetId,
      animal_id: paramsTyped.animal_id && typeof paramsTyped.animal_id === 'string' ? paramsTyped.animal_id : undefined,
      lot_id: paramsTyped.lot_id && typeof paramsTyped.lot_id === 'string' ? paramsTyped.lot_id : undefined,
      type: (paramsTyped.type && typeof paramsTyped.type === 'string' ? paramsTyped.type : undefined) || 'autre',
      nom_maladie: (paramsTyped.nom_maladie && typeof paramsTyped.nom_maladie === 'string' ? paramsTyped.nom_maladie : undefined) || (paramsTyped.nom && typeof paramsTyped.nom === 'string' ? paramsTyped.nom : undefined) || 'Maladie non spécifiée',
      gravite: (paramsTyped.gravite && typeof paramsTyped.gravite === 'string' ? paramsTyped.gravite : undefined) || 'moyenne',
      symptomes: (paramsTyped.symptomes && typeof paramsTyped.symptomes === 'string' ? paramsTyped.symptomes : undefined) || (paramsTyped.description && typeof paramsTyped.description === 'string' ? paramsTyped.description : undefined) || 'Symptômes non spécifiés',
      diagnostic: paramsTyped.diagnostic && typeof paramsTyped.diagnostic === 'string' ? paramsTyped.diagnostic : undefined,
      date_debut: (paramsTyped.date_debut && typeof paramsTyped.date_debut === 'string' ? paramsTyped.date_debut : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      date_fin: paramsTyped.date_fin && typeof paramsTyped.date_fin === 'string' ? paramsTyped.date_fin : undefined,
      gueri: paramsTyped.gueri === true || paramsTyped.gueri === false ? paramsTyped.gueri : false,
      contagieux: paramsTyped.contagieux === true || paramsTyped.contagieux === false ? paramsTyped.contagieux : false,
      nombre_animaux_affectes: paramsTyped.nombre_animaux_affectes && typeof paramsTyped.nombre_animaux_affectes === 'number' ? paramsTyped.nombre_animaux_affectes : undefined,
      nombre_deces: paramsTyped.nombre_deces && typeof paramsTyped.nombre_deces === 'number' ? paramsTyped.nombre_deces : undefined,
      veterinaire: paramsTyped.veterinaire && typeof paramsTyped.veterinaire === 'string' ? paramsTyped.veterinaire : undefined,
      cout_traitement: (paramsTyped.cout_traitement && typeof paramsTyped.cout_traitement === 'number' ? paramsTyped.cout_traitement : undefined) || (paramsTyped.cout && typeof paramsTyped.cout === 'number' ? paramsTyped.cout : undefined),
      notes: paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined,
    });

    const message = `C'est noté ! Maladie ${maladie.nom_maladie} enregistrée le ${format(new Date(maladie.date_debut), 'dd/MM/yyyy')}. ${maladie.contagieux ? "⚠️ Attention, c'est contagieux !" : ''}`;

    return {
      success: true,
      data: maladie,
      message,
    };
  }
}
