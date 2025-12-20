/**
 * Gestionnaire d'actions pour l'agent conversationnel
 * Exécute les actions demandées par l'utilisateur via l'agent
 */

import { AgentAction, AgentActionResult, AgentContext } from '../../types/chatAgent';
import {
  RevenuRepository,
  DepensePonctuelleRepository,
  ChargeFixeRepository,
  VisiteVeterinaireRepository,
  VaccinationRepository,
  TraitementRepository,
  MaladieRepository,
  AnimalRepository,
  StockRepository,
  PeseeRepository,
  RappelVaccinationRepository,
  IngredientRepository,
  PlanificationRepository,
} from '../../database/repositories';
import { format } from 'date-fns';
import { parseMontant, extractMontantFromText } from '../../utils/formatters';
import apiClient from '../api/apiClient';

export class AgentActionExecutor {
  private context: AgentContext | null = null;

  async initialize(context: AgentContext): Promise<void> {
    this.context = context;
  }

  async execute(action: AgentAction, context: AgentContext): Promise<AgentActionResult> {
    this.context = context;

    try {
      switch (action.type) {
        case 'create_revenu':
          return await this.createRevenu(action.params);
        case 'create_depense':
          return await this.createDepense(action.params);
        case 'create_charge_fixe':
          return await this.createChargeFixe(action.params);
        case 'create_pesee':
          return await this.createPesee(action.params);
        case 'create_ingredient':
          return await this.createIngredient(action.params);
        case 'create_planification':
          return await this.createPlanification(action.params);
        case 'create_visite_veterinaire':
          return await this.createVisiteVeterinaire(action.params);
        case 'create_vaccination':
          return await this.createVaccination(action.params);
        case 'create_traitement':
          return await this.createTraitement(action.params);
        case 'get_statistics':
          return await this.getStatistics(action.params);
        case 'get_reminders':
          return await this.getReminders(action.params);
        case 'schedule_reminder':
          return await this.scheduleReminder(action.params);
        case 'search_animal':
          return await this.searchAnimal(action.params);
        case 'get_stock_status':
          return await this.getStockStatus(action.params);
        case 'calculate_costs':
          return await this.calculateCosts(action.params);
        case 'create_maladie':
          return await this.createMaladie(action.params);
        case 'search_lot':
          return await this.searchLot(action.params);
        case 'analyze_data':
          return await this.analyzeData(action.params);
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

  /**
   * Crée un revenu (vente)
   */
  private async createRevenu(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Utiliser l'API backend pour créer un revenu

    // Extraire le montant (plusieurs méthodes)
    let montant = 0;
    if (paramsTyped.montant) {
      montant =
        typeof paramsTyped.montant === 'string'
          ? parseMontant(paramsTyped.montant)
          : (paramsTyped.montant as number);
    } else {
      // Essayer de calculer ou extraire depuis le texte
      montant = this.calculateMontant(paramsTyped);
      if (isNaN(montant) || montant <= 0) {
        // Si on a un texte de description, essayer d'extraire le montant
        if (paramsTyped.description || paramsTyped.commentaire) {
          const text = `${paramsTyped.description || ''} ${paramsTyped.commentaire || ''}`;
          const extracted = extractMontantFromText(text);
          if (extracted) montant = extracted;
        }
        // Si toujours pas de montant, essayer depuis le message utilisateur original (si disponible)
        if (
          (isNaN(montant) || montant <= 0) &&
          paramsTyped.userMessage &&
          typeof paramsTyped.userMessage === 'string'
        ) {
          const extracted = extractMontantFromText(paramsTyped.userMessage);
          if (extracted && extracted > 100) {
            // Ignorer les petits nombres (probablement des quantités)
            montant = extracted;
          }
        }
      }
    }

    if (isNaN(montant) || montant <= 0) {
      throw new Error(
        'Le montant de la vente est requis. Veuillez préciser le montant (ex: "800 000 FCFA" ou "800000").'
      );
    }

    const date =
      (paramsTyped.date && typeof paramsTyped.date === 'string'
        ? paramsTyped.date
        : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0];
    const nombre =
      (paramsTyped.nombre as number) ||
      (paramsTyped.nombre_porcs as number) ||
      (paramsTyped.quantite as number) ||
      1;
    const acheteur =
      (paramsTyped.acheteur && typeof paramsTyped.acheteur === 'string'
        ? paramsTyped.acheteur
        : undefined) ||
      (paramsTyped.client && typeof paramsTyped.client === 'string' ? paramsTyped.client : undefined) ||
      (paramsTyped.buyer && typeof paramsTyped.buyer === 'string' ? paramsTyped.buyer : undefined) ||
      'client';

    const revenu = await apiClient.post<any>('/finance/revenus', {
      projet_id: this.context.projetId,
      montant,
      categorie: (paramsTyped.categorie && typeof paramsTyped.categorie === 'string'
        ? paramsTyped.categorie
        : 'vente_porc') || 'vente_porc',
      date,
      description:
        (paramsTyped.description && typeof paramsTyped.description === 'string'
          ? paramsTyped.description
          : undefined) || `Vente de ${nombre} porc(s) à ${acheteur}`,
      commentaire:
        paramsTyped.commentaire && typeof paramsTyped.commentaire === 'string'
          ? paramsTyped.commentaire
          : undefined,
      poids_kg:
        (paramsTyped.poids_total as number) ||
        (paramsTyped.poids as number) ||
        (paramsTyped.poids_kg as number) ||
        undefined,
      animal_id:
        paramsTyped.animal_id && typeof paramsTyped.animal_id === 'string'
          ? paramsTyped.animal_id
          : undefined,
    });

    const message = `Vente enregistrée : ${nombre} porc(s) vendu(s) à ${acheteur} pour ${montant.toLocaleString('fr-FR')} FCFA le ${format(new Date(date), 'dd/MM/yyyy')}.`;

    return {
      success: true,
      data: revenu,
      message,
    };
  }

  /**
   * Crée une dépense
   */
  private async createDepense(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Utiliser l'API backend pour créer une dépense

    // Valider et calculer le montant
    let montant: number;

    // Essayer d'extraire le montant depuis params.montant
    if (paramsTyped.montant !== undefined && paramsTyped.montant !== null) {
      montant = this.parseMontant(
        typeof paramsTyped.montant === 'string' || typeof paramsTyped.montant === 'number'
          ? paramsTyped.montant
          : String(paramsTyped.montant)
      );

      if (isNaN(montant) || montant <= 0) {
        // Si le parsing a échoué, essayer d'extraire depuis d'autres champs
        montant = this.extractMontantFromParams(paramsTyped);
        if (isNaN(montant) || montant <= 0) {
          throw new Error(
            'Le montant doit être un nombre positif. Veuillez préciser le montant de la dépense (ex: "5000 FCFA" ou "5 000 francs").'
          );
        }
      }
    } else {
      // Essayer d'extraire depuis d'autres champs ou calculer
      montant = this.extractMontantFromParams(paramsTyped);

      if (isNaN(montant) || montant <= 0) {
        // Essayer de calculer le montant si possible
        try {
          montant = this.calculateMontant(paramsTyped);
        } catch (error) {
          // Utiliser l'erreur pour fournir un message plus détaillé
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          throw new Error(
            `Le montant de la dépense est requis. Veuillez préciser le montant (ex: "5000 FCFA" ou "5 000 francs"). Détails: ${errorMessage}`
          );
        }
      }
    }

    // Mapper les catégories depuis le langage naturel
    const categorie = this.mapCategorieDepense(
      (paramsTyped.categorie && typeof paramsTyped.categorie === 'string'
        ? paramsTyped.categorie
        : undefined) ||
        (paramsTyped.type && typeof paramsTyped.type === 'string' ? paramsTyped.type : undefined) ||
        ''
    );

    // Créer la dépense via l'API backend
    const depense = await apiClient.post<any>('/finance/depenses-ponctuelles', {
      projet_id: this.context.projetId,
      montant,
      type_depense: categorie as unknown, // Type assertion car mapCategorieDepense retourne toujours une valeur valide
      libelle_categorie:
        (paramsTyped.libelle && typeof paramsTyped.libelle === 'string'
          ? paramsTyped.libelle
          : undefined) ||
        (paramsTyped.description && typeof paramsTyped.description === 'string'
          ? paramsTyped.description
          : undefined),
      date:
        (paramsTyped.date && typeof paramsTyped.date === 'string'
          ? paramsTyped.date
          : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      commentaire:
        paramsTyped.commentaire && typeof paramsTyped.commentaire === 'string'
          ? paramsTyped.commentaire
          : undefined,
    });

    const message = `Enregistré ! Dépense de ${montant.toLocaleString('fr-FR')} FCFA en ${this.getCategorieLabel(categorie)} le ${format(new Date(depense.date), 'dd/MM/yyyy')}.`;

    return {
      success: true,
      data: depense,
      message,
    };
  }

  /**
   * Crée une visite vétérinaire
   */
  private async createVisiteVeterinaire(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Créer la visite vétérinaire via l'API backend
    const visite = await apiClient.post<any>('/sante/visites-veterinaires', {
      projet_id: this.context.projetId,
      date_visite:
        (paramsTyped.date && typeof paramsTyped.date === 'string'
          ? paramsTyped.date
          : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      veterinaire:
        (paramsTyped.veterinaire && typeof paramsTyped.veterinaire === 'string'
          ? paramsTyped.veterinaire
          : undefined) ||
        (paramsTyped.nom_veterinaire && typeof paramsTyped.nom_veterinaire === 'string'
          ? paramsTyped.nom_veterinaire
          : undefined),
      motif:
        (paramsTyped.motif && typeof paramsTyped.motif === 'string' ? paramsTyped.motif : undefined) ||
        (paramsTyped.raison && typeof paramsTyped.raison === 'string' ? paramsTyped.raison : undefined) ||
        'Consultation',
      animaux_examines:
        paramsTyped.animaux_ids && Array.isArray(paramsTyped.animaux_ids)
          ? paramsTyped.animaux_ids.join(',')
          : undefined,
      diagnostic:
        paramsTyped.diagnostic && typeof paramsTyped.diagnostic === 'string'
          ? paramsTyped.diagnostic
          : undefined,
      prescriptions:
        paramsTyped.prescriptions && typeof paramsTyped.prescriptions === 'string'
          ? paramsTyped.prescriptions
          : undefined,
      recommandations:
        paramsTyped.recommandations && typeof paramsTyped.recommandations === 'string'
          ? paramsTyped.recommandations
          : undefined,
      cout:
        (paramsTyped.cout as number) || (paramsTyped.montant as number) || undefined,
      prochaine_visite:
        paramsTyped.prochaine_visite && typeof paramsTyped.prochaine_visite === 'string'
          ? paramsTyped.prochaine_visite
          : undefined,
      notes:
        paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined,
    });

    const message = `Parfait ! J'ai enregistré la visite vétérinaire du ${format(new Date(visite.date_visite), 'dd/MM/yyyy')}${visite.veterinaire ? ` avec ${visite.veterinaire}` : ''}.`;

    return {
      success: true,
      data: visite,
      message,
    };
  }

  /**
   * Crée une vaccination
   */
  private async createVaccination(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Calculer la date de rappel (généralement 21 jours pour la plupart des vaccins)
    const dateRappel =
      (paramsTyped.date_rappel && typeof paramsTyped.date_rappel === 'string'
        ? paramsTyped.date_rappel
        : undefined) ||
      this.calculateDateRappel(
        (paramsTyped.date && typeof paramsTyped.date === 'string'
          ? paramsTyped.date
          : new Date().toISOString()) || new Date().toISOString()
      );

    // Créer la vaccination via l'API backend
    const vaccination = await apiClient.post<any>('/sante/vaccinations', {
      projet_id: this.context.projetId,
      animal_id:
        paramsTyped.animal_id && typeof paramsTyped.animal_id === 'string'
          ? paramsTyped.animal_id
          : undefined,
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
        (paramsTyped.date && typeof paramsTyped.date === 'string'
          ? paramsTyped.date
          : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      date_rappel: dateRappel,
      veterinaire:
        paramsTyped.veterinaire && typeof paramsTyped.veterinaire === 'string'
          ? paramsTyped.veterinaire
          : undefined,
      cout: (paramsTyped.cout as number) || undefined,
      notes:
        paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined,
      animal_ids:
        paramsTyped.animal_ids && Array.isArray(paramsTyped.animal_ids)
          ? paramsTyped.animal_ids
          : undefined,
    });

    const message = `Enregistré ! Vaccination ${vaccination.nom_vaccin || vaccination.vaccin} effectuée le ${format(new Date(vaccination.date_vaccination), 'dd/MM/yyyy')}. Rappel prévu le ${dateRappel ? format(new Date(dateRappel), 'dd/MM/yyyy') : 'non programmé'}.`;

    return {
      success: true,
      data: vaccination,
      message,
    };
  }

  /**
   * Crée un traitement
   */
  private async createTraitement(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Créer le traitement via l'API backend
    const traitement = await apiClient.post<any>('/sante/traitements', {
      projet_id: this.context.projetId,
      maladie_id: paramsTyped.maladie_id && typeof paramsTyped.maladie_id === 'string' ? paramsTyped.maladie_id : undefined,
      animal_id: paramsTyped.animal_id && typeof paramsTyped.animal_id === 'string' ? paramsTyped.animal_id : undefined,
      lot_id: paramsTyped.lot_id && typeof paramsTyped.lot_id === 'string' ? paramsTyped.lot_id : undefined,
      type: (paramsTyped.type && typeof paramsTyped.type === 'string' ? paramsTyped.type : undefined) || 'autre',
      nom_medicament: (paramsTyped.nom_medicament && typeof paramsTyped.nom_medicament === 'string' ? paramsTyped.nom_medicament : undefined) || (paramsTyped.medicament && typeof paramsTyped.medicament === 'string' ? paramsTyped.medicament : undefined),
      voie_administration: (paramsTyped.voie_administration && typeof paramsTyped.voie_administration === 'string' ? paramsTyped.voie_administration : undefined) || 'orale',
      dosage: (paramsTyped.dosage && typeof paramsTyped.dosage === 'string' ? paramsTyped.dosage : undefined) || 'Selon prescription',
      frequence: (paramsTyped.frequence && typeof paramsTyped.frequence === 'string' ? paramsTyped.frequence : undefined) || '1 fois par jour',
      date_debut: (paramsTyped.date_debut && typeof paramsTyped.date_debut === 'string' ? paramsTyped.date_debut : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      date_fin: paramsTyped.date_fin && typeof paramsTyped.date_fin === 'string' ? paramsTyped.date_fin : undefined,
      duree_jours: paramsTyped.duree_jours && typeof paramsTyped.duree_jours === 'number' ? paramsTyped.duree_jours : undefined,
      veterinaire: paramsTyped.veterinaire && typeof paramsTyped.veterinaire === 'string' ? paramsTyped.veterinaire : undefined,
      cout: paramsTyped.cout && typeof paramsTyped.cout === 'number' ? paramsTyped.cout : undefined,
      notes: paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined,
    });

    const message = `Traitement enregistré ! ${traitement.nom_medicament} administré à partir du ${format(new Date(traitement.date_debut), 'dd/MM/yyyy')}.`;

    return {
      success: true,
      data: traitement,
      message,
    };
  }

  /**
   * Récupère les statistiques
   * @param params - Paramètres optionnels pour filtrer les statistiques (ex: période, catégorie)
   */
  private async getStatistics(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    // Utiliser params pour valider et logger les filtres demandés
    if (params && typeof params === 'object') {
      const filters = params as Record<string, unknown>;
      if (Object.keys(filters).length > 0) {
        console.log('[AgentActionExecutor] Filtres de statistiques demandés:', filters);
      }
    }

    // Récupérer les données depuis l'API backend
    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: this.context.projetId },
    });
    
    // Calculer les statistiques des animaux
    const statsAnimaux = {
      actifs: animaux.filter((a) => a.statut === 'actif').length,
      truies: animaux.filter((a) => a.sexe === 'femelle' && a.reproducteur).length,
      verrats: animaux.filter((a) => a.sexe === 'male' && a.reproducteur).length,
      porcelets: animaux.filter((a) => a.categorie_poids === 'porcelet').length,
    };

    // Statistiques financières
    const revenus = await apiClient.get<any[]>(`/finance/revenus`, {
      params: { projet_id: this.context.projetId },
    });
    const depenses = await apiClient.get<any[]>(`/finance/depenses-ponctuelles`, {
      params: { projet_id: this.context.projetId },
    });

    const totalRevenus = revenus.reduce((sum, r) => sum + (r.montant || 0), 0);
    const totalDepenses = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);
    const solde = totalRevenus - totalDepenses;

    // Statistiques des pesées
    const pesees = await apiClient.get<any[]>(`/production/pesees`, {
      params: { projet_id: this.context.projetId },
    });
    const statsPesees = {
      nombrePesees: pesees.length,
      poidsMoyen: pesees.length > 0 
        ? pesees.reduce((sum, p) => sum + (p.poids_kg || 0), 0) / pesees.length 
        : 0,
    };

    // Statistiques des dépenses par catégorie
    const depensesParCategorie = depenses.reduce(
      (acc, d) => {
        const cat = d.categorie || 'autre';
        acc[cat] = (acc[cat] || 0) + (d.montant || 0);
        return acc;
      },
      {} as Record<string, number>
    );

    const statistics = {
      animaux: statsAnimaux,
      finances: {
        totalRevenus,
        totalDepenses,
        solde,
        nombreVentes: revenus.length,
        nombreDepenses: depenses.length,
        depensesParCategorie,
      },
      pesees: statsPesees,
    };

    const message = `Statistiques de votre cheptel :
• Animaux actifs : ${statsAnimaux.actifs} (${statsAnimaux.truies} truies, ${statsAnimaux.verrats} verrats, ${statsAnimaux.porcelets} porcelets)
• Finances : ${totalRevenus.toLocaleString('fr-FR')} FCFA de revenus, ${totalDepenses.toLocaleString('fr-FR')} FCFA de dépenses
• Solde : ${solde.toLocaleString('fr-FR')} FCFA
• Pesées : ${statsPesees.nombrePesees} pesées effectuées, poids moyen : ${statsPesees.poidsMoyen.toFixed(1)} kg`;

    return {
      success: true,
      message,
      data: statistics,
    };
  }

  /**
   * Récupère les rappels
   * @param params - Paramètres optionnels pour filtrer les rappels (ex: type, urgence)
   */
  private async getReminders(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    // Utiliser params pour valider et logger les filtres demandés
    if (params && typeof params === 'object') {
      const filters = params as Record<string, unknown>;
      if (Object.keys(filters).length > 0) {
        console.log('[AgentActionExecutor] Filtres de rappels demandés:', filters);
      }
    }

    // Récupérer toutes les vaccinations du projet depuis l'API backend
    const vaccinations = await apiClient.get<any[]>(`/sante/vaccinations`, {
      params: { projet_id: this.context.projetId },
    });

    // Récupérer les IDs des vaccinations qui ont des rappels
    const vaccinationIds = vaccinations.map((v) => v.id).filter(Boolean) as string[];

    // Récupérer les rappels associés depuis l'API backend
    const rappelsVaccination: unknown[] = [];
    if (vaccinationIds.length > 0) {
      // Note: Les rappels de vaccination sont généralement inclus dans la réponse des vaccinations
      // ou peuvent être récupérés via un endpoint dédié si disponible
      for (const vacc of vaccinations) {
        if (vacc.date_rappel) {
          rappelsVaccination.push({
            vaccination_id: vacc.id,
            date_rappel: vacc.date_rappel,
          });
        }
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
   */
  private async scheduleReminder(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Si une vaccination_id est fournie, mettre à jour la vaccination avec la date de rappel
    if (paramsTyped.vaccination_id && typeof paramsTyped.vaccination_id === 'string') {
      // Mettre à jour la vaccination avec la date de rappel via l'API backend
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

    // Sinon, créer d'abord une vaccination planifiée avec date de rappel via l'API backend
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
   * Recherche un animal
   */
  private async searchAnimal(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Récupérer les animaux depuis l'API backend
    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: this.context.projetId },
    });
    const result = animaux.filter((a) => {
      const searchTerm = ((paramsTyped.nom && typeof paramsTyped.nom === 'string' ? paramsTyped.nom : undefined) || (paramsTyped.search && typeof paramsTyped.search === 'string' ? paramsTyped.search : undefined) || '').toLowerCase();
      return (
        a.nom?.toLowerCase().includes(searchTerm) || a.code?.toLowerCase().includes(searchTerm)
      );
    });

    return {
      success: true,
      message:
        result.length > 0
          ? `J'ai trouvé ${result.length} animal(aux) correspondant(s).`
          : 'Aucun animal trouvé.',
      data: result,
    };
  }

  /**
   * Récupère le statut des stocks
   * @param params - Paramètres optionnels pour filtrer les stocks (ex: catégorie, alerte uniquement)
   */
  private async getStockStatus(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    // Utiliser params pour valider et logger les filtres demandés
    if (params && typeof params === 'object') {
      const filters = params as Record<string, unknown>;
      if (Object.keys(filters).length > 0) {
        console.log('[AgentActionExecutor] Filtres de stocks demandés:', filters);
      }
    }

    // Récupérer tous les stocks du projet depuis l'API backend
    const stocks = await apiClient.get<any[]>(`/nutrition/stocks-aliments`, {
      params: { projet_id: this.context.projetId },
    });

    // Filtrer les stocks avec alerte active
    const stocksAlerte = stocks.filter((s) => s.alerte_active);

    // Calculer les totaux par catégorie
    const stocksParCategorie = stocks.reduce(
      (acc, s) => {
        const cat = s.categorie || 'autre';
        if (!acc[cat]) {
          acc[cat] = { total: 0, alertes: 0 };
        }
        acc[cat].total += s.quantite_actuelle || 0;
        if (s.alerte_active) {
          acc[cat].alertes += 1;
        }
        return acc;
      },
      {} as Record<string, { total: number; alertes: number }>
    );

    let message = `Statut des stocks-là :\n`;
    message += `- Total : ${stocks.length} type(s) d'aliment\n`;

    if (stocksAlerte.length > 0) {
      message += `- ⚠️ ${stocksAlerte.length} alerte(s) : stock faible !\n`;
      stocksAlerte.forEach((s) => {
        message += `  • ${s.nom} : ${s.quantite_actuelle} ${s.unite} (seuil : ${s.seuil_alerte} ${s.unite})\n`;
      });
    } else {
      message += `- ✅ Tous les stocks sont suffisants\n`;
    }

    return {
      success: true,
      message,
      data: {
        stocks,
        stocksAlerte,
        stocksParCategorie,
      },
    };
  }

  /**
   * Calcule les coûts
   */
  private async calculateCosts(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Période de calcul (par défaut : dernier mois)
    const dateFin = (paramsTyped.date_fin && typeof paramsTyped.date_fin === 'string' ? paramsTyped.date_fin : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0];
    const dateDebut =
      (paramsTyped.date_debut && typeof paramsTyped.date_debut === 'string' ? paramsTyped.date_debut : undefined) ||
      (() => {
        const d = new Date(dateFin);
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
      })();

    // Récupérer les dépenses de la période depuis l'API backend
    const allDepenses = await apiClient.get<any[]>(`/finance/depenses-ponctuelles`, {
      params: { projet_id: this.context.projetId },
    });
    const depenses = allDepenses.filter(
      (d) => d.date >= dateDebut && d.date <= dateFin
    );

    // Récupérer les charges fixes depuis l'API backend
    const chargesFixes = await apiClient.get<any[]>(`/finance/charges-fixes`, {
      params: { projet_id: this.context.projetId },
    });

    // Calculer les coûts par catégorie
    const coutsParCategorie = depenses.reduce(
      (acc, d) => {
        const cat = d.categorie || 'autre';
        acc[cat] = (acc[cat] || 0) + (d.montant || 0);
        return acc;
      },
      {} as Record<string, number>
    );

    // Total des dépenses ponctuelles
    const totalDepensesPonctuelles = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);

    // Total des charges fixes (convertir en mensuel selon la fréquence)
    const totalChargesFixes = chargesFixes.reduce((sum, c) => {
      let montantMensuel = 0;
      switch (c.frequence) {
        case 'mensuel':
          montantMensuel = c.montant;
          break;
        case 'trimestriel':
          montantMensuel = c.montant / 3;
          break;
        case 'annuel':
          montantMensuel = c.montant / 12;
          break;
      }
      return sum + montantMensuel;
    }, 0);

    // Coût total
    const coutTotal = totalDepensesPonctuelles + totalChargesFixes;

    const message = `Calcul des coûts (${format(new Date(dateDebut), 'dd/MM/yyyy')} - ${format(new Date(dateFin), 'dd/MM/yyyy')}) :
• Dépenses ponctuelles : ${totalDepensesPonctuelles.toLocaleString('fr-FR')} FCFA
• Charges fixes : ${totalChargesFixes.toLocaleString('fr-FR')} FCFA/mois
• Coût total : ${coutTotal.toLocaleString('fr-FR')} FCFA`;

    return {
      success: true,
      message,
      data: {
        periode: { dateDebut, dateFin },
        totalDepensesPonctuelles,
        totalChargesFixes,
        coutTotal,
        coutsParCategorie,
      },
    };
  }

  // Helpers

  private calculateMontant(params: unknown): number {
    const paramsTyped = params as Record<string, unknown>;
    
    // Montant direct
    if (paramsTyped.montant_total) return Number(paramsTyped.montant_total);
    if (paramsTyped.montant) return Number(paramsTyped.montant);

    // Calcul pour les ventes (nombre × poids × prix)
    if (paramsTyped.nombre && paramsTyped.poids && paramsTyped.prix_unitaire) {
      return Number(paramsTyped.nombre) * Number(paramsTyped.poids) * Number(paramsTyped.prix_unitaire);
    }

    // Calcul pour les ventes (poids total × prix)
    if (paramsTyped.poids_total && paramsTyped.prix_unitaire) {
      return Number(paramsTyped.poids_total) * Number(paramsTyped.prix_unitaire);
    }

    // Calcul pour les dépenses (quantité × prix unitaire)
    if (paramsTyped.quantite && paramsTyped.prix_unitaire) {
      return Number(paramsTyped.quantite) * Number(paramsTyped.prix_unitaire);
    }

    throw new Error('Impossible de calculer le montant. Informations manquantes.');
  }

  private mapCategorieDepense(categorie: string): string {
    const mapping: Record<string, string> = {
      alimentation: 'alimentation',
      aliment: 'alimentation',
      provende: 'alimentation',
      médicament: 'medicaments',
      medicament: 'medicaments',
      vaccin: 'vaccins',
      vétérinaire: 'veterinaire',
      veterinaire: 'veterinaire',
      équipement: 'equipements',
      equipement: 'equipements',
      maintenance: 'entretien',
      entretien: 'entretien',
      transport: 'autre',
      eau: 'autre',
      électricité: 'autre',
      electricite: 'autre',
    };

    const lower = categorie?.toLowerCase() || '';
    return mapping[lower] || 'autre';
  }

  private getCategorieLabel(categorie: string): string {
    const labels: Record<string, string> = {
      alimentation: 'alimentation',
      medicaments: 'médicaments',
      vaccins: 'vaccins',
      veterinaire: 'vétérinaire',
      equipements: 'équipements',
      entretien: 'entretien',
      autre: 'autre',
    };
    return labels[categorie] || categorie;
  }

  /**
   * Crée une maladie
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

  /**
   * Recherche un lot d'animaux
   * Note: Les lots sont gérés via les vaccinations et traitements (lot_id)
   */
  private async searchLot(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Rechercher les lots dans les vaccinations et traitements depuis l'API backend
    const vaccinations = await apiClient.get<any[]>(`/sante/vaccinations`, {
      params: { projet_id: this.context.projetId },
    });
    const traitements = await apiClient.get<any[]>(`/sante/traitements`, {
      params: { projet_id: this.context.projetId },
    });

    // Extraire les lot_id uniques
    const lotsVaccination = new Set(vaccinations.map((v) => v.lot_id).filter(Boolean) as string[]);
    const lotsTraitement = new Set(traitements.map((t) => t.lot_id).filter(Boolean) as string[]);

    const tousLesLots = new Set([...lotsVaccination, ...lotsTraitement]);

    let result: unknown[] = [];

    if (paramsTyped.lot_id && typeof paramsTyped.lot_id === 'string') {
      // Recherche spécifique par lot_id
      const lotId = paramsTyped.lot_id;
      const vaccsLot = vaccinations.filter((v) => v.lot_id === lotId);
      const traitesLot = traitements.filter((t) => t.lot_id === lotId);

      result = [
        {
          lot_id: lotId,
          vaccinations: vaccsLot.length,
          traitements: traitesLot.length,
          activites: [...vaccsLot, ...traitesLot],
        },
      ];
    } else if (paramsTyped.search || paramsTyped.nom) {
      // Recherche par terme
      const searchTerm = ((paramsTyped.search && typeof paramsTyped.search === 'string' ? paramsTyped.search : undefined) || (paramsTyped.nom && typeof paramsTyped.nom === 'string' ? paramsTyped.nom : undefined) || '').toLowerCase();
      result = Array.from(tousLesLots)
        .filter((lotId) => lotId?.toLowerCase().includes(searchTerm))
        .map((lotId) => {
          const vaccs = vaccinations.filter((v) => v.lot_id === lotId);
          const traites = traitements.filter((t) => t.lot_id === lotId);
          return {
            lot_id: lotId,
            vaccinations: vaccs.length,
            traitements: traites.length,
            activites: [...vaccs, ...traites],
          };
        });
    } else {
      // Lister tous les lots
      result = Array.from(tousLesLots).map((lotId) => {
        const vaccs = vaccinations.filter((v) => v.lot_id === lotId);
        const traites = traitements.filter((t) => t.lot_id === lotId);
        return {
          lot_id: lotId,
          vaccinations: vaccs.length,
          traitements: traites.length,
          activites: [...vaccs, ...traites],
        };
      });
    }

    const message =
      result.length > 0
        ? `J'ai trouvé ${result.length} lot(s) correspondant(s).`
        : 'Aucun lot trouvé. Les lots sont identifiés via les vaccinations et traitements.';

    return {
      success: true,
      message,
      data: result,
    };
  }

  /**
   * Analyse les données de l'exploitation
   * @param params - Paramètres optionnels pour spécifier le type d'analyse (ex: performance, rentabilité)
   */
  private async analyzeData(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    // Utiliser params pour déterminer le type d'analyse demandé
    let analysisType = 'general';
    if (params && typeof params === 'object') {
      const analysisParams = params as Record<string, unknown>;
      if (analysisParams.type && typeof analysisParams.type === 'string') {
        analysisType = analysisParams.type;
      }
      if (Object.keys(analysisParams).length > 0) {
        console.log("[AgentActionExecutor] Paramètres d'analyse demandés:", analysisParams);
      }
    }
    
    // Utiliser analysisType pour adapter l'analyse en fonction du type demandé
    const analysisConfig = {
      type: analysisType,
      includePerformance: analysisType === 'performance' || analysisType === 'general',
      includeFinancial: analysisType === 'financial' || analysisType === 'general',
      includeProduction: analysisType === 'production' || analysisType === 'general',
    };

    // Utiliser analysisConfig pour adapter l'analyse selon le type demandé
    const analysisResults: Record<string, unknown> = {};

    // Récupérer toutes les données depuis l'API backend
    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: this.context.projetId },
    });
    
    // Statistiques des animaux (toujours incluses)
    const statsAnimaux = {
      actifs: animaux.filter((a) => a.statut === 'actif').length,
      truies: animaux.filter((a) => a.sexe === 'femelle' && a.reproducteur).length,
      verrats: animaux.filter((a) => a.sexe === 'male' && a.reproducteur).length,
      porcelets: animaux.filter((a) => a.categorie_poids === 'porcelet').length,
    };
    analysisResults.animaux = statsAnimaux;

    // Revenus et dépenses (30 derniers jours) - seulement si financier ou général
    let totalRevenus = 0;
    let totalDepenses = 0;
    if (analysisConfig.includeFinancial) {
      const dateFin = new Date();
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - 30);

      const allRevenus = await apiClient.get<any[]>(`/finance/revenus`, {
        params: { projet_id: this.context.projetId },
      });
      const revenus = allRevenus.filter(
        (r) => r.date >= dateDebut.toISOString().split('T')[0] && r.date <= dateFin.toISOString().split('T')[0]
      );
      const allDepenses = await apiClient.get<any[]>(`/finance/depenses-ponctuelles`, {
        params: { projet_id: this.context.projetId },
      });
      const depenses = allDepenses.filter(
        (d) => d.date >= dateDebut.toISOString().split('T')[0] && d.date <= dateFin.toISOString().split('T')[0]
      );

      totalRevenus = revenus.reduce((sum, r) => sum + (r.montant || 0), 0);
      totalDepenses = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);
      analysisResults.finances = { totalRevenus, totalDepenses, solde: totalRevenus - totalDepenses };
    }

