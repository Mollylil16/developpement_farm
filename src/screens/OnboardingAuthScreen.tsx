/**
 * Écran d'authentification pour l'onboarding
 * Gère la création de compte (nouveaux utilisateurs) et la connexion (utilisateurs existants)
 * Options: Google, Apple, ou Email/Téléphone
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import GoogleLogo from '../components/GoogleLogo';
import AppleLogo from '../components/AppleLogo';
import { InfoCard } from '../components/InfoCard';
import { SCREENS } from '../navigation/types';
import { getOnboardingService } from '../services/OnboardingService';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  updateUser,
  signInWithGoogle,
  signInWithApple,
  signIn,
  clearError,
} from '../store/slices/authSlice';
import apiClient from '../services/api/apiClient';

const OnboardingAuthScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { isLoading, error, isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [identifier, setIdentifier] = useState(''); // email ou téléphone
  const [showInfoCard, setShowInfoCard] = useState(false);
  const [infoCardMessage, setInfoCardMessage] = useState('');
  const [infoCardSubmessage, setInfoCardSubmessage] = useState('');

  useEffect(() => {
    if (error) {
      Alert.alert('Erreur', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Si l'utilisateur est authentifié, rediriger vers le dashboard
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      // L'utilisateur est connecté, la navigation sera gérée par AppNavigator
      // qui redirigera automatiquement vers le dashboard approprié
    }
  }, [isAuthenticated, user, isLoading]);

  const handleGoogleAuth = async () => {
    try {
      const result = await dispatch(signInWithGoogle()).unwrap();

      if (result) {
        // Vérifier si c'est un nouvel utilisateur (pas de rôles ou rôles vides)
        const isNewUser = !result.roles || Object.keys(result.roles).length === 0;

        if (isNewUser) {
          // Nouvel utilisateur : naviguer vers la sélection de profil
          navigation.navigate(SCREENS.PROFILE_SELECTION as never);
        } else {
          // Utilisateur existant : la navigation sera gérée par AppNavigator
          // qui redirigera automatiquement vers le dashboard
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', `Erreur lors de la connexion avec Google: ${errorMessage}`);
    }
  };

  const handleAppleAuth = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Info', "La connexion Apple n'est disponible que sur iOS");
      return;
    }

    try {
      const result = await dispatch(signInWithApple()).unwrap();

      if (result) {
        // Vérifier si c'est un nouvel utilisateur (pas de rôles ou rôles vides)
        const isNewUser = !result.roles || Object.keys(result.roles).length === 0;

        if (isNewUser) {
          // Nouvel utilisateur : naviguer vers la sélection de profil
          navigation.navigate(SCREENS.PROFILE_SELECTION as never);
        } else {
          // Utilisateur existant : la navigation sera gérée par AppNavigator
          // qui redirigera automatiquement vers le dashboard
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', `Erreur lors de la connexion avec Apple: ${errorMessage}`);
    }
  };

  const handleContinue = async () => {
    // Validation: au moins email ou téléphone
    if (!identifier.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email ou numéro de téléphone');
      return;
    }

    // Déterminer si c'est un email ou un téléphone
    const isEmail = identifier.includes('@');

    if (isEmail) {
      // Validation de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier.trim())) {
        Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
        return;
      }
    } else {
      // Validation du téléphone (au moins 8 chiffres)
      const cleanPhone = identifier.replace(/\s+/g, '');
      const phoneRegex = /^[0-9]{8,15}$/;
      if (!phoneRegex.test(cleanPhone)) {
        Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide (8-15 chiffres)');
        return;
      }
    }

    try {
      // FIX : Vérifier le backend PostgreSQL D'ABORD, pas seulement SQLite local
      // Pourquoi ? Car SQLite est juste un cache. La source de vérité est PostgreSQL.
      try {
        // Essayer de se connecter au backend
        await dispatch(signIn({ identifier: identifier.trim() })).unwrap();
        // Si ça réussit : l'utilisateur existe dans PostgreSQL
        // La navigation sera gérée automatiquement par AppNavigator
        return; // Sortir de la fonction, c'est terminé
      } catch (signInError: unknown) {
        // L'authentification a échoué. Deux cas possibles :
        // 1. Utilisateur n'existe pas dans PostgreSQL → C'est OK, on peut créer le compte
        // 2. Erreur serveur (base de données cassée, réseau, etc.) → Il faut bloquer
        
        const errorMsg = signInError instanceof Error ? signInError.message : String(signInError);
        
        // Vérifier si c'est vraiment "utilisateur non trouvé" (cas 1)
        if (errorMsg.includes('Utilisateur non trouvé') || 
            errorMsg.includes('Aucun compte trouvé') ||
            errorMsg.includes('not found') ||
            errorMsg.includes('introuvable')) {
          // OK, c'est un nouvel utilisateur. Afficher un message positif
          setInfoCardMessage('Bienvenue !');
          setInfoCardSubmessage('Créons votre compte ensemble');
          setShowInfoCard(true);
          
          // Naviguer vers la sélection de profil après un court délai (pour laisser la card s'afficher)
          setTimeout(() => {
            (navigation as any).navigate(SCREENS.PROFILE_SELECTION, {
              identifier: identifier.trim(),
              isEmail,
            });
          }, 1000);
        } else {
          // C'est une autre erreur (base de données cassée, réseau, etc.)
          // On la relance pour qu'elle soit capturée par le catch général plus bas
          throw signInError;
        }
      }
    } catch (error: unknown) {
      // Si c'est une erreur réseau, ne pas naviguer et afficher l'erreur
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      const isNetworkError = errorMessage.includes('connexion au serveur') || 
                            errorMessage.includes('Network request failed') ||
                            errorMessage.includes('Internet');
      
      if (isNetworkError) {
        Alert.alert(
          'Erreur de connexion',
          'Impossible de se connecter au serveur. Vérifiez que:\n' +
          '1. Le backend est démarré\n' +
          '2. Votre téléphone et votre ordinateur sont sur le même réseau Wi-Fi\n' +
          '3. L\'adresse IP du backend est correcte dans la configuration',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erreur', errorMessage);
      }
      // Ne pas naviguer en cas d'erreur
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* InfoCard pour les messages positifs */}
      {showInfoCard && (
        <InfoCard
          message={infoCardMessage}
          submessage={infoCardSubmessage}
          icon="checkmark-circle"
          iconColor="#10B981"
          duration={2500}
          onHide={() => setShowInfoCard(false)}
        />
      )}
      
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Créer votre compte</Text>
          </View>

          {/* Boutons sociaux */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...colors.shadow?.small,
                },
              ]}
              onPress={handleGoogleAuth}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <GoogleLogo size={20} />
              <Text style={[styles.socialText, { color: colors.text, marginLeft: SPACING.sm }]}>
                Google
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    ...colors.shadow?.small,
                  },
                ]}
                onPress={handleAppleAuth}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <AppleLogo size={20} />
                <Text style={[styles.socialText, { color: colors.text, marginLeft: SPACING.sm }]}>
                  Apple
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Séparateur */}
          <View style={styles.separator}>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.separatorText, { color: colors.textSecondary }]}>
              Ou continuez avec
            </Text>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Formulaire Email/Téléphone */}
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
              />
            </View>
          </View>

          {/* Bouton Continuer centré */}
          <View style={styles.buttonContainer}>
            <Button
              title={isLoading ? 'Chargement...' : 'Continuer'}
              onPress={handleContinue}
              variant="primary"
              size="large"
              loading={isLoading}
              fullWidth
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
    paddingBottom: SPACING.xl,
  },
  header: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  backButton: {
    padding: SPACING.xs,
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.sm,
    borderWidth: 1,
    minWidth: 120,
    justifyContent: 'center',
  },
  socialText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
    marginHorizontal: SPACING.lg,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: SPACING.md,
    fontSize: FONT_SIZES.sm,
  },
  form: {
    paddingHorizontal: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  buttonContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    alignItems: 'center', // Centrer le bouton
  },
  submitButton: {
    maxWidth: '100%', // S'assurer que le bouton prend toute la largeur disponible
  },
});

export default OnboardingAuthScreen;
