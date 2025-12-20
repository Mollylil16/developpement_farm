/**
 * Écran principal du Marketplace
 * Permet de rechercher, filtrer et consulter les annonces de vente
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
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
} from '../../components/marketplace';
import CreatePurchaseRequestModal from '../../components/marketplace/CreatePurchaseRequestModal';
import CreatePurchaseRequestOfferModal from '../../components/marketplace/CreatePurchaseRequestOfferModal';
import MarketplaceBuyTab from '../../components/marketplace/tabs/MarketplaceBuyTab';
import MarketplaceMyListingsTab from '../../components/marketplace/tabs/MarketplaceMyListingsTab';
import MarketplaceMyPurchaseRequestsTab from '../../components/marketplace/tabs/MarketplaceMyPurchaseRequestsTab';
import MarketplaceMatchedRequestsTab from '../../components/marketplace/tabs/MarketplaceMatchedRequestsTab';
import MarketplaceOffersTab from '../../components/marketplace/tabs/MarketplaceOffersTab';

// Hooks
import { useGeolocation } from '../../hooks/useGeolocation';
import { useMarketplaceNotifications } from '../../hooks/useMarketplaceNotifications';

// Services
import apiClient from '../../services/api/apiClient';
import { getMarketplaceService } from '../../services/MarketplaceService';

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

export default function MarketplaceScreen() {
  const { colors } = useTheme();
  const marketplaceColors = MarketplaceTheme.colors;
  const navigation = useNavigation();
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
  } = useMarketplaceNotifications();

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
  const [batchAddModalVisible, setBatchAddModalVisible] = useState(false);
  const [createPurchaseRequestModalVisible, setCreatePurchaseRequestModalVisible] = useState(false);
  const [editPurchaseRequestModalVisible, setEditPurchaseRequestModalVisible] = useState(false);
  const [selectedPurchaseRequestForEdit, setSelectedPurchaseRequestForEdit] =
    useState<PurchaseRequest | null>(null);
  const [farmDetailsModalVisible, setFarmDetailsModalVisible] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<FarmCardType | null>(null);
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

  // Charger mes annonces depuis l'API backend
  const loadMyListings = useCallback(async () => {
    if (!user?.id || !projetActif) return;

    try {
      setMyListingsLoading(true);
      
      // Charger les listings depuis l'API backend
      const allListings = await apiClient.get<MarketplaceListing[]>('/marketplace/listings', {
        params: { projet_id: projetActif.id },
      });

      // Filtrer pour ne garder que les listings actifs (available ou reserved)
      const activeListings = allListings.filter(
        (l) => l.status === 'available' || l.status === 'reserved'
      );

      // Enrichir les listings avec les informations des animaux depuis l'API backend
      const enrichedListings = await Promise.all(
        activeListings.map(async (listing) => {
          try {
            // Récupérer l'animal depuis l'API backend
            const animal = await apiClient.get<any>(`/production/animaux/${listing.subjectId}`);
            if (!animal) return null;

            // Récupérer les pesées de l'animal depuis l'API backend
            const pesees = await apiClient.get<any[]>(`/production/pesees`, {
              params: { animal_id: animal.id, limit: 1 },
            });
            const dernierePesee = pesees && pesees.length > 0 ? pesees[0] : null;
            const poidsActuel = dernierePesee?.poids_kg || animal.poids_initial || 0;

            return {
              ...listing,
              code: animal.code || `#${animal.id.slice(0, 8)}`,
              race: animal.race || 'Non spécifiée',
              weight: poidsActuel,
              weightDate: dernierePesee?.date || listing.lastWeightDate,
              age: animal.age || 0,
              totalPrice: listing.calculatedPrice,
            };
          } catch (error) {
            console.error(`Erreur enrichissement listing ${listing.id}:`, error);
            return listing; // Retourner le listing sans enrichissement en cas d'erreur
          }
        })
      );

      const validListings = enrichedListings.filter((l): l is MarketplaceListing => l !== null);
      setMyListings(validListings);
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

  // Charger les offres
  const loadOffers = useCallback(async () => {
    if (!user?.id) return;

    try {
      setOffersLoading(true);
      const offerRepo = new (
        await import('../../database/repositories')
      ).MarketplaceOfferRepository();

      // Charger les offres reçues (en tant que producteur)
      const received = await offerRepo.findByProducerId(user.id);

      // Charger les offres envoyées (en tant qu'acheteur)
      // Exclure les offres retirées (withdrawn) et expirées (expired) de la liste
      const sent = (await offerRepo.findByBuyerId(user.id)).filter(
        (offer) => offer.status !== 'withdrawn' && offer.status !== 'expired'
      );

      setReceivedOffers(received);
      setSentOffers(sent);
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
          const transactionRepo = new (
            await import('../../database/repositories')
          ).MarketplaceTransactionRepository();
          const transaction = await transactionRepo.findById(notification.relatedId);

          if (transaction) {
            // Déterminer si l'utilisateur est l'acheteur ou le producteur
            const isBuyer = transaction.buyerId === user?.id;
            const isProducer = transaction.producerId === user?.id;

            // L'acheteur note le producteur, le producteur note l'acheteur
            if (isBuyer || isProducer) {
              // Récupérer le nom de l'autre partie
              const { UserRepository } = await import('../../database/repositories');
              const userRepo = new UserRepository();
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

  // Grouper les listings par ferme après chargement
  useEffect(() => {
    const groupListings = async () => {
      if (listings.length === 0 || listingsLoading) {
        setFarmCards([]);
        return;
      }

      try {
        setGroupingListings(true);
        const service = getMarketplaceService();

        // Récupérer la location de l'utilisateur si disponible
        let buyerLocation: { latitude: number; longitude: number } | undefined;
        try {
          const location = await getCurrentLocation();
          if (location) {
            buyerLocation = {
              latitude: location.latitude,
              longitude: location.longitude,
            };
          }
        } catch (error) {
          // Ignorer l'erreur de géolocalisation
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
    };

    groupListings();
  }, [listings, listingsLoading, getCurrentLocation]);

  const handleLoadMore = useCallback(() => {
    if (!listingsLoading && hasMore) {
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
    }
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
    async (selectedListingIds: string[]) => {
      if (!selectedFarm || selectedListingIds.length === 0) return;

      try {
        // Récupérer les listings correspondants
        const listingRepo = new (
          await import('../../database/repositories')
        ).MarketplaceListingRepository();
        const animalRepo = new (await import('../../database/repositories')).AnimalRepository();
        const peseeRepo = new (await import('../../database/repositories')).PeseeRepository();

        const selectedListings = await Promise.all(
          selectedListingIds.map((id) => listingRepo.findById(id))
        );
        const validListings = selectedListings.filter((l: MarketplaceListing | null): l is MarketplaceListing => l !== null);

        if (validListings.length === 0) {
          Alert.alert('Erreur', 'Aucun sujet valide sélectionné');
          return;
        }

        // Convertir les listings en SubjectCard avec toutes les informations
        const { VaccinationRepository } = await import('../../database/repositories');
        const vaccinationRepo = new VaccinationRepository();

        const subjects = await Promise.all(
          validListings.map(async (listing: MarketplaceListing) => {
            const animal = await animalRepo.findById(listing.subjectId);
            if (!animal) return null;

            const dernierePesee = await peseeRepo.findLastByAnimal(animal.id);
            const poidsActuel = dernierePesee?.poids_kg || animal.poids_initial || 0;

            // Calculer l'âge en mois
            const ageEnMois = animal.date_naissance
              ? Math.floor(
                  (new Date().getTime() - new Date(animal.date_naissance).getTime()) /
                    (1000 * 60 * 60 * 24 * 30)
                )
              : 0;

            // Vérifier le statut des vaccinations
            const vaccinations = await vaccinationRepo.findByAnimal(animal.id);
            const vaccinationsAJour =
              vaccinations.length > 0 &&
              vaccinations.every(
                (v) => v.date_rappel === null || new Date(v.date_rappel) > new Date()
              );

            // Déterminer le statut de santé
            let healthStatus: 'good' | 'attention' | 'critical' = 'good';
            if (animal.statut === 'mort') {
              healthStatus = 'critical';
            } else if (!vaccinationsAJour) {
              healthStatus = 'attention';
            }

            return {
              listingId: listing.id,
              subjectId: listing.subjectId,
              code: animal.code || listing.subjectId,
              race: animal.race || listing.race || 'Non spécifiée',
              weight: poidsActuel,
              weightDate: dernierePesee?.date || listing.lastWeightDate,
              pricePerKg: listing.pricePerKg,
              calculatedPrice: listing.calculatedPrice,
              // Champs supplémentaires pour l'enrichissement
              age: ageEnMois,
              healthStatus,
              vaccinations: vaccinationsAJour,
            } as SelectedSubjectForOffer & {
              age?: number;
              healthStatus?: 'good' | 'attention' | 'critical';
              vaccinations?: boolean;
            };
          })
        );

        const validSubjects = subjects.filter((s: SelectedSubjectForOffer | null): s is SelectedSubjectForOffer => s !== null);
        if (validSubjects.length === 0) {
          Alert.alert('Erreur', 'Impossible de charger les informations des sujets');
          return;
        }

        // Calculer le prix total
        const originalPrice = validListings.reduce((sum: number, l: MarketplaceListing) => sum + (l.calculatedPrice || 0), 0);

        // Utiliser le premier listingId comme référence (pour regrouper tous les sujets)
        const firstListingId = validListings[0].id;

        // Fermer le modal de détails et ouvrir le modal d'offre
        setFarmDetailsModalVisible(false);
        setSelectedSubjectsForOffer({
          subjects: validSubjects,
          listingId: firstListingId,
          originalPrice,
        });
        setOfferModalVisible(true);
      } catch (error) {
        console.error('Erreur préparation offre:', error);
        const errorMessage =
          error instanceof Error ? error.message : "Impossible de préparer l'offre";
        Alert.alert('Erreur', errorMessage);
      }
    },
    [selectedFarm]
  );

  const handleListingPress = useCallback(async (listing: MarketplaceListing) => {
    // Enrichir les données du listing avec les informations de l'animal
    try {
      const animalRepo = new (await import('../../database/repositories')).AnimalRepository();
      const peseeRepo = new (await import('../../database/repositories')).PeseeRepository();
      const vaccinationRepo = new (
        await import('../../database/repositories')
      ).VaccinationRepository();

      const animal = await animalRepo.findById(listing.subjectId);
      if (animal) {
        // Calculer l'âge en mois
        const ageEnMois = animal.date_naissance
          ? Math.floor(
              (new Date().getTime() - new Date(animal.date_naissance).getTime()) /
                (1000 * 60 * 60 * 24 * 30)
            )
          : 0;

        // Vérifier le statut des vaccinations
        const vaccinations = await vaccinationRepo.findByAnimal(animal.id);
        const vaccinationsAJour =
          vaccinations.length > 0 &&
          vaccinations.every((v) => v.date_rappel === null || new Date(v.date_rappel) > new Date());

        // Déterminer le statut de santé
        let healthStatus: 'good' | 'attention' | 'critical' = 'good';
        if (animal.statut === 'mort') {
          healthStatus = 'critical';
        } else if (!vaccinationsAJour) {
          healthStatus = 'attention';
        }

        // Enrichir le listing avec les nouvelles données
        const enrichedListing = {
          ...listing,
          age: ageEnMois,
          healthStatus,
          vaccinations: vaccinationsAJour,
        };

        setSelectedListing(enrichedListing);
      } else {
        setSelectedListing(listing);
      }
      setOfferModalVisible(true);
    } catch (error) {
      console.error('Erreur enrichissement listing:', error);
      // En cas d'erreur, utiliser le listing tel quel
      setSelectedListing(listing);
      setOfferModalVisible(true);
    }
  }, []);

  const handleOfferSubmit = useCallback(
    async (
      data: {
        subjectIds: string[];
        proposedPrice: number;
        message?: string;
      },
      listingId: string
    ) => {
      if (!user?.id) {
        Alert.alert('Erreur', 'Vous devez être connecté pour faire une offre');
        return;
      }

      try {
        const service = getMarketplaceService();
        const listingRepo = new (
          await import('../../database/repositories')
        ).MarketplaceListingRepository();

        // Utiliser le listingId passé pour trouver le listing principal
        const mainListing = await listingRepo.findById(listingId);

        if (!mainListing) {
          throw new Error('Annonce introuvable');
        }

        if (mainListing.status !== 'available' && mainListing.status !== 'reserved') {
          throw new Error("Cette annonce n'est plus disponible");
        }

        // Utiliser les subjectIds passés (qui sont déjà les IDs des animaux)
        await service.createOffer({
          listingId: mainListing.id,
          subjectIds: data.subjectIds, // Ce sont déjà les subjectId des animaux
          buyerId: user.id,
          proposedPrice: data.proposedPrice,
          message: data.message,
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

  const filterCount = Object.keys(filters).filter(
    (key) =>
      filters[key as keyof FiltersType] !== undefined && filters[key as keyof FiltersType] !== ''
  ).length;

  // Handler pour le changement de favori
  const handleFavoriteChange = useCallback(
    (farmId: string, isFavorite: boolean) => {
      // Recharger les listings pour mettre à jour l'ordre (favoris en premier)
      loadListings();
    },
    [loadListings]
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
                onPress={isProducer ? handleCreateListing : handleCreatePurchaseRequest}
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
          onRefresh={loadMyListings}
          onViewDetails={(listing) => {
            setSelectedListingForDetails(listing);
            setListingDetailsModalVisible(true);
          }}
        />
      )}

      {/* Onglet "Mes demandes" pour les acheteurs */}
      {activeTab === 'mes-demandes' && isBuyer && user?.id && (
        <MarketplaceMyPurchaseRequestsTab
          buyerId={user.id}
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
        />
      )}

      {/* Onglet Demandes (pour les producteurs) */}
      {activeTab === 'demandes' && isProducer && user?.id && (
        <MarketplaceMatchedRequestsTab
          producerId={user.id}
          onRequestPress={(request, match) => {
            setSelectedPurchaseRequest(request);
            setSelectedPurchaseRequestMatch(match);
            // TODO: Ouvrir un modal de détails
          }}
          onMakeOffer={(request, match) => {
            setSelectedPurchaseRequest(request);
            setSelectedPurchaseRequestMatch(match);
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
          onRefresh={loadOffers}
        />
      )}

      {/* Modals */}
      <MarketplaceFilters
        visible={filtersVisible}
        initialFilters={filters}
        onClose={() => setFiltersVisible(false)}
        onApply={handleApplyFilters}
      />

      {selectedListing && (
        <OfferModal
          visible={offerModalVisible}
          subjects={[
            {
              id: selectedListing.subjectId, // Utiliser subjectId comme id pour la sélection
              code: selectedListing.code || selectedListing.subjectId,
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

      {projetActif && (
        <BatchAddModal
          visible={batchAddModalVisible}
          projetId={projetActif.id}
          onClose={() => setBatchAddModalVisible(false)}
          onSuccess={() => {
            setBatchAddModalVisible(false);
            loadListings();
          }}
        />
      )}

      {/* Modal de création de demande d'achat (pour les acheteurs) */}
      {isBuyer && user?.id && (
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
        onClose={() => {
          setFarmDetailsModalVisible(false);
          setSelectedFarm(null);
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
              const transactionRepo = new (
                await import('../../database/repositories')
              ).MarketplaceTransactionRepository();
              const ratingRepo = new (
                await import('../../database/repositories')
              ).MarketplaceRatingRepository();

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
                    `#${selectedListingForDetails.subjectId.slice(0, 8)}`}
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
