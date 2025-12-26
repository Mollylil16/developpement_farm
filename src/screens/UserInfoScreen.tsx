/**
 * Écran de collecte des informations utilisateur (Nom + Prénom)
 * OBLIGATOIRE : Minimum 2 caractères pour chaque champ
 * Pas de valeurs par défaut "Mobile" ou "Utilisateur"
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import { SCREENS } from '../navigation/types';
import { getOnboardingService } from '../services/OnboardingService';
import { useAppDispatch } from '../store/hooks';
import { setUser } from '../store/slices/authSlice';

type UserInfoScreenParams = {
  phone?: string;
  email?: string;
  userId?: string; // Si l'utilisateur existe déjà (OAuth avec infos incomplètes)
  provider: 'phone' | 'google' | 'apple';
};

export default function UserInfoScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: UserInfoScreenParams }, 'params'>>();
  const dispatch = useAppDispatch();

  const { phone, email, userId, provider } = route.params;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  // Validation en temps réel
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');

  /**
   * Valider le prénom
   */
  const validateFirstName = (value: string): string => {
    if (!value.trim()) {
      return 'Le prénom est obligatoire';
    }
    if (value.trim().length < 2) {
      return 'Le prénom doit contenir au moins 2 caractères';
    }
    if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(value)) {
      return 'Le prénom ne peut contenir que des lettres';
    }
    return '';
  };

  /**
   * Valider le nom
   */
  const validateLastName = (value: string): string => {
    if (!value.trim()) {
      return 'Le nom est obligatoire';
    }
    if (value.trim().length < 2) {
      return 'Le nom doit contenir au moins 2 caractères';
    }
    if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(value)) {
      return 'Le nom ne peut contenir que des lettres';
    }
    return '';
  };

  /**
   * Gérer le changement de prénom avec validation en temps réel
   */
  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    if (value) {
      setFirstNameError(validateFirstName(value));
    } else {
      setFirstNameError('');
    }
  };

  /**
   * Gérer le changement de nom avec validation en temps réel
   */
  const handleLastNameChange = (value: string) => {
    setLastName(value);
    if (value) {
      setLastNameError(validateLastName(value));
    } else {
      setLastNameError('');
    }
  };

  /**
   * Gérer la soumission du formulaire
   */
  const handleSubmit = async () => {
    // Validation finale
    const firstNameErr = validateFirstName(firstName);
    const lastNameErr = validateLastName(lastName);

    setFirstNameError(firstNameErr);
    setLastNameError(lastNameErr);

    if (firstNameErr || lastNameErr) {
      return;
    }

    try {
      setLoading(true);

      const onboardingService = getOnboardingService();

      let createdUserId: string;

      if (userId) {
        // Cas OAuth : L'utilisateur existe déjà, on met à jour ses infos
        console.log('[UserInfo] Mise à jour utilisateur OAuth:', userId);
        
        // TODO: Créer une méthode updateUser dans OnboardingService
        // Pour l'instant, on va créer un nouvel utilisateur avec les bonnes infos
        // En production, il faudrait faire un PATCH /users/:id
        
        // Workaround temporaire : on va directement vers ProfileSelection
        // avec l'assumption que le backend gère la mise à jour
        createdUserId = userId;
      } else {
        // Cas téléphone : Créer un nouvel utilisateur
        console.log('[UserInfo] Création nouvel utilisateur:', { phone, email, provider });

        const newUser = await onboardingService.createUser({
          phone,
          email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          provider,
        });

        createdUserId = newUser.id;

        // Mettre à jour le store Redux
        dispatch(setUser(newUser));
      }

      // Naviguer vers ProfileSelection avec le userId
      navigation.navigate(SCREENS.PROFILE_SELECTION as never, {
        userId: createdUserId,
      });
    } catch (error: any) {
      console.error('[UserInfo] Erreur création utilisateur:', error);

      let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';

      if (error.message?.includes('déjà utilisé') || error.message?.includes('already exists')) {
        errorMessage =
          'Ce numéro ou email est déjà utilisé. Voulez-vous vous connecter à la place ?';
        Alert.alert('Compte existant', errorMessage, [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Se connecter',
            onPress: () => {
              navigation.navigate(SCREENS.SIGN_IN as never, { phone, email });
            },
          },
        ]);
        return;
      }

      Alert.alert('Erreur', errorMessage, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Vérifier si le formulaire est valide
  const isFormValid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    !firstNameError &&
    !lastNameError;

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
            <Text style={styles.illustrationEmoji}>👤</Text>
          </View>

          {/* Titre */}
          <Text style={[styles.title, { color: colors.text }]}>Vos informations</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Entrez votre nom et prénom pour créer votre compte
          </Text>

          {/* Formulaire */}
          <View style={styles.form}>
            {/* Prénom */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                Prénom <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: firstNameError ? colors.error : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="person"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Ex: Jean"
                  placeholderTextColor={colors.textSecondary}
                  value={firstName}
                  onChangeText={handleFirstNameChange}
                  autoFocus
                  editable={!loading}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {firstName.length >= 2 && !firstNameError && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                )}
              </View>
              {firstNameError ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{firstNameError}</Text>
              ) : (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  Minimum 2 caractères
                </Text>
              )}
            </View>

            {/* Nom */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                Nom <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: lastNameError ? colors.error : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="person"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Ex: Dupont"
                  placeholderTextColor={colors.textSecondary}
                  value={lastName}
                  onChangeText={handleLastNameChange}
                  editable={!loading}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {lastName.length >= 2 && !lastNameError && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                )}
              </View>
              {lastNameError ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{lastNameError}</Text>
              ) : (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  Minimum 2 caractères
                </Text>
              )}
            </View>
          </View>

          {/* Information */}
          <View style={[styles.infoBox, { backgroundColor: colors.primaryLight + '10' }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Vos nom et prénom seront utilisés pour personnaliser votre expérience Fermier Pro.
            </Text>
          </View>

          {/* Bouton de soumission */}
          <Button
            title={loading ? 'Création du compte...' : 'Continuer'}
            onPress={handleSubmit}
            variant="primary"
            size="large"
            fullWidth
            disabled={!isFormValid || loading}
          />

          {/* Indications de sécurité */}
          <View style={styles.securityInfo}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            <Text style={[styles.securityText, { color: colors.textSecondary }]}>
              Vos données sont sécurisées et confidentielles
            </Text>
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
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.sm,
  },
  required: {
    color: '#EF4444',
    fontSize: FONT_SIZES.lg,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
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
  hint: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.sm,
    lineHeight: 20,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  securityText: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
  },
});

