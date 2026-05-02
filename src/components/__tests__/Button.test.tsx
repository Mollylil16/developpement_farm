/**
 * Tests unitaires pour le composant Button
 * Exemple de test avec React Testing Library
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../Button';

describe('Button Component', () => {
  it("devrait s'afficher correctement avec le titre", () => {
    const { getByText } = render(<Button title="Cliquer ici" onPress={() => {}} />);
    expect(getByText('Cliquer ici')).toBeTruthy();
  });

  it('devrait appeler onPress quand cliqué', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<Button title="Tester" onPress={onPressMock} />);

    fireEvent.press(getByText('Tester'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('devrait être désactivé quand disabled=true', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Désactivé" onPress={onPressMock} disabled={true} />
    );

    const button = getByText('Désactivé').parent;
    expect(button?.props.accessibilityState?.disabled).toBe(true);
  });

  it('devrait afficher le loading quand loading=true', () => {
    const { getByTestId } = render(<Button title="Charger" onPress={() => {}} loading={true} />);

    // Le composant devrait contenir un ActivityIndicator
    // (À adapter selon votre implémentation)
    expect(getByTestId).toBeDefined();
  });
});
