/**
 * Composant Graphique d'Évolution du Poids Total de la Ferme
 * Affiche la courbe de croissance du poids cumulé de tous les animaux actifs
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING } from '../constants/theme';
import { format, parseISO, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { evaluerGMQCheptel } from '../utils/gmqEvaluation';

interface Props {
  evolutionData: Array<{ date: string; poidsTotal: number }>;
  nombreAnimaux: number;
  gmqMoyenCheptel?: number;
  periode?: 7 | 30 | 90; // Période en jours pour déterminer le groupement
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TotalWeightEvolutionChart({
  evolutionData,
  nombreAnimaux,
  gmqMoyenCheptel = 0,
  periode = 30,
}: Props) {
  const { colors } = useTheme();

  // Évaluer le GMQ du cheptel
  const evaluationGMQ = useMemo(() => {
    return evaluerGMQCheptel(gmqMoyenCheptel, nombreAnimaux);
  }, [gmqMoyenCheptel, nombreAnimaux]);

  // Calculer les données du graphique avec groupement
  const chartData = useMemo(() => {
    if (!evolutionData || evolutionData.length === 0) {
      return null;
    }

    // Toujours grouper par mois
    const groupBy = 'month';

    // Grouper les données par mois
    const grouped = evolutionData.reduce(
      (
        acc: Record<string, { poidsTotal: number[]; count: number; date: Date }>,
        item: { date: string; poidsTotal: number }
      ) => {
        const dateItem = parseISO(item.date);
        const dateReference = startOfMonth(dateItem);
        const key = format(dateItem, 'MMM yyyy', { locale: fr });

        if (!acc[key]) {
          acc[key] = { poidsTotal: [], count: 0, date: dateReference };
        }
        acc[key].poidsTotal.push(item.poidsTotal);
        acc[key].count++;
        return acc;
      },
      {} as Record<string, { poidsTotal: number[]; count: number; date: Date }>
    );

    // Trier par date réelle (croissant : du plus ancien au plus récent)
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      return grouped[a].date.getTime() - grouped[b].date.getTime();
    });

    // Limiter le nombre de points affichés pour la lisibilité
    const maxPoints = 12; // 12 mois max
    const keysToDisplay = sortedKeys.slice(-maxPoints);

    // Calculer le poids moyen pour chaque période
    const weights = keysToDisplay.map((key) => {
      const group = grouped[key];
      return Math.round(
        (group.poidsTotal.reduce((a, b) => a + b, 0) / group.count) * 10
      ) / 10;
    });

    // Formater les labels
    const dates = keysToDisplay.map((key) => key);

    // Calculer les statistiques sur les données groupées
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const firstWeight = weights[0];
    const lastWeight = weights[weights.length - 1];
    const totalGain = lastWeight - firstWeight;
    const gainPercentage = firstWeight > 0 ? (totalGain / firstWeight) * 100 : 0;

    // Calculer le gain moyen par jour (basé sur la période réelle)
    const firstDate = grouped[keysToDisplay[0]].date;
    const lastDate = grouped[keysToDisplay[keysToDisplay.length - 1]].date;
    const nombreJours = Math.max(
      1,
      Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const gainMoyenParJour = nombreJours > 0 ? totalGain / nombreJours : 0;

    // Calculer le padding pour l'échelle
    const padding = (maxWeight - minWeight) * 0.1 || 10;

    return {
      weights,
      dates,
      minWeight: Math.max(0, minWeight - padding),
      maxWeight: maxWeight + padding,
      firstWeight,
      lastWeight,
      totalGain,
      gainPercentage,
      gainMoyenParJour,
    };
  }, [evolutionData, periode]);

  if (!chartData) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="bar-chart-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Aucune donnée disponible
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Ajoutez des pesées pour voir l'évolution du poids total
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Ionicons name="trending-up" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>📈 Évolution du Poids Total</Text>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids initial</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {chartData.firstWeight.toFixed(0)} kg
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids actuel</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {chartData.lastWeight.toFixed(0)} kg
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gain total</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            +{chartData.totalGain.toFixed(0)} kg
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gain/jour</Text>
          <Text style={[styles.statValue, { color: colors.info }]}>
            +{chartData.gainMoyenParJour.toFixed(1)} kg
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
          width={Math.max(SCREEN_WIDTH - SPACING.lg * 6, chartData.dates.length * 80)}
          height={220}
          yAxisSuffix=" kg"
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: colors.surface,
            backgroundGradientFrom: colors.surface,
            backgroundGradientTo: colors.surface,
            decimalPlaces: 0,
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
            Poids total (kg) • {nombreAnimaux} animaux actifs
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={[styles.infoBox, { backgroundColor: `${colors.info}20` }]}>
        <Ionicons name="information-circle" size={16} color={colors.info} />
        <Text style={[styles.infoText, { color: colors.info }]}>
          Ce graphe montre l'évolution du poids cumulé de tous les animaux actifs
        </Text>
      </View>

      {/* Évaluation GMQ du cheptel */}
      {gmqMoyenCheptel > 0 && (
        <View
          style={[
            styles.gmqEvaluationBox,
            {
              backgroundColor: `${evaluationGMQ.couleur}15`,
              borderColor: `${evaluationGMQ.couleur}40`,
            },
          ]}
        >
          <View style={styles.gmqEvaluationHeader}>
            <Text style={{ fontSize: 18 }}>{evaluationGMQ.icone}</Text>
            <Text style={[styles.gmqEvaluationTitle, { color: evaluationGMQ.couleur }]}>
              {evaluationGMQ.commentaire}
            </Text>
          </View>
          <Text style={[styles.gmqEvaluationText, { color: colors.text }]}>
            {evaluationGMQ.recommandation}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  gmqEvaluationBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  gmqEvaluationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  gmqEvaluationTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  gmqEvaluationText: {
    fontSize: 11,
    lineHeight: 16,
  },
});

