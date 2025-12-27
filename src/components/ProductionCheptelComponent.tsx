/**
 * Composant pour gérer le cheptel (liste complète des animaux)
 * Refactorisé pour utiliser des hooks et composants séparés
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadProductionAnimaux, loadPeseesRecents } from '../store/slices/productionSlice';
import {
  selectProductionLoading,
  selectAllAnimaux,
  selectPeseesRecents,
} from '../store/selectors/productionSelectors';
import { selectProjetActif } from '../store/selectors/projetSelectors';
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
import AnimalCard from './production/AnimalCard';
import CheptelHeader from './production/CheptelHeader';
import BatchCheptelView from './BatchCheptelView';
import { createLoggerWithPrefix } from '../utils/logger';

const logger = createLoggerWithPrefix('ProductionCheptel');

export default function ProductionCheptelComponent() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  const projetActif = useAppSelector(selectProjetActif);
  
  // Vérifier la méthode de gestion du projet AVANT les autres hooks
  // pour éviter "Rendered more hooks than during the previous render"
  const managementMethod = projetActif?.management_method || 'individual';

  // Si mode "batch", afficher la vue par bande IMMÉDIATEMENT
  // sans appeler les autres hooks qui ne sont nécessaires que pour le mode individual
  if (managementMethod === 'batch') {
    return <BatchCheptelView />;
  }

  // Les hooks suivants ne sont appelés que si on est en mode "individual"
  // Cela garantit que le nombre de hooks reste constant entre les rendus
  const loading = useAppSelector(selectProductionLoading);
  const vaccinations = useAppSelector(selectAllVaccinations);
  const maladies = useAppSelector(selectAllMaladies);
  const traitements = useAppSelector(selectAllTraitements);
  const allAnimaux = useAppSelector(selectAllAnimaux);
  const peseesRecents = useAppSelector(selectPeseesRecents);

  // Hooks personnalisés
  const {
    filterCategorie,
    setFilterCategorie,
    searchQuery,
    setSearchQuery,
    animauxFiltres,
    countByCategory,
  } = useProductionCheptelFilters(projetActif?.id);

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

  // State local
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<ProductionAnimal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedHistorique, setExpandedHistorique] = useState<string | null>(null);
  const [showRevenuModal, setShowRevenuModal] = useState(false);
  const [animalVendu, setAnimalVendu] = useState<ProductionAnimal | null>(null);
  
  // Pagination frontend: afficher seulement un nombre limité d'animaux à la fois
  const ITEMS_PER_PAGE = 50; // Nombre d'animaux à afficher par page
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  
  // Réinitialiser la pagination quand les filtres changent
  React.useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [filterCategorie, searchQuery, projetActif?.id]);
  
  // Paginer les animaux filtrés
  const animauxPagines = React.useMemo(() => {
    return animauxFiltres.slice(0, displayedCount);
  }, [animauxFiltres, displayedCount]);
  
  // Vérifier s'il y a plus d'animaux à charger
  const hasMore = animauxFiltres.length > displayedCount;
  
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

  useFocusEffect(
    React.useCallback(() => {
      if (!projetActif?.id) {
        aChargeRef.current = null;
        dernierChargementRef.current = { projetId: null, timestamp: 0 };
        return;
      }

      const maintenant = Date.now();
      const CACHE_DURATION_MS = 30000; // 30 secondes
      const memeProjet = dernierChargementRef.current.projetId === projetActif.id;
      const donneesRecentes =
        memeProjet && maintenant - dernierChargementRef.current.timestamp < CACHE_DURATION_MS;

      // Si les données sont récentes, ne pas recharger
      if (donneesRecentes && aChargeRef.current === projetActif.id) {
        logger.debug('[ProductionCheptel] Données en cache, pas de rechargement');
        return;
      }

      // Charger uniquement une fois par projet (quand le projet change)
      if (aChargeRef.current !== projetActif.id) {
        logger.info('Rechargement des animaux et données associées...');
        aChargeRef.current = projetActif.id;
        dernierChargementRef.current = {
          projetId: projetActif.id,
          timestamp: maintenant,
        };

        // Charger les animaux immédiatement (critique pour l'affichage)
        dispatch(loadProductionAnimaux({ projetId: projetActif.id })).catch((error) => {
          logger.error('Erreur lors du chargement des animaux:', error);
        });

        // Déferrer les autres chargements (non-critiques) après un court délai
        // pour améliorer le temps de chargement initial
        setTimeout(() => {
          Promise.all([
            dispatch(loadVaccinations(projetActif.id)),
            dispatch(loadMaladies(projetActif.id)),
            dispatch(loadTraitements(projetActif.id)),
          ]).catch((error) => {
            logger.error('Erreur lors du chargement des données associées:', error);
          });
        }, 500); // Délai de 500ms pour laisser le temps au rendu initial
      }
    }, [dispatch, projetActif?.id])
  );

  // Fonction pour rafraîchir les données (pull-to-refresh)
  const onRefresh = useCallback(async () => {
    if (!projetActif?.id) return;

    setRefreshing(true);
    try {
      await dispatch(loadProductionAnimaux({ projetId: projetActif.id })).unwrap();
    } catch (error) {
      logger.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [projetActif?.id, dispatch]);

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

  // Sinon, continuer avec la vue individuelle (code existant)

  // Compter les animaux dans l'historique
  const animauxHistorique = allAnimaux.filter((a) =>
    ['vendu', 'offert', 'mort'].includes(a.statut)
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

  const handleChangeStatutWithCallback = useCallback(
    (animal: ProductionAnimal, statut: string) => {
      handleChangeStatut(animal, statut, (animal) => {
        setAnimalVendu(animal);
        setShowRevenuModal(true);
      });
    },
    [handleChangeStatut]
  );

  // Render animal using AnimalCard component
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

  // Optimisation FlatList : getItemLayout pour items de taille fixe
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ESTIMATED_ITEM_HEIGHT,
      offset: ESTIMATED_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

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
            totalCount={animauxFiltres.length}
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
                canCreate('reproduction') ? (
                  <Button
                    title="Ajouter un animal"
                    onPress={() => {
                      setSelectedAnimal(null);
                      setIsEditing(false);
                      setShowAnimalModal(true);
                    }}
                  />
                ) : null
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
});
