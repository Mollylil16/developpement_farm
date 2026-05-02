/**
 * Composant Graphique d'Évolution du Poids
 * Affiche la courbe de croissance d'un animal basée sur ses pesées
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ProductionPesee } from '../types/production';
import { SPACING } from '../constants/theme';

interface Props {
  pesees: ProductionPesee[];
  animalName?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// Fonction pour évaluer le GMQ et générer un commentaire
const getGmqComment = (gmqValue: number, colors: any): { message: string; color: string; icon: string } => {
  if (gmqValue === 0) {
    return {
      message: 'Aucun gain mesuré. Vérifiez la santé de l\'animal.',
      color: colors.warning || '#F59E0B',
      icon: 'warning',
    };
  } else if (gmqValue < 300) {
    return {
      message: '⚠️ GMQ faible. L\'animal peut être malnutri ou malade. Consultez un vétérinaire.',
      color: colors.error || '#EF4444',
      icon: 'alert-circle',
    };
  } else if (gmqValue < 500) {
    return {
      message: '⚠️ GMQ modéré. Surveillez l\'alimentation et la santé de l\'animal.',
      color: colors.warning || '#F59E0B',
      icon: 'warning',
    };
  } else if (gmqValue < 700) {
    return {
      message: '✅ GMQ correct. La croissance est normale.',
      color: colors.success || '#10B981',
      icon: 'checkmark-circle',
    };
  } else if (gmqValue < 900) {
    return {
      message: '✅ GMQ bon. Excellente croissance !',
      color: colors.success || '#10B981',
      icon: 'checkmark-circle',
    };
  } else {
    return {
      message: '✅ GMQ excellent. Croissance optimale !',
      color: colors.success || '#10B981',
      icon: 'star',
    };
  }
};

export default function WeightEvolutionChart({ pesees, animalName }: Props) {
  const { colors } = useTheme();

  // Trier les pesées par date et calculer les données du graphique
  const chartData = useMemo(() => {
    if (!pesees || pesees.length === 0) {
      return null;
    }

    // Trier par date
    const sortedPesees = [...pesees].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Extraire les poids et dates (filtrer les valeurs invalides)
    const weights = sortedPesees
      .map((p) => p.poids_kg)
      .filter((w) => typeof w === 'number' && !isNaN(w) && isFinite(w));

    if (weights.length === 0) {
      return null;
    }

    const dates = sortedPesees
      .filter((p) => typeof p.poids_kg === 'number' && !isNaN(p.poids_kg) && isFinite(p.poids_kg))
      .map((p) => {
        const date = new Date(p.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      });

    // Calculer le gain moyen quotidien (GMQ) de manière plus précise
    let gmq = 0;
    if (sortedPesees.length >= 2) {
      const firstPesee = sortedPesees[0];
      const lastPesee = sortedPesees[sortedPesees.length - 1];
      const firstDate = new Date(firstPesee.date);
      const lastDate = new Date(lastPesee.date);
      
      // Calculer la différence en millisecondes
      const diffMs = lastDate.getTime() - firstDate.getTime();
      // Convertir en jours (avec décimales pour plus de précision)
      const joursTotal = diffMs / (1000 * 60 * 60 * 24);
      
      // Calculer le gain total en kg
      const gainTotal = lastPesee.poids_kg - firstPesee.poids_kg;
      
      // GMQ = (gain en kg / nombre de jours) * 1000 pour convertir en grammes/jour
      // Si les pesées sont le même jour (joursTotal < 1), utiliser au minimum 0.1 jour pour le calcul
      if (joursTotal > 0) {
        const joursPourCalcul = Math.max(joursTotal, 0.1); // Minimum 0.1 jour (2.4 heures)
        gmq = (gainTotal / joursPourCalcul) * 1000;
      } else if (joursTotal === 0 && gainTotal > 0) {
        // Si exactement le même moment mais gain positif, utiliser 0.1 jour
        gmq = (gainTotal / 0.1) * 1000;
      } else {
        gmq = 0;
      }
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
  }, [pesees]);

  if (!chartData) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="bar-chart-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Aucune pesée disponible
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Ajoutez des pesées pour voir l'évolution du poids
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.error }]}>
          Debug: {pesees?.length || 0} pesées reçues
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Ionicons name="trending-up" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Évolution du Poids</Text>
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
            Poids (kg) • {pesees.length} pesée{pesees.length > 1 ? 's' : ''}
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

      {/* Commentaire GMQ pour l'utilisateur */}
      {chartData.gmq > 0 && (() => {
        const gmqComment = getGmqComment(chartData.gmq, colors);
        return (
          <View style={[styles.commentBox, { backgroundColor: `${gmqComment.color}20`, borderColor: gmqComment.color }]}>
            <Ionicons name={gmqComment.icon as any} size={18} color={gmqComment.color} />
            <Text style={[styles.commentText, { color: gmqComment.color }]}>
              {gmqComment.message}
            </Text>
          </View>
        );
      })()}
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
  commentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
  },
  commentText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
});
