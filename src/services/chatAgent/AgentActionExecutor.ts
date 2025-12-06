/**
 * Gestionnaire d'actions pour l'agent conversationnel
 * Exécute les actions demandées par l'utilisateur via l'agent
 */

import { AgentAction, AgentActionResult, AgentContext } from '../../types/chatAgent';
import { getDatabase } from '../database';
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
} from '../../database/repositories';
import { format } from 'date-fns';
import { parseMontant, extractMontantFromText } from '../../utils/formatters';

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
    } catch (error: any) {
      console.error('Erreur lors de l\'exécution de l\'action:', error);
      return {
        success: false,
        message: `Désolé, j'ai rencontré une erreur : ${error.message || 'Erreur inconnue'}`,
        error: error.message,
      };
    }
  }

  /**
   * Crée un revenu (vente)
   */
  private async createRevenu(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const repo = new RevenuRepository(db);

    // Extraire le montant (plusieurs méthodes)
    let montant = 0;
    if (params.montant) {
      montant = typeof params.montant === 'string' ? parseMontant(params.montant) : params.montant;
    } else {
      // Essayer de calculer ou extraire depuis le texte
      montant = this.calculateMontant(params);
      if (isNaN(montant) || montant <= 0) {
        // Si on a un texte de description, essayer d'extraire le montant
        if (params.description || params.commentaire) {
          const text = `${params.description || ''} ${params.commentaire || ''}`;
          const extracted = extractMontantFromText(text);
          if (extracted) montant = extracted;
        }
      }
    }

    if (isNaN(montant) || montant <= 0) {
      throw new Error('Le montant de la vente est requis. Veuillez préciser le montant (ex: "800 000 FCFA" ou "800000").');
    }

    const date = params.date || new Date().toISOString().split('T')[0];
    const nombre = params.nombre || params.nombre_porcs || params.quantite || 1;
    const acheteur = params.acheteur || params.client || params.buyer || 'client';

    const revenu = await repo.create({
      projet_id: this.context.projetId,
      montant,
      categorie: params.categorie || 'vente_porc',
      date,
      description: params.description || `Vente de ${nombre} porc(s) à ${acheteur}`,
      commentaire: params.commentaire,
      poids_kg: params.poids_total || params.poids || params.poids_kg,
      animal_id: params.animal_id,
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
  private async createDepense(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const repo = new DepensePonctuelleRepository(db);

    // Valider et calculer le montant
    let montant: number;
    
    // Essayer d'extraire le montant depuis params.montant
    if (params.montant !== undefined && params.montant !== null) {
      montant = this.parseMontant(params.montant);
      
      if (isNaN(montant) || montant <= 0) {
        // Si le parsing a échoué, essayer d'extraire depuis d'autres champs
        montant = this.extractMontantFromParams(params);
        if (isNaN(montant) || montant <= 0) {
          throw new Error('Le montant doit être un nombre positif. Veuillez préciser le montant de la dépense (ex: "5000 FCFA" ou "5 000 francs").');
        }
      }
    } else {
      // Essayer d'extraire depuis d'autres champs ou calculer
      montant = this.extractMontantFromParams(params);
      
      if (isNaN(montant) || montant <= 0) {
        // Essayer de calculer le montant si possible
        try {
          montant = this.calculateMontant(params);
        } catch (error) {
          throw new Error('Le montant de la dépense est requis. Veuillez préciser le montant (ex: "5000 FCFA" ou "5 000 francs").');
        }
      }
    }

    // Mapper les catégories depuis le langage naturel
    const categorie = this.mapCategorieDepense(params.categorie || params.type);

    const depense = await repo.create({
      projet_id: this.context.projetId,
      montant,
      categorie: categorie as any, // Type assertion car mapCategorieDepense retourne toujours une valeur valide
      libelle_categorie: params.libelle || params.description,
      date: params.date || new Date().toISOString().split('T')[0],
      commentaire: params.commentaire,
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
  private async createVisiteVeterinaire(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const repo = new VisiteVeterinaireRepository(db);

    const visite = await repo.create({
      projet_id: this.context.projetId,
      date_visite: params.date || new Date().toISOString().split('T')[0],
      veterinaire: params.veterinaire || params.nom_veterinaire,
      motif: params.motif || params.raison || 'Consultation',
      animaux_examines: params.animaux_ids ? params.animaux_ids.join(',') : undefined,
      diagnostic: params.diagnostic,
      prescriptions: params.prescriptions,
      recommandations: params.recommandations,
      cout: params.cout || params.montant,
      prochaine_visite: params.prochaine_visite,
      notes: params.notes,
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
  private async createVaccination(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const repo = new VaccinationRepository(db);

    // Calculer la date de rappel (généralement 21 jours pour la plupart des vaccins)
    const dateRappel = params.date_rappel || this.calculateDateRappel(params.date || new Date().toISOString());

    const vaccination = await repo.create({
      projet_id: this.context.projetId,
      animal_id: params.animal_id,
      lot_id: params.lot_id,
      vaccin: params.vaccin || params.type_vaccin,
      nom_vaccin: params.nom_vaccin || params.vaccin,
      date_vaccination: params.date || new Date().toISOString().split('T')[0],
      date_rappel: dateRappel,
      veterinaire: params.veterinaire,
      cout: params.cout,
      notes: params.notes,
      animal_ids: params.animal_ids ? JSON.stringify(params.animal_ids) : undefined,
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
  private async createTraitement(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const repo = new TraitementRepository(db);

    const traitement = await repo.create({
      projet_id: this.context.projetId,
      maladie_id: params.maladie_id,
      animal_id: params.animal_id,
      lot_id: params.lot_id,
      type: params.type || 'autre',
      nom_medicament: params.nom_medicament || params.medicament,
      voie_administration: params.voie_administration || 'orale',
      dosage: params.dosage || 'Selon prescription',
      frequence: params.frequence || '1 fois par jour',
      date_debut: params.date_debut || new Date().toISOString().split('T')[0],
      date_fin: params.date_fin,
      duree_jours: params.duree_jours,
      veterinaire: params.veterinaire,
      cout: params.cout,
      notes: params.notes,
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
   */
  private async getStatistics(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const animalRepo = new AnimalRepository(db);
    const revenuRepo = new RevenuRepository(db);
    const depenseRepo = new DepensePonctuelleRepository(db);
    const peseeRepo = new PeseeRepository(db);

    // Statistiques des animaux
    const statsAnimaux = await animalRepo.getStats(this.context.projetId);

    // Statistiques financières
    const revenus = await revenuRepo.findByProjet(this.context.projetId);
    const depenses = await depenseRepo.findByProjet(this.context.projetId);
    
    const totalRevenus = revenus.reduce((sum, r) => sum + (r.montant || 0), 0);
    const totalDepenses = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);
    const solde = totalRevenus - totalDepenses;

    // Statistiques des pesées
    const statsPesees = await peseeRepo.getStatsProjet(this.context.projetId);

    // Statistiques des dépenses par catégorie
    const depensesParCategorie = depenses.reduce((acc, d) => {
      const cat = d.categorie || 'autre';
      acc[cat] = (acc[cat] || 0) + (d.montant || 0);
      return acc;
    }, {} as Record<string, number>);

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
   */
  private async getReminders(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const vaccinationRepo = new VaccinationRepository(db);
    const rappelRepo = new RappelVaccinationRepository(db);

    // Récupérer toutes les vaccinations du projet
    const vaccinations = await vaccinationRepo.findByProjet(this.context.projetId);
    
    // Récupérer les IDs des vaccinations qui ont des rappels
    const vaccinationIds = vaccinations.map(v => v.id).filter(Boolean) as string[];
    
    // Récupérer les rappels associés (si la méthode existe)
    let rappelsVaccination: any[] = [];
    if (vaccinationIds.length > 0) {
      // Récupérer les rappels pour chaque vaccination
      for (const vaccId of vaccinationIds) {
        const rappels = await rappelRepo.findByVaccination(vaccId);
        rappelsVaccination.push(...rappels);
      }
    }
    
    // Récupérer les vaccinations avec date de rappel proche (7 jours)
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + 7);
    const maintenant = new Date();
    
    const rappelsProches = vaccinations.filter(v => {
      if (!v.date_rappel) return false;
      const dateRappel = new Date(v.date_rappel);
      return dateRappel <= dateLimite && dateRappel >= maintenant;
    });

    const reminders = [
      ...rappelsVaccination.map(r => {
        const vaccination = vaccinations.find(v => v.id === r.vaccination_id);
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
      ...rappelsProches.map(v => ({
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

    const message = reminders.length > 0
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
  private async scheduleReminder(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const vaccinationRepo = new VaccinationRepository(db);
    const rappelRepo = new RappelVaccinationRepository(db);

    // Si une vaccination_id est fournie, créer directement le rappel
    if (params.vaccination_id) {
      const rappel = await rappelRepo.create({
        vaccination_id: params.vaccination_id,
        date_rappel: params.date_rappel || params.date,
        envoi: false,
      });

      const message = `Rappel programmé pour le ${format(new Date(rappel.date_rappel), 'dd/MM/yyyy')}. Vous serez notifié à temps.`;

      return {
        success: true,
        message,
        data: rappel,
      };
    }

    // Sinon, créer d'abord une vaccination planifiée, puis le rappel
    const animalIds = params.animal_id ? [params.animal_id] : undefined;
    const vaccination = await vaccinationRepo.create({
      projet_id: this.context.projetId,
      animal_ids: animalIds,
      lot_id: params.lot_id,
      vaccin: params.vaccin || params.type_vaccin,
      nom_vaccin: params.nom_vaccin || params.vaccin,
      date_vaccination: params.date_vaccination || new Date().toISOString().split('T')[0],
      date_rappel: params.date_rappel || params.date,
      statut: 'planifie',
      notes: params.notes,
      type_prophylaxie: 'vaccin_obligatoire',
      produit_administre: params.nom_vaccin || params.vaccin || 'Vaccin',
      dosage: params.dosage || 'Selon prescription',
      raison_traitement: 'prevention',
    });

    // Créer le rappel associé
    if (vaccination.id && vaccination.date_rappel) {
      const rappel = await rappelRepo.create({
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
  private async searchAnimal(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const repo = new AnimalRepository(db);

    const animaux = await repo.findByProjet(this.context.projetId);
    const result = animaux.filter((a) => {
      const searchTerm = (params.nom || params.search || '').toLowerCase();
      return (
        a.nom?.toLowerCase().includes(searchTerm) ||
        a.code?.toLowerCase().includes(searchTerm)
      );
    });

    return {
      success: true,
      message: result.length > 0 ? `J'ai trouvé ${result.length} animal(aux) correspondant(s).` : 'Aucun animal trouvé.',
      data: result,
    };
  }

  /**
   * Récupère le statut des stocks
   */
  private async getStockStatus(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const stockRepo = new StockRepository(db);

    // Récupérer tous les stocks du projet
    const stocks = await stockRepo.findByProjet(this.context.projetId);

    // Filtrer les stocks avec alerte active
    const stocksAlerte = stocks.filter(s => s.alerte_active);
    
    // Calculer les totaux par catégorie
    const stocksParCategorie = stocks.reduce((acc, s) => {
      const cat = s.categorie || 'autre';
      if (!acc[cat]) {
        acc[cat] = { total: 0, alertes: 0 };
      }
      acc[cat].total += s.quantite_actuelle || 0;
      if (s.alerte_active) {
        acc[cat].alertes += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; alertes: number }>);

    let message = `Statut des stocks-là :\n`;
    message += `- Total : ${stocks.length} type(s) d'aliment\n`;
    
    if (stocksAlerte.length > 0) {
      message += `- ⚠️ ${stocksAlerte.length} alerte(s) : stock faible !\n`;
      stocksAlerte.forEach(s => {
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
  private async calculateCosts(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const depenseRepo = new DepensePonctuelleRepository(db);
    const chargeFixeRepo = new ChargeFixeRepository(db);

    // Période de calcul (par défaut : dernier mois)
    const dateFin = params.date_fin || new Date().toISOString().split('T')[0];
    const dateDebut = params.date_debut || (() => {
      const d = new Date(dateFin);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().split('T')[0];
    })();

    // Récupérer les dépenses de la période
    const depenses = await depenseRepo.findByPeriod(this.context.projetId, dateDebut, dateFin);
    
    // Récupérer les charges fixes
    const chargesFixes = await chargeFixeRepo.findByProjet(this.context.projetId);

    // Calculer les coûts par catégorie
    const coutsParCategorie = depenses.reduce((acc, d) => {
      const cat = d.categorie || 'autre';
      acc[cat] = (acc[cat] || 0) + (d.montant || 0);
      return acc;
    }, {} as Record<string, number>);

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

  private calculateMontant(params: any): number {
    // Montant direct
    if (params.montant_total) return Number(params.montant_total);
    if (params.montant) return Number(params.montant);
    
    // Calcul pour les ventes (nombre × poids × prix)
    if (params.nombre && params.poids && params.prix_unitaire) {
      return Number(params.nombre) * Number(params.poids) * Number(params.prix_unitaire);
    }
    
    // Calcul pour les ventes (poids total × prix)
    if (params.poids_total && params.prix_unitaire) {
      return Number(params.poids_total) * Number(params.prix_unitaire);
    }
    
    // Calcul pour les dépenses (quantité × prix unitaire)
    if (params.quantite && params.prix_unitaire) {
      return Number(params.quantite) * Number(params.prix_unitaire);
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
  private async createMaladie(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const repo = new MaladieRepository(db);

    const maladie = await repo.create({
      projet_id: this.context.projetId,
      animal_id: params.animal_id,
      lot_id: params.lot_id,
      type: params.type || 'autre',
      nom_maladie: params.nom_maladie || params.nom || 'Maladie non spécifiée',
      gravite: params.gravite || 'moyenne',
      symptomes: params.symptomes || params.description,
      diagnostic: params.diagnostic,
      date_debut: params.date_debut || new Date().toISOString().split('T')[0],
      date_fin: params.date_fin,
      gueri: params.gueri || false,
      contagieux: params.contagieux || false,
      nombre_animaux_affectes: params.nombre_animaux_affectes,
      nombre_deces: params.nombre_deces,
      veterinaire: params.veterinaire,
      cout_traitement: params.cout_traitement || params.cout,
      notes: params.notes,
    });

    const message = `C'est noté ! Maladie ${maladie.nom_maladie} enregistrée le ${format(new Date(maladie.date_debut), 'dd/MM/yyyy')}. ${maladie.contagieux ? '⚠️ Attention, c\'est contagieux !' : ''}`;

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
  private async searchLot(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const vaccinationRepo = new VaccinationRepository(db);
    const traitementRepo = new TraitementRepository(db);

    // Rechercher les lots dans les vaccinations et traitements
    const vaccinations = await vaccinationRepo.findByProjet(this.context.projetId);
    const traitements = await traitementRepo.findByProjet(this.context.projetId);
    
    // Extraire les lot_id uniques
    const lotsVaccination = new Set(
      vaccinations
        .map(v => v.lot_id)
        .filter(Boolean) as string[]
    );
    const lotsTraitement = new Set(
      traitements
        .map(t => t.lot_id)
        .filter(Boolean) as string[]
    );
    
    const tousLesLots = new Set([...lotsVaccination, ...lotsTraitement]);
    
    let result: any[] = [];
    
    if (params.lot_id) {
      // Recherche spécifique par lot_id
      const lotId = params.lot_id;
      const vaccsLot = vaccinations.filter(v => v.lot_id === lotId);
      const traitesLot = traitements.filter(t => t.lot_id === lotId);
      
      result = [{
        lot_id: lotId,
        vaccinations: vaccsLot.length,
        traitements: traitesLot.length,
        activites: [...vaccsLot, ...traitesLot],
      }];
    } else if (params.search || params.nom) {
      // Recherche par terme
      const searchTerm = (params.search || params.nom || '').toLowerCase();
      result = Array.from(tousLesLots)
        .filter(lotId => lotId?.toLowerCase().includes(searchTerm))
        .map(lotId => {
          const vaccs = vaccinations.filter(v => v.lot_id === lotId);
          const traites = traitements.filter(t => t.lot_id === lotId);
          return {
            lot_id: lotId,
            vaccinations: vaccs.length,
            traitements: traites.length,
            activites: [...vaccs, ...traites],
          };
        });
    } else {
      // Lister tous les lots
      result = Array.from(tousLesLots).map(lotId => {
        const vaccs = vaccinations.filter(v => v.lot_id === lotId);
        const traites = traitements.filter(t => t.lot_id === lotId);
        return {
          lot_id: lotId,
          vaccinations: vaccs.length,
          traitements: traites.length,
          activites: [...vaccs, ...traites],
        };
      });
    }

    const message = result.length > 0
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
   */
  private async analyzeData(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const animalRepo = new AnimalRepository(db);
    const revenuRepo = new RevenuRepository(db);
    const depenseRepo = new DepensePonctuelleRepository(db);
    const peseeRepo = new PeseeRepository(db);
    const vaccinationRepo = new VaccinationRepository(db);
    const maladieRepo = new MaladieRepository(db);

    // Statistiques des animaux
    const statsAnimaux = await animalRepo.getStats(this.context.projetId);

    // Revenus et dépenses (30 derniers jours)
    const dateFin = new Date();
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - 30);
    
    const revenus = await revenuRepo.findByPeriod(
      this.context.projetId,
      dateDebut.toISOString().split('T')[0],
      dateFin.toISOString().split('T')[0]
    );
    const depenses = await depenseRepo.findByPeriod(
      this.context.projetId,
      dateDebut.toISOString().split('T')[0],
      dateFin.toISOString().split('T')[0]
    );

    const totalRevenus = revenus.reduce((sum, r) => sum + (r.montant || 0), 0);
    const totalDepenses = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);

    // Statistiques des pesées
    const statsPesees = await peseeRepo.getStatsProjet(this.context.projetId);

    // Vaccinations récentes
    const vaccinations = await vaccinationRepo.findByProjet(this.context.projetId);
    const vaccinationsRecentes = vaccinations.filter(v => {
      const dateVacc = new Date(v.date_vaccination);
      const dateLimite = new Date();
      dateLimite.setDate(dateLimite.getDate() - 30);
      return dateVacc >= dateLimite;
    });

    // Maladies récentes
    const maladies = await maladieRepo.findByProjet(this.context.projetId);
    const maladiesRecentes = maladies.filter(m => {
      const dateDebut = new Date(m.date_debut);
      const dateLimite = new Date();
      dateLimite.setDate(dateLimite.getDate() - 30);
      return dateDebut >= dateLimite;
    });

    // Analyse et recommandations
    const recommandations: string[] = [];
    
    if (statsAnimaux.porcelets > 0 && vaccinationsRecentes.length === 0) {
      recommandations.push('Pense à vacciner tes porcelets-là');
    }
    
    if (totalDepenses > totalRevenus) {
      recommandations.push('Attention, tes dépenses dépassent tes revenus ce mois-ci');
    }
    
    if (maladiesRecentes.length > 0) {
      recommandations.push(`${maladiesRecentes.length} maladie(s) récente(s) détectée(s), surveille bien tes animaux`);
    }

    const message = `Analyse de ton exploitation :
- Animaux : ${statsAnimaux.actifs} actifs (${statsAnimaux.truies} truies, ${statsAnimaux.verrats} verrats, ${statsAnimaux.porcelets} porcelets)
- Finances (30j) : ${totalRevenus.toLocaleString('fr-FR')} FCFA revenus, ${totalDepenses.toLocaleString('fr-FR')} FCFA dépenses
- Poids moyen : ${statsPesees.poidsMoyen.toFixed(1)} kg
- Vaccinations (30j) : ${vaccinationsRecentes.length}
- Maladies (30j) : ${maladiesRecentes.length}
${recommandations.length > 0 ? '\nRecommandations :\n' + recommandations.map(r => `- ${r}`).join('\n') : ''}`;

    return {
      success: true,
      message,
      data: {
        statsAnimaux,
        finances: { totalRevenus, totalDepenses, solde: totalRevenus - totalDepenses },
        statsPesees,
        vaccinationsRecentes: vaccinationsRecentes.length,
        maladiesRecentes: maladiesRecentes.length,
        recommandations,
      },
    };
  }

  /**
   * Crée une charge fixe
   */
  private async createChargeFixe(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const repo = new ChargeFixeRepository(db);

    // Extraire le montant
    let montant = 0;
    if (params.montant) {
      montant = typeof params.montant === 'string' ? parseMontant(params.montant) : params.montant;
    } else {
      throw new Error('Le montant de la charge fixe est requis.');
    }

    if (isNaN(montant) || montant <= 0) {
      throw new Error('Le montant doit être un nombre positif.');
    }

    // Mapper la catégorie
    const categorieMap: Record<string, any> = {
      'salaires': 'salaires',
      'alimentation': 'alimentation',
      'entretien': 'entretien',
      'vaccins': 'vaccins',
      'eau_electricite': 'eau_electricite',
      'eau': 'eau_electricite',
      'électricité': 'eau_electricite',
      'electricite': 'eau_electricite',
    };
    const categorie = categorieMap[params.categorie?.toLowerCase()] || 'autre';

    // Mapper la fréquence
    const frequenceMap: Record<string, any> = {
      'mensuel': 'mensuel',
      'mensuelle': 'mensuel',
      'mois': 'mensuel',
      'trimestriel': 'trimestriel',
      'trimestrielle': 'trimestriel',
      'trimestre': 'trimestriel',
      'annuel': 'annuel',
      'annuelle': 'annuel',
      'an': 'annuel',
      'année': 'annuel',
      'annee': 'annuel',
    };
    const frequence = frequenceMap[params.frequence?.toLowerCase()] || 'mensuel';

    const chargeFixe = await repo.create({
      projet_id: this.context.projetId,
      categorie,
      libelle: params.libelle || params.nom || params.description || 'Charge fixe',
      montant,
      date_debut: params.date_debut || params.date || new Date().toISOString().split('T')[0],
      frequence,
      jour_paiement: params.jour_paiement,
      notes: params.notes || params.commentaire,
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
  private async createPesee(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const peseeRepo = new PeseeRepository(db);
    const animalRepo = new AnimalRepository(db);

    // Trouver l'animal par code ou ID
    let animalId = params.animal_id;
    if (!animalId && params.animal_code) {
      const animaux = await animalRepo.findByProjet(this.context.projetId);
      const animal = animaux.find(a => a.code.toLowerCase() === params.animal_code.toLowerCase());
      if (animal) {
        animalId = animal.id;
      } else {
        throw new Error(`Animal avec le code "${params.animal_code}" introuvable.`);
      }
    }

    if (!animalId) {
      throw new Error('L\'identifiant de l\'animal est requis (animal_id ou animal_code).');
    }

    // Extraire le poids
    const poids = params.poids || params.poids_kg || params.poidsKg;
    if (!poids || isNaN(poids) || poids <= 0) {
      throw new Error('Le poids est requis et doit être supérieur à 0 (en kg).');
    }

    const pesee = await peseeRepo.create({
      projet_id: this.context.projetId,
      animal_id: animalId,
      date: params.date || new Date().toISOString().split('T')[0],
      poids_kg: typeof poids === 'string' ? parseFloat(poids.replace(',', '.')) : poids,
      commentaire: params.commentaire || params.notes,
    });

    const animal = await animalRepo.findById(animalId);
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
  private async createIngredient(params: any): Promise<AgentActionResult> {
    if (!this.context) {
      throw new Error('Contexte non initialisé');
    }

    const db = await getDatabase();
    const repo = new IngredientRepository(db);

    if (!params.nom) {
      throw new Error('Le nom de l\'ingrédient est requis.');
    }

    // Extraire le prix unitaire
    let prixUnitaire = 0;
    if (params.prix_unitaire || params.prixUnitaire || params.prix) {
      const prixStr = params.prix_unitaire || params.prixUnitaire || params.prix;
      prixUnitaire = typeof prixStr === 'string' ? parseMontant(prixStr) : prixStr;
    }

    if (isNaN(prixUnitaire) || prixUnitaire < 0) {
      throw new Error('Le prix unitaire est requis et doit être un nombre positif.');
    }

    // Mapper l'unité
    const uniteMap: Record<string, string> = {
      'kg': 'kg',
      'kilogramme': 'kg',
      'kilogrammes': 'kg',
      'g': 'g',
      'gramme': 'g',
      'grammes': 'g',
      'sac': 'sac',
      'sacs': 'sac',
      'tonne': 'tonne',
      'tonnes': 'tonne',
    };
    const unite = uniteMap[params.unite?.toLowerCase()] || params.unite || 'kg';

    const ingredient = await repo.create({
      nom: params.nom,
      unite,
      prix_unitaire: prixUnitaire,
      proteine_pourcent: params.proteine_pourcent || params.proteine || null,
      energie_kcal: params.energie_kcal || params.energie || null,
    });

    const message = `Ingrédient créé : ${ingredient.nom} - ${prixUnitaire.toLocaleString('fr-FR')} FCFA/${unite}.`;

    return {
      success: true,
      data: ingredient,
      message,
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
  private extractMontantFromParams(params: any): number {
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
      if (params[field] !== undefined && params[field] !== null) {
        const parsed = this.parseMontant(params[field]);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }

    // Essayer d'extraire depuis la description ou commentaire si présent
    const textFields = ['description', 'commentaire', 'libelle', 'details', 'texte'];
    for (const field of textFields) {
      if (params[field] && typeof params[field] === 'string') {
        // Regex pour trouver un montant dans le texte (ex: "5000 FCFA", "5 000 francs")
        const montantMatch = params[field].match(/(\d[\d\s,]*)\s*(?:FCFA|CFA|francs?|F)/i);
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

