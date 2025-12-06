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
  signUp,
  signIn,
  signInWithGoogle,
  signInWithApple,
  clearError,
} from '../store/slices/authSlice';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, ANIMATIONS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import FormField from '../components/FormField';
import GoogleLogo from '../components/GoogleLogo';
import AppleLogo from '../components/AppleLogo';
import { databaseService } from '../services/database';

export default function AuthScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  const [isSignUp, setIsSignUp] = useState(false);
  const [identifier, setIdentifier] = useState(''); // email ou téléphone
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');

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

  const handleAuth = async () => {
    // Validation
    if (!identifier.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email ou numéro de téléphone');
      return;
    }

    if (isSignUp) {
      // Inscription
      if (!nom.trim() || !prenom.trim()) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs');
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
        dispatch(signUp({ email: identifier.trim(), nom: nom.trim(), prenom: prenom.trim() }));
      } else {
        // Validation du téléphone (au moins 8 chiffres)
        const cleanPhone = identifier.replace(/\s+/g, '');
        const phoneRegex = /^[0-9]{8,15}$/;
        if (!phoneRegex.test(cleanPhone)) {
          Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide (8-15 chiffres)');
          return;
        }
        dispatch(signUp({ telephone: cleanPhone, nom: nom.trim(), prenom: prenom.trim() }));
      }
    } else {
      // Connexion - identifier peut être email ou téléphone
      dispatch(signIn({ identifier: identifier.trim() }));
    }
  };

  const handleGoogleAuth = async () => {
    dispatch(signInWithGoogle());
  };

  const handleAppleAuth = async () => {
    if (Platform.OS === 'ios') {
      dispatch(signInWithApple());
    } else {
      Alert.alert('Info', "La connexion Apple n'est disponible que sur iOS");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
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
              <Text style={[styles.title, { color: colors.text }]}>
                {isSignUp ? 'Créer un compte' : 'Connectez-vous'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {isSignUp
                  ? 'Rejoignez Fermier Pro pour gérer votre élevage'
                  : 'Accédez à votre ferme en toute simplicité'}
              </Text>
              {isSignUp && (
                <View
                  style={[
                    styles.infoBox,
                    { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' },
                  ]}
                >
                  <Text style={[styles.infoText, { color: colors.primary }]}>
                    💡 Si vous avez reçu une invitation, utilisez le même email que celui utilisé
                    pour l'invitation. L'invitation sera automatiquement détectée après la création
                    de votre compte.
                  </Text>
                </View>
              )}
            </View>

            {/* Formulaire */}
            <View style={styles.form}>
              <FormField
                label={isSignUp ? 'Email ou Téléphone' : 'Email ou Téléphone'}
                placeholder={
                  isSignUp ? 'votre@email.com ou 0123456789' : 'votre@email.com ou 0123456789'
                }
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType="default"
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

              <Button
                title={isLoading ? 'Chargement...' : isSignUp ? 'Créer mon compte' : 'Se connecter'}
                onPress={handleAuth}
                variant="primary"
                size="large"
                loading={isLoading}
                fullWidth
                style={styles.emailButton}
              />
            </View>

            {/* Séparateur */}
            <View style={styles.separator}>
              <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.separatorText, { color: colors.textSecondary }]}>
                Ou continuez avec
              </Text>
              <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Boutons sociaux */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    ...colors.shadow.small,
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
                      ...colors.shadow.small,
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

            {/* Lien pour basculer entre connexion/inscription */}
            <View style={styles.switchContainer}>
              <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                {isSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setIdentifier('');
                  setNom('');
                  setPrenom('');
                }}
                disabled={isLoading}
              >
                <Text style={[styles.switchLink, { color: colors.primary }]}>
                  {isSignUp ? 'Se connecter' : "S'inscrire"}
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
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
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
  },
  separatorText: {
    marginHorizontal: SPACING.md,
    fontSize: FONT_SIZES.sm,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  switchText: {
    fontSize: FONT_SIZES.md,
    marginRight: SPACING.xs,
  },
  switchLink: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  infoBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});
