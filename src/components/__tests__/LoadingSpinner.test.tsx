/**
 * Tests pour LoadingSpinner
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingSpinner from '../LoadingSpinner';
import { useTheme } from '../../contexts/ThemeContext';

jest.mock('../../contexts/ThemeContext');
jest.mock('../../utils/textRenderingGuard', () => ({
  SafeTextWrapper: ({ children }: any) => children,
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('LoadingSpinner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      colors: {
        background: '#FFFFFF',
        primary: '#007AFF',
        textSecondary: '#666666',
      },
      isDark: false,
      toggleTheme: jest.fn(),
    } as any);
  });

  it('devrait rendre le spinner avec la taille par défaut', () => {
    const { UNSAFE_getByType } = render(<LoadingSpinner />);
    const activityIndicator = UNSAFE_getByType('ActivityIndicator');
    expect(activityIndicator).toBeDefined();
    expect(activityIndicator.props.size).toBe('large');
  });

  it('devrait rendre le spinner avec la taille small', () => {
    const { UNSAFE_getByType } = render(<LoadingSpinner size="small" />);
    const activityIndicator = UNSAFE_getByType('ActivityIndicator');
    expect(activityIndicator.props.size).toBe('small');
  });

  it('devrait afficher le message si fourni', () => {
    const message = 'Chargement en cours...';
    const { getByText } = render(<LoadingSpinner message={message} />);
    expect(getByText(message)).toBeTruthy();
  });

  it('ne devrait pas afficher de message si non fourni', () => {
    const { queryByText } = render(<LoadingSpinner />);
    expect(queryByText(/Chargement/i)).toBeNull();
  });

  it('devrait utiliser la couleur primaire par défaut', () => {
    const { UNSAFE_getByType } = render(<LoadingSpinner />);
    const activityIndicator = UNSAFE_getByType('ActivityIndicator');
    expect(activityIndicator.props.color).toBe('#007AFF');
  });

  it('devrait utiliser la couleur personnalisée si fournie', () => {
    const customColor = '#FF0000';
    const { UNSAFE_getByType } = render(<LoadingSpinner color={customColor} />);
    const activityIndicator = UNSAFE_getByType('ActivityIndicator');
    expect(activityIndicator.props.color).toBe(customColor);
  });
});
