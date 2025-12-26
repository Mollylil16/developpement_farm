/**
 * Écran de collecte des informations utilisateur
 * Collecte nom et prénom obligatoires (min 2 caractères chacun)
 * Puis création du compte via OnboardingService
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import { SCREENS } from '../navigation/types';
import { getOnboardingService } from '../services/OnboardingService';
import { useAppDispatch } from '../store/hooks';
import { updateUser } from '../store/slices/authSlice';
import apiClient from '../services/api/apiClient';

interface RouteParams {
  phone?: string;
  email?: string;
  provider?: 'telephone' | 'google' | 'apple';
  providerId?: string;
  existingUser?: any; // Utilisateur existant (OAuth) qui a besoin de compléter ses infos
}

const UserInfoScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const params = (route.params || {}) as RouteParams;

  const [firstName, setFirstName] = useState(params.existingUser?.prenom || '');
  const [lastName, setLastName] = useState(params.existingUser?.nom || '');
  const [isLoading, setIsLoading] = useState(false);

  // Validation en temps réel
  const isFirstNameValid = firstName.trim().length >= 2;
  const isLastNameValid = lastName.trim().length >= 2;
  const canSubmit = isFirstNameValid && isLastNameValid;

  const handleSubmit = async () => {
    // Validation finale
    if (!isFirstNameValid) {
      Alert.alert('Erreur', 'Le prénom doit contenir au moins 2 caractères');
      return;
    }

    if (!isLastNameValid) {
      Alert.alert('Erreur', 'Le nom doit contenir au moins 2 caractères');
      return;
    }

    try {
      setIsLoading(true);

      const onboardingService = await getOnboardingService();

      // Si c'est un utilisateur existant (OAuth avec infos incomplètes), mettre à jour
      if (params.existingUser) {
        await apiClient.patch(`/users/${params.existingUser.id}`, {
          prenom: firstName.trim(),
          nom: lastName.trim(),
        });

        // Mettre à jour le Redux store
        dispatch(
          updateUser({
            ...params.existingUser,
            prenom: firstName.trim(),
            nom: lastName.trim(),
          })
        );

        // Naviguer vers ProfileSelection
        navigation.navigate(SCREENS.PROFILE_SELECTION as never, {
          userId: params.existingUser.id,
        });
        return;
      }

      // Sinon, créer un nouvel utilisateur
      const user = await onboardingService.createUser({
        phone: params.phone,
        email: params.email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        provider: params.provider || (params.phone ? 'telephone' : 'email'),
        providerId: params.providerId,
      });

      // Naviguer vers ProfileSelection avec userId
      navigation.navigate(SCREENS.PROFILE_SELECTION as never, {
        userId: user.id,
      });
    } catch (error: unknown) {
      console.error('Erreur création compte:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      if (errorMessage.includes('existe déjà') || errorMessage.includes('already exists')) {
        Alert.alert(
          'Compte existant',
          'Un compte existe déjà avec ces informations. Voulez-vous vous connecter ?',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Se connecter',
              onPress: () => navigation.navigate(SCREENS.SIGN_IN as never),
            },
          ]
        );
      } else {
        Alert.alert('Erreur', `Impossible de créer le compte: ${errorMessage}`);
      }
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
        <View style={styles.content}>
          {/* Header */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Vos informations</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Nous avons besoin de votre nom et prénom pour créer votre compte
            </Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Prénom <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isFirstNameValid ? colors.border : colors.error,
                    color: colors.text,
                  },
                ]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Votre prénom"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoFocus
                maxLength={100}
              />
              {firstName.length > 0 && !isFirstNameValid && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  Le prénom doit contenir au moins 2 caractères
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Nom <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isLastNameValid ? colors.border : colors.error,
                    color: colors.text,
                  },
                ]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Votre nom"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                maxLength={100}
              />
              {lastName.length > 0 && !isLastNameValid && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  Le nom doit contenir au moins 2 caractères
                </Text>
              )}
            </View>

            <Button
              title="Continuer"
              onPress={handleSubmit}
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              disabled={!canSubmit || isLoading}
              style={styles.submitButton}
            />
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: SPACING.lg,
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
    flex: 1,
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
  errorText: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  submitButton: {
    marginTop: SPACING.xl,
  },
});

export default UserInfoScreen;

