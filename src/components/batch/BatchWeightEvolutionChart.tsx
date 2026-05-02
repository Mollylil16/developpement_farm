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
  gmqOverride?: number; // GMQ calculé externe (pour le graphique global)
  showTotalWeight?: boolean; // Si true, affiche le poids total au lieu du poids moyen
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function BatchWeightEvolutionChart({ 
  weighings, 
  batchName, 
  gmqOverride,
  showTotalWeight = false 
}: Props) {
  const { colors } = useTheme();

  // Trier les pesées par date et calculer les données du graphique
  const chartData = useMemo(() => {
    if (!weighings || weighings.length === 0) {
      return null;
    }

    // Filtrer et valider les pesées (poids valide et date valide)
    const validWeighings = weighings.filter((w) => {
      const weight = w.average_weight_kg;
      const date = new Date(w.weighing_date);
      return (
        typeof weight === 'number' &&
        !isNaN(weight) &&
        isFinite(weight) &&
        weight > 0 &&
        !isNaN(date.getTime())
      );
    });

    if (validWeighings.length === 0) {
      return null;
    }

    // Trier par date (croissante)
    const sortedWeighings = [...validWeighings].sort((a, b) => {
      const dateA = new Date(a.weighing_date).getTime();
      const dateB = new Date(b.weighing_date).getTime();
      return dateA - dateB;
    });

    // Extraire les poids : total si showTotalWeight, sinon moyenne
    const weights = sortedWeighings.map((w) => {
      if (showTotalWeight) {
        // Pour le graphique global : poids total = average_weight_kg (qui contient déjà le total)
        return w.average_weight_kg;
      } else {
        // Pour le graphique par loge : poids moyen
        return w.average_weight_kg;
      }
    });

    // Formater les dates pour l'affichage
    // Si plusieurs pesées le même jour, inclure l'heure pour les distinguer
    const firstDate = new Date(sortedWeighings[0].weighing_date);
    const lastDate = new Date(sortedWeighings[sortedWeighings.length - 1].weighing_date);
    const spansMultipleYears = firstDate.getFullYear() !== lastDate.getFullYear();
    
    // Vérifier si plusieurs pesées sont le même jour
    const datesByDay = new Map<string, number>();
    sortedWeighings.forEach((w) => {
      const date = new Date(w.weighing_date);
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      datesByDay.set(dayKey, (datesByDay.get(dayKey) || 0) + 1);
    });
    const hasMultipleWeighingsSameDay = Array.from(datesByDay.values()).some(count => count > 1);

    // Créer un compteur pour les pesées du même jour
    const dayCounters = new Map<string, number>();
    
    const dates = sortedWeighings.map((w, index) => {
      const date = new Date(w.weighing_date);
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const countSameDay = datesByDay.get(dayKey) || 1;
      const dayCounter = (dayCounters.get(dayKey) || 0) + 1;
      dayCounters.set(dayKey, dayCounter);
      
      if (spansMultipleYears) {
        // Si les pesées s'étalent sur plusieurs années, inclure l'année
        if (hasMultipleWeighingsSameDay && countSameDay > 1) {
          // Si plusieurs pesées le même jour, inclure l'heure ou un numéro
          if (date.getHours() !== 0 || date.getMinutes() !== 0) {
            // Si l'heure est définie, l'utiliser
            return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
          } else {
            // Sinon, utiliser un numéro pour distinguer
            return `${date.getDate()}/${date.getMonth() + 1} #${dayCounter}`;
          }
        }
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
      } else {
        // Si plusieurs pesées le même jour, inclure l'heure ou un numéro pour les distinguer
        if (hasMultipleWeighingsSameDay && countSameDay > 1) {
          if (date.getHours() !== 0 || date.getMinutes() !== 0) {
            // Si l'heure est définie, l'utiliser
            return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
          } else {
            // Sinon, utiliser un numéro pour distinguer (ex: "30/12 #1", "30/12 #2")
            return `${date.getDate()}/${date.getMonth() + 1} #${dayCounter}`;
          }
        }
        // Sinon, format simple
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }
    });

    // Calculer le gain moyen quotidien (GMQ) de manière plus précise
    // Utiliser le GMQ fourni en override si disponible (pour le graphique global)
    let gmq = gmqOverride !== undefined ? gmqOverride : 0;
    
    if (gmq === 0 && sortedWeighings.length >= 2) {
      const firstWeighing = sortedWeighings[0];
      const lastWeighing = sortedWeighings[sortedWeighings.length - 1];
      const firstDate = new Date(firstWeighing.weighing_date);
      const lastDate = new Date(lastWeighing.weighing_date);
      
      // Calculer la différence en millisecondes
      const diffMs = lastDate.getTime() - firstDate.getTime();
      // Convertir en jours (avec décimales pour plus de précision)
      const joursTotal = diffMs / (1000 * 60 * 60 * 24);
      
      // Calculer le gain total en kg
      const gainTotal = lastWeighing.average_weight_kg - firstWeighing.average_weight_kg;
      
      // GMQ = (gain en kg / nombre de jours) * 1000 pour convertir en grammes/jour
      // Si les pesées sont le même jour (joursTotal < 1), utiliser au minimum 0.1 jour pour le calcul
      // Cela permet d'avoir un GMQ même pour des pesées le même jour
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
        <Text style={[styles.title, { color: colors.text }]}>
          {showTotalWeight ? 'Évolution du Poids Total' : 'Évolution du Poids Moyen'}
        </Text>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {showTotalWeight ? 'Poids total initial' : 'Poids initial'}
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {chartData.firstWeight.toFixed(1)} kg
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {showTotalWeight ? 'Poids total actuel' : 'Poids actuel'}
          </Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {chartData.lastWeight.toFixed(1)} kg
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {showTotalWeight ? 'Gain total ferme' : 'Gain total'}
          </Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            +{chartData.totalGain.toFixed(1)} kg
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {showTotalWeight ? 'GMQ moyen' : 'GMQ'}
          </Text>
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
          yAxisSuffix=""
          yAxisInterval={1}
          formatYLabel={(value) => {
            // Formater les valeurs de l'axe Y pour afficher les valeurs numériques avec unité
            const numValue = parseFloat(value);
            if (isNaN(numValue)) return value;
            // Arrondir à 0 décimale pour les grandes valeurs (poids total)
            const formatted = numValue >= 100 ? numValue.toFixed(0) : numValue.toFixed(1);
            return `${formatted} kg`;
          }}
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
            {showTotalWeight ? 'Poids total (kg)' : 'Poids moyen (kg)'} • {weighings.length} pesée{weighings.length > 1 ? 's' : ''}
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

