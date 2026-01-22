/**
 * Redux Slice pour le Marketplace
 * Gère l'état global des listings, offers, transactions
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type {
  MarketplaceListing,
  Offer,
  Transaction,
  Notification,
  MarketplaceFilters,
  MarketplaceSortOption,
} from '../../types/marketplace';
import { getErrorMessage } from '../../types/common';
import apiClient from '../../services/api/apiClient';
import type { RootState } from '../store';

interface MarketplaceState {
  // Listings
  listings: MarketplaceListing[];
  currentListing: MarketplaceListing | null;
  listingsLoading: boolean;
  listingsError: string | null;

  // Offers
  myOffers: Offer[];
  receivedOffers: Offer[];
  offersLoading: boolean;
  offersError: string | null;

  // Transactions
  myTransactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: string | null;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  notificationsLoading: boolean;

  // UI State
  filters: MarketplaceFilters;
  sortBy: MarketplaceSortOption;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

const initialState: MarketplaceState = {
  listings: [],
  currentListing: null,
  listingsLoading: false,
  listingsError: null,

  myOffers: [],
  receivedOffers: [],
  offersLoading: false,
  offersError: null,

  myTransactions: [],
  transactionsLoading: false,
  transactionsError: null,

  notifications: [],
  unreadCount: 0,
  notificationsLoading: false,

  filters: {},
  sortBy: 'distance',
  currentPage: 1,
  totalPages: 1,
  hasMore: true,
};

// ========================================
// ASYNC THUNKS
// ========================================

/**
 * Rechercher des listings
 */
export const searchListings = createAsyncThunk(
  'marketplace/searchListings',
  async (
    params: {
      filters?: MarketplaceFilters;
      sort?: MarketplaceSortOption;
      page?: number;
      userId?: string; // ID de l'utilisateur pour EXCLURE ses propres listings (onglet Acheter)
      projetId?: string;
      excludeUserId?: boolean; // Si true, exclure les listings de userId (défaut: true pour onglet Acheter)
    },
    { rejectWithValue, getState }
  ) => {
    // Pagination backend : utiliser limit et offset (défini avant le try pour être accessible dans le catch)
    const page = params.page || 1;
    const limit = 20; // Taille de page standard
    const offset = (page - 1) * limit;
    
    try {
      const state = getState() as RootState;
      const currentUserId = state?.auth?.user?.id;
      const excludeUserId = params.excludeUserId !== false; // Par défaut, exclure les listings du producteur

      // Mapper les options de tri du frontend vers le backend
      // Le frontend utilise: 'distance', 'price_asc', 'price_desc', 'weight_asc', 'weight_desc', 'rating', 'recent'
      // Le backend attend: 'newest', 'oldest', 'price_asc', 'price_desc'
      let sortOption: string = 'newest'; // Par défaut : prioriser les "Nouveau"
      if (params.sort) {
        if (params.sort === 'recent') {
          sortOption = 'newest'; // 'recent' du frontend = 'newest' du backend
        } else if (params.sort === 'price_asc') {
          sortOption = 'price_asc';
        } else if (params.sort === 'price_desc') {
          sortOption = 'price_desc';
        } else if (params.sort === 'distance' || params.sort === 'rating' || params.sort === 'weight_asc' || params.sort === 'weight_desc') {
          // Pour les autres options non supportées par le backend, utiliser 'newest' par défaut
          sortOption = 'newest';
        }
      }

      // OPTIMISATION : Utiliser la pagination backend au lieu de la pagination côté client
      // Le backend gère maintenant le filtrage, le tri et la pagination
      const response = await apiClient.get<{
        listings: MarketplaceListing[];
        total: number;
        page: number;
        totalPages: number;
        hasMore: boolean;
        limit: number;
        offset: number;
      }>('/marketplace/listings', {
        params: {
          limit,
          offset,
          sort: sortOption,
          // Si excludeUserId est true, exclure les listings de l'utilisateur connecté (pour "Acheter")
          exclude_own_listings: excludeUserId && currentUserId ? 'true' : undefined,
          // Si userId est fourni (sans excludeUserId), filtrer pour cet utilisateur (pour "Mes annonces")
          user_id: !excludeUserId && params.userId ? params.userId : undefined,
          // Filtrer par projet si nécessaire
          projet_id: params.projetId,
        },
      });

      // OPTIMISATION : Mettre en cache les résultats pour la page 1 uniquement
      if (page === 1 && response.listings.length > 0) {
        try {
          const { setCachedListings } = await import('../../services/marketplaceCache');
          // Ne pas attendre le cache (opération asynchrone non bloquante)
          setCachedListings(response.listings, params.filters, sortOption, page).catch((cacheError) => {
            if (__DEV__) {
              console.warn('[marketplaceSlice] Erreur lors du stockage du cache:', cacheError);
            }
          });
        } catch (cacheError) {
          // Ignorer les erreurs de cache
          if (__DEV__) {
            console.warn('[marketplaceSlice] Erreur lors de l\'import du cache:', cacheError);
          }
        }
      }

      // Log pour debug (en dev seulement)
      if (__DEV__) {
        console.log('[marketplaceSlice] Réponse backend:', {
          listings: response.listings.length,
          total: response.total,
          page: response.page,
          totalPages: response.totalPages,
          hasMore: response.hasMore,
          excludeUserId,
          currentUserId,
        });
      }

      // Retourner directement les informations de pagination du backend
      return {
        listings: response.listings,
        total: response.total,
        page: response.page,
        totalPages: response.totalPages,
        hasMore: response.hasMore,
      };
    } catch (error: unknown) {
      // OPTIMISATION : En cas d'erreur réseau, essayer d'utiliser le cache comme fallback
      if (page === 1) {
        try {
          const { getCachedListings } = await import('../../services/marketplaceCache');
          const cachedListings = await getCachedListings(params.filters, params.sort, page);
          
          if (cachedListings && cachedListings.length > 0) {
            if (__DEV__) {
              console.log('[marketplaceSlice] Utilisation du cache en cas d\'erreur:', {
                listings: cachedListings.length,
                error: getErrorMessage(error),
              });
            }
            
            // Retourner les listings du cache avec une structure approximative
            return {
              listings: cachedListings,
              total: cachedListings.length,
              page: 1,
              totalPages: 1,
              hasMore: false,
            };
          }
        } catch (cacheError) {
          // Ignorer les erreurs de cache
        }
      }
      
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la recherche');
    }
  }
);

