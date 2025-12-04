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
import { getDatabase } from '../../services/database';
import { getMarketplaceService } from '../../services/MarketplaceService';

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
      userId?: string; // ID de l'utilisateur pour filtrer ses propres listings
    },
    { rejectWithValue, getState }
  ) => {
    try {
      const db = await getDatabase();
      const service = getMarketplaceService(db);
      
      // Récupérer le userId depuis le state si non fourni
      const state = getState() as any;
      const userId = params.userId || state?.auth?.user?.id;
      
      const result = await service.searchListings(
        params.filters,
        params.sort,
        params.page || 1,
        20,
        userId
      );
      
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la recherche');
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
      location: any;
    },
    { rejectWithValue }
  ) => {
    try {
      const db = await getDatabase();
      const service = getMarketplaceService(db);
      
      const listing = await service.createListing(data);
      
      return listing;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la mise en vente');
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
    },
    { rejectWithValue }
  ) => {
    try {
      const db = await getDatabase();
      const service = getMarketplaceService(db);
      
      const offer = await service.createOffer(data);
      
      return offer;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création de l\'offre');
    }
  }
);

/**
 * Accepter une offre
 */
export const acceptOffer = createAsyncThunk(
  'marketplace/acceptOffer',
  async (
    data: { offerId: string; producerId: string },
    { rejectWithValue }
  ) => {
    try {
      const db = await getDatabase();
      const service = getMarketplaceService(db);
      
      const transaction = await service.acceptOffer(data.offerId, data.producerId);
      
      return transaction;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de l\'acceptation');
    }
  }
);

/**
 * Rejeter une offre
 */
export const rejectOffer = createAsyncThunk(
  'marketplace/rejectOffer',
  async (
    data: { offerId: string; producerId: string },
    { rejectWithValue }
  ) => {
    try {
      const db = await getDatabase();
      const service = getMarketplaceService(db);
      
      await service.rejectOffer(data.offerId, data.producerId);
      
      return data.offerId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du rejet');
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
      const db = await getDatabase();
      const service = getMarketplaceService(db);
      
      await service.confirmDelivery(data.transactionId, data.userId, data.role);
      
      return { transactionId: data.transactionId, role: data.role };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la confirmation');
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
      state.receivedOffers = state.receivedOffers.filter(
        (o) => o.id !== action.meta.arg.offerId
      );
    });
    
    // Reject Offer
    builder.addCase(rejectOffer.fulfilled, (state, action) => {
      state.receivedOffers = state.receivedOffers.filter(
        (o) => o.id !== action.payload
      );
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

