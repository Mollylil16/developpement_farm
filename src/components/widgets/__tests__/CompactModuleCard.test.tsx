/**
 * Tests pour CompactModuleCard
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CompactModuleCard from '../CompactModuleCard';
import { useTheme } from '../../../contexts/ThemeContext';

// Mock dependencies
jest.mock('../../../contexts/ThemeContext');

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('CompactModuleCard', () => {
  const mockColors = {
    text: '#000000',
    textSecondary: '#666666',
    divider: '#E0E0E0',
  };

  beforeEach(() => {
    mockUseTheme.mockReturnValue({
      colors: mockColors as any,
      isDark: false,
      toggleTheme: jest.fn(),
    });
  });

  it('devrait rendre la carte avec les props fournies', () => {
    const { getByText } = render(
      <CompactModuleCard
        icon="🛒"
        title="Achats"
        primaryValue={10}
        secondaryValue={2}
        labelPrimary="Total"
        labelSecondary="En attente"
      />
    );

    expect(getByText('🛒')).toBeTruthy();
    expect(getByText('Achats')).toBeTruthy();
    expect(getByText('10')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('Total')).toBeTruthy();
    expect(getByText('En attente')).toBeTruthy();
  });

  it('devrait appeler onPress quand la carte est pressée', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <CompactModuleCard
        icon="🛒"
        title="Achats"
        primaryValue={10}
        secondaryValue={2}
        labelPrimary="Total"
        labelSecondary="En attente"
        onPress={onPress}
      />
    );

    fireEvent.press(getByText('Achats').parent?.parent as any);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('devrait gérer les valeurs null/undefined', () => {
    const { getByText } = render(
      <CompactModuleCard
        icon="💰"
        title="Dépenses"
        primaryValue={null as any}
        secondaryValue={undefined as any}
        labelPrimary="Total"
        labelSecondary="Moyenne"
      />
    );

    expect(getByText('0')).toBeTruthy(); // Devrait afficher 0 pour null/undefined
  });

  it('devrait gérer les valeurs string', () => {
    const { getByText } = render(
      <CompactModuleCard
        icon="💰"
        title="Dépenses"
        primaryValue="100 000"
        secondaryValue="20 000"
        labelPrimary="Total FCFA"
        labelSecondary="Moyenne"
      />
    );

    expect(getByText('100 000')).toBeTruthy();
    expect(getByText('20 000')).toBeTruthy();
  });

  it('devrait ne pas rendre TouchableOpacity si onPress est absent', () => {
    const { UNSAFE_getByType } = render(
      <CompactModuleCard
        icon="🛒"
        title="Achats"
        primaryValue={10}
        secondaryValue={2}
        labelPrimary="Total"
        labelSecondary="En attente"
      />
    );

    // Ne devrait pas avoir de TouchableOpacity
    expect(() => UNSAFE_getByType('TouchableOpacity')).toThrow();
  });
});
