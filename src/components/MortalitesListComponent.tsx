/**
 * Composant liste des mortalités avec statistiques
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadMortalitesParProjet,
  loadStatistiquesMortalite,
  deleteMortalite,
} from '../store/slices/mortalitesSlice';
import { Mortalite, CategorieMortalite } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import MortalitesFormModal from './MortalitesFormModal';
import StatCard from './StatCard';

export default function MortalitesListComponent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { mortalites, statistiques, loading } = useAppSelector((state) => state.mortalites);
  const [selectedMortalite, setSelectedMortalite] = useState<Mortalite | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayedMortalites, setDisplayedMortalites] = useState<Mortalite[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    if (projetActif) {
      dispatch(loadMortalitesParProjet(projetActif.id));
      dispatch(loadStatistiquesMortalite(projetActif.id));
    }
  }, [dispatch, projetActif]);

  // Pagination: charger les premières mortalités
  useEffect(() => {
    const initial = mortalites.slice(0, ITEMS_PER_PAGE);
    setDisplayedMortalites(initial);
    setPage(1);
  }, [mortalites.length]);

  // Charger plus de mortalités
  const loadMore = useCallback(() => {
    if (displayedMortalites.length >= mortalites.length) {
      return;
    }

    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = mortalites.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedMortalites((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    }
  }, [page, displayedMortalites.length, mortalites]);

  const handleEdit = (mortalite: Mortalite) => {
    setSelectedMortalite(mortalite);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Supprimer la mortalité',
      'Êtes-vous sûr de vouloir supprimer cette entrée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await dispatch(deleteMortalite(id));
            if (projetActif) {
              dispatch(loadMortalitesParProjet(projetActif.id));
              dispatch(loadStatistiquesMortalite(projetActif.id));
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMortalite(null);
    setIsEditing(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    if (projetActif) {
      dispatch(loadMortalitesParProjet(projetActif.id));
      dispatch(loadStatistiquesMortalite(projetActif.id));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getCategorieLabel = (categorie: CategorieMortalite) => {
    switch (categorie) {
      case 'porcelet':
        return 'Porcelet';
      case 'truie':
        return 'Truie';
      case 'verrat':
        return 'Verrat';
      case 'autre':
        return 'Autre';
      default:
        return categorie;
    }
  };

  const getCategorieColor = (categorie: CategorieMortalite) => {
    switch (categorie) {
      case 'porcelet':
        return colors.warning;
      case 'truie':
        return colors.error;
      case 'verrat':
        return colors.error;
      case 'autre':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  if (!projetActif) {
    return (
      <View style={styles.container}>
        <EmptyState title="Aucun projet actif" message="Créez un projet pour commencer" />
      </View>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Chargement des mortalités..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider, paddingTop: insets.top + SPACING.lg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Mortalités</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setSelectedMortalite(null);
            setIsEditing(false);
            setModalVisible(true);
          }}
        >
          <Text style={[styles.addButtonText, { color: colors.textOnPrimary }]}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      {statistiques && (
        <View style={styles.statsContainer}>
          <StatCard
            value={statistiques.total_morts}
            label="Total morts"
            valueColor={colors.error}
            style={{ marginRight: SPACING.sm }}
          />
          <StatCard
            value={statistiques.taux_mortalite.toFixed(1)}
            label="Taux de mortalité"
            unit="%"
            valueColor={
              statistiques.taux_mortalite > 5 ? colors.error : colors.success
            }
            style={{ marginLeft: SPACING.sm }}
          />
        </View>
      )}

      {/* Liste des mortalités */}
      {mortalites.length === 0 ? (
        <View style={styles.listContainer}>
          <EmptyState
            title="Aucune mortalité enregistrée"
            message="Ajoutez une mortalité pour commencer le suivi"
          />
        </View>
      ) : (
        <FlatList
          data={displayedMortalites}
          renderItem={({ item: mortalite }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...colors.shadow.medium }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.categorieBadge,
                      { backgroundColor: getCategorieColor(mortalite.categorie) },
                    ]}
                  >
                    <Text style={[styles.categorieBadgeText, { color: colors.textOnPrimary }]}>
                      {getCategorieLabel(mortalite.categorie)}
                    </Text>
                  </View>
                  <Text style={[styles.dateText, { marginLeft: SPACING.sm, color: colors.textSecondary }]}>
                    {formatDate(mortalite.date)}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => handleEdit(mortalite)}
                  >
                    <Text style={styles.actionButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => handleDelete(mortalite.id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.nombreText, { color: colors.text }]}>
                  {mortalite.nombre_porcs} porc{mortalite.nombre_porcs > 1 ? 's' : ''}
                </Text>
                {mortalite.cause && (
                  <Text style={[styles.causeText, { color: colors.textSecondary }]}>Cause: {mortalite.cause}</Text>
                )}
                {mortalite.notes && (
                  <Text style={[styles.notesText, { color: colors.textSecondary }]}>{mortalite.notes}</Text>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          // Optimisations de performance
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          ListFooterComponent={
            displayedMortalites.length < mortalites.length ? (
              <LoadingSpinner message="Chargement..." />
            ) : null
          }
        />
      )}

      {/* Modal de formulaire */}
      <MortalitesFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        mortalite={selectedMortalite}
        isEditing={isEditing}
      />
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 44,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categorieBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  categorieBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
  },
  cardContent: {
    marginTop: SPACING.xs,
  },
  nombreText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  causeText: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
});

