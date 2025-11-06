/**
 * Composant liste des collaborateurs avec filtres
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadCollaborateursParProjet,
  deleteCollaborateur,
  updateCollaborateur,
  accepterInvitation,
} from '../store/slices/collaborationSlice';
import { Collaborateur, RoleCollaborateur, StatutCollaborateur, ROLE_LABELS, STATUT_LABELS } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import CollaborationFormModal from './CollaborationFormModal';
import StatCard from './StatCard';

export default function CollaborationListComponent() {
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { collaborateurs, loading } = useAppSelector((state) => state.collaboration);
  const [selectedCollaborateur, setSelectedCollaborateur] = useState<Collaborateur | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filterStatut, setFilterStatut] = useState<StatutCollaborateur | 'tous'>('tous');

  useEffect(() => {
    if (projetActif) {
      dispatch(loadCollaborateursParProjet(projetActif.id));
    }
  }, [dispatch, projetActif]);

  const collaborateursFiltres = useMemo(() => {
    if (filterStatut === 'tous') {
      return collaborateurs;
    }
    return collaborateurs.filter((c) => c.statut === filterStatut);
  }, [collaborateurs, filterStatut]);

  const statistiques = useMemo(() => {
    const actifs = collaborateurs.filter((c) => c.statut === 'actif').length;
    const enAttente = collaborateurs.filter((c) => c.statut === 'en_attente').length;
    return { actifs, enAttente, total: collaborateurs.length };
  }, [collaborateurs]);

  const handleEdit = (collaborateur: Collaborateur) => {
    setSelectedCollaborateur(collaborateur);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Supprimer le collaborateur',
      'Êtes-vous sûr de vouloir supprimer ce collaborateur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await dispatch(deleteCollaborateur(id));
            if (projetActif) {
              dispatch(loadCollaborateursParProjet(projetActif.id));
            }
          },
        },
      ]
    );
  };

  const handleAccepterInvitation = (id: string) => {
    Alert.alert(
      'Accepter l\'invitation',
      'Confirmez que ce collaborateur a accepté l\'invitation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            await dispatch(accepterInvitation(id));
            if (projetActif) {
              dispatch(loadCollaborateursParProjet(projetActif.id));
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedCollaborateur(null);
    setIsEditing(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    if (projetActif) {
      dispatch(loadCollaborateursParProjet(projetActif.id));
    }
  };

  const getRoleColor = (role: RoleCollaborateur) => {
    switch (role) {
      case 'proprietaire':
        return COLORS.primary;
      case 'gestionnaire':
        return COLORS.secondary;
      case 'veterinaire':
        return COLORS.info;
      case 'ouvrier':
        return COLORS.accent;
      case 'observateur':
        return COLORS.textSecondary;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatutColor = (statut: StatutCollaborateur) => {
    switch (statut) {
      case 'actif':
        return COLORS.success;
      case 'inactif':
        return COLORS.textSecondary;
      case 'en_attente':
        return COLORS.warning;
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
    return <LoadingSpinner message="Chargement des collaborateurs..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Collaboration</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedCollaborateur(null);
            setIsEditing(false);
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Inviter</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      {statistiques.total > 0 && (
        <View style={styles.statsContainer}>
          <StatCard
            value={statistiques.actifs}
            label="Actifs"
            valueColor={COLORS.success}
            style={{ marginRight: SPACING.sm }}
          />
          <StatCard
            value={statistiques.enAttente}
            label="En attente"
            valueColor={COLORS.warning}
            style={{ marginLeft: SPACING.sm }}
          />
        </View>
      )}

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['tous', 'actif', 'en_attente', 'inactif'] as const).map((statut) => (
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
                {statut === 'tous' ? 'Tous' : STATUT_LABELS[statut as StatutCollaborateur]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des collaborateurs */}
      <ScrollView style={styles.listContainer}>
        {collaborateursFiltres.length === 0 ? (
          <EmptyState
            title="Aucun collaborateur"
            message="Invitez des membres pour collaborer sur ce projet"
          />
        ) : (
          collaborateursFiltres.map((collaborateur) => (
            <View key={collaborateur.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {collaborateur.prenom.charAt(0).toUpperCase()}
                      {collaborateur.nom.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.infoContainer}>
                    <Text style={styles.nomText}>
                      {collaborateur.prenom} {collaborateur.nom}
                    </Text>
                    <Text style={styles.emailText}>{collaborateur.email}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {collaborateur.statut === 'en_attente' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleAccepterInvitation(collaborateur.id)}
                    >
                      <Text style={styles.actionButtonText}>✓</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(collaborateur)}
                  >
                    <Text style={styles.actionButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(collaborateur.id)}
                  >
                    <Text style={styles.actionButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.badgesContainer}>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: getRoleColor(collaborateur.role) },
                    ]}
                  >
                    <Text style={styles.roleBadgeText}>
                      {ROLE_LABELS[collaborateur.role as RoleCollaborateur]}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statutBadge,
                      { backgroundColor: getStatutColor(collaborateur.statut) },
                    ]}
                  >
                    <Text style={styles.statutBadgeText}>
                      {STATUT_LABELS[collaborateur.statut as StatutCollaborateur]}
                    </Text>
                  </View>
                </View>
                {collaborateur.telephone && (
                  <Text style={styles.telephoneText}>📞 {collaborateur.telephone}</Text>
                )}
                <View style={styles.permissionsContainer}>
                  <Text style={styles.permissionsTitle}>Permissions:</Text>
                  <View style={styles.permissionsList}>
                    {Object.entries(collaborateur.permissions).map(([key, value]) =>
                      value ? (
                        <View key={key} style={styles.permissionBadge}>
                          <Text style={styles.permissionBadgeText}>
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </Text>
                        </View>
                      ) : null
                    )}
                  </View>
                </View>
                {collaborateur.notes && (
                  <Text style={styles.notesText}>{collaborateur.notes}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de formulaire */}
      <CollaborationFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        collaborateur={selectedCollaborateur}
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
    fontWeight: FONT_WEIGHTS.bold,
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
    fontWeight: FONT_WEIGHTS.semiBold,
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
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  infoContainer: {
    flex: 1,
  },
  nomText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emailText: {
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
    marginTop: SPACING.sm,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  roleBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  roleBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  statutBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  statutBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  telephoneText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  permissionsContainer: {
    marginTop: SPACING.sm,
  },
  permissionsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  permissionBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  permissionBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.medium,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },
});

