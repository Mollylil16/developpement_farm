/**
 * Composant liste des gestations avec alertes
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadGestations,
  loadGestationsEnCours,
  deleteGestation,
  updateGestation,
} from '../store/slices/reproductionSlice';
import { Gestation } from '../types';
import { doitGenererAlerte, joursRestantsAvantMiseBas } from '../types/reproduction';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import GestationFormModal from './GestationFormModal';
import StatCard from './StatCard';

export default function GestationsListComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { gestations, loading } = useAppSelector((state) => state.reproduction);
  const [selectedGestation, setSelectedGestation] = useState<Gestation | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayedGestations, setDisplayedGestations] = useState<Gestation[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const { projetActif } = useAppSelector((state) => state.projet);

  useEffect(() => {
    if (projetActif) {
      dispatch(loadGestations(projetActif.id));
      dispatch(loadGestationsEnCours(projetActif.id));
    }
  }, [dispatch, projetActif?.id]);

  const gestationsEnCours = useMemo(
    () => gestations.filter((g) => g.statut === 'en_cours'),
    [gestations]
  );

  const alertes = useMemo(() => {
    return gestationsEnCours.filter((g) => doitGenererAlerte(g.date_mise_bas_prevue));
  }, [gestationsEnCours]);

  // Pagination: charger les premières gestations
  useEffect(() => {
    const initial = gestations.slice(0, ITEMS_PER_PAGE);
    setDisplayedGestations(initial);
    setPage(1);
  }, [gestations.length]);

  // Charger plus de gestations
  const loadMore = useCallback(() => {
    if (displayedGestations.length >= gestations.length) {
      return;
    }

    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = gestations.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedGestations((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    }
  }, [page, displayedGestations.length, gestations]);

  const handleEdit = (gestation: Gestation) => {
    setSelectedGestation(gestation);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Supprimer la gestation',
      'Êtes-vous sûr de vouloir supprimer cette gestation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => dispatch(deleteGestation(id)),
        },
      ]
    );
  };

  const handleMarquerTerminee = (gestation: Gestation) => {
    Alert.alert(
      'Marquer comme terminée',
      'Confirmez que la mise bas a eu lieu ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            dispatch(
              updateGestation({
                id: gestation.id,
                updates: {
                  statut: 'terminee',
                  date_mise_bas_reelle: new Date().toISOString().split('T')[0],
                },
              })
            );
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedGestation(null);
    setIsEditing(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    if (projetActif) {
      dispatch(loadGestations(projetActif.id));
      dispatch(loadGestationsEnCours(projetActif.id));
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

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'en_cours':
        return colors.success;
      case 'terminee':
        return colors.textSecondary;
      case 'annulee':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'en_cours':
        return 'En cours';
      case 'terminee':
        return 'Terminée';
      case 'annulee':
        return 'Annulée';
      default:
        return statut;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Chargement des gestations..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestations</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedGestation(null);
            setIsEditing(false);
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Nouvelle</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
        <StatCard
          value={gestationsEnCours.length}
          label="En cours"
          valueColor={colors.primary}
        />
        <StatCard
          value={alertes.length}
          label="Alertes"
          valueColor={colors.warning}
        />
        <StatCard
          value={gestations.filter((g) => g.statut === 'terminee').length}
          label="Terminées"
          valueColor={colors.textSecondary}
        />
      </View>

      {/* Alertes */}
      {alertes.length > 0 && (
        <View style={[styles.alertesContainer, { backgroundColor: colors.warning + '20' }]}>
          <Text style={[styles.alertesTitle, { color: colors.text }]}>🔔 Alertes</Text>
          {alertes.map((gestation) => {
            const joursRestants = joursRestantsAvantMiseBas(gestation.date_mise_bas_prevue);
            return (
              <View key={gestation.id} style={[styles.alerteCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.alerteText, { color: colors.warning }]}>
                  ⚠️ Mise bas prévue dans {joursRestants} jour{joursRestants > 1 ? 's' : ''} pour{' '}
                  {gestation.truie_nom || gestation.truie_id}
                </Text>
                <Text style={[styles.alerteDate, { color: colors.textSecondary }]}>
                  Date prévue: {formatDate(gestation.date_mise_bas_prevue)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {gestations.length === 0 ? (
        <EmptyState
          title="Aucune gestation enregistrée"
          message="Ajoutez votre première gestation pour commencer"
          action={
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setSelectedGestation(null);
                setIsEditing(false);
                setModalVisible(true);
              }}
            >
              <Text style={[styles.addButtonText, { color: colors.textOnPrimary }]}>+ Nouvelle gestation</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <FlatList
          data={displayedGestations}
          renderItem={({ item: gestation }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, ...colors.shadow.small }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {gestation.truie_nom || gestation.truie_id}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(gestation.statut), marginLeft: SPACING.sm }]}>
                    <Text style={[styles.statusText, { color: colors.textOnPrimary }]}>{getStatusLabel(gestation.statut)}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {gestation.statut === 'en_cours' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleMarquerTerminee(gestation)}
                    >
                      <Text style={styles.actionButtonText}>✓</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, gestation.statut === 'en_cours' ? { marginLeft: SPACING.xs } : {}]}
                    onPress={() => handleEdit(gestation)}
                  >
                    <Text style={styles.actionButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { marginLeft: SPACING.xs }]}
                    onPress={() => handleDelete(gestation.id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date de sautage:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(gestation.date_sautage)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Mise bas prévue:</Text>
                  <Text style={[styles.infoValue, styles.highlight, { color: colors.primary }]}>
                    {formatDate(gestation.date_mise_bas_prevue)}
                  </Text>
                </View>
                {gestation.date_mise_bas_reelle && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Mise bas réelle:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {formatDate(gestation.date_mise_bas_reelle)}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Porcelets prévus:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{gestation.nombre_porcelets_prevu}</Text>
                </View>
                {gestation.nombre_porcelets_reel && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Porcelets réels:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{gestation.nombre_porcelets_reel}</Text>
                  </View>
                )}
                {gestation.statut === 'en_cours' && (
                  <View style={[styles.daysRemaining, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.daysRemainingText, { color: colors.primary }]}>
                      {joursRestantsAvantMiseBas(gestation.date_mise_bas_prevue)} jour
                      {joursRestantsAvantMiseBas(gestation.date_mise_bas_prevue) > 1 ? 's' : ''}{' '}
                      restant{joursRestantsAvantMiseBas(gestation.date_mise_bas_prevue) > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                {gestation.notes && (
                  <View style={[styles.notesContainer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes:</Text>
                    <Text style={[styles.notesText, { color: colors.text }]}>{gestation.notes}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
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
          ListFooterComponent={
            displayedGestations.length < gestations.length ? (
              <LoadingSpinner message="Chargement..." />
            ) : null
          }
        />
      )}

      <GestationFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        gestation={selectedGestation}
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
    padding: SPACING.lg,
    paddingTop: SPACING.md + 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  alertesContainer: {
    padding: SPACING.md,
  },
  alertesTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  alerteCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  alerteText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  alerteDate: {
    fontSize: FONT_SIZES.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
  },
  card: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
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
  highlight: {
    fontWeight: 'bold',
  },
  daysRemaining: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  daysRemainingText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    textAlign: 'center',
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

