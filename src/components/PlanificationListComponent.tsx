/**
 * Composant liste des planifications avec filtres
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  AppState,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadPlanificationsParProjet,
  loadPlanificationsAVenir,
  deletePlanification,
  updatePlanification,
} from '../store/slices/planificationSlice';
import type {
  Planification,
  TypeTache,
  StatutTache,
} from '../types/planification';
import { TYPE_TACHE_LABELS, STATUT_TACHE_LABELS, getTachesAVenir, getTachesEnRetard } from '../types/planification';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import PlanificationFormModal from './PlanificationFormModal';
import { useActionPermissions } from '../hooks/useActionPermissions';

export default function PlanificationListComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  const { projetActif } = useAppSelector((state) => state.projet ?? { projetActif: null });
  const { planifications, planificationsAVenir, loading } = useAppSelector(
    (state) => state.planification
  );
  const [selectedPlanification, setSelectedPlanification] = useState<Planification | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filterStatut, setFilterStatut] = useState<StatutTache | 'tous'>('tous');
  const [displayedPlanifications, setDisplayedPlanifications] = useState<Planification[]>([]);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const ITEMS_PER_PAGE = 50;
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Fonction pour charger les planifications
  const loadPlanifications = useCallback(async () => {
    if (!projetActif?.id) return;

    try {
      await Promise.all([
        dispatch(loadPlanificationsParProjet(projetActif.id)).unwrap(),
        dispatch(loadPlanificationsAVenir({ projetId: projetActif.id, jours: 7 })).unwrap(),
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des planifications:', error);
    }
  }, [dispatch, projetActif?.id]);

  // Chargement initial
  useEffect(() => {
    if (projetActif) {
      loadPlanifications();
    }
  }, [dispatch, projetActif?.id, loadPlanifications]);

  // Synchronisation automatique toutes les 30 secondes quand l'app est active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // L'app revient au premier plan, recharger immédiatement
        if (projetActif?.id) {
          loadPlanifications();
        }
      }
      appStateRef.current = nextAppState;
    });

    // Démarrer le polling si l'app est active
    if (projetActif?.id) {
      syncIntervalRef.current = setInterval(() => {
        if (appStateRef.current === 'active') {
          loadPlanifications();
        }
      }, 30000); // 30 secondes
    }

    return () => {
      subscription.remove();
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [projetActif?.id, loadPlanifications]);

  // Fonction de refresh manuel
  const onRefresh = useCallback(async () => {
    if (!projetActif?.id) return;

    setRefreshing(true);
    try {
      await loadPlanifications();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [projetActif?.id, loadPlanifications]);

  const planificationsFiltrees = useMemo(() => {
    if (!planifications || !Array.isArray(planifications)) return [];
    if (filterStatut === 'tous') {
      return planifications;
    }
    return planifications.filter((p) => p.statut === filterStatut);
  }, [planifications, filterStatut]);

  const tachesAVenir = useMemo(() => {
    if (!planifications || !Array.isArray(planifications)) return [];
    return getTachesAVenir(planifications);
  }, [planifications]);

  const tachesEnRetard = useMemo(() => {
    if (!planifications || !Array.isArray(planifications)) return [];
    return getTachesEnRetard(planifications);
  }, [planifications]);

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
    if (!canUpdate('planification')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de modifier les planifications."
      );
      return;
    }
    setSelectedPlanification(planification);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    if (!canDelete('planification')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de supprimer les planifications."
      );
      return;
    }
    Alert.alert('Supprimer la planification', 'Êtes-vous sûr de vouloir supprimer cette tâche ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await dispatch(deletePlanification(id));
          // Recharger les planifications après suppression
          loadPlanifications();
        },
      },
    ]);
  };

  const handleMarquerTerminee = (planification: Planification) => {
    if (!canUpdate('planification')) {
      Alert.alert(
        'Permission refusée',
        "Vous n'avez pas la permission de modifier les planifications."
      );
      return;
    }
    Alert.alert('Marquer comme terminée', 'Confirmez que cette tâche est terminée ?', [
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
          // Recharger les planifications après mise à jour
          loadPlanifications();
        },
      },
    ]);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedPlanification(null);
    setIsEditing(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    // Recharger les planifications après création/modification
    loadPlanifications();
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
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.divider },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Planification</Text>
        {canCreate('planification') && (
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
        )}
      </View>

      {/* Alertes */}
      {(tachesEnRetard.length > 0 || tachesAVenir.length > 0) && (
        <View style={styles.alertsContainer}>
          {tachesEnRetard.length > 0 && (
            <View
              style={[
                styles.alertCard,
                {
                  backgroundColor: colors.surface,
                  borderLeftColor: colors.error,
                  ...colors.shadow.small,
                },
              ]}
            >
              <Text style={[styles.alertTitle, { color: colors.text }]}>
                ⚠️ {tachesEnRetard.length} tâche(s) en retard
              </Text>
            </View>
          )}
          {tachesAVenir.length > 0 && (
            <View
              style={[
                styles.alertCard,
                {
                  backgroundColor: colors.surface,
                  borderLeftColor: colors.warning,
                  ...colors.shadow.small,
                },
              ]}
            >
              <Text style={[styles.alertTitle, { color: colors.text }]}>
                📅 {tachesAVenir.length} tâche(s) à venir (7 jours)
              </Text>
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
          style={styles.flatList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item: planification }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  ...colors.shadow.medium,
                  ...(isEnRetard(planification) && {
                    borderLeftWidth: 4,
                    borderLeftColor: colors.error,
                  }),
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
                      {TYPE_TACHE_LABELS[planification.type]}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statutBadge,
                      { backgroundColor: getStatutColor(planification.statut) },
                    ]}
                  >
                    <Text style={[styles.statutBadgeText, { color: colors.textOnPrimary }]}>
                      {STATUT_TACHE_LABELS[planification.statut]}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {planification.statut !== 'terminee' && canUpdate('planification') && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => handleMarquerTerminee(planification)}
                    >
                      <Text style={styles.actionButtonText}>✓</Text>
                    </TouchableOpacity>
                  )}
                  {canUpdate('planification') && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => handleEdit(planification)}
                    >
                      <Text style={styles.actionButtonText}>✏️</Text>
                    </TouchableOpacity>
                  )}
                  {canDelete('planification') && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => handleDelete(planification.id)}
                    >
                      <Text style={styles.actionButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.titreText, { color: colors.text }]}>
                  {planification.titre}
                </Text>
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  📅 {formatDate(planification.date_prevue)}
                  {planification.date_echeance && ` → ${formatDate(planification.date_echeance)}`}
                </Text>
                {planification.description && (
                  <Text style={[styles.descriptionText, { color: colors.text }]}>
                    {planification.description}
                  </Text>
                )}
                {planification.recurrence && planification.recurrence !== 'aucune' && (
                  <Text style={[styles.recurrenceText, { color: colors.textSecondary }]}>
                    🔄 Récurrence: {planification.recurrence}
                  </Text>
                )}
                {planification.notes && (
                  <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                    {planification.notes}
                  </Text>
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
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 32,
  },
  addButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  alertsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  alertCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
  },
  alertTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  filtersContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
    borderWidth: 1.5,
    minHeight: 32,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.xs,
  },
  flatList: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  card: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.xs,
  },
  typeBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  statutBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
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
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
  },
  cardContent: {
    marginTop: SPACING.xs,
  },
  titreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  descriptionText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  recurrenceText: {
    fontSize: FONT_SIZES.xs,
    marginBottom: 2,
  },
  notesText: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
  },
});
