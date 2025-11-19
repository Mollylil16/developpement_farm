/**
 * Composant liste des charges fixes
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadChargesFixes,
  deleteChargeFixe,
  updateChargeFixe,
} from '../store/slices/financeSlice';
import { ChargeFixe, StatutChargeFixe } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import ChargeFixeFormModal from './ChargeFixeFormModal';
import { useActionPermissions } from '../hooks/useActionPermissions';
import { selectAllChargesFixes } from '../store/selectors/financeSelectors';

export default function FinanceChargesFixesComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { canCreate, canUpdate, canDelete } = useActionPermissions();
  const chargesFixes: ChargeFixe[] = useAppSelector(selectAllChargesFixes);
  const loading = useAppSelector((state) => state.finance.loading);
  const [selectedCharge, setSelectedCharge] = useState<ChargeFixe | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { projetActif } = useAppSelector((state) => state.projet);

  useEffect(() => {
    if (projetActif) {
      dispatch(loadChargesFixes(projetActif.id));
    }
  }, [dispatch, projetActif?.id]);

  const handleEdit = (charge: ChargeFixe) => {
    if (!canUpdate('finance')) {
      Alert.alert('Permission refusée', 'Vous n\'avez pas la permission de modifier les charges fixes.');
      return;
    }
    setSelectedCharge(charge);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    if (!canDelete('finance')) {
      Alert.alert('Permission refusée', 'Vous n\'avez pas la permission de supprimer les charges fixes.');
      return;
    }
    Alert.alert(
      'Supprimer la charge fixe',
      'Êtes-vous sûr de vouloir supprimer cette charge fixe ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => dispatch(deleteChargeFixe(id)),
        },
      ]
    );
  };

  const handleSuspend = (charge: ChargeFixe) => {
    if (!canUpdate('finance')) {
      Alert.alert('Permission refusée', 'Vous n\'avez pas la permission de modifier les charges fixes.');
      return;
    }
    dispatch(
      updateChargeFixe({
        id: charge.id,
        updates: { statut: charge.statut === 'actif' ? 'suspendu' : 'actif' },
      })
    );
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedCharge(null);
    setIsEditing(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    if (projetActif) {
      dispatch(loadChargesFixes(projetActif.id));
    }
  };

  const getStatusColor = (statut: StatutChargeFixe) => {
    switch (statut) {
      case 'actif':
        return colors.success;
      case 'suspendu':
        return colors.warning;
      case 'termine':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (statut: StatutChargeFixe) => {
    switch (statut) {
      case 'actif':
        return 'Actif';
      case 'suspendu':
        return 'Suspendu';
      case 'termine':
        return 'Terminé';
      default:
        return statut;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <LoadingSpinner message="Chargement des charges fixes..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Charges Fixes</Text>
        {canCreate('finance') && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setSelectedCharge(null);
              setIsEditing(false);
              setModalVisible(true);
            }}
          >
            <Text style={[styles.addButtonText, { color: colors.background }]}>+ Ajouter</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {chargesFixes.length === 0 ? (
          <EmptyState
            title="Aucune charge fixe"
            message="Ajoutez votre première charge fixe pour commencer"
            action={
              canCreate('finance') ? (
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setSelectedCharge(null);
                    setIsEditing(false);
                    setModalVisible(true);
                  }}
                >
                  <Text style={[styles.addButtonText, { color: colors.background }]}>+ Ajouter une charge fixe</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        ) : (
          chargesFixes.map((charge) => (
            <View key={charge.id} style={[styles.card, { backgroundColor: colors.surface, ...colors.shadow.small }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{charge.libelle}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(charge.statut) }]}>
                    <Text style={[styles.statusText, { color: colors.background }]}>{getStatusLabel(charge.statut)}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {canUpdate('finance') && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSuspend(charge)}
                    >
                      <Text style={styles.actionButtonText}>
                        {charge.statut === 'actif' ? '⏸' : '▶'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {canUpdate('finance') && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(charge)}
                    >
                      <Text style={styles.actionButtonText}>✏️</Text>
                    </TouchableOpacity>
                  )}
                  {canDelete('finance') && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(charge.id)}
                    >
                      <Text style={styles.actionButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Catégorie:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{charge.categorie}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Montant:</Text>
                  <Text style={[styles.infoValue, styles.amount, { color: colors.primary }]}>
                    {formatAmount(charge.montant)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Fréquence:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{charge.frequence}</Text>
                </View>
                {charge.jour_paiement && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Jour de paiement:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>Le {charge.jour_paiement} de chaque mois</Text>
                  </View>
                )}
                {charge.notes && (
                  <View style={[styles.notesContainer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes:</Text>
                    <Text style={[styles.notesText, { color: colors.text }]}>{charge.notes}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <ChargeFixeFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        chargeFixe={selectedCharge}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    gap: SPACING.sm,
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

