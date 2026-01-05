/**
 * Composant modal pour afficher et gérer les invitations en attente
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  accepterInvitation,
  rejeterInvitation,
  loadInvitationsEnAttente,
} from '../store/slices/collaborationSlice';
import { loadProjets, loadProjetActif } from '../store/slices/projetSlice';
import type { Collaborateur } from '../types/collaboration';
import { ROLE_LABELS } from '../types/collaboration';
import CustomModal from './CustomModal';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import apiClient from '../services/api/apiClient';

interface InvitationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function InvitationsModal({ visible, onClose }: InvitationsModalProps) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { invitationsEnAttente, loading } = useAppSelector((state) => state.collaboration);
  const { user } = useAppSelector((state) => state.auth);
  const [projetNoms, setProjetNoms] = React.useState<Record<string, string>>({});
  const [loadingProjets, setLoadingProjets] = React.useState(false);

  // Charger les noms des projets
  React.useEffect(() => {
    if (invitationsEnAttente.length > 0) {
      const chargerNomsProjets = async () => {
        setLoadingProjets(true);
        const noms: Record<string, string> = {};
        for (const invitation of invitationsEnAttente) {
          try {
            // Charger le projet depuis l'API backend
            const projet = await apiClient.get<any>(`/projets/${invitation.projet_id}`);
            if (projet) {
              noms[invitation.projet_id] = projet.nom;
            }
          } catch (error) {
            console.warn('Erreur lors du chargement du projet:', invitation.projet_id);
            noms[invitation.projet_id] = 'Projet inconnu';
          }
        }
        setProjetNoms(noms);
        setLoadingProjets(false);
      };
      chargerNomsProjets();
    }
  }, [invitationsEnAttente]);

  const handleAccepter = async (invitation: Collaborateur) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvitationsModal.tsx:59',message:'Début acceptation invitation',data:{invitationId:invitation.id,projetId:invitation.projet_id,role:invitation.role,statut:invitation.statut},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      if (!invitation.id) {
        throw new Error("L'ID de l'invitation est manquant");
      }

      // Vérifier que l'invitation est toujours en attente
      if (invitation.statut !== 'en_attente') {
        Alert.alert(
          'Invitation déjà traitée',
          "Cette invitation a déjà été acceptée ou rejetée. Rechargement des invitations...",
          [
            {
              text: 'OK',
              onPress: () => {
                if (user) {
                  dispatch(
                    loadInvitationsEnAttente({
                      userId: user.id,
                      email: user.email || undefined,
                      telephone: user.telephone || undefined,
                    })
                  );
                }
              },
            },
          ]
        );
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvitationsModal.tsx:65',message:'Appel API accepterInvitation',data:{invitationId:invitation.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      await dispatch(accepterInvitation(invitation.id)).unwrap();

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvitationsModal.tsx:69',message:'Invitation acceptée avec succès, rechargement projets',data:{invitationId:invitation.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // Recharger les projets pour inclure le nouveau projet
      await dispatch(loadProjets());

      // Charger le projet actif (qui devrait maintenant inclure ce projet)
      await dispatch(loadProjetActif());

      Alert.alert(
        'Invitation acceptée',
        `Vous avez rejoint le projet "${projetNoms[invitation.projet_id] || 'Projet'}" avec le rôle ${ROLE_LABELS[invitation.role]}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Fermer le modal - la navigation sera gérée automatiquement par AppNavigator
              // qui détectera le nouveau projet actif
              onClose();
            },
          },
        ]
      );

      // Recharger les invitations en attente
      if (user) {
        dispatch(
          loadInvitationsEnAttente({
            userId: user.id,
            email: user.email || undefined,
            telephone: user.telephone || undefined,
          })
        );
      }
    } catch (error: unknown) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvitationsModal.tsx:103',message:'Erreur acceptation invitation',data:{invitationId:invitation.id,errorType:error?.constructor?.name,errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      console.error('Erreur lors de l\'acceptation de l\'invitation:', error);
      
      let errorMessage = "Erreur lors de l'acceptation de l'invitation";
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
        // Si l'invitation est introuvable (404), recharger les invitations
        if (error.message.includes('introuvable') || error.message.includes('404')) {
          errorMessage = "Cette invitation n'existe plus ou a déjà été traitée. Rechargement des invitations...";
          if (user) {
            dispatch(loadInvitationsEnAttente({ userId: user.id, email: user.email || undefined }));
          }
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      Alert.alert('Erreur', errorMessage);
    }
  };

  const handleRejeter = async (invitation: Collaborateur) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvitationsModal.tsx:100',message:'Début rejet invitation',data:{invitationId:invitation.id,projetId:invitation.projet_id,statut:invitation.statut},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Vérifier que l'invitation est toujours en attente
    if (invitation.statut !== 'en_attente') {
      Alert.alert(
        'Invitation déjà traitée',
        "Cette invitation a déjà été acceptée ou rejetée. Rechargement des invitations...",
        [
          {
            text: 'OK',
            onPress: () => {
              if (user) {
                dispatch(loadInvitationsEnAttente({ userId: user.id, email: user.email || undefined }));
              }
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      "Rejeter l'invitation",
      `Êtes-vous sûr de vouloir rejeter l'invitation pour le projet "${projetNoms[invitation.projet_id] || 'Projet'}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!invitation.id) {
                throw new Error("L'ID de l'invitation est manquant");
              }

              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvitationsModal.tsx:109',message:'Appel API rejeterInvitation',data:{invitationId:invitation.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
              // #endregion

              await dispatch(rejeterInvitation(invitation.id)).unwrap();

              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvitationsModal.tsx:115',message:'Invitation rejetée avec succès',data:{invitationId:invitation.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
              // #endregion

              Alert.alert('Invitation rejetée', "L'invitation a été rejetée.");

              // Recharger les invitations en attente
              if (user) {
                dispatch(
                  loadInvitationsEnAttente({ userId: user.id, email: user.email || undefined })
                );
              }
            } catch (error: unknown) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InvitationsModal.tsx:136',message:'Erreur rejet invitation',data:{invitationId:invitation.id,errorType:error?.constructor?.name,errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
              // #endregion
              
              console.error('Erreur lors du rejet de l\'invitation:', error);
              
              let errorMessage = "Erreur lors du rejet de l'invitation";
              if (error instanceof Error) {
                errorMessage = error.message || errorMessage;
                // Si l'invitation est introuvable (404), recharger les invitations
                if (error.message.includes('introuvable') || error.message.includes('404')) {
                  errorMessage = "Cette invitation n'existe plus ou a déjà été traitée. Rechargement des invitations...";
                  if (user) {
                    dispatch(
                    loadInvitationsEnAttente({
                      userId: user.id,
                      email: user.email || undefined,
                      telephone: user.telephone || undefined,
                    })
                  );
                  }
                }
              } else if (typeof error === 'string') {
                errorMessage = error;
              } else if (error && typeof error === 'object' && 'message' in error) {
                errorMessage = String(error.message);
              }
              
              Alert.alert('Erreur', errorMessage);
            }
          },
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
    });
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={`Invitations en attente (${invitationsEnAttente.length})`}
      showButtons={false}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: SPACING.md }}>
        {invitationsEnAttente.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune invitation en attente
            </Text>
          </View>
        ) : (
          invitationsEnAttente.map((invitation) => (
            <View
              key={invitation.id}
              style={[
                styles.invitationCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.invitationHeader}>
                <View style={styles.invitationInfo}>
                  <Text style={[styles.projetNom, { color: colors.text }]}>
                    {projetNoms[invitation.projet_id] ||
                      (loadingProjets ? 'Chargement...' : 'Projet')}
                  </Text>
                  <Text style={[styles.roleText, { color: colors.textSecondary }]}>
                    Rôle: {ROLE_LABELS[invitation.role]}
                  </Text>
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    Invité le {formatDate(invitation.date_invitation)}
                  </Text>
                </View>
              </View>

              <View style={styles.permissionsContainer}>
                <Text style={[styles.permissionsTitle, { color: colors.text }]}>Permissions:</Text>
                <View style={styles.permissionsList}>
                  {Object.entries(invitation.permissions).map(
                    ([key, value]) =>
                      value && (
                        <View
                          key={key}
                          style={[
                            styles.permissionBadge,
                            { backgroundColor: colors.primary + '20' },
                          ]}
                        >
                          <Text style={[styles.permissionText, { color: colors.primary }]}>
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </Text>
                        </View>
                      )
                  )}
                </View>
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.rejectButton,
                    { backgroundColor: colors.error + '20', borderColor: colors.error },
                  ]}
                  onPress={() => handleRejeter(invitation)}
                  disabled={loading}
                >
                  <Text style={[styles.rejectButtonText, { color: colors.error }]}>Rejeter</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.acceptButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleAccepter(invitation)}
                  disabled={loading}
                >
                  <Text style={[styles.acceptButtonText, { color: colors.textOnPrimary }]}>
                    Accepter
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 500,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
  invitationCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  invitationHeader: {
    marginBottom: SPACING.sm,
  },
  invitationInfo: {
    gap: SPACING.xs,
  },
  projetNom: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  roleText: {
    fontSize: FONT_SIZES.sm,
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
  },
  permissionsContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  permissionsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  permissionBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  permissionText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});
