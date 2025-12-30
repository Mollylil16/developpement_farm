/**
 * Écran de connexion (distinct de l'inscription)
 * Permet de se connecter avec email/téléphone + mot de passe ou OAuth
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import { SCREENS } from '../navigation/types';
import { useAppDispatch } from '../store/hooks';
import { signIn, signInWithGoogle, signInWithApple } from '../store/slices/authSlice';
import GoogleLogo from '../components/GoogleLogo';
import AppleLogo from '../components/AppleLogo';

const SignInScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const params = (route.params || {}) as { phone?: string };

  const [identifier, setIdentifier] = useState(params.phone || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!identifier.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email ou numéro de téléphone');
      return;
    }

    try {
      setIsLoading(true);
      await dispatch(signIn({ identifier: identifier.trim(), password: password || undefined })).unwrap();
      // La navigation sera gérée par AppNavigator qui détecte isAuthenticated
    } catch (error: unknown) {
      console.error('Erreur connexion:', error);
      console.error('Type erreur:', typeof error, 'Is Error:', error instanceof Error);
      
      // Extraire le message d'erreur correctement
      // Avec Redux Toolkit, rejectWithValue retourne directement la valeur (string)
      let errorMessage = 'Erreur de connexion. Veuillez réessayer.';
      
      if (typeof error === 'string') {
        // Si c'est directement une string (cas le plus probable avec rejectWithValue)
        errorMessage = error;
      } else if (error instanceof Error) {
        // Si c'est une Error standard
        errorMessage = error.message || errorMessage;
      } else if (error && typeof error === 'object') {
        // Si c'est un objet, vérifier les propriétés communes
        const errorObj = error as Record<string, unknown>;
        errorMessage = 
          (typeof errorObj.message === 'string' ? errorObj.message : null) ||
          (typeof errorObj.payload === 'string' ? errorObj.payload : null) ||
          (typeof errorObj.error === 'string' ? errorObj.error : null) ||
          errorMessage;
      }
      
      console.error('Message d\'erreur extrait:', errorMessage);
      Alert.alert('Erreur de connexion', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await dispatch(signInWithGoogle()).unwrap();
      // La navigation sera gérée par AppNavigator
    } catch (error: unknown) {
      console.error('Erreur Google OAuth:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      if (errorMessage.includes('cancelled') || errorMessage.includes('annulé')) {
        return;
      }

      Alert.alert('Erreur', 'La connexion avec Google a échoué. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Info', "La connexion Apple n'est disponible que sur iOS");
      return;
    }

    try {
      setIsLoading(true);
      await dispatch(signInWithApple()).unwrap();
      // La navigation sera gérée par AppNavigator
    } catch (error: unknown) {
      console.error('Erreur Apple OAuth:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      if (errorMessage.includes('cancelled') || errorMessage.includes('annulé')) {
        return;
      }

      Alert.alert('Erreur', 'La connexion avec Apple a échoué. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

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
          showsVerticalScrollIndicator={false}
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
            <Text style={[styles.title, { color: colors.text }]}>Se connecter</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Connectez-vous à votre compte Fermier Pro
            </Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email ou Téléphone</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="email@exemple.com ou 0123456789"
                placeholderTextColor={colors.textSecondary}
                keyboardType="default"
                autoCapitalize="none"
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Mot de passe (optionnel)</Text>
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
                  placeholder="Votre mot de passe"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
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
              {/* Lien mot de passe oublié */}
              <TouchableOpacity
                onPress={() => navigation.navigate(SCREENS.FORGOT_PASSWORD as never)}
                style={styles.forgotLink}
              >
                <Text style={[styles.forgotText, { color: colors.primary }]}>
                  Mot de passe oublié ?
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Se connecter"
              onPress={handleSignIn}
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              style={styles.submitButton}
            />
          </View>

          {/* Séparateur */}
          <View style={styles.separator}>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.separatorText, { color: colors.textSecondary }]}>Ou</Text>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
          </View>

          {/* OAuth */}
          <View style={styles.oauthContainer}>
            <TouchableOpacity
              style={[
                styles.oauthButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...colors.shadow?.small,
                },
              ]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <GoogleLogo size={20} />
              <Text style={[styles.oauthText, { color: colors.text }]}>Continuer avec Google</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[
                  styles.oauthButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    ...colors.shadow?.small,
                  },
                ]}
                onPress={handleAppleSignIn}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <AppleLogo size={20} />
                <Text style={[styles.oauthText, { color: colors.text }]}>Continuer avec Apple</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Lien vers inscription */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Vous n'avez pas de compte ?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREENS.SIGN_UP_METHOD as never)}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Créer un compte</Text>
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
    marginBottom: SPACING.xl,
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
  forgotLink: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  submitButton: {
    marginTop: SPACING.md,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: SPACING.md,
    fontSize: FONT_SIZES.sm,
  },
  oauthContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  oauthText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
  },
  footerLink: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

export default SignInScreen;

