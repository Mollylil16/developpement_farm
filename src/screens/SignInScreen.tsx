/**
 * Écran de connexion (distinct de l'inscription)
 * Support : Email/Téléphone + OAuth (Google/Apple)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import GoogleLogo from '../components/GoogleLogo';
import AppleLogo from '../components/AppleLogo';
import { SCREENS } from '../navigation/types';
import { useAppDispatch } from '../store/hooks';
import { signIn, signInWithGoogle, signInWithApple } from '../store/slices/authSlice';

type SignInScreenParams = {
  phone?: string;
  email?: string;
};

export default function SignInScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params?: SignInScreenParams }, 'params'>>();
  const dispatch = useAppDispatch();

  // Pré-remplir avec le phone ou email passé en paramètre
  const [identifier, setIdentifier] = useState(route.params?.phone || route.params?.email || '');
  const [loading, setLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<'email' | 'google' | 'apple' | null>(null);

  /**
   * Connexion avec email/téléphone
   */
  const handleEmailPhoneSignIn = async () => {
    if (!identifier.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email ou numéro de téléphone', [
        { text: 'OK' },
      ]);
      return;
    }

    try {
      setLoading(true);
      setLoadingMethod('email');

      // Tenter de se connecter
      await dispatch(signIn({ identifier: identifier.trim() })).unwrap();

      // Succès : navigation automatique gérée par AppNavigator
    } catch (error: any) {
      console.error('[SignIn] Erreur:', error);

      const errorMsg = error.message || String(error);

      // Vérifier si c'est un utilisateur introuvable
      if (
        errorMsg.includes('Utilisateur non trouvé') ||
        errorMsg.includes('Aucun compte trouvé') ||
        errorMsg.includes('not found') ||
        errorMsg.includes('introuvable')
      ) {
        Alert.alert(
          'Compte introuvable',
          'Aucun compte n\'existe avec cet identifiant. Voulez-vous créer un compte ?',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Créer un compte',
              onPress: () => {
                navigation.navigate(SCREENS.SIGN_UP_METHOD as never);
              },
            },
          ]
        );
      } else {
        Alert.alert('Erreur', errorMsg, [{ text: 'OK' }]);
      }
    } finally {
      setLoading(false);
      setLoadingMethod(null);
    }
  };

  /**
   * Connexion via Google
   */
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setLoadingMethod('google');

      await dispatch(signInWithGoogle()).unwrap();

      // Succès : navigation automatique gérée par AppNavigator
    } catch (error: any) {
      console.error('[SignIn] Erreur Google:', error);

      if (error.message?.includes('annulée') || error.message?.includes('cancelled')) {
        return;
      }

      Alert.alert(
        'Erreur',
        error.message || 'Impossible de se connecter avec Google. Réessayez.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setLoadingMethod(null);
    }
  };

  /**
   * Connexion via Apple
   */
  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Non disponible', 'La connexion Apple n\'est disponible que sur iOS', [
        { text: 'OK' },
      ]);
      return;
    }

    try {
      setLoading(true);
      setLoadingMethod('apple');

      await dispatch(signInWithApple()).unwrap();

      // Succès : navigation automatique gérée par AppNavigator
    } catch (error: any) {
      console.error('[SignIn] Erreur Apple:', error);

      if (error.message?.includes('annulée') || error.message?.includes('cancelled')) {
        return;
      }

      Alert.alert(
        'Erreur',
        error.message || 'Impossible de se connecter avec Apple. Réessayez.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setLoadingMethod(null);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header avec bouton retour */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.backButton, { backgroundColor: colors.surface }]}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <Text style={styles.illustrationEmoji}>🔐</Text>
            <Text style={[styles.illustrationText, { color: colors.textSecondary }]}>
              Content de vous revoir !
            </Text>
          </View>

          {/* Titre */}
          <Text style={[styles.title, { color: colors.text }]}>Se connecter</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Connectez-vous à votre compte Fermier Pro
          </Text>

          {/* Formulaire Email/Téléphone */}
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.text }]}>Email ou Téléphone</Text>
            <View
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="person-circle"
                size={20}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Email ou numéro de téléphone"
                placeholderTextColor={colors.textSecondary}
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                autoFocus={!route.params?.phone && !route.params?.email}
              />
            </View>

            <Button
              title={
                loadingMethod === 'email' ? 'Connexion en cours...' : 'Se connecter'
              }
              onPress={handleEmailPhoneSignIn}
              variant="primary"
              size="large"
              fullWidth
              disabled={loading}
              style={{ marginTop: SPACING.lg }}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>ou</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* OAuth Buttons */}
          <View style={styles.oauthButtons}>
            {/* Google */}
            <TouchableOpacity
              style={[
                styles.oauthButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...colors.shadow.medium,
                },
              ]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <View style={[styles.oauthIconContainer, { backgroundColor: '#DB4437' + '15' }]}>
                <GoogleLogo size={24} />
              </View>
              <Text style={[styles.oauthButtonText, { color: colors.text }]}>
                Google
              </Text>
              {loadingMethod === 'google' && (
                <ActivityIndicator size="small" color={colors.primary} style={styles.oauthLoader} />
              )}
            </TouchableOpacity>

            {/* Apple (iOS uniquement) */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[
                  styles.oauthButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    ...colors.shadow.medium,
                  },
                ]}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                <View style={[styles.oauthIconContainer, { backgroundColor: '#000' + '15' }]}>
                  <AppleLogo size={24} color="#000" />
                </View>
                <Text style={[styles.oauthButtonText, { color: colors.text }]}>
                  Apple
                </Text>
                {loadingMethod === 'apple' && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={styles.oauthLoader}
                  />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Lien vers inscription */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Vous n'avez pas de compte ?{' '}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.SIGN_UP_METHOD as never)}
              disabled={loading}
            >
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Créer un compte
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  form: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.sm,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    height: 56,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  textInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
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
  oauthButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  oauthButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    minHeight: 56,
  },
  oauthIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  oauthButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  oauthLoader: {
    marginLeft: SPACING.xs,
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

