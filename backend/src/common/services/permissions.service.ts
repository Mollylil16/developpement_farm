import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CollaborationsService } from '../../collaborations/collaborations.service';

/**
 * Types de permissions disponibles
 */
export type PermissionKey =
  | 'reproduction'
  | 'nutrition'
  | 'finance'
  | 'rapports'
  | 'planification'
  | 'mortalites'
  | 'sante';

/**
 * Service de gestion des permissions des collaborateurs
 */
@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly collaborationsService: CollaborationsService
  ) {}

  /**
   * Vérifie si un utilisateur a une permission spécifique sur un projet
   * @param userId ID de l'utilisateur
   * @param projetId ID du projet
   * @param permissionKey Clé de la permission à vérifier
   * @returns true si l'utilisateur a la permission, false sinon
   */
  async checkCollaborateurPermission(
    userId: string,
    projetId: string,
    permissionKey: PermissionKey
  ): Promise<boolean> {
    try {
      // Vérifier si l'utilisateur est propriétaire du projet
      const projetResult = await this.databaseService.query(
        'SELECT proprietaire_id FROM projets WHERE id = $1',
        [projetId]
      );

      if (projetResult.rows.length === 0) {
        this.logger.warn(`Projet ${projetId} introuvable`);
        return false;
      }

      const proprietaireId = String(projetResult.rows[0].proprietaire_id || '').trim();
      const normalizedUserId = String(userId || '').trim();

      // Le propriétaire a toutes les permissions
      if (proprietaireId === normalizedUserId) {
        return true;
      }

      // Récupérer le collaborateur actif
      const collaborateur = await this.collaborationsService.findCollaborateurActuel(
        userId,
        projetId
      );

      if (!collaborateur) {
        this.logger.debug(`Utilisateur ${userId} n'est pas collaborateur du projet ${projetId}`);
        return false;
      }

      // Vérifier que le collaborateur est actif
      if (collaborateur.statut !== 'actif') {
        this.logger.debug(
          `Collaborateur ${collaborateur.id} n'est pas actif (statut: ${collaborateur.statut})`
        );
        return false;
      }

      // Vérifier la permission spécifique
      const permission = collaborateur.permissions?.[permissionKey];
      const hasPermission = permission === true;

      this.logger.debug(
        `Permission ${permissionKey} pour utilisateur ${userId} sur projet ${projetId}: ${hasPermission}`
      );

      return hasPermission;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la vérification de la permission ${permissionKey} pour ${userId} sur ${projetId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Récupère le rôle d'un collaborateur sur un projet
   * @param userId ID de l'utilisateur
   * @param projetId ID du projet
   * @returns Le rôle du collaborateur ou null si pas collaborateur
   */
  async getCollaborateurRole(userId: string, projetId: string): Promise<string | null> {
    try {
      // Vérifier si l'utilisateur est propriétaire du projet
      const projetResult = await this.databaseService.query(
        'SELECT proprietaire_id FROM projets WHERE id = $1',
        [projetId]
      );

      if (projetResult.rows.length === 0) {
        return null;
      }

      const proprietaireId = String(projetResult.rows[0].proprietaire_id || '').trim();
      const normalizedUserId = String(userId || '').trim();

      // Le propriétaire a le rôle 'proprietaire'
      if (proprietaireId === normalizedUserId) {
        return 'proprietaire';
      }

      // Récupérer le collaborateur actif
      const collaborateur = await this.collaborationsService.findCollaborateurActuel(
        userId,
        projetId
      );

      if (!collaborateur || collaborateur.statut !== 'actif') {
        return null;
      }

      return (collaborateur?.role as string) || null;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération du rôle pour ${userId} sur ${projetId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Vérifie une permission et lance une exception si l'utilisateur n'a pas accès
   * @param userId ID de l'utilisateur
   * @param projetId ID du projet
   * @param permissionKey Clé de la permission à vérifier
   * @throws ForbiddenException si l'utilisateur n'a pas la permission
   */
  async enforcePermission(
    userId: string,
    projetId: string,
    permissionKey: PermissionKey
  ): Promise<void> {
    const hasPermission = await this.checkCollaborateurPermission(userId, projetId, permissionKey);

    if (!hasPermission) {
      const role = await this.getCollaborateurRole(userId, projetId);
      const roleMessage = role ? ` (rôle: ${role})` : '';

      throw new ForbiddenException(
        `Vous n'avez pas accès à cette fonctionnalité. Permission requise: ${permissionKey}${roleMessage}`
      );
    }
  }

  /**
   * Vérifie si un utilisateur est propriétaire ou collaborateur actif d'un projet
   * @param userId ID de l'utilisateur
   * @param projetId ID du projet
   * @returns true si l'utilisateur a accès au projet
   */
  async hasProjectAccess(userId: string, projetId: string): Promise<boolean> {
    try {
      // Vérifier si l'utilisateur est propriétaire
      const projetResult = await this.databaseService.query(
        'SELECT proprietaire_id FROM projets WHERE id = $1',
        [projetId]
      );

      if (projetResult.rows.length === 0) {
        return false;
      }

      const proprietaireId = String(projetResult.rows[0].proprietaire_id || '').trim();
      const normalizedUserId = String(userId || '').trim();

      if (proprietaireId === normalizedUserId) {
        return true;
      }

      // Vérifier si l'utilisateur est collaborateur actif
      const collaborateur = await this.collaborationsService.findCollaborateurActuel(
        userId,
        projetId
      );

      return collaborateur !== null && collaborateur.statut === 'actif';
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification d'accès pour ${userId} sur ${projetId}:`, error);
      return false;
    }
  }
}
