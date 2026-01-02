/**
 * Composant liste des dettes
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAppSelector } from '../store/hooks';
import type { Dette, StatutDette } from '../types/finance';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import DetteFormModal from './DetteFormModal';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { selectProjetActif } from '../store/selectors/projetSelectors';
import { logger } from '../utils/logger';
import apiClient from '../services/api/apiClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TYPE_DETTE_LABELS, STATUT_DETTE_LABELS, FREQUENCE_REMBOURSEMENT_LABELS } from '../types/finance';

export default function FinanceDettesComponent() {
  const { colors } = useTheme();
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  const projetActif = useAppSelector(selectProjetActif);
  const [dettes, setDettes] = useState<Dette[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDette, setSelectedDette] = useState<Dette | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDettes = useCallback(async () => {
    if (!projetActif?.id) return;

    setLoading(true);
    try {
      const data = await apiClient.get<Dette[]>('/finance/dettes', {
        params: { projet_id: projetActif.id },
      });
      setDettes(data);
    } catch (error: unknown) {
      logger.error('Erreur lors du chargement des dettes:', error);
      Alert.alert('Erreur', 'Impossible de charger les dettes. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, [projetActif?.id]);

  useEffect(() => {
    loadDettes();
  }, [loadDettes]);

  const handleEdit = (dette: Dette) => {
    if (!canUpdate('finance')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de modifier les dettes.");
      return;
    }
    setSelectedDette(dette);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete('finance')) {
      Alert.alert('Permission refusée', "Vous n'avez pas la permission de supprimer les dettes.");
      return;
    }
    Alert.alert('Supprimer la dette', 'Êtes-vous sûr de vouloir supprimer cette dette ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/finance/dettes/${id}`);
            await loadDettes();
          } catch (error: unknown) {
            logger.error('Erreur lors de la suppression de la dette:', error);
            Alert.alert('Erreur', 'Impossible de supprimer la dette. Veuillez réessayer.');
          }
        },
      },
    ]);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedDette(null);
    setIsEditing(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    loadDettes();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDettes();
    } catch (error) {
      logger.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadDettes]);

  const getStatusColor = (statut: StatutDette) => {
    switch (statut) {
      case 'en_cours':
        return colors.warning;
      case 'rembourse':
        return colors.success;
      case 'en_defaut':
        return colors.error;
      case 'annule':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const calculateProgress = (dette: Dette) => {
    if (dette.montant_initial === 0) return 0;
    return ((dette.montant_initial - dette.montant_restant) / dette.montant_initial) * 100;
  };

  if (loading && dettes.length === 0) {
    return <LoadingSpinner message="Chargement des dettes..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Dettes</Text>
        {canCreate('finance') && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setSelectedDette(null);
              setIsEditing(false);
              setModalVisible(true);
            }}
          >
            <Text style={[styles.addButtonText, { color: colors.background }]}>+ Ajouter</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={dettes}
        renderItem={({ item: dette }) => {
          const progress = calculateProgress(dette);
          return (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...colors.shadow?.small || {},
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{dette.libelle}</Text>
                  <View
                    style={[styles.statusBadge, { backgroundColor: getStatusColor(dette.statut) }]}
                  >
                    <Text style={[styles.statusText, { color: colors.background }]}>
                      {STATUT_DETTE_LABELS[dette.statut]}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {canUpdate('finance') && (
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(dette)}>
                      <Text style={styles.actionButtonText}>✏️</Text>
                    </TouchableOpacity>
                  )}
                  {canDelete('finance') && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(dette.id)}
                    >
                      <Text style={styles.actionButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Type:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {TYPE_DETTE_LABELS[dette.type_dette]}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Montant initial:
                  </Text>
                  <Text style={[styles.infoValue, styles.amount, { color: colors.text }]}>
                    {formatAmount(dette.montant_initial)}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Montant restant:
                  </Text>
                  <Text style={[styles.infoValue, styles.amount, { color: colors.error }]}>
                    {formatAmount(dette.montant_restant)}
                  </Text>
                </View>

                {dette.taux_interet > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Taux d'intérêt:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {dette.taux_interet}% annuel
                    </Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Date de début:
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatDate(dette.date_debut)}
                  </Text>
                </View>

                {dette.date_echeance && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Date d'échéance:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {formatDate(dette.date_echeance)}
                    </Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Fréquence:
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {FREQUENCE_REMBOURSEMENT_LABELS[dette.frequence_remboursement]}
                  </Text>
                </View>

                {dette.montant_remboursement && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Montant/ période:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {formatAmount(dette.montant_remboursement)}
                    </Text>
                  </View>
                )}

                {dette.preteur && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Prêteur:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{dette.preteur}</Text>
                  </View>
                )}

                {/* Barre de progression */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progress}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    {progress.toFixed(1)}% remboursé
                  </Text>
                </View>

                {dette.notes && (
                  <View style={[styles.notesContainer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes:</Text>
                    <Text style={[styles.notesText, { color: colors.text }]}>{dette.notes}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="Aucune dette"
            message="Ajoutez votre première dette pour commencer"
            action={
              canCreate('finance') ? (
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setSelectedDette(null);
                    setIsEditing(false);
                    setModalVisible(true);
                  }}
                >
                  <Text style={[styles.addButtonText, { color: colors.background }]}>
                    + Ajouter une dette
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
        showsVerticalScrollIndicator={false}
      />

      <DetteFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        dette={selectedDette}
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
  scrollContent: {
    paddingBottom: 100,
  },
  card: {
    margin: SPACING.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
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
    gap: SPACING.xs,
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
  progressContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'right',
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

