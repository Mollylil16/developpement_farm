/**
 * Composant liste des mortalités avec statistiques
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadMortalitesParProjet,
  loadStatistiquesMortalite,
  deleteMortalite,
} from '../store/slices/mortalitesSlice';
import { Mortalite, CategorieMortalite } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import MortalitesFormModal from './MortalitesFormModal';
import StatCard from './StatCard';

export default function MortalitesListComponent() {
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { mortalites, statistiques, loading } = useAppSelector((state) => state.mortalites);
  const [selectedMortalite, setSelectedMortalite] = useState<Mortalite | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (projetActif) {
      dispatch(loadMortalitesParProjet(projetActif.id));
      dispatch(loadStatistiquesMortalite(projetActif.id));
    }
  }, [dispatch, projetActif]);

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
        return COLORS.warning;
      case 'truie':
        return COLORS.error;
      case 'verrat':
        return COLORS.error;
      case 'autre':
        return COLORS.textSecondary;
      default:
        return COLORS.textSecondary;
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mortalités</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedMortalite(null);
            setIsEditing(false);
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      {statistiques && (
        <View style={styles.statsContainer}>
          <StatCard
            value={statistiques.total_morts}
            label="Total morts"
            valueColor={COLORS.error}
            style={{ marginRight: SPACING.sm }}
          />
          <StatCard
            value={statistiques.taux_mortalite.toFixed(1)}
            label="Taux de mortalité"
            unit="%"
            valueColor={
              statistiques.taux_mortalite > 5 ? COLORS.error : COLORS.success
            }
            style={{ marginLeft: SPACING.sm }}
          />
        </View>
      )}

      {/* Liste des mortalités */}
      <ScrollView style={styles.listContainer}>
        {mortalites.length === 0 ? (
          <EmptyState
            title="Aucune mortalité enregistrée"
            message="Ajoutez une mortalité pour commencer le suivi"
          />
        ) : (
          mortalites.map((mortalite) => (
            <View key={mortalite.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.categorieBadge,
                      { backgroundColor: getCategorieColor(mortalite.categorie) },
                    ]}
                  >
                    <Text style={styles.categorieBadgeText}>
                      {getCategorieLabel(mortalite.categorie)}
                    </Text>
                  </View>
                  <Text style={[styles.dateText, { marginLeft: SPACING.sm }]}>
                    {formatDate(mortalite.date)}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(mortalite)}
                  >
                    <Text style={styles.actionButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(mortalite.id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.nombreText}>
                  {mortalite.nombre_porcs} porc{mortalite.nombre_porcs > 1 ? 's' : ''}
                </Text>
                {mortalite.cause && (
                  <Text style={styles.causeText}>Cause: {mortalite.cause}</Text>
                )}
                {mortalite.notes && (
                  <Text style={styles.notesText}>{mortalite.notes}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

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
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...COLORS.shadow.medium,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
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
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
    marginTop: SPACING.xs,
  },
  nombreText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  causeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});

