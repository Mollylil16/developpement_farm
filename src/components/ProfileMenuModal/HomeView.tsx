/**
 * Vue d'accueil du menu profil
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { signOut } from '../../store/slices/authSlice';
import { useTheme } from '../../contexts/ThemeContext';
import { useRole } from '../../contexts/RoleContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { SCREENS } from '../../navigation/types';
import RoleSwitcherModal from '../RoleSwitcherModal';
import AddRoleModal from '../AddRoleModal';

interface HomeViewProps {
  onNavigateToSettings: () => void;
  onNavigateToMonProjet: () => void;
  onClose: () => void;
}

export default function HomeView({ onNavigateToSettings, onNavigateToMonProjet, onClose }: HomeViewProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { activeRole, availableRoles, switchRole, logoutRole } = useRole();
  const [roleSwitcherVisible, setRoleSwitcherVisible] = useState(false);
  const [addRoleModalVisible, setAddRoleModalVisible] = useState(false);

  /**
   * 🔧 CORRECTION: Déconnexion du profil actuel uniquement
   * Ne supprime pas les données, permet de revenir se connecter plus tard
   * La redirection vers l'écran de sélection de profil est gérée automatiquement par AppNavigator
   */
  const handleSignOut = async () => {
    const roleLabels: Record<typeof activeRole, string> = {
      producer: 'Producteur',
      buyer: 'Acheteur',
      veterinarian: 'Vétérinaire',
      technician: 'Technicien',
    };

    Alert.alert(
      'Déconnexion du profil',
      `Êtes-vous sûr de vouloir vous déconnecter du profil "${roleLabels[activeRole]}" ?\n\nVous pourrez vous reconnecter plus tard.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutRole();
              onClose();
              // La redirection vers l'écran de sélection de profil est gérée automatiquement
              // par AppNavigator lorsque isAuthenticated devient false
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  };

  const handleRoleSwitch = async (role: typeof activeRole) => {
    try {
      await switchRole(role);
      setRoleSwitcherVisible(false);
      onClose();
      // Navigation sera gérée automatiquement par AppNavigator selon le nouveau rôle
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de changer de rôle');
    }
  };

  return (
    <View>
      {/* Section PROFIL */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          👤 PROFIL
        </Text>
        <View style={styles.sectionContent}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => {
              onClose();
              navigation.navigate(SCREENS.PROFIL);
            }}
          >
            <Ionicons name="person-outline" size={24} color={colors.primary} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, { color: colors.text }]}>
                Informations personnelles
              </Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                Gérer votre profil
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Afficher selon le rôle actif */}
          {activeRole === 'producer' && (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={onNavigateToMonProjet}
            >
              <Ionicons name="folder-outline" size={24} color={colors.primary} />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Ma ferme</Text>
                <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                  {projetActif?.nom || 'Aucun projet'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          
          {activeRole === 'buyer' && (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                onClose();
                // Naviguer vers les informations de l'entreprise acheteur
                navigation.navigate(SCREENS.PROFIL);
              }}
            >
              <Ionicons name="business-outline" size={24} color={colors.primary} />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Mon entreprise</Text>
                <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                  Informations commerciales
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          
          {activeRole === 'veterinarian' && (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                onClose();
                // Naviguer vers les qualifications vétérinaire
                navigation.navigate(SCREENS.PROFIL);
              }}
            >
              <Ionicons name="school-outline" size={24} color={colors.primary} />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Mes qualifications</Text>
                <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                  Diplômes et licences
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          
          {activeRole === 'technician' && (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                onClose();
                // Naviguer vers les compétences technicien
                navigation.navigate(SCREENS.PROFIL);
              }}
            >
              <Ionicons name="construct-outline" size={24} color={colors.primary} />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Mes compétences</Text>
                <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                  Niveau et spécialités
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => {
              navigation.navigate(SCREENS.DOCUMENTS);
              onClose();
            }}
          >
            <Ionicons name="document-text-outline" size={24} color={colors.primary} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, { color: colors.text }]}>Mes documents</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                Certificats, factures, etc.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section CHANGER DE PROFIL */}
      {availableRoles.length > 1 && (
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            🔄 CHANGER DE PROFIL
          </Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => setRoleSwitcherVisible(true)}
            >
              <Ionicons name="swap-horizontal-outline" size={24} color={colors.primary} />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Changer de profil</Text>
                <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                  Basculer entre vos profils ({availableRoles.length} disponible{availableRoles.length > 1 ? 's' : ''})
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Section PARAMÈTRES */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          ⚙️ PARAMÈTRES
        </Text>
        <View style={styles.sectionContent}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={onNavigateToSettings}
          >
            <Ionicons name="settings-outline" size={24} color={colors.primary} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, { color: colors.text }]}>Paramètres</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                Compte, sécurité, notifications, préférences
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* 
            🔧 CORRECTION BUG NAVIGATION FORMATION
            Avant : Redirigeait vers l'ancien écran ParametresScreen (avec onglets Projet/Application/Formation)
            Maintenant : Navigation directe vers TrainingScreen (écran de formation avec chapitres)
            Les sections "Projet" et "Application" ont été déplacées ailleurs et n'ont plus rien à faire ici.
          */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => {
              onClose();
              // Navigation directe vers l'écran de formation (sans passer par ParametresScreen)
              navigation.navigate(SCREENS.TRAINING);
            }}
          >
            <Ionicons name="school-outline" size={24} color={colors.primary} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, { color: colors.text }]}>Formations</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                Guide d'élevage, paramètres projet et application
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section SESSION - Déconnexion */}
      <TouchableOpacity
        style={[styles.signOutButton, { backgroundColor: colors.error + '15' }]}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={24} color={colors.error} />
        <Text style={[styles.signOutText, { color: colors.error }]}>🚪 Déconnexion</Text>
      </TouchableOpacity>

      {/* Modals */}
      <RoleSwitcherModal
        visible={roleSwitcherVisible}
        onClose={() => setRoleSwitcherVisible(false)}
        currentRole={activeRole}
        availableRoles={availableRoles}
        onRoleSelect={handleRoleSwitch}
        onAddRole={() => {
          setRoleSwitcherVisible(false);
          setAddRoleModalVisible(true);
        }}
        onProfileDeleted={() => {
          // Le profil a été supprimé, on peut fermer le modal
          setRoleSwitcherVisible(false);
        }}
      />
      <AddRoleModal
        visible={addRoleModalVisible}
        onClose={() => setAddRoleModalVisible(false)}
        onSuccess={() => {
          setAddRoleModalVisible(false);
          onClose();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: SPACING.lg,
  },
  sectionHeader: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  sectionContent: {
    paddingHorizontal: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  menuItemTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  menuItemSubtitle: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs / 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
    borderRadius: 8,
    gap: SPACING.sm,
  },
  signOutText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

