/**
 * Composant pour gérer le cheptel (liste complète des animaux)
 * Refactorisé pour utiliser des hooks et composants séparés
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadProductionAnimaux, loadPeseesRecents } from '../store/slices/productionSlice';
import {
  selectProductionLoading,
  selectAllAnimaux,
  selectPeseesRecents,
} from '../store/selectors/productionSelectors';
import { useProjetEffectif } from '../hooks/useProjetEffectif';
import {
  selectAllVaccinations,
  selectAllMaladies,
  selectAllTraitements,
} from '../store/selectors/santeSelectors';
import { loadVaccinations, loadMaladies, loadTraitements } from '../store/slices/santeSlice';
import type { ProductionAnimal } from '../types/production';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import Button from './Button';
import ProductionAnimalFormModal from './ProductionAnimalFormModal';
import RevenuFormModal from './RevenuFormModal';
import { useFocusEffect } from '@react-navigation/native';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { useProductionCheptelFilters } from '../hooks/production/useProductionCheptelFilters';
import { useProductionCheptelLogic } from '../hooks/production/useProductionCheptelLogic';
import { useProductionCheptelStatut } from '../hooks/production/useProductionCheptelStatut';
import { useMarketplaceStatusForAnimals } from '../hooks/useMarketplaceStatusForAnimals';
import AnimalCard from './production/AnimalCard';
import CheptelHeader from './production/CheptelHeader';
import BatchCheptelView from './BatchCheptelView';
import { createLoggerWithPrefix } from '../utils/logger';
import apiClient from '../services/api/apiClient';
import { getErrorMessage } from '../types/common';
import MapLocationPickerModal from './MapLocationPickerModal';
import { useGeolocation } from '../hooks/useGeolocation';
import {
  getFarmLocation,
  setFarmLocation,
  type StoredFarmLocation,
} from '../services/location/farmLocationStorage';
import { geocodePlaceToLocation } from '../services/location/geocoding';
import { resolveLocationFromCoords } from '../services/location/locationResolver';

const logger = createLoggerWithPrefix('ProductionCheptel');

function ProductionCheptelComponent() {
  // IMPORTANT: Tous les hooks doivent être appelés AVANT tout return conditionnel
  // pour respecter les règles des hooks React
  
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  
  // Vérifier la méthode de gestion du projet
  const managementMethod = projetActif?.management_method || 'individual';

  // Si mode "batch", afficher la vue par bande
  // MAIS on doit quand même appeler tous les hooks suivants pour maintenir l'ordre constant
  // On les appelle mais on ne les utilise pas si on est en mode batch
  const loading = useAppSelector(selectProductionLoading);
  const vaccinations = useAppSelector(selectAllVaccinations);
  const maladies = useAppSelector(selectAllMaladies);
  const traitements = useAppSelector(selectAllTraitements);
  const allAnimaux = useAppSelector(selectAllAnimaux);
  const peseesRecents = useAppSelector(selectPeseesRecents);

  // Hooks personnalisés - doivent être appelés inconditionnellement
  const {
    filterCategorie,
    setFilterCategorie,
    searchQuery,
    setSearchQuery,
    animauxFiltres,
    countByCategory,
  } = useProductionCheptelFilters(projetActif?.id);

  // Enrichir les animaux avec leur statut marketplace
  const { animauxEnrichis, refresh: refreshMarketplace } = useMarketplaceStatusForAnimals();
  
  // Créer une map pour accéder rapidement aux animaux enrichis
  const animauxEnrichisMap = React.useMemo(() => {
    const map = new Map<string, typeof animauxEnrichis[0]>();
    animauxEnrichis.forEach((animal) => {
      map.set(animal.id, animal);
    });
    return map;
  }, [animauxEnrichis]);

  // Enrichir les animaux filtrés avec les données marketplace
  const animauxFiltresEnrichis = React.useMemo(() => {
    return animauxFiltres.map((animal) => {
      return animauxEnrichisMap.get(animal.id) || animal;
    });
  }, [animauxFiltres, animauxEnrichisMap]);

  const {
    togglingMarketplace,
    showPriceModal,
    priceInput,
    animalForMarketplace,
    setShowPriceModal,
    setPriceInput,
    setAnimalForMarketplace,
    handleDelete,
    handleToggleMarketplace,
    handleConfirmMarketplaceAdd,
  } = useProductionCheptelLogic();

  const { handleChangeStatut } = useProductionCheptelStatut();

  // State local - doivent être appelés inconditionnellement
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<ProductionAnimal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedHistorique, setExpandedHistorique] = useState<string | null>(null);
  const [showRevenuModal, setShowRevenuModal] = useState(false);
  const [animalVendu, setAnimalVendu] = useState<ProductionAnimal | null>(null);
  const [initializingCheptel, setInitializingCheptel] = useState(false);

  // Localisation annonce (privacy-first)
  const { getCurrentLocation } = useGeolocation();
  const [farmLocation, setFarmLocationState] = useState<StoredFarmLocation | null>(null);
  const [locationMode, setLocationMode] = useState<'farm' | 'place' | 'gps'>('farm');
  const [placeText, setPlaceText] = useState('');
  const [mapModalVisible, setMapModalVisible] = useState(false);
  
  // Pagination frontend
  const ITEMS_PER_PAGE = 50;
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  
  // Réinitialiser la pagination quand les filtres changent
  React.useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [filterCategorie, searchQuery, projetActif?.id]);

  // Charger la localisation de ferme sauvegardée (par projet)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!projetActif?.id) {
        setFarmLocationState(null);
        return;
      }
      const stored = await getFarmLocation(projetActif.id);
      if (!cancelled) {
        setFarmLocationState(stored);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projetActif?.id]);
  
  // Paginer les animaux filtrés enrichis
  const animauxPagines = React.useMemo(() => {
    return animauxFiltresEnrichis.slice(0, displayedCount);
  }, [animauxFiltresEnrichis, displayedCount]);
  
  // Vérifier s'il y a plus d'animaux à charger
  const hasMore = animauxFiltresEnrichis.length > displayedCount;
  
  // Charger plus d'animaux (scroll infini)
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setDisplayedCount((prev) => prev + ITEMS_PER_PAGE);
    }
  }, [hasMore, loading]);

  // Charger les données uniquement quand l'onglet est visible (éviter les boucles infinies)
  const aChargeRef = useRef<string | null>(null);
  const dernierChargementRef = useRef<{ projetId: string | null; timestamp: number }>({
    projetId: null,
    timestamp: 0,
  });

  // Réinitialiser le cache si le projet actif change
  React.useEffect(() => {
    if (projetActif?.id && aChargeRef.current !== projetActif.id) {
      // Le projet a changé, réinitialiser le cache pour forcer un rechargement
      aChargeRef.current = null;
      dernierChargementRef.current = { projetId: null, timestamp: 0 };
    }
  }, [projetActif?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (!projetActif?.id) {
        aChargeRef.current = null;
        dernierChargementRef.current = { projetId: null, timestamp: 0 };
        return;
      }

      const maintenant = Date.now();
      const CACHE_DURATION_MS = 5000; // 5 secondes (réduit pour permettre le rechargement après création)
      const memeProjet = dernierChargementRef.current.projetId === projetActif.id;
      const donneesRecentes =
        memeProjet && maintenant - dernierChargementRef.current.timestamp < CACHE_DURATION_MS;

      // Si les données sont récentes et qu'on a déjà chargé ce projet, ne pas recharger
      if (donneesRecentes && aChargeRef.current === projetActif.id) {
        logger.debug('[ProductionCheptel] Données en cache, pas de rechargement');
        return;
      }

      // Charger quand le projet change ou si les données sont anciennes
      logger.info('Rechargement des animaux et données associées...', { projetId: projetActif.id });
      aChargeRef.current = projetActif.id;
      dernierChargementRef.current = {
        projetId: projetActif.id,
        timestamp: maintenant,
      };

      // Charger les animaux immédiatement (critique pour l'affichage)
      // Inclure les inactifs pour avoir tous les animaux du cheptel (actif et autre)
      dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true })).catch((error) => {
        // Logger l'erreur de manière informative (éviter {} vide)
        const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
        logger.error('Erreur lors du chargement des animaux:', errorMessage);
      });
      
      // Recharger aussi les statuts marketplace
      refreshMarketplace();

      // Déferrer les autres chargements (non-critiques) après un court délai
      // pour améliorer le temps de chargement initial
      setTimeout(() => {
        Promise.all([
          dispatch(loadVaccinations(projetActif.id)),
          dispatch(loadMaladies(projetActif.id)),
          dispatch(loadTraitements(projetActif.id)),
        ]).catch((error) => {
          const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
          logger.error('Erreur lors du chargement des données associées:', errorMessage);
        });
      }, 500); // Délai de 500ms pour laisser le temps au rendu initial
    }, [dispatch, projetActif?.id])
  );

  // Fonction pour rafraîchir les données (pull-to-refresh)
  const onRefresh = useCallback(async () => {
    if (!projetActif?.id) return;

    setRefreshing(true);
    try {
      // Inclure les inactifs pour avoir tous les animaux du cheptel (actif et autre)
      await dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true })).unwrap();
      
      // Recharger aussi les statuts marketplace
      await refreshMarketplace();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Erreur lors du rafraîchissement:', errorMessage);
    } finally {
      setRefreshing(false);
    }
  }, [projetActif?.id, dispatch]);

  // Tous les hooks doivent être appelés AVANT le return conditionnel
  // getParentLabel helper
  const getParentLabel = useCallback(
    (id?: string | null) => {
      if (!id) {
        return 'Inconnu';
      }
      if (!Array.isArray(allAnimaux)) {
        return 'Inconnu';
      }
      const parent = allAnimaux.find((a) => a.id === id);
      if (!parent) {
        return 'Inconnu';
      }
      return `${parent.code}${parent.nom ? ` (${parent.nom})` : ''}`;
    },
    [allAnimaux]
  );

  // Compter les animaux dans l'historique
  const animauxHistorique = allAnimaux.filter((a) =>
    // "autre" = retiré du cheptel (historique), en plus de vendu/offert/mort
    ['vendu', 'offert', 'mort', 'autre'].includes(a.statut)
  );

  // Mémoriser les handlers séparément pour éviter les re-renders
  const handleToggleHistorique = useCallback((animalId: string) => {
    setExpandedHistorique((prev) => (prev === animalId ? null : animalId));
  }, []);

  const handleEdit = useCallback((animal: ProductionAnimal) => {
    setSelectedAnimal(animal);
    setIsEditing(true);
    setShowAnimalModal(true);
  }, []);

  const initialEffectifTotal =
    (projetActif?.nombre_truies || 0) +
    (projetActif?.nombre_verrats || 0) +
    (projetActif?.nombre_porcelets || 0) +
    (projetActif?.nombre_croissance || 0);

  const animauxDuProjetCount = React.useMemo(() => {
    if (!projetActif?.id) return 0;
    return allAnimaux.filter((a) => a.projet_id === projetActif.id).length;
  }, [allAnimaux, projetActif?.id]);

  const canInitializeCheptel =
    projetActif?.management_method === 'individual' &&
    initialEffectifTotal > 0 &&
    animauxDuProjetCount === 0;

  const handleInitializeCheptel = useCallback(async () => {
    if (!projetActif?.id || initializingCheptel) return;

    setInitializingCheptel(true);
    try {
      const result = await apiClient.post<{ created: number; skipped: boolean; reason?: string }>(
        `/projets/${projetActif.id}/initialize-individual-animals`,
        {}
      );

      // Recharger les animaux pour afficher le cheptel
      await dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true })).unwrap();

      if (result?.skipped) {
        logger.info('[ProductionCheptel] Initialisation cheptel ignorée', result);
      } else {
        Alert.alert('Cheptel initialisé', `${result?.created ?? 0} animal(aux) ont été créés.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[ProductionCheptel] Erreur initialisation cheptel:', errorMessage);
      Alert.alert('Erreur', getErrorMessage(error) || "Impossible d'initialiser le cheptel");
    } finally {
      setInitializingCheptel(false);
    }
  }, [projetActif?.id, initializingCheptel, dispatch, logger]);

  const handleChangeStatutWithCallback = useCallback(
    (animal: ProductionAnimal, statut: string) => {
      handleChangeStatut(animal, statut, (animal) => {
        setAnimalVendu(animal);
        setShowRevenuModal(true);
      });
    },
    [handleChangeStatut]
  );

  // Render animal using AnimalCard component - doit être appelé avant le return conditionnel
  const renderAnimal = useCallback(
    ({ item }: { item: ProductionAnimal }) => {
      return (
        <AnimalCard
          animal={item}
          vaccinations={vaccinations}
          maladies={maladies}
          traitements={traitements}
          expandedHistorique={expandedHistorique}
          onToggleHistorique={handleToggleHistorique}
          onToggleMarketplace={handleToggleMarketplace}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onChangeStatut={handleChangeStatutWithCallback}
          togglingMarketplace={togglingMarketplace}
          canUpdate={canUpdate('reproduction')}
          canDelete={canDelete('reproduction')}
          getParentLabel={getParentLabel}
        />
      );
    },
    [
      vaccinations,
      maladies,
      traitements,
      expandedHistorique,
      handleToggleHistorique,
      handleToggleMarketplace,
      handleEdit,
      handleDelete,
      handleChangeStatutWithCallback,
      togglingMarketplace,
      canUpdate,
      canDelete,
      getParentLabel,
    ]
  );

  // Constante pour la hauteur estimée d'un AnimalCard (ajuster selon votre design)
  const ESTIMATED_ITEM_HEIGHT = 200;

  // Optimisation FlatList : getItemLayout pour items de taille fixe - doit être appelé avant le return conditionnel
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ESTIMATED_ITEM_HEIGHT,
      offset: ESTIMATED_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // MAINTENANT on peut faire le return conditionnel APRÈS tous les hooks
  if (managementMethod === 'batch') {
    return <BatchCheptelView />;
  }

  // Sinon, continuer avec la vue individuelle (code existant)

  // Afficher le spinner uniquement lors du premier chargement (pas à chaque re-render)
  if (loading && (!Array.isArray(allAnimaux) || allAnimaux.length === 0)) {
    return <LoadingSpinner message="Chargement du cheptel..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={animauxPagines}
        renderItem={renderAnimal}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        ListHeaderComponent={
          <CheptelHeader
            totalCount={animauxFiltresEnrichis.length}
            countByCategory={countByCategory}
            filterCategorie={filterCategorie}
            searchQuery={searchQuery}
            historiqueCount={animauxHistorique.length}
            onFilterChange={setFilterCategorie}
            onSearchChange={setSearchQuery}
            onNavigateToHistorique={() => {
              navigation.navigate('Historique' as never);
            }}
            onAddAnimal={() => {
              setSelectedAnimal(null);
              setIsEditing(false);
              setShowAnimalModal(true);
            }}
            canCreate={canCreate('reproduction')}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          searchQuery.trim() ? (
            <EmptyState
              title="Aucun animal trouvé"
              message={`Aucun animal ne correspond à "${searchQuery}"`}
              action={
                <Button
                  title="Effacer la recherche"
                  onPress={() => setSearchQuery('')}
                  variant="secondary"
                />
              }
            />
          ) : (
            <EmptyState
              title="Aucun animal dans le cheptel"
              message="Ajoutez des animaux pour commencer à gérer votre cheptel"
              action={
                <View style={{ gap: SPACING.sm }}>
                  {canInitializeCheptel && (
                    <Button
                      title={initializingCheptel ? 'Initialisation...' : 'Initialiser le cheptel'}
                      onPress={handleInitializeCheptel}
                      loading={initializingCheptel}
                    />
                  )}
                  {canCreate('reproduction') ? (
                    <Button
                      title="Ajouter un animal"
                      variant={canInitializeCheptel ? 'secondary' : 'primary'}
                      onPress={() => {
                        setSelectedAnimal(null);
                        setIsEditing(false);
                        setShowAnimalModal(true);
                      }}
                    />
                  ) : null}
                </View>
              }
            />
          )
        }
        ListFooterComponent={
          hasMore && loading ? (
            <View style={styles.footerLoader}>
              <LoadingSpinner message="Chargement..." />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {projetActif && (
        <ProductionAnimalFormModal
          visible={showAnimalModal}
          onClose={() => {
            setShowAnimalModal(false);
            setIsEditing(false);
            setSelectedAnimal(null);
          }}
          onSuccess={async () => {
            setShowAnimalModal(false);
            setIsEditing(false);
            setSelectedAnimal(null);
            // Recharger les animaux pour afficher les modifications
            if (projetActif) {
              dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
            }
          }}
          projetId={projetActif.id}
          animal={isEditing ? selectedAnimal : null}
          isEditing={isEditing}
        />
      )}
      {showRevenuModal && (
        <RevenuFormModal
          visible={showRevenuModal}
          onClose={() => {
            setShowRevenuModal(false);
            setAnimalVendu(null);
          }}
          onSuccess={() => {
            setShowRevenuModal(false);
            setAnimalVendu(null);
          }}
          animalId={animalVendu?.id}
          animalPoids={
            animalVendu
              ? peseesRecents.find((p) => p.animal_id === animalVendu.id)?.poids_kg ||
                animalVendu.poids_initial ||
                0
              : undefined
          }
        />
      )}

      {/* Modal de mise en vente (prix/kg) */}
      <Modal
        visible={showPriceModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPriceModal(false);
          setAnimalForMarketplace(null);
          setPriceInput('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Mettre en vente
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {animalForMarketplace
                ? `${animalForMarketplace.code}${animalForMarketplace.nom ? ` (${animalForMarketplace.nom})` : ''}`
                : 'Sujet'}
            </Text>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              Prix par kg (FCFA)
            </Text>
            <TextInput
              value={priceInput}
              onChangeText={setPriceInput}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              style={[
                styles.modalInput,
                { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
              ]}
            />

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              Localisation de l’annonce (sans suivi en continu)
            </Text>
            <View style={styles.locationModeRow}>
              {(['farm', 'place', 'gps'] as const).map((mode) => {
                const label =
                  mode === 'farm' ? 'Ferme' : mode === 'place' ? 'Autre lieu' : 'GPS (1 fois)';
                const selected = locationMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setLocationMode(mode)}
                    style={[
                      styles.locationModeChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.background,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.locationModeChipText,
                        { color: selected ? colors.textOnPrimary : colors.text },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {locationMode === 'farm' && (
              <View style={styles.locationSummary}>
                <Text style={[styles.locationSummaryText, { color: colors.textSecondary }]}>
                  {farmLocation
                    ? `Ferme: ${farmLocation.address || projetActif?.localisation || 'Localisation enregistrée'}`
                    : `Aucune localisation de ferme enregistrée. (${projetActif?.localisation || 'Projet sans localisation'})`}
                </Text>
                <TouchableOpacity
                  onPress={() => setMapModalVisible(true)}
                  style={[styles.locationLink, { borderColor: colors.border }]}
                >
                  <Text style={[styles.locationLinkText, { color: colors.primary }]}>
                    {farmLocation ? 'Modifier la localisation de la ferme' : 'Définir la localisation de la ferme'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {locationMode === 'place' && (
              <View style={styles.locationSummary}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                  Ville / commune / département / sous-préfecture
                </Text>
                <TextInput
                  value={placeText}
                  onChangeText={setPlaceText}
                  placeholder="Ex: Yopougon, Abidjan, Côte d’Ivoire"
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                      marginBottom: SPACING.md,
                    },
                  ]}
                />
                <Text style={[styles.locationSummaryText, { color: colors.textSecondary }]}>
                  Astuce: plus c’est précis, plus le résultat est fiable.
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowPriceModal(false);
                  setAnimalForMarketplace(null);
                  setPriceInput('');
                }}
                style={[styles.modalButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!projetActif?.id) return;

                  try {
                    // Résoudre une location complète (lat/lon + address/city/region) sans GPS par défaut
                    let location = null;

                    if (locationMode === 'farm') {
                      if (farmLocation) {
                        location = await resolveLocationFromCoords({
                          latitude: farmLocation.lat,
                          longitude: farmLocation.lng,
                          fallbackText: farmLocation.address || projetActif.localisation,
                        });
                      } else if (projetActif.localisation?.trim()) {
                        location = await geocodePlaceToLocation(projetActif.localisation.trim());
                      }

                      if (!location) {
                        Alert.alert(
                          'Localisation requise',
                          'Veuillez définir la localisation de la ferme (coordonnées) ou choisissez "Autre lieu".'
                        );
                        return;
                      }
                    } else if (locationMode === 'place') {
                      const q = placeText.trim();
                      if (!q) {
                        Alert.alert('Localisation requise', 'Veuillez saisir un lieu (ville/commune...).');
                        return;
                      }
                      location = await geocodePlaceToLocation(q);
                      if (!location) {
                        Alert.alert(
                          'Localisation introuvable',
                          "Impossible de trouver ce lieu. Essayez d'ajouter le pays (ex: Côte d’Ivoire)."
                        );
                        return;
                      }
                    } else {
                      // GPS (1 fois)
                      const userLoc = await getCurrentLocation();
                      if (!userLoc) {
                        Alert.alert('Erreur', "Impossible d'obtenir votre position.");
                        return;
                      }
                      location = await resolveLocationFromCoords({
                        latitude: userLoc.latitude,
                        longitude: userLoc.longitude,
                        fallbackText:
                          userLoc.city
                            ? `${userLoc.city}${userLoc.region ? `, ${userLoc.region}` : ''}`
                            : projetActif.localisation,
                      });
                    }

                    await handleConfirmMarketplaceAdd(location);
                  } catch (e) {
                    Alert.alert('Erreur', getErrorMessage(e) || "Impossible de préparer la localisation.");
                  }
                }}
                disabled={togglingMarketplace === animalForMarketplace?.id}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                    opacity: togglingMarketplace === animalForMarketplace?.id ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.modalButtonText, { color: colors.textOnPrimary }]}>
                  {togglingMarketplace === animalForMarketplace?.id ? '...' : 'Confirmer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <MapLocationPickerModal
        visible={mapModalVisible}
        onClose={() => setMapModalVisible(false)}
        initialLocation={farmLocation ? { lat: farmLocation.lat, lng: farmLocation.lng } : null}
        onConfirm={async (loc) => {
          if (!projetActif?.id) return;
          const resolved = await resolveLocationFromCoords({
            latitude: loc.lat,
            longitude: loc.lng,
            fallbackText: loc.address || projetActif.localisation,
          });
          const toStore: Omit<StoredFarmLocation, 'updatedAt'> = {
            lat: resolved.latitude,
            lng: resolved.longitude,
            address: resolved.address,
            city: resolved.city,
            region: resolved.region,
          };
          await setFarmLocation(projetActif.id, toStore);
          setFarmLocationState({ ...toStore, updatedAt: new Date().toISOString() });
          setMapModalVisible(false);
        }}
      />
    </View>
  );
}

  const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  footerLoader: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  header: {
    marginBottom: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  historiqueButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  historiqueButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
  },
  summary: {
    flexDirection: 'column',
    marginBottom: SPACING.md,
  },
  summaryText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  summaryDetails: {
    marginTop: SPACING.xs,
  },
  filters: {
    marginTop: SPACING.md,
  },
  filterLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: FONT_SIZES.lg,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
  },
  clearButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  clearButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  animalCard: {
    marginBottom: SPACING.md,
  },
  animalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  animalPhoto: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    resizeMode: 'cover',
  },
  animalPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  animalInfo: {
    flex: 1,
    minWidth: 0, // Permet au texte de se rétrécir si nécessaire
  },
  animalCode: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  statutBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statutText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  reproducteurBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
  },
  reproducteurText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  marketplaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
    borderWidth: 1,
    gap: 4,
  },
  marketplaceText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  animalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  actionButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  animalDetails: {
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
  },
  notesContainer: {
    marginTop: SPACING.xs,
  },
  notesLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  statutSelector: {
    marginTop: SPACING.sm,
  },
  statutSelectorLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  statutButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  statutButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  statutButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  historiqueContainer: {
    marginTop: SPACING.sm,
  },
  historiqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  historiqueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  historiqueTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  historiqueBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  historiqueBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  historiqueContent: {
    marginTop: SPACING.sm,
    gap: SPACING.md,
  },
  historiqueSection: {
    gap: SPACING.xs,
  },
  historiqueSectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  historiqueItem: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderLeftWidth: 3,
    gap: 4,
  },
  historiqueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  historiqueItemDate: {
    fontSize: FONT_SIZES.xs,
  },
  historiqueItemTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  historiqueItemDetail: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
  categorieBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  categorieBadgeText: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  graviteBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
    marginTop: 4,
  },
  graviteBadgeText: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '600',
  },
  historiqueMore: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
  },
  modalLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  locationModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  locationModeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  locationModeChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  locationSummary: {
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  locationSummaryText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  locationLink: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  locationLinkText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  modalButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});

// Mémoïser le composant pour éviter les re-renders inutiles
export default React.memo(ProductionCheptelComponent);
