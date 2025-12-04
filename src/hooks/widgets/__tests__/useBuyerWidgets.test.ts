/**
 * Tests pour useBuyerWidgets
 */

import { renderHook } from '@testing-library/react-native';
import { usePurchasesWidget, useExpensesWidget } from '../useBuyerWidgets';
import { useRole } from '../../../contexts/RoleContext';
import { useBuyerData } from '../../useBuyerData';

// Mock dependencies
jest.mock('../../../contexts/RoleContext');
jest.mock('../../useBuyerData');

const mockUseRole = useRole as jest.MockedFunction<typeof useRole>;
const mockUseBuyerData = useBuyerData as jest.MockedFunction<typeof useBuyerData>;

describe('useBuyerWidgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('usePurchasesWidget', () => {
    it('devrait retourner null si buyerProfile est absent', () => {
      mockUseRole.mockReturnValue({
        currentUser: null,
        activeRole: null,
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

      const { result } = renderHook(() => usePurchasesWidget());

      expect(result.current).toBeNull();
    });

    it('devrait retourner les données du widget Achats avec buyerProfile', () => {
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

      const mockOffers = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'countered' },
        { id: '3', status: 'accepted' },
      ] as any;

      mockUseBuyerData.mockReturnValue({
        activeOffers: mockOffers,
        completedTransactions: [],
        recentListings: [],
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => usePurchasesWidget());

      expect(result.current).toEqual({
        emoji: '🛒',
        title: 'Achats',
        primary: 10,
        secondary: 2, // pending + countered
        labelPrimary: 'Total',
        labelSecondary: 'En attente',
      });
    });

    it('devrait utiliser completedTransactions.length si totalPurchases est absent', () => {
      const mockBuyerProfile = {
        purchaseHistory: {},
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

      const mockTransactions = [
        { id: '1', finalPrice: 1000 },
        { id: '2', finalPrice: 2000 },
      ] as any;

      mockUseBuyerData.mockReturnValue({
        activeOffers: [],
        completedTransactions: mockTransactions,
        recentListings: [],
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => usePurchasesWidget());

      expect(result.current?.primary).toBe(2);
    });

    it('devrait filtrer correctement les offres en attente', () => {
      const mockBuyerProfile = {
        purchaseHistory: {
          totalPurchases: 5,
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

      const mockOffers = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'accepted' },
        { id: '3', status: 'rejected' },
        { id: '4', status: 'countered' },
      ] as any;

      mockUseBuyerData.mockReturnValue({
        activeOffers: mockOffers,
        completedTransactions: [],
        recentListings: [],
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => usePurchasesWidget());

      expect(result.current?.secondary).toBe(2); // pending + countered
    });
  });

  describe('useExpensesWidget', () => {
    it('devrait retourner null si buyerProfile est absent', () => {
      mockUseRole.mockReturnValue({
        currentUser: null,
        activeRole: null,
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

      const { result } = renderHook(() => useExpensesWidget());

      expect(result.current).toBeNull();
    });

    it('devrait retourner les données du widget Dépenses avec buyerProfile', () => {
      const mockBuyerProfile = {
        purchaseHistory: {
          totalSpent: 100000,
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

      const mockTransactions = [
        { id: '1', finalPrice: 10000 },
        { id: '2', finalPrice: 20000 },
        { id: '3', finalPrice: 30000 },
      ] as any;

      mockUseBuyerData.mockReturnValue({
        activeOffers: [],
        completedTransactions: mockTransactions,
        recentListings: [],
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useExpensesWidget());

      expect(result.current).toEqual({
        emoji: '💰',
        title: 'Dépenses',
        primary: '100\u00a0000', // toLocaleString avec espace insécable
        secondary: '20\u00a0000', // moyenne arrondie
        labelPrimary: 'Total FCFA',
        labelSecondary: 'Moyenne',
      });
    });

    it('devrait utiliser 0 si totalSpent est absent', () => {
      const mockBuyerProfile = {
        purchaseHistory: {},
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

      const { result } = renderHook(() => useExpensesWidget());

      expect(result.current?.primary).toBe('0');
      expect(result.current?.secondary).toBe('0');
    });

    it('devrait calculer correctement la moyenne des transactions', () => {
      const mockBuyerProfile = {
        purchaseHistory: {
          totalSpent: 0,
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

      const mockTransactions = [
        { id: '1', finalPrice: 15000 },
        { id: '2', finalPrice: 25000 },
      ] as any;

      mockUseBuyerData.mockReturnValue({
        activeOffers: [],
        completedTransactions: mockTransactions,
        recentListings: [],
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useExpensesWidget());

      // Moyenne = (15000 + 25000) / 2 = 20000
      expect(result.current?.secondary).toBe('20\u00a0000');
    });

    it('devrait arrondir correctement la moyenne', () => {
      const mockBuyerProfile = {
        purchaseHistory: {
          totalSpent: 0,
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

      const mockTransactions = [
        { id: '1', finalPrice: 15333 },
        { id: '2', finalPrice: 25666 },
      ] as any;

      mockUseBuyerData.mockReturnValue({
        activeOffers: [],
        completedTransactions: mockTransactions,
        recentListings: [],
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => useExpensesWidget());

      // Moyenne = (15333 + 25666) / 2 = 20499.5, arrondi à 20500
      expect(result.current?.secondary).toBe('20\u00a0500');
    });
  });
});