/**
 * Créer un listing (mise en vente)
 */
export const createListing = createAsyncThunk(
  'marketplace/createListing',
  async (
    data: {
      subjectId: string;
      producerId: string;
      farmId: string;
      pricePerKg: number;
      weight: number;
      lastWeightDate: string;
      location: unknown;
      saleTerms?: unknown;
    },
    { rejectWithValue }
  ) => {
    try {
      const listing = await apiClient.post<MarketplaceListing>('/marketplace/listings', {
        subjectId: data.subjectId,
        producerId: data.producerId,
        farmId: data.farmId,
        pricePerKg: data.pricePerKg,
        weight: data.weight,
        lastWeightDate: data.lastWeightDate,
        location: data.location,
        saleTerms: data.saleTerms,
      });

      return listing;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la mise en vente');
    }
  }
);

/**
 * Créer une offre
 */
export const createOffer = createAsyncThunk(
  'marketplace/createOffer',
  async (
    data: {
      listingId: string;
      subjectIds: string[];
      buyerId: string;
      proposedPrice: number;
      message?: string;
      dateRecuperationSouhaitee?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const offer = await apiClient.post<Offer>('/marketplace/offers', {
        listingId: data.listingId,
        subjectIds: data.subjectIds,
        buyerId: data.buyerId,
        proposedPrice: data.proposedPrice,
        message: data.message,
        dateRecuperationSouhaitee: data.dateRecuperationSouhaitee,
      });

      return offer;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || "Erreur lors de la création de l'offre");
    }
  }
);

/**
 * Accepter une offre (producteur ou acheteur pour contre-proposition)
 */
export const acceptOffer = createAsyncThunk(
  'marketplace/acceptOffer',
  async (
    data: { offerId: string; userId: string; role?: 'producer' | 'buyer' },
    { rejectWithValue }
  ) => {
    try {
      const role = data.role || 'producer';
      const transaction = await apiClient.patch<Transaction>(
        `/marketplace/offers/${data.offerId}/accept?role=${role}`
      );

      return transaction;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || "Erreur lors de l'acceptation");
    }
  }
);

/**
 * Faire une contre-proposition
 */
export const counterOffer = createAsyncThunk(
  'marketplace/counterOffer',
  async (
    data: { offerId: string; producerId: string; nouveauPrixTotal: number; message?: string },
    { rejectWithValue }
  ) => {
    try {
      // ✅ Correction: utiliser PATCH au lieu de PUT (cohérence avec le backend)
      const counterOffer = await apiClient.patch<Offer>(`/marketplace/offers/${data.offerId}/counter`, {
        nouveau_prix_total: data.nouveauPrixTotal,
        message: data.message,
      });

      return counterOffer;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la contre-proposition');
    }
  }
);

/**
 * Rejeter une offre
 * - Producteur peut rejeter une offre 'pending'
 * - Acheteur peut rejeter une contre-proposition 'countered' en passant role='buyer'
 */
