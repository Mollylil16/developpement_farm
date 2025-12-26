/**
 * Composant pour afficher la prévisualisation d'une migration
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';
import Card from '../Card';
import { Ionicons } from '@expo/vector-icons';
import { MigrationPreview as MigrationPreviewType } from '../../services/migration/migrationService';

interface MigrationPreviewProps {
  preview: MigrationPreviewType;
  type: 'batch_to_individual' | 'individual_to_batch';
}

export default function MigrationPreview({ preview, type }: MigrationPreviewProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="eye-outline" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Aperçu de la migration</Text>
      </View>

      <View style={styles.content}>
        {/* Statistiques */}
        <View style={styles.statsContainer}>
          {type === 'batch_to_individual' && preview.pigsToCreate !== undefined && (
            <View style={[styles.statItem, { backgroundColor: colors.primaryLight + '15' }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {preview.pigsToCreate}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Porcs à créer
              </Text>
            </View>
          )}

          {type === 'individual_to_batch' && preview.batchesToCreate !== undefined && (
            <View style={[styles.statItem, { backgroundColor: colors.primaryLight + '15' }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {preview.batchesToCreate}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Bandes à créer
              </Text>
            </View>
          )}

          {preview.recordsToMigrate !== undefined && (
            <View style={[styles.statItem, { backgroundColor: colors.successLight + '15' }]}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {preview.recordsToMigrate}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Enregistrements
              </Text>
            </View>
          )}

          {preview.estimatedDuration !== undefined && (
            <View style={[styles.statItem, { backgroundColor: colors.warningLight + '15' }]}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                ~{Math.ceil(preview.estimatedDuration)}s
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Durée estimée
              </Text>
            </View>
          )}
        </View>

        {/* Avertissements */}
        {preview.warnings && preview.warnings.length > 0 && (
          <View style={[styles.warningContainer, { backgroundColor: colors.warningLight + '15' }]}>
            <Ionicons name="warning-outline" size={20} color={colors.warning} />
            <View style={styles.warningContent}>
              {preview.warnings.map((warning, index) => (
                <Text
                  key={index}
                  style={[styles.warningText, { color: colors.warning }]}
                >
                  {warning}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Erreurs */}
        {preview.errors && preview.errors.length > 0 && (
          <View style={[styles.errorContainer, { backgroundColor: colors.errorLight + '15' }]}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <View style={styles.errorContent}>
              {preview.errors.map((error, index) => (
                <Text key={index} style={[styles.errorText, { color: colors.error }]}>
                  {error}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Données d'exemple */}
        {preview.sampleData && (
          <View style={styles.sampleDataContainer}>
            <Text style={[styles.sampleDataTitle, { color: colors.text }]}>
              Données d'exemple :
            </Text>
            {Object.entries(preview.sampleData).map(([key, value]) => (
              <View key={key} style={styles.sampleDataRow}>
                <Text style={[styles.sampleDataKey, { color: colors.textSecondary }]}>
                  {key}:
                </Text>
                <Text style={[styles.sampleDataValue, { color: colors.text }]}>
                  {String(value)}
                </Text>
              </View>
            ))}
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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  warningContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  warningContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  warningText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  errorContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  sampleDataContainer: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  sampleDataTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  sampleDataRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  sampleDataKey: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    marginRight: SPACING.xs,
  },
  sampleDataValue: {
    fontSize: FONT_SIZES.sm,
  },
});

