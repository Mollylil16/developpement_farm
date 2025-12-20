/**
 * Écran OTP (email ou SMS) - vérification de code à 6 chiffres
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Button from '../components/Button';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { requestOtp, verifyOtp, clearError } from '../store/slices/authSlice';
import { SCREENS } from '../navigation/types';

export default function OtpVerificationScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { isLoading, error, user } = useAppSelector((state) => state.auth);

  const { identifier, isEmail } =
    (route.params as { identifier?: string; isEmail?: boolean }) || {};

  const [code, setCode] = useState('');

  const maskedIdentifier = useMemo(() => {
    const id = identifier || '';
    if (!id) return '';
    if (id.includes('@')) {
      const [name, domain] = id.split('@');
      const safeName = name.length <= 2 ? name : `${name.slice(0, 2)}***`;
      return `${safeName}@${domain}`;
    }
    // Téléphone: masquer milieu
    if (id.length <= 4) return id;
    return `${id.slice(0, 3)}***${id.slice(-2)}`;
  }, [identifier]);

  useEffect(() => {
    if (error) {
      Alert.alert('Erreur', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleResend = async () => {
    if (!identifier) {
      Alert.alert('Erreur', "Identifiant manquant. Retournez à l'écran précédent.");
      return;
    }
    await dispatch(requestOtp({ identifier })).unwrap();
    Alert.alert('Code envoyé', 'Un nouveau code a été envoyé.');
  };

  const handleVerify = async () => {
    if (!identifier) {
      Alert.alert('Erreur', "Identifiant manquant. Retournez à l'écran précédent.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      Alert.alert('Erreur', 'Veuillez entrer le code à 6 chiffres.');
      return;
    }

    const u = await dispatch(verifyOtp({ identifier, code: code.trim() })).unwrap();

    // Si onboarding non terminé (nouvel utilisateur), aller au choix de profil.
    // Sinon, AppNavigator redirigera automatiquement vers Main/CreateProject.
    const roles = (u as any)?.roles;
    const isNewUser = !roles || (typeof roles === 'object' && Object.keys(roles).length === 0);
    const isOnboarded = (u as any)?.isOnboarded === true;

    if (!isOnboarded || isNewUser) {
      navigation.navigate(SCREENS.PROFILE_SELECTION, {
        identifier,
        isEmail: isEmail ?? identifier.includes('@'),
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Vérification</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {`Entrez le code envoyé à ${maskedIdentifier || 'votre identifiant'}.`}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.small }]}>
          <Text style={[styles.label, { color: colors.text }]}>Code (6 chiffres)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            value={code}
            onChangeText={(t) => setCode(t.replace(/[^\d]/g, '').slice(0, 6))}
            keyboardType="numeric"
            placeholder="123456"
            placeholderTextColor={colors.textSecondary}
            maxLength={6}
          />

          <Button title={isLoading ? 'Vérification...' : 'Valider'} onPress={handleVerify} fullWidth loading={isLoading} />

          <TouchableOpacity onPress={handleResend} disabled={isLoading} style={styles.resend}>
            <Text style={[styles.resendText, { color: colors.primary }]}>Renvoyer un code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: SPACING.lg },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, marginBottom: SPACING.sm },
  subtitle: { fontSize: FONT_SIZES.md, lineHeight: 22, marginBottom: SPACING.lg },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  label: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semiBold, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  resend: { marginTop: SPACING.md, alignItems: 'center' },
  resendText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semiBold },
});


