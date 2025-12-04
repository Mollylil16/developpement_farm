/**
 * Composant pour gérer le cheptel (liste complète des animaux)
 * Refactorisé pour utiliser des hooks et composants séparés
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadProductionAnimaux,
  loadPeseesRecents,
} from '../store/slices/productionSlice';
import { selectProductionLoading, selectAllAnimaux, selectPeseesRecents } from '../store/selectors/productionSelectors';
import {
  selectAllVaccinations,
  selectAllMaladies,
  selectAllTraitements,
} from '../store/selectors/santeSelectors';
import { loadVaccinations, loadMaladies, loadTraitements } from '../store/slices/santeSlice';
import { ProductionAnimal } from '../types';
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

export default function ProductionCheptelComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  const { projetActif } = useAppSelector((state) => state.projet);
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

  // Charger les données uniquement quand l'onglet est visible (éviter les boucles infinies)
  const aChargeRef = useRef<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!projetActif) {
        aChargeRef.current = null;
        return;
      }

      // Charger uniquement une fois par projet (quand le projet change)
      if (aChargeRef.current !== projetActif.id) {
        console.log('🔄 [ProductionCheptelComponent] Rechargement des animaux et données associées...');
        aChargeRef.current = projetActif.id;
        dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
        dispatch(loadVaccinations(projetActif.id));
        dispatch(loadMaladies(projetActif.id));
        dispatch(loadTraitements(projetActif.id));
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
      console.error('Erreur lors du rafraîchissement:', error);
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

  // Compter les animaux dans l'historique
  const animauxHistorique = allAnimaux.filter((a) =>
    ['vendu', 'offert', 'mort'].includes(a.statut)
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
          onToggleHistorique={(animalId) => setExpandedHistorique(expandedHistorique === animalId ? null : animalId)}
          onToggleMarketplace={handleToggleMarketplace}
          onEdit={(animal) => {
            setSelectedAnimal(animal);
            setIsEditing(true);
            setShowAnimalModal(true);
          }}
          onDelete={handleDelete}
          onChangeStatut={(animal, statut) => handleChangeStatut(animal, statut, (animal) => {
            setAnimalVendu(animal);
            setShowRevenuModal(true);
          })}
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
      handleToggleMarketplace,
      handleDelete,
      handleChangeStatut,
      togglingMarketplace,
      canUpdate,
      canDelete,
      getParentLabel,
    ]
  );

  // Afficher le spinner uniquement lors du premier chargement (pas à chaque re-render)
  if (loading && (!Array.isArray(allAnimaux) || allAnimaux.length === 0)) {
    return <LoadingSpinner message="Chargement du cheptel..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={animauxFiltres}
        renderItem={renderAnimal}
        keyExtractor={(item) => item.id}
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
              // TODO: Navigate to historique screen
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
          animalPoids={animalVendu ? (peseesRecents.find(p => p.animal_id === animalVendu.id)?.poids_kg || animalVendu.poids_initial || 0) : undefined}
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
