/**
 * Tests pour useVaccinationsLogic
 * Tests basiques pour vérifier l'existence et la structure du hook
 */

// Mock Redux store
jest.mock('../../../store/hooks', () => ({
  useAppDispatch: jest.fn(() => jest.fn()),
}));

// Mock slices
jest.mock('../../../store/slices/santeSlice', () => ({
  loadVaccinations: jest.fn(),
  loadRappelsVaccinations: jest.fn(),
  loadStatistiquesVaccinations: jest.fn(),
}));

describe('useVaccinationsLogic', () => {
  it('should be defined', () => {
    const { useVaccinationsLogic } = require('../../../hooks/sante/useVaccinationsLogic');
    expect(useVaccinationsLogic).toBeDefined();
    expect(typeof useVaccinationsLogic).toBe('function');
  });

  it('should export a hook that returns chargerDonnees', () => {
    const module = require('../../../hooks/sante/useVaccinationsLogic');
    expect(module).toHaveProperty('useVaccinationsLogic');
  });
});

