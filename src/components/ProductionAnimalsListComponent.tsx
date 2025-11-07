/**
 * Composant pour afficher la liste des animaux en production avec leurs pesées
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadProductionAnimaux,
  deleteProductionAnimal,
  loadPeseesParAnimal,
  loadPeseesRecents,
} from '../store/slices/productionSlice';
import { ProductionAnimal, ProductionPesee } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import Button from './Button';
import ProductionAnimalFormModal from './ProductionAnimalFormModal';
import ProductionPeseeFormModal from './ProductionPeseeFormModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ProductionAnimalsListComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { animaux, peseesParAnimal, peseesRecents, loading } = useAppSelector(
    (state) => state.production
  );

  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [showPeseeModal, setShowPeseeModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<ProductionAnimal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayedAnimals, setDisplayedAnimals] = useState<typeof animauxAvecStats>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    if (projetActif) {
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
      dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 }));
    }
  }, [dispatch, projetActif]);

  useEffect(() => {
    if (selectedAnimal) {
      dispatch(loadPeseesParAnimal(selectedAnimal.id));
    }
  }, [dispatch, selectedAnimal]);

  const animauxAvecStats = useMemo(() => {
    return animaux.map((animal) => {
      const pesees = peseesParAnimal[animal.id] || [];
      const dernierePesee = pesees[0];
      const gmqMoyen =
        pesees.length > 1
          ? pesees.reduce((sum, p, idx) => {
              if (idx === 0) return sum;
              const prevPesee = pesees[idx - 1];
              const jours = Math.max(
                1,
                Math.floor(
                  (new Date(p.date).getTime() - new Date(prevPesee.date).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              );
              return sum + (p.gmq || 0);
            }, 0) / (pesees.length - 1)
          : dernierePesee?.gmq || null;

      return {
        animal,
        dernierePesee,
        gmqMoyen,
        nombrePesees: pesees.length,
      };
    });
  }, [animaux, peseesParAnimal]);

  // Pagination: charger les premiers animaux
  useEffect(() => {
    const initial = animauxAvecStats.slice(0, ITEMS_PER_PAGE);
    setDisplayedAnimals(initial);
    setPage(1);
  }, [animaux.length]); // Reset quand le nombre total d'animaux change

  // Charger plus d'animaux
  const loadMore = useCallback(() => {
    if (displayedAnimals.length >= animauxAvecStats.length) {
      return; // Tout est déjà chargé
    }

    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = animauxAvecStats.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedAnimals((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    }
  }, [page, displayedAnimals.length, animauxAvecStats]);

  const handleDelete = useCallback((animal: ProductionAnimal) => {
    Alert.alert(
      'Supprimer l\'animal',
      `Voulez-vous supprimer ${animal.code}${animal.nom ? ` (${animal.nom})` : ''} ? Toutes les pesées associées seront également supprimées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await dispatch(deleteProductionAnimal(animal.id));
            if (selectedAnimal?.id === animal.id) {
              setSelectedAnimal(null);
            }
          },
        },
      ]
    );
  }, [dispatch, selectedAnimal, setSelectedAnimal]);

  // Composant mémorisé pour chaque carte d'animal - défini AVANT les retours anticipés pour éviter les problèmes de hooks
  const AnimalCard = React.memo(({ item, isSelected, pesees, onSelect, onPesee, onEdit, onDelete }: {
    item: typeof animauxAvecStats[0];
    isSelected: boolean;
    pesees: ProductionPesee[];
    onSelect: (animal: ProductionAnimal) => void;
    onPesee: (animal: ProductionAnimal) => void;
    onEdit: (animal: ProductionAnimal) => void;
    onDelete: (animal: ProductionAnimal) => void;
  }) => {
    const { colors } = useTheme();
    const { animal, dernierePesee, gmqMoyen, nombrePesees } = item;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.primary : colors.borderLight,
            borderWidth: isSelected ? 2 : 1,
            ...colors.shadow.small,
          },
        ]}
        onPress={() => onSelect(animal)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.cardCode, { color: colors.text }]}>{animal.code}</Text>
            {animal.nom && (
              <Text style={[styles.cardNom, { color: colors.textSecondary }]}>({animal.nom})</Text>
            )}
            {!animal.actif && (
              <View style={[styles.inactiveBadge, { backgroundColor: colors.textSecondary + '20' }]}>
                <Text style={[styles.inactiveBadgeText, { color: colors.textSecondary }]}>Inactif</Text>
              </View>
            )}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primaryLight + '15' }]}
              onPress={() => onPesee(animal)}
            >
              <Text style={[styles.actionButtonText, { color: colors.primaryDark }]}>Pesée</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primaryLight + '15' }]}
              onPress={() => onEdit(animal)}
            >
              <Text style={[styles.actionButtonText, { color: colors.primaryDark }]}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
              onPress={() => onDelete(animal)}
            >
              <Text style={[styles.actionButtonText, { color: colors.error }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {dernierePesee && (
          <View style={[styles.cardStats, { borderTopColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Dernière pesée:</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {format(new Date(dernierePesee.date), 'dd MMM yyyy', { locale: fr })}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids:</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{dernierePesee.poids_kg.toFixed(1)} kg</Text>
            </View>
            {dernierePesee.gmq && (
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GMQ:</Text>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color: dernierePesee.gmq < 0 ? colors.error : colors.success,
                    },
                  ]}
                >
                  {dernierePesee.gmq.toFixed(0)} g/j
                </Text>
              </View>
            )}
            {gmqMoyen !== null && (
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GMQ moyen:</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{gmqMoyen.toFixed(0)} g/j</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Nombre de pesées:</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{nombrePesees}</Text>
            </View>
          </View>
        )}

        {isSelected && (
          <View style={[styles.historyContainer, { borderTopColor: colors.border }]}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>Historique des pesées</Text>
            {pesees.length === 0 ? (
              <Text style={[styles.noHistoryText, { color: colors.textSecondary }]}>
                Aucune pesée enregistrée pour cet animal.
              </Text>
            ) : (
              <View style={[styles.historyList, { backgroundColor: colors.background }]}>
                {pesees.map((pesee) => (
                  <View key={pesee.id} style={[styles.historyItem, { borderBottomColor: colors.divider }]}>
                    <View style={styles.historyItemHeader}>
                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                        {format(new Date(pesee.date), 'dd MMM yyyy', { locale: fr })}
                      </Text>
                      <Text style={[styles.historyPoids, { color: colors.text }]}>
                        {pesee.poids_kg.toFixed(1)} kg
                      </Text>
                    </View>
                    {pesee.gmq && (
                      <Text style={[styles.historyGmq, { color: colors.primary }]}>
                        GMQ: {pesee.gmq.toFixed(0)} g/j
                      </Text>
                    )}
                    {pesee.commentaire && (
                      <Text style={[styles.historyComment, { color: colors.textTertiary }]}>{pesee.commentaire}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  });

  // Définir renderAnimal, ListHeader et ListFooter AVANT les retours anticipés pour éviter les problèmes de hooks
  const renderAnimal = useCallback(({ item }: { item: typeof animauxAvecStats[0] }) => {
    const isSelected = selectedAnimal?.id === item.animal.id;
    const pesees = peseesParAnimal[item.animal.id] || [];
    
    return (
      <AnimalCard
        item={item}
        isSelected={isSelected}
        pesees={pesees}
        onSelect={(animal) => setSelectedAnimal(isSelected ? null : animal)}
        onPesee={(animal) => {
          setSelectedAnimal(animal);
          setShowPeseeModal(true);
        }}
        onEdit={(animal) => {
          setSelectedAnimal(animal);
          setIsEditing(true);
          setShowAnimalModal(true);
        }}
        onDelete={handleDelete}
      />
    );
  }, [selectedAnimal, peseesParAnimal, handleDelete, setSelectedAnimal, setShowPeseeModal, setIsEditing, setShowAnimalModal]);

  const ListHeader = React.useCallback(() => (
    <>
      {/* Carte récapitulative */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, ...colors.shadow.medium }]}>
        <View style={styles.summaryHeader}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Suivi des pesées</Text>
          <Button
            title="+ Animal"
            onPress={() => {
              setSelectedAnimal(null);
              setIsEditing(false);
              setShowAnimalModal(true);
            }}
            size="small"
          />
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{animaux.filter((a) => a.actif).length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Animaux actifs</Text>
          </View>
          <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{peseesRecents.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pesées récentes</Text>
          </View>
        </View>
      </View>

      {/* Titre de la liste */}
      <View style={styles.listContainer}>
        <Text style={[styles.listTitle, { color: colors.text }]}>Mes animaux ({animaux.length})</Text>
      </View>
    </>
  ), [colors, animaux, peseesRecents.length, setSelectedAnimal, setIsEditing, setShowAnimalModal]);

  const ListFooter = React.useCallback(() => {
    if (displayedAnimals.length >= animauxAvecStats.length) {
      return null;
    }
    return (
      <View style={styles.loadingMore}>
        <LoadingSpinner message="Chargement..." />
      </View>
    );
  }, [displayedAnimals.length, animauxAvecStats.length]);

  // Retours anticipés APRÈS toutes les définitions de hooks/composants
  if (!projetActif) {
    return (
      <EmptyState
        title="Aucun projet actif"
        message="Créez ou sélectionnez un projet pour gérer vos animaux en production."
      />
    );
  }

  if (loading && animaux.length === 0) {
    return <LoadingSpinner message="Chargement des animaux..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {animaux.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ListHeader />
          <EmptyState
            title="Aucun animal enregistré"
            message="Ajoutez votre premier animal pour commencer le suivi des pesées."
            action={
              <Button
                title="Ajouter un animal"
                onPress={() => {
                  setSelectedAnimal(null);
                  setIsEditing(false);
                  setShowAnimalModal(true);
                }}
              />
            }
          />
        </View>
      ) : (
        <FlatList
          data={displayedAnimals}
          renderItem={renderAnimal}
          keyExtractor={(item) => item.animal.id}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          // Optimisations de performance
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Modals */}
      <ProductionAnimalFormModal
        visible={showAnimalModal}
        onClose={() => setShowAnimalModal(false)}
        onSuccess={() => {
          setShowAnimalModal(false);
          if (projetActif) {
            dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
          }
        }}
        projetId={projetActif?.id || ''}
        animal={isEditing ? selectedAnimal : null}
        isEditing={isEditing}
      />

      {selectedAnimal && (
        <ProductionPeseeFormModal
          visible={showPeseeModal}
          onClose={() => setShowPeseeModal(false)}
          onSuccess={() => {
            setShowPeseeModal(false);
            if (projetActif) {
              dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 20 }));
              dispatch(loadPeseesParAnimal(selectedAnimal.id));
            }
          }}
          projetId={projetActif?.id || ''}
          animal={selectedAnimal}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl + 85,
    paddingHorizontal: SPACING.xl,
  },
  emptyContainer: {
    flex: 1,
  },
  loadingMore: {
    paddingVertical: SPACING.lg,
  },
  summaryCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    margin: SPACING.xl,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  dividerVertical: {
    width: 1,
    height: '100%',
    marginHorizontal: SPACING.lg,
  },
  listContainer: {
    paddingHorizontal: SPACING.xl,
  },
  listTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  cardCode: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginRight: SPACING.xs,
  },
  cardNom: {
    fontSize: FONT_SIZES.md,
    marginRight: SPACING.xs,
  },
  inactiveBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  inactiveBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    marginLeft: SPACING.sm,
  },
  actionButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  cardStats: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  historyContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  historyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  noHistoryText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
  historyList: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  historyItem: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  historyDate: {
    fontSize: FONT_SIZES.sm,
  },
  historyPoids: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
  },
  historyGmq: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
  },
  historyComment: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
  },
});

