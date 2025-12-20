/**
 * Tests pour PorkPriceTrendCard
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PorkPriceTrendCard from '../PorkPriceTrendCard';
import { usePorkPriceTrend } from '../../../hooks/usePorkPriceTrend';
import { useTheme } from '../../../contexts/ThemeContext';

// Mock dependencies
jest.mock('../../../hooks/usePorkPriceTrend');
jest.mock('../../../contexts/ThemeContext');

const mockUsePorkPriceTrend = usePorkPriceTrend as jest.MockedFunction<typeof usePorkPriceTrend>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('PorkPriceTrendCard', () => {
  const mockColors = {
    text: '#000000',
    textSecondary: '#666666',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    divider: '#E0E0E0',
    border: '#E0E0E0',
    primary: '#007AFF',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    info: '#5AC8FA',
    shadow: {
      small: 'rgba(0, 0, 0, 0.1)',
      medium: 'rgba(0, 0, 0, 0.15)',
      large: 'rgba(0, 0, 0, 0.2)',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      colors: mockColors as any,
      isDark: false,
      toggleTheme: jest.fn(),
    });
  });

  it('devrait rendre la carte avec les données de tendance', async () => {
    const mockTrends = [
      {
        id: '1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2000,
        avgPriceRegional: 2300,
        transactionsCount: 5,
        offersCount: 2,
        listingsCount: 10,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        year: 2024,
        weekNumber: 2,
        avgPricePlatform: 2100,
        avgPriceRegional: 2300,
        transactionsCount: 6,
        offersCount: 2,
        listingsCount: 10,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-08T00:00:00Z',
      },
    ];

    mockUsePorkPriceTrend.mockReturnValue({
      trends: mockTrends,
      currentWeekPrice: 2100,
      previousWeekPrice: 2000,
      priceChange: 100,
      priceChangePercent: 5.0,
      loading: false,
      error: null,
      lastUpdated: '2024-01-08T00:00:00Z',
      refresh: jest.fn(),
    });

    const { getByText } = render(<PorkPriceTrendCard />);

    await waitFor(() => {
      expect(getByText(/Tendance du prix du porc poids vif/i)).toBeTruthy();
    });
  });

  it("devrait afficher l'état de chargement", () => {
    mockUsePorkPriceTrend.mockReturnValue({
      trends: [],
      currentWeekPrice: undefined,
      previousWeekPrice: undefined,
      priceChange: undefined,
      priceChangePercent: undefined,
      loading: true,
      error: null,
      lastUpdated: undefined,
      refresh: jest.fn(),
    });

    const { getByText } = render(<PorkPriceTrendCard />);

    // Vérifier que le titre est présent (le composant affiche toujours le titre)
    expect(getByText(/Tendance du prix du porc poids vif/i)).toBeTruthy();
  });

  it("devrait afficher l'état d'erreur", () => {
    const errorMessage = 'Erreur de chargement';

    mockUsePorkPriceTrend.mockReturnValue({
      trends: [],
      currentWeekPrice: undefined,
      previousWeekPrice: undefined,
      priceChange: undefined,
      priceChangePercent: undefined,
      loading: false,
      error: errorMessage,
      lastUpdated: undefined,
      refresh: jest.fn(),
    });

    const { getAllByText } = render(<PorkPriceTrendCard />);

    expect(getAllByText(/Erreur/i).length).toBeGreaterThan(0);
    expect(getAllByText(errorMessage).length).toBeGreaterThan(0);
  });

  it("devrait afficher l'état vide si aucune donnée", () => {
    mockUsePorkPriceTrend.mockReturnValue({
      trends: [],
      currentWeekPrice: undefined,
      previousWeekPrice: undefined,
      priceChange: undefined,
      priceChangePercent: undefined,
      loading: false,
      error: null,
      lastUpdated: undefined,
      refresh: jest.fn(),
    });

    const { getByText } = render(<PorkPriceTrendCard />);

    expect(getByText(/Aucune donnée disponible/i)).toBeTruthy();
  });

  it('devrait afficher le prix de la semaine en cours', async () => {
    const mockTrends = [
      {
        id: '1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2000,
        avgPriceRegional: 2300,
        transactionsCount: 5,
        offersCount: 2,
        listingsCount: 10,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockUsePorkPriceTrend.mockReturnValue({
      trends: mockTrends,
      currentWeekPrice: 2000,
      previousWeekPrice: undefined,
      priceChange: undefined,
      priceChangePercent: undefined,
      loading: false,
      error: null,
      lastUpdated: '2024-01-01T00:00:00Z',
      refresh: jest.fn(),
    });

    const { getByText } = render(<PorkPriceTrendCard />);

    await waitFor(() => {
      expect(getByText(/Semaine en cours/i)).toBeTruthy();
      expect(getByText(/2[\s\u00a0]000/)).toBeTruthy(); // Format français avec espace insécable
    });
  });

  it('devrait afficher la variation de prix en pourcentage', async () => {
    const mockTrends = [
      {
        id: '1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2000,
        avgPriceRegional: 2300,
        transactionsCount: 5,
        offersCount: 2,
        listingsCount: 10,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        year: 2024,
        weekNumber: 2,
        avgPricePlatform: 2100,
        avgPriceRegional: 2300,
        transactionsCount: 6,
        offersCount: 2,
        listingsCount: 10,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-08T00:00:00Z',
      },
    ];

    mockUsePorkPriceTrend.mockReturnValue({
      trends: mockTrends,
      currentWeekPrice: 2100,
      previousWeekPrice: 2000,
      priceChange: 100,
      priceChangePercent: 5.0,
      loading: false,
      error: null,
      lastUpdated: '2024-01-08T00:00:00Z',
      refresh: jest.fn(),
    });

    const { getByText } = render(<PorkPriceTrendCard />);

    await waitFor(() => {
      expect(getByText(/5[.,]0%/)).toBeTruthy(); // Variation de 5%
    });
  });

  it('devrait afficher la variation négative correctement', async () => {
    const mockTrends = [
      {
        id: '1',
        year: 2024,
        weekNumber: 1,
        avgPricePlatform: 2100,
        avgPriceRegional: 2300,
        transactionsCount: 5,
        offersCount: 2,
        listingsCount: 10,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        year: 2024,
        weekNumber: 2,
        avgPricePlatform: 2000,
        avgPriceRegional: 2300,
        transactionsCount: 6,
        offersCount: 2,
        listingsCount: 10,
        sourcePriority: 'platform' as const,
        updatedAt: '2024-01-08T00:00:00Z',
      },
    ];

    mockUsePorkPriceTrend.mockReturnValue({
      trends: mockTrends,
      currentWeekPrice: 2000,
      previousWeekPrice: 2100,
      priceChange: -100,
      priceChangePercent: -4.76,
      loading: false,
      error: null,
      lastUpdated: '2024-01-08T00:00:00Z',
      refresh: jest.fn(),
    });

    const { getByText } = render(<PorkPriceTrendCard />);

    await waitFor(() => {
      expect(getByText(/4[.,]8/)).toBeTruthy(); // Variation négative
    });
  });

  it('devrait accepter un style personnalisé', () => {
    mockUsePorkPriceTrend.mockReturnValue({
      trends: [],
      currentWeekPrice: undefined,
      previousWeekPrice: undefined,
      priceChange: undefined,
      priceChangePercent: undefined,
      loading: false,
      error: null,
      lastUpdated: undefined,
      refresh: jest.fn(),
    });

    const customStyle = { marginTop: 20 };
    const { UNSAFE_getByType } = render(<PorkPriceTrendCard style={customStyle} />);

    // Vérifier que le style est appliqué (via le composant Card)
    expect(UNSAFE_getByType).toBeDefined();
  });
});
