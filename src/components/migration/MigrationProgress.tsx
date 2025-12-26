/**
 * Composant pour afficher la progression d'une migration
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';
import Card from '../Card';
import { Ionicons } from '@expo/vector-icons';

interface MigrationProgressProps {
  progress: number; // 0-100
  currentStep?: string;
  steps?: string[];
  canCancel?: boolean;
  onCancel?: () => void;
}

export default function MigrationProgress({
  progress,
  currentStep,
  steps = [],
  canCancel = false,
  onCancel,
}: MigrationProgressProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Migration en cours...</Text>
      </View>

      <View style={styles.content}>
        {/* Barre de progression */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {Math.round(progress)}%
          </Text>
        </View>

        {/* Étapes */}
        {steps.length > 0 && (
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => {
              const stepProgress = (index + 1) * (100 / steps.length);
              const isCompleted = progress >= stepProgress;
              const isCurrent = currentStep === step;

              return (
                <View key={index} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepIcon,
                      {
                        backgroundColor: isCompleted
                          ? colors.success
                          : isCurrent
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                    ) : isCurrent ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={16} color={colors.textSecondary} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepText,
                      {
                        color: isCurrent || isCompleted ? colors.text : colors.textSecondary,
                        fontWeight: isCurrent ? '600' : '400',
                      },
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Étape actuelle */}
        {currentStep && (
          <View style={styles.currentStepContainer}>
            <Text style={[styles.currentStepLabel, { color: colors.textSecondary }]}>
              Étape actuelle :
            </Text>
            <Text style={[styles.currentStepText, { color: colors.text }]}>{currentStep}</Text>
          </View>
        )}

        {/* Bouton d'annulation */}
        {canCancel && onCancel && (
          <View style={styles.cancelContainer}>
            <Text style={[styles.cancelText, { color: colors.error }]} onPress={onCancel}>
              Annuler la migration
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  content: {
    marginTop: SPACING.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  stepsContainer: {
    marginBottom: SPACING.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  stepText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  currentStepContainer: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  currentStepLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },
  currentStepText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  cancelContainer: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});

