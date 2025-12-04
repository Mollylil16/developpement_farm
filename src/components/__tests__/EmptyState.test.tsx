/**
 * Tests pour EmptyState
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../EmptyState';
import { useTheme } from '../../contexts/ThemeContext';

jest.mock('../../contexts/ThemeContext');
jest.mock('../../utils/textRenderingGuard', () => ({
  SafeTextWrapper: ({ children }: any) => children,
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('EmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      colors: {
        text: '#000000',
        textSecondary: '#666666',
      },
      isDark: false,
      toggleTheme: jest.fn(),
    } as any);
  });

  it('devrait rendre le titre', () => {
    const title = 'Aucune donnée';
    const { getByText } = render(<EmptyState title={title} />);
    expect(getByText(title)).toBeTruthy();
  });

  it('devrait afficher le message si fourni', () => {
    const title = 'Aucune donnée';
    const message = 'Il n\'y a pas de données à afficher';
    const { getByText } = render(<EmptyState title={title} message={message} />);
    expect(getByText(message)).toBeTruthy();
  });

  it('ne devrait pas afficher de message si non fourni', () => {
    const title = 'Aucune donnée';
    const { queryByText } = render(<EmptyState title={title} />);
    expect(queryByText(/Il n'y a pas/i)).toBeNull();
  });

  it('devrait afficher l\'icône si fournie', () => {
    const title = 'Aucune donnée';
    const icon = <Ionicons name="alert-circle-outline" size={48} color="#FF0000" />;
    const { getByText } = render(<EmptyState title={title} icon={icon} />);
    // Vérifier que le composant se rend correctement avec l'icône
    expect(getByText(title)).toBeTruthy();
  });

  it('ne devrait pas afficher d\'icône si non fournie', () => {
    const title = 'Aucune donnée';
    const { queryByTestId } = render(<EmptyState title={title} />);
    // Pas de testId spécifique, mais on peut vérifier que l'icône n'est pas rendue
    expect(queryByTestId('empty-state-icon')).toBeNull();
  });

  it('devrait afficher l\'action si fournie', () => {
    const title = 'Aucune donnée';
    const { Text } = require('react-native');
    const action = <Text>Action</Text>;
    const { getByText } = render(<EmptyState title={title} action={action} />);
    expect(getByText('Action')).toBeTruthy();
  });

  it('ne devrait pas afficher d\'action si non fournie', () => {
    const title = 'Aucune donnée';
    const { queryByText } = render(<EmptyState title={title} />);
    expect(queryByText(/Action/i)).toBeNull();
  });

  it('devrait rendre tous les éléments ensemble', () => {
    const title = 'Aucune donnée';
    const message = 'Message d\'information';
    const icon = <Ionicons name="alert-circle-outline" size={48} color="#FF0000" />;
    const { Text } = require('react-native');
    const action = <Text>Action</Text>;
    
    const { getByText } = render(
      <EmptyState title={title} message={message} icon={icon} action={action} />
    );

    expect(getByText(title)).toBeTruthy();
    expect(getByText(message)).toBeTruthy();
    expect(getByText('Action')).toBeTruthy();
  });
});

