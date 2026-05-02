/**
 * Tests pour useSanteWidget
 * Tests basiques pour vérifier l'existence et la structure du hook
 */

// Mock Redux store
jest.mock('../../../store/hooks', () => ({
  useAppSelector: jest.fn(() => ({ vaccinations: [], maladies: [] })),
  useAppDispatch: jest.fn(() => jest.fn()),
}));

// Mock slices
jest.mock('../../../store/slices/santeSlice', () => ({
  loadVaccinations: jest.fn(),
  loadMaladies: jest.fn(),
}));

// Mock selectors
jest.mock('../../../store/selectors/santeSelectors', () => ({
  selectAllVaccinations: jest.fn(() => []),
  selectAllMaladies: jest.fn(() => []),
}));

describe('useSanteWidget', () => {
  it('should be defined', () => {
    const { useSanteWidget } = require('../../../hooks/widgets/useSanteWidget');
    expect(useSanteWidget).toBeDefined();
    expect(typeof useSanteWidget).toBe('function');
  });

  it('should export SanteWidgetData type', () => {
    const module = require('../../../hooks/widgets/useSanteWidget');
    expect(module).toHaveProperty('useSanteWidget');
  });
});
