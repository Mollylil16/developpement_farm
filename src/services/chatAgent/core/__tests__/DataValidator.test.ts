/**
 * Tests pour DataValidator amélioré
 */

import { DataValidator } from '../DataValidator';
import apiClient from '../../../../services/api/apiClient';
import type { AgentContext } from '../../../../types/chatAgent';

// Mock apiClient
jest.mock('../../../../services/api/apiClient');

describe('DataValidator', () => {
  let validator: DataValidator;
  const mockContext: AgentContext = {
    projetId: 'projet-1',
    userId: 'user-1',
    userName: 'Test User',
    currentDate: '2024-01-15',
  };

  beforeEach(() => {
    validator = new DataValidator();
    jest.clearAllMocks();
  });

  describe('validateAnimalExists', () => {
    it('devrait ajouter un avertissement si la vérification API échoue', async () => {
      await validator.initialize(mockContext);

      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      const action = {
        type: 'create_pesee' as const,
        params: { animal_id: 'A001' },
      };

      const result = await validator.validateAction(action);

      // Vérifier qu'un avertissement a été ajouté
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Impossible de vérifier l\'animal');
      expect(result.warnings[0]).toContain('vérifier manuellement');
      // Ne pas bloquer l'action
      expect(result.valid).toBe(true);
    });

    it('devrait valider correctement si l\'animal existe', async () => {
      await validator.initialize(mockContext);

      const mockAnimal = {
        id: 'animal-1',
        code: 'A001',
        statut: 'actif',
      };

      (apiClient.get as jest.Mock).mockResolvedValue([mockAnimal]);

      const action = {
        type: 'create_pesee' as const,
        params: { animal_id: 'A001' },
      };

      const result = await validator.validateAction(action);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('devrait ajouter une erreur si l\'animal n\'existe pas', async () => {
      await validator.initialize(mockContext);

      (apiClient.get as jest.Mock).mockResolvedValue([]);

      const action = {
        type: 'create_pesee' as const,
        params: { animal_id: 'INEXISTANT' },
      };

      const result = await validator.validateAction(action);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('introuvable');
      expect(result.valid).toBe(false);
    });

    it('devrait ajouter un avertissement si l\'animal est vendu', async () => {
      await validator.initialize(mockContext);

      const mockAnimal = {
        id: 'animal-1',
        code: 'A001',
        statut: 'vendu',
      };

      (apiClient.get as jest.Mock).mockResolvedValue([mockAnimal]);

      const action = {
        type: 'create_pesee' as const,
        params: { animal_id: 'A001' },
      };

      const result = await validator.validateAction(action);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('déjà été vendu');
      // Ne pas bloquer, mais avertir
      expect(result.valid).toBe(true);
    });
  });
});
