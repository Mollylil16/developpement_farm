/**
 * Écran de sélection de la méthode d'inscription
 * Permet de choisir entre téléphone, Google ou Apple
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { SCREENS } from '../navigation/types';
import { useAppDispatch } from '../store/hooks';
import { signInWithGoogle, signInWithApple } from '../store/slices/authSlice';
import GoogleLogo from '../components/GoogleLogo';
import AppleLogo from '../components/AppleLogo';

const SignUpMethodScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneSignUp = () => {
    navigation.navigate(SCREENS.PHONE_SIGN_UP as never);
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      const result = await dispatch(signInWithGoogle()).unwrap();

      if (result) {
        // Vérifier si c'est un nouvel utilisateur (pas de rôles ou nom/prénom incomplets)
        const isNewUser = !result.roles || Object.keys(result.roles).length === 0;
        const hasIncompleteName = !result.prenom || result.prenom.length < 2 || !result.nom || result.nom.length < 2;

        if (isNewUser || hasIncompleteName) {
          // Naviguer vers UserInfo pour compléter les informations
          navigation.navigate(SCREENS.USER_INFO as never, {
            email: result.email,
            provider: 'google',
            providerId: result.id,
            existingUser: result,
          });
        } else {
          // Utilisateur existant avec profil complet → Dashboard
          // La navigation sera gérée par AppNavigator
        }
      }
    } catch (error: unknown) {
      console.error('Erreur Google OAuth:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      if (errorMessage.includes('cancelled') || errorMessage.includes('annulé')) {
        return; // Utilisateur a annulé, ne rien afficher
      }

      Alert.alert(
        'Erreur de connexion',
        'La connexion avec Google a échoué. Veuillez réessayer ou utiliser votre téléphone.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Info', "La connexion Apple n'est disponible que sur iOS");
      return;
    }

    try {
      setIsLoading(true);
      const result = await dispatch(signInWithApple()).unwrap();

      if (result) {
        // Vérifier si c'est un nouvel utilisateur (pas de rôles ou nom/prénom incomplets)
        const isNewUser = !result.roles || Object.keys(result.roles).length === 0;
        const hasIncompleteName = !result.prenom || result.prenom.length < 2 || !result.nom || result.nom.length < 2;

        if (isNewUser || hasIncompleteName) {
          // Naviguer vers UserInfo pour compléter les informations
          navigation.navigate(SCREENS.USER_INFO as never, {
            email: result.email,
            provider: 'apple',
            providerId: result.id,
            existingUser: result,
          });
        } else {
          // Utilisateur existant avec profil complet → Dashboard
          // La navigation sera gérée par AppNavigator
        }
      }
    } catch (error: unknown) {
      console.error('Erreur Apple OAuth:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      if (errorMessage.includes('cancelled') || errorMessage.includes('annulé')) {
        return; // Utilisateur a annulé, ne rien afficher
      }

      Alert.alert(
        'Erreur de connexion',
        'La connexion avec Apple a échoué. Veuillez réessayer ou utiliser votre téléphone.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Header */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Créer un compte</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choisissez votre méthode d'inscription
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {/* Option Téléphone */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...colors.shadow?.small,
              },
            ]}
            onPress={handlePhoneSignUp}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="call" size={32} color={colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Téléphone</Text>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                Inscription avec votre numéro de téléphone
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Option Google */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...colors.shadow?.small,
              },
            ]}
            onPress={handleGoogleSignUp}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <GoogleLogo size={32} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Google</Text>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                Continuer avec votre compte Google
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Option Apple (iOS uniquement) */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...colors.shadow?.small,
                },
              ]}
              onPress={handleAppleSignUp}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                <AppleLogo size={32} />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Apple</Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  Continuer avec votre compte Apple
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  backButton: {
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  header: {
    marginBottom: SPACING.xl * 2,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: SPACING.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
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
  optionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  optionDescription: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});

export default SignUpMethodScreen;

