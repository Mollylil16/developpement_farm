/**
 * Tests pour UserDataService
 */

import { UserDataService } from '../UserDataService';
import { getDatabase } from '../database';

jest.mock('../database');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

describe('UserDataService', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      getAllAsync: jest.fn(),
      runAsync: jest.fn(),
    };
    mockGetDatabase.mockResolvedValue(mockDb);
  });

  describe('clearUserData', () => {
    const userId = 'user-123';

    it("devrait supprimer toutes les données d'un utilisateur avec projets", async () => {
      const mockProjets = [{ id: 'projet-1' }, { id: 'projet-2' }];

      mockDb.getAllAsync.mockResolvedValue(mockProjets);
      mockDb.runAsync.mockResolvedValue(undefined);

      await UserDataService.clearUserData(userId);

      // Vérifier que les projets sont récupérés
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT id FROM projets WHERE proprietaire_id = ?',
        [userId]
      );

      // Vérifier que toutes les tables sont nettoyées pour chaque projet
      const deleteCalls = mockDb.runAsync.mock.calls;

      // Vérifier les suppressions par projet (2 projets × 18 tables)
      // Note: 'rations' peut apparaître dans 'ingredients_ration', donc on filtre plus précisément
      expect(deleteCalls.filter((call) => call[0].includes('stocks_mouvements')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('stocks_aliments')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('ingredients_ration')).length).toBe(2);
      expect(
        deleteCalls.filter((call) => call[0] === 'DELETE FROM rations WHERE projet_id = ?').length
      ).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('production_pesees')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('production_animaux')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('sevrages')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('gestations')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('depenses_ponctuelles')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('revenus')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('charges_fixes')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('rapports_croissance')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('mortalites')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('planifications')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('collaborations')).length).toBe(3); // 2 projets + 1 user_id
      expect(deleteCalls.filter((call) => call[0].includes('vaccinations')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('traitements')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('maladies')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('visites_veterinaires')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('rappels_vaccination')).length).toBe(2);
      expect(deleteCalls.filter((call) => call[0].includes('calendrier_vaccination')).length).toBe(
        2
      );

      // Vérifier la suppression des projets
      expect(
        deleteCalls.some(
          (call) =>
            call[0] === 'DELETE FROM projets WHERE proprietaire_id = ?' && call[1][0] === userId
        )
      ).toBe(true);

      // Vérifier la suppression de l'utilisateur
      expect(
        deleteCalls.some(
          (call) => call[0] === 'DELETE FROM users WHERE id = ?' && call[1][0] === userId
        )
      ).toBe(true);
    });

    it('devrait gérer un utilisateur sans projets', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);
      mockDb.runAsync.mockResolvedValue(undefined);

      await UserDataService.clearUserData(userId);

      // Vérifier que les projets sont récupérés
      expect(mockDb.getAllAsync).toHaveBeenCalled();

      // Vérifier qu'aucune suppression par projet n'est effectuée
      const deleteCalls = mockDb.runAsync.mock.calls;
      expect(deleteCalls.filter((call) => call[0].includes('projet_id')).length).toBe(0);

      // Mais vérifier que les collaborations et l'utilisateur sont supprimés
      expect(
        deleteCalls.some((call) => call[0] === 'DELETE FROM collaborations WHERE user_id = ?')
      ).toBe(true);
      expect(deleteCalls.some((call) => call[0] === 'DELETE FROM users WHERE id = ?')).toBe(true);
    });

    it('devrait lancer une erreur si la suppression échoue', async () => {
      const error = new Error('Erreur de base de données');
      mockDb.getAllAsync.mockRejectedValue(error);

      await expect(UserDataService.clearUserData(userId)).rejects.toThrow(
        'Erreur de base de données'
      );
    });

    it("devrait supprimer les collaborations où l'utilisateur est collaborateur", async () => {
      mockDb.getAllAsync.mockResolvedValue([]);
      mockDb.runAsync.mockResolvedValue(undefined);

      await UserDataService.clearUserData(userId);

      const deleteCalls = mockDb.runAsync.mock.calls;
      expect(
        deleteCalls.some(
          (call) =>
            call[0] === 'DELETE FROM collaborations WHERE user_id = ?' && call[1][0] === userId
        )
      ).toBe(true);
    });

    it("devrait respecter l'ordre de suppression des dépendances", async () => {
      const mockProjets = [{ id: 'projet-1' }];
      mockDb.getAllAsync.mockResolvedValue(mockProjets);
      mockDb.runAsync.mockResolvedValue(undefined);

      await UserDataService.clearUserData(userId);

      const deleteCalls = mockDb.runAsync.mock.calls.map((call) => call[0]);

      // Vérifier que les mouvements de stock sont supprimés avant les stocks
      const stocksMouvementsIndex = deleteCalls.findIndex((call) =>
        call.includes('stocks_mouvements')
      );
      const stocksAlimentsIndex = deleteCalls.findIndex((call) => call.includes('stocks_aliments'));
      expect(stocksMouvementsIndex).toBeLessThan(stocksAlimentsIndex);

      // Vérifier que les ingredients_ration sont supprimés avant les rations
      const ingredientsRationIndex = deleteCalls.findIndex((call) =>
        call.includes('ingredients_ration')
      );
      const rationsIndex = deleteCalls.findIndex(
        (call) => call.includes('rations') && !call.includes('ingredients_ration')
      );
      expect(ingredientsRationIndex).toBeLessThan(rationsIndex);

      // Vérifier que les projets sont supprimés avant l'utilisateur
      const projetsIndex = deleteCalls.findIndex((call) =>
        call.includes('projets WHERE proprietaire_id')
      );
      const usersIndex = deleteCalls.findIndex((call) => call.includes('users WHERE id'));
      expect(projetsIndex).toBeLessThan(usersIndex);
    });
  });
});
