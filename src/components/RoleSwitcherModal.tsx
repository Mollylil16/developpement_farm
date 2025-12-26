/**
 * Modal pour changer de rôle
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RoleType } from '../types/roles';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';

interface RoleSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  currentRole: RoleType;
  availableRoles: RoleType[];
  onRoleSelect: (role: RoleType) => void;
  onAddRole?: () => void;
}

/**
 * Configuration des rôles avec icônes, labels et descriptions
 */
const getRoleConfig = (role: RoleType) => {
  const configs = {
    producer: {
      icon: 'paw' as const,
      label: 'Producteur',
      description: 'Gérer mon élevage',
      color: '#22C55E',
    },
    buyer: {
      icon: 'cart' as const,
      label: 'Acheteur',
      description: 'Acheter des porcs',
      color: '#3B82F6',
    },
    veterinarian: {
      icon: 'medical' as const,
      label: 'Vétérinaire',
      description: 'Suivre mes clients',
      color: '#EF4444',
    },
    technician: {
      icon: 'construct' as const,
      label: 'Technicien',
      description: 'Assister les fermes',
      color: '#F59E0B',
    },
  };
  return configs[role];
};

/**
 * Modal de changement de rôle
 */
const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  visible,
  onClose,
  currentRole,
  availableRoles,
  onRoleSelect,
  onAddRole,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Changer de rôle</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.rolesList} showsVerticalScrollIndicator={false}>
            {availableRoles.map((role) => {
              const config = getRoleConfig(role);
              const isActive = role === currentRole;

              return (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    {
                      borderColor: isActive ? config.color : colors.border,
                      backgroundColor: isActive ? `${config.color}10` : 'transparent',
                    },
                  ]}
                  onPress={() => onRoleSelect(role)}
                  disabled={isActive}
                  activeOpacity={0.7}
                >
                  <View style={[styles.roleIcon, { backgroundColor: `${config.color}20` }]}>
                    <Ionicons name={config.icon} size={24} color={config.color} />
                  </View>

                  <View style={styles.roleInfo}>
                    <Text style={[styles.roleLabel, { color: colors.text }]}>{config.label}</Text>
                    <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                      {config.description}
                    </Text>
                  </View>

                  {isActive && (
                    <View style={[styles.activeIndicator, { backgroundColor: config.color }]}>
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Toujours afficher "Ajouter un profil" s'il y a des rôles disponibles */}
          {(() => {
            const allRoles: RoleType[] = ['producer', 'buyer', 'veterinarian', 'technician'];
            const rolesToAdd = allRoles.filter((role) => !availableRoles.includes(role));
            return rolesToAdd.length > 0 ? (
              <TouchableOpacity
                style={[styles.addRoleButton, { borderColor: colors.border }]}
                onPress={() => {
                  onClose();
                  onAddRole?.();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={20} color={colors.primary} />
                <Text style={[styles.addRoleText, { color: colors.primary }]}>
                  Ajouter un profil
                </Text>
              </TouchableOpacity>
            ) : null;
          })()}
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
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  rolesList: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    marginBottom: SPACING.sm,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: 2,
  },
  roleDescription: {
    fontSize: FONT_SIZES.sm,
  },
  activeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  addRoleText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

export default RoleSwitcherModal;
