/**
 * Page d'authentification complète avec Google, Apple et Email
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  clearError,
} from '../store/slices/authSlice';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, ANIMATIONS } from '../constants/theme';
import Button from '../components/Button';
import FormField from '../components/FormField';
import GoogleLogo from '../components/GoogleLogo';
import AppleLogo from '../components/AppleLogo';

export default function AuthScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [password, setPassword] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATIONS.duration.normal,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // La navigation après authentification est gérée automatiquement par AppNavigator
  // qui écoute les changements de isAuthenticated et projetActif

  useEffect(() => {
    // Afficher les erreurs
    if (error) {
      Alert.alert('Erreur', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleEmailAuth = async () => {
    // Validation
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }

    if (isSignUp) {
      // Inscription
      if (!nom.trim() || !prenom.trim()) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        return;
      }
      dispatch(signUpWithEmail({ email, nom, prenom, password: password || 'temp' }));
    } else {
      // Connexion
      if (!password.trim()) {
        Alert.alert('Erreur', 'Veuillez entrer votre mot de passe');
        return;
      }
      dispatch(signInWithEmail({ email, password }));
    }
  };

  const handleGoogleAuth = async () => {
    dispatch(signInWithGoogle());
  };

  const handleAppleAuth = async () => {
    if (Platform.OS === 'ios') {
      dispatch(signInWithApple());
    } else {
      Alert.alert('Info', 'La connexion Apple n\'est disponible que sur iOS');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.animatedContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* En-tête */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {isSignUp ? 'Créer un compte' : 'Connectez-vous'}
              </Text>
              <Text style={styles.subtitle}>
                {isSignUp
                  ? 'Rejoignez Fermier Pro pour gérer votre élevage'
                  : 'Accédez à votre ferme en toute simplicité'}
              </Text>
            </View>

            {/* Formulaire Email */}
            <View style={styles.form}>
              <FormField
                label="Email"
                placeholder="votre@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                required
              />

              {isSignUp && (
                <>
                  <FormField
                    label="Nom"
                    placeholder="Votre nom"
                    value={nom}
                    onChangeText={setNom}
                    autoCapitalize="words"
                    required
                  />
                  <FormField
                    label="Prénom"
                    placeholder="Votre prénom"
                    value={prenom}
                    onChangeText={setPrenom}
                    autoCapitalize="words"
                    required
                  />
                </>
              )}

              {!isSignUp && (
                <FormField
                  label="Mot de passe"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  required
                />
              )}

              <Button
                title={isLoading ? 'Chargement...' : isSignUp ? 'Créer mon compte' : 'Se connecter'}
                onPress={handleEmailAuth}
                variant="primary"
                size="large"
                loading={isLoading}
                fullWidth
                style={styles.emailButton}
              />
            </View>

            {/* Séparateur */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>Ou continuez avec</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Boutons sociaux */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleAuth}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <GoogleLogo size={20} />
                <Text style={[styles.socialText, { marginLeft: SPACING.sm }]}>Google</Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleAppleAuth}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <AppleLogo size={20} />
                  <Text style={[styles.socialText, { marginLeft: SPACING.sm }]}>Apple</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Lien pour basculer entre connexion/inscription */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setEmail('');
                  setNom('');
                  setPrenom('');
                  setPassword('');
                }}
                disabled={isLoading}
              >
                <Text style={styles.switchLink}>
                  {isSignUp ? 'Se connecter' : 'S\'inscrire'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  animatedContent: {
    width: '100%',
  },
  header: {
    marginBottom: SPACING.xxl,
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  emailButton: {
    marginTop: SPACING.lg,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  separatorText: {
    marginHorizontal: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.sm,
    ...COLORS.shadow.small,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 120,
    justifyContent: 'center',
  },
  socialText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.medium,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  switchText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  switchLink: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});
