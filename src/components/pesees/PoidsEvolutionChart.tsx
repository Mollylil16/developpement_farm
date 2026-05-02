/**
 * Composant Graphique d'Évolution du Poids Moyen du Cheptel
 * Affiche la courbe d'évolution du poids moyen (pas du poids total)
 * Fonctionne pour les modes individuel et bande
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { usePoidsEvolution, PoidsEvolution } from '../../hooks/pesees/usePoidsEvolution';
import { useModeElevage } from '../../hooks/useModeElevage';
import Card from '../Card';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PoidsEvolutionChartProps {
  projetId: string | undefined;
  periode?: '7j' | '30j' | '90j' | 'tout';
  sujetIds?: string[]; // Optionnel : pour filtrer certains sujets
  showStats?: boolean; // Afficher les statistiques sous le graphique
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2; // Card padding + margins

export default function PoidsEvolutionChart({
  projetId,
  periode = '30j',
  sujetIds,
  showStats = true,
}: PoidsEvolutionChartProps) {
  const { colors } = useTheme();
  const mode = useModeElevage();

  const { data: evolutionData, loading, error } = usePoidsEvolution({
    projetId,
    mode,
    periode,
    sujetIds,
    enabled: !!projetId,
  });

  // Préparer les données du graphique
  const chartData = useMemo(() => {
    if (!evolutionData || !evolutionData.dates || evolutionData.dates.length === 0) {
      return null;
    }

    const { dates, poids_moyens, poids_initial, poids_actuel, gain_total, gmq } = evolutionData;

    // Formater les dates pour l'affichage
    const formattedDates = dates.map((dateStr) => {
      try {
        const date = parseISO(dateStr);
        if (periode === '7j') {
          return format(date, 'dd/MM', { locale: fr });
        } else if (periode === '30j') {
          return format(date, 'dd/MM', { locale: fr });
        } else if (periode === '90j') {
          return format(date, 'dd MMM', { locale: fr });
        } else {
          return format(date, 'MMM yyyy', { locale: fr });
        }
      } catch {
        return dateStr;
      }
    });

    // Calculer min et max pour l'échelle
    const validWeights = poids_moyens.filter((w) => typeof w === 'number' && !isNaN(w) && w > 0);
    if (validWeights.length === 0) {
      return null;
    }

    const minWeight = Math.min(...validWeights);
    const maxWeight = Math.max(...validWeights);
    const padding = (maxWeight - minWeight) * 0.1 || 1;

    // Limiter le nombre de dates affichées pour la lisibilité
    const maxPoints = periode === '7j' ? 7 : periode === '30j' ? 10 : periode === '90j' ? 15 : 20;
    const step = Math.ceil(formattedDates.length / maxPoints);
    const filteredDates = formattedDates.filter((_, index) => index % step === 0 || index === formattedDates.length - 1);
    const filteredWeights = poids_moyens.filter((_, index) => index % step === 0 || index === poids_moyens.length - 1);

    return {
      labels: filteredDates,
      datasets: [
        {
          data: filteredWeights,
        },
      ],
      minWeight: Math.max(0, minWeight - padding),
      maxWeight: maxWeight + padding,
      poids_initial,
      poids_actuel,
      gain_total,
      gmq,
    };
  }, [evolutionData, periode]);

  if (loading) {
    return (
      <Card elevation="medium" padding="large" style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={32} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement de l'évolution...
          </Text>
        </View>
      </Card>
    );
  }

  if (error || !chartData) {
    return (
      <Card elevation="medium" padding="large" style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || 'Aucune donnée disponible'}
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
            Ajoutez des pesées pour voir l'évolution du poids
          </Text>
        </View>
      </Card>
    );
  }

  // Configuration du graphique
  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(${hexToRgb(colors.primary)}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${hexToRgb(colors.text)}, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 1,
    },
  };

  return (
    <Card elevation="medium" padding="large" style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Ionicons name="trending-up" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          📈 Évolution du Poids Moyen
        </Text>
      </View>

      {/* Graphique */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScrollView}>
        <LineChart
          data={chartData}
          width={Math.max(CHART_WIDTH, chartData.labels.length * 60)}
          height={220}
          yAxisLabel=""
          yAxisSuffix=" kg"
          yAxisInterval={1}
          fromZero={false}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLabels={true}
          segments={4}
        />
      </ScrollView>

      {/* Statistiques */}
      {showStats && (
        <View style={styles.statsContainer}>
          <View style={[styles.statsRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids initial</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {chartData.poids_initial.toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids actuel</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {chartData.poids_actuel.toFixed(1)} kg
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gain total</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {chartData.gain_total > 0 ? '+' : ''}
                {chartData.gain_total.toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GMQ moyen</Text>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {chartData.gmq.toFixed(0)} g/j
              </Text>
            </View>
          </View>
        </View>
      )}
    </Card>
  );
}

// Fonction helper pour convertir hex en RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return '0, 0, 0'; // Par défaut noir
  }
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `${r}, ${g}, ${b}`;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
  },
  chartScrollView: {
    marginHorizontal: -SPACING.md,
  },
  chart: {
    marginVertical: SPACING.sm,
    borderRadius: 16,
  },
  statsContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
});

