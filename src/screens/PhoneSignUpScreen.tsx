/**
 * Écran d'inscription par téléphone avec mot de passe
 * Remplace l'ancien système OTP
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import { SCREENS } from '../navigation/types';
import { getOnboardingService } from '../services/OnboardingService';

// Helpers pour force du mot de passe
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

const PhoneSignUpScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async () => {
    const cleanPhone = phone.trim().replace(/\s+/g, '');

    // Validation
    if (!cleanPhone || cleanPhone.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide (minimum 8 chiffres)');
      return;
    }

    const phoneRegex = /^[0-9]{8,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      Alert.alert(
        'Erreur',
        'Format de téléphone invalide. Utilisez uniquement des chiffres (8-15 chiffres)'
      );
      return;
    }

    if (!firstName.trim() || firstName.trim().length < 2) {
      Alert.alert('Erreur', 'Le prénom doit contenir au moins 2 caractères');
      return;
    }

    if (!lastName.trim() || lastName.trim().length < 2) {
      Alert.alert('Erreur', 'Le nom doit contenir au moins 2 caractères');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);

    try {
      const onboardingService = await getOnboardingService();

      // Vérifier si téléphone existe déjà
      const exists = await onboardingService.checkPhoneExists(cleanPhone);

      if (exists) {
        Alert.alert(
          'Compte existant',
          'Ce numéro est déjà enregistré. Voulez-vous vous connecter ?',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Se connecter',
              onPress: () => navigation.navigate(SCREENS.SIGN_IN as any, { phone: cleanPhone }),
            },
          ]
        );
        return;
      }

      // Créer le compte avec mot de passe
      const user = await onboardingService.createUserWithPhone({
        phone: cleanPhone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      });

      // Navigation vers sélection de profil
      navigation.navigate(SCREENS.PROFILE_SELECTION as any, { userId: user.id });
    } catch (error: unknown) {
      console.error('Erreur création compte:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de créer le compte';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    phone.trim().length >= 8 &&
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    password.length >= 6 &&
    password === confirmPassword;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
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
              Inscrivez-vous avec votre numéro de téléphone
            </Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {/* Téléphone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Numéro de téléphone <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Ex: 0712345678"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                autoFocus
                maxLength={15}
              />
            </View>

            {/* Prénom */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Prénom <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ex: Jean"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                maxLength={100}
              />
            </View>

            {/* Nom */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Nom <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Ex: Kouassi"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                maxLength={100}
              />
            </View>

            {/* Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Mot de passe <Text style={{ color: colors.error }}>*</Text>
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
                  value={password}
                  onChangeText={setPassword}
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
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  Les mots de passe ne correspondent pas
                </Text>
              )}
            </View>

            {/* Indicateur force du mot de passe */}
            {password.length > 0 && (
              <View style={styles.passwordStrength}>
                <Text style={[styles.passwordStrengthLabel, { color: colors.textSecondary }]}>
                  Force du mot de passe : {getPasswordStrength(password)}
                </Text>
                <View style={[styles.strengthBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${getPasswordStrengthPercent(password)}%`,
                        backgroundColor: getPasswordStrengthColor(password),
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Bouton inscription */}
            <Button
              title="Créer mon compte"
              onPress={handleSignUp}
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              disabled={!isFormValid || isLoading}
              style={styles.submitButton}
            />

            {/* Lien connexion */}
            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.SIGN_IN as any)}
              style={styles.linkContainer}
            >
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                Vous avez déjà un compte ?{' '}
                <Text style={[styles.linkBold, { color: colors.primary }]}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
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
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
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
  linkContainer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  linkText: {
    fontSize: FONT_SIZES.sm,
  },
  linkBold: {
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

export default PhoneSignUpScreen;
