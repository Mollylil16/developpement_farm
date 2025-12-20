/**
 * Tests pour useProfilData
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useProfilData } from '../useProfilData';
import { useAppSelector } from '../../store/hooks';
import { UserRepository } from '../../database/repositories/UserRepository';
import { getDatabase } from '../../services/database';

// Mock des dépendances
jest.mock('../../store/hooks', () => ({
  useAppSelector: jest.fn(),
}));

jest.mock('../../services/database');
jest.mock('../../database/repositories/UserRepository');

const mockUseAppSelector = useAppSelector as jest.Mock;
const mockGetDatabase = getDatabase as jest.Mock;

describe('useProfilData', () => {
  const mockUser = {
    id: 'user-1',
    prenom: 'John',
    nom: 'Doe',
    photo: 'https://example.com/photo.jpg',
  };

  const mockProjetActif = {
    id: 'projet-1',
    nom: 'Test Projet',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppSelector
      .mockReturnValueOnce(mockUser) // auth.user
      .mockReturnValueOnce(mockProjetActif); // projet.projetActif
    mockGetDatabase.mockResolvedValue({});
  });

  it('devrait retourner les données de profil initiales', () => {
    const { result } = renderHook(() => useProfilData());

    expect(result.current.profilPrenom).toBe(mockUser.prenom);
    expect(result.current.profilNom).toBe(mockUser.nom);
    expect(result.current.profilPhotoUri).toBe(mockUser.photo);
    expect(result.current.profilInitiales).toBe('JD');
  });

  it('devrait calculer les initiales correctement', () => {
    mockUseAppSelector
      .mockReturnValueOnce({
        ...mockUser,
        prenom: 'Jean',
        nom: 'Dupont',
      })
      .mockReturnValueOnce(mockProjetActif);

    const { result } = renderHook(() => useProfilData());

    expect(result.current.profilInitiales).toBe('JD');
  });

  it('devrait gérer les utilisateurs sans prénom ou nom', () => {
    mockUseAppSelector
      .mockReturnValueOnce({
        ...mockUser,
        prenom: '',
        nom: '',
      })
      .mockReturnValueOnce(mockProjetActif);

    const { result } = renderHook(() => useProfilData());

    expect(result.current.profilInitiales).toBe('?');
  });

  it('devrait charger la photo de profil', async () => {
    const mockUserRepo = {
      findById: jest.fn().mockResolvedValue({
        ...mockUser,
        photo: 'https://example.com/new-photo.jpg',
      }),
    };
    (UserRepository as jest.Mock).mockImplementation(() => mockUserRepo);

    const { result } = renderHook(() => useProfilData());

    await result.current.loadProfilPhoto();

    await waitFor(() => {
      expect(mockUserRepo.findById).toHaveBeenCalled();
    });
  });
});
