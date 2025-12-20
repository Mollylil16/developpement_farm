/**
 * Écran de sélection de profil pour l'onboarding
 * Affiche les 4 profils disponibles avec leurs descriptions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, LIGHT_COLORS } from '../constants/theme';
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

const ProfileSelectionScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute();
  const { identifier, isEmail } =
    (route.params as { identifier?: string; isEmail?: boolean }) || {};

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

  const handleProfileSelect = (profileType: RoleType) => {
    // Naviguer vers l'écran de complément d'informations selon le profil
    // Passer l'identifier si disponible (pour créer le compte)
    switch (profileType) {
      case 'producer':
        (navigation as any).navigate(SCREENS.CREATE_PROJECT, {
          identifier,
          isEmail,
        });
        break;
      case 'buyer':
        (navigation as any).navigate(SCREENS.BUYER_INFO_COMPLETION, {
          profileType,
          identifier,
          isEmail,
        });
        break;
      case 'veterinarian':
        (navigation as any).navigate(SCREENS.VETERINARIAN_INFO_COMPLETION, {
          profileType,
          identifier,
          isEmail,
        });
        break;
      case 'technician':
        // Le technicien peut avoir un flux simplifié
        (navigation as any).navigate(SCREENS.BUYER_INFO_COMPLETION, {
          profileType: 'technician',
          identifier,
          isEmail,
        });
        break;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
              onPress={() => handleProfileSelect(option.type)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: option.color + '15' }]}>
                <Ionicons name={option.icon} size={32} color={option.color} />
              </View>

              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{option.title}</Text>
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

        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Vous pourrez ajouter d'autres profils plus tard depuis les paramètres.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsList: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 4,
    ...LIGHT_COLORS.shadow.small,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  optionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.xs,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  optionDescription: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});

export default ProfileSelectionScreen;
