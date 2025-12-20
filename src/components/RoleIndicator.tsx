/**
 * Composant indicateur de rôle dans le header
 * Affiche le rôle actif et permet de changer de rôle
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRole } from '../contexts/RoleContext';
import { RoleType } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import RoleSwitcherModal from './RoleSwitcherModal';
import AddRoleModal from './AddRoleModal';

/**
 * Configuration des rôles avec icônes et couleurs
 */
const getRoleInfo = (role: RoleType) => {
  const roleConfig = {
    producer: {
      icon: 'paw' as const,
      label: 'Producteur',
      color: '#22C55E',
    },
    buyer: {
      icon: 'cart' as const,
      label: 'Acheteur',
      color: '#3B82F6',
    },
    veterinarian: {
      icon: 'medical' as const,
      label: 'Vétérinaire',
      color: '#EF4444',
    },
    technician: {
      icon: 'construct' as const,
      label: 'Technicien',
      color: '#F59E0B',
    },
  };
  return roleConfig[role];
};

/**
 * Composant indicateur de rôle
 */
const RoleIndicator: React.FC = () => {
  const { activeRole, availableRoles, switchRole, currentUser } = useRole();
  const { colors, isDark } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);

  // Toujours afficher le sélecteur de profil (même avec un seul rôle)
  const currentRoleInfo = getRoleInfo(activeRole);

  // Déterminer les rôles disponibles à ajouter
  const allRoles: RoleType[] = ['producer', 'buyer', 'veterinarian', 'technician'];
  const rolesToAdd = allRoles.filter((role) => !availableRoles.includes(role));

  return (
    <>
      <TouchableOpacity
        style={[
          styles.roleIndicator,
          {
            borderColor: currentRoleInfo.color,
            backgroundColor: isDark ? colors.surface : 'rgba(255, 255, 255, 0.9)',
          },
        ]}
        onPress={() => setIsModalOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.roleText, { color: currentRoleInfo.color }]} numberOfLines={1}>
          {currentRoleInfo.label}{' '}
          {availableRoles.length === 1 && rolesToAdd.length > 0 ? 'actif' : ''}
        </Text>
        <Ionicons name="chevron-down" size={12} color={currentRoleInfo.color} />
      </TouchableOpacity>

      <RoleSwitcherModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentRole={activeRole}
        availableRoles={availableRoles}
        onRoleSelect={async (role) => {
          try {
            await switchRole(role);
            setIsModalOpen(false);
          } catch (error) {
            console.error('Erreur lors du changement de rôle:', error);
          }
        }}
        onAddRole={() => {
          setIsModalOpen(false);
          setIsAddRoleModalOpen(true);
        }}
      />

      <AddRoleModal
        visible={isAddRoleModalOpen}
        onClose={() => setIsAddRoleModalOpen(false)}
        onSuccess={() => {
          setIsAddRoleModalOpen(false);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    gap: 4,
    maxWidth: 120,
    justifyContent: 'center',
  },
  roleText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

export default RoleIndicator;
