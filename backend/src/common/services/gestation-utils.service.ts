import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * Service partagé pour les utilitaires de gestation
 * Utilisé par ReproductionService et BatchGestationService
 */
@Injectable()
export class GestationUtilsService {
  private readonly logger = new Logger(GestationUtilsService.name);

  /**
   * Durée standard d'une gestation porcine en jours
   */
  static readonly DUREE_GESTATION_JOURS = 114;

  /**
   * Statuts de gestation mode individuel
   */
  static readonly STATUTS_INDIVIDUELS = ['en_cours', 'terminee', 'annulee'] as const;

  /**
   * Statuts de gestation mode batch (anglais)
   */
  static readonly STATUTS_BATCH = ['pregnant', 'delivered', 'aborted', 'lost'] as const;

  /**
   * Mapping des statuts batch vers individuel
   */
  static readonly STATUT_BATCH_TO_INDIVIDUEL: Record<string, string> = {
    'pregnant': 'en_cours',
    'delivered': 'terminee',
    'aborted': 'annulee',
    'lost': 'annulee',
  };

  /**
   * Mapping des statuts individuel vers batch
   */
  static readonly STATUT_INDIVIDUEL_TO_BATCH: Record<string, string> = {
    'en_cours': 'pregnant',
    'terminee': 'delivered',
    'annulee': 'aborted',
  };

  constructor(private databaseService: DatabaseService) {}

  /**
   * Calcule la date de mise bas prévue à partir de la date de sautage
   * @param dateSautage Date de sautage (ISO string ou Date)
   * @returns Date de mise bas prévue (ISO string)
   */
  static calculateExpectedDeliveryDate(dateSautage: string | Date): string {
    const date = typeof dateSautage === 'string' ? new Date(dateSautage) : dateSautage;
    date.setDate(date.getDate() + GestationUtilsService.DUREE_GESTATION_JOURS);
    return date.toISOString();
  }

  /**
   * Génère un ID de gestation unifié
   * Format: gestation_${timestamp}_${random}
   */
  static generateGestationId(): string {
    return `gestation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Valide un animal reproducteur (truie ou verrat)
   */
  async validateReproducteur(
    animalId: string,
    projetId: string,
    type: 'truie' | 'verrat',
  ): Promise<{ id: string; nom: string | null; sexe: string; statut: string; reproducteur: boolean }> {
    const sexeAttendu = type === 'truie' ? 'femelle' : 'male';
    const labelType = type === 'truie' ? 'Truie' : 'Verrat';

    const result = await this.databaseService.query(
      `SELECT id, nom, sexe, statut, reproducteur, projet_id 
       FROM production_animaux 
       WHERE id = $1 AND projet_id = $2`,
      [animalId, projetId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `${labelType} introuvable avec l'ID "${animalId}" dans ce projet. ` +
        `Veuillez vérifier que ${type === 'truie' ? 'la truie' : 'le verrat'} existe et appartient au projet.`
      );
    }

    const animal = result.rows[0];

    // Vérifier le sexe
    if (animal.sexe !== sexeAttendu) {
      throw new BadRequestException(
        `L'animal sélectionné (${animal.nom || animal.id}) n'est pas ${type === 'truie' ? 'une femelle' : 'un mâle'}. ` +
        `${type === 'truie' ? 'Seules les truies (femelles)' : 'Seuls les verrats (mâles)'} peuvent être utilisés pour une gestation.`
      );
    }

    // Vérifier que l'animal est actif
    if (animal.statut !== 'actif') {
      throw new BadRequestException(
        `${labelType === 'Truie' ? 'La truie' : 'Le verrat'} sélectionné(e) (${animal.nom || animal.id}) n'est pas actif. ` +
        `Statut actuel: ${animal.statut}. ${type === 'truie' ? 'Seules les truies actives' : 'Seuls les verrats actifs'} peuvent être utilisés.`
      );
    }

    // Vérifier que c'est un reproducteur
    if (!animal.reproducteur) {
      throw new BadRequestException(
        `${labelType === 'Truie' ? 'La truie' : 'Le verrat'} sélectionné(e) (${animal.nom || animal.id}) n'est pas marqué(e) comme reproducteur/reproductrice. ` +
        `Veuillez marquer ${type === 'truie' ? 'la truie' : 'le verrat'} comme reproducteur/reproductrice dans le module Production.`
      );
    }

    return animal;
  }

  /**
   * Valide un verrat en mode batch (depuis batch_pigs)
   */
  async validateVerratBatch(
    verratId: string,
    projetId: string,
  ): Promise<{ id: string; nom: string | null }> {
    // D'abord essayer de trouver dans batch_pigs
    const batchPigResult = await this.databaseService.query(
      `SELECT bp.id, bp.name as nom, bp.sex, bp.health_status, b.projet_id
       FROM batch_pigs bp
       JOIN batches b ON bp.batch_id = b.id
       WHERE bp.id = $1 AND b.projet_id = $2`,
      [verratId, projetId]
    );

    if (batchPigResult.rows.length > 0) {
      const verrat = batchPigResult.rows[0];

      // Vérifier le sexe
      if (verrat.sex !== 'male' && verrat.sex !== 'femelle') {
        // Si le sexe n'est pas défini, on peut continuer
        this.logger.warn(`Verrat batch ${verratId} sans sexe défini, validation ignorée`);
      } else if (verrat.sex !== 'male') {
        throw new BadRequestException(
          `L'animal sélectionné comme verrat (${verrat.nom || verrat.id}) n'est pas un mâle.`
        );
      }

      // Vérifier le statut de santé
      if (verrat.health_status === 'dead' || verrat.health_status === 'removed') {
        throw new BadRequestException(
          `Le verrat sélectionné (${verrat.nom || verrat.id}) n'est plus actif. Statut: ${verrat.health_status}`
        );
      }

      return { id: verrat.id, nom: verrat.nom };
    }

    // Sinon, essayer production_animaux (verrat individuel)
    try {
      const animal = await this.validateReproducteur(verratId, projetId, 'verrat');
      return { id: animal.id, nom: animal.nom };
    } catch (error) {
      throw new NotFoundException(
        `Verrat introuvable avec l'ID "${verratId}" dans ce projet (ni dans batch_pigs, ni dans production_animaux).`
      );
    }
  }

  /**
   * Convertit un statut batch vers le format individuel
   */
  static batchStatusToIndividuel(batchStatus: string): string {
    return this.STATUT_BATCH_TO_INDIVIDUEL[batchStatus] || 'en_cours';
  }

  /**
   * Convertit un statut individuel vers le format batch
   */
  static individuelStatusToBatch(individuelStatus: string): string {
    return this.STATUT_INDIVIDUEL_TO_BATCH[individuelStatus] || 'pregnant';
  }
}
