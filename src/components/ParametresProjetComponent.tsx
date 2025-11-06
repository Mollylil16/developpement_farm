/**
 * Composant gestion du projet dans les paramètres
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadProjets,
  switchProjetActif,
  updateProjet,
  loadProjetActif,
} from '../store/slices/projetSlice';
import { Projet } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import FormField from './FormField';

export default function ParametresProjetComponent() {
  const dispatch = useAppDispatch();
  const { projetActif, projets, loading } = useAppSelector((state) => state.projet);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Projet>>({});

  useEffect(() => {
    dispatch(loadProjets());
  }, [dispatch]);

  useEffect(() => {
    if (projetActif && isEditing) {
      setEditData({
        nom: projetActif.nom,
        localisation: projetActif.localisation,
        nombre_truies: projetActif.nombre_truies,
        nombre_verrats: projetActif.nombre_verrats,
        nombre_porcelets: projetActif.nombre_porcelets,
        poids_moyen_actuel: projetActif.poids_moyen_actuel,
        age_moyen_actuel: projetActif.age_moyen_actuel,
        notes: projetActif.notes || '',
      });
    }
  }, [projetActif, isEditing]);

  const handleSwitchProjet = (projetId: string) => {
    Alert.alert(
      'Changer de projet',
      'Voulez-vous activer ce projet ? Les données affichées seront celles de ce projet.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Changer',
          onPress: async () => {
            await dispatch(switchProjetActif(projetId));
            dispatch(loadProjetActif());
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!projetActif) return;

    // Validation
    if (!editData.nom?.trim()) {
      Alert.alert('Erreur', 'Le nom de la ferme est requis');
      return;
    }
    if (!editData.localisation?.trim()) {
      Alert.alert('Erreur', 'La localisation est requise');
      return;
    }

    try {
      await dispatch(
        updateProjet({
          id: projetActif.id,
          updates: editData,
        })
      ).unwrap();
      setIsEditing(false);
      Alert.alert('Succès', 'Projet modifié avec succès');
    } catch (error: any) {
      Alert.alert('Erreur', error || 'Erreur lors de la modification');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Chargement..." />;
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Projet actif */}
      {projetActif && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📋</Text>
            <Text style={styles.sectionTitle}>Projet Actif</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Text style={styles.cardHeaderIconText}>🐷</Text>
              </View>
              <View style={styles.cardHeaderContent}>
                <Text style={styles.cardTitle}>{projetActif.nom}</Text>
                <Text style={styles.cardSubtitle}>{projetActif.localisation}</Text>
              </View>
            </View>
            {!isEditing ? (
              <>
                <View style={styles.divider} />
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statIcon}>🐷</Text>
                    <Text style={styles.statValue}>{projetActif.nombre_truies}</Text>
                    <Text style={styles.statLabel}>Truies</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statIcon}>🐗</Text>
                    <Text style={styles.statValue}>{projetActif.nombre_verrats}</Text>
                    <Text style={styles.statLabel}>Verrats</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statIcon}>🐽</Text>
                    <Text style={styles.statValue}>{projetActif.nombre_porcelets}</Text>
                    <Text style={styles.statLabel}>Porcelets</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={styles.editButtonIcon}>✏️</Text>
                  <Text style={styles.editButtonText}>Modifier le projet</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <FormField
                  label="Nom de la ferme"
                  value={editData.nom || ''}
                  onChangeText={(text) => setEditData({ ...editData, nom: text })}
                />
                <FormField
                  label="Localisation"
                  value={editData.localisation || ''}
                  onChangeText={(text) => setEditData({ ...editData, localisation: text })}
                />
                <FormField
                  label="Nombre de truies"
                  value={editData.nombre_truies?.toString() || '0'}
                  onChangeText={(text) =>
                    setEditData({ ...editData, nombre_truies: parseInt(text) || 0 })
                  }
                  keyboardType="numeric"
                />
                <FormField
                  label="Nombre de verrats"
                  value={editData.nombre_verrats?.toString() || '0'}
                  onChangeText={(text) =>
                    setEditData({ ...editData, nombre_verrats: parseInt(text) || 0 })
                  }
                  keyboardType="numeric"
                />
                <FormField
                  label="Nombre de porcelets"
                  value={editData.nombre_porcelets?.toString() || '0'}
                  onChangeText={(text) =>
                    setEditData({ ...editData, nombre_porcelets: parseInt(text) || 0 })
                  }
                  keyboardType="numeric"
                />
                <FormField
                  label="Poids moyen actuel (kg)"
                  value={editData.poids_moyen_actuel?.toString() || '0'}
                  onChangeText={(text) =>
                    setEditData({ ...editData, poids_moyen_actuel: parseFloat(text) || 0 })
                  }
                  keyboardType="numeric"
                />
                <FormField
                  label="Âge moyen actuel (jours)"
                  value={editData.age_moyen_actuel?.toString() || '0'}
                  onChangeText={(text) =>
                    setEditData({ ...editData, age_moyen_actuel: parseInt(text) || 0 })
                  }
                  keyboardType="numeric"
                />
                <FormField
                  label="Notes"
                  value={editData.notes || ''}
                  onChangeText={(text) => setEditData({ ...editData, notes: text })}
                  multiline
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.saveButton]}
                    onPress={handleSaveEdit}
                  >
                    <Text style={styles.saveButtonText}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* Liste des projets */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📁</Text>
          <Text style={styles.sectionTitle}>Autres Projets</Text>
        </View>
        {projets.length === 0 ? (
          <EmptyState title="Aucun autre projet" message="Créez d'autres projets pour les gérer ici" />
        ) : (
          projets
            .filter((p) => p.id !== projetActif?.id)
            .map((projet) => (
              <TouchableOpacity
                key={projet.id}
                style={styles.projetCard}
                onPress={() => handleSwitchProjet(projet.id)}
                activeOpacity={0.7}
              >
                <View style={styles.projetCardIcon}>
                  <Text style={styles.projetCardIconText}>🐷</Text>
                </View>
                <View style={styles.projetCardContent}>
                  <Text style={styles.projetCardTitle}>{projet.nom}</Text>
                  <Text style={styles.projetCardLocation}>📍 {projet.localisation}</Text>
                  <View style={styles.projetCardBadge}>
                    <View style={[
                      styles.badge,
                      projet.statut === 'actif' ? styles.badgeActive : styles.badgeArchived
                    ]}>
                      <Text style={styles.badgeText}>
                        {projet.statut === 'actif' ? '✓ Actif' : '📦 Archivé'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.switchIconContainer}>
                  <Text style={styles.switchIcon}>→</Text>
                </View>
              </TouchableOpacity>
            ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
  },
  section: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionIcon: {
    fontSize: 28,
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...COLORS.shadow.medium,
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardHeaderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardHeaderIconText: {
    fontSize: 32,
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.primary + '08',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.primary + '15',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs / 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    ...COLORS.shadow.small,
  },
  editButtonIcon: {
    fontSize: 20,
    marginRight: SPACING.xs,
  },
  editButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  cancelButton: {
    backgroundColor: COLORS.textSecondary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  saveButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  projetCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...COLORS.shadow.medium,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  projetCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  projetCardIconText: {
    fontSize: 24,
  },
  projetCardContent: {
    flex: 1,
  },
  projetCardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  projetCardLocation: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  projetCardBadge: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeActive: {
    backgroundColor: COLORS.success + '20',
  },
  badgeArchived: {
    backgroundColor: COLORS.textSecondary + '20',
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.text,
  },
  switchIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  switchIcon: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

