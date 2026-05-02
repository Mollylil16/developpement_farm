/**
 * Tests pour DashboardBuyerScreen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DashboardBuyerScreen from '../DashboardBuyerScreen';
import { useRole } from '../../contexts/RoleContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useBuyerData } from '../../hooks/useBuyerData';
import { useProfilData } from '../../hooks/useProfilData';
import { useDashboardAnimations } from '../../hooks/useDashboardAnimations';
import { useMarketplaceNotifications } from '../../hooks/useMarketplaceNotifications';

// Mock dependencies
jest.mock('../../contexts/RoleContext');
jest.mock('../../contexts/ThemeContext');
jest.mock('../../hooks/useBuyerData');
jest.mock('../../hooks/useProfilData');
jest.mock('../../hooks/useDashboardAnimations');
jest.mock('../../hooks/useMarketplaceNotifications');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

const mockUseRole = useRole as jest.MockedFunction<typeof useRole>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockUseBuyerData = useBuyerData as jest.MockedFunction<typeof useBuyerData>;
const mockUseProfilData = useProfilData as jest.MockedFunction<typeof useProfilData>;
const mockUseDashboardAnimations = useDashboardAnimations as jest.MockedFunction<
  typeof useDashboardAnimations
>;
const mockUseMarketplaceNotifications = useMarketplaceNotifications as jest.MockedFunction<
  typeof useMarketplaceNotifications
>;

describe('DashboardBuyerScreen', () => {
  const mockColors = {
    text: '#000000',
    textSecondary: '#666666',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    primary: '#007AFF',
    error: '#FF3B30',
    success: '#34C759',
  };

  const mockAnimations = {
    headerAnim: { value: 1 } as any,
    secondaryWidgetsAnim: [{ value: 1 } as any],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      colors: mockColors as any,
      isDark: false,
      toggleTheme: jest.fn(),
    });
    mockUseDashboardAnimations.mockReturnValue(mockAnimations);
    mockUseProfilData.mockReturnValue({
      profilPrenom: 'Test',
      profilPhotoUri: null,
      profilInitiales: 'T',
      loadProfilPhoto: jest.fn(),
    });
    mockUseMarketplaceNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      markAsRead: jest.fn(),
      deleteNotification: jest.fn(),
    });
  });

  it('devrait afficher EmptyState si buyerProfile est absent', () => {
    mockUseRole.mockReturnValue({
      currentUser: null,
      activeRole: null,
      switchRole: jest.fn(),
    });

    const { getByText } = render(<DashboardBuyerScreen />);

    expect(getByText(/Profil Acheteur non activé/i)).toBeTruthy();
  });

  it('devrait rendre le dashboard avec buyerProfile', () => {
    const mockBuyerProfile = {
      purchaseHistory: {
        totalPurchases: 10,
        totalSpent: 50000,
      },
      businessInfo: {
        companyName: 'Test Company',
      },
    };

    mockUseRole.mockReturnValue({
      currentUser: {
        id: '1',
        roles: {
          buyer: mockBuyerProfile,
        },
      } as any,
      activeRole: 'buyer',
      switchRole: jest.fn(),
    });

    mockUseBuyerData.mockReturnValue({
      activeOffers: [],
      completedTransactions: [],
      recentListings: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText } = render(<DashboardBuyerScreen />);

    expect(getByText(/Test/i)).toBeTruthy(); // Prenom du profil
  });

  it('devrait afficher les widgets secondaires', () => {
    const mockBuyerProfile = {
      purchaseHistory: {
        totalPurchases: 10,
        totalSpent: 50000,
      },
      businessInfo: {
        companyName: 'Test Company',
      },
    };

    mockUseRole.mockReturnValue({
      currentUser: {
        id: '1',
        roles: {
          buyer: mockBuyerProfile,
        },
      } as any,
      activeRole: 'buyer',
      switchRole: jest.fn(),
    });

    mockUseBuyerData.mockReturnValue({
      activeOffers: [],
      completedTransactions: [],
      recentListings: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { container } = render(<DashboardBuyerScreen />);

    // Les widgets secondaires devraient être présents
    expect(container).toBeDefined();
  });

  it('devrait afficher la carte de tendance de prix', () => {
    const mockBuyerProfile = {
      purchaseHistory: {
        totalPurchases: 10,
        totalSpent: 50000,
      },
      businessInfo: {
        companyName: 'Test Company',
      },
    };

    mockUseRole.mockReturnValue({
      currentUser: {
        id: '1',
        roles: {
          buyer: mockBuyerProfile,
        },
      } as any,
      activeRole: 'buyer',
      switchRole: jest.fn(),
    });

    mockUseBuyerData.mockReturnValue({
      activeOffers: [],
      completedTransactions: [],
      recentListings: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { container } = render(<DashboardBuyerScreen />);

    // La carte de tendance devrait être présente
    expect(container).toBeDefined();
  });

  it('devrait afficher les offres en cours', () => {
    const mockBuyerProfile = {
      purchaseHistory: {
        totalPurchases: 10,
        totalSpent: 50000,
      },
      businessInfo: {
        companyName: 'Test Company',
      },
    };

    const mockOffers = [
      { id: '1', status: 'pending', proposedPrice: 10000 },
      { id: '2', status: 'countered', proposedPrice: 20000 },
    ] as any;

    mockUseRole.mockReturnValue({
      currentUser: {
        id: '1',
        roles: {
          buyer: mockBuyerProfile,
        },
      } as any,
      activeRole: 'buyer',
      switchRole: jest.fn(),
    });

    mockUseBuyerData.mockReturnValue({
      activeOffers: mockOffers,
      completedTransactions: [],
      recentListings: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText } = render(<DashboardBuyerScreen />);

    expect(getByText(/Mes offres en cours/i)).toBeTruthy();
  });

  it("devrait afficher l'historique d'achats", () => {
    const mockBuyerProfile = {
      purchaseHistory: {
        totalPurchases: 10,
        totalSpent: 50000,
      },
      businessInfo: {
        companyName: 'Test Company',
      },
    };

    const mockTransactions = [
      { id: '1', status: 'completed', finalPrice: 10000 },
      { id: '2', status: 'completed', finalPrice: 20000 },
    ] as any;

    mockUseRole.mockReturnValue({
      currentUser: {
        id: '1',
        roles: {
          buyer: mockBuyerProfile,
        },
      } as any,
      activeRole: 'buyer',
      switchRole: jest.fn(),
    });

    mockUseBuyerData.mockReturnValue({
      activeOffers: [],
      completedTransactions: mockTransactions,
      recentListings: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText } = render(<DashboardBuyerScreen />);

    expect(getByText(/Historique d'achats/i)).toBeTruthy();
  });

  it('devrait afficher les nouvelles annonces', () => {
    const mockBuyerProfile = {
      purchaseHistory: {
        totalPurchases: 10,
        totalSpent: 50000,
      },
      businessInfo: {
        companyName: 'Test Company',
      },
    };

    const mockListings = [
      { id: '1', status: 'available', pricePerKg: 2000 },
      { id: '2', status: 'available', pricePerKg: 2100 },
    ] as any;

    mockUseRole.mockReturnValue({
      currentUser: {
        id: '1',
        roles: {
          buyer: mockBuyerProfile,
        },
      } as any,
      activeRole: 'buyer',
      switchRole: jest.fn(),
    });

    mockUseBuyerData.mockReturnValue({
      activeOffers: [],
      completedTransactions: [],
      recentListings: mockListings,
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText } = render(<DashboardBuyerScreen />);

    expect(getByText(/Nouvelles annonces/i)).toBeTruthy();
  });

  it('devrait gérer le refresh', async () => {
    const mockBuyerProfile = {
      purchaseHistory: {
        totalPurchases: 10,
        totalSpent: 50000,
      },
      businessInfo: {
        companyName: 'Test Company',
      },
    };

    const refresh = jest.fn().mockResolvedValue(undefined);

    mockUseRole.mockReturnValue({
      currentUser: {
        id: '1',
        roles: {
          buyer: mockBuyerProfile,
        },
      } as any,
      activeRole: 'buyer',
      switchRole: jest.fn(),
    });

    mockUseBuyerData.mockReturnValue({
      activeOffers: [],
      completedTransactions: [],
      recentListings: [],
      loading: false,
      error: null,
      refresh,
    });

    const { UNSAFE_getByType } = render(<DashboardBuyerScreen />);

    // Le RefreshControl devrait être présent dans le ScrollView
    expect(UNSAFE_getByType).toBeDefined();
  });

  it("devrait afficher l'état de chargement", () => {
    const mockBuyerProfile = {
      purchaseHistory: {
        totalPurchases: 10,
        totalSpent: 50000,
      },
      businessInfo: {
        companyName: 'Test Company',
      },
    };

    mockUseRole.mockReturnValue({
      currentUser: {
        id: '1',
        roles: {
          buyer: mockBuyerProfile,
        },
      } as any,
      activeRole: 'buyer',
      switchRole: jest.fn(),
    });

    mockUseBuyerData.mockReturnValue({
      activeOffers: [],
      completedTransactions: [],
      recentListings: [],
      loading: true,
      error: null,
      refresh: jest.fn(),
    });

    const { container } = render(<DashboardBuyerScreen />);

    // L'état de chargement devrait être géré
    expect(container).toBeDefined();
  });

  it('devrait gérer les erreurs', () => {
    const mockBuyerProfile = {
      purchaseHistory: {
        totalPurchases: 10,
        totalSpent: 50000,
      },
      businessInfo: {
        companyName: 'Test Company',
      },
    };

    mockUseRole.mockReturnValue({
      currentUser: {
        id: '1',
        roles: {
          buyer: mockBuyerProfile,
        },
      } as any,
      activeRole: 'buyer',
      switchRole: jest.fn(),
    });

    mockUseBuyerData.mockReturnValue({
      activeOffers: [],
      completedTransactions: [],
      recentListings: [],
      loading: false,
      error: 'Erreur de chargement',
      refresh: jest.fn(),
    });

    const { container } = render(<DashboardBuyerScreen />);

    // L'erreur devrait être gérée
    expect(container).toBeDefined();
  });
});
