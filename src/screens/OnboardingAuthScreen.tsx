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
import { APIError } from '../services/api/apiError';

/**
 * Types d'erreurs possibles lors de l'authentification
 */
enum ErrorType {
  USER_NOT_FOUND = 'USER_NOT_FOUND',           // Utilisateur introuvable (cas normal pour nouveau compte)
  NETWORK_ERROR = 'NETWORK_ERROR',             // Problème de connexion Internet
  SERVER_ERROR = 'SERVER_ERROR',               // Erreur serveur (500, 503, etc.)
  DATABASE_ERROR = 'DATABASE_ERROR',           // Erreur PostgreSQL (table manquante, migration, etc.)
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR', // Erreur d'authentification (token invalide, etc.)
  VALIDATION_ERROR = 'VALIDATION_ERROR',       // Erreur de validation (email invalide, etc.)
  CONFLICT_ERROR = 'CONFLICT_ERROR',           // Conflit (email déjà utilisé, etc.)
  CANCELLED = 'CANCELLED',                     // Opération annulée par l'utilisateur
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',             // Erreur inconnue
}

/**
 * Résultat de l'analyse d'erreur
 */
interface ErrorAnalysis {
  type: ErrorType;
  message: string;
  originalError: string;
  shouldShowInfoCard: boolean; // Si true, afficher InfoCard; si false, afficher Alert
  shouldNavigate: boolean;     // Si true, continuer la navigation malgré l'erreur
}

/**
 * Analyse une erreur d'authentification pour déterminer son type et comment la traiter
 * @param error L'erreur capturée
 * @returns Analyse détaillée de l'erreur
 */
