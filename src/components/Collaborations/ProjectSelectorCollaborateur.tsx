/**
 * 🆕 Composant de sélection de projet pour les vétérinaires et techniciens
 * Permet de choisir le projet du producteur auquel accéder
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useRole } from '../../contexts/RoleContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  loadCollaborationsActives,
  selectProjetCollaboratif,
} from '../../store/slices/collaborationSlice';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import type { Projet } from '../../types/projet';
import type { Collaborateur } from '../../types/collaboration';
import { ROLE_LABELS } from '../../types/collaboration';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_PROJECT_KEY = '@fermier_pro:last_collaborative_project';

interface ProjectSelectorCollaborateurProps {
  onProjectSelected?: (projet: Projet) => void;
  compact?: boolean; // Mode compact pour affichage dans header
}

export default function ProjectSelectorCollaborateur({
  onProjectSelected,
  compact = false,
}: ProjectSelectorCollaborateurProps) {
  const { colors, isDark } = useTheme();
  const { currentUser, activeRole } = useRole();
  const dispatch = useAppDispatch();

  const collaborationState = useAppSelector((state) => state.collaboration);
  const collaborationsActives = collaborationState?.collaborationsActives || [];
  const projetsAccessibles = collaborationState?.projetsAccessibles || [];
  const projetCollaboratifActif = collaborationState?.projetCollaboratifActif || null;
  const collaborateurActuel = collaborationState?.collaborateurActuel || null;
  const loading = collaborationState?.loading || false;

  const [modalVisible, setModalVisible] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Charger les collaborations actives au montage
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.id) return;
      if (activeRole !== 'veterinarian' && activeRole !== 'technician') return;

      try {
        await dispatch(
          loadCollaborationsActives({
            userId: currentUser.id,
            email: currentUser.email,
            telephone: currentUser.telephone,
          })
        ).unwrap();

        // Essayer de restaurer le dernier projet sélectionné
        const lastProjectId = await AsyncStorage.getItem(LAST_PROJECT_KEY);
        if (lastProjectId && !projetCollaboratifActif) {
          // Le projet sera sélectionné automatiquement si disponible
          dispatch(
            selectProjetCollaboratif({
              projetId: lastProjectId,
              userId: currentUser.id,
            })
          ).catch(() => {
            // Ignorer si le projet n'est plus accessible
            AsyncStorage.removeItem(LAST_PROJECT_KEY);
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des collaborations:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, [currentUser?.id, activeRole, dispatch]);

  // Sélectionner un projet
  const handleSelectProject = useCallback(
    async (projet: Projet) => {
      if (!currentUser?.id) return;

      try {
        await dispatch(
          selectProjetCollaboratif({
            projetId: projet.id,
            userId: currentUser.id,
          })
        ).unwrap();

        // Sauvegarder le choix
        await AsyncStorage.setItem(LAST_PROJECT_KEY, projet.id);

        setModalVisible(false);
        onProjectSelected?.(projet);
      } catch (error) {
        console.error('Erreur lors de la sélection du projet:', error);
      }
    },
    [currentUser?.id, dispatch, onProjectSelected]
  );

  // Trouver la collaboration pour un projet
  const getCollaborationForProject = useCallback(
    (projetId: string): Collaborateur | undefined => {
      return collaborationsActives.find((c: Collaborateur) => c.projet_id === projetId);
    },
    [collaborationsActives]
  );

  // Obtenir le nom du rôle
  const getRoleLabel = (role: string): string => {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role;
  };

  // Rendu d'un projet dans la liste
  const renderProjectItem = ({ item }: { item: Projet }) => {
    const collab = getCollaborationForProject(item.id);
    const isSelected = projetCollaboratifActif?.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.projectItem,
          { backgroundColor: isSelected ? colors.primary + '20' : colors.surface },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
        onPress={() => handleSelectProject(item)}
        activeOpacity={0.7}
      >
        <View style={styles.projectItemContent}>
          <View style={[styles.projectIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="business-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.projectInfo}>
            <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
              {item.nom}
            </Text>
            {collab && (
              <Text style={[styles.projectRole, { color: colors.textSecondary }]}>
                {getRoleLabel(collab.role)} • {item.localisation || 'Localisation non définie'}
              </Text>
            )}
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Si pas de rôle vétérinaire/technicien, ne rien afficher
  if (activeRole !== 'veterinarian' && activeRole !== 'technician') {
    return null;
  }

  // Affichage compact (pour header)
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactSelector, { backgroundColor: colors.surface }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={projetCollaboratifActif ? 'business' : 'business-outline'}
          size={18}
          color={colors.primary}
        />
        <Text
          style={[styles.compactText, { color: colors.text }]}
          numberOfLines={1}
        >
          {projetCollaboratifActif?.nom || 'Sélectionner un projet'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  // Affichage normal (carte complète)
  return (
    <View style={styles.container}>
      {/* Bouton de sélection */}
      <TouchableOpacity
        style={[styles.selectorCard, { backgroundColor: colors.surface }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.selectorContent}>
          <View style={[styles.selectorIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons
              name={projetCollaboratifActif ? 'business' : 'business-outline'}
              size={28}
              color={colors.primary}
            />
          </View>
          <View style={styles.selectorInfo}>
            {projetCollaboratifActif ? (
              <>
                <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>
                  Projet actif
                </Text>
                <Text style={[styles.selectorValue, { color: colors.text }]} numberOfLines={1}>
                  {projetCollaboratifActif.nom}
                </Text>
                {collaborateurActuel && (
                  <Text style={[styles.selectorRole, { color: colors.primary }]}>
                    {getRoleLabel(collaborateurActuel.role)}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>
                  Aucun projet sélectionné
                </Text>
                <Text style={[styles.selectorValue, { color: colors.text }]}>
                  Touchez pour sélectionner
                </Text>
              </>
            )}
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {/* Nombre de projets accessibles */}
      {projetsAccessibles.length > 0 && (
        <Text style={[styles.projectCount, { color: colors.textSecondary }]}>
          {projetsAccessibles.length} projet{projetsAccessibles.length > 1 ? 's' : ''} accessible
          {projetsAccessibles.length > 1 ? 's' : ''}
        </Text>
      )}

      {/* Message si aucun projet */}
      {!initialLoading && projetsAccessibles.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Aucun projet accessible
          </Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            Vous n'avez pas encore été ajouté comme collaborateur à un projet.
            Demandez à un producteur de scanner votre QR code professionnel.
          </Text>
        </View>
      )}

      {/* Modal de sélection */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header du modal */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Sélectionner un projet
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Liste des projets */}
          {loading || initialLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Chargement des projets...
              </Text>
            </View>
          ) : projetsAccessibles.length > 0 ? (
            <FlatList
              data={projetsAccessibles}
              keyExtractor={(item) => item.id}
              renderItem={renderProjectItem}
              contentContainerStyle={styles.projectList}
              ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
            />
          ) : (
            <View style={styles.modalEmptyState}>
              <Ionicons name="business-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Aucun projet accessible
              </Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                Demandez à un producteur de vous inviter sur son projet.
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  // Sélecteur normal (carte)
  selectorCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  selectorInfo: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  selectorRole: {
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  projectCount: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  // Sélecteur compact (pour header)
  compactSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    maxWidth: 200,
    gap: SPACING.xs,
  },
  compactText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    flex: 1,
  },
  // État vide
  emptyState: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  projectList: {
    padding: SPACING.md,
  },
  projectItem: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  projectItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  projectRole: {
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  modalEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
});
