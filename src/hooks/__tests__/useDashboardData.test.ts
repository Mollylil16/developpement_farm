/**
 * Tests pour useDashboardData
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useDashboardData } from '../useDashboardData';

// Mock des dépendances AVANT les imports
jest.mock('../../store/hooks', () => ({
  useAppDispatch: jest.fn(),
}));

jest.mock('../../store/slices/mortalitesSlice', () => ({
  loadMortalitesParProjet: jest.fn(),
  loadStatistiquesMortalite: jest.fn(),
}));

jest.mock('../../store/slices/productionSlice', () => ({
  loadProductionAnimaux: jest.fn(),
  loadPeseesRecents: jest.fn(),
}));

import { useAppDispatch } from '../../store/hooks';

const mockDispatch = jest.fn();
const mockUnwrap = jest.fn(() => Promise.resolve({}));

describe('useDashboardData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    mockDispatch.mockReturnValue({ unwrap: mockUnwrap });
  });

  it('devrait initialiser avec isInitialLoading à true', () => {
    const { result } = renderHook(() =>
      useDashboardData({ projetId: 'test-projet-id' })
    );

    expect(result.current.isInitialLoading).toBe(true);
    expect(result.current.refreshing).toBe(false);
  });

  it('ne devrait pas charger les données si projetId est undefined', async () => {
    const { result } = renderHook(() =>
      useDashboardData({ projetId: undefined })
    );

    await waitFor(() => {
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  it('devrait charger les données au montage avec un projetId valide', async () => {
    const projetId = 'test-projet-id';
    renderHook(() => useDashboardData({ projetId }));

    await waitFor(
      () => {
        expect(mockDispatch).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    // Vérifier que les actions Redux sont dispatchées
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.any(String),
      })
    );
  });

  it('devrait appeler onProfilPhotoLoad si fourni', async () => {
    const projetId = 'test-projet-id';
    const mockOnProfilPhotoLoad = jest.fn(() => Promise.resolve());

    renderHook(() =>
      useDashboardData({
        projetId,
        onProfilPhotoLoad: mockOnProfilPhotoLoad,
      })
    );

    await waitFor(
      () => {
        expect(mockOnProfilPhotoLoad).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });

  it('devrait mettre à jour refreshing lors du refresh', async () => {
    const projetId = 'test-projet-id';
    const { result } = renderHook(() =>
      useDashboardData({ projetId })
    );

    // Attendre que le chargement initial soit terminé
    await waitFor(
      () => {
        expect(result.current.isInitialLoading).toBe(false);
      },
      { timeout: 1000 }
    );

    // Lancer le refresh
    const refreshPromise = result.current.onRefresh();

    // Vérifier que refreshing est true pendant le refresh
    expect(result.current.refreshing).toBe(true);

    await refreshPromise;

    // Vérifier que refreshing est false après le refresh
    expect(result.current.refreshing).toBe(false);
  });

  it('ne devrait pas recharger les données si le même projetId est utilisé', async () => {
    const projetId = 'test-projet-id';
    const { rerender } = renderHook(
      ({ projetId }) => useDashboardData({ projetId }),
      { initialProps: { projetId } }
    );

    // Attendre le premier chargement
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
    });

    const callCountBefore = mockDispatch.mock.calls.length;

    // Re-render avec le même projetId
    rerender({ projetId });

    await waitFor(() => {
      // Le nombre d'appels ne devrait pas augmenter significativement
      // (seulement les appels initiaux)
      expect(mockDispatch.mock.calls.length).toBeLessThanOrEqual(
        callCountBefore + 1
      );
    });
  });

  it('devrait gérer les erreurs lors du chargement', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const projetId = 'test-projet-id';
    mockUnwrap.mockRejectedValueOnce(new Error('Erreur de chargement'));

    renderHook(() => useDashboardData({ projetId }));

    await waitFor(
      () => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Erreur lors du chargement des données:',
          expect.any(Error)
        );
      },
      { timeout: 1000 }
    );

    consoleErrorSpy.mockRestore();
  });
});

