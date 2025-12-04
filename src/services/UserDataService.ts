/**
 * Service pour la gestion des données utilisateur
 * Centralise la logique de nettoyage et suppression des données utilisateur
 */

import { getDatabase } from './database';

export class UserDataService {
  /**
   * Nettoie toutes les données d'un utilisateur (projets et données associées)
   * ⚠️ ATTENTION: Cette opération est irréversible
   */
  static async clearUserData(userId: string): Promise<void> {
    const db = await getDatabase();

    try {
      // Récupérer tous les projets de l'utilisateur
      const projets = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM projets WHERE proprietaire_id = ?',
        [userId]
      );

      // Pour chaque projet, supprimer toutes les données associées
      for (const projet of projets) {
        const projetId = projet.id;

        // Supprimer toutes les données liées au projet (en respectant l'ordre des dépendances)
        await db.runAsync('DELETE FROM stocks_mouvements WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM stocks_aliments WHERE projet_id = ?', [projetId]);
        await db.runAsync(
          'DELETE FROM ingredients_ration WHERE ration_id IN (SELECT id FROM rations WHERE projet_id = ?)',
          [projetId]
        );
        await db.runAsync('DELETE FROM rations WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM production_pesees WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM production_animaux WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM sevrages WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM gestations WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM depenses_ponctuelles WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM revenus WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM charges_fixes WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM rapports_croissance WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM mortalites WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM planifications WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM collaborations WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM vaccinations WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM traitements WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM maladies WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM visites_veterinaires WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM rappels_vaccination WHERE projet_id = ?', [projetId]);
        await db.runAsync('DELETE FROM calendrier_vaccination WHERE projet_id = ?', [projetId]);
      }

      // Supprimer les projets de l'utilisateur
      await db.runAsync('DELETE FROM projets WHERE proprietaire_id = ?', [userId]);

      // Supprimer les collaborations où l'utilisateur est collaborateur
      await db.runAsync('DELETE FROM collaborations WHERE user_id = ?', [userId]);

      // Supprimer l'utilisateur lui-même
      await db.runAsync('DELETE FROM users WHERE id = ?', [userId]);

      console.log(`✅ Données de l'utilisateur ${userId} supprimées avec succès`);
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression des données utilisateur:`, error);
      throw error;
    }
  }
}


