/**
 * Écran de choix de méthode d'inscription
 * L'utilisateur choisit : Téléphone, Google ou Apple
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import GoogleLogo from '../components/GoogleLogo';
import AppleLogo from '../components/AppleLogo';
import { SCREENS } from '../navigation/types';
import { useAppDispatch } from '../store/hooks';
import { signInWithGoogle, signInWithApple } from '../store/slices/authSlice';

export default function SignUpMethodScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<'phone' | 'google' | 'apple' | null>(null);

  /**
   * Inscription par téléphone
   */
  const handlePhoneSignUp = () => {
    navigation.navigate(SCREENS.PHONE_SIGN_UP as never);
  };

  /**
   * Inscription via Google
   */
  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      setLoadingMethod('google');

      const result = await dispatch(signInWithGoogle()).unwrap();

      // Vérifier si nom/prénom sont complets
      const hasCompleteInfo =
        result.user.prenom &&
        result.user.prenom.length >= 2 &&
        result.user.nom &&
        result.user.nom.length >= 2;

      if (!hasCompleteInfo) {
        // Rediriger vers UserInfoScreen pour compléter les informations
        navigation.navigate(SCREENS.USER_INFO as never, {
          userId: result.user.id,
          email: result.user.email,
          provider: 'google',
        });
      } else {
        // Informations complètes, vérifier si onboarding terminé
        const isOnboarded = result.user.isOnboarded;

        if (!isOnboarded) {
          // Rediriger vers ProfileSelection
          navigation.navigate(SCREENS.PROFILE_SELECTION as never, {
            userId: result.user.id,
          });
        } else {
          // Utilisateur déjà onboardé, navigation automatique gérée par AppNavigator
          // (normalement ne devrait pas arriver ici car c'est l'écran d'inscription)
        }
      }
    } catch (error: any) {
      console.error('[SignUpMethod] Erreur Google:', error);

      // Gestion élégante des erreurs
      if (error.message?.includes('annulée') || error.message?.includes('cancelled')) {
        // Utilisateur a annulé, ne rien afficher
        return;
      }

      Alert.alert(
        'Erreur',
        error.message || "Impossible de s'inscrire avec Google. Veuillez réessayer.",
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setLoadingMethod(null);
    }
  };

  /**
   * Inscription via Apple
   */
  const handleAppleSignUp = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Non disponible', "L'inscription Apple n'est disponible que sur iOS", [
        { text: 'OK' },
      ]);
      return;
    }

    try {
      setLoading(true);
      setLoadingMethod('apple');

      const result = await dispatch(signInWithApple()).unwrap();

      // Vérifier si nom/prénom sont complets
      const hasCompleteInfo =
        result.user.prenom &&
        result.user.prenom.length >= 2 &&
        result.user.nom &&
        result.user.nom.length >= 2;

      if (!hasCompleteInfo) {
        // Rediriger vers UserInfoScreen pour compléter les informations
        navigation.navigate(SCREENS.USER_INFO as never, {
          userId: result.user.id,
          email: result.user.email,
          provider: 'apple',
        });
      } else {
        // Informations complètes, vérifier si onboarding terminé
        const isOnboarded = result.user.isOnboarded;

        if (!isOnboarded) {
          // Rediriger vers ProfileSelection
          navigation.navigate(SCREENS.PROFILE_SELECTION as never, {
            userId: result.user.id,
          });
        }
      }
    } catch (error: any) {
      console.error('[SignUpMethod] Erreur Apple:', error);

      if (error.message?.includes('annulée') || error.message?.includes('cancelled')) {
        return;
      }

      Alert.alert(
        'Erreur',
        error.message || "Impossible de s'inscrire avec Apple. Veuillez réessayer.",
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setLoadingMethod(null);
    }
  };

  const handleBackToWelcome = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec bouton retour */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackToWelcome}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.illustrationEmoji}>🐷</Text>
          <Text style={[styles.illustrationText, { color: colors.textSecondary }]}>
            Rejoignez Fermier Pro
          </Text>
        </View>

        {/* Titre */}
        <Text style={[styles.title, { color: colors.text }]}>Créer un compte</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choisissez votre méthode d'inscription préférée
        </Text>

        {/* Options d'inscription */}
        <View style={styles.methodsContainer}>
          {/* Téléphone */}
          <TouchableOpacity
            style={[
              styles.methodButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...colors.shadow.medium,
              },
            ]}
            onPress={handlePhoneSignUp}
            disabled={loading}
          >
            <View
              style={[
                styles.methodIconContainer,
                { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' },
              ]}
            >
              <Ionicons name="call" size={28} color={colors.primary} />
            </View>
            <View style={styles.methodContent}>
              <Text style={[styles.methodTitle, { color: colors.text }]}>
                Numéro de téléphone
              </Text>
              <Text style={[styles.methodDescription, { color: colors.textSecondary }]}>
                Inscription rapide par SMS
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>ou</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={[
              styles.methodButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...colors.shadow.medium,
              },
            ]}
            onPress={handleGoogleSignUp}
            disabled={loading}
          >
            <View style={[styles.methodIconContainer, { backgroundColor: '#DB4437' + '15' }]}>
              <GoogleLogo size={28} />
            </View>
            <View style={styles.methodContent}>
              <Text style={[styles.methodTitle, { color: colors.text }]}>Continuer avec Google</Text>
              <Text style={[styles.methodDescription, { color: colors.textSecondary }]}>
                Inscription en un clic
              </Text>
            </View>
            {loadingMethod === 'google' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            )}
          </TouchableOpacity>

          {/* Apple (iOS uniquement) */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[
                styles.methodButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...colors.shadow.medium,
                },
              ]}
              onPress={handleAppleSignUp}
              disabled={loading}
            >
              <View style={[styles.methodIconContainer, { backgroundColor: '#000' + '15' }]}>
                <AppleLogo size={28} color="#000" />
              </View>
              <View style={styles.methodContent}>
                <Text style={[styles.methodTitle, { color: colors.text }]}>
                  Continuer avec Apple
                </Text>
                <Text style={[styles.methodDescription, { color: colors.textSecondary }]}>
                  Inscription sécurisée
                </Text>
              </View>
              {loadingMethod === 'apple' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Lien vers connexion */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Vous avez déjà un compte ?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate(SCREENS.SIGN_IN as never)} disabled={loading}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  header: {
    paddingTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  illustrationEmoji: {
    fontSize: 80,
    marginBottom: SPACING.md,
  },
  illustrationText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.xxl,
    lineHeight: 22,
  },
  methodsContainer: {
    marginBottom: SPACING.xl,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  methodIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs / 2,
  },
  methodDescription: {
    fontSize: FONT_SIZES.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: FONT_SIZES.md,
  },
  footerLink: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

