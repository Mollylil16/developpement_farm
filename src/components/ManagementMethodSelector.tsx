/**
 * Composant de sélection de la méthode de gestion d'élevage
 * Permet de choisir entre suivi individuel et suivi par bande
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import Badge from './Badge';

interface ManagementMethodSelectorProps {
  value: 'individual' | 'batch';
  onChange: (method: 'individual' | 'batch') => void;
}

export default function ManagementMethodSelector({
  value,
  onChange,
}: ManagementMethodSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>📋 Méthode d'élevage</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Comment souhaitez-vous gérer votre élevage ?
      </Text>

      {/* Option 1 : Suivi individuel */}
      <TouchableOpacity
        style={[
          styles.optionCard,
          {
            borderColor: value === 'individual' ? colors.primary : colors.border,
            backgroundColor: value === 'individual' ? colors.primary + '08' : colors.surface,
          },
        ]}
        onPress={() => onChange('individual')}
        activeOpacity={0.7}
      >
        <View style={styles.optionHeader}>
          {/* Radio button */}
          <View style={styles.radioContainer}>
            <View
              style={[
                styles.radio,
                {
                  borderColor: value === 'individual' ? colors.primary : colors.border,
                },
              ]}
            >
              {value === 'individual' && (
                <View
                  style={[
                    styles.radioDot,
                    {
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              )}
            </View>
          </View>

          {/* Content */}
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>
              👤 Suivi individuel des sujets
            </Text>
            <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
              Chaque porc a un numéro unique et est suivi individuellement
            </Text>

            {/* Badges */}
            <View style={styles.badges}>
              <Badge variant="success" size="small">
                ✓ Recommandé pour &lt; 50 porcs
              </Badge>
              <Badge variant="info" size="small">
                ✓ Traçabilité maximale
              </Badge>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Option 2 : Suivi par bande */}
      <TouchableOpacity
        style={[
          styles.optionCard,
          {
            borderColor: value === 'batch' ? colors.primary : colors.border,
            backgroundColor: value === 'batch' ? colors.primary + '08' : colors.surface,
          },
        ]}
        onPress={() => onChange('batch')}
        activeOpacity={0.7}
      >
        <View style={styles.optionHeader}>
          {/* Radio button */}
          <View style={styles.radioContainer}>
            <View
              style={[
                styles.radio,
                {
                  borderColor: value === 'batch' ? colors.primary : colors.border,
                },
              ]}
            >
              {value === 'batch' && (
                <View
                  style={[
                    styles.radioDot,
                    {
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              )}
            </View>
          </View>

          {/* Content */}
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>👥 Suivi par bande</Text>
            <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
              Les porcs sont regroupés par bande selon leur stade de croissance
            </Text>

            {/* Badges */}
            <View style={styles.badges}>
              <Badge variant="success" size="small">
                ✓ Recommandé pour &gt; 50 porcs
              </Badge>
              <Badge variant="info" size="small">
                ✓ Gestion simplifiée
              </Badge>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Info box */}
      <View style={[styles.infoBox, { backgroundColor: colors.info + '15' }]}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Ce choix peut être modifié plus tard dans les paramètres du projet
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  optionCard: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioContainer: {
    paddingTop: 2,
    marginRight: SPACING.md,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.sm,
  },
  optionDescription: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});

