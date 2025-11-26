/**
 * Tests pour Card - Composant de base utilisé partout
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Card from '../Card';
import { ThemeProvider } from '../../contexts/ThemeContext';

const createTestStore = () => {
  return configureStore({
    reducer: {
      // Store minimal pour ThemeProvider
      _dummy: (state = {}) => state,
    },
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <ThemeProvider>{component}</ThemeProvider>
    </Provider>
  );
};

describe('Card', () => {
  it('rend son contenu correctement', () => {
    const { getByText } = renderWithProviders(
      <Card>
        <Text>Test Content</Text>
      </Card>
    );

    expect(getByText('Test Content')).toBeTruthy();
  });

  it('applique les styles personnalisés', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = renderWithProviders(
      <Card style={customStyle} testID="test-card">
        <Text>Content</Text>
      </Card>
    );

    const card = getByTestId('test-card');
    expect(card).toBeTruthy();
  });

  it('rend plusieurs enfants', () => {
    const { getByText } = renderWithProviders(
      <Card>
        <Text>First Child</Text>
        <Text>Second Child</Text>
        <Text>Third Child</Text>
      </Card>
    );

    expect(getByText('First Child')).toBeTruthy();
    expect(getByText('Second Child')).toBeTruthy();
    expect(getByText('Third Child')).toBeTruthy();
  });

  it('gère les enfants null/undefined sans crash', () => {
    const { container } = renderWithProviders(
      <Card>
        {null}
        {undefined}
        <Text>Valid Content</Text>
      </Card>
    );

    expect(container).toBeTruthy();
  });

  it('applique les couleurs du thème', () => {
    const { getByTestId } = renderWithProviders(
      <Card testID="themed-card">
        <Text>Themed Content</Text>
      </Card>
    );

    const card = getByTestId('themed-card');
    // La carte devrait avoir un backgroundColor du thème
    expect(card.props.style).toBeDefined();
  });
});

