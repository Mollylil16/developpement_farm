/**
 * Écran de définition du nouveau mot de passe
 * Après vérification OTP de réinitialisation
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import { SCREENS } from '../navigation/types';
import { getOnboardingService } from '../services/OnboardingService';

// Helpers pour force du mot de passe (réutilisés depuis PhoneSignUpScreen)
function getPasswordStrength(password: string): string {
  if (password.length < 6) return 'Trop faible';
  if (password.length < 8) return 'Faible';
  if (password.length < 10) return 'Moyen';
  if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
    return 'Fort';
  }
  return 'Moyen';
}

function getPasswordStrengthPercent(password: string): number {
  if (password.length < 6) return 25;
  if (password.length < 8) return 50;
  if (password.length < 10) return 75;
  return 100;
}

function getPasswordStrengthColor(password: string): string {
  const strength = getPasswordStrength(password);
  if (strength === 'Trop faible' || strength === 'Faible') return '#EF4444';
  if (strength === 'Moyen') return '#F59E0B';
  return '#10B981';
}

const ResetPasswordScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute();
  const params = (route.params || {}) as { phone?: string; resetToken?: string };

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleResetPassword = async () => {
    // Validation
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (!params.resetToken) {
      Alert.alert('Erreur', 'Token de réinitialisation manquant');
      navigation.goBack();
      return;
    }

    setIsLoading(true);

    try {
      const onboardingService = await getOnboardingService();
      await onboardingService.resetPassword(params.resetToken, newPassword);

      Alert.alert(
        'Succès',
        'Votre mot de passe a été réinitialisé avec succès',
        [
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate(SCREENS.SIGN_IN as never, { phone: params.phone }),
          },
        ]
      );
    } catch (error: unknown) {
      console.error('Erreur réinitialisation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      if (errorMessage.includes('expiré') || errorMessage.includes('expired')) {
        Alert.alert(
          'Code expiré',
          'Le code de réinitialisation a expiré. Veuillez en demander un nouveau.',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Demander un nouveau code',
              onPress: () => navigation.navigate(SCREENS.FORGOT_PASSWORD as never),
            },
          ]
        );
      } else {
        Alert.alert('Erreur', `Impossible de réinitialiser le mot de passe: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    newPassword.length >= 6 &&
    confirmPassword.length >= 6 &&
    newPassword === confirmPassword;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Nouveau mot de passe</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Définissez votre nouveau mot de passe
            </Text>
          </View>

          <View style={styles.form}>
            {/* Nouveau mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Nouveau mot de passe <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Minimum 6 caractères"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirmer mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Confirmer le mot de passe <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Retapez votre mot de passe"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  Les mots de passe ne correspondent pas
                </Text>
              )}
            </View>

            {/* Indicateur force */}
            {newPassword.length > 0 && (
              <View style={styles.passwordStrength}>
                <Text style={[styles.passwordStrengthLabel, { color: colors.textSecondary }]}>
                  Force : {getPasswordStrength(newPassword)}
                </Text>
                <View style={[styles.strengthBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${getPasswordStrengthPercent(newPassword)}%`,
                        backgroundColor: getPasswordStrengthColor(newPassword),
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Bouton */}
            <Button
              title="Réinitialiser le mot de passe"
              onPress={handleResetPassword}
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              disabled={!isFormValid || isLoading}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  backButton: {
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  header: {
    marginBottom: SPACING.xl,
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
  form: {
    marginTop: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.sm,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    paddingRight: SPACING.xl * 2,
    fontSize: FONT_SIZES.md,
  },
  eyeButton: {
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.md,
    padding: SPACING.xs,
  },
  errorText: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  passwordStrength: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  passwordStrengthLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
});

export default ResetPasswordScreen;

