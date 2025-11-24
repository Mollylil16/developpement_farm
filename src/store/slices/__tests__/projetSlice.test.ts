/**
 * Tests unitaires pour le slice Projet
 * Exemple de test Redux avec Redux Toolkit
 */

import projetReducer, { setProjetActif } from '../projetSlice';
import { ProjetState } from '../projetSlice';

describe('Projet Slice', () => {
  const initialState: ProjetState = {
    projets: [],
    projetActif: null,
    loading: false,
    error: null,
  };

  it('devrait retourner l\'état initial', () => {
    expect(projetReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('devrait définir le projet actif', () => {
    const projet = {
      id: '1',
      nom: 'Ferme Test',
      description: 'Description test',
      date_creation: '2025-01-01',
      derniere_modification: '2025-01-01',
    };

    const actual = projetReducer(initialState, setProjetActif(projet));
    expect(actual.projetActif).toEqual(projet);
  });

  it('devrait remplacer le projet actif', () => {
    const projet1 = {
      id: '1',
      nom: 'Ferme 1',
      description: 'Description 1',
      date_creation: '2025-01-01',
      derniere_modification: '2025-01-01',
    };

    const projet2 = {
      id: '2',
      nom: 'Ferme 2',
      description: 'Description 2',
      date_creation: '2025-01-02',
      derniere_modification: '2025-01-02',
    };

    let state = projetReducer(initialState, setProjetActif(projet1));
    expect(state.projetActif?.id).toBe('1');

    state = projetReducer(state, setProjetActif(projet2));
    expect(state.projetActif?.id).toBe('2');
  });
});

