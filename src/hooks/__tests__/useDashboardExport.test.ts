/**
 * Tests pour useDashboardExport
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useDashboardExport } from '../useDashboardExport';
import { useAppSelector } from '../../store/hooks';
import { exportDashboardPDF } from '../../services/pdf/dashboardPDF';

// Mock des dépendances
jest.mock('../../store/hooks');
jest.mock('../../services/pdf/dashboardPDF');
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

const mockUseAppSelector = useAppSelector as jest.Mock;

describe('useDashboardExport', () => {
  const mockProjetActif = {
    id: 'projet-1',
    nom: 'Test Projet',
    description: 'Description test',
    date_creation: '2024-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppSelector.mockReturnValue([]);
    (exportDashboardPDF as jest.Mock).mockResolvedValue(undefined);
  });

  it('devrait initialiser avec exportingPDF à false', () => {
    const { result } = renderHook(() => useDashboardExport(mockProjetActif));

    expect(result.current.exportingPDF).toBe(false);
    expect(result.current.handleExportPDF).toBeDefined();
  });

  it('ne devrait pas exporter si projetActif est null', async () => {
    const { result } = renderHook(() => useDashboardExport(null));

    await result.current.handleExportPDF();

    expect(exportDashboardPDF).not.toHaveBeenCalled();
  });

  it('devrait exporter le PDF avec les bonnes données', async () => {
    const mockAnimaux = [
      {
        id: 'animal-1',
        code: 'A001',
        nom: 'Animal 1',
        sexe: 'M',
        statut: 'actif',
        date_entree: '2024-01-01',
      },
    ];

    const mockPeseesParAnimal = {
      'animal-1': [{ id: 'pesee-1', animal_id: 'animal-1', poids_kg: 50, date: '2024-01-15' }],
    };

    const mockChargesFixes = [{ id: 'charge-1', montant: 1000 }];
    const mockDepensesPonctuelles = [{ id: 'depense-1', montant: 500 }];
    const mockRevenus = [{ id: 'revenu-1', montant: 2000 }];
    const mockGestations: any[] = [];
    const mockSevrages: any[] = [];

    mockUseAppSelector
      .mockReturnValueOnce(mockAnimaux) // animaux
      .mockReturnValueOnce(mockPeseesParAnimal) // peseesParAnimal
      .mockReturnValueOnce(mockChargesFixes) // chargesFixes
      .mockReturnValueOnce(mockDepensesPonctuelles) // depensesPonctuelles
      .mockReturnValueOnce(mockRevenus) // revenus
      .mockReturnValueOnce(mockGestations) // gestations
      .mockReturnValueOnce(mockSevrages); // sevrages

    const { result } = renderHook(() => useDashboardExport(mockProjetActif));

    await result.current.handleExportPDF();

    expect(exportDashboardPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        projet: {
          nom: mockProjetActif.nom,
          description: mockProjetActif.description,
          dateCreation: mockProjetActif.date_creation,
        },
        statistiques: expect.objectContaining({
          production: expect.any(Object),
          reproduction: expect.any(Object),
          finance: expect.any(Object),
        }),
      })
    );
  });

  it("devrait mettre exportingPDF à true pendant l'export", async () => {
    let resolveExport: () => void;
    const exportPromise = new Promise<void>((resolve) => {
      resolveExport = resolve;
    });
    (exportDashboardPDF as jest.Mock).mockReturnValue(exportPromise);

    const { result } = renderHook(() => useDashboardExport(mockProjetActif));

    const exportPromise2 = result.current.handleExportPDF();

    // Vérifier que exportingPDF est true pendant l'export
    expect(result.current.exportingPDF).toBe(true);

    resolveExport!();
    await exportPromise2;

    // Vérifier que exportingPDF est false après l'export
    await waitFor(() => {
      expect(result.current.exportingPDF).toBe(false);
    });
  });

  it("devrait afficher un message de succès après l'export", async () => {
    const { result } = renderHook(() => useDashboardExport(mockProjetActif));

    await result.current.handleExportPDF();

    expect(Alert.alert).toHaveBeenCalledWith(
      'PDF généré avec succès',
      'Le rapport dashboard a été généré et est prêt à être partagé.',
      [{ text: 'OK' }]
    );
  });

  it("devrait gérer les erreurs lors de l'export", async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error("Erreur d'export");
    (exportDashboardPDF as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useDashboardExport(mockProjetActif));

    await result.current.handleExportPDF();

    expect(consoleErrorSpy).toHaveBeenCalledWith("Erreur lors de l'export PDF:", error);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Erreur',
      'Impossible de générer le PDF. Vérifiez vos données et réessayez.',
      [{ text: 'OK' }]
    );

    consoleErrorSpy.mockRestore();
  });
});