export const rejectOffer = createAsyncThunk(
  'marketplace/rejectOffer',
  async (data: { offerId: string; producerId: string; role?: 'producer' | 'buyer' }, { rejectWithValue }) => {
    try {
      const role = data.role || 'producer';
      await apiClient.patch(`/marketplace/offers/${data.offerId}/reject?role=${role}`);

      return data.offerId;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors du rejet');
    }
  }
);

/**
 * Confirmer la livraison
 */
export const confirmDelivery = createAsyncThunk(
  'marketplace/confirmDelivery',
  async (
    data: { transactionId: string; userId: string; role: 'producer' | 'buyer' },
    { rejectWithValue }
  ) => {
    try {
      await apiClient.patch(
        `/marketplace/transactions/${data.transactionId}/confirm-delivery`,
        null,
        {
          params: { role: data.role },
        }
      );

      return { transactionId: data.transactionId, role: data.role };
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error) || 'Erreur lors de la confirmation');
    }
  }
);

// ========================================
// SLICE
// ========================================

const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<MarketplaceFilters>) => {
      state.filters = action.payload;
      state.currentPage = 1; // Reset page
    },

    setSortBy: (state, action: PayloadAction<MarketplaceSortOption>) => {
      state.sortBy = action.payload;
      state.currentPage = 1; // Reset page
    },

    clearFilters: (state) => {
      state.filters = {};
      state.currentPage = 1;
    },

    setCurrentListing: (state, action: PayloadAction<MarketplaceListing | null>) => {
      state.currentListing = action.payload;
    },

    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach((n) => {
        n.read = true;
      });
      state.unreadCount = 0;
    },
  },

  extraReducers: (builder) => {
    // Search Listings
    builder.addCase(searchListings.pending, (state) => {
      state.listingsLoading = true;
      state.listingsError = null;
    });
    builder.addCase(searchListings.fulfilled, (state, action) => {
      state.listingsLoading = false;

      // Si page 1, remplacer. Sinon, ajouter
      if (action.payload.page === 1) {
        state.listings = action.payload.listings;
      } else {
        state.listings = [...state.listings, ...action.payload.listings];
      }

      state.currentPage = action.payload.page;
      state.totalPages = action.payload.totalPages;
      state.hasMore = action.payload.hasMore;
    });
    builder.addCase(searchListings.rejected, (state, action) => {
      state.listingsLoading = false;
      state.listingsError = action.payload as string;
    });

    // Create Listing
    builder.addCase(createListing.pending, (state) => {
      state.listingsLoading = true;
      state.listingsError = null;
    });
    builder.addCase(createListing.fulfilled, (state, action) => {
      state.listingsLoading = false;
      state.listings = [action.payload, ...state.listings];
    });
    builder.addCase(createListing.rejected, (state, action) => {
      state.listingsLoading = false;
      state.listingsError = action.payload as string;
    });

    // Create Offer
    builder.addCase(createOffer.pending, (state) => {
      state.offersLoading = true;
      state.offersError = null;
    });
    builder.addCase(createOffer.fulfilled, (state, action) => {
      state.offersLoading = false;
      state.myOffers = [action.payload, ...state.myOffers];
    });
    builder.addCase(createOffer.rejected, (state, action) => {
      state.offersLoading = false;
      state.offersError = action.payload as string;
    });

    // Accept Offer
    builder.addCase(acceptOffer.fulfilled, (state, action) => {
      state.myTransactions = [action.payload, ...state.myTransactions];
      // Retirer l'offre de la liste
      state.receivedOffers = state.receivedOffers.filter((o) => o.id !== action.meta.arg.offerId);
    });

    // Counter Offer
    builder.addCase(counterOffer.pending, (state) => {
      state.offersLoading = true;
      state.offersError = null;
    });
    builder.addCase(counterOffer.fulfilled, (state, action) => {
      state.offersLoading = false;
      // Ajouter la contre-proposition à la liste des offres reçues (pour le producteur)
      // et à la liste des offres envoyées (pour l'acheteur qui recevra la notification)
      state.receivedOffers = state.receivedOffers.map((o) =>
        o.id === action.meta.arg.offerId ? { ...o, status: 'countered' } : o
      );
      // La contre-proposition apparaîtra comme une nouvelle offre pour l'acheteur
      state.myOffers = [action.payload, ...state.myOffers];
    });
    builder.addCase(counterOffer.rejected, (state, action) => {
      state.offersLoading = false;
      state.offersError = action.payload as string;
    });

    // Reject Offer
    builder.addCase(rejectOffer.fulfilled, (state, action) => {
      state.receivedOffers = state.receivedOffers.filter((o) => o.id !== action.payload);
    });
  },
});

export const {
  setFilters,
  setSortBy,
  clearFilters,
  setCurrentListing,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = marketplaceSlice.actions;

export default marketplaceSlice.reducer;
