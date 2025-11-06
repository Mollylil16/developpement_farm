/**
 * Composant historique des rations
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadRations, deleteRation } from '../store/slices/nutritionSlice';
import { Ration, IngredientRation } from '../types';
import { getTypePorcLabel } from '../types/nutrition';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';

export default function RationsHistoryComponent() {
  const dispatch = useAppDispatch();
  const { rations, loading } = useAppSelector((state) => state.nutrition);

  useEffect(() => {
    dispatch(loadRations());
  }, [dispatch]);

  const handleDelete = (id: string) => {
    Alert.alert(
      'Supprimer la ration',
      'Êtes-vous sûr de vouloir supprimer cette ration ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => dispatch(deleteRation(id)),
        },
      ]
    );
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique des Rations</Text>
        <Text style={styles.subtitle}>{rations.length} ration{rations.length > 1 ? 's' : ''}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {rations.length === 0 ? (
          <EmptyState
            title="Aucune ration enregistrée"
            message="Les rations calculées seront enregistrées ici"
          />
        ) : (
          rations.map((ration) => (
            <View key={ration.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardTitle}>{getTypePorcLabel(ration.type_porc as any)}</Text>
                  <Text style={styles.cardDate}>{formatDate(ration.date_creation)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(ration.id)}
                >
                  <Text style={styles.actionButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Poids:</Text>
                  <Text style={styles.infoValue}>{ration.poids_kg} kg</Text>
                </View>
                {ration.nombre_porcs && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Nombre de porcs:</Text>
                    <Text style={styles.infoValue}>{ration.nombre_porcs}</Text>
                  </View>
                )}
                {ration.cout_total && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Coût total:</Text>
                    <Text style={[styles.infoValue, styles.amount]}>
                      {formatAmount(ration.cout_total)}
                    </Text>
                  </View>
                )}
                {ration.cout_par_kg && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Coût par kg:</Text>
                    <Text style={[styles.infoValue, styles.amount]}>
                      {formatAmount(ration.cout_par_kg)}
                    </Text>
                  </View>
                )}

                {ration.ingredients && ration.ingredients.length > 0 && (
                  <View style={styles.ingredientsSection}>
                    <Text style={styles.ingredientsTitle}>Ingrédients:</Text>
                    {ration.ingredients.map((ing: IngredientRation, index: number) => (
                      <View key={index} style={styles.ingredientItem}>
                        <Text style={styles.ingredientText}>
                          • {ing.ingredient?.nom || 'Inconnu'}: {ing.quantite}{' '}
                          {ing.ingredient?.unite || ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {ration.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{ration.notes}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
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
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  cardDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
  ingredientsSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ingredientsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  ingredientItem: {
    marginBottom: SPACING.xs,
  },
  ingredientText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
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

