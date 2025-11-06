/**
 * Composant liste des planifications avec filtres
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadPlanificationsParProjet,
  loadPlanificationsAVenir,
  deletePlanification,
  updatePlanification,
} from '../store/slices/planificationSlice';
import { Planification, TypeTache, StatutTache, TYPE_TACHE_LABELS, STATUT_TACHE_LABELS, getTachesAVenir, getTachesEnRetard } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import PlanificationFormModal from './PlanificationFormModal';

export default function PlanificationListComponent() {
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { planifications, planificationsAVenir, loading } = useAppSelector((state) => state.planification);
  const [selectedPlanification, setSelectedPlanification] = useState<Planification | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filterStatut, setFilterStatut] = useState<StatutTache | 'tous'>('tous');

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
        return COLORS.warning;
      case 'en_cours':
        return COLORS.primary;
      case 'terminee':
        return COLORS.success;
      case 'annulee':
        return COLORS.textSecondary;
      default:
        return COLORS.textSecondary;
    }
  };

  const getTypeColor = (type: TypeTache) => {
    switch (type) {
      case 'saillie':
        return COLORS.primary;
      case 'vaccination':
        return COLORS.warning;
      case 'sevrage':
        return COLORS.success;
      case 'nettoyage':
        return COLORS.textSecondary;
      case 'alimentation':
        return COLORS.primary;
      case 'veterinaire':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Planification</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedPlanification(null);
            setIsEditing(false);
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Alertes */}
      {(tachesEnRetard.length > 0 || tachesAVenir.length > 0) && (
        <View style={styles.alertsContainer}>
          {tachesEnRetard.length > 0 && (
            <View style={[styles.alertCard, { borderLeftColor: COLORS.error }]}>
              <Text style={styles.alertTitle}>⚠️ {tachesEnRetard.length} tâche(s) en retard</Text>
            </View>
          )}
          {tachesAVenir.length > 0 && (
            <View style={[styles.alertCard, { borderLeftColor: COLORS.warning }]}>
              <Text style={styles.alertTitle}>📅 {tachesAVenir.length} tâche(s) à venir (7 jours)</Text>
            </View>
          )}
        </View>
      )}

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['tous', 'a_faire', 'en_cours', 'terminee'] as const).map((statut) => (
            <TouchableOpacity
              key={statut}
              style={[
                styles.filterButton,
                filterStatut === statut && styles.filterButtonActive,
              ]}
              onPress={() => setFilterStatut(statut)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterStatut === statut && styles.filterButtonTextActive,
                ]}
              >
                {statut === 'tous' ? 'Tous' : STATUT_TACHE_LABELS[statut as StatutTache]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des planifications */}
      <ScrollView style={styles.listContainer}>
        {planificationsFiltrees.length === 0 ? (
          <EmptyState
            title="Aucune planification"
            message="Ajoutez une tâche pour commencer la planification"
          />
        ) : (
          planificationsFiltrees.map((planification) => (
            <View
              key={planification.id}
              style={[
                styles.card,
                isEnRetard(planification) && styles.cardRetard,
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
                    <Text style={styles.typeBadgeText}>
                      {TYPE_TACHE_LABELS[planification.type as TypeTache]}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statutBadge,
                      { backgroundColor: getStatutColor(planification.statut) },
                    ]}
                  >
                    <Text style={styles.statutBadgeText}>
                      {STATUT_TACHE_LABELS[planification.statut as StatutTache]}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {planification.statut !== 'terminee' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleMarquerTerminee(planification)}
                    >
                      <Text style={styles.actionButtonText}>✓</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(planification)}
                  >
                    <Text style={styles.actionButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(planification.id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.titreText}>{planification.titre}</Text>
                <Text style={styles.dateText}>
                  📅 {formatDate(planification.date_prevue)}
                  {planification.date_echeance &&
                    ` → ${formatDate(planification.date_echeance)}`}
                </Text>
                {planification.description && (
                  <Text style={styles.descriptionText}>{planification.description}</Text>
                )}
                {planification.recurrence && planification.recurrence !== 'aucune' && (
                  <Text style={styles.recurrenceText}>
                    🔄 Récurrence: {planification.recurrence}
                  </Text>
                )}
                {planification.notes && (
                  <Text style={styles.notesText}>{planification.notes}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...COLORS.shadow.small,
    minHeight: 44,
  },
  addButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  alertsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  alertCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    ...COLORS.shadow.small,
  },
  alertTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  filtersContainer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  filterButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    marginRight: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minHeight: 40,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...COLORS.shadow.medium,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardRetard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
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
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  statutBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  statutBadgeText: {
    color: COLORS.textOnPrimary,
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
    backgroundColor: COLORS.surfaceVariant,
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
    color: COLORS.text,
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },
  dateText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  descriptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  recurrenceText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});

