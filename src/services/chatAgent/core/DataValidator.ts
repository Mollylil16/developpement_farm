/**
 * Validateur de données pour l'agent conversationnel
 * Vérifie la cohérence et la validité des données avant exécution
 */

import { AgentAction, AgentContext } from '../../../types/chatAgent';
import apiClient from '../../../services/api/apiClient';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class DataValidator {
  private context: AgentContext | null = null;

  async initialize(context: AgentContext): Promise<void> {
    this.context = context;
  }

  /**
   * Valide une action avant exécution
   */
  async validateAction(action: AgentAction): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    if (!this.context) {
      result.valid = false;
      result.errors.push('Contexte non initialisé');
      return result;
    }

    // Validation selon le type d'action
    switch (action.type) {
      case 'create_revenu':
        await this.validateRevenu(action.params, result);
        break;
      case 'create_depense':
        await this.validateDepense(action.params, result);
        break;
      case 'create_pesee':
        await this.validatePesee(action.params, result);
        break;
      case 'create_vaccination':
        await this.validateVaccination(action.params, result);
        break;
      // Ajouter d'autres validations selon besoin
    }

    // Validation générale
    this.validateGeneral(action.params, result);

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Valide un revenu (vente)
   */
  private async validateRevenu(
    params: Record<string, unknown>,
    result: ValidationResult
  ): Promise<void> {
    // Montant obligatoire et valide
    if (!params.montant || typeof params.montant !== 'number') {
      result.errors.push('Le montant de la vente est requis');
    } else if (params.montant <= 0) {
      result.errors.push('Le montant doit être positif');
    } else if (params.montant > 100000000) {
      result.warnings.push("Montant très élevé (> 100M FCFA), vérifiez que c'est correct");
    } else if (params.montant < 1000) {
      result.warnings.push('Montant très faible (< 1000 FCFA), est-ce correct ?');
    }

    // Nombre de porcs (si fourni)
    if (params.nombre !== undefined && params.nombre !== null) {
      const nombre = typeof params.nombre === 'number' ? params.nombre : Number(params.nombre);
      if (isNaN(nombre) || nombre <= 0 || nombre > 10000) {
        result.errors.push('Le nombre de porcs doit être entre 1 et 10000');
      }
    }

    // Poids (si fourni)
    if (params.poids_kg !== undefined && params.poids_kg !== null) {
      const poids = typeof params.poids_kg === 'number' ? params.poids_kg : Number(params.poids_kg);
      if (isNaN(poids) || poids <= 0 || poids > 500) {
        result.errors.push('Le poids doit être entre 1 et 500 kg');
      }
    }

    // Vérifier la cohérence montant/nombre/poids
    if (
      params.montant &&
      typeof params.montant === 'number' &&
      params.nombre !== undefined &&
      params.nombre !== null &&
      params.poids_kg !== undefined &&
      params.poids_kg !== null
    ) {
      const nombre = typeof params.nombre === 'number' ? params.nombre : Number(params.nombre);
      const poids = typeof params.poids_kg === 'number' ? params.poids_kg : Number(params.poids_kg);
      if (!isNaN(nombre) && !isNaN(poids) && nombre > 0 && poids > 0) {
        const prixParKg = params.montant / (nombre * poids);
        if (prixParKg < 500 || prixParKg > 5000) {
          result.warnings.push(
            `Prix par kg: ${prixParKg.toFixed(0)} FCFA/kg (habituellement entre 1000-3000 FCFA/kg)`
          );
        }
      }
    }
  }

  /**
   * Valide une dépense
   */
  private async validateDepense(
    params: Record<string, unknown>,
    result: ValidationResult
  ): Promise<void> {
    // Montant obligatoire
    if (!params.montant || typeof params.montant !== 'number') {
      result.errors.push('Le montant de la dépense est requis');
    } else if (params.montant <= 0) {
      result.errors.push('Le montant doit être positif');
    } else if (params.montant > 50000000) {
      result.warnings.push("Montant très élevé (> 50M FCFA), vérifiez que c'est correct");
    }

    // Catégorie
    const validCategories = [
      'alimentation',
      'medicaments',
      'veterinaire',
      'entretien',
      'equipements',
      'autre',
    ];
    if (
      params.categorie &&
      typeof params.categorie === 'string' &&
      !validCategories.includes(params.categorie)
    ) {
      result.warnings.push(
        `Catégorie "${params.categorie}" non standard, utilisez: ${validCategories.join(', ')}`
      );
    }
  }

  /**
   * Valide une pesée
   */
  private async validatePesee(
    params: Record<string, unknown>,
    result: ValidationResult
  ): Promise<void> {
    // Animal obligatoire
    if (!params.animal_code && !params.animal_id) {
      result.errors.push("Le code ou l'ID de l'animal est requis");
    } else {
      // Vérifier que l'animal existe
      const animalIdentifier =
        (params.animal_code && typeof params.animal_code === 'string'
          ? params.animal_code
          : undefined) ||
        (params.animal_id && typeof params.animal_id === 'string' ? params.animal_id : undefined);
      if (animalIdentifier) {
        await this.validateAnimalExists(animalIdentifier, result);
      }
    }

    // Poids obligatoire et valide
    if (!params.poids_kg || typeof params.poids_kg !== 'number') {
      result.errors.push('Le poids est requis');
    } else if (params.poids_kg <= 0) {
      result.errors.push('Le poids doit être positif');
    } else if (params.poids_kg > 500) {
      result.errors.push('Le poids semble irréaliste (> 500 kg)');
    } else if (params.poids_kg < 0.5) {
      result.warnings.push('Poids très faible (< 0.5 kg), est-ce un porcelet ?');
    }
  }

  /**
   * Valide une vaccination
   */
  private async validateVaccination(
    params: Record<string, unknown>,
    result: ValidationResult
  ): Promise<void> {
    // Au moins un animal ou un lot
    if (!params.animal_id && !params.animal_ids && !params.lot_id) {
      result.errors.push('Au moins un animal ou un lot doit être spécifié');
    }

    // Vaccin obligatoire
    if (!params.vaccin) {
      result.errors.push('Le nom du vaccin est requis');
    }

    // Date de vaccination
    if (params.date_vaccination) {
      const dateValue =
        typeof params.date_vaccination === 'string' ||
        typeof params.date_vaccination === 'number' ||
        params.date_vaccination instanceof Date
          ? params.date_vaccination
          : String(params.date_vaccination);
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const today = new Date();
        today.setHours(23, 59, 59);

        if (date > today) {
          result.warnings.push('Date de vaccination dans le futur, est-ce une planification ?');
        }
      }
    }
  }

  /**
   * Valide qu'un animal existe
   */
  private async validateAnimalExists(
    animalIdentifier: string,
    result: ValidationResult
  ): Promise<void> {
    if (!this.context) return;

    try {
      // Chercher l'animal depuis l'API backend
      let animal;
      if (animalIdentifier.match(/^[A-Z0-9]+$/)) {
        // Code animal
        try {
          const animaux = await apiClient.get<any[]>(`/production/animaux`, {
            params: { projet_id: this.context.projetId },
          });
          animal = animaux.find((a) => a.code === animalIdentifier);
        } catch (apiError) {
          // En cas d'erreur API (permissions, réseau, etc.), on ne bloque pas
          console.warn('[DataValidator] Erreur lors de la vérification de l\'animal:', apiError);
          // On accepte l'animal par défaut plutôt que de bloquer
          return;
        }
      } else {
        // ID animal
        try {
          animal = await apiClient.get<any>(`/production/animaux/${animalIdentifier}`);
        } catch (apiError) {
          // En cas d'erreur API, on ne bloque pas
          console.warn('[DataValidator] Erreur lors de la vérification de l\'animal:', apiError);
          return;
        }
      }

      if (!animal) {
        result.errors.push(`Animal "${animalIdentifier}" introuvable`);
      } else if (animal.statut === 'vendu') {
        result.warnings.push(`L'animal "${animalIdentifier}" a déjà été vendu`);
      } else if (animal.statut === 'mort') {
        result.warnings.push(`L'animal "${animalIdentifier}" est décédé`);
      }
    } catch (error) {
      // Erreur générale - ne pas bloquer pour permettre le fonctionnement de l'agent
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.warn('[DataValidator] Erreur lors de la validation de l\'animal:', errorMessage);
      // On accepte l'animal par défaut plutôt que de bloquer
    }
  }

  /**
   * Validation générale
   */
  private validateGeneral(params: Record<string, unknown>, result: ValidationResult): void {
    // Dates
    if (params.date || params.date_debut || params.date_visite) {
      const dateStr = params.date || params.date_debut || params.date_visite;
      if (
        dateStr &&
        (typeof dateStr === 'string' || typeof dateStr === 'number' || dateStr instanceof Date)
      ) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          result.errors.push(`Date invalide: ${String(dateStr)}`);
        } else {
          const today = new Date();
          today.setHours(23, 59, 59);

          // Pour les ventes passées, la date ne doit pas être dans le futur
          if (date > today && params.date) {
            result.warnings.push('Date dans le futur, est-ce une vente future ?');
          }
        }
      }
    }

    // Montants négatifs
    if (params.montant && typeof params.montant === 'number' && params.montant < 0) {
      result.errors.push('Le montant ne peut pas être négatif');
    }
  }
}
