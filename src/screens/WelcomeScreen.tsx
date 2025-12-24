/**
 * Écran d'accueil - Point d'entrée de l'application
 * Permet de choisir entre créer un compte ou se connecter
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import { SCREENS } from '../navigation/types';

const WelcomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();

  const handleCreateAccount = () => {
    navigation.navigate(SCREENS.SIGN_UP_METHOD as never);
  };

  const handleSignIn = () => {
    navigation.navigate(SCREENS.SIGN_IN as never);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Logo/Illustration */}
        <View style={styles.logoContainer}>
          <Text style={[styles.logoEmoji, { color: colors.primary }]}>🐷</Text>
          <Text style={[styles.appName, { color: colors.text }]}>Fermier Pro</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Gestion intelligente de votre élevage
          </Text>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={[styles.description, { color: colors.text }]}>
            Bienvenue sur la plateforme de gestion d'élevage la plus complète. Créez votre compte pour
            commencer à gérer votre cheptel efficacement.
          </Text>
        </View>

        {/* Boutons d'action */}
        <View style={styles.buttonsContainer}>
          <Button
            title="Créer un compte"
            onPress={handleCreateAccount}
            variant="primary"
            size="large"
            fullWidth
            style={styles.primaryButton}
          />

          <Button
            title="Se connecter"
            onPress={handleSignIn}
            variant="outline"
            size="large"
            fullWidth
            style={styles.secondaryButton}
          />
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
    padding: SPACING.xl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 2,
  },
  logoEmoji: {
    fontSize: 80,
    marginBottom: SPACING.md,
  },
  appName: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
  descriptionContainer: {
    marginBottom: SPACING.xl * 2,
    paddingHorizontal: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsContainer: {
    gap: SPACING.md,
  },
  primaryButton: {
    marginBottom: SPACING.sm,
  },
  secondaryButton: {
    marginTop: SPACING.sm,
  },
});

export default WelcomeScreen;
