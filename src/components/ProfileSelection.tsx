/**
 * Composant de sélection de profil pour l'onboarding
 * Affiche les 4 profils disponibles avec leurs descriptions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { SCREENS } from '../navigation/types';
import type { RoleType } from '../types/roles';

interface ProfileOption {
  type: RoleType;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  badge?: string;
}

interface ProfileSelectionProps {
  onProfileSelect: (profileType: RoleType) => void;
}

const ProfileSelection: React.FC<ProfileSelectionProps> = ({ onProfileSelect }) => {
  const { colors } = useTheme();

  const profileOptions: ProfileOption[] = [
    {
      type: 'producer',
      icon: 'paw',
      title: 'Producteur / Éleveur',
      description: 'Je gère un élevage de porcs et je souhaite vendre mes animaux',
      color: '#22C55E',
      badge: 'Recommandé',
    },
    {
      type: 'buyer',
      icon: 'cart',
      title: 'Acheteur',
      description: 'Je souhaite acheter des porcs pour mon activité',
      color: '#3B82F6',
    },
    {
      type: 'veterinarian',
      icon: 'medical',
      title: 'Vétérinaire',
      description: 'Je suis vétérinaire et je souhaite proposer mes services',
      color: '#EF4444',
      badge: 'Validation requise',
    },
    {
      type: 'technician',
      icon: 'construct',
      title: 'Technicien / Porcher',
      description: 'Je souhaite assister dans la gestion des élevages',
      color: '#F59E0B',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.welcomeTitle, { color: colors.text }]}>
          Bienvenue sur Fermier Pro ! 👋
        </Text>
        <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
          Pour commencer, choisissez le profil qui vous correspond le mieux.
        </Text>
      </View>

      <View style={styles.optionsList}>
        {profileOptions.map((option) => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.optionCard,
              { backgroundColor: colors.surface, borderLeftColor: option.color },
            ]}
            onPress={() => onProfileSelect(option.type)}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: option.color + '15' }]}>
              <Ionicons name={option.icon} size={32} color={option.color} />
            </View>

            <View style={styles.optionContent}>
              <View style={styles.optionHeader}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  {option.title}
                </Text>
                {option.badge && (
                  <View style={[styles.badge, { backgroundColor: option.color + '20' }]}>
                    <Text style={[styles.badgeText, { color: option.color }]}>
                      {option.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {option.description}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Vous pourrez ajouter d'autres profils plus tard depuis les paramètres.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  optionsList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    flexWrap: 'wrap',
  },
  optionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginRight: SPACING.xs,
  },
  badge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  optionDescription: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
});

export default ProfileSelection;

