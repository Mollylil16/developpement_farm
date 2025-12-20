/**
 * Composant Graphique de Niveau de Stock par Aliment
 * Affiche l'évolution du niveau de stock de chaque aliment dans le temps avec le seuil d'alerte en pointillé
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

// Type pour les datasets de LineChart
interface ChartDataset {
  data: number[];
  color: (opacity?: number) => string;
  strokeWidth?: number;
  withDots?: boolean;
}
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { StockAliment, StockMouvement } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import { format, parseISO, startOfDay, subDays, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  stocks: StockAliment[];
  mouvementsParAliment: { [alimentId: string]: StockMouvement[] };
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// Couleurs pour chaque aliment (palette de couleurs distinctes)
const ALIMENT_COLORS = [
  '#228B22', // Vert forêt
  '#4169E1', // Bleu royal
  '#FF6347', // Tomate
  '#FFD700', // Or
  '#9370DB', // Violet moyen
  '#00CED1', // Turquoise foncé
  '#FF69B4', // Rose vif
  '#32CD32', // Vert lime
  '#FF4500', // Orange rouge
  '#1E90FF', // Bleu dodger
  '#FF1493', // Rose profond
  '#00FA9A', // Vert printemps moyen
];

export default function StockLevelChart({ stocks, mouvementsParAliment = {} }: Props) {
  const { colors } = useTheme();
  const [periode, setPeriode] = useState<7 | 30 | 90>(30);

  // Préparer les données du graphique avec évolution dans le temps
  const chartData = useMemo(() => {
    if (!stocks || stocks.length === 0) {
      return null;
    }

    // Trier les stocks par nom pour un affichage cohérent
    const sortedStocks = [...stocks].sort((a, b) => a.nom.localeCompare(b.nom));

    // Trouver la première date avec des mouvements
    let premiereDateMouvement: Date | null = null;
    Object.values(mouvementsParAliment).forEach((mouvements) => {
      mouvements.forEach((mouvement) => {
        const dateMouvement = startOfDay(parseISO(mouvement.date));
        if (premiereDateMouvement === null || dateMouvement < premiereDateMouvement) {
          premiereDateMouvement = dateMouvement;
        }
      });
    });

    // Déterminer la plage de dates (derniers N jours ou depuis le premier mouvement)
    const today = startOfDay(new Date());
    const dateDebutMax = subDays(today, periode);

    // Utiliser la date la plus récente entre la date basée sur la période et la première date avec mouvement
    let dateDebut: Date = dateDebutMax;
    if (premiereDateMouvement !== null) {
      // Commencer au maximum N jours en arrière, mais pas avant le premier mouvement
      const premiereDate: Date = premiereDateMouvement as Date;
      dateDebut = premiereDate < dateDebutMax ? dateDebutMax : premiereDate;
    }

    const dates = eachDayOfInterval({ start: dateDebut, end: today });

    // Préparer les labels de dates (format court)
    const labels = dates.map((date) => {
      if (periode <= 7) {
        return format(date, 'EEE', { locale: fr }).substring(0, 3);
      } else if (periode <= 30) {
        return format(date, 'dd/MM');
      } else {
        return format(date, 'dd');
      }
    });

    // Pour chaque aliment, calculer l'évolution du stock dans le temps
    const datasets: ChartDataset[] = [];
    const seuilsDatasets: ChartDataset[] = [];
    const legend: string[] = [];

    sortedStocks.forEach((stock, index) => {
      const mouvements = mouvementsParAliment[stock.id] || [];

      // Trier les mouvements par date croissante
      const mouvementsTries = [...mouvements].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculer le stock initial au début de la période
      // On remonte dans le temps depuis le stock actuel en inversant tous les mouvements de la période
      let stockInitial = stock.quantite_actuelle || 0;

      // Trouver le dernier ajustement avant ou dans la période
      const dernierAjustement = mouvementsTries
        .filter((m) => m.type === 'ajustement')
        .filter((m) => startOfDay(parseISO(m.date)) <= today)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      // Si un ajustement existe, on part de ce point
      if (dernierAjustement) {
        const ajustementDate = startOfDay(parseISO(dernierAjustement.date));
        if (ajustementDate >= dateDebut) {
          // L'ajustement est dans la période, on remonte depuis le stock actuel
          stockInitial = stock.quantite_actuelle || 0;
          mouvementsTries.forEach((mouvement) => {
            const mouvementDate = startOfDay(parseISO(mouvement.date));
            if (mouvementDate > ajustementDate && mouvementDate <= today) {
              // Inverser le mouvement pour remonter dans le temps
              if (mouvement.type === 'entree') {
                stockInitial -= mouvement.quantite;
              } else if (mouvement.type === 'sortie') {
                stockInitial += mouvement.quantite;
              }
            }
          });
          stockInitial = dernierAjustement.quantite;
        } else {
          // L'ajustement est avant la période, on remonte depuis le stock actuel
          stockInitial = stock.quantite_actuelle || 0;
          mouvementsTries.forEach((mouvement) => {
            const mouvementDate = startOfDay(parseISO(mouvement.date));
            if (mouvementDate >= dateDebut && mouvementDate <= today) {
              if (mouvement.type === 'entree') {
                stockInitial -= mouvement.quantite;
              } else if (mouvement.type === 'sortie') {
                stockInitial += mouvement.quantite;
              }
            }
          });
        }
      } else {
        // Pas d'ajustement, on remonte normalement
        mouvementsTries.forEach((mouvement) => {
          const mouvementDate = startOfDay(parseISO(mouvement.date));
          if (mouvementDate >= dateDebut && mouvementDate <= today) {
            // Inverser le mouvement pour remonter dans le temps
            if (mouvement.type === 'entree') {
              stockInitial -= mouvement.quantite;
            } else if (mouvement.type === 'sortie') {
              stockInitial += mouvement.quantite;
            }
          }
        });
      }

      stockInitial = Math.max(0, stockInitial);

      // Calculer le niveau de stock pour chaque date
      let stockActuel = stockInitial;
      const stockData: number[] = [];

      dates.forEach((date) => {
        // Appliquer les mouvements de ce jour
        mouvementsTries.forEach((mouvement) => {
          const mouvementDate = startOfDay(parseISO(mouvement.date));
          if (format(mouvementDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) {
            if (mouvement.type === 'entree') {
              stockActuel += mouvement.quantite;
            } else if (mouvement.type === 'sortie') {
              stockActuel -= mouvement.quantite;
            } else if (mouvement.type === 'ajustement') {
              stockActuel = mouvement.quantite;
            }
          }
        });
        stockData.push(Math.max(0, stockActuel));
      });

      // Couleur pour cet aliment
      const color = ALIMENT_COLORS[index % ALIMENT_COLORS.length];

      // Ajouter le dataset pour cet aliment
      datasets.push({
        data: stockData,
        color: (opacity = 1) => color,
        strokeWidth: 3,
      });

      legend.push(stock.nom);

      // Ajouter le seuil d'alerte si défini
      if (stock.seuil_alerte && stock.seuil_alerte > 0) {
        seuilsDatasets.push({
          data: dates.map(() => stock.seuil_alerte!),
          color: (opacity = 1) => colors.error,
          strokeWidth: 2,
          withDots: false,
        });
      }
    });

    // Calculer les statistiques de consommation
    const statsConsommation = sortedStocks.map((stock) => {
      const mouvements = mouvementsParAliment[stock.id] || [];
      const mouvementsTries = [...mouvements].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Filtrer les sorties dans la période
      const sortiesPeriode = mouvementsTries.filter((m) => {
        const mouvementDate = startOfDay(parseISO(m.date));
        return mouvementDate >= dateDebut && mouvementDate <= today && m.type === 'sortie';
      });

      // Calculer la consommation totale
      const consommationTotale = sortiesPeriode.reduce((sum, m) => sum + m.quantite, 0);
      const consommationMoyenneParJour = periode > 0 ? consommationTotale / periode : 0;

      // Trouver la consommation maximale sur un jour
      const consommationParJour: { [date: string]: number } = {};
      sortiesPeriode.forEach((m) => {
        const dateStr = format(startOfDay(parseISO(m.date)), 'yyyy-MM-dd');
        consommationParJour[dateStr] = (consommationParJour[dateStr] || 0) + m.quantite;
      });
      const consommationMax = Math.max(...Object.values(consommationParJour), 0);

      return {
        stock,
        consommationTotale,
        consommationMoyenneParJour,
        consommationMax,
        nombreSorties: sortiesPeriode.length,
      };
    });

    // Calculer min et max pour l'échelle
    const allValues: number[] = [];
    datasets.forEach((dataset) => {
      allValues.push(...dataset.data);
    });
    seuilsDatasets.forEach((dataset) => {
      allValues.push(...dataset.data);
    });
    const minValue = Math.min(...allValues, 0);
    const maxValue = Math.max(...allValues, 0);
    const padding = (maxValue - minValue) * 0.1 || 1;

    return {
      labels,
      datasets: [...datasets, ...seuilsDatasets],
      legend,
      stocks: sortedStocks,
      statsConsommation,
      minValue: 0, // Toujours commencer à 0
      maxValue: maxValue + padding,
    };
  }, [stocks, mouvementsParAliment, periode, colors]);

  if (!chartData) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="bar-chart-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Aucun stock disponible
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Ajoutez des aliments pour voir les niveaux de stock
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Ionicons name="trending-up" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Évolution des Stocks</Text>
      </View>

      {/* Sélecteur de période */}
      <View style={styles.periodSelector}>
        {([7, 30, 90] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              {
                backgroundColor: periode === period ? colors.primary : colors.background,
                borderColor: periode === period ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setPeriode(period)}
          >
            <Text
              style={[
                styles.periodButtonText,
                {
                  color: periode === period ? colors.textOnPrimary : colors.text,
                  fontWeight: periode === period ? '600' : 'normal',
                },
              ]}
            >
              {period}j
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Stock initial</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {(() => {
              const today = startOfDay(new Date());
              const dateDebut = subDays(today, periode);
              return chartData.stocks
                .reduce((sum, s) => {
                  const mouvements = mouvementsParAliment[s.id] || [];
                  const mouvementsTries = [...mouvements].sort(
                    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                  let stockInitial = s.quantite_actuelle || 0;
                  mouvementsTries.forEach((mouvement) => {
                    const mouvementDate = startOfDay(parseISO(mouvement.date));
                    if (mouvementDate >= dateDebut && mouvementDate <= today) {
                      if (mouvement.type === 'entree') {
                        stockInitial -= mouvement.quantite;
                      } else if (mouvement.type === 'sortie') {
                        stockInitial += mouvement.quantite;
                      }
                    }
                  });
                  return sum + Math.max(0, stockInitial);
                }, 0)
                .toFixed(1);
            })()}
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Stock actuel</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {stocks.reduce((sum, s) => sum + (s.quantite_actuelle || 0), 0).toFixed(1)}
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Conso. moyenne</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {chartData.statsConsommation
              .reduce((sum, stat) => sum + stat.consommationMoyenneParJour, 0)
              .toFixed(1) || '0'}{' '}
            /j
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sorties</Text>
          <Text style={[styles.statValue, { color: colors.info }]}>
            {chartData.statsConsommation.reduce((sum, stat) => sum + stat.nombreSorties, 0) || 0}
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
            labels: chartData.labels,
            datasets: chartData.datasets,
            legend: chartData.legend,
          }}
          width={Math.max(SCREEN_WIDTH - SPACING.lg * 6, chartData.labels.length * 60)}
          height={220}
          yAxisSuffix=""
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
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
              fill: '#FFFFFF',
            },
            propsForBackgroundLines: {
              strokeDasharray: '', // solid line
              stroke: colors.border,
              strokeWidth: 1,
            },
          }}
          bezier
          style={styles.chart}
          fromZero={true}
          segments={5}
        />
      </ScrollView>

      {/* Légende */}
      <View style={styles.legend}>
        {chartData.stocks.map((stock, index) => {
          const color = ALIMENT_COLORS[index % ALIMENT_COLORS.length];
          const hasSeuil = stock.seuil_alerte && stock.seuil_alerte > 0;
          return (
            <View key={stock.id} style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text
                  style={[styles.legendText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {stock.nom}
                </Text>
              </View>
              {hasSeuil && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDotDashed, { borderColor: colors.error }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Seuil</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Stats de consommation par aliment */}
      {chartData && chartData.statsConsommation.length > 0 && (
        <View style={styles.consoContainer}>
          <Text style={[styles.consoTitle, { color: colors.text }]}>Consommation ({periode}j)</Text>
          {chartData.statsConsommation.map((stat, index) => {
            const color = ALIMENT_COLORS[index % ALIMENT_COLORS.length];
            return (
              <View key={stat.stock.id} style={styles.consoRow}>
                <View style={styles.consoRowLeft}>
                  <View style={[styles.consoDot, { backgroundColor: color }]} />
                  <Text style={[styles.consoAliment, { color: colors.text }]} numberOfLines={1}>
                    {stat.stock.nom}
                  </Text>
                </View>
                <View style={styles.consoRowRight}>
                  <Text style={[styles.consoValue, { color: colors.textSecondary }]}>
                    {stat.consommationMoyenneParJour.toFixed(1)} {stat.stock.unite}/j
                  </Text>
                  {stat.consommationMax > 0 && (
                    <Text style={[styles.consoMax, { color: colors.textSecondary }]}>
                      (max: {stat.consommationMax.toFixed(1)})
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
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
  periodSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: FONT_SIZES.sm,
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
  consoContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  consoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: 8,
  },
  consoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  consoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  consoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  consoAliment: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  consoRowRight: {
    alignItems: 'flex-end',
  },
  consoValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  consoMax: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
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
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendDotDashed: {
    width: 20,
    height: 3,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 1,
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
