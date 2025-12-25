/**
 * Composant pour afficher le rapport final d'une migration
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';
import Card from '../Card';
import Button from '../Button';
import { Ionicons } from '@expo/vector-icons';
import { MigrationResult } from '../../services/migration/migrationService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MigrationReportProps {
  result: MigrationResult;
  type: 'batch_to_individual' | 'individual_to_batch';
  onClose: () => void;
}

export default function MigrationReport({ result, type, onClose }: MigrationReportProps) {
  const { colors } = useTheme();

  const handleShare = async () => {
    try {
      const reportText = generateReportText(result, type);
      await Share.share({
        message: reportText,
        title: 'Rapport de migration',
      });
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    }
  };

  const generateReportText = (
    migrationResult: MigrationResult,
    migrationType: string,
  ): string => {
    let text = '📊 RAPPORT DE MIGRATION\n\n';
    text += `Type: ${migrationType === 'batch_to_individual' ? 'Bande → Individualisé' : 'Individualisé → Bande'}\n`;
    text += `Statut: ${migrationResult.success ? '✅ Succès' : '❌ Échec'}\n\n`;

    if (migrationResult.pigsCreated) {
      text += `Porcs créés: ${migrationResult.pigsCreated}\n`;
    }
    if (migrationResult.batchesCreated) {
      text += `Bandes créées: ${migrationResult.batchesCreated}\n`;
    }
    if (migrationResult.recordsMigrated) {
      text += `Enregistrements migrés: ${migrationResult.recordsMigrated}\n`;
    }

    if (migrationResult.warnings && migrationResult.warnings.length > 0) {
      text += '\n⚠️ Avertissements:\n';
      migrationResult.warnings.forEach((warning) => {
        text += `- ${warning}\n`;
      });
    }

    if (migrationResult.errors && migrationResult.errors.length > 0) {
      text += '\n❌ Erreurs:\n';
      migrationResult.errors.forEach((error) => {
        text += `- ${error}\n`;
      });
    }

    text += `\nDate: ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`;

    return text;
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: result.success
                ? colors.successLight + '15'
                : colors.errorLight + '15',
            },
          ]}
        >
          <Ionicons
            name={result.success ? 'checkmark-circle' : 'alert-circle'}
            size={32}
            color={result.success ? colors.success : colors.error}
          />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {result.success ? 'Migration réussie !' : 'Migration échouée'}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Résultats */}
        <View style={styles.resultsContainer}>
          {type === 'batch_to_individual' && result.pigsCreated !== undefined && (
            <View style={[styles.resultItem, { backgroundColor: colors.primaryLight + '15' }]}>
              <Ionicons name="paw-outline" size={24} color={colors.primary} />
              <View style={styles.resultContent}>
                <Text style={[styles.resultValue, { color: colors.primary }]}>
                  {result.pigsCreated}
                </Text>
                <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                  Porcs créés
                </Text>
              </View>
            </View>
          )}

          {type === 'individual_to_batch' && result.batchesCreated !== undefined && (
            <View style={[styles.resultItem, { backgroundColor: colors.primaryLight + '15' }]}>
              <Ionicons name="layers-outline" size={24} color={colors.primary} />
              <View style={styles.resultContent}>
                <Text style={[styles.resultValue, { color: colors.primary }]}>
                  {result.batchesCreated}
                </Text>
                <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                  Bandes créées
                </Text>
              </View>
            </View>
          )}

          {result.recordsMigrated !== undefined && (
            <View style={[styles.resultItem, { backgroundColor: colors.successLight + '15' }]}>
              <Ionicons name="document-text-outline" size={24} color={colors.success} />
              <View style={styles.resultContent}>
                <Text style={[styles.resultValue, { color: colors.success }]}>
                  {result.recordsMigrated}
                </Text>
                <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                  Enregistrements migrés
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Avertissements */}
        {result.warnings && result.warnings.length > 0 && (
          <View style={[styles.warningContainer, { backgroundColor: colors.warningLight + '15' }]}>
            <Ionicons name="warning-outline" size={20} color={colors.warning} />
            <View style={styles.warningContent}>
              <Text style={[styles.warningTitle, { color: colors.warning }]}>
                Avertissements :
              </Text>
              {result.warnings.map((warning, index) => (
                <Text key={index} style={[styles.warningText, { color: colors.text }]}>
                  • {warning}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Erreurs */}
        {result.errors && result.errors.length > 0 && (
          <View style={[styles.errorContainer, { backgroundColor: colors.errorLight + '15' }]}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <View style={styles.errorContent}>
              <Text style={[styles.errorTitle, { color: colors.error }]}>Erreurs :</Text>
              {result.errors.map((error, index) => (
                <Text key={index} style={[styles.errorText, { color: colors.text }]}>
                  • {error}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* ID de migration */}
        <View style={[styles.idContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.idLabel, { color: colors.textSecondary }]}>ID de migration :</Text>
          <Text style={[styles.idValue, { color: colors.text }]}>{result.migrationId}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Partager le rapport"
          onPress={handleShare}
          variant="outline"
          icon={<Ionicons name="share-outline" size={20} color={colors.primary} />}
          style={styles.shareButton}
        />
        <Button title="Fermer" onPress={onClose} variant="primary" style={styles.closeButton} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    marginTop: SPACING.md,
  },
  resultsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  resultItem: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  resultContent: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  resultValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  resultLabel: {
    fontSize: FONT_SIZES.xs,
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
  warningTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
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
  errorTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  idContainer: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  idLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },
  idValue: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'monospace',
  },
  actions: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  shareButton: {
    marginBottom: SPACING.xs,
  },
  closeButton: {
    marginTop: SPACING.xs,
  },
});

