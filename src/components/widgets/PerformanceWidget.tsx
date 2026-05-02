/**
 * Widget Performance Globale pour le Dashboard
 * Affiche le coût de production global, comparaison avec prix marché, et suggestions
 */

import React, { useEffect, useState, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { useProjetEffectif } from '../../hooks/useProjetEffectif';
import { selectAllRevenus } from '../../store/selectors/financeSelectors';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import type { PerformanceGlobale } from '../../services/PerformanceGlobaleService';
import { logger } from '../../utils/logger';

interface PerformanceWidgetProps {
  projetId: string;
  onPress?: () => void;
}

function PerformanceWidget({ projetId, onPress }: PerformanceWidgetProps) {
  const { colors } = useTheme();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const revenus = useAppSelector(selectAllRevenus);

  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState<PerformanceGlobale | null>(null);

  useEffect(() => {
    // Chargement différé pour éviter les erreurs au démarrage
    const loadPerformance = async () => {
      try {
        setLoading(true);
        // Import dynamique du service pour éviter les erreurs de chargement
        const { default: PerformanceGlobaleService } = await import(
          '../../services/PerformanceGlobaleService'
        );

        if (!projetId || !projetActif) {
          setPerformance(null);
          setLoading(false);
          return;
        }

        // Utiliser l'API backend au lieu de SQLite
        const result = await PerformanceGlobaleService.calculatePerformanceGlobale(
          projetId,
          projetActif
        );
        setPerformance(result);
      } catch (error) {
        logger.error('Erreur chargement performance globale:', error);
        setPerformance(null);
      } finally {
        setLoading(false);
      }
    };

    loadPerformance();
  }, [projetId, projetActif?.id, revenus.length]);

  const formatMontant = (montant: number | undefined | null) => {
    if (montant === undefined || montant === null || isNaN(montant)) {
      return '0';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  const formatPourcent = (pourcent: number | undefined | null) => {
    if (pourcent === undefined || pourcent === null || isNaN(pourcent)) {
      return '0.0';
    }
    return pourcent.toFixed(1);
  };

  const getStatutColor = (statut: 'rentable' | 'fragile' | 'perte') => {
    switch (statut) {
      case 'rentable':
        return colors.success;
      case 'fragile':
        return colors.warning;
      case 'perte':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatutEmoji = (statut: 'rentable' | 'fragile' | 'perte') => {
    switch (statut) {
      case 'rentable':
        return '✅';
      case 'fragile':
        return '⚠️';
      case 'perte':
        return '❌';
      default:
        return '📊';
    }
  };

  const WidgetContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>📊</Text>
        <Text style={[styles.title, { color: colors.text }]}>Performance Globale</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
        </View>
      ) : !performance ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Pas assez de données de vente pour calculer la performance.
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
            Enregistrez vos premières ventes pour voir votre performance.
          </Text>
        </View>
      ) : (
        <>
          {/* Ligne 1: Coûts */}
          <View style={styles.statsRow}>
            {/* Coût OPEX Global */}
            <View style={[styles.statCard, { backgroundColor: colors.info + '15', flex: 1 }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Coût/kg (OPEX)
              </Text>
              <Text style={[styles.statValue, { color: colors.info }]}>
                {formatMontant(performance.cout_kg_opex_global || 0)}
              </Text>
              <Text style={[styles.statUnit, { color: colors.textSecondary }]}>FCFA</Text>
            </View>

            {/* Prix Marché */}
            <View style={[styles.statCard, { backgroundColor: colors.primary + '15', flex: 1 }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Prix marché</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatMontant(performance.prix_kg_marche || 0)}
              </Text>
              <Text style={[styles.statUnit, { color: colors.textSecondary }]}>FCFA</Text>
            </View>
          </View>

          {/* Ligne 2: Écart */}
          <View
            style={[
              styles.ecartCard,
              {
                backgroundColor: getStatutColor(performance.statut) + '15',
                borderColor: getStatutColor(performance.statut),
              },
            ]}
          >
            <View style={styles.ecartHeader}>
              <Text style={[styles.ecartLabel, { color: colors.textSecondary }]}>
                Écart (Prix marché - Coût)
              </Text>
              <Text style={styles.ecartEmoji}>{getStatutEmoji(performance.statut)}</Text>
            </View>
            <View style={styles.ecartValues}>
              <Text style={[styles.ecartValue, { color: getStatutColor(performance.statut) }]}>
                {(performance.ecart_absolu || 0) >= 0 ? '+' : ''}
                {formatMontant(performance.ecart_absolu || 0)} FCFA/kg
              </Text>
              <Text style={[styles.ecartPourcent, { color: getStatutColor(performance.statut) }]}>
                ({(performance.ecart_pourcentage || 0) >= 0 ? '+' : ''}
                {formatPourcent(performance.ecart_pourcentage || 0)} %)
              </Text>
            </View>
          </View>

          {/* Diagnostic */}
          <View
            style={[
              styles.diagnosticCard,
              {
                backgroundColor: getStatutColor(performance.statut) + '10',
                borderColor: getStatutColor(performance.statut) + '30',
              },
            ]}
          >
            <Text style={[styles.diagnosticText, { color: colors.text }]}>
              {performance.message_diagnostic || 'Diagnostic non disponible'}
            </Text>
          </View>

          {/* Suggestions */}
          {performance.suggestions &&
            Array.isArray(performance.suggestions) &&
            performance.suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text style={[styles.suggestionsTitle, { color: colors.text }]}>
                  💡 Suggestions
                </Text>
                {performance.suggestions.slice(0, 3).map((suggestion: string, index: number) => (
                  <View key={index} style={styles.suggestionRow}>
                    <Text style={[styles.suggestionBullet, { color: colors.primary }]}>•</Text>
                    <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>
                      {String(suggestion || '')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              💡 Coût calculé sur {formatMontant(performance.total_kg_vendus_global || 0)} kg vendus
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              📊 OPEX : {formatMontant(performance.total_opex_global || 0)} FCFA • CAPEX amorti :{' '}
              {formatMontant(performance.total_amortissement_capex_global || 0)} FCFA
            </Text>
          </View>
        </>
      )}
    </View>
  );

  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card>{WidgetContent}</Card>
    </TouchableOpacity>
  ) : (
    <Card>{WidgetContent}</Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emoji: {
    fontSize: FONT_SIZES.xl,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  loadingContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
  },
  emptyContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  emptyHint: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs / 2,
  },
  statUnit: {
    fontSize: FONT_SIZES.xs,
  },
  ecartCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    marginBottom: SPACING.md,
  },
  ecartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  ecartLabel: {
    fontSize: FONT_SIZES.sm,
  },
  ecartEmoji: {
    fontSize: FONT_SIZES.lg,
  },
  ecartValues: {
    alignItems: 'center',
  },
  ecartValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
  },
  ecartPourcent: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    textAlign: 'center',
    marginTop: SPACING.xs / 2,
  },
  diagnosticCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  diagnosticText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestionsContainer: {
    marginBottom: SPACING.md,
  },
  suggestionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.sm,
  },
  suggestionRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  suggestionBullet: {
    fontSize: FONT_SIZES.md,
    marginRight: SPACING.xs,
    marginTop: 2,
  },
  suggestionText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
    lineHeight: 18,
  },
  infoContainer: {
    gap: SPACING.xs / 2,
  },
  infoText: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
});

export default memo(PerformanceWidget);
