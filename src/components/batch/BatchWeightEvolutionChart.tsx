/**
 * Composant Graphique d'Évolution du Poids pour Mode Bande
 * Affiche la courbe de croissance d'une bande basée sur les pesées batch
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING } from '../../constants/theme';

interface BatchWeighing {
  id: string;
  weighing_date: string | Date;
  average_weight_kg: number;
  min_weight_kg?: number;
  max_weight_kg?: number;
  count?: number;
}

interface Props {
  weighings: BatchWeighing[];
  batchName?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function BatchWeightEvolutionChart({ weighings, batchName }: Props) {
  const { colors } = useTheme();

  // Trier les pesées par date et calculer les données du graphique
  const chartData = useMemo(() => {
    if (!weighings || weighings.length === 0) {
      return null;
    }

    // Trier par date
    const sortedWeighings = [...weighings].sort((a, b) => {
      const dateA = new Date(a.weighing_date).getTime();
      const dateB = new Date(b.weighing_date).getTime();
      return dateA - dateB;
    });

    // Extraire les poids moyens et dates (filtrer les valeurs invalides)
    const weights = sortedWeighings
      .map((w) => w.average_weight_kg)
      .filter((w) => typeof w === 'number' && !isNaN(w) && isFinite(w));

    if (weights.length === 0) {
      return null;
    }

    const dates = sortedWeighings
      .filter((w) => typeof w.average_weight_kg === 'number' && !isNaN(w.average_weight_kg) && isFinite(w.average_weight_kg))
      .map((w) => {
        const date = new Date(w.weighing_date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      });

    // Calculer le gain moyen quotidien (GMQ)
    let gmq = 0;
    if (sortedWeighings.length >= 2) {
      const firstWeighing = sortedWeighings[0];
      const lastWeighing = sortedWeighings[sortedWeighings.length - 1];
      const gainTotal = lastWeighing.average_weight_kg - firstWeighing.average_weight_kg;
      const joursTotal = Math.ceil(
        (new Date(lastWeighing.weighing_date).getTime() - new Date(firstWeighing.weighing_date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      gmq = joursTotal > 0 ? (gainTotal * 1000) / joursTotal : 0; // Convertir kg en grammes
    }

    // Calculer min et max pour l'échelle
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const padding = (maxWeight - minWeight) * 0.1 || 1;

    const firstWeight = weights[0] || 0;
    const lastWeight = weights[weights.length - 1] || 0;
    const totalGain = lastWeight - firstWeight;

    return {
      weights,
      dates,
      gmq: gmq || 0,
      minWeight: Math.max(0, minWeight - padding),
      maxWeight: maxWeight + padding,
      firstWeight,
      lastWeight,
      totalGain,
    };
  }, [weighings]);

  if (!chartData) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="bar-chart-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Aucune pesée disponible
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Ajoutez des pesées pour voir l'évolution du poids moyen
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Ionicons name="trending-up" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Évolution du Poids Moyen</Text>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids initial</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {chartData.firstWeight.toFixed(1)} kg
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids actuel</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {chartData.lastWeight.toFixed(1)} kg
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gain total</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            +{chartData.totalGain.toFixed(1)} kg
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GMQ</Text>
          <Text style={[styles.statValue, { color: colors.info }]}>
            {chartData.gmq.toFixed(0)} g/j
          </Text>
        </View>
      </View>

      {/* Graphique */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.chartScroll}
        contentContainerStyle={styles.chartScrollContent}
      >
        <LineChart
          data={{
            labels: chartData.dates,
            datasets: [
              {
                data: chartData.weights,
                color: (opacity = 1) => colors.primary,
                strokeWidth: 3,
              },
            ],
          }}
          width={Math.max(SCREEN_WIDTH - SPACING.lg * 6, chartData.dates.length * 60)}
          height={220}
          yAxisSuffix=" kg"
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: colors.surface,
            backgroundGradientFrom: colors.surface,
            backgroundGradientTo: colors.surface,
            decimalPlaces: 1,
            color: (opacity = 1) => colors.primary,
            labelColor: (opacity = 1) => colors.text,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '5',
              strokeWidth: '2',
              stroke: colors.primary,
              fill: colors.surface,
            },
            propsForBackgroundLines: {
              strokeDasharray: '', // solid line
              stroke: colors.border,
              strokeWidth: 1,
            },
          }}
          bezier
          style={styles.chart}
          fromZero={false}
          segments={5}
        />
      </ScrollView>

      {/* Légende */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Poids moyen (kg) • {weighings.length} pesée{weighings.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Info GMQ */}
      <View style={[styles.infoBox, { backgroundColor: `${colors.info}20` }]}>
        <Ionicons name="information-circle" size={16} color={colors.info} />
        <Text style={[styles.infoText, { color: colors.info }]}>
          GMQ = Gain Moyen Quotidien • Moyenne : {chartData.gmq.toFixed(0)} g/jour
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartScroll: {
    marginHorizontal: -12,
  },
  chartScrollContent: {
    paddingHorizontal: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legend: {
    marginTop: 12,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 11,
    flex: 1,
  },
  emptyContainer: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
});

