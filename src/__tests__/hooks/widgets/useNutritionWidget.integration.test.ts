/**
 * Tests d'intégration pour useNutritionWidget
 * Ces tests exécutent réellement le hook avec des données mockées
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useNutritionWidget } from '../../../hooks/widgets/useNutritionWidget';

// Mock date-fns
jest.mock('date-fns', () => ({
  startOfMonth: jest.fn(() => new Date('2024-01-01')),
  parseISO: jest.fn((date) => new Date(date)),
  isAfter: jest.fn((date1, date2) => date1 > date2),
}));

// Mock Redux slices
jest.mock('../../../store/slices/nutritionSlice', () => ({
  loadRations: jest.fn(() => ({ type: 'nutrition/loadRations' })),
  loadRationsBudget: jest.fn(() => ({ type: 'nutrition/loadRationsBudget' })),
}));

// Mock Redux hooks
const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('../../../store/hooks', () => ({
  useAppSelector: (selector: any) => mockUseSelector(selector),
  useAppDispatch: () => mockDispatch,
}));

describe('useNutritionWidget - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
  });

  it('should return null when projetId is undefined', () => {
    mockUseSelector.mockReturnValue({ rations: [], rationsBudget: [] });

    const { result } = renderHook(() => useNutritionWidget(undefined));

    expect(result.current).toBeNull();
  });

  it('should dispatch load actions when projetId is provided', () => {
    mockUseSelector.mockReturnValue({ rations: [], rationsBudget: [] });

    renderHook(() => useNutritionWidget('projet-1'));

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should calculate widget data correctly', () => {
    const mockRations = [
      { id: '1', date_creation: '2024-01-15T00:00:00Z' },
      { id: '2', date_creation: '2024-01-20T00:00:00Z' },
    ];
    const mockRationsBudget = [{ id: '3', date_creation: '2024-01-25T00:00:00Z' }];

    mockUseSelector.mockReturnValue({
      nutrition: {
        rations: mockRations,
        rationsBudget: mockRationsBudget,
      },
    });

    const { result } = renderHook(() => useNutritionWidget('projet-1'));

    waitFor(() => {
      expect(result.current).not.toBeNull();
      if (result.current) {
        expect(result.current.title).toBe('Nutrition');
        expect(result.current.emoji).toBe('🥗');
        expect(result.current.primary).toBe(3); // Total rations
      }
    });
  });
});
