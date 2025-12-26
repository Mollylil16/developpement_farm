/**
 * Modal pour ajouter un nouveau rôle à l'utilisateur
 * Permet d'activer les profils Acheteur, Vétérinaire ou Technicien
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useRole } from '../contexts/RoleContext';
import type { RoleType } from '../types/roles';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { SCREENS } from '../navigation/types';
import ModalLayout from './ModalLayout';

interface AddRoleModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Configuration des rôles avec formulaires
 */
const getRoleFormConfig = (role: RoleType) => {
  const configs = {
    producer: {
      icon: 'paw' as const,
      label: 'Producteur',
      description: 'Gérer votre élevage et vendre vos porcs',
      color: '#22C55E',
      fields: [
        { key: 'farmName', label: 'Nom de la ferme', type: 'text', required: true },
        { key: 'farmType', label: 'Type de ferme', type: 'select', required: true },
      ],
    },
    buyer: {
      icon: 'cart' as const,
      label: 'Acheteur',
      description: 'Acheter des porcs sur le marketplace',
      color: '#3B82F6',
      fields: [
        { key: 'buyerType', label: "Type d'acheteur", type: 'select', required: true },
        {
          key: 'businessName',
          label: "Nom de l'entreprise (optionnel)",
          type: 'text',
          required: false,
        },
      ],
    },
    veterinarian: {
      icon: 'medical' as const,
      label: 'Vétérinaire',
      description: 'Suivre vos clients et gérer les consultations',
      color: '#EF4444',
      fields: [
        { key: 'degree', label: 'Diplôme', type: 'text', required: true },
        { key: 'licenseNumber', label: 'Numéro de licence', type: 'text', required: true },
        {
          key: 'licenseValidUntil',
          label: "Licence valide jusqu'au",
          type: 'date',
          required: true,
        },
        {
          key: 'specializations',
          label: 'Spécialisations (séparées par des virgules)',
          type: 'text',
          required: false,
        },
      ],
    },
    technician: {
      icon: 'construct' as const,
      label: 'Technicien',
      description: 'Assister les fermes dans leur gestion',
      color: '#F59E0B',
      fields: [
        { key: 'level', label: 'Niveau', type: 'select', required: true },
        {
          key: 'skills',
          label: 'Compétences (séparées par des virgules)',
          type: 'text',
          required: false,
        },
      ],
    },
  };
  return configs[role as keyof typeof configs];
};

const AddRoleModal: React.FC<AddRoleModalProps> = ({ visible, onClose, onSuccess }) => {
  const { colors, isDark } = useTheme();
  const { currentUser, availableRoles, switchRole } = useRole();
  const navigation = useNavigation<NavigationProp<any>>();

  // Rôles disponibles à ajouter (exclure ceux déjà activés)
  const rolesToAdd: RoleType[] = ['producer', 'buyer', 'veterinarian', 'technician'].filter(
    (role) => !availableRoles.includes(role as RoleType)
  ) as RoleType[];

  const handleRoleSelect = async (role: RoleType) => {
    if (!currentUser) {
      Alert.alert('Erreur', 'Aucun utilisateur connecté');
      return;
    }

    // Vérifier si le profil existe déjà
    const hasProfile = currentUser.roles?.[role];

    if (hasProfile) {
      // Le profil existe déjà, basculer directement
      try {
        await switchRole(role);
        onClose();
        onSuccess?.();

        // Naviguer vers le dashboard approprié
        switch (role) {
          case 'producer':
            navigation.navigate('Main', { screen: SCREENS.DASHBOARD });
            break;
          case 'buyer':
            navigation.navigate('Main', { screen: SCREENS.DASHBOARD_BUYER });
            break;
          case 'veterinarian':
            navigation.navigate('Main', { screen: SCREENS.DASHBOARD_VET });
            break;
          case 'technician':
            navigation.navigate('Main', { screen: SCREENS.DASHBOARD_TECH });
            break;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Impossible de changer de rôle';
        Alert.alert('Erreur', errorMessage);
      }
      return;
    }

    // Le profil n'existe pas, naviguer vers l'écran de complétion
    onClose();

    switch (role) {
      case 'producer':
        // Pour le producteur, naviguer vers l'écran de création de projet
        navigation.navigate(
          SCREENS.CREATE_PROJECT as never,
          {
            userId: currentUser.id,
            profileType: 'producer',
          } as never
        );
        break;
      case 'buyer':
        navigation.navigate(
          SCREENS.BUYER_INFO_COMPLETION as never,
          {
            userId: currentUser.id,
            profileType: 'buyer',
          } as never
        );
        break;
      case 'veterinarian':
        navigation.navigate(
          SCREENS.VETERINARIAN_INFO_COMPLETION as never,
          {
            userId: currentUser.id,
            profileType: 'veterinarian',
          } as never
        );
        break;
      case 'technician':
        // Pour le technicien, utiliser le même écran que l'acheteur pour l'instant
        navigation.navigate(
          SCREENS.BUYER_INFO_COMPLETION as never,
          {
            userId: currentUser.id,
            profileType: 'technician',
          } as never
        );
        break;
    }

    onSuccess?.();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.divider || colors.border }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ajouter un profil</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {rolesToAdd.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                  Tous les profils activés
                </Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  Vous avez déjà activé tous les profils disponibles.
                </Text>
              </View>
            ) : (
              <View style={styles.rolesList}>
                {rolesToAdd.map((role) => {
                  const config = getRoleFormConfig(role);
                  const hasProfile = currentUser?.roles?.[role];

                  return (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleOption,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                      ]}
                      onPress={() => handleRoleSelect(role)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.roleIcon, { backgroundColor: `${config.color}20` }]}>
                        <Ionicons name={config.icon} size={32} color={config.color} />
                      </View>
                      <View style={styles.roleInfo}>
                        <Text style={[styles.roleLabel, { color: colors.text }]}>
                          {config.label}
                          {hasProfile && (
                            <Text style={[styles.roleBadge, { color: colors.success }]}>
                              {' '}
                              (déjà créé)
                            </Text>
                          )}
                        </Text>
                        <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                          {config.description}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: 400,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  closeButtonText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  rolesList: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    marginBottom: SPACING.md,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  roleDescription: {
    fontSize: FONT_SIZES.sm,
  },
  roleBadge: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
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
});

export default AddRoleModal;
