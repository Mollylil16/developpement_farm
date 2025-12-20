/**
 * Tests pour useNutritionWidget
 * Tests basiques pour vérifier l'existence et la structure du hook
 */

// Mock Redux store
jest.mock('../../../store/hooks', () => ({
  useAppSelector: jest.fn(() => ({ rations: [], rationsBudget: [] })),
  useAppDispatch: jest.fn(() => jest.fn()),
}));

// Mock slices
jest.mock('../../../store/slices/nutritionSlice', () => ({
  loadRations: jest.fn(),
  loadRationsBudget: jest.fn(),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  startOfMonth: jest.fn(() => new Date('2024-01-01')),
  parseISO: jest.fn((date) => new Date(date)),
  isAfter: jest.fn(() => false),
}));

describe('useNutritionWidget', () => {
  it('should be defined', () => {
    const { useNutritionWidget } = require('../../../hooks/widgets/useNutritionWidget');
    expect(useNutritionWidget).toBeDefined();
    expect(typeof useNutritionWidget).toBe('function');
  });

  it('should export NutritionWidgetData type', () => {
    const module = require('../../../hooks/widgets/useNutritionWidget');
    expect(module).toHaveProperty('useNutritionWidget');
  });
});
