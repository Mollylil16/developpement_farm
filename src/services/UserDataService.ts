/**
 * Service pour la gestion des données utilisateur
 * Centralise la logique de nettoyage et suppression des données utilisateur
 */

import apiClient from './api/apiClient';

export class UserDataService {
  /**
   * Nettoie toutes les données d'un utilisateur (projets et données associées)
   * ⚠️ ATTENTION: Cette opération est irréversible
   * 
   * Note: Pour l'instant, cette fonctionnalité nécessite un endpoint backend dédié
   * TODO: Créer un endpoint DELETE /users/:id/clear-data dans le backend
   */
  static async clearUserData(userId: string): Promise<void> {
    try {
      // Récupérer tous les projets de l'utilisateur depuis l'API backend
      const allProjets = await apiClient.get<any[]>('/projets');
      const projets = allProjets.filter((p) => p.proprietaire_id === userId);

      // Pour chaque projet, supprimer toutes les données associées
      // Note: La suppression en cascade devrait être gérée par le backend
      for (const projet of projets) {
        const projetId = projet.id;
        
        // Supprimer le projet (le backend devrait gérer la suppression en cascade)
        await apiClient.delete(`/projets/${projetId}`);
      }

      // Supprimer les collaborations où l'utilisateur est collaborateur
      // Note: Nécessite un endpoint backend pour supprimer les collaborations par user_id
      const allCollaborations = await apiClient.get<any[]>('/collaborations');
      const userCollaborations = allCollaborations.filter((c) => c.user_id === userId);
      for (const collab of userCollaborations) {
        await apiClient.delete(`/collaborations/${collab.id}`);
      }

      // Supprimer l'utilisateur lui-même
      // Note: Nécessite un endpoint DELETE /users/:id dans le backend
      await apiClient.delete(`/users/${userId}`);

      console.log(`✅ Données de l'utilisateur ${userId} supprimées avec succès`);
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression des données utilisateur:`, error);
      throw error;
    }
  }
}
