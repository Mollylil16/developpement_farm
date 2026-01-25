/**
 * Écran "Mes Projets" pour vétérinaires et techniciens
 * Affiche la liste des projets où l'utilisateur est partie prenante
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useRole } from '../contexts/RoleContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  loadCollaborationsActives,
  selectProjetCollaboratif,
} from '../store/slices/collaborationSlice';
import StandardHeader from '../components/StandardHeader';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { SCREENS } from '../navigation/types';
import type { Projet } from '../types/projet';
import type { Collaborateur } from '../types/collaboration';
import { ROLE_LABELS } from '../types/collaboration';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';

export default function MyProjectsScreen() {
  const { colors } = useTheme();
  const { currentUser, activeRole } = useRole();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);

  const collaborationState = useAppSelector((state) => state.collaboration);
  const projetsAccessibles = collaborationState?.projetsAccessibles || [];
  const collaborationsActives = collaborationState?.collaborationsActives || [];
  const loading = collaborationState?.loading || false;

  // Charger les projets au montage
  useEffect(() => {
    if (currentUser?.id && (activeRole === 'veterinarian' || activeRole === 'technician')) {
      dispatch(
        loadCollaborationsActives({
          userId: currentUser.id,
          email: currentUser.email,
          telephone: currentUser.telephone,
        })
      );
    }
  }, [currentUser?.id, activeRole, dispatch]);

  const onRefresh = useCallback(async () => {
    if (!currentUser?.id) return;
    setRefreshing(true);
    try {
      await dispatch(
        loadCollaborationsActives({
          userId: currentUser.id,
          email: currentUser.email,
          telephone: currentUser.telephone,
        })
      ).unwrap();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser?.id, currentUser?.email, currentUser?.telephone, dispatch]);

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

  // Naviguer vers le détail du projet
  const handleSelectProject = useCallback(
    async (projet: Projet) => {
      if (!currentUser?.id) return;

      try {
        // Sélectionner le projet dans le store
        await dispatch(
          selectProjetCollaboratif({
            projetId: projet.id,
            userId: currentUser.id,
          })
        ).unwrap();

        // Naviguer vers l'écran de détail du projet
        navigation.navigate(SCREENS.VET_PROJECT_DETAIL as never, { projetId: projet.id } as never);
      } catch (error) {
        console.error('Erreur lors de la sélection du projet:', error);
      }
    },
    [currentUser?.id, dispatch, navigation]
  );

  // Rendu d'un projet dans la liste
  const renderProject = ({ item }: { item: Projet }) => {
    const collab = getCollaborationForProject(item.id);
    const permissions = collab?.permissions || {};

    return (
      <TouchableOpacity
        onPress={() => handleSelectProject(item)}
        activeOpacity={0.7}
        style={styles.projectCardWrapper}
      >
        <Card style={[styles.projectCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.projectHeader}>
            <View style={[styles.projectIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="business" size={32} color={colors.primary} />
            </View>
            <View style={styles.projectInfo}>
              <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
                {item.nom}
              </Text>
              {item.localisation && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.localisation}
                  </Text>
                </View>
              )}
              {collab && (
                <Text style={[styles.projectRole, { color: colors.primary }]}>
                  {getRoleLabel(collab.role)}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </View>

          {/* Permissions disponibles */}
          {collab && (
            <View style={[styles.permissionsRow, { borderTopColor: colors.border }]}>
              {permissions.sante && (
                <View style={[styles.permissionBadge, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="medical" size={14} color={colors.success} />
                  <Text style={[styles.permissionText, { color: colors.success }]}>Santé</Text>
                </View>
              )}
              {permissions.gestion_complete && (
                <View style={[styles.permissionBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="settings" size={14} color={colors.primary} />
                  <Text style={[styles.permissionText, { color: colors.primary }]}>Gestion</Text>
                </View>
              )}
              {permissions.cheptel && (
                <View style={[styles.permissionBadge, { backgroundColor: colors.info + '20' }]}>
                  <Ionicons name="paw" size={14} color={colors.info} />
                  <Text style={[styles.permissionText, { color: colors.info }]}>Cheptel</Text>
                </View>
              )}
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing && projetsAccessibles.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <StandardHeader
          icon="business-outline"
          title="Mes Projets"
          subtitle="Projets où vous êtes partie prenante"
        />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <StandardHeader
        icon="business-outline"
        title="Mes Projets"
        subtitle="Projets où vous êtes partie prenante"
      />

      {projetsAccessibles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="business-outline"
            title="Aucun projet accessible"
            message="Vous n'avez pas encore été ajouté comme collaborateur à un projet. Demandez à un producteur de scanner votre QR code professionnel."
          />
        </View>
      ) : (
        <FlatList
          data={projetsAccessibles}
          keyExtractor={(item) => item.id}
          renderItem={renderProject}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={true}
        />
      )}

      <ChatAgentFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 120,
  },
  projectCardWrapper: {
    marginBottom: SPACING.md,
  },
  projectCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  projectIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs / 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
    marginBottom: SPACING.xs / 2,
  },
  locationText: {
    fontSize: FONT_SIZES.sm,
  },
  projectRole: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginTop: SPACING.xs / 2,
  },
  permissionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs / 2,
  },
  permissionText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
