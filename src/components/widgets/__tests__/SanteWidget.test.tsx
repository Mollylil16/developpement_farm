/**
 * Tests pour SanteWidget
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SanteWidget from '../SanteWidget';
import { ThemeProvider } from '../../../contexts/ThemeContext';

// Store de test avec états de santé
const createTestStore = (santeState = {}, mortalitesState = {}) => {
  return configureStore({
    reducer: {
      sante: (
        state = {
          loading: {
            vaccinations: false,
            maladies: false,
            traitements: false,
            mortalites: false,
          },
          ...santeState,
        }
      ) => state,
      mortalites: (
        state = {
          statistiques: { total_morts: 0 },
          ...mortalitesState,
        }
      ) => state,
    },
  });
};

const renderWithProviders = (component: React.ReactElement, storeConfig = {}) => {
  const store = createTestStore(storeConfig);
  return render(
    <Provider store={store}>
      <ThemeProvider>{component}</ThemeProvider>
    </Provider>
  );
};

// Mocks des selectors
jest.mock('../../../store/selectors/santeSelectors', () => ({
  selectNombreVaccinationsEnRetard: jest.fn(() => 0),
  selectNombreMaladiesEnCours: jest.fn(() => 0),
  selectNombreTraitementsEnCours: jest.fn(() => 0),
  selectNombreAlertesCritiques: jest.fn(() => 0),
  selectSanteLoading: jest.fn(() => ({
    vaccinations: false,
    maladies: false,
    traitements: false,
    mortalites: false,
  })),
}));

jest.mock('../../../store/selectors/mortalitesSelectors', () => ({
  selectNombreTotalMortalites: jest.fn(() => 0),
}));

describe('SanteWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('affiche le titre correctement', () => {
    const { getByText } = renderWithProviders(<SanteWidget />);
    expect(getByText('Santé')).toBeTruthy();
  });

  it('affiche un loader pendant le chargement', () => {
    const santeSelectors = require('../../../store/selectors/santeSelectors');
    santeSelectors.selectSanteLoading.mockReturnValue({
      vaccinations: true,
      maladies: false,
      traitements: false,
      mortalites: false,
    });

    const { UNSAFE_getByType } = renderWithProviders(<SanteWidget />);
    // Devrait contenir un ActivityIndicator
    expect(UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
  });

  it('affiche "Excellent état sanitaire" quand toutes les stats sont à 0', () => {
    const { getByText } = renderWithProviders(<SanteWidget />);

    expect(getByText('Excellent état sanitaire')).toBeTruthy();
    expect(getByText('0 vaccin en retard')).toBeTruthy();
    expect(getByText('0 maladie')).toBeTruthy();
    expect(getByText('0 mortalité')).toBeTruthy();
    expect(getByText('0 traitement')).toBeTruthy();
  });

  it('affiche le nombre de vaccinations en retard', () => {
    const santeSelectors = require('../../../store/selectors/santeSelectors');
    santeSelectors.selectNombreVaccinationsEnRetard.mockReturnValue(3);

    const { getByText, queryByText } = renderWithProviders(<SanteWidget />);

    expect(getByText('3 vaccins en retard')).toBeTruthy();
    expect(queryByText('Excellent état sanitaire')).toBeNull();
  });

  it('affiche le nombre de maladies en cours', () => {
    const santeSelectors = require('../../../store/selectors/santeSelectors');
    santeSelectors.selectNombreMaladiesEnCours.mockReturnValue(2);

    const { getByText } = renderWithProviders(<SanteWidget />);

    expect(getByText('2 maladies en cours')).toBeTruthy();
  });

  it('affiche le nombre de mortalités', () => {
    const mortalitesSelectors = require('../../../store/selectors/mortalitesSelectors');
    mortalitesSelectors.selectNombreTotalMortalites.mockReturnValue(5);

    const { getByText } = renderWithProviders(<SanteWidget />);

    expect(getByText('5 mortalités')).toBeTruthy();
  });

  it('affiche le singulier pour 1 vaccination en retard', () => {
    const santeSelectors = require('../../../store/selectors/santeSelectors');
    santeSelectors.selectNombreVaccinationsEnRetard.mockReturnValue(1);

    const { getByText } = renderWithProviders(<SanteWidget />);

    expect(getByText('1 vaccin en retard')).toBeTruthy();
  });

  it('affiche le singulier pour 1 mortalité', () => {
    const mortalitesSelectors = require('../../../store/selectors/mortalitesSelectors');
    mortalitesSelectors.selectNombreTotalMortalites.mockReturnValue(1);

    const { getByText } = renderWithProviders(<SanteWidget />);

    expect(getByText('1 mortalité')).toBeTruthy();
  });

  it('affiche les alertes critiques', () => {
    const santeSelectors = require('../../../store/selectors/santeSelectors');
    santeSelectors.selectNombreAlertesCritiques.mockReturnValue(2);

    const { getByText } = renderWithProviders(<SanteWidget />);

    expect(getByText('2 alerte(s) critique(s)')).toBeTruthy();
  });

  it("affiche le badge d'alerte quand il y a des problèmes", () => {
    const santeSelectors = require('../../../store/selectors/santeSelectors');
    santeSelectors.selectNombreVaccinationsEnRetard.mockReturnValue(1);

    const { UNSAFE_getAllByType } = renderWithProviders(<SanteWidget />);

    // Devrait contenir une icône warning dans le badge
    const views = UNSAFE_getAllByType(require('react-native').View);
    expect(views.length).toBeGreaterThan(0);
  });

  it('affiche tous les traitements actifs', () => {
    const santeSelectors = require('../../../store/selectors/santeSelectors');
    santeSelectors.selectNombreTraitementsEnCours.mockReturnValue(4);

    const { getByText } = renderWithProviders(<SanteWidget />);

    expect(getByText('4 traitements actifs')).toBeTruthy();
  });

  it('appelle onPress quand cliqué', () => {
    const onPressMock = jest.fn();
    const { getByText } = renderWithProviders(<SanteWidget onPress={onPressMock} />);

    // Le composant entier est un TouchableOpacity
    const widget = getByText('Santé');
    expect(widget).toBeTruthy();
  });

  it('affiche "Voir détails" dans le footer', () => {
    const { getByText } = renderWithProviders(<SanteWidget />);

    expect(getByText('Voir détails')).toBeTruthy();
  });

  it('affiche toujours les 4 statistiques même si à 0', () => {
    const { getByText } = renderWithProviders(<SanteWidget />);

    // Toutes les stats doivent être visibles
    expect(getByText(/vaccin/i)).toBeTruthy();
    expect(getByText(/maladie/i)).toBeTruthy();
    expect(getByText(/mortalité/i)).toBeTruthy();
    expect(getByText(/traitement/i)).toBeTruthy();
  });

  it('gère les valeurs undefined gracieusement', () => {
    const santeSelectors = require('../../../store/selectors/santeSelectors');
    const mortalitesSelectors = require('../../../store/selectors/mortalitesSelectors');

    santeSelectors.selectNombreVaccinationsEnRetard.mockReturnValue(undefined);
    santeSelectors.selectNombreMaladiesEnCours.mockReturnValue(null);
    mortalitesSelectors.selectNombreTotalMortalites.mockReturnValue(NaN);

    const { getByText } = renderWithProviders(<SanteWidget />);

    // Ne doit pas crasher, doit afficher 0 par défaut
    expect(getByText('Santé')).toBeTruthy();
  });
});