function analyzeAuthError(error: unknown): ErrorAnalysis {
  // Extraire le message d'erreur
  let errorMessage = '';
  let statusCode: number | undefined;
  
  if (error instanceof APIError) {
    errorMessage = error.message;
    statusCode = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = String(error);
  }
  
  const lowerMessage = errorMessage.toLowerCase();
  
  // 1. UTILISATEUR NON TROUVÉ (cas normal pour nouveau compte)
  // Patterns: "utilisateur non trouvé", "aucun compte trouvé", "not found", "user not found"
  // HTTP Status: 401, 404
  const userNotFoundPatterns = [
    'utilisateur non trouvé',
    'aucun compte trouvé',
    'user not found',
    'not found',
    'introuvable',
    'no user found',
    'compte inexistant',
    'n\'existe pas',
  ];
  
  const isUserNotFound = 
    (statusCode === 401 || statusCode === 404) ||
    userNotFoundPatterns.some(pattern => lowerMessage.includes(pattern));
  
  if (isUserNotFound) {
    return {
      type: ErrorType.USER_NOT_FOUND,
      message: 'Bienvenue ! 🎉',
      originalError: errorMessage,
      shouldShowInfoCard: true,
      shouldNavigate: true,
    };
  }
  
  // 2. ERREUR BASE DE DONNÉES POSTGRESQL
  // Patterns: "relation does not exist", "table", "column", "constraint"
  // Cela arrive quand les migrations ne sont pas appliquées
  const databaseErrorPatterns = [
    'relation',
    'does not exist',
    'table',
    'column',
    'constraint',
    'syntax error at or near',
    'duplicate key',
    'foreign key',
    'violates',
    'pg_',
    'postgresql',
  ];
  
  const isDatabaseError = databaseErrorPatterns.some(pattern => 
    lowerMessage.includes(pattern)
  );
  
  if (isDatabaseError) {
    console.warn('⚠️ [ErrorAnalysis] Erreur PostgreSQL détectée:', errorMessage);
    return {
      type: ErrorType.DATABASE_ERROR,
      message: 'Bienvenue ! ✨',
      originalError: errorMessage,
      shouldShowInfoCard: true,
      shouldNavigate: true, // On continue l'onboarding même si la BDD a des soucis
    };
  }
  
  // 3. ERREUR RÉSEAU
  // Patterns: "network", "timeout", "connexion", "internet", "fetch failed"
  // HTTP Status: timeout
  const networkErrorPatterns = [
    'network',
    'timeout',
    'connexion',
    'internet',
    'fetch failed',
    'failed to fetch',
    'connection refused',
    'econnrefused',
    'enotfound',
    'getaddrinfo',
  ];
  
  const isNetworkError = networkErrorPatterns.some(pattern => 
    lowerMessage.includes(pattern)
  );
  
  if (isNetworkError) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: 'Vérifiez votre connexion Internet',
      originalError: errorMessage,
      shouldShowInfoCard: false,
      shouldNavigate: false,
    };
  }
  
  // 4. ERREUR SERVEUR (500, 502, 503, etc.)
  // HTTP Status: 500-599
  const serverErrorPatterns = [
    'internal server error',
    'service unavailable',
    'bad gateway',
    'gateway timeout',
    '500',
    '502',
    '503',
    '504',
  ];
  
  const isServerError = 
    (statusCode !== undefined && statusCode >= 500) ||
    serverErrorPatterns.some(pattern => lowerMessage.includes(pattern));
  
  if (isServerError) {
    return {
      type: ErrorType.SERVER_ERROR,
      message: 'Service temporairement indisponible',
      originalError: errorMessage,
      shouldShowInfoCard: false,
      shouldNavigate: false,
    };
  }
  
  // 5. ERREUR D'AUTHENTIFICATION (token invalide, expiré, etc.)
  // HTTP Status: 401, 403
  const authErrorPatterns = [
    'token',
    'expired',
    'invalid',
    'unauthorized',
    'forbidden',
    'authentication',
    'credential',
  ];
  
  const isAuthError = 
    (statusCode === 401 || statusCode === 403) ||
    authErrorPatterns.some(pattern => lowerMessage.includes(pattern));
  
  if (isAuthError && !isUserNotFound) {
    return {
      type: ErrorType.AUTHENTICATION_ERROR,
      message: 'Authentification échouée',
      originalError: errorMessage,
      shouldShowInfoCard: false,
      shouldNavigate: false,
    };
  }
  
  // 6. ERREUR DE VALIDATION (email invalide, données manquantes, etc.)
  // HTTP Status: 400
  const validationErrorPatterns = [
    'validation',
    'invalid email',
    'invalid phone',
    'required',
    'must be',
    'should be',
    'format',
  ];
  
  const isValidationError = 
    (statusCode === 400) ||
    validationErrorPatterns.some(pattern => lowerMessage.includes(pattern));
  
  if (isValidationError) {
    return {
      type: ErrorType.VALIDATION_ERROR,
      message: 'Données invalides',
      originalError: errorMessage,
      shouldShowInfoCard: false,
      shouldNavigate: false,
    };
  }
  
  // 7. ERREUR DE CONFLIT (email déjà utilisé, etc.)
  // HTTP Status: 409
  const conflictErrorPatterns = [
    'conflict',
    'already exists',
    'déjà utilisé',
    'already used',
    'duplicate',
  ];
  
  const isConflictError = 
    (statusCode === 409) ||
    conflictErrorPatterns.some(pattern => lowerMessage.includes(pattern));
  
  if (isConflictError) {
    return {
      type: ErrorType.CONFLICT_ERROR,
      message: 'Ce compte existe déjà',
      originalError: errorMessage,
      shouldShowInfoCard: false,
      shouldNavigate: false,
    };
  }
  
  // 8. OPÉRATION ANNULÉE (utilisateur a fermé la popup OAuth, etc.)
  const cancelledPatterns = [
    'cancelled',
    'canceled',
    'annulé',
    'user cancelled',
    'dismiss',
  ];
  
  const isCancelled = cancelledPatterns.some(pattern => 
    lowerMessage.includes(pattern)
  );
  
  if (isCancelled) {
    return {
      type: ErrorType.CANCELLED,
      message: '',
      originalError: errorMessage,
      shouldShowInfoCard: false,
      shouldNavigate: false,
    };
  }
  
  // 9. ERREUR INCONNUE (par défaut)
  console.error('❌ [ErrorAnalysis] Erreur non classifiée:', errorMessage);
  return {
    type: ErrorType.UNKNOWN_ERROR,
    message: 'Une erreur inattendue s\'est produite',
    originalError: errorMessage,
    shouldShowInfoCard: false,
    shouldNavigate: false,
  };
}

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
          // Afficher un message de bienvenue pour les nouveaux utilisateurs
          setInfoCardMessage('Bienvenue sur Fermier Pro ! 🎉');
          setInfoCardSubmessage('Configurons votre profil');
          setShowInfoCard(true);
          
          // Naviguer vers la sélection de profil après un délai
          setTimeout(() => {
            navigation.navigate(SCREENS.PROFILE_SELECTION as never);
          }, 1200);
        } else {
          // Utilisateur existant : la navigation sera gérée par AppNavigator
          // qui redirigera automatiquement vers le dashboard
        }
      }
    } catch (error: unknown) {
      // Analyser l'erreur Google OAuth
      const analysis = analyzeAuthError(error);
      
      console.error('❌ [Google OAuth] Erreur:', {
        type: analysis.type,
        originalError: analysis.originalError,
      });
      
      // Ne rien afficher si l'utilisateur a annulé
      if (analysis.type === ErrorType.CANCELLED) {
        return;
      }
      
      // Cas spécial : Client ID manquant (erreur de configuration)
      const errorMsg = analysis.originalError.toLowerCase();
      if (errorMsg.includes('client id manquant') || errorMsg.includes('not configured')) {
        Alert.alert(
          'Configuration requise',
          'La connexion Google n\'est pas encore configurée. Veuillez utiliser votre email pour créer un compte.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Messages d'erreur spécifiques pour Google OAuth
      let alertTitle = '';
      let alertMessage = '';
      
      switch (analysis.type) {
        case ErrorType.NETWORK_ERROR:
          alertTitle = 'Connexion impossible';
          alertMessage = 'Vérifiez votre connexion Internet et réessayez.';
          break;
          
        case ErrorType.AUTHENTICATION_ERROR:
          alertTitle = 'Authentification Google échouée';
          alertMessage = 'La connexion avec Google a échoué. Veuillez réessayer ou utiliser votre email.';
          break;
          
        case ErrorType.SERVER_ERROR:
          alertTitle = 'Service temporairement indisponible';
          alertMessage = 'Nos serveurs sont temporairement indisponibles. Veuillez réessayer plus tard.';
          break;
          
        default:
          alertTitle = 'Oups !';
          alertMessage = 'La connexion avec Google n\'a pas fonctionné. Essayez de créer un compte avec votre email.';
      }
      
      Alert.alert(alertTitle, alertMessage, [{ text: 'OK' }]);
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
          // Afficher un message de bienvenue pour les nouveaux utilisateurs
          setInfoCardMessage('Bienvenue sur Fermier Pro ! 🎉');
          setInfoCardSubmessage('Configurons votre profil');
          setShowInfoCard(true);
          
          // Naviguer vers la sélection de profil après un délai
          setTimeout(() => {
            navigation.navigate(SCREENS.PROFILE_SELECTION as never);
          }, 1200);
        } else {
          // Utilisateur existant : la navigation sera gérée par AppNavigator
          // qui redirigera automatiquement vers le dashboard
        }
      }
    } catch (error: unknown) {
      // Analyser l'erreur Apple OAuth
      const analysis = analyzeAuthError(error);
      
      console.error('❌ [Apple OAuth] Erreur:', {
        type: analysis.type,
        originalError: analysis.originalError,
      });
      
      // Ne rien afficher si l'utilisateur a annulé
      if (analysis.type === ErrorType.CANCELLED) {
        return;
      }
      
      // Messages d'erreur spécifiques pour Apple OAuth
      let alertTitle = '';
      let alertMessage = '';
      
      switch (analysis.type) {
        case ErrorType.NETWORK_ERROR:
          alertTitle = 'Connexion impossible';
          alertMessage = 'Vérifiez votre connexion Internet et réessayez.';
          break;
          
        case ErrorType.AUTHENTICATION_ERROR:
          alertTitle = 'Authentification Apple échouée';
          alertMessage = 'La connexion avec Apple a échoué. Veuillez réessayer ou utiliser votre email.';
          break;
          
        default:
          alertTitle = 'Service non disponible';
          alertMessage = 'La connexion avec Apple n\'est pas encore disponible. Veuillez utiliser votre email pour créer un compte.';
      }
      
      Alert.alert(alertTitle, alertMessage, [{ text: 'OK' }]);
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
        // Analyser l'erreur pour déterminer son type et comment la traiter
        const analysis = analyzeAuthError(signInError);
        
        console.log('🔍 [OnboardingAuth] Analyse erreur:', {
          type: analysis.type,
          message: analysis.message,
          shouldNavigate: analysis.shouldNavigate,
          shouldShowInfoCard: analysis.shouldShowInfoCard,
        });
        
        // CAS 1 : UTILISATEUR NON TROUVÉ ou ERREUR DATABASE (cas normaux pour nouveau compte)
        if (analysis.shouldNavigate && analysis.shouldShowInfoCard) {
          // Afficher un message positif avec InfoCard
          setInfoCardMessage(analysis.message);
          setInfoCardSubmessage('Créons votre compte ensemble');
          setShowInfoCard(true);
          
          // Naviguer vers la sélection de profil
          setTimeout(() => {
            (navigation as any).navigate(SCREENS.PROFILE_SELECTION, {
              identifier: identifier.trim(),
              isEmail,
            });
          }, 1200);
        }
        // CAS 2 : ERREUR À AFFICHER (réseau, serveur, validation, etc.)
        else if (!analysis.shouldNavigate) {
          // Ne pas naviguer, relancer l'erreur pour qu'elle soit capturée par le catch général
          throw signInError;
        }
      }
    } catch (error: unknown) {
      // Analyser l'erreur pour afficher un message convivial
      const analysis = analyzeAuthError(error);
      
      console.error('❌ [OnboardingAuth] Erreur capturée:', {
        type: analysis.type,
        originalError: analysis.originalError,
      });
      
      // Ne rien afficher si l'utilisateur a annulé
      if (analysis.type === ErrorType.CANCELLED) {
        return;
      }
      
      // Construire le message d'alerte selon le type d'erreur
      let alertTitle = '';
      let alertMessage = '';
      
      switch (analysis.type) {
        case ErrorType.NETWORK_ERROR:
          alertTitle = 'Connexion impossible';
          alertMessage = 'Vérifiez votre connexion Internet et réessayez.';
          break;
          
        case ErrorType.SERVER_ERROR:
          alertTitle = 'Service temporairement indisponible';
          alertMessage = 'Nos serveurs sont en cours de maintenance. Veuillez réessayer dans quelques instants.';
          break;
          
        case ErrorType.VALIDATION_ERROR:
          alertTitle = 'Données invalides';
          alertMessage = 'Vérifiez que votre email ou numéro de téléphone est correct.';
          break;
          
        case ErrorType.CONFLICT_ERROR:
          alertTitle = 'Compte existant';
          alertMessage = 'Un compte existe déjà avec cet email ou ce numéro de téléphone.';
          break;
          
        case ErrorType.AUTHENTICATION_ERROR:
          alertTitle = 'Authentification échouée';
          alertMessage = 'Impossible de vous authentifier. Veuillez réessayer.';
          break;
          
        case ErrorType.DATABASE_ERROR:
          alertTitle = 'Erreur technique';
          alertMessage = 'Un problème technique temporaire est survenu. Veuillez réessayer.';
          break;
          
        default:
          alertTitle = 'Oups !';
          alertMessage = 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
      }
      
      Alert.alert(alertTitle, alertMessage, [{ text: 'OK' }]);
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
