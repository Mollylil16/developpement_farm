/**
 * Service de rappels et notifications proactives
 * Analyse les données et génère des rappels automatiques
 */

import { Reminder, AgentContext } from '../../types/chatAgent';
import { getDatabase } from '../database';
import {
  VaccinationRepository,
  TraitementRepository,
  GestationRepository,
  AnimalRepository,
} from '../../database/repositories';
import { differenceInDays, addDays, format } from 'date-fns';
import { scheduleNotification } from '../notificationsService';

export class ProactiveRemindersService {
  private context: AgentContext | null = null;

  async initialize(context: AgentContext): Promise<void> {
    this.context = context;
  }

  /**
   * Analyse les données et génère des rappels proactifs
   */
  async generateProactiveReminders(): Promise<Reminder[]> {
    if (!this.context) {
      return [];
    }

    const reminders: Reminder[] = [];

    // Rappels de vaccinations
    const vaccinationReminders = await this.checkVaccinationReminders();
    reminders.push(...vaccinationReminders);

    // Rappels de traitements
    const traitementReminders = await this.checkTraitementReminders();
    reminders.push(...traitementReminders);

    // Rappels de sevrage
    const sevrageReminders = await this.checkSevrageReminders();
    reminders.push(...sevrageReminders);

    // Rappels de gestations
    const gestationReminders = await this.checkGestationReminders();
    reminders.push(...gestationReminders);

    // Programmer les notifications
    await this.scheduleNotifications(reminders);

    return reminders;
  }

  /**
   * Vérifie les rappels de vaccinations
   */
  private async checkVaccinationReminders(): Promise<Reminder[]> {
    if (!this.context) {
      return [];
    }

    const db = await getDatabase();
    const repo = new VaccinationRepository(db);
    const vaccinations = await repo.findByProjet(this.context.projetId);

    const reminders: Reminder[] = [];
    const now = new Date();

    for (const vaccination of vaccinations) {
      if (vaccination.date_rappel) {
        const dateRappel = new Date(vaccination.date_rappel);
        const joursRestants = differenceInDays(dateRappel, now);

        // Rappel 3 jours avant
        if (joursRestants <= 3 && joursRestants >= 0) {
          reminders.push({
            id: `vacc_${vaccination.id}`,
            type: 'vaccination',
            title: `Rappel de vaccination : ${vaccination.nom_vaccin || vaccination.vaccin}`,
            description: `Le rappel de vaccination ${vaccination.nom_vaccin || vaccination.vaccin} est prévu dans ${joursRestants} jour(s).`,
            dueDate: vaccination.date_rappel,
            animalId: vaccination.animal_id || undefined,
            lotId: vaccination.lot_id || undefined,
            projetId: this.context.projetId,
            isCompleted: false,
            createdAt: now.toISOString(),
          });
        }
      }
    }

    return reminders;
  }

  /**
   * Vérifie les rappels de traitements
   */
  private async checkTraitementReminders(): Promise<Reminder[]> {
    if (!this.context) {
      return [];
    }

    const db = await getDatabase();
    const repo = new TraitementRepository(db);
    const traitements = await repo.findByProjet(this.context.projetId);

    const reminders: Reminder[] = [];
    const now = new Date();

    for (const traitement of traitements) {
      if (!traitement.termine && traitement.date_fin) {
        const dateFin = new Date(traitement.date_fin);
        const joursRestants = differenceInDays(dateFin, now);

        // Rappel 1 jour avant la fin
        if (joursRestants <= 1 && joursRestants >= 0) {
          reminders.push({
            id: `trait_${traitement.id}`,
            type: 'traitement',
            title: `Fin de traitement : ${traitement.nom_medicament}`,
            description: `Le traitement ${traitement.nom_medicament} se termine ${joursRestants === 0 ? 'aujourd\'hui' : 'demain'}.`,
            dueDate: traitement.date_fin,
            animalId: traitement.animal_id || undefined,
            lotId: traitement.lot_id || undefined,
            projetId: this.context.projetId,
            isCompleted: false,
            createdAt: now.toISOString(),
          });
        }
      }
    }

    return reminders;
  }

