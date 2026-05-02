/**
 * Écran de sélection de profil pour l'onboarding
 * Affiche les 4 profils disponibles avec leurs descriptions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
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
  const { userId, identifier, isEmail } =
    (route.params as { userId?: string; identifier?: string; isEmail?: boolean }) || {};

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

  const handleProfileSelect = async (profileType: RoleType) => {
    if (!userId) {
      Alert.alert('Erreur', 'Identifiant utilisateur manquant. Veuillez recommencer.');
      navigation.goBack();
      return;
    }

    try {
      // IMPORTANT: Ne PAS créer le profil spécialisé ici pour buyer/veterinarian/technician
      // Ces profils seront créés dans leurs écrans de complément respectifs après avoir rempli le formulaire
      // Seul le profil producer est créé ici car il nécessite la création d'un projet ensuite

      // Naviguer vers l'écran approprié selon le profil
      switch (profileType) {
        case 'producer':
          // Pour le producteur, créer le profil spécialisé maintenant
          // car la création du projet nécessite le profil producteur
          const { getOnboardingService } = await import('../services/OnboardingService');
          const onboardingService = await getOnboardingService();
          await onboardingService.createSpecializedProfile(userId, profileType);
          // Naviguer vers création de projet
          (navigation as any).navigate(SCREENS.CREATE_PROJECT, {
            userId,
            profileType,
          });
          break;
        case 'buyer':
          // Naviguer vers complément d'informations acheteur
          // Le profil buyer sera créé dans BuyerInfoCompletionScreen après avoir rempli le formulaire
          (navigation as any).navigate(SCREENS.BUYER_INFO_COMPLETION, {
            profileType,
            userId,
          });
          break;
        case 'veterinarian':
          // Naviguer vers complément d'informations vétérinaire
          // Le profil veterinarian sera créé dans VeterinarianInfoCompletionScreen après avoir rempli le formulaire
          (navigation as any).navigate(SCREENS.VETERINARIAN_INFO_COMPLETION, {
            profileType,
            userId,
          });
          break;
        case 'technician':
          // Naviguer vers complément d'informations technicien
          // Le profil technician sera créé dans BuyerInfoCompletionScreen après avoir rempli le formulaire
          (navigation as any).navigate(SCREENS.BUYER_INFO_COMPLETION, {
            profileType: 'technician',
            userId,
          });
          break;
      }
    } catch (error: unknown) {
      console.error('Erreur création profil:', error);
      
      // Extraire le message d'erreur de manière plus détaillée
      let errorMessage = 'Erreur inconnue';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Si c'est une APIError, essayer d'extraire plus d'informations
        if ('status' in error && typeof (error as any).status === 'number') {
          const apiError = error as any;
          const status = apiError.status;
          const data = apiError.data;
          
          if (data && typeof data === 'object' && 'message' in data) {
            errorMessage = String(data.message);
          } else if (status === 401) {
            errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          } else if (status === 403) {
            errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
          } else if (status === 404) {
            errorMessage = 'Ressource non trouvée. Veuillez réessayer.';
          } else if (status === 500) {
            errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
          } else if (status === 0) {
            errorMessage = 'Erreur de connexion. Vérifiez votre connexion Internet.';
          } else {
            errorMessage = `Erreur ${status}: ${error.message}`;
          }
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      Alert.alert(
        'Erreur',
        `Impossible de créer le profil: ${errorMessage}`,
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Réessayer',
            onPress: () => handleProfileSelect(profileType),
            style: 'default',
          },
        ]
      );
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
