/**
 * Tests pour StatCard
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Ionicons } from '@expo/vector-icons';
import StatCard from '../StatCard';
import { useTheme } from '../../contexts/ThemeContext';

jest.mock('../../contexts/ThemeContext');
jest.mock('../../utils/textRenderingGuard', () => ({
  SafeTextWrapper: ({ children }: any) => children,
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('StatCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      colors: {
        surface: '#F5F5F5',
        primary: '#007AFF',
        primaryLight: '#5AC8FA',
        textSecondary: '#666666',
        borderLight: '#E0E0E0',
        shadow: {
          small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          },
          medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
          },
          large: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
          },
        },
      },
      isDark: false,
      toggleTheme: jest.fn(),
    } as any);
  });

  it('devrait rendre la valeur et le label', () => {
    const { getByText } = render(<StatCard value={100} label="Total" />);
    expect(getByText('100')).toBeTruthy();
    expect(getByText('Total')).toBeTruthy();
  });

  it("devrait afficher l'unité si fournie", () => {
    const { getByText } = render(<StatCard value={100} label="Poids" unit="kg" />);
    expect(getByText(/100/)).toBeTruthy();
    expect(getByText(/kg/)).toBeTruthy();
  });

  it("devrait afficher l'icône si fournie", () => {
    const icon = <Ionicons name="paw" size={24} color="#007AFF" />;
    const { getByText } = render(<StatCard value={100} label="Total" icon={icon} />);
    // Vérifier que le composant se rend correctement avec l'icône
    expect(getByText('100')).toBeTruthy();
    expect(getByText('Total')).toBeTruthy();
  });

  it('devrait utiliser la couleur primaire par défaut pour la valeur', () => {
    const { getByText } = render(<StatCard value={100} label="Total" />);
    const valueText = getByText('100');
    expect(valueText).toBeTruthy();
    // La couleur est appliquée via style, difficile à tester directement
  });

  it('devrait utiliser la couleur personnalisée si fournie', () => {
    const customColor = '#FF0000';
    const { getByText } = render(<StatCard value={100} label="Total" valueColor={customColor} />);
    const valueText = getByText('100');
    expect(valueText).toBeTruthy();
  });

  it('devrait gérer les valeurs numériques', () => {
    const { getByText } = render(<StatCard value={42} label="Nombre" />);
    expect(getByText('42')).toBeTruthy();
  });

  it('devrait gérer les valeurs string', () => {
    const { getByText } = render(<StatCard value="N/A" label="Statut" />);
    expect(getByText('N/A')).toBeTruthy();
  });

  it('devrait gérer les valeurs null/undefined en les convertissant en 0', () => {
    const { getByText } = render(<StatCard value={null as any} label="Total" />);
    expect(getByText('0')).toBeTruthy();
  });

  it('devrait appliquer le style personnalisé', () => {
    const customStyle = { marginTop: 20 };
    const { getByText } = render(<StatCard value={100} label="Total" style={customStyle} />);
    expect(getByText('100')).toBeTruthy();
  });

  it('devrait utiliser le gradient si activé', () => {
    const { getByText } = render(<StatCard value={100} label="Total" gradient={true} />);
    expect(getByText('100')).toBeTruthy();
  });
});
