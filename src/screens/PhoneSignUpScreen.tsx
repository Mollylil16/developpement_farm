/**
 * Écran d'inscription par téléphone
 * Étape 1 : Saisie numéro + vérification doublon
 * Étape 2 : Vérification OTP
 */

import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import { SCREENS } from '../navigation/types';
import apiClient from '../services/api/apiClient';

type Step = 'phone' | 'otp';

export default function PhoneSignUpScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Valider le format du numéro de téléphone (8-15 chiffres)
   */
  const validatePhone = (phoneNumber: string): boolean => {
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^[0-9]{8,15}$/;
    return phoneRegex.test(cleanPhone);
  };

  /**
   * Vérifier si le téléphone existe déjà
   */
  const checkPhoneExists = async (phoneNumber: string): Promise<boolean> => {
    try {
      // Appel API pour vérifier si le téléphone existe
      const response = await apiClient.get<{ exists: boolean }>(
        `/users/check/phone/${encodeURIComponent(phoneNumber)}`,
        { skipAuth: true }
      );
      return response.exists;
    } catch (error: any) {
      console.error('[PhoneSignUp] Erreur vérification téléphone:', error);
      // En cas d'erreur API, on assume que le téléphone n'existe pas (pour ne pas bloquer)
      return false;
    }
  };

  /**
   * Envoyer l'OTP (simulé pour l'instant, à implémenter avec un service SMS réel)
   */
  const sendOTP = async (phoneNumber: string): Promise<boolean> => {
    try {
      // TODO: Implémenter l'envoi réel d'OTP via Twilio, AWS SNS, etc.
      // Pour l'instant, on simule avec un délai
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log(`[PhoneSignUp] OTP envoyé à ${phoneNumber}: 123456 (simulé)`);
      return true;
    } catch (error: any) {
      console.error('[PhoneSignUp] Erreur envoi OTP:', error);
      return false;
    }
  };

  /**
   * Vérifier l'OTP (simulé pour l'instant)
   */
  const verifyOTP = async (phoneNumber: string, otpCode: string): Promise<boolean> => {
    try {
      // TODO: Implémenter la vérification réelle d'OTP
      // Pour l'instant, on accepte 123456 ou n'importe quel code de 6 chiffres
      const isValid = otpCode.length === 6;

      console.log(`[PhoneSignUp] Vérification OTP ${otpCode}: ${isValid ? 'Valide' : 'Invalide'}`);
      return isValid;
    } catch (error: any) {
      console.error('[PhoneSignUp] Erreur vérification OTP:', error);
      return false;
    }
  };

  /**
   * Gérer la soumission du numéro de téléphone (Étape 1)
   */
  const handlePhoneSubmit = async () => {
    // Validation
    if (!phone.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone', [{ text: 'OK' }]);
      return;
    }

    const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, '');

    if (!validatePhone(cleanPhone)) {
      Alert.alert(
        'Numéro invalide',
        'Veuillez entrer un numéro de téléphone valide (8-15 chiffres)',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLoading(true);

      // Vérifier si le téléphone existe déjà
      const exists = await checkPhoneExists(cleanPhone);

      if (exists) {
        Alert.alert(
          'Compte existant',
          'Un compte existe déjà avec ce numéro de téléphone. Voulez-vous vous connecter ?',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Se connecter',
              onPress: () => {
                navigation.navigate(SCREENS.SIGN_IN as never, { phone: cleanPhone });
              },
            },
          ]
        );
        return;
      }

      // Envoyer l'OTP
      const otpSent = await sendOTP(cleanPhone);

      if (!otpSent) {
        Alert.alert('Erreur', "Impossible d'envoyer le code de vérification. Réessayez.", [
          { text: 'OK' },
        ]);
        return;
      }

      // Passer à l'étape 2 (vérification OTP)
      setStep('otp');
      setPhone(cleanPhone); // Sauvegarder le numéro nettoyé

      Alert.alert(
        'Code envoyé',
        `Un code de vérification a été envoyé au ${cleanPhone}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('[PhoneSignUp] Erreur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gérer la soumission de l'OTP (Étape 2)
   */
  const handleOTPSubmit = async () => {
    if (!otp.trim() || otp.length !== 6) {
      Alert.alert('Code invalide', 'Veuillez entrer le code à 6 chiffres', [{ text: 'OK' }]);
      return;
    }

    try {
      setLoading(true);

      // Vérifier l'OTP
      const isValid = await verifyOTP(phone, otp);

      if (!isValid) {
        Alert.alert('Code incorrect', 'Le code de vérification est incorrect. Réessayez.', [
          { text: 'OK' },
        ]);
        return;
      }

      // OTP valide, rediriger vers UserInfoScreen pour collecter nom/prénom
      navigation.navigate(SCREENS.USER_INFO as never, {
        phone,
        provider: 'phone',
      });
    } catch (error: any) {
      console.error('[PhoneSignUp] Erreur vérification OTP:', error);
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renvoyer l'OTP
   */
  const handleResendOTP = async () => {
    try {
      setLoading(true);
      const otpSent = await sendOTP(phone);

      if (otpSent) {
        Alert.alert('Code renvoyé', 'Un nouveau code de vérification a été envoyé', [
          { text: 'OK' },
        ]);
      } else {
        Alert.alert('Erreur', "Impossible d'envoyer le code. Réessayez.", [{ text: 'OK' }]);
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Une erreur est survenue.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Retour à l'étape précédente
   */
  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtp('');
    } else {
      navigation.goBack();
    }
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
            <Text style={styles.illustrationEmoji}>
              {step === 'phone' ? '📱' : '🔐'}
            </Text>
          </View>

          {/* ÉTAPE 1 : Saisie numéro */}
          {step === 'phone' && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Votre numéro</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Entrez votre numéro de téléphone pour créer votre compte
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Numéro de téléphone</Text>
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
                    name="call"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Ex: 0707070707"
                    placeholderTextColor={colors.textSecondary}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoFocus
                    editable={!loading}
                  />
                </View>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  Format : 8 à 15 chiffres
                </Text>
              </View>

              <Button
                title={loading ? 'Envoi en cours...' : 'Continuer'}
                onPress={handlePhoneSubmit}
                variant="primary"
                size="large"
                fullWidth
                disabled={loading}
              />
            </>
          )}

          {/* ÉTAPE 2 : Vérification OTP */}
          {step === 'otp' && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Code de vérification</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Entrez le code à 6 chiffres envoyé au {phone}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Code OTP</Text>
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
                    name="lock-closed"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text, letterSpacing: 8 }]}
                    placeholder="000000"
                    placeholderTextColor={colors.textSecondary}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    editable={!loading}
                  />
                </View>
              </View>

              <Button
                title={loading ? 'Vérification...' : 'Vérifier'}
                onPress={handleOTPSubmit}
                variant="primary"
                size="large"
                fullWidth
                disabled={loading}
              />

              {/* Renvoyer le code */}
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendOTP}
                disabled={loading}
              >
                <Text style={[styles.resendText, { color: colors.primary }]}>
                  Renvoyer le code
                </Text>
              </TouchableOpacity>
            </>
          )}
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
  inputContainer: {
    marginBottom: SPACING.xl,
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
  hint: {
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  resendButton: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    padding: SPACING.md,
  },
  resendText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

