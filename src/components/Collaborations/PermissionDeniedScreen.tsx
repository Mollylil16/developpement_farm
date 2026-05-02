/**
 * Écran affiché quand la permission caméra est refusée
 * Propose des alternatives : autoriser, ouvrir les paramètres, ou saisie manuelle
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  FONT_WEIGHTS,
} from '../../constants/theme';

export interface PermissionDeniedScreenProps {
  onRequestPermission: () => Promise<void>;
  onOpenSettings: () => Promise<void>;
  onManualEntry: () => void;
}

export default function PermissionDeniedScreen({
  onRequestPermission,
  onOpenSettings,
  onManualEntry,
}: PermissionDeniedScreenProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <View style={styles.content}>
        {/* Icône caméra barrée */}
        <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
          <Ionicons name="camera-off" size={64} color={colors.error} />
        </View>

        {/* Titre */}
        <Text style={[styles.title, { color: colors.text }]}>
          Permission caméra requise
        </Text>

        {/* Message */}
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Pour scanner les codes QR et ajouter rapidement des collaborateurs à
          vos projets, nous avons besoin d'accéder à votre caméra.
        </Text>

        {/* Avantages de l'utilisation de la caméra */}
        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.benefitText, { color: colors.text }]}>
              Ajout rapide de collaborateurs
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.benefitText, { color: colors.text }]}>
              Scan instantané des QR codes
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.benefitText, { color: colors.text }]}>
              Aucune saisie manuelle nécessaire
            </Text>
          </View>
        </View>

        {/* Boutons d'action */}
        <View style={styles.actionsContainer}>
          {/* Bouton "Autoriser" */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={onRequestPermission}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Autoriser l'accès à la caméra"
            accessibilityHint="Ouvre une demande de permission pour accéder à la caméra"
          >
            <Ionicons name="camera" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>Autoriser l'accès</Text>
          </TouchableOpacity>

          {/* Bouton "Paramètres" */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: colors.primary, backgroundColor: colors.surface },
            ]}
            onPress={onOpenSettings}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir les paramètres de l'application"
            accessibilityHint="Ouvre les paramètres système pour autoriser la caméra manuellement"
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={colors.primary}
              style={styles.buttonIcon}
            />
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
              Ouvrir les paramètres
            </Text>
          </TouchableOpacity>

          {/* Séparateur */}
          <View style={styles.separator}>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.separatorText, { color: colors.textSecondary }]}>
              OU
            </Text>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Bouton "Saisir manuellement" */}
          <TouchableOpacity
            style={[
              styles.tertiaryButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            onPress={onManualEntry}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Saisir le code QR manuellement"
            accessibilityHint="Ouvre un formulaire pour saisir le code QR au lieu de le scanner"
          >
            <Ionicons
              name="pencil-outline"
              size={20}
              color={colors.textSecondary}
              style={styles.buttonIcon}
            />
            <Text style={[styles.tertiaryButtonText, { color: colors.textSecondary }]}>
              Saisir le code manuellement
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  benefitText: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  actionsContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginHorizontal: SPACING.md,
    textTransform: 'uppercase',
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  tertiaryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.regular,
  },
  buttonIcon: {
    marginRight: SPACING.sm,
  },
});
