/**
 * Empty State spécifique pour les Collaborations
 * Affiche une illustration et des actions d'aide
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  FONT_WEIGHTS,
} from '../../constants/theme';
import QRCodeCard from './QRCodeCard';

interface CollaborationsEmptyStateProps {
  onShowQR?: () => void;
  onScanQR?: () => void;
}

export default function CollaborationsEmptyState({
  onShowQR,
  onScanQR,
}: CollaborationsEmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Illustration */}
      <View style={[styles.illustrationContainer, { backgroundColor: colors.surfaceVariant }]}>
        <Ionicons name="people-outline" size={80} color={colors.textSecondary} />
      </View>

      {/* Titre */}
      <Text style={[styles.title, { color: colors.text }]}>
        Aucune collaboration
      </Text>

      {/* Message */}
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        Partagez votre QR code ou scannez celui d'un producteur pour commencer à collaborer.
      </Text>

      {/* Actions */}
      {(onShowQR || onScanQR) && (
        <View style={styles.actionsContainer}>
          {onShowQR && (
            <QRCodeCard
              variant="my-qr"
              compact
              onPress={onShowQR}
            />
          )}
          {onScanQR && (
            <QRCodeCard
              variant="scan-qr"
              compact
              onPress={onScanQR}
            />
          )}
        </View>
      )}

      {/* Conseils */}
      <View style={[styles.tipsContainer, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Partagez votre QR code pour être ajouté aux projets
          </Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Scannez le QR d'un collaborateur pour l'ajouter rapidement
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  illustrationContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  actionsContainer: {
    width: '100%',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  tipsContainer: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});