    // Statistiques des pesées - seulement si performance ou général
    let statsPesees = null;
    if (analysisConfig.includePerformance) {
      // Calculer les statistiques des pesées depuis l'API backend
      const allPesees = await apiClient.get<any[]>(`/production/pesees`, {
        params: { projet_id: this.context.projetId },
      });
      statsPesees = {
        nombrePesees: allPesees.length,
        poidsMoyen: allPesees.length > 0 
          ? allPesees.reduce((sum, p) => sum + (p.poids_kg || 0), 0) / allPesees.length 
          : 0,
      };
      analysisResults.performance = statsPesees;
    }

    // Analyse et recommandations

    // Construire le message selon le type d'analyse
    let message = `Analyse de ton exploitation (type: ${analysisConfig.type}) :\n`;
    message += `- Animaux : ${statsAnimaux.actifs} actifs (${statsAnimaux.truies} truies, ${statsAnimaux.verrats} verrats, ${statsAnimaux.porcelets} porcelets)\n`;

    if (analysisConfig.includeFinancial) {
      message += `- Finances (30j) : ${totalRevenus.toLocaleString('fr-FR')} FCFA revenus, ${totalDepenses.toLocaleString('fr-FR')} FCFA dépenses\n`;
    }

    if (analysisConfig.includePerformance && statsPesees) {
      message += `- Poids moyen : ${statsPesees.poidsMoyen.toFixed(1)} kg\n`;
    }

