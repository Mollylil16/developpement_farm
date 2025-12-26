/**
 * Écran de réinitialisation de mot de passe
 * 2 étapes : Demande OTP + Vérification OTP
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import { SCREENS } from '../navigation/types';
import { getOnboardingService } from '../services/OnboardingService';

type Step = 'phone' | 'otp';

const ForgotPasswordScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleRequestReset = async () => {
    const cleanPhone = phone.trim().replace(/\s+/g, '');

    if (!cleanPhone || cleanPhone.length < 8) {
      Alert.alert('Erreur', 'Numéro de téléphone invalide');
      return;
    }

    const phoneRegex = /^[0-9]{8,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      Alert.alert('Erreur', 'Format de téléphone invalide');
      return;
    }

    setIsLoading(true);

    try {
      const onboardingService = await getOnboardingService();
      await onboardingService.requestPasswordReset(cleanPhone);

      setStep('otp');
      setCountdown(60); // 60 secondes avant renvoyer

      Alert.alert(
        'Code envoyé',
        'Un code de réinitialisation a été envoyé par SMS'
      );
    } catch (error: unknown) {
      console.error('Erreur demande réinitialisation:', error);
      // Ne pas révéler si le compte existe ou non (sécurité)
      Alert.alert(
        'Code envoyé',
        'Si ce numéro est enregistré, un code de réinitialisation a été envoyé par SMS'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Erreur', 'Code invalide (6 chiffres requis)');
      return;
    }

    setIsLoading(true);

    try {
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      const onboardingService = await getOnboardingService();
      const resetToken = await onboardingService.verifyResetOTP(cleanPhone, otp);

      // Navigation vers écran de nouveau mot de passe
      navigation.navigate(SCREENS.RESET_PASSWORD as never, {
        phone: cleanPhone,
        resetToken,
      });
    } catch (error: unknown) {
      console.error('Erreur vérification OTP:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert(
        'Erreur',
        errorMessage.includes('expiré') || errorMessage.includes('expired')
          ? 'Code expiré. Veuillez en demander un nouveau.'
          : 'Code incorrect ou expiré'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setOtp('');
    await handleRequestReset();
  };

  if (step === 'phone') {
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
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Mot de passe oublié</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Entrez votre numéro de téléphone pour recevoir un code de réinitialisation
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Numéro de téléphone</Text>
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

              <Button
                title="Envoyer le code"
                onPress={handleRequestReset}
                variant="primary"
                size="large"
                fullWidth
                loading={isLoading}
                disabled={!phone || phone.length < 8}
                style={styles.submitButton}
              />

              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.linkContainer}
              >
                <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                  Retour à la connexion
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

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
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('phone')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Vérification</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Entrez le code reçu par SMS au {phone}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Code de vérification</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={otp}
                onChangeText={setOtp}
                placeholder="123456"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                autoFocus
                maxLength={6}
              />
            </View>

            <Button
              title="Vérifier le code"
              onPress={handleVerifyOTP}
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
              disabled={otp.length !== 6}
              style={styles.submitButton}
            />

            {/* Renvoyer le code */}
            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={countdown > 0}
              style={styles.resendContainer}
            >
              <Text
                style={[
                  styles.resendText,
                  { color: countdown > 0 ? colors.textSecondary : colors.primary },
                ]}
              >
                {countdown > 0
                  ? `Renvoyer le code dans ${countdown}s`
                  : 'Renvoyer le code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStep('phone')}
              style={styles.linkContainer}
            >
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                Modifier le numéro
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
  submitButton: {
    marginTop: SPACING.md,
  },
  resendContainer: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  resendText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  linkContainer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  linkText: {
    fontSize: FONT_SIZES.sm,
  },
});

export default ForgotPasswordScreen;

