/**
 * Écran principal du Marketplace
 * Permet de rechercher, filtrer et consulter les annonces de vente
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectAllAnimaux } from '../../store/selectors/productionSelectors';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useRole } from '../../contexts/RoleContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { SPACING } from '../../constants/theme';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Redux
import {
  searchListings,
  createListing,
  setFilters,
  setSortBy,
  clearFilters,
} from '../../store/slices/marketplaceSlice';
import { updateProductionAnimal } from '../../store/slices/productionSlice';

// Components
import {
  MarketplaceSearchBar,
  MarketplaceFilters,
  OfferModal,
  BatchAddModal,
  FarmDetailsModal,
  RatingModal,
  MarketplaceBellIcon,
  NotificationPanel,
  MarketplaceActionModal,
} from '../../components/marketplace';
import CreatePurchaseRequestModal from '../../components/marketplace/CreatePurchaseRequestModal';
import CreatePurchaseRequestOfferModal from '../../components/marketplace/CreatePurchaseRequestOfferModal';
import MarketplaceBuyTab from '../../components/marketplace/tabs/MarketplaceBuyTab';
import MarketplaceMyListingsTab from '../../components/marketplace/tabs/MarketplaceMyListingsTab';
import MarketplaceMyPurchaseRequestsTab from '../../components/marketplace/tabs/MarketplaceMyPurchaseRequestsTab';
import MarketplaceMatchedRequestsTab from '../../components/marketplace/tabs/MarketplaceMatchedRequestsTab';
import MarketplaceRequestsTab from '../../components/marketplace/tabs/MarketplaceRequestsTab'; // Nouveau composant unifié
import MarketplaceOffersTab from '../../components/marketplace/tabs/MarketplaceOffersTab';

// Hooks
import { useGeolocation } from '../../hooks/useGeolocation';
import { useMarketplaceNotifications } from '../../hooks/useMarketplaceNotifications';
import { useScreenPreloader } from '../../hooks/useScreenPreloader';
import { useMarketplaceData } from '../../hooks/useMarketplaceData';

// Services
import apiClient from '../../services/api/apiClient';
import marketplaceService from '../../services/MarketplaceService';

// Repositories
import { PurchaseRequestRepository } from '../../database/repositories/PurchaseRequestRepository';

// Navigation
import { SCREENS } from '../../navigation/types';

// Types
import type {
  MarketplaceListing,
  MarketplaceFilters as FiltersType,
  MarketplaceSortOption,
  FarmCard as FarmCardType,
  SelectedSubjectForOffer,
  Offer,
  PurchaseRequest,
  PurchaseRequestMatch,
} from '../../types/marketplace';
import type { ProductionAnimal, UpdateProductionAnimalInput } from '../../types/production';
import { createAppError, getErrorMessage, ErrorCode } from '../../types/errors';

function MarketplaceScreen() {
  const { colors } = useTheme();
  const marketplaceColors = MarketplaceTheme.colors;
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();
  const { isProducer, isBuyer } = useRole();

  // Redux State
  const {
    listings,
    listingsLoading,
    listingsError,
    filters,
    sortBy,
    currentPage,
    hasMore,
    notifications,
    unreadCount,
  } = useAppSelector((state) => state.marketplace);

  const { projetActif } = useAppSelector((state) => state.projet);
  const { user } = useAppSelector((state) => state.auth);
  const allAnimaux = useAppSelector(selectAllAnimaux);
  const { getCurrentLocation } = useGeolocation();
  const {
    notifications: marketplaceNotifications,
    unreadCount: marketplaceUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useMarketplaceNotifications({ enabled: isFocused });

  // Local State
  const [activeTab, setActiveTab] = useState<
    'acheter' | 'mes-annonces' | 'mes-demandes' | 'demandes' | 'offres'
  >('acheter');

  // Redirection automatique selon le rôle
  useEffect(() => {
    // Si l'utilisateur est acheteur (pas producteur) et est sur "mes-annonces" (producteur), rediriger vers "mes-demandes"
    if (isBuyer && !isProducer && activeTab === 'mes-annonces') {
      setActiveTab('mes-demandes');
    }
    // Si l'utilisateur est producteur et est sur "mes-demandes" (acheteur), rediriger vers "mes-annonces"
    if (isProducer && !isBuyer && activeTab === 'mes-demandes') {
      setActiveTab('mes-annonces');
    }
  }, [isBuyer, isProducer, activeTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false); // Modal unifié
  const [batchAddModalVisible, setBatchAddModalVisible] = useState(false);
  const [createPurchaseRequestModalVisible, setCreatePurchaseRequestModalVisible] = useState(false);
  const [editPurchaseRequestModalVisible, setEditPurchaseRequestModalVisible] = useState(false);
  const [selectedPurchaseRequestForEdit, setSelectedPurchaseRequestForEdit] =
    useState<PurchaseRequest | null>(null);
  const [farmDetailsModalVisible, setFarmDetailsModalVisible] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<FarmCardType | null>(null);
  const [selectedListingForModal, setSelectedListingForModal] = useState<MarketplaceListing | null>(null);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [selectedSubjectsForOffer, setSelectedSubjectsForOffer] = useState<{
    subjects: SelectedSubjectForOffer[];
    listingId: string;
    originalPrice: number;
  } | null>(null);
  const [farmCards, setFarmCards] = useState<FarmCardType[]>([]);
  const [groupingListings, setGroupingListings] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingTransactionId, setRatingTransactionId] = useState<string | null>(null);
  const [ratingProducerName, setRatingProducerName] = useState<string>('');
  const [listingDetailsModalVisible, setListingDetailsModalVisible] = useState(false);
  const [selectedListingForDetails, setSelectedListingForDetails] =
    useState<MarketplaceListing | null>(null);
  const [purchaseRequestOfferModalVisible, setPurchaseRequestOfferModalVisible] = useState(false);
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [selectedPurchaseRequestMatch, setSelectedPurchaseRequestMatch] = useState<PurchaseRequestMatch | null>(null);

  // State pour Mes annonces et Offres
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [myPurchaseRequests, setMyPurchaseRequests] = useState<unknown[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  // Refs pour le cache et l'optimisation des appels API
  const CACHE_DURATION = 30000; // 30 secondes
  const offersLastLoad = useRef<number>(0);
  const myListingsLastLoad = useRef<number>(0);

  const loadListings = useCallback(() => {
    const searchFilters: FiltersType = {
      ...filters,
      ...(searchQuery ? { search: searchQuery } : {}),
    };

    dispatch(
      searchListings({
        filters: searchFilters,
        sort: sortBy,
        page: 1,
      })
    );
  }, [dispatch, filters, sortBy, searchQuery]);

  // Charger mes annonces depuis l'API backend avec cache
  const loadMyListings = useCallback(async (forceReload = false) => {
    if (!user?.id || !projetActif) return;

    // Vérifier le cache (skip si données récentes < 30s)
    const now = Date.now();
    if (!forceReload && (now - myListingsLastLoad.current) < CACHE_DURATION) {
      if (__DEV__) {
        console.log('[MarketplaceScreen] Mes annonces: utilisation du cache');
      }
      return;
    }

    try {
      setMyListingsLoading(true);
      
      // Charger les listings depuis l'API backend (filtrer par projet ET par producteur)
      // ✅ LOG SÉCURISÉ - Aucune donnée sensible exposée
      if (__DEV__) {
        console.log('[MarketplaceScreen] Chargement mes annonces:', {
          projetId: projetActif.id,
          hasProjet: !!projetActif,
          projetName: projetActif.nom,
        });
      }
      
      // Le backend retourne maintenant un objet avec pagination
      const response = await apiClient.get<{
        listings: MarketplaceListing[];
        total: number;
        page: number;
        totalPages: number;
        hasMore: boolean;
      }>('/marketplace/listings', {
        params: { 
          projet_id: projetActif.id,
          user_id: user.id, // Filtrer par producteur pour n'afficher que les annonces de l'utilisateur
          limit: 50, // Limite raisonnable - pagination avec FlatList onEndReached
        },
      });
      
      const allListings = response.listings || [];
      
      // Log sécurisé (aucune donnée sensible)
      if (__DEV__) {
      console.log('[MarketplaceScreen] Listings reçus:', {
        count: allListings.length,
        total: response.total,
          listingsCount: allListings.length,
          statuses: allListings.reduce((acc, l) => {
            acc[l.status] = (acc[l.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
      });
      }

      // Filtrer pour ne garder que les listings actifs (available ou reserved)
      const activeListings = allListings.filter(
        (l) => l.status === 'available' || l.status === 'reserved'
      );
      
      console.log('[MarketplaceScreen] Listings après filtrage:', {
        total: allListings.length,
        actifs: activeListings.length,
        statuts: allListings.reduce((acc, l) => {
          acc[l.status] = (acc[l.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      });

      // Enrichir les listings avec les informations des animaux depuis l'API backend
      const enrichedListings = await Promise.all(
        activeListings.map(async (listing) => {
          try {
            // Si c'est un listing de bande, enrichir avec les données de la bande si nécessaire
            if (listing.listingType === 'batch' || listing.batchId) {
              // Pour les listings batch, on peut récupérer le poids moyen depuis la bande
              // si listing.weight n'est pas défini
              if (!listing.weight && listing.batchId && projetActif) {
                try {
                  // Récupérer toutes les bandes du projet et trouver celle correspondante
                  const batches = await apiClient.get<any[]>(`/batch-pigs/projet/${projetActif.id}`);
                  const batch = batches.find((b: any) => b.id === listing.batchId);
                  if (batch) {
                    return {
                      ...listing,
                      weight: listing.weight || batch.average_weight_kg || 0,
                    };
                  }
                } catch (error) {
                  console.error(`Erreur enrichissement batch listing ${listing.id}:`, error);
                }
              }
              return listing;
            }

            // Pour les listings individuels, récupérer l'animal
            if (!listing.subjectId) return listing;
            
            // ✅ Utiliser l'endpoint marketplace public au lieu des endpoints protégés
            try {
              const listingDetails = await marketplaceService.getListingWithSubjects(listing.id);
              const subject = listingDetails.subjects?.[0]; // Premier sujet pour listing individuel

              if (!subject) {
                console.warn('[MarketplaceScreen] Aucun sujet trouvé pour listing:', listing.id);
                return null;
              }

              const poidsActuel = subject.derniere_pesee?.poids_kg || subject.poids_initial || 0;

              return {
                ...listing,
                code: subject.code || (subject.id ? `#${subject.id.slice(0, 8)}` : listing.subjectId || 'N/A'),
                race: subject.race || 'Non spécifiée',
                weight: poidsActuel,
                weightDate: subject.derniere_pesee?.date || listing.lastWeightDate,
                age: 0, // TODO: Calculer l'âge si nécessaire
                totalPrice: listing.calculatedPrice,
              };
          } catch (error) {
            console.error(`Erreur enrichissement listing ${listing.id}:`, error);
            return listing; // Retourner le listing sans enrichissement en cas d'erreur
          }
          } catch (error) {
            console.error(`Erreur globale traitement listing ${listing.id}:`, error);
            return listing; // Retourner le listing sans modification en cas d'erreur
          }
        })
      );

      const validListings = enrichedListings.filter((l): l is MarketplaceListing => l !== null);
      setMyListings(validListings);
      myListingsLastLoad.current = Date.now();
    } catch (error) {
      console.error('Erreur chargement mes annonces:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Impossible de charger vos annonces';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setMyListingsLoading(false);
    }
  }, [user, projetActif]);

  // Charger les demandes d'achat de l'acheteur
  const loadMyPurchaseRequests = useCallback(async () => {
    if (!user?.id || !isBuyer) return;

    try {
      const purchaseRequestRepo = new PurchaseRequestRepository();
      const requests = await purchaseRequestRepo.findByBuyerId(user.id, false);
      setMyPurchaseRequests(requests);
    } catch (error) {
      console.error("Erreur chargement demandes d'achat:", error);
    }
  }, [user, isBuyer]);

  // Charger les offres avec cache
  const loadOffers = useCallback(async (forceReload = false) => {
    if (!user?.id) return;

    // Vérifier le cache (skip si données récentes < 30s)
    const now = Date.now();
    if (!forceReload && (now - offersLastLoad.current) < CACHE_DURATION) {
      if (__DEV__) {
        console.log('[MarketplaceScreen] Offres: utilisation du cache');
      }
      return;
    }

    try {
      setOffersLoading(true);

      // Charger les offres en parallèle
      const [receivedResponse, sentResponse] = await Promise.all([
        marketplaceService.getReceivedOffers(),
        marketplaceService.getMyOffers(),
      ]);

      const received = Array.isArray(receivedResponse) ? receivedResponse : [];
      const sent = Array.isArray(sentResponse) ? sentResponse.filter(
        (offer) => offer.status !== 'withdrawn' && offer.status !== 'expired'
      ) : [];

      if (__DEV__) {
        console.log('[MarketplaceScreen] Offres chargées:', { received: received.length, sent: sent.length });
      }

      setReceivedOffers(received);
      setSentOffers(sent);
      offersLastLoad.current = Date.now();
    } catch (error) {
      console.error('Erreur chargement offres:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Impossible de charger les offres';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setOffersLoading(false);
    }
  }, [user]);

  // Écouter les notifications de transaction complétée pour ouvrir automatiquement RatingModal
  useEffect(() => {
    const checkCompletedTransactions = async () => {
      // Chercher les notifications "delivery_confirmed" non lues
      const deliveryConfirmedNotifications = marketplaceNotifications.filter(
        (n) => n.type === 'delivery_confirmed' && !n.read && n.relatedType === 'transaction'
      );

      if (deliveryConfirmedNotifications.length > 0) {
        // Prendre la première notification
        const notification = deliveryConfirmedNotifications[0];

        try {
          // Récupérer la transaction pour obtenir le nom du producteur
          const repositories = await import('../../database/repositories');
          if (!repositories || !repositories.MarketplaceTransactionRepository) {
            throw new Error('Impossible de charger le repository. Veuillez réessayer.');
          }
          const transactionRepo = new repositories.MarketplaceTransactionRepository();
          const transaction = await transactionRepo.findById(notification.relatedId);

          if (transaction) {
            // Déterminer si l'utilisateur est l'acheteur ou le producteur
            const isBuyer = transaction.buyerId === user?.id;
            const isProducer = transaction.producerId === user?.id;

            // L'acheteur note le producteur, le producteur note l'acheteur
            if (isBuyer || isProducer) {
              // Récupérer le nom de l'autre partie
              const repositories = await import('../../database/repositories');
              if (!repositories || !repositories.UserRepository) {
                throw new Error('Impossible de charger le repository. Veuillez réessayer.');
              }
              const userRepo = new repositories.UserRepository();
              const otherPartyId = isBuyer ? transaction.producerId : transaction.buyerId;
              const otherParty = await userRepo.findById(otherPartyId);

              if (otherParty) {
                const producerName = `${otherParty.prenom} ${otherParty.nom}`;
                setRatingProducerName(producerName);
                setRatingTransactionId(notification.relatedId);
                setRatingModalVisible(true);

                // Marquer la notification comme lue
                markAsRead(notification.id);
              }
            }
          }
        } catch (error) {
          console.error('Erreur ouverture RatingModal:', error);
        }
      }
    };

    if (marketplaceNotifications.length > 0 && user?.id) {
      checkCompletedTransactions();
    }
  }, [marketplaceNotifications, user?.id, markAsRead]);

  // Optimisation: Debounce le groupement des listings pour éviter les recalculs trop fréquents
  const groupingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastListingsRef = useRef<string>('');

  // Grouper les listings par ferme après chargement (avec debouncing)
  useEffect(() => {
    // Créer une clé unique pour les listings (éviter de regrouper si rien n'a changé)
    const listingsKey = JSON.stringify(listings.map(l => l.id).sort());
    
    if (listingsKey === lastListingsRef.current) {
      return; // Pas de changement, ne pas regrouper
    }
    
    lastListingsRef.current = listingsKey;

    // Debounce le groupement pour éviter les recalculs trop fréquents
    if (groupingTimeoutRef.current) {
      clearTimeout(groupingTimeoutRef.current);
    }

    groupingTimeoutRef.current = setTimeout(async () => {
      if (listings.length === 0 || listingsLoading) {
        setFarmCards([]);
        return;
      }

      try {
        setGroupingListings(true);
        const service = marketplaceService;

        // ✅ OPTIMISATION: Récupérer la location avec timeout (ne pas attendre indéfiniment)
        // Si la géolocalisation prend trop de temps, continuer sans elle
        let buyerLocation: { latitude: number; longitude: number } | undefined;
        try {
          const locationPromise = getCurrentLocation();
          const timeoutPromise = new Promise<null>((resolve) => 
            setTimeout(() => resolve(null), 1000) // Timeout de 1 seconde
          );
          
          const location = await Promise.race([locationPromise, timeoutPromise]);
          if (location) {
            buyerLocation = {
              latitude: location.latitude,
              longitude: location.longitude,
            };
          }
        } catch (error) {
          // Ignorer l'erreur de géolocalisation, continuer sans
        }

        // Grouper par ferme (filtrer les listings de l'utilisateur)
        const grouped = await service.groupListingsByFarm(listings, buyerLocation, user?.id);
        setFarmCards(grouped);
      } catch (error) {
        console.error('Erreur groupement par ferme:', error);
        setFarmCards([]);
      } finally {
        setGroupingListings(false);
      }
    }, 300); // Debounce de 300ms

    return () => {
      if (groupingTimeoutRef.current) {
        clearTimeout(groupingTimeoutRef.current);
      }
    };
  }, [listings, listingsLoading, user?.id, getCurrentLocation]);

  // Référence pour éviter les appels multiples simultanés lors du chargement infini
  const isLoadingMoreRef = useRef(false);

  // Réinitialiser le flag quand le chargement se termine
  useEffect(() => {
    if (!listingsLoading && isLoadingMoreRef.current) {
      // Réinitialiser le flag après un court délai pour éviter les appels trop rapides
      const timeoutId = setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [listingsLoading]);

  const handleLoadMore = useCallback(() => {
    // Protection : ne pas charger si déjà en chargement, pas de pages supplémentaires, ou déjà en train de charger plus
    if (listingsLoading || !hasMore || isLoadingMoreRef.current) {
      return;
    }

    isLoadingMoreRef.current = true;
    
    const searchFilters: FiltersType = {
      ...filters,
      ...(searchQuery ? { search: searchQuery } : {}),
    };

    dispatch(
      searchListings({
        filters: searchFilters,
        sort: sortBy,
        page: currentPage + 1,
      })
    );
  }, [dispatch, filters, sortBy, searchQuery, currentPage, hasMore, listingsLoading]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // La recherche sera déclenchée par loadListings
  }, []);

  const handleFilterPress = useCallback(() => {
    setFiltersVisible(true);
  }, []);

  const handleSortChange = useCallback(
    (sort: MarketplaceSortOption) => {
      dispatch(setSortBy(sort));
    },
    [dispatch]
  );

  const handleApplyFilters = useCallback(
    (newFilters: FiltersType) => {
      dispatch(setFilters(newFilters));
      setFiltersVisible(false);
    },
    [dispatch]
  );

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
    setSearchQuery('');
  }, [dispatch]);

  const handleCreateListing = useCallback(() => {
    if (!projetActif) {
      Alert.alert('Erreur', 'Aucun projet actif. Veuillez sélectionner un projet.');
      return;
    }
    setBatchAddModalVisible(true);
  }, [projetActif]);

  const handleCreatePurchaseRequest = useCallback(() => {
    if (!user?.id) {
      Alert.alert('Erreur', "Vous devez être connecté pour créer une demande d'achat.");
      return;
    }
    setCreatePurchaseRequestModalVisible(true);
  }, [user]);

  const handleFarmPress = useCallback((farm: FarmCardType) => {
    setSelectedFarm(farm);
    setFarmDetailsModalVisible(true);
  }, []);

  const handleMakeOfferFromFarm = useCallback(
    async (selections: Array<{ listingId: string; subjectId: string }>) => {
      // ✅ Accepter aussi les sélections sans selectedFarm (quand on vient d'un listing individuel)
      if (selections.length === 0) return;

      try {
        // ✅ Utiliser le service marketplace qui gère les endpoints publics
        const marketplaceService = new (await import('../../services/MarketplaceService')).MarketplaceService();

        // ✅ Utiliser directement les IDs réels passés depuis FarmDetailsModal
        const realListingIds = Array.from(new Set(selections.map(s => s.listingId)));
        const selectedPigIds = new Map<string, string[]>(); // Map: listingId -> pigIds sélectionnés
        
        // ✅ Log de diagnostic : voir les sélections reçues
        console.log('[MarketplaceScreen] handleMakeOfferFromFarm - Sélections reçues:', {
          selectionsCount: selections.length,
          selections: selections.map(s => ({
            listingId: s.listingId,
            subjectId: s.subjectId,
            listingIdType: typeof s.listingId,
            subjectIdType: typeof s.subjectId,
          })),
        });
        
        for (const selection of selections) {
          const { listingId, subjectId } = selection;
          
          if (!selectedPigIds.has(listingId)) {
            selectedPigIds.set(listingId, []);
          }
          selectedPigIds.get(listingId)!.push(subjectId);
        }

        // ✅ Log de diagnostic : voir les IDs qui seront envoyés au backend
        console.log('[MarketplaceScreen] handleMakeOfferFromFarm - IDs à envoyer au backend:', {
          realListingIdsCount: realListingIds.length,
          realListingIds: realListingIds,
          selectedPigIdsMap: Array.from(selectedPigIds.entries()).map(([listingId, pigIds]) => ({
            listingId,
            pigIdsCount: pigIds.length,
            pigIds: pigIds.slice(0, 5), // Limiter à 5 pour le log
          })),
        });

        // ✅ Récupérer les listings avec leurs sujets via l'endpoint marketplace public
        const listingsData = await marketplaceService.getMultipleListingsWithSubjects(realListingIds);

        // ✅ Log de diagnostic : voir ce qui a été retourné
        console.log('[MarketplaceScreen] handleMakeOfferFromFarm - Réponse du backend:', {
          listingsDataCount: listingsData?.length || 0,
          listingsData: listingsData?.map((ld: any) => ({
            listingId: ld.listing?.id,
            listingType: ld.listing?.listingType,
            subjectsCount: ld.subjects?.length || 0,
            hasListing: !!ld.listing,
            hasSubjects: !!ld.subjects,
          })) || [],
        });

        if (!listingsData || listingsData.length === 0) {
          // ✅ Message d'erreur plus informatif avec détails de diagnostic
          console.error('[MarketplaceScreen] Aucun listing valide trouvé pour les IDs:', {
            realListingIds,
            realListingIdsCount: realListingIds.length,
            selectionsCount: selections.length,
            selections: selections,
          });
          
          Alert.alert(
            'Information', 
            'Aucune information détaillée disponible pour les sujets sélectionnés. Vous pouvez quand même faire une offre en utilisant les informations du listing.'
          );
          return;
        }

        // ✅ Convertir les listings en SubjectCard avec les données déjà récupérées
        // Les données incluent déjà toutes les informations nécessaires (poids, pesées, etc.)
        const allSubjects: (SelectedSubjectForOffer & {
          age?: number;
          healthStatus?: 'good' | 'attention' | 'critical';
          vaccinations?: boolean;
        })[] = [];

        // Pour chaque listing récupéré
        for (const listingData of listingsData) {
          const { listing, subjects } = listingData;
          const pricePerKg = listing.pricePerKg || 0;

          // Pour les listings batch, filtrer selon les sujets sélectionnés
          if (listing.listingType === 'batch' && listing.pigIds) {
            const selectedPigsForListing = selectedPigIds.get(listing.id) || [];
            const pigIdsToInclude = selectedPigsForListing.length > 0 
              ? listing.pigIds.filter(id => selectedPigsForListing.includes(id))
              : listing.pigIds;

            // Filtrer les sujets selon la sélection
            const filteredSubjects = subjects.filter(s => pigIdsToInclude.includes(s.id));

            // Convertir chaque sujet en SelectedSubjectForOffer
            for (const subject of filteredSubjects) {
              const poidsActuel = subject.derniere_pesee?.poids_kg || subject.poids_initial || listing.weight || 0;
              const ageEnMois = subject.date_naissance
                ? Math.floor(
                    (new Date().getTime() - new Date(subject.date_naissance).getTime()) /
                      (1000 * 60 * 60 * 24 * 30)
                  )
                : 0;

              allSubjects.push({
                listingId: listing.id,
                subjectId: subject.id,
                code: subject.code || `#${subject.id.slice(0, 8)}`,
                race: subject.race || listing.race || 'Non spécifiée',
                weight: poidsActuel,
                weightDate: subject.derniere_pesee?.date || listing.lastWeightDate || new Date().toISOString(),
                age: ageEnMois,
                pricePerKg: pricePerKg,
                calculatedPrice: poidsActuel * pricePerKg,
                healthStatus: subject.statut === 'mort' ? 'critical' : 'good',
                vaccinations: false, // Les vaccinations ne sont pas dans les données publiques
              });
            }
          } else if (listing.listingType === 'individual') {
            // Pour les listings individuels (peuvent avoir ou non subjectId selon le type)
            // Si pas de subjectId mais que le listing existe, utiliser les données du listing
            if (!listing.subjectId) {
              if (__DEV__) {
                console.warn('[MarketplaceScreen] Listing individuel sans subjectId:', listing.id);
              }
              // Créer un sujet virtuel à partir des données du listing
              const poidsActuel = listing.weight || 0;
              allSubjects.push({
                listingId: listing.id,
                subjectId: listing.id, // Utiliser listing.id comme fallback
                code: listing.code || `#${listing.id.slice(0, 8)}`,
                race: listing.race || 'Non spécifiée',
                weight: poidsActuel,
                weightDate: listing.lastWeightDate || new Date().toISOString(),
                age: 0,
                pricePerKg: pricePerKg,
                calculatedPrice: listing.calculatedPrice || (poidsActuel * pricePerKg),
                healthStatus: 'good',
                vaccinations: false,
              });
              continue;
            }

            const subject = subjects.find(s => s.id === listing.subjectId);
            if (!subject) {
              if (__DEV__) {
                console.warn('[MarketplaceScreen] Subject non trouvé pour listing:', listing.id);
              }
              // Fallback : utiliser les données du listing
              const poidsActuel = listing.weight || 0;
              allSubjects.push({
                listingId: listing.id,
                subjectId: listing.subjectId,
                code: listing.code || `#${listing.subjectId.slice(0, 8)}`,
                race: listing.race || 'Non spécifiée',
                weight: poidsActuel,
                weightDate: listing.lastWeightDate || new Date().toISOString(),
                age: 0,
                pricePerKg: pricePerKg,
                calculatedPrice: listing.calculatedPrice || (poidsActuel * pricePerKg),
                healthStatus: 'good',
                vaccinations: false,
              });
              continue;
            }

            const poidsActuel = subject.derniere_pesee?.poids_kg || subject.poids_initial || listing.weight || 0;
            const ageEnMois = subject.date_naissance
              ? Math.floor(
                  (new Date().getTime() - new Date(subject.date_naissance).getTime()) /
                    (1000 * 60 * 60 * 24 * 30)
                )
              : 0;

            allSubjects.push({
              listingId: listing.id,
              subjectId: subject.id,
              code: subject.code || `#${subject.id.slice(0, 8)}`,
              race: subject.race || listing.race || 'Non spécifiée',
              weight: poidsActuel,
              weightDate: subject.derniere_pesee?.date || listing.lastWeightDate || new Date().toISOString(),
              age: ageEnMois,
              pricePerKg: pricePerKg,
              calculatedPrice: listing.calculatedPrice || (poidsActuel * pricePerKg),
              healthStatus: subject.statut === 'mort' ? 'critical' : 'good',
              vaccinations: false, // Les vaccinations ne sont pas dans les données publiques
            });
          }
        }

        if (allSubjects.length === 0) {
          if (__DEV__) {
            // ✅ Utiliser les IDs réels depuis selections
            const allSelectedSubjectIds = Array.from(selectedPigIds.values()).flat();
            console.warn('[MarketplaceScreen] Aucun sujet trouvé pour les listings sélectionnés', {
              listingsDataCount: listingsData.length,
              selectedSubjectIds: allSelectedSubjectIds,
              selectionsCount: selections.length,
            });
          }
          Alert.alert(
            'Information',
            'Aucune information détaillée disponible pour les sujets sélectionnés. Vous pouvez quand même faire une offre en utilisant les informations du listing.'
          );
          return;
        }

        // Calculer le prix total
        const originalPrice = allSubjects.reduce((sum, s) => sum + (s.calculatedPrice || 0), 0);

        // Utiliser le premier listingId comme référence
        const firstListingId = listingsData[0].listing.id;

        // Fermer le modal de détails et ouvrir le modal d'offre
        setFarmDetailsModalVisible(false);
        setSelectedSubjectsForOffer({
          subjects: allSubjects,
          listingId: firstListingId,
          originalPrice,
        });
        setOfferModalVisible(true);
      } catch (error) {
        // ✅ Amélioration du logging d'erreur
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[MarketplaceScreen] Erreur préparation offre:', errorMessage);
        
        // ✅ Message plus explicite pour l'utilisateur
        Alert.alert(
          'Erreur', 
          errorMessage || "Impossible de charger les informations des sujets. Veuillez réessayer."
        );
      }
    },
    [selectedFarm]
  );

  const handleListingPress = useCallback((listing: MarketplaceListing) => {
    // ✅ Passer directement le listing à FarmDetailsModal (comme en mode suivi individuel)
    // Plus besoin de créer un FarmCard intermédiaire
    setSelectedListingForModal(listing);
    setFarmDetailsModalVisible(true);
  }, []);

  const handleOfferSubmit = useCallback(
    async (
      data: {
        subjectIds: string[];
        proposedPrice: number;
        message?: string;
        dateRecuperationSouhaitee?: string;
      },
      listingId: string
    ) => {
      if (!user?.id) {
        Alert.alert('Erreur', 'Vous devez être connecté pour faire une offre');
        return;
      }

      try {
        const service = marketplaceService;
        
        // Importer le repository avec vérification
        const repositories = await import('../../database/repositories');
        if (!repositories || !repositories.MarketplaceListingRepository) {
          throw new Error('Impossible de charger le repository. Veuillez réessayer.');
        }
        const listingRepo = new repositories.MarketplaceListingRepository();

        // Utiliser le listingId passé pour trouver le listing principal
        const mainListing = await listingRepo.findById(listingId);

        if (!mainListing) {
          throw new Error('Annonce introuvable');
        }

        if (mainListing.status !== 'available' && mainListing.status !== 'reserved') {
          throw new Error("Cette annonce n'est plus disponible");
        }

        // Pour les listings batch, utiliser les subjectIds sélectionnés par l'acheteur
        // Si aucun n'est sélectionné, utiliser tous les pigIds (offre pour toute la bande)
        let finalSubjectIds = data.subjectIds;
        if (mainListing.batchId) {
          if (!mainListing.pigIds || mainListing.pigIds.length === 0) {
            throw new Error('Les informations de cette annonce batch ne sont pas disponibles. Veuillez réessayer.');
          }
          // Si l'acheteur a sélectionné des animaux spécifiques, utiliser ceux-là
          // Sinon, utiliser tous les pigIds (offre pour toute la bande)
          if (finalSubjectIds.length === 0) {
            finalSubjectIds = mainListing.pigIds;
          } else {
            // Vérifier que les subjectIds sélectionnés sont bien dans les pigIds
            const validSubjectIds = finalSubjectIds.filter(id => mainListing.pigIds?.includes(id));
            if (validSubjectIds.length === 0) {
              throw new Error('Les animaux sélectionnés ne sont pas disponibles dans cette annonce.');
            }
            finalSubjectIds = validSubjectIds;
          }
        }

        // Utiliser les subjectIds (ou pigIds pour batch) passés
        await service.createOffer({
          listingId: mainListing.id,
          subjectIds: finalSubjectIds, // Pour batch, ce sont les pigIds; pour individuel, ce sont les subjectIds
          buyerId: user.id,
          proposedPrice: data.proposedPrice,
          message: data.message,
          dateRecuperationSouhaitee: data.dateRecuperationSouhaitee,
        });

        setOfferModalVisible(false);
        setSelectedListing(null);
        setSelectedSubjectsForOffer(null);
        loadListings(); // Recharger pour voir les mises à jour
      } catch (error: unknown) {
        console.error('Erreur création offre:', error);
        throw createAppError(error, ErrorCode.MARKETPLACE_UNAUTHORIZED); // L'erreur sera gérée par OfferModal
      }
    },
    [user, loadListings]
  );

  // Mémoïser le calcul du nombre de filtres actifs
  const filterCount = useMemo(
    () =>
      Object.keys(filters).filter(
        (key) =>
          filters[key as keyof FiltersType] !== undefined && filters[key as keyof FiltersType] !== ''
      ).length,
    [filters]
  );

  // Handler pour le changement de favori
  const handleFavoriteChange = useCallback(
    (farmId: string, isFavorite: boolean) => {
      // Recharger les listings pour mettre à jour l'ordre (favoris en premier)
      loadListings();
    },
    [loadListings]
  );

  // Référence pour le dernier chargement par onglet (éviter les appels excessifs)
  const lastTabLoadRef = useRef<Record<string, number>>({});
  const MIN_RELOAD_INTERVAL = 60000; // 1 minute minimum entre rechargements automatiques

  // Recharger les listings automatiquement quand l'écran revient au premier plan
  // AVEC condition de temps pour éviter les appels excessifs
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const lastLoad = lastTabLoadRef.current[activeTab] || 0;
      
      // Ne recharger que si > 60 secondes depuis le dernier chargement de cet onglet
      if (now - lastLoad < MIN_RELOAD_INTERVAL) {
        if (__DEV__) {
          console.log(`[MarketplaceScreen] Skip reload ${activeTab} - données récentes (${Math.round((now - lastLoad) / 1000)}s)`);
        }
        return;
      }

      lastTabLoadRef.current[activeTab] = now;
      
      if (__DEV__) {
        console.log(`[MarketplaceScreen] Chargement ${activeTab}`);
      }

      // Recharger les listings de l'onglet actif quand l'écran est focus
      if (activeTab === 'acheter') {
        loadListings();
      } else if (activeTab === 'mes-annonces') {
        loadMyListings();
      } else if (activeTab === 'mes-demandes') {
        loadMyPurchaseRequests();
      } else if (activeTab === 'offres') {
        loadOffers();
      }
    }, [activeTab, loadListings, loadMyListings, loadMyPurchaseRequests, loadOffers])
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: marketplaceColors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: marketplaceColors.surface }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: marketplaceColors.text }]}>
            🏪 Marketplace
          </Text>
          <View style={styles.headerActions}>
            <MarketplaceBellIcon
              unreadCount={marketplaceUnreadCount}
              onPress={() => {
                setNotificationPanelVisible(true);
              }}
            />
            {(isProducer || isBuyer) && (
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: marketplaceColors.primary }]}
                onPress={() => setActionModalVisible(true)}
              >
                <Ionicons name="add" size={24} color={marketplaceColors.textInverse} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Bar - Afficher seulement pour l'onglet Acheter */}
        {activeTab === 'acheter' && (
          <MarketplaceSearchBar
            onSearch={handleSearch}
            onFilterPress={handleFilterPress}
            onSortChange={handleSortChange}
            currentSort={sortBy}
            filterCount={filterCount}
          />
        )}
      </View>

      {/* Onglets */}
      <View style={[styles.tabsContainer, { backgroundColor: marketplaceColors.surface }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'acheter' && [
              styles.activeTab,
              { borderBottomColor: marketplaceColors.primary },
            ],
          ]}
          onPress={() => setActiveTab('acheter')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'acheter'
                    ? marketplaceColors.primary
                    : marketplaceColors.textSecondary,
              },
            ]}
          >
            Acheter
          </Text>
        </TouchableOpacity>
        {/* Onglet "Mes annonces" pour les producteurs */}
        {isProducer && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'mes-annonces' && [
                styles.activeTab,
                { borderBottomColor: marketplaceColors.primary },
              ],
            ]}
            onPress={() => setActiveTab('mes-annonces')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'mes-annonces'
                      ? marketplaceColors.primary
                      : marketplaceColors.textSecondary,
                },
              ]}
            >
              Mes annonces
            </Text>
            {myListings.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: marketplaceColors.primary }]}>
                <Text style={[styles.tabBadgeText, { color: marketplaceColors.textInverse }]}>
                  {myListings.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {/* Onglet "Mes demandes" pour les acheteurs */}
        {isBuyer && user?.id && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'mes-demandes' && [
                styles.activeTab,
                { borderBottomColor: marketplaceColors.primary },
              ],
            ]}
            onPress={() => setActiveTab('mes-demandes')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'mes-demandes'
                      ? marketplaceColors.primary
                      : marketplaceColors.textSecondary,
                },
              ]}
            >
              Mes demandes
            </Text>
            {myPurchaseRequests.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: marketplaceColors.primary }]}>
                <Text style={[styles.tabBadgeText, { color: marketplaceColors.textInverse }]}>
                  {myPurchaseRequests.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {/* Onglet "Demandes" pour les producteurs */}
        {isProducer && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'demandes' && [
                styles.activeTab,
                { borderBottomColor: marketplaceColors.primary },
              ],
            ]}
            onPress={() => setActiveTab('demandes')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'demandes'
                      ? marketplaceColors.primary
                      : marketplaceColors.textSecondary,
                },
              ]}
            >
              Demandes
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'offres' && [
              styles.activeTab,
              { borderBottomColor: marketplaceColors.primary },
            ],
          ]}
          onPress={() => setActiveTab('offres')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'offres'
                    ? marketplaceColors.primary
                    : marketplaceColors.textSecondary,
              },
            ]}
          >
            Offres
          </Text>
          {(receivedOffers.filter((o) => o.status === 'pending').length > 0 ||
            sentOffers.filter((o) => o.status === 'pending').length > 0) && (
            <View style={[styles.tabBadge, { backgroundColor: marketplaceColors.error }]}>
              <Text style={[styles.tabBadgeText, { color: marketplaceColors.textInverse }]}>
                {receivedOffers.filter((o) => o.status === 'pending').length +
                  sentOffers.filter((o) => o.status === 'pending').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'acheter' && (
        <MarketplaceBuyTab
          farmCards={farmCards}
          listings={listings}
          listingsLoading={listingsLoading}
          listingsError={listingsError}
          groupingListings={groupingListings}
          currentPage={currentPage}
          hasMore={hasMore}
          onRefresh={loadListings}
          onLoadMore={handleLoadMore}
          onFarmPress={handleFarmPress}
          onListingPress={handleListingPress}
          onFavoriteChange={handleFavoriteChange}
        />
      )}

      {/* Onglet Mes annonces */}
      {activeTab === 'mes-annonces' && isProducer && (
        <MarketplaceMyListingsTab
          listings={myListings}
          loading={myListingsLoading}
          onRefresh={() => loadMyListings(true)}
          onViewDetails={(listing) => {
            setSelectedListingForDetails(listing);
            setListingDetailsModalVisible(true);
          }}
        />
      )}

      {/* Onglet "Mes demandes" pour les acheteurs - Utilise le composant unifié */}
      {activeTab === 'mes-demandes' && isBuyer && user?.id && (
        <MarketplaceRequestsTab
          userId={user.id}
          onRequestPress={(request) => {
            // TODO: Ouvrir un modal pour voir les détails et les offres
            Alert.alert('Détails', `Demande: ${request.title}\nOffres: ${request.offersCount}`);
          }}
          onEditRequest={(request) => {
            console.log('🔄 [MarketplaceScreen] onEditRequest appelé pour:', request.id);
            setSelectedPurchaseRequestForEdit(request);
            setEditPurchaseRequestModalVisible(true);
            console.log("✅ [MarketplaceScreen] Modal d'édition ouvert");
          }}
          onDeleteRequest={(request) => {
            // Recharger les demandes après suppression
            // Le composant gère déjà le rechargement
          }}
          onRespondToRequest={(request) => {
            // TODO: Ouvrir modal pour répondre à la demande
            Alert.alert('Répondre', `Répondre à la demande: ${request.title}`);
          }}
        />
      )}

      {/* Onglet Demandes (pour les producteurs) - Utilise le composant unifié */}
      {activeTab === 'demandes' && isProducer && user?.id && (
        <MarketplaceRequestsTab
          userId={user.id}
          onRequestPress={(request) => {
            // TODO: Ouvrir un modal de détails
            Alert.alert('Détails', `Demande: ${request.title}`);
          }}
          onEditRequest={(request) => {
            // Les producteurs peuvent aussi modifier leurs demandes
            setSelectedPurchaseRequestForEdit(request);
            setEditPurchaseRequestModalVisible(true);
          }}
          onDeleteRequest={(request) => {
            // Recharger les demandes après suppression
          }}
          onRespondToRequest={(request) => {
            // Ouvrir modal pour créer une offre en réponse à la demande
            setSelectedPurchaseRequest(request);
            setPurchaseRequestOfferModalVisible(true);
          }}
        />
      )}

      {/* Onglet Offres */}
      {activeTab === 'offres' && (
        <MarketplaceOffersTab
          receivedOffers={receivedOffers}
          sentOffers={sentOffers}
          loading={offersLoading}
          onRefresh={() => loadOffers(true)}
        />
      )}

      {/* Modals */}
      <MarketplaceFilters
        visible={filtersVisible}
        initialFilters={filters}
        onClose={() => setFiltersVisible(false)}
        onApply={handleApplyFilters}
      />

      {selectedListing && selectedListing.subjectId && (
        <OfferModal
          visible={offerModalVisible}
          subjects={[
            {
              id: selectedListing.subjectId, // Utiliser subjectId comme id pour la sélection
              code: selectedListing.code || (selectedListing.subjectId ? selectedListing.subjectId : 'N/A'),
              race: selectedListing.race || 'Non spécifiée',
              weight: selectedListing.weight || 0,
              weightDate: selectedListing.lastWeightDate,
              age: selectedListing.age || 0,
              pricePerKg: selectedListing.pricePerKg,
              totalPrice: selectedListing.calculatedPrice,
              healthStatus: selectedListing.healthStatus || 'good',
              vaccinations: selectedListing.vaccinations !== undefined ? selectedListing.vaccinations : false,
              available: true,
            },
          ]}
          listingId={selectedListing.id}
          originalPrice={selectedListing.calculatedPrice}
          onClose={() => {
            setOfferModalVisible(false);
            setSelectedListing(null);
          }}
          onSubmit={handleOfferSubmit}
        />
      )}

      {selectedSubjectsForOffer && (
        <OfferModal
          visible={offerModalVisible && !selectedListing}
          subjects={selectedSubjectsForOffer.subjects.map((s) => ({
            id: s.subjectId, // Utiliser subjectId comme id pour la sélection
            code: s.code || s.subjectId,
            race: s.race || 'Non spécifiée',
            weight: s.weight || 0,
            weightDate: s.weightDate || new Date().toISOString(),
            age: (s as SelectedSubjectForOffer & { age?: number }).age || 0,
            pricePerKg: s.pricePerKg,
            totalPrice: s.calculatedPrice,
            healthStatus: (s as SelectedSubjectForOffer & { healthStatus?: 'good' | 'attention' | 'critical' }).healthStatus || 'good',
            vaccinations: (s as SelectedSubjectForOffer & { vaccinations?: boolean }).vaccinations ?? false,
            available: true,
          }))}
          listingId={selectedSubjectsForOffer.listingId}
          originalPrice={selectedSubjectsForOffer.originalPrice}
          onClose={() => {
            setOfferModalVisible(false);
            setSelectedSubjectsForOffer(null);
          }}
          onSubmit={handleOfferSubmit}
        />
      )}

      {/* Modal unifié pour choisir l'action */}
      {(isProducer || isBuyer) && (
        <MarketplaceActionModal
          visible={actionModalVisible}
          onClose={() => setActionModalVisible(false)}
          onSellPress={handleCreateListing}
          onRequestPress={handleCreatePurchaseRequest}
          isProducer={isProducer}
        />
      )}

      {/* Modal de mise en vente (pour les producteurs) */}
      {isProducer && projetActif && (
        <BatchAddModal
          visible={batchAddModalVisible}
          projetId={projetActif.id}
          onClose={() => setBatchAddModalVisible(false)}
          onSuccess={() => {
            setBatchAddModalVisible(false);
            // Recharger les listings de l'onglet actif
            if (activeTab === 'mes-annonces') {
              loadMyListings();
            } else {
              loadListings();
            }
          }}
        />
      )}

      {/* Modal de création de demande d'achat (pour les acheteurs et producteurs) */}
      {user?.id && (
        <>
          <CreatePurchaseRequestModal
            visible={createPurchaseRequestModalVisible}
            buyerId={user.id}
            onClose={() => setCreatePurchaseRequestModalVisible(false)}
            onSuccess={() => {
              setCreatePurchaseRequestModalVisible(false);
              // Recharger les demandes si on est sur l'onglet "Mes demandes"
              if (activeTab === 'mes-demandes') {
                loadMyPurchaseRequests();
              }
            }}
          />
          {/* Modal de modification de demande d'achat */}
          <CreatePurchaseRequestModal
            visible={editPurchaseRequestModalVisible}
            buyerId={user.id}
            editRequest={selectedPurchaseRequestForEdit || undefined}
            onClose={() => {
              setEditPurchaseRequestModalVisible(false);
              setSelectedPurchaseRequestForEdit(null);
            }}
            onSuccess={() => {
              setEditPurchaseRequestModalVisible(false);
              setSelectedPurchaseRequestForEdit(null);
              // Recharger les demandes si on est sur l'onglet "Mes demandes"
              if (activeTab === 'mes-demandes') {
                loadMyPurchaseRequests();
              }
            }}
          />
        </>
      )}

      {/* Modal pour faire une offre sur une demande d'achat (pour les producteurs) */}
      {isProducer && user?.id && selectedPurchaseRequest && selectedPurchaseRequestMatch && (
        <CreatePurchaseRequestOfferModal
          visible={purchaseRequestOfferModalVisible}
          purchaseRequest={selectedPurchaseRequest}
          match={selectedPurchaseRequestMatch}
          producerId={user.id}
          onClose={() => {
            setPurchaseRequestOfferModalVisible(false);
            setSelectedPurchaseRequest(null);
            setSelectedPurchaseRequestMatch(null);
          }}
          onSuccess={() => {
            setPurchaseRequestOfferModalVisible(false);
            setSelectedPurchaseRequest(null);
            setSelectedPurchaseRequestMatch(null);
            // Recharger les demandes matchées si on est sur l'onglet "Demandes"
            if (activeTab === 'demandes') {
              // Le composant MarketplaceMatchedRequestsTab se rechargera automatiquement
            }
          }}
        />
      )}

      <FarmDetailsModal
        visible={farmDetailsModalVisible}
        farm={selectedFarm}
        initialListing={selectedListingForModal}
        onClose={() => {
          setFarmDetailsModalVisible(false);
          setSelectedFarm(null);
          setSelectedListingForModal(null);
        }}
        onMakeOffer={handleMakeOfferFromFarm}
      />

      {/* RatingModal - Ouverture automatique après finalisation */}
      {ratingTransactionId && (
        <RatingModal
          visible={ratingModalVisible}
          producerName={ratingProducerName}
          transactionId={ratingTransactionId}
          onClose={() => {
            setRatingModalVisible(false);
            setRatingTransactionId(null);
            setRatingProducerName('');
          }}
          onSubmit={async (rating) => {
            try {
              const repositories = await import('../../database/repositories');
              if (!repositories || !repositories.MarketplaceTransactionRepository || !repositories.MarketplaceRatingRepository) {
                throw new Error('Impossible de charger les repositories. Veuillez réessayer.');
              }
              const transactionRepo = new repositories.MarketplaceTransactionRepository();
              const ratingRepo = new repositories.MarketplaceRatingRepository();

              // Récupérer la transaction pour obtenir les IDs
              const transaction = await transactionRepo.findById(ratingTransactionId);
              if (!transaction) {
                throw new Error('Transaction introuvable');
              }

              // Déterminer qui note qui
              const isBuyer = transaction.buyerId === user?.id;
              const producerId = isBuyer ? transaction.producerId : transaction.buyerId;
              const buyerId = isBuyer ? user.id : transaction.buyerId;

              // Calculer la moyenne
              const overall =
                (rating.quality +
                  rating.professionalism +
                  rating.timeliness +
                  rating.communication) /
                4;

              // Créer la notation
              await ratingRepo.create({
                producerId,
                buyerId,
                transactionId: ratingTransactionId,
                ratings: {
                  quality: rating.quality,
                  professionalism: rating.professionalism,
                  timeliness: rating.timeliness,
                  communication: rating.communication,
                },
                overall,
                comment: rating.comment,
                photos: rating.photos,
                verifiedPurchase: true,
                helpfulCount: 0,
              });

              // Fermer le modal
              setRatingModalVisible(false);
              setRatingTransactionId(null);
              setRatingProducerName('');
            } catch (error) {
              console.error('Erreur création notation:', error);
              throw error; // L'erreur sera gérée par RatingModal
            }
          }}
        />
      )}

      {/* Modal de détails d'annonce (lecture seule pour Mes annonces) */}
      {selectedListingForDetails && (
        <Modal
          visible={listingDetailsModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setListingDetailsModalVisible(false);
            setSelectedListingForDetails(null);
          }}
        >
          <SafeAreaView
            style={[styles.modalContainer, { backgroundColor: marketplaceColors.background }]}
            edges={['top']}
          >
            <View style={[styles.modalHeader, { backgroundColor: marketplaceColors.surface }]}>
              <Text style={[styles.modalHeaderTitle, { color: marketplaceColors.text }]}>
                Détails de l'annonce
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setListingDetailsModalVisible(false);
                  setSelectedListingForDetails(null);
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={28} color={marketplaceColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.detailsCard}>
                <Text style={[styles.detailsLabel, { color: marketplaceColors.textSecondary }]}>
                  Code du sujet
                </Text>
                <Text style={[styles.detailsValue, { color: marketplaceColors.text }]}>
                  {selectedListingForDetails.code ||
                    (selectedListingForDetails.subjectId
                      ? `#${selectedListingForDetails.subjectId.slice(0, 8)}`
                      : 'N/A')}
                  {(() => {
                    const animal = allAnimaux?.find(
                      (a: ProductionAnimal) => a.id === selectedListingForDetails.subjectId
                    );
                    return animal?.nom ? ` (${animal.nom})` : '';
                  })()}
                </Text>
              </View>

              <View style={styles.detailsCard}>
                <Text style={[styles.detailsLabel, { color: marketplaceColors.textSecondary }]}>
                  Race
                </Text>
                <Text style={[styles.detailsValue, { color: marketplaceColors.text }]}>
                  {selectedListingForDetails.race || 'Non spécifiée'}
                </Text>
              </View>

              <View style={styles.detailsCard}>
                <Text style={[styles.detailsLabel, { color: marketplaceColors.textSecondary }]}>
                  Poids
                </Text>
                <Text style={[styles.detailsValue, { color: marketplaceColors.text }]}>
                  {selectedListingForDetails.weight || 0} kg
                </Text>
                {selectedListingForDetails.weightDate && (
                  <Text style={[styles.detailsSubtext, { color: marketplaceColors.textSecondary }]}>
                    Pesé le{' '}
                    {format(new Date(selectedListingForDetails.weightDate), 'd MMM yyyy', {
                      locale: fr,
                    })}
                  </Text>
                )}
              </View>

              <View style={styles.detailsCard}>
                <Text style={[styles.detailsLabel, { color: marketplaceColors.textSecondary }]}>
                  Prix au kg
                </Text>
                <Text style={[styles.detailsValue, { color: marketplaceColors.primary }]}>
                  {selectedListingForDetails.pricePerKg.toLocaleString()} FCFA/kg
                </Text>
              </View>

              <View style={styles.detailsCard}>
                <Text style={[styles.detailsLabel, { color: marketplaceColors.textSecondary }]}>
                  Prix total
                </Text>
                <Text
                  style={[
                    styles.detailsValue,
                    { color: marketplaceColors.primary, fontSize: 20, fontWeight: 'bold' },
                  ]}
                >
                  {selectedListingForDetails.calculatedPrice.toLocaleString()} FCFA
                </Text>
              </View>

              <View style={styles.detailsCard}>
                <Text style={[styles.detailsLabel, { color: marketplaceColors.textSecondary }]}>
                  Statut
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        selectedListingForDetails.status === 'available'
                          ? marketplaceColors.success + '15'
                          : marketplaceColors.warning + '15',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          selectedListingForDetails.status === 'available'
                            ? marketplaceColors.success
                            : marketplaceColors.warning,
                      },
                    ]}
                  >
                    {selectedListingForDetails.status === 'available' ? 'Disponible' : 'Réservé'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsCard}>
                <Text style={[styles.detailsLabel, { color: marketplaceColors.textSecondary }]}>
                  Date de publication
                </Text>
                <Text style={[styles.detailsValue, { color: marketplaceColors.text }]}>
                  {format(new Date(selectedListingForDetails.listedAt), 'd MMM yyyy à HH:mm', {
                    locale: fr,
                  })}
                </Text>
              </View>

              <View style={styles.detailsCard}>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="eye-outline"
                      size={20}
                      color={marketplaceColors.textSecondary}
                    />
                    <Text style={[styles.statValue, { color: marketplaceColors.text }]}>
                      {selectedListingForDetails.views || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: marketplaceColors.textSecondary }]}>
                      vues
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={marketplaceColors.textSecondary}
                    />
                    <Text style={[styles.statValue, { color: marketplaceColors.text }]}>
                      {selectedListingForDetails.inquiries || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: marketplaceColors.textSecondary }]}>
                      offres
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* NotificationPanel */}
      <NotificationPanel
        visible={notificationPanelVisible}
        notifications={marketplaceNotifications}
        unreadCount={marketplaceUnreadCount}
        onClose={() => setNotificationPanelVisible(false)}
        onNotificationPress={(notification) => {
          setNotificationPanelVisible(false);

          // Navigation automatique vers le chat si offre acceptée
          if (
            notification.type === 'offer_accepted' &&
            notification.relatedId &&
            notification.relatedType === 'transaction'
          ) {
            // Naviguer vers le chat avec la transaction
            (navigation as any).navigate(SCREENS.MARKETPLACE_CHAT, {
              transactionId: notification.relatedId,
            });
          } else if (notification.type === 'message_received' && notification.relatedId) {
            // Naviguer vers le chat
            (navigation as any).navigate(SCREENS.MARKETPLACE_CHAT, {
              transactionId: notification.relatedId,
            });
          } else if (notification.type === 'offer_received') {
            // Pour les offres reçues, on pourrait naviguer vers une page d'offres
            Alert.alert('Nouvelle offre', 'Vous avez reçu une nouvelle offre');
          }
        }}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDelete={deleteNotification}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    ...MarketplaceTheme.shadows.small,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: MarketplaceTheme.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    ...MarketplaceTheme.shadows.small,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100, // Espace pour la barre de navigation en bas
  },
  card: {
    marginBottom: SPACING.md,
  },
  footerLoader: {
    paddingVertical: SPACING.lg,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: MarketplaceTheme.colors.divider,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    minHeight: 48,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
    textAlign: 'center',
    lineHeight: MarketplaceTheme.typography.fontSizes.md * 1.2,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    alignSelf: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  myListingCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: MarketplaceTheme.borderRadius.lg,
    backgroundColor: MarketplaceTheme.colors.glassBackground,
    borderWidth: 1.5,
    borderColor: MarketplaceTheme.colors.glassBorder,
    ...MarketplaceTheme.shadows.glass,
    overflow: 'hidden',
  },
  myListingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  myListingCode: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    flex: 1,
  },
  myListingActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  myListingActionButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: MarketplaceTheme.borderRadius.sm,
  },
  myListingActionText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
  myListingStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  myListingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  myListingStatText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  myListingPrice: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: SPACING.sm,
  },
  myListingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  myListingFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
  },
  myListingFooterText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  myListingDate: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    marginLeft: 'auto',
  },
  offresContainer: {
    flex: 1,
  },
  offresTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: MarketplaceTheme.colors.divider,
  },
  offresTab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  activeOffresTab: {
    borderBottomWidth: 2,
  },
  offresTabText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  offresTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  offresTabBadgeText: {
    fontSize: 10,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  offerCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: MarketplaceTheme.borderRadius.lg,
    backgroundColor: MarketplaceTheme.colors.glassBackground,
    borderWidth: 1.5,
    borderColor: MarketplaceTheme.colors.glassBorder,
    ...MarketplaceTheme.shadows.glass,
    overflow: 'hidden',
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  offerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  offerStatusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: MarketplaceTheme.borderRadius.sm,
  },
  offerStatusText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  offerNewBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: MarketplaceTheme.borderRadius.xs,
  },
  offerNewBadgeText: {
    fontSize: 9,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  offerDate: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  offerContent: {
    marginBottom: SPACING.sm,
  },
  offerSubjectCount: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
    marginBottom: SPACING.xs,
  },
  offerPrice: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: SPACING.xs / 2,
  },
  offerOriginalPrice: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginBottom: SPACING.xs,
  },
  offerMessage: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  offerActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  offerActionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerActionText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: MarketplaceTheme.colors.divider,
  },
  modalHeaderTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.md,
  },
  detailsCard: {
    padding: SPACING.md,
    borderRadius: MarketplaceTheme.borderRadius.lg,
    marginBottom: SPACING.md,
    backgroundColor: MarketplaceTheme.colors.glassBackground,
    borderWidth: 1.5,
    borderColor: MarketplaceTheme.colors.glassBorder,
    ...MarketplaceTheme.shadows.glass,
    overflow: 'hidden',
  },
  detailsLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginBottom: SPACING.xs,
  },
  detailsValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
  detailsSubtext: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    marginTop: SPACING.xs / 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
    gap: SPACING.xs / 2,
  },
  statValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  statLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
});

// Mémoïser le composant pour éviter les re-renders inutiles
export default React.memo(MarketplaceScreen);