    // Vaccinations et maladies récentes (toujours incluses) depuis l'API backend
    const allVaccinations = await apiClient.get<any[]>(`/sante/vaccinations`, {
      params: { projet_id: this.context.projetId },
    });
    const vaccinationsRecentes2 = allVaccinations.filter((v) => {
      const dateVacc = new Date(v.date_vaccination);
      const dateLimite = new Date();
      dateLimite.setDate(dateLimite.getDate() - 30);
      return dateVacc >= dateLimite;
    });

    const allMaladies = await apiClient.get<any[]>(`/sante/maladies`, {
      params: { projet_id: this.context.projetId },
    });
    const maladiesRecentes2 = allMaladies.filter((m) => {
      const dateDebut = new Date(m.date_debut);
      const dateLimite = new Date();
      dateLimite.setDate(dateLimite.getDate() - 30);
      return dateDebut >= dateLimite;
    });

    message += `- Vaccinations (30j) : ${vaccinationsRecentes2.length}\n`;
    message += `- Maladies (30j) : ${maladiesRecentes2.length}\n`;

    // Recommandations
    const recommandations2: string[] = [];
    if (statsAnimaux.porcelets > 0 && vaccinationsRecentes2.length === 0) {
      recommandations2.push('Pense à vacciner tes porcelets-là');
    }

