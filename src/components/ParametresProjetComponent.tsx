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
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import FormField from './FormField';

export default function ParametresProjetComponent() {
  const { colors } = useTheme();
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
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Projet actif */}
      {projetActif && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Projet Actif</Text>
          <View style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...colors.shadow.small,
            },
          ]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{projetActif.nom}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{projetActif.localisation}</Text>
              </View>
            </View>
            {!isEditing ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.statsRow}>
                  <View style={[
                    styles.statCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{projetActif.nombre_truies}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Truies</Text>
                  </View>
                  <View style={[
                    styles.statCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{projetActif.nombre_verrats}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verrats</Text>
                  </View>
                  <View style={[
                    styles.statCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{projetActif.nombre_porcelets}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Porcelets</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.editButton,
                    {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => setIsEditing(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.editButtonText, { color: colors.textOnPrimary }]}>Modifier</Text>
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
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.textSecondary },
                    ]}
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textOnPrimary }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={handleSaveEdit}
                  >
                    <Text style={[styles.saveButtonText, { color: colors.textOnPrimary }]}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* Liste des projets */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Autres Projets</Text>
        {projets.length === 0 ? (
          <EmptyState title="Aucun autre projet" message="Créez d'autres projets pour les gérer ici" />
        ) : (
          projets
            .filter((p) => p.id !== projetActif?.id)
            .map((projet) => (
              <TouchableOpacity
                key={projet.id}
                style={[
                  styles.projetCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    ...colors.shadow.small,
                  },
                ]}
                onPress={() => handleSwitchProjet(projet.id)}
                activeOpacity={0.7}
              >
                <View style={styles.projetCardContent}>
                  <View style={styles.projetCardHeader}>
                    <Text style={[styles.projetCardTitle, { color: colors.text }]}>{projet.nom}</Text>
                    <View style={[
                      styles.badge,
                      projet.statut === 'actif' 
                        ? { backgroundColor: colors.success + '15' }
                        : { backgroundColor: colors.textSecondary + '15' }
                    ]}>
                      <Text style={[
                        styles.badgeText, 
                        { 
                          color: projet.statut === 'actif' ? colors.success : colors.textSecondary 
                        }
                      ]}>
                        {projet.statut === 'actif' ? 'Actif' : 'Archivé'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.projetCardLocation, { color: colors.textSecondary }]}>{projet.localisation}</Text>
                </View>
                <View style={[styles.switchIconContainer, { backgroundColor: colors.primary + '10' }]}>
                  <Text style={[styles.switchIcon, { color: colors.primary }]}>›</Text>
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
  },
  scrollContent: {
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
  },
  section: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.md,
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: SPACING.md,
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.sm,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  value: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    marginBottom: SPACING.xs / 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  editButtonText: {
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
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  projetCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  projetCardContent: {
    flex: 1,
  },
  projetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  projetCardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    flex: 1,
  },
  projetCardLocation: {
    fontSize: FONT_SIZES.sm,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  switchIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  switchIcon: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '300',
  },
});

