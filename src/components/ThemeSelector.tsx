/**
 * Composant pour sélectionner le thème (clair/sombre/auto)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';

export default function ThemeSelector() {
  const { mode, setMode, colors } = useTheme();

  const themes: { label: string; value: 'light' | 'dark' | 'auto'; icon: string }[] = [
    { label: 'Clair', value: 'light', icon: '☀️' },
    { label: 'Sombre', value: 'dark', icon: '🌙' },
    { label: 'Automatique', value: 'auto', icon: '🔄' },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>Thème de l'application</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Choisissez le thème d'affichage. "Automatique" suit les paramètres système.
      </Text>
      <View style={styles.optionsContainer}>
        {themes.map((theme) => (
          <TouchableOpacity
            key={theme.value}
            style={[
              styles.option,
              {
                backgroundColor: mode === theme.value ? colors.primary + '20' : colors.surface,
                borderColor: mode === theme.value ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setMode(theme.value)}
            activeOpacity={0.7}
          >
            <Text style={styles.optionIcon}>{theme.icon}</Text>
            <Text
              style={[
                styles.optionLabel,
                {
                  color: mode === theme.value ? colors.primary : colors.text,
                  fontWeight: mode === theme.value ? FONT_WEIGHTS.bold : FONT_WEIGHTS.medium,
                },
              ]}
            >
              {theme.label}
            </Text>
            {mode === theme.value && (
              <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  optionsContainer: {
    gap: SPACING.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  optionLabel: {
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
});