    if (analysisConfig.includeFinancial && totalDepenses > totalRevenus) {
      recommandations2.push('Attention, tes dépenses dépassent tes revenus ce mois-ci');
    }

    if (maladiesRecentes2.length > 0) {
      recommandations2.push(
        `${maladiesRecentes2.length} maladie(s) récente(s) détectée(s), surveille bien tes animaux`
      );
    }

    if (recommandations2.length > 0) {
      message += '\nRecommandations :\n' + recommandations2.map((r) => `- ${r}`).join('\n');
    }

    return {
      success: true,
      message,
      data: {
        ...analysisResults,
        vaccinationsRecentes: vaccinationsRecentes2.length,
        maladiesRecentes: maladiesRecentes2.length,
        recommandations: recommandations2,
      },
    };
  }

  /**
   * Crée une charge fixe
   */
  private async createChargeFixe(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Extraire le montant
    let montant = 0;
    if (paramsTyped.montant) {
      montant = typeof paramsTyped.montant === 'string' ? parseMontant(paramsTyped.montant) : (paramsTyped.montant as number);
    } else {
      throw new Error('Le montant de la charge fixe est requis.');
    }

    if (isNaN(montant) || montant <= 0) {
      throw new Error('Le montant doit être un nombre positif.');
    }

    // Mapper la catégorie
    const categorieMap: Record<string, unknown> = {
      salaires: 'salaires',
      alimentation: 'alimentation',
      entretien: 'entretien',
      vaccins: 'vaccins',
      eau_electricite: 'eau_electricite',
      eau: 'eau_electricite',
      électricité: 'eau_electricite',
      electricite: 'eau_electricite',
    };
    const categorie = (paramsTyped.categorie && typeof paramsTyped.categorie === 'string' ? categorieMap[paramsTyped.categorie.toLowerCase()] : undefined) || 'autre';

    // Mapper la fréquence
    const frequenceMap: Record<string, unknown> = {
      mensuel: 'mensuel',
      mensuelle: 'mensuel',
      mois: 'mensuel',
      trimestriel: 'trimestriel',
      trimestrielle: 'trimestriel',
      trimestre: 'trimestriel',
      annuel: 'annuel',
      annuelle: 'annuel',
      an: 'annuel',
      année: 'annuel',
      annee: 'annuel',
    };
    const frequence = (paramsTyped.frequence && typeof paramsTyped.frequence === 'string' ? frequenceMap[paramsTyped.frequence.toLowerCase()] : undefined) || 'mensuel';

    const chargeFixe = await apiClient.post<any>('/finance/charges-fixes', {
      projet_id: this.context.projetId,
      categorie: categorie as string,
      libelle: (paramsTyped.libelle && typeof paramsTyped.libelle === 'string' ? paramsTyped.libelle : undefined) || (paramsTyped.nom && typeof paramsTyped.nom === 'string' ? paramsTyped.nom : undefined) || (paramsTyped.description && typeof paramsTyped.description === 'string' ? paramsTyped.description : undefined) || 'Charge fixe',
      montant,
      date_debut: (paramsTyped.date_debut && typeof paramsTyped.date_debut === 'string' ? paramsTyped.date_debut : undefined) || (paramsTyped.date && typeof paramsTyped.date === 'string' ? paramsTyped.date : undefined) || new Date().toISOString().split('T')[0],
      frequence: frequence as string,
      jour_paiement: paramsTyped.jour_paiement && typeof paramsTyped.jour_paiement === 'number' ? paramsTyped.jour_paiement : undefined,
      notes: (paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined) || (paramsTyped.commentaire && typeof paramsTyped.commentaire === 'string' ? paramsTyped.commentaire : undefined),
      statut: 'actif',
    });

    const message = `Charge fixe enregistrée : ${chargeFixe.libelle} - ${montant.toLocaleString('fr-FR')} FCFA/${frequence} à partir du ${format(new Date(chargeFixe.date_debut), 'dd/MM/yyyy')}.`;

    return {
      success: true,
      data: chargeFixe,
      message,
    };
  }

  /**
   * Crée une pesée
   */
  private async createPesee(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Trouver l'animal par code ou ID depuis l'API backend
    let animalId = paramsTyped.animal_id && typeof paramsTyped.animal_id === 'string' ? paramsTyped.animal_id : undefined;
    if (!animalId && paramsTyped.animal_code && typeof paramsTyped.animal_code === 'string') {
      const animaux = await apiClient.get<any[]>(`/production/animaux`, {
        params: { projet_id: this.context.projetId },
      });
      const animalCode = paramsTyped.animal_code as string;
      const animal = animaux.find((a) => a.code.toLowerCase() === animalCode.toLowerCase());
      if (animal) {
        animalId = animal.id;
      } else {
        throw new Error(`Animal avec le code "${paramsTyped.animal_code}" introuvable.`);
      }
    }

    if (!animalId) {
      throw new Error("L'identifiant de l'animal est requis (animal_id ou animal_code).");
    }

    // Extraire le poids
    const poids = paramsTyped.poids || paramsTyped.poids_kg || paramsTyped.poidsKg;
    if (!poids || isNaN(Number(poids)) || Number(poids) <= 0) {
      throw new Error('Le poids est requis et doit être supérieur à 0 (en kg).');
    }

    // Créer la pesée via l'API backend
    const pesee = await apiClient.post<any>('/production/pesees', {
      projet_id: this.context.projetId,
      animal_id: animalId,
      date: (paramsTyped.date && typeof paramsTyped.date === 'string' ? paramsTyped.date : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      poids_kg: typeof poids === 'string' ? parseFloat(poids.replace(',', '.')) : (poids as number),
      commentaire: (paramsTyped.commentaire && typeof paramsTyped.commentaire === 'string' ? paramsTyped.commentaire : undefined) || (paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined),
    });

    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: this.context.projetId },
    });
    const animal = animaux.find((a) => a.id === animalId);
    const message = `Pesée enregistrée : ${animal?.code || 'Animal'} - ${pesee.poids_kg} kg le ${format(new Date(pesee.date), 'dd/MM/yyyy')}.`;

    return {
      success: true,
      data: pesee,
      message,
    };
  }

  /**
   * Crée un ingrédient
   */
  private async createIngredient(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Utiliser l'API backend pour créer un ingrédient

    if (!paramsTyped.nom || typeof paramsTyped.nom !== 'string') {
      throw new Error("Le nom de l'ingrédient est requis.");
    }

    // Extraire le prix unitaire
    let prixUnitaire = 0;
    if (paramsTyped.prix_unitaire || paramsTyped.prixUnitaire || paramsTyped.prix) {
      const prixStr = paramsTyped.prix_unitaire || paramsTyped.prixUnitaire || paramsTyped.prix;
      prixUnitaire = typeof prixStr === 'string' ? parseMontant(prixStr) : (prixStr as number);
    }

    if (isNaN(prixUnitaire) || prixUnitaire < 0) {
      throw new Error('Le prix unitaire est requis et doit être un nombre positif.');
    }

    // Mapper l'unité
    const uniteMap: Record<string, string> = {
      kg: 'kg',
      kilogramme: 'kg',
      kilogrammes: 'kg',
      g: 'g',
      gramme: 'g',
      grammes: 'g',
      sac: 'sac',
      sacs: 'sac',
      tonne: 'tonne',
      tonnes: 'tonne',
    };
    const unite = (paramsTyped.unite && typeof paramsTyped.unite === 'string' ? uniteMap[paramsTyped.unite.toLowerCase()] : undefined) || (paramsTyped.unite && typeof paramsTyped.unite === 'string' ? paramsTyped.unite : undefined) || 'kg';

    // Créer l'ingrédient via l'API backend
    const ingredient = await apiClient.post<any>('/nutrition/ingredients', {
      projet_id: this.context.projetId,
      nom: paramsTyped.nom,
      unite,
      prix_unitaire: prixUnitaire,
      proteine_pourcent: (paramsTyped.proteine_pourcent && typeof paramsTyped.proteine_pourcent === 'number' ? paramsTyped.proteine_pourcent : undefined) || (paramsTyped.proteine && typeof paramsTyped.proteine === 'number' ? paramsTyped.proteine : undefined) || null,
      energie_kcal: (paramsTyped.energie_kcal && typeof paramsTyped.energie_kcal === 'number' ? paramsTyped.energie_kcal : undefined) || (paramsTyped.energie && typeof paramsTyped.energie === 'number' ? paramsTyped.energie : undefined) || null,
    });

    const message = `Ingrédient créé : ${ingredient.nom} - ${prixUnitaire.toLocaleString('fr-FR')} FCFA/${unite}.`;

    return {
      success: true,
      data: ingredient,
      message,
    };
  }

  /**
   * Crée une planification (tâche/rappel)
   */
  private async createPlanification(params: unknown): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const paramsTyped = params as Record<string, unknown>;

    // Utiliser l'API backend pour créer une planification

    if (!paramsTyped.titre || typeof paramsTyped.titre !== 'string') {
      throw new Error('Le titre de la tâche est requis.');
    }

    // Déterminer le type
    const type = (paramsTyped.type && typeof paramsTyped.type === 'string' ? paramsTyped.type : undefined) || 'autre';

    // Déterminer la date
    const datePrevue = (paramsTyped.date_prevue && typeof paramsTyped.date_prevue === 'string' ? paramsTyped.date_prevue : undefined) || (paramsTyped.date && typeof paramsTyped.date === 'string' ? paramsTyped.date : undefined) || new Date().toISOString().split('T')[0];

    // Calculer la date de rappel (1 jour avant par défaut)
    const dateRappel = new Date(datePrevue);
    dateRappel.setDate(dateRappel.getDate() - 1);
    const rappel = dateRappel.toISOString().split('T')[0];

    // Créer la planification via l'API backend
    const planification = await apiClient.post<any>('/planification/planifications', {
      projet_id: this.context.projetId,
      type: type,
      titre: paramsTyped.titre,
      description: (paramsTyped.description && typeof paramsTyped.description === 'string' ? paramsTyped.description : undefined) || `Rappel : ${paramsTyped.titre}`,
      date_prevue: datePrevue,
      date_echeance: (paramsTyped.date_echeance && typeof paramsTyped.date_echeance === 'string' ? paramsTyped.date_echeance : undefined) || datePrevue,
      rappel: rappel,
      statut: 'a_faire',
      notes: paramsTyped.notes && typeof paramsTyped.notes === 'string' ? paramsTyped.notes : undefined,
    });

    const dateFormatee = format(new Date(datePrevue), 'dd/MM/yyyy');
    const message = `C'est noté ! Rappel créé dans le planning : "${paramsTyped.titre}" pour le ${dateFormatee}.`;

    return {
      success: true,
      message,
      data: planification,
    };
  }

  private calculateDateRappel(dateVaccination: string, jours: number = 21): string {
    const date = new Date(dateVaccination);
    date.setDate(date.getDate() + jours);
    return date.toISOString().split('T')[0];
  }

  /**
   * Parse un montant depuis différents formats
   * Accepte: "5000", "5 000", "5,000", "5000 FCFA", "5 000 francs", etc.
   */
  private parseMontant(value: string | number): number {
    if (typeof value === 'number') {
      return isNaN(value) ? NaN : value;
    }

    if (typeof value !== 'string') {
      return NaN;
    }

    // Retirer tous les caractères non numériques sauf les chiffres, espaces, virgules et points
    const cleaned = value
      .replace(/[^\d\s,.]/g, '') // Retirer tout sauf chiffres, espaces, virgules, points
      .replace(/\s/g, '') // Retirer les espaces
      .replace(/,/g, '.'); // Remplacer virgule par point

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? NaN : parsed;
  }

  /**
   * Extrait le montant depuis différents champs des params
   */
  private extractMontantFromParams(params: unknown): number {
    const paramsTyped = params as Record<string, unknown>;
    
    // Essayer différents noms de champs possibles
    const possibleFields = [
      'montant',
      'montant_total',
      'prix',
      'cout',
      'coût',
      'amount',
      'price',
      'cost',
      'somme',
      'total',
    ];

    for (const field of possibleFields) {
      if (paramsTyped[field] !== undefined && paramsTyped[field] !== null) {
        const parsed = this.parseMontant(paramsTyped[field] as string | number);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }

    // Essayer d'extraire depuis la description ou commentaire si présent
    const textFields = ['description', 'commentaire', 'libelle', 'details', 'texte'];
    for (const field of textFields) {
      if (paramsTyped[field] && typeof paramsTyped[field] === 'string') {
        // Regex pour trouver un montant dans le texte (ex: "5000 FCFA", "5 000 francs")
        const montantMatch = paramsTyped[field].match(/(\d[\d\s,]*)\s*(?:FCFA|CFA|francs?|F)/i);
        if (montantMatch) {
          const parsed = this.parseMontant(montantMatch[1]);
          if (!isNaN(parsed) && parsed > 0) {
            return parsed;
          }
        }
      }
    }

    return NaN;
  }
}
