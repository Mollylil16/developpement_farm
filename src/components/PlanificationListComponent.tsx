/**
 * Composant liste des planifications avec filtres
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadPlanificationsParProjet,
  loadPlanificationsAVenir,
  deletePlanification,
  updatePlanification,
} from '../store/slices/planificationSlice';
import { Planification, TypeTache, StatutTache, TYPE_TACHE_LABELS, STATUT_TACHE_LABELS, getTachesAVenir, getTachesEnRetard } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import PlanificationFormModal from './PlanificationFormModal';

export default function PlanificationListComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { planifications, planificationsAVenir, loading } = useAppSelector((state) => state.planification);
  const [selectedPlanification, setSelectedPlanification] = useState<Planification | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filterStatut, setFilterStatut] = useState<StatutTache | 'tous'>('tous');
  const [displayedPlanifications, setDisplayedPlanifications] = useState<Planification[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    if (projetActif) {
      dispatch(loadPlanificationsParProjet(projetActif.id));
      dispatch(loadPlanificationsAVenir({ projetId: projetActif.id, jours: 7 }));
    }
  }, [dispatch, projetActif]);

  const planificationsFiltrees = useMemo(() => {
    if (filterStatut === 'tous') {
      return planifications;
    }
    return planifications.filter((p) => p.statut === filterStatut);
  }, [planifications, filterStatut]);

  const tachesAVenir = useMemo(() => getTachesAVenir(planifications), [planifications]);
  const tachesEnRetard = useMemo(() => getTachesEnRetard(planifications), [planifications]);

  // Pagination: charger les premières planifications filtrées
  useEffect(() => {
    const initial = planificationsFiltrees.slice(0, ITEMS_PER_PAGE);
    setDisplayedPlanifications(initial);
    setPage(1);
  }, [planificationsFiltrees.length, filterStatut]); // Reset quand le filtre ou le nombre change

  // Charger plus de planifications
  const loadMore = useCallback(() => {
    if (displayedPlanifications.length >= planificationsFiltrees.length) {
      return;
    }

    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = planificationsFiltrees.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedPlanifications((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    }
  }, [page, displayedPlanifications.length, planificationsFiltrees]);

  const handleEdit = (planification: Planification) => {
    setSelectedPlanification(planification);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Supprimer la planification',
      'Êtes-vous sûr de vouloir supprimer cette tâche ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await dispatch(deletePlanification(id));
            if (projetActif) {
              dispatch(loadPlanificationsParProjet(projetActif.id));
              dispatch(loadPlanificationsAVenir({ projetId: projetActif.id, jours: 7 }));
            }
          },
        },
      ]
    );
  };

  const handleMarquerTerminee = (planification: Planification) => {
    Alert.alert(
      'Marquer comme terminée',
      'Confirmez que cette tâche est terminée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            await dispatch(
              updatePlanification({
                id: planification.id,
                updates: { statut: 'terminee' },
              })
            );
            if (projetActif) {
              dispatch(loadPlanificationsParProjet(projetActif.id));
              dispatch(loadPlanificationsAVenir({ projetId: projetActif.id, jours: 7 }));
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedPlanification(null);
    setIsEditing(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    if (projetActif) {
      dispatch(loadPlanificationsParProjet(projetActif.id));
      dispatch(loadPlanificationsAVenir({ projetId: projetActif.id, jours: 7 }));
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

  const getStatutColor = (statut: StatutTache) => {
    switch (statut) {
      case 'a_faire':
        return colors.warning;
      case 'en_cours':
        return colors.primary;
      case 'terminee':
        return colors.success;
      case 'annulee':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getTypeColor = (type: TypeTache) => {
    switch (type) {
      case 'saillie':
        return colors.primary;
      case 'vaccination':
        return colors.warning;
      case 'sevrage':
        return colors.success;
      case 'nettoyage':
        return colors.textSecondary;
      case 'alimentation':
        return colors.primary;
      case 'veterinaire':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const isEnRetard = (planification: Planification) => {
    const datePrevue = new Date(planification.date_prevue);
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    datePrevue.setHours(0, 0, 0, 0);
    return (
      datePrevue < aujourdhui &&
      (planification.statut === 'a_faire' || planification.statut === 'en_cours')
    );
  };

  if (!projetActif) {
    return (
      <View style={styles.container}>
        <EmptyState title="Aucun projet actif" message="Créez un projet pour commencer" />
      </View>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Chargement des planifications..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <Text style={[styles.title, { color: colors.text }]}>Planification</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary, ...colors.shadow.small }]}
          onPress={() => {
            setSelectedPlanification(null);
            setIsEditing(false);
            setModalVisible(true);
          }}
        >
          <Text style={[styles.addButtonText, { color: colors.textOnPrimary }]}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Alertes */}
      {(tachesEnRetard.length > 0 || tachesAVenir.length > 0) && (
        <View style={styles.alertsContainer}>
          {tachesEnRetard.length > 0 && (
            <View style={[styles.alertCard, { backgroundColor: colors.surface, borderLeftColor: colors.error, ...colors.shadow.small }]}>
              <Text style={[styles.alertTitle, { color: colors.text }]}>⚠️ {tachesEnRetard.length} tâche(s) en retard</Text>
            </View>
          )}
          {tachesAVenir.length > 0 && (
            <View style={[styles.alertCard, { backgroundColor: colors.surface, borderLeftColor: colors.warning, ...colors.shadow.small }]}>
              <Text style={[styles.alertTitle, { color: colors.text }]}>📅 {tachesAVenir.length} tâche(s) à venir (7 jours)</Text>
            </View>
          )}
        </View>
      )}

      {/* Filtres */}
      <View style={[styles.filtersContainer, { borderBottomColor: colors.divider }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['tous', 'a_faire', 'en_cours', 'terminee'] as const).map((statut) => (
            <TouchableOpacity
              key={statut}
              style={[
                styles.filterButton,
                {
                  backgroundColor: filterStatut === statut ? colors.primary : colors.surface,
                  borderColor: filterStatut === statut ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilterStatut(statut)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color: filterStatut === statut ? colors.textOnPrimary : colors.text,
                    fontWeight: filterStatut === statut ? '600' : 'normal',
                  },
                ]}
              >
                {statut === 'tous' ? 'Tous' : STATUT_TACHE_LABELS[statut as StatutTache]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des planifications */}
      {planificationsFiltrees.length === 0 ? (
        <View style={styles.listContainer}>
          <EmptyState
            title="Aucune planification"
            message="Ajoutez une tâche pour commencer la planification"
          />
        </View>
      ) : (
        <FlatList
          data={displayedPlanifications}
          renderItem={({ item: planification }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  ...colors.shadow.medium,
                  ...(isEnRetard(planification) && { borderLeftWidth: 4, borderLeftColor: colors.error }),
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: getTypeColor(planification.type) },
                    ]}
                  >
                    <Text style={[styles.typeBadgeText, { color: colors.textOnPrimary }]}>
                      {TYPE_TACHE_LABELS[planification.type as TypeTache]}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statutBadge,
                      { backgroundColor: getStatutColor(planification.statut) },
                    ]}
                  >
                    <Text style={[styles.statutBadgeText, { color: colors.textOnPrimary }]}>
                      {STATUT_TACHE_LABELS[planification.statut as StatutTache]}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {planification.statut !== 'terminee' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => handleMarquerTerminee(planification)}
                    >
                      <Text style={styles.actionButtonText}>✓</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => handleEdit(planification)}
                  >
                    <Text style={styles.actionButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => handleDelete(planification.id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.titreText, { color: colors.text }]}>{planification.titre}</Text>
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  📅 {formatDate(planification.date_prevue)}
                  {planification.date_echeance &&
                    ` → ${formatDate(planification.date_echeance)}`}
                </Text>
                {planification.description && (
                  <Text style={[styles.descriptionText, { color: colors.text }]}>{planification.description}</Text>
                )}
                {planification.recurrence && planification.recurrence !== 'aucune' && (
                  <Text style={[styles.recurrenceText, { color: colors.textSecondary }]}>
                    🔄 Récurrence: {planification.recurrence}
                  </Text>
                )}
                {planification.notes && (
                  <Text style={[styles.notesText, { color: colors.textSecondary }]}>{planification.notes}</Text>
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
            displayedPlanifications.length < planificationsFiltrees.length ? (
              <LoadingSpinner message="Chargement..." />
            ) : null
          }
        />
      )}

      {/* Modal de formulaire */}
      <PlanificationFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        planification={selectedPlanification}
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
  alertsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  alertCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
  },
  alertTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  filtersContainer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
  },
  filterButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
    borderWidth: 1.5,
    minHeight: 40,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
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
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
  },
  typeBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  statutBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  statutBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
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
    marginTop: SPACING.sm,
  },
  titreText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },
  dateText: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.sm,
  },
  descriptionText: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  recurrenceText: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
});

