/**
 * Tests pour useWidgetData
 */

import { renderHook } from '@testing-library/react-native';
import { useWidgetData } from '../useWidgetData';
import { useAppSelector } from '../../../store/hooks';
import {
  useNutritionWidget,
  useSanteWidget,
  usePlanningWidget,
  useCollaborationWidget,
  useMortalitesWidget,
  useProductionWidget,
  useMarketplaceWidget,
  usePurchasesWidget,
  useExpensesWidget,
} from '../../../hooks/widgets';

// Mock dependencies
jest.mock('../../../store/hooks');
jest.mock('../../../hooks/widgets');

const mockUseAppSelector = useAppSelector as jest.MockedFunction<typeof useAppSelector>;
const mockUseNutritionWidget = useNutritionWidget as jest.MockedFunction<typeof useNutritionWidget>;
const mockUseSanteWidget = useSanteWidget as jest.MockedFunction<typeof useSanteWidget>;
const mockUsePlanningWidget = usePlanningWidget as jest.MockedFunction<typeof usePlanningWidget>;
const mockUseCollaborationWidget = useCollaborationWidget as jest.MockedFunction<
  typeof useCollaborationWidget
>;
const mockUseMortalitesWidget = useMortalitesWidget as jest.MockedFunction<
  typeof useMortalitesWidget
>;
const mockUseProductionWidget = useProductionWidget as jest.MockedFunction<
  typeof useProductionWidget
>;
const mockUseMarketplaceWidget = useMarketplaceWidget as jest.MockedFunction<
  typeof useMarketplaceWidget
>;
const mockUsePurchasesWidget = usePurchasesWidget as jest.MockedFunction<typeof usePurchasesWidget>;
const mockUseExpensesWidget = useExpensesWidget as jest.MockedFunction<typeof useExpensesWidget>;

describe('useWidgetData', () => {
  const mockProjetActif = {
    id: 'projet-1',
    nom: 'Test Projet',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner null pour un widget producteur sans projet actif', () => {
    mockUseAppSelector.mockReturnValue({
      projet: {
        projetActif: null,
      },
    } as any);

    const mockWidgetData = {
      emoji: '🥗',
      title: 'Nutrition',
      primary: 10,
      secondary: 5,
      labelPrimary: 'Rations',
      labelSecondary: 'Actives',
    };

    mockUseNutritionWidget.mockReturnValue(mockWidgetData);

    const { result } = renderHook(() => useWidgetData());

    const getWidgetData = result.current;
    const widgetData = getWidgetData('nutrition');

    expect(widgetData).toBeNull();
  });

  it('devrait retourner les données pour un widget producteur avec projet actif', () => {
    mockUseAppSelector.mockReturnValue({
      projet: {
        projetActif: mockProjetActif,
      },
    } as any);

    const mockWidgetData = {
      emoji: '🥗',
      title: 'Nutrition',
      primary: 10,
      secondary: 5,
      labelPrimary: 'Rations',
      labelSecondary: 'Actives',
    };

    mockUseNutritionWidget.mockReturnValue(mockWidgetData);

    const { result } = renderHook(() => useWidgetData());

    const getWidgetData = result.current;
    const widgetData = getWidgetData('nutrition');

    expect(widgetData).toEqual(mockWidgetData);
  });

  it('devrait retourner les données pour un widget acheteur sans projet actif', () => {
    mockUseAppSelector.mockReturnValue({
      projet: {
        projetActif: null,
      },
    } as any);

    const mockWidgetData = {
      emoji: '🛒',
      title: 'Achats',
      primary: 10,
      secondary: 2,
      labelPrimary: 'Total',
      labelSecondary: 'En attente',
    };

    mockUsePurchasesWidget.mockReturnValue(mockWidgetData);

    const { result } = renderHook(() => useWidgetData());

    const getWidgetData = result.current;
    const widgetData = getWidgetData('purchases');

    expect(widgetData).toEqual(mockWidgetData);
  });

  it('devrait retourner les données pour tous les types de widgets producteur', () => {
    mockUseAppSelector.mockReturnValue({
      projet: {
        projetActif: mockProjetActif,
      },
    } as any);

    const mockData = {
      emoji: '📊',
      title: 'Test',
      primary: 1,
      secondary: 2,
      labelPrimary: 'Primary',
      labelSecondary: 'Secondary',
    };

    mockUseNutritionWidget.mockReturnValue(mockData);
    mockUseSanteWidget.mockReturnValue(mockData);
    mockUsePlanningWidget.mockReturnValue(mockData);
    mockUseCollaborationWidget.mockReturnValue(mockData);
    mockUseMortalitesWidget.mockReturnValue(mockData);
    mockUseProductionWidget.mockReturnValue(mockData);
    mockUseMarketplaceWidget.mockReturnValue(mockData);

    const { result } = renderHook(() => useWidgetData());

    const getWidgetData = result.current;

    expect(getWidgetData('nutrition')).toEqual(mockData);
    expect(getWidgetData('sante')).toEqual(mockData);
    expect(getWidgetData('planning')).toEqual(mockData);
    expect(getWidgetData('collaboration')).toEqual(mockData);
    expect(getWidgetData('mortalites')).toEqual(mockData);
    expect(getWidgetData('production')).toEqual(mockData);
    expect(getWidgetData('marketplace')).toEqual(mockData);
  });

  it('devrait retourner null pour un type de widget inconnu', () => {
    mockUseAppSelector.mockReturnValue({
      projet: {
        projetActif: mockProjetActif,
      },
    } as any);

    const { result } = renderHook(() => useWidgetData());

    const getWidgetData = result.current;
    const widgetData = getWidgetData('unknown' as any);

    expect(widgetData).toBeNull();
  });

  it('devrait retourner les données pour les widgets acheteur', () => {
    mockUseAppSelector.mockReturnValue({
      projet: {
        projetActif: null,
      },
    } as any);

    const mockPurchasesData = {
      emoji: '🛒',
      title: 'Achats',
      primary: 10,
      secondary: 2,
      labelPrimary: 'Total',
      labelSecondary: 'En attente',
    };

    const mockExpensesData = {
      emoji: '💰',
      title: 'Dépenses',
      primary: '100 000',
      secondary: '20 000',
      labelPrimary: 'Total FCFA',
      labelSecondary: 'Moyenne',
    };

    mockUsePurchasesWidget.mockReturnValue(mockPurchasesData);
    mockUseExpensesWidget.mockReturnValue(mockExpensesData);

    const { result } = renderHook(() => useWidgetData());

    const getWidgetData = result.current;

    expect(getWidgetData('purchases')).toEqual(mockPurchasesData);
    expect(getWidgetData('expenses')).toEqual(mockExpensesData);
  });
});
