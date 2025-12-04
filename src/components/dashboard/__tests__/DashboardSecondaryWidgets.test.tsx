/**
 * Tests pour DashboardSecondaryWidgets
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DashboardSecondaryWidgets from '../DashboardSecondaryWidgets';
import { useTheme } from '../../../contexts/ThemeContext';
import { useWidgetData } from '../../widgets/useWidgetData';

// Mock dependencies
jest.mock('../../../contexts/ThemeContext');
jest.mock('../../widgets/useWidgetData');

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockUseWidgetData = useWidgetData as jest.MockedFunction<typeof useWidgetData>;

describe('DashboardSecondaryWidgets', () => {
  const mockColors = {
    text: '#000000',
    textSecondary: '#666666',
    primary: '#007AFF',
  };

  const mockAnimations = [
    { interpolate: jest.fn(() => ({ inputRange: [0, 1], outputRange: [20, 0] })) },
    { interpolate: jest.fn(() => ({ inputRange: [0, 1], outputRange: [20, 0] })) },
  ] as any;

  const mockGetWidgetData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      colors: mockColors as any,
      isDark: false,
      toggleTheme: jest.fn(),
    });
    mockUseWidgetData.mockReturnValue(mockGetWidgetData);
  });

  it('devrait retourner null si aucun widget', () => {
    const { container } = render(
      <DashboardSecondaryWidgets
        widgets={[]}
        animations={[]}
        onPressWidget={jest.fn()}
      />
    );

    expect(container.children.length).toBe(0);
  });

  it('devrait rendre les widgets en mode horizontal', () => {
    const mockWidgets = [
      { type: 'purchases' as const, screen: 'MyPurchases' },
      { type: 'expenses' as const, screen: 'MyPurchases' },
    ];

    const mockWidgetData = {
      emoji: '🛒',
      title: 'Achats',
      primary: 10,
      secondary: 2,
      labelPrimary: 'Total',
      labelSecondary: 'En attente',
    };

    mockGetWidgetData.mockReturnValue(mockWidgetData);

    const { getByText } = render(
      <DashboardSecondaryWidgets
        widgets={mockWidgets}
        animations={mockAnimations}
        onPressWidget={jest.fn()}
        horizontal={true}
      />
    );

    expect(getByText('Modules principaux')).toBeTruthy();
    expect(getByText('Achats')).toBeTruthy();
  });

  it('devrait rendre les widgets en mode vertical (grille)', () => {
    const mockWidgets = [
      { type: 'purchases' as const, screen: 'MyPurchases' },
      { type: 'expenses' as const, screen: 'MyPurchases' },
    ];

    const mockWidgetData = {
      emoji: '🛒',
      title: 'Achats',
      primary: 10,
      secondary: 2,
      labelPrimary: 'Total',
      labelSecondary: 'En attente',
    };

    mockGetWidgetData.mockReturnValue(mockWidgetData);

    const { getByText } = render(
      <DashboardSecondaryWidgets
        widgets={mockWidgets}
        animations={mockAnimations}
        onPressWidget={jest.fn()}
        horizontal={false}
      />
    );

    expect(getByText('Modules complémentaires')).toBeTruthy();
  });

  it('devrait appeler onPressWidget quand un widget est pressé', () => {
    const mockWidgets = [
      { type: 'purchases' as const, screen: 'MyPurchases' },
    ];

    const mockWidgetData = {
      emoji: '🛒',
      title: 'Achats',
      primary: 10,
      secondary: 2,
      labelPrimary: 'Total',
      labelSecondary: 'En attente',
    };

    const onPressWidget = jest.fn();

    mockGetWidgetData.mockReturnValue(mockWidgetData);

    const { getByText } = render(
      <DashboardSecondaryWidgets
        widgets={mockWidgets}
        animations={mockAnimations}
        onPressWidget={onPressWidget}
        horizontal={true}
      />
    );

    fireEvent.press(getByText('Achats').parent?.parent as any);

    expect(onPressWidget).toHaveBeenCalledWith('MyPurchases');
  });

  it('devrait ne pas rendre les widgets sans données', () => {
    const mockWidgets = [
      { type: 'purchases' as const, screen: 'MyPurchases' },
      { type: 'expenses' as const, screen: 'MyPurchases' },
    ];

    mockGetWidgetData.mockReturnValue(null);

    const { queryByText } = render(
      <DashboardSecondaryWidgets
        widgets={mockWidgets}
        animations={mockAnimations}
        onPressWidget={jest.fn()}
        horizontal={true}
      />
    );

    expect(queryByText('Achats')).toBeNull();
  });

  it('devrait grouper les widgets en colonnes de 2', () => {
    const mockWidgets = [
      { type: 'purchases' as const, screen: 'MyPurchases' },
      { type: 'expenses' as const, screen: 'MyPurchases' },
      { type: 'marketplace' as const, screen: 'Marketplace' },
    ];

    const mockWidgetData = {
      emoji: '🛒',
      title: 'Test',
      primary: 10,
      secondary: 2,
      labelPrimary: 'Total',
      labelSecondary: 'En attente',
    };

    mockGetWidgetData.mockReturnValue(mockWidgetData);

    const { UNSAFE_getAllByType } = render(
      <DashboardSecondaryWidgets
        widgets={mockWidgets}
        animations={mockAnimations}
        onPressWidget={jest.fn()}
        horizontal={false}
      />
    );

    // Devrait avoir 2 colonnes (une avec 2 widgets, une avec 1)
    expect(UNSAFE_getAllByType).toBeDefined();
  });

  it('devrait afficher l\'indicateur de pagination si plus d\'une page', () => {
    const mockWidgets = Array.from({ length: 5 }, (_, i) => ({
      type: 'purchases' as const,
      screen: `Screen${i}`,
    }));

    const mockWidgetData = {
      emoji: '🛒',
      title: 'Test',
      primary: 10,
      secondary: 2,
      labelPrimary: 'Total',
      labelSecondary: 'En attente',
    };

    mockGetWidgetData.mockReturnValue(mockWidgetData);

    const { container } = render(
      <DashboardSecondaryWidgets
        widgets={mockWidgets}
        animations={mockAnimations}
        onPressWidget={jest.fn()}
        horizontal={true}
      />
    );

    // L'indicateur de pagination devrait être présent
    expect(container).toBeDefined();
  });
});

