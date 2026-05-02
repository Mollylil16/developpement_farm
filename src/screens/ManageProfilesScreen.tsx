/**
 * Écran de gestion des profils utilisateur
 * Permet de voir, activer et supprimer les profils
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useRole } from '../contexts/RoleContext';
import { useAppSelector } from '../store/hooks';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import type { RoleType } from '../types/roles';
import DeleteProfileModal from '../components/profile/DeleteProfileModal';
import apiClient from '../services/api/apiClient';
import { SCREENS } from '../navigation/types';
import { useAppDispatch } from '../store/hooks';
import { updateUser } from '../store/slices/authSlice';

const getRoleInfo = (role: RoleType) => {
  const roleConfig: Record<
    RoleType,
    { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; description: string }
  > = {
    producer: {
      label: 'Producteur',
      icon: 'paw',
      color: '#22C55E',
      description: 'Gérer votre élevage et vendre vos porcs',
    },
    buyer: {
      label: 'Acheteur',
      icon: 'cart',
      color: '#3B82F6',
      description: 'Acheter des porcs sur le marketplace',
    },
    veterinarian: {
      label: 'Vétérinaire',
      icon: 'medical',
      color: '#EF4444',
      description: 'Suivre vos clients et gérer les consultations',
    },
    technician: {
      label: 'Technicien',
      icon: 'construct',
      color: '#F59E0B',
      description: 'Assister les fermes dans leur gestion',
    },
  };
  return roleConfig[role];
};

interface ProfileStats {
  projects?: number;
  animals?: number;
  collaborations?: number;
  purchases?: number;
}

export default function ManageProfilesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const { currentUser, availableRoles, activeRole, switchRole } = useRole();
  const { projetActif, projets } = useAppSelector((state) => state.projet);
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedProfileToDelete, setSelectedProfileToDelete] = useState<RoleType | null>(null);
  const [profileStats, setProfileStats] = useState<Record<RoleType, ProfileStats>>({} as any);
  const [loadingStats, setLoadingStats] = useState(true);

  // Charger les statistiques des profils
  useEffect(() => {
    const loadProfileStats = async () => {
      if (!currentUser) return;

      setLoadingStats(true);
      try {
        const stats: Record<RoleType, ProfileStats> = {} as any;

        // Statistiques pour le profil producteur
        if (availableRoles.includes('producer')) {
          const projetsCount = projets?.length || 0;
          let animalsCount = 0;

          // Compter les animaux dans tous les projets
          try {
            for (const projet of projets || []) {
              try {
                const animaux = await apiClient.get<any[]>(`/production/animaux?projet_id=${projet.id}`);
                animalsCount += animaux?.length || 0;
              } catch (error) {
                // Ignorer les erreurs pour les projets individuels
              }
            }
          } catch (error) {
            // Ignorer les erreurs
          }

          stats.producer = {
            projects: projetsCount,
            animals: animalsCount,
          };
        }

        // Statistiques pour les autres profils (à compléter selon les besoins)
        if (availableRoles.includes('buyer')) {
          stats.buyer = {
            purchases: 0, // À récupérer depuis l'API si nécessaire
          };
        }

        if (availableRoles.includes('veterinarian')) {
          stats.veterinarian = {
            collaborations: 0, // À récupérer depuis l'API si nécessaire
          };
        }

        if (availableRoles.includes('technician')) {
          stats.technician = {
            collaborations: 0, // À récupérer depuis l'API si nécessaire
          };
        }

        setProfileStats(stats);
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadProfileStats();
  }, [currentUser, availableRoles, projets]);

  const handleSwitchProfile = async (role: RoleType) => {
    if (role === activeRole) return;

    setLoading(true);
    try {
      await switchRole(role);
      // La navigation sera gérée automatiquement par AppNavigator
      navigation.goBack();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Impossible de changer de profil';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = (role: RoleType) => {
    setSelectedProfileToDelete(role);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!selectedProfileToDelete || !currentUser) return;

    setLoading(true);
    try {
      const updatedUser = await apiClient.delete<any>(`/users/${currentUser.id}/profiles/${selectedProfileToDelete}`);
      
      // Mettre à jour Redux avec l'utilisateur mis à jour
      if (updatedUser) {
        dispatch(updateUser(updatedUser));
        
        // Si le rôle actif était celui qu'on supprime, le backend a déjà changé le rôle actif
        // Le context se mettra à jour automatiquement via l'effet dans RoleContext
      }

      setDeleteModalVisible(false);
      setSelectedProfileToDelete(null);
      Alert.alert('Succès', 'Profil supprimé avec succès');
      
      // Si c'était le profil actif, le context changera automatiquement
      navigation.goBack();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Impossible de supprimer le profil';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getProfileStatsText = (role: RoleType): string => {
    const stats = profileStats[role];
    if (!stats) return '';

    switch (role) {
      case 'producer':
        if (stats.projects && stats.projects > 0) {
          return `${stats.projects} projet${stats.projects > 1 ? 's' : ''}${
            stats.animals ? `, ${stats.animals} animal${stats.animals > 1 ? 'x' : ''}` : ''
          }`;
        }
        return 'Aucun projet';
      case 'buyer':
        return stats.purchases ? `${stats.purchases} achat${stats.purchases > 1 ? 's' : ''}` : 'Aucun achat';
      case 'veterinarian':
      case 'technician':
        return stats.collaborations
          ? `${stats.collaborations} élevage${stats.collaborations > 1 ? 's' : ''} suivi${stats.collaborations > 1 ? 's' : ''}`
          : 'Aucun suivi';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Mes Profils</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loadingStats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Chargement des profils...
            </Text>
          </View>
        ) : (
          <>
            {availableRoles.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="person-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                  Aucun profil activé
                </Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  Vous pouvez ajouter un profil depuis le menu.
                </Text>
              </View>
            ) : (
              <View style={styles.profilesList}>
                {availableRoles.map((role) => {
                  const roleInfo = getRoleInfo(role);
                  const isActive = role === activeRole;
                  const stats = profileStats[role];
                  const statsText = getProfileStatsText(role);

                  return (
                    <View
                      key={role}
                      style={[
                        styles.profileCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isActive ? roleInfo.color : colors.border,
                          borderWidth: isActive ? 2 : 1,
                        },
                      ]}
                    >
                      <View style={styles.profileHeader}>
                        <View style={[styles.profileIcon, { backgroundColor: `${roleInfo.color}20` }]}>
                          <Ionicons name={roleInfo.icon} size={32} color={roleInfo.color} />
                        </View>
                        <View style={styles.profileInfo}>
                          <View style={styles.profileTitleRow}>
                            <Text style={[styles.profileTitle, { color: colors.text }]}>
                              {roleInfo.label}
                            </Text>
                            {isActive && (
                              <View style={[styles.activeBadge, { backgroundColor: roleInfo.color }]}>
                                <Text style={styles.activeBadgeText}>Actif</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.profileDescription, { color: colors.textSecondary }]}>
                            {roleInfo.description}
                          </Text>
                          {statsText && (
                            <Text style={[styles.profileStats, { color: colors.textSecondary }]}>
                              {statsText}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.profileActions}>
                        {!isActive && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.primary }]}
                            onPress={() => handleSwitchProfile(role)}
                            disabled={loading}
                          >
                            <Text style={styles.actionButtonText}>Activer</Text>
                          </TouchableOpacity>
                        )}
                        {availableRoles.length > 1 && (
                          <TouchableOpacity
                            style={[styles.deleteButton, { borderColor: colors.error }]}
                            onPress={() => handleDeleteProfile(role)}
                            disabled={loading}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                            <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                              Supprimer
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <DeleteProfileModal
        visible={deleteModalVisible}
        profile={selectedProfileToDelete!}
        profileData={selectedProfileToDelete ? profileStats[selectedProfileToDelete] || {} : {}}
        onClose={() => {
          setDeleteModalVisible(false);
          setSelectedProfileToDelete(null);
        }}
        onConfirm={handleDeleteConfirmed}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyStateTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
  profilesList: {
    gap: SPACING.md,
  },
  profileCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  profileTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginRight: SPACING.sm,
  },
  activeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  profileDescription: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  profileStats: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  profileActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  deleteButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

