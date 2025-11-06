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
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import ChargeFixeFormModal from './ChargeFixeFormModal';

export default function FinanceChargesFixesComponent() {
  const dispatch = useAppDispatch();
  const { chargesFixes, loading } = useAppSelector((state) => state.finance);
  const [selectedCharge, setSelectedCharge] = useState<ChargeFixe | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    dispatch(loadChargesFixes());
  }, [dispatch]);

  const handleEdit = (charge: ChargeFixe) => {
    setSelectedCharge(charge);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
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
    dispatch(loadChargesFixes());
  };

  const getStatusColor = (statut: StatutChargeFixe) => {
    switch (statut) {
      case 'actif':
        return COLORS.success;
      case 'suspendu':
        return COLORS.warning;
      case 'termine':
        return COLORS.textSecondary;
      default:
        return COLORS.textSecondary;
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Charges Fixes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedCharge(null);
            setIsEditing(false);
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
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
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setSelectedCharge(null);
                  setIsEditing(false);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Ajouter une charge fixe</Text>
              </TouchableOpacity>
            }
          />
        ) : (
          chargesFixes.map((charge) => (
            <View key={charge.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardTitle}>{charge.libelle}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(charge.statut) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(charge.statut)}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSuspend(charge)}
                  >
                    <Text style={styles.actionButtonText}>
                      {charge.statut === 'actif' ? '⏸' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(charge)}
                  >
                    <Text style={styles.actionButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(charge.id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Catégorie:</Text>
                  <Text style={styles.infoValue}>{charge.categorie}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Montant:</Text>
                  <Text style={[styles.infoValue, styles.amount]}>
                    {formatAmount(charge.montant)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fréquence:</Text>
                  <Text style={styles.infoValue}>{charge.frequence}</Text>
                </View>
                {charge.jour_paiement && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Jour de paiement:</Text>
                    <Text style={styles.infoValue}>Le {charge.jour_paiement} de chaque mois</Text>
                  </View>
                )}
                {charge.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{charge.notes}</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    gap: SPACING.sm,
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
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  amount: {
    fontWeight: 'bold',
    color: COLORS.primary,
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

