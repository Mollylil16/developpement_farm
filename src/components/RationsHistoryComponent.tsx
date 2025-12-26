/**
 * Composant historique des rations
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadRations, deleteRation } from '../store/slices/nutritionSlice';
import type { Ration, IngredientRation } from '../types/nutrition';
import { getTypePorcLabel } from '../types/nutrition';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import { useActionPermissions } from '../hooks/useActionPermissions';

export default function RationsHistoryComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canDelete } = useActionPermissions();
  const { rations, loading } = useAppSelector((state) => state.nutrition);
  const [displayedRations, setDisplayedRations] = useState<Ration[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const { projetActif } = useAppSelector((state) => state.projet);

  useEffect(() => {
    if (projetActif) {
      dispatch(loadRations(projetActif.id));
    }
  }, [dispatch, projetActif?.id]);

  // Pagination: charger les premières rations
  useEffect(() => {
    const initial = rations.slice(0, ITEMS_PER_PAGE);
    setDisplayedRations(initial);
    setPage(1);
  }, [rations.length]);

  // Charger plus de rations
  const loadMore = useCallback(() => {
    if (displayedRations.length >= rations.length) {
      return;
    }

    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = rations.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedRations((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    }
  }, [page, displayedRations.length, rations]);

  const handleDelete = (id: string) => {
    if (!canDelete('nutrition')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de supprimer les rations.");
      return;
    }
    Alert.alert('Supprimer la ration', 'Êtes-vous sûr de vouloir supprimer cette ration ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => dispatch(deleteRation(id)),
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <LoadingSpinner message="Chargement des rations..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Historique des Rations</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {rations.length} ration{rations.length > 1 ? 's' : ''}
        </Text>
      </View>

      {rations.length === 0 ? (
        <EmptyState
          title="Aucune ration enregistrée"
          message="Les rations calculées seront enregistrées ici"
        />
      ) : (
        <FlatList
          data={displayedRations}
          renderItem={({ item: ration }) => (
            <View
              style={[styles.card, { backgroundColor: colors.surface, ...colors.shadow.small }]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {getTypePorcLabel(ration.type_porc)}
                  </Text>
                  <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                    {formatDate(ration.date_creation)}
                  </Text>
                </View>
                {canDelete('nutrition') && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(ration.id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Poids:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {ration.poids_kg} kg
                  </Text>
                </View>
                {ration.nombre_porcs && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Nombre de porcs:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {ration.nombre_porcs}
                    </Text>
                  </View>
                )}
                {ration.cout_total && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Coût total:
                    </Text>
                    <Text style={[styles.infoValue, styles.amount, { color: colors.primary }]}>
                      {formatAmount(ration.cout_total)}
                    </Text>
                  </View>
                )}
                {ration.cout_par_kg && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Coût par kg:
                    </Text>
                    <Text style={[styles.infoValue, styles.amount, { color: colors.primary }]}>
                      {formatAmount(ration.cout_par_kg)}
                    </Text>
                  </View>
                )}

                {ration.ingredients && ration.ingredients.length > 0 && (
                  <View style={[styles.ingredientsSection, { borderTopColor: colors.border }]}>
                    <Text style={[styles.ingredientsTitle, { color: colors.text }]}>
                      Ingrédients:
                    </Text>
                    {ration.ingredients.map((ing: IngredientRation, index: number) => (
                      <View key={index} style={styles.ingredientItem}>
                        <Text style={[styles.ingredientText, { color: colors.text }]}>
                          • {ing.ingredient?.nom || 'Inconnu'}: {ing.quantite}{' '}
                          {ing.ingredient?.unite || ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {ration.notes && (
                  <View style={[styles.notesContainer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes:</Text>
                    <Text style={[styles.notesText, { color: colors.text }]}>{ration.notes}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
          // Optimisations de performance
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          ListFooterComponent={
            displayedRations.length < rations.length ? (
              <LoadingSpinner message="Chargement..." />
            ) : null
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.lg + 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100, // Espace pour la barre de navigation
  },
  card: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  cardDate: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
  },
  cardContent: {
    marginTop: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
  },
  amount: {
    fontWeight: 'bold',
  },
  ingredientsSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  ingredientsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  ingredientItem: {
    marginBottom: SPACING.xs,
  },
  ingredientText: {
    fontSize: FONT_SIZES.sm,
  },
  notesContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  notesLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
});
