/**
 * Composant liste des collaborateurs avec filtres
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadCollaborateursParProjet,
  deleteCollaborateur,
  updateCollaborateur,
  accepterInvitation,
} from '../store/slices/collaborationSlice';
import type { Collaborateur, RoleCollaborateur, StatutCollaborateur } from '../types/collaboration';
import { ROLE_LABELS, STATUT_LABELS } from '../types/collaboration';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import CollaborationFormModal from './CollaborationFormModal';
import StatCard from './StatCard';
import { useRole } from '../contexts/RoleContext';

export default function CollaborationListComponent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { activeRole } = useRole();
  const { projetActif } = useAppSelector((state) => state.projet ?? { projetActif: null });
  const currentUser = useAppSelector((state) => state.auth?.user);

  // Vérifier si l'utilisateur est propriétaire du projet actif
  const isProprietaire =
    activeRole === 'producer' &&
    projetActif &&
    currentUser &&
    projetActif.proprietaire_id === currentUser.id;
  const { collaborateurs = [], loading = false } = useAppSelector((state) => state.collaboration ?? { collaborateurs: [], loading: false });
  const [selectedCollaborateur, setSelectedCollaborateur] = useState<Collaborateur | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filterStatut, setFilterStatut] = useState<StatutCollaborateur | 'tous'>('tous');
  const [displayedCollaborateurs, setDisplayedCollaborateurs] = useState<Collaborateur[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // S'assurer que collaborateurs est toujours un tableau
  const collaborateursArray = useMemo(() => {
    return Array.isArray(collaborateurs) ? collaborateurs : [];
  }, [collaborateurs]);

  useEffect(() => {
    if (projetActif?.id) {
      dispatch(loadCollaborateursParProjet(projetActif.id));
    }
  }, [dispatch, projetActif?.id]);

  const collaborateursFiltres = useMemo(() => {
    if (filterStatut === 'tous') {
      return collaborateursArray;
    }
    return collaborateursArray.filter((c) => c.statut === filterStatut);
  }, [collaborateursArray, filterStatut]);

  const statistiques = useMemo(() => {
    const actifs = collaborateursArray.filter((c) => c.statut === 'actif').length;
    const enAttente = collaborateursArray.filter((c) => c.statut === 'en_attente').length;
    return { actifs, enAttente, total: collaborateursArray.length };
  }, [collaborateursArray]);

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
    if (!isProprietaire) {
      Alert.alert('Permission refusée', 'Seul le propriétaire peut modifier les collaborateurs.');
      return;
    }
    setSelectedCollaborateur(collaborateur);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    if (!isProprietaire) {
      Alert.alert('Permission refusée', 'Seul le propriétaire peut supprimer les collaborateurs.');
      return;
    }
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
    if (!isProprietaire) {
      Alert.alert('Permission refusée', 'Seul le propriétaire peut accepter les invitations.');
      return;
    }
    Alert.alert(
      "Accepter l'invitation",
      "Confirmez que ce collaborateur a accepté l'invitation ?",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await dispatch(accepterInvitation(id));
              hapticInvitationAccepted();
              Toast.show({
                type: 'success',
                text1: 'Invitation acceptée ✓',
                text2: 'Le collaborateur a été ajouté au projet',
                visibilityTime: 3000,
              });
              if (projetActif) {
                dispatch(loadCollaborateursParProjet(projetActif.id));
              }
            } catch (error) {
              hapticError();
              Toast.show({
                type: 'error',
                text1: 'Erreur',
                text2: 'Impossible d\'accepter l\'invitation',
                visibilityTime: 3000,
              });
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

  // Tous les hooks doivent être appelés avant les return anticipés
  // handleInvite n'est plus utilisé car le bouton Inviter est dans CollaborationScreen
  // mais on garde la structure pour la cohérence

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

      {/* Statistiques */}
      {statistiques.total > 0 && (
        <View style={styles.statsContainer}>
          <StatCard
            value={statistiques.actifs}
            label="Actifs"
            valueColor={colors.success}
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <StatCard
            value={statistiques.enAttente}
            label="En attente"
            valueColor={colors.warning}
            style={{ flex: 1, marginLeft: SPACING.sm }}
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
                {
                  backgroundColor: filterStatut === statut ? colors.primary : colors.surface,
                  borderColor: filterStatut === statut ? colors.primary : colors.border,
                },
                filterStatut === statut && colors.shadow.small,
              ]}
              onPress={() => setFilterStatut(statut)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  {
                    color: filterStatut === statut ? colors.textOnPrimary : colors.text,
                    fontWeight:
                      filterStatut === statut ? FONT_WEIGHTS.semiBold : FONT_WEIGHTS.medium,
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
        <View
          style={[
            styles.listContainer,
            { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
          ]}
        >
          <EmptyState
            title="Aucun collaborateur"
            message="Invitez des membres pour collaborer sur ce projet"
          />
        </View>
      ) : (
        <FlatList
          data={displayedCollaborateurs}
          renderItem={({ item: collaborateur }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...colors.shadow.medium,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: `${colors.primary}15`,
                        borderColor: `${colors.primary}30`,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {collaborateur.prenom.charAt(0).toUpperCase()}
                      {collaborateur.nom.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.infoContainer}>
                    <Text style={[styles.nomText, { color: colors.text }]}>
                      {collaborateur.prenom} {collaborateur.nom}
                    </Text>
                    <Text style={[styles.emailText, { color: colors.textSecondary }]}>
                      {collaborateur.email}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {collaborateur.statut === 'en_attente' && isProprietaire && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: `${colors.success}15` }]}
                      onPress={() => handleAccepterInvitation(collaborateur.id)}
                    >
                      <Ionicons name="checkmark" size={18} color={colors.success} />
                    </TouchableOpacity>
                  )}
                  {isProprietaire && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
                        onPress={() => handleEdit(collaborateur)}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: `${colors.error}15` }]}
                        onPress={() => handleDelete(collaborateur.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.badgesContainer}>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor: `${getRoleColor(collaborateur.role)}20`,
                        borderColor: `${getRoleColor(collaborateur.role)}40`,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.roleBadgeText, { color: getRoleColor(collaborateur.role) }]}
                    >
                      {ROLE_LABELS[collaborateur.role]}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statutBadge,
                      {
                        backgroundColor: `${getStatutColor(collaborateur.statut)}20`,
                        borderColor: `${getStatutColor(collaborateur.statut)}40`,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statutBadgeText,
                        { color: getStatutColor(collaborateur.statut) },
                      ]}
                    >
                      {STATUT_LABELS[collaborateur.statut]}
                    </Text>
                  </View>
                </View>
                {collaborateur.telephone && (
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                      {collaborateur.telephone}
                    </Text>
                  </View>
                )}
                <View style={styles.permissionsContainer}>
                  <Text style={[styles.permissionsTitle, { color: colors.text }]}>
                    Permissions :
                  </Text>
                  <View style={styles.permissionsList}>
                    {Object.entries(collaborateur.permissions).map(([key, value]) =>
                      value ? (
                        <View
                          key={key}
                          style={[
                            styles.permissionBadge,
                            {
                              backgroundColor: `${colors.primary}10`,
                              borderColor: `${colors.primary}20`,
                              borderWidth: 1,
                            },
                          ]}
                        >
                          <Text style={[styles.permissionBadgeText, { color: colors.primary }]}>
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </Text>
                        </View>
                      ) : null
                    )}
                  </View>
                </View>
                {collaborateur.notes && (
                  <View
                    style={[
                      styles.notesContainer,
                      { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                      {collaborateur.notes}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          style={styles.listContainer}
          contentContainerStyle={[
            styles.listContent,
            displayedCollaborateurs.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          // Optimisations de performance
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          ListEmptyComponent={
            displayedCollaborateurs.length === 0 && collaborateursFiltres.length === 0 ? (
              <EmptyState
                title="Aucun collaborateur"
                message="Ajoutez des collaborateurs pour commencer"
                icon="👥"
              />
            ) : null
          }
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  filtersContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
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
    marginRight: SPACING.sm,
  },
  avatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  infoContainer: {
    flex: 1,
  },
  nomText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs / 2,
  },
  emailText: {
    fontSize: FONT_SIZES.sm,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    marginTop: SPACING.xs,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  roleBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  roleBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  statutBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  statutBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
  },
  permissionsContainer: {
    marginTop: SPACING.xs,
  },
  permissionsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.sm,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  permissionBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  permissionBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  notesContainer: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    lineHeight: FONT_SIZES.sm * 1.4,
  },
});