  /**
   * Vérifie les rappels de sevrage
   */
  private async checkSevrageReminders(): Promise<Reminder[]> {
    if (!this.context) {
      return [];
    }

    const db = await getDatabase();
    const animalRepo = new AnimalRepository(db);
    const animaux = await animalRepo.findByProjet(this.context.projetId);

    const reminders: Reminder[] = [];
    const now = new Date();

    // Chercher les porcelets qui approchent de 21 jours (âge de sevrage)
    for (const animal of animaux) {
      if (animal.date_naissance && animal.categorie_poids === 'porcelet') {
        const dateNaissance = new Date(animal.date_naissance);
        const ageJours = differenceInDays(now, dateNaissance);

        // Rappel à 18 jours (3 jours avant le sevrage)
        if (ageJours >= 18 && ageJours <= 21) {
          reminders.push({
            id: `sevrage_${animal.id}`,
            type: 'sevrage',
            title: `Sevrage proche : ${animal.nom || animal.code}`,
            description: `Le porcelet ${animal.nom || animal.code} a ${ageJours} jours. Le sevrage est recommandé vers 21 jours.`,
            dueDate: addDays(dateNaissance, 21).toISOString(),
            animalId: animal.id,
            projetId: this.context.projetId,
            isCompleted: false,
            createdAt: now.toISOString(),
          });
        }
      }
    }

    return reminders;
  }

  /**
   * Vérifie les rappels de gestations
   */
  private async checkGestationReminders(): Promise<Reminder[]> {
    if (!this.context) {
      return [];
    }

    const db = await getDatabase();
    const repo = new GestationRepository(db);
    // Récupérer toutes les gestations en cours du projet
    const gestations = await repo.findEnCoursByProjet(this.context.projetId);

    const reminders: Reminder[] = [];
    const now = new Date();

    for (const gestation of gestations) {
      if (gestation.date_mise_bas_prevue && gestation.statut === 'en_cours') {
        const dateMiseBas = new Date(gestation.date_mise_bas_prevue);
        const joursRestants = differenceInDays(dateMiseBas, now);

        // Rappels à 7 jours, 3 jours et 1 jour
        if (joursRestants <= 7 && joursRestants >= 0) {
          reminders.push({
            id: `gest_${gestation.id}_${joursRestants}`,
            type: 'visite',
            title: `Mise bas proche : ${gestation.truie_nom || 'Truie'}`,
            description: `La truie ${gestation.truie_nom || 'truie'} devrait mettre bas dans ${joursRestants} jour(s).`,
            dueDate: gestation.date_mise_bas_prevue,
            animalId: gestation.truie_id,
            projetId: this.context.projetId,
            isCompleted: false,
            createdAt: now.toISOString(),
          });
        }
      }
    }

    return reminders;
  }

  /**
   * Programme les notifications pour les rappels
   */
  private async scheduleNotifications(reminders: Reminder[]): Promise<void> {
    for (const reminder of reminders) {
      try {
        const dueDate = new Date(reminder.dueDate);
        await scheduleNotification(dueDate, {
          title: reminder.title,
          body: reminder.description,
          data: {
            type: 'reminder',
            reminderId: reminder.id,
            reminderType: reminder.type,
          },
          priority: 'default',
        });
      } catch (error) {
        console.error(`Erreur lors de la programmation du rappel ${reminder.id}:`, error);
      }
    }
  }

  /**
   * Génère un message proactif pour l'utilisateur
   */
  generateProactiveMessage(reminders: Reminder[]): string {
    if (reminders.length === 0) {
      return '';
    }

    const urgentReminders = reminders.filter((r) => {
      const jours = differenceInDays(new Date(r.dueDate), new Date());
      return jours <= 1;
    });

    if (urgentReminders.length > 0) {
      return `Bonjour ! J'ai ${urgentReminders.length} rappel(s) urgent(s) pour toi aujourd'hui. Veux-tu que je te les liste ?`;
    }

    return `Bonjour ! J'ai ${reminders.length} rappel(s) à venir. Veux-tu que je te les montre ?`;
  }
}

