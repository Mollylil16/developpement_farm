/**
 * Composant liste des collaborateurs avec filtres
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadCollaborateursParProjet,
  deleteCollaborateur,
  updateCollaborateur,
  accepterInvitation,
} from '../store/slices/collaborationSlice';
import { Collaborateur, RoleCollaborateur, StatutCollaborateur, ROLE_LABELS, STATUT_LABELS } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import CollaborationFormModal from './CollaborationFormModal';
import StatCard from './StatCard';

export default function CollaborationListComponent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { collaborateurs, loading } = useAppSelector((state) => state.collaboration);
  const [selectedCollaborateur, setSelectedCollaborateur] = useState<Collaborateur | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filterStatut, setFilterStatut] = useState<StatutCollaborateur | 'tous'>('tous');
  const [displayedCollaborateurs, setDisplayedCollaborateurs] = useState<Collaborateur[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

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

  // Pagination: charger les premiers collaborateurs filtrés
  useEffect(() => {
    const initial = collaborateursFiltres.slice(0, ITEMS_PER_PAGE);
    setDisplayedCollaborateurs(initial);
    setPage(1);
  }, [collaborateursFiltres.length, filterStatut]);

  // Charger plus de collaborateurs
  const loadMore = useCallback(() => {
    if (displayedCollaborateurs.length >= collaborateursFiltres.length) {
      return;
    }

    const nextPage = page + 1;
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const newItems = collaborateursFiltres.slice(start, end);

    if (newItems.length > 0) {
      setDisplayedCollaborateurs((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    }
  }, [page, displayedCollaborateurs.length, collaborateursFiltres]);

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
        return colors.primary;
      case 'gestionnaire':
        return colors.secondary;
      case 'veterinaire':
        return colors.info;
      case 'ouvrier':
        return colors.accent;
      case 'observateur':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatutColor = (statut: StatutCollaborateur) => {
    switch (statut) {
      case 'actif':
        return colors.success;
      case 'inactif':
        return colors.textSecondary;
      case 'en_attente':
        return colors.warning;
      default:
        return colors.textSecondary;
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider, paddingTop: insets.top + SPACING.lg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Collaboration</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary, ...colors.shadow.small }]}
          onPress={() => {
            setSelectedCollaborateur(null);
            setIsEditing(false);
            setModalVisible(true);
          }}
        >
          <Text style={[styles.addButtonText, { color: colors.textOnPrimary }]}>+ Inviter</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      {statistiques.total > 0 && (
        <View style={styles.statsContainer}>
          <StatCard
            value={statistiques.actifs}
            label="Actifs"
            valueColor={colors.success}
            style={{ marginRight: SPACING.sm }}
          />
          <StatCard
            value={statistiques.enAttente}
            label="En attente"
            valueColor={colors.warning}
            style={{ marginLeft: SPACING.sm }}
          />
        </View>
      )}

      {/* Filtres */}
      <View style={[styles.filtersContainer, { borderBottomColor: colors.divider }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['tous', 'actif', 'en_attente', 'inactif'] as const).map((statut) => (
            <TouchableOpacity
              key={statut}
              style={[
                styles.filterButton,
                {
                  backgroundColor: filterStatut === statut ? colors.primary : colors.surface,
                  borderColor: filterStatut === statut ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilterStatut(statut)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color: filterStatut === statut ? colors.textOnPrimary : colors.text,
                    fontWeight: filterStatut === statut ? '600' : 'normal',
                  },
                ]}
              >
                {statut === 'tous' ? 'Tous' : STATUT_LABELS[statut as StatutCollaborateur]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des collaborateurs */}
      {collaborateursFiltres.length === 0 ? (
        <View style={styles.listContainer}>
          <EmptyState
            title="Aucun collaborateur"
            message="Invitez des membres pour collaborer sur ce projet"
          />
        </View>
      ) : (
        <FlatList
          data={displayedCollaborateurs}
          renderItem={({ item: collaborateur }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...colors.shadow.medium }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.avatarText, { color: colors.textOnPrimary }]}>
                      {collaborateur.prenom.charAt(0).toUpperCase()}
                      {collaborateur.nom.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.infoContainer}>
                    <Text style={[styles.nomText, { color: colors.text }]}>
                      {collaborateur.prenom} {collaborateur.nom}
                    </Text>
                    <Text style={[styles.emailText, { color: colors.textSecondary }]}>{collaborateur.email}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {collaborateur.statut === 'en_attente' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => handleAccepterInvitation(collaborateur.id)}
                    >
                      <Text style={styles.actionButtonText}>✓</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                    onPress={() => handleEdit(collaborateur)}
                  >
                    <Text style={styles.actionButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
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
                    <Text style={[styles.roleBadgeText, { color: colors.textOnPrimary }]}>
                      {ROLE_LABELS[collaborateur.role as RoleCollaborateur]}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statutBadge,
                      { backgroundColor: getStatutColor(collaborateur.statut) },
                    ]}
                  >
                    <Text style={[styles.statutBadgeText, { color: colors.textOnPrimary }]}>
                      {STATUT_LABELS[collaborateur.statut as StatutCollaborateur]}
                    </Text>
                  </View>
                </View>
                {collaborateur.telephone && (
                  <Text style={[styles.telephoneText, { color: colors.textSecondary }]}>📞 {collaborateur.telephone}</Text>
                )}
                <View style={styles.permissionsContainer}>
                  <Text style={[styles.permissionsTitle, { color: colors.text }]}>Permissions:</Text>
                  <View style={styles.permissionsList}>
                    {Object.entries(collaborateur.permissions).map(([key, value]) =>
                      value ? (
                        <View key={key} style={[styles.permissionBadge, { backgroundColor: colors.surfaceVariant }]}>
                          <Text style={[styles.permissionBadgeText, { color: colors.text }]}>
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </Text>
                        </View>
                      ) : null
                    )}
                  </View>
                </View>
                {collaborateur.notes && (
                  <Text style={[styles.notesText, { color: colors.textSecondary }]}>{collaborateur.notes}</Text>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          // Optimisations de performance
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          ListFooterComponent={
            displayedCollaborateurs.length < collaborateursFiltres.length ? (
              <LoadingSpinner message="Chargement..." />
            ) : null
          }
        />
      )}

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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  addButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 44,
  },
  addButtonText: {
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
  },
  filterButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
    borderWidth: 1.5,
    minHeight: 40,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  infoContainer: {
    flex: 1,
  },
  nomText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  emailText: {
    fontSize: FONT_SIZES.sm,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
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
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  telephoneText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  permissionsContainer: {
    marginTop: SPACING.sm,
  },
  permissionsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  permissionBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  permissionBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },
});

