/**
 * Section affichant les invitations en attente avec actions Accepter/Rejeter
 * Affiche les invitations directement dans la liste avec boutons d'action
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  accepterInvitation,
  rejeterInvitation,
  loadInvitationsEnAttente,
} from '../../store/slices/collaborationSlice';
import { loadProjets, loadProjetActif } from '../../store/slices/projetSlice';
import { hapticInvitationAccepted, hapticError, triggerHaptic } from '../../utils/haptics';
import Toast from 'react-native-toast-message';
import { ROLE_LABELS } from '../../types/collaboration';
import type { Collaborateur } from '../../types/collaboration';
import {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  FONT_WEIGHTS,
} from '../../constants/theme';
import apiClient from '../../services/api/apiClient';

interface InvitationsListSectionProps {
  onShowAll?: () => void;
}

export default function InvitationsListSection({ onShowAll }: InvitationsListSectionProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { invitationsEnAttente = [] } = useAppSelector((state) => state.collaboration ?? { invitationsEnAttente: [] });
  const { user } = useAppSelector((state) => state.auth ?? { user: null });
  const [projetNoms, setProjetNoms] = React.useState<Record<string, string>>({});
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

  // Filtrer les invitations en attente
  const invitations = useMemo(() => {
    return Array.isArray(invitationsEnAttente)
      ? invitationsEnAttente.filter((inv: Collaborateur) => inv.statut === 'en_attente')
      : [];
  }, [invitationsEnAttente]);

  // Charger les noms des projets
  React.useEffect(() => {
    if (invitations.length > 0) {
      const chargerNomsProjets = async () => {
        const noms: Record<string, string> = {};
        for (const invitation of invitations) {
          if (!projetNoms[invitation.projet_id]) {
            try {
              const projet = await apiClient.get<{ nom: string }>(`/projets/${invitation.projet_id}`);
              if (projet) {
                noms[invitation.projet_id] = projet.nom;
              }
            } catch (error) {
              noms[invitation.projet_id] = 'Projet inconnu';
            }
          }
        }
        setProjetNoms((prev) => ({ ...prev, ...noms }));
      };
      chargerNomsProjets();
    }
  }, [invitations.length]);

  const handleAccepter = async (invitation: Collaborateur) => {
    if (processingInvitation) return;

    setProcessingInvitation(invitation.id);
    triggerHaptic('light');

    try {
      if (!invitation.id) {
        throw new Error("L'ID de l'invitation est manquant");
      }

      if (invitation.statut !== 'en_attente') {
        Alert.alert(
          'Invitation déjà traitée',
          'Cette invitation a déjà été acceptée ou rejetée.',
          [{ text: 'OK' }]
        );
        if (user) {
          dispatch(
            loadInvitationsEnAttente({
              userId: user.id,
              email: user.email,
              telephone: user.telephone,
            })
          );
        }
        return;
      }

      await dispatch(accepterInvitation(invitation.id)).unwrap();

      hapticInvitationAccepted();
      Toast.show({
        type: 'success',
        text1: 'Invitation acceptée ✓',
        text2: `Vous avez rejoint le projet "${projetNoms[invitation.projet_id] || 'Projet'}"`,
        visibilityTime: 3000,
      });

      // Recharger les projets
      await dispatch(loadProjets());
      await dispatch(loadProjetActif());

      // Recharger les invitations
      if (user) {
        dispatch(
          loadInvitationsEnAttente({
            userId: user.id,
            email: user.email,
            telephone: user.telephone,
          })
        );
      }
    } catch (error: unknown) {
      hapticError();
      const errorMessage = error?.message || 'Erreur lors de l\'acceptation de l\'invitation';
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: errorMessage,
        visibilityTime: 4000,
      });
      Alert.alert('Erreur', errorMessage);
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejeter = async (invitation: Collaborateur) => {
    if (processingInvitation) return;

    Alert.alert(
      'Rejeter l\'invitation',
      `Êtes-vous sûr de vouloir rejeter l'invitation pour le projet "${projetNoms[invitation.projet_id] || 'Projet'}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: async () => {
            setProcessingInvitation(invitation.id);
            triggerHaptic('light');

            try {
              await dispatch(rejeterInvitation(invitation.id)).unwrap();

              Toast.show({
                type: 'success',
                text1: 'Invitation rejetée',
                text2: 'L\'invitation a été rejetée',
                visibilityTime: 2000,
              });

              // Recharger les invitations
              if (user) {
                dispatch(
                  loadInvitationsEnAttente({
                    userId: user.id,
                    email: user.email,
                    telephone: user.telephone,
                  })
                );
              }
            } catch (error: unknown) {
              hapticError();
              const errorMessage = error?.message || 'Erreur lors du rejet de l\'invitation';
              Toast.show({
                type: 'error',
                text1: 'Erreur',
                text2: errorMessage,
                visibilityTime: 4000,
              });
            } finally {
              setProcessingInvitation(null);
            }
          },
        },
      ]
    );
  };

  if (invitations.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={onShowAll}
        activeOpacity={onShowAll ? 0.7 : 1}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.badge, { backgroundColor: colors.warning }]}>
            <Ionicons name="notifications" size={14} color="#FFFFFF" />
            <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
              {invitations.length}
            </Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Invitations en attente ({invitations.length})
          </Text>
        </View>
        {onShowAll && (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        )}
      </TouchableOpacity>

      <View style={styles.invitationsContainer}>
        {invitations.map((invitation: Collaborateur) => {
          const isProcessing = processingInvitation === invitation.id;

          return (
            <View
              key={invitation.id}
              style={[styles.invitationCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.invitationContent}>
                <View style={styles.invitationHeader}>
                  <View style={styles.invitationIcon}>
                    <Ionicons name="person-add" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.invitationInfo}>
                    <Text style={[styles.invitationName, { color: colors.text }]}>
                      {invitation.nom} {invitation.prenom}
                    </Text>
                    <Text style={[styles.invitationProject, { color: colors.textSecondary }]}>
                      Projet: {projetNoms[invitation.projet_id] || invitation.projet_id}
                    </Text>
                    <Text style={[styles.invitationRole, { color: colors.textSecondary }]}>
                      Rôle: {ROLE_LABELS[invitation.role]}
                    </Text>
                  </View>
                </View>

                <View style={styles.invitationActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.acceptButton,
                      { backgroundColor: colors.success },
                      isProcessing && styles.actionButtonDisabled,
                    ]}
                    onPress={() => handleAccepter(invitation)}
                    disabled={isProcessing}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Accepter l'invitation"
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                          Accepter
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.rejectButton,
                      { borderColor: colors.error, backgroundColor: colors.surface },
                      isProcessing && styles.actionButtonDisabled,
                    ]}
                    onPress={() => handleRejeter(invitation)}
                    disabled={isProcessing}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Rejeter l'invitation"
                  >
                    <Ionicons name="close-circle" size={18} color={colors.error} />
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>
                      Rejeter
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.bold,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
  },
  invitationsContainer: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  invitationCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  invitationContent: {
    gap: SPACING.md,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  invitationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invitationInfo: {
    flex: 1,
  },
  invitationName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: 4,
  },
  invitationProject: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 2,
  },
  invitationRole: {
    fontSize: FONT_SIZES.sm,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
    minHeight: 44,
  },
  acceptButton: {
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
  },
  rejectButton: {
    borderWidth: 2,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});
