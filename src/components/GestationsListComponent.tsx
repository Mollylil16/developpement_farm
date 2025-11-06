/**
 * Composant liste des gestations avec alertes
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadGestations,
  loadGestationsEnCours,
  deleteGestation,
  updateGestation,
} from '../store/slices/reproductionSlice';
import { Gestation } from '../types';
import { doitGenererAlerte, joursRestantsAvantMiseBas } from '../types/reproduction';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import GestationFormModal from './GestationFormModal';
import StatCard from './StatCard';

export default function GestationsListComponent() {
  const dispatch = useAppDispatch();
  const { gestations, loading } = useAppSelector((state) => state.reproduction);
  const [selectedGestation, setSelectedGestation] = useState<Gestation | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    dispatch(loadGestations());
    dispatch(loadGestationsEnCours());
  }, [dispatch]);

  const gestationsEnCours = useMemo(
    () => gestations.filter((g) => g.statut === 'en_cours'),
    [gestations]
  );

  const alertes = useMemo(() => {
    return gestationsEnCours.filter((g) => doitGenererAlerte(g.date_mise_bas_prevue));
  }, [gestationsEnCours]);

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
    dispatch(loadGestations());
    dispatch(loadGestationsEnCours());
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
        return COLORS.success;
      case 'terminee':
        return COLORS.textSecondary;
      case 'annulee':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
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
      <View style={styles.statsContainer}>
        <StatCard
          value={gestationsEnCours.length}
          label="En cours"
          valueColor={COLORS.primary}
        />
        <StatCard
          value={alertes.length}
          label="Alertes"
          valueColor={COLORS.warning}
        />
        <StatCard
          value={gestations.filter((g) => g.statut === 'terminee').length}
          label="Terminées"
          valueColor={COLORS.textSecondary}
        />
      </View>

      {/* Alertes */}
      {alertes.length > 0 && (
        <View style={styles.alertesContainer}>
          <Text style={styles.alertesTitle}>🔔 Alertes</Text>
          {alertes.map((gestation) => {
            const joursRestants = joursRestantsAvantMiseBas(gestation.date_mise_bas_prevue);
            return (
              <View key={gestation.id} style={styles.alerteCard}>
                <Text style={styles.alerteText}>
                  ⚠️ Mise bas prévue dans {joursRestants} jour{joursRestants > 1 ? 's' : ''} pour{' '}
                  {gestation.truie_nom || gestation.truie_id}
                </Text>
                <Text style={styles.alerteDate}>
                  Date prévue: {formatDate(gestation.date_mise_bas_prevue)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {gestations.length === 0 ? (
          <EmptyState
            title="Aucune gestation enregistrée"
            message="Ajoutez votre première gestation pour commencer"
            action={
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setSelectedGestation(null);
                  setIsEditing(false);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Nouvelle gestation</Text>
              </TouchableOpacity>
            }
          />
        ) : (
          gestations.map((gestation) => (
            <View key={gestation.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardTitle}>
                    {gestation.truie_nom || gestation.truie_id}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(gestation.statut), marginLeft: SPACING.sm }]}>
                    <Text style={styles.statusText}>{getStatusLabel(gestation.statut)}</Text>
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
                  <Text style={styles.infoLabel}>Date de sautage:</Text>
                  <Text style={styles.infoValue}>{formatDate(gestation.date_sautage)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mise bas prévue:</Text>
                  <Text style={[styles.infoValue, styles.highlight]}>
                    {formatDate(gestation.date_mise_bas_prevue)}
                  </Text>
                </View>
                {gestation.date_mise_bas_reelle && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mise bas réelle:</Text>
                    <Text style={styles.infoValue}>
                      {formatDate(gestation.date_mise_bas_reelle)}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Porcelets prévus:</Text>
                  <Text style={styles.infoValue}>{gestation.nombre_porcelets_prevu}</Text>
                </View>
                {gestation.nombre_porcelets_reel && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Porcelets réels:</Text>
                    <Text style={styles.infoValue}>{gestation.nombre_porcelets_reel}</Text>
                  </View>
                )}
                {gestation.statut === 'en_cours' && (
                  <View style={styles.daysRemaining}>
                    <Text style={styles.daysRemainingText}>
                      {joursRestantsAvantMiseBas(gestation.date_mise_bas_prevue)} jour
                      {joursRestantsAvantMiseBas(gestation.date_mise_bas_prevue) > 1 ? 's' : ''}{' '}
                      restant{joursRestantsAvantMiseBas(gestation.date_mise_bas_prevue) > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                {gestation.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{gestation.notes}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.md + 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  alertesContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.warning + '20',
  },
  alertesTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  alerteCard: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  alerteText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: SPACING.xs,
  },
  alerteDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.background,
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
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  highlight: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  daysRemaining: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.primary + '20',
    borderRadius: BORDER_RADIUS.sm,
  },
  daysRemainingText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
  },
  notesContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notesLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontStyle: 'italic',
  },
});

