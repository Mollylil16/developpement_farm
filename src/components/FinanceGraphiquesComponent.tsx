/**
 * Composant graphiques financiers
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useAppSelector } from '../store/hooks';
import { ChargeFixe, DepensePonctuelle } from '../types';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';
import StatCard from './StatCard';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

export default function FinanceGraphiquesComponent() {
  const { chargesFixes, depensesPonctuelles } = useAppSelector((state) => state.finance);

  // Calcul des données pour les graphiques
  const graphData = useMemo(() => {
    const now = new Date();

    // Calculer les dépenses planifiées et réelles pour les 6 derniers mois
    const monthsData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'MMM');

      // Dépenses planifiées (charges fixes actives)
      let planifie = 0;
      chargesFixes
        .filter((cf) => cf.statut === 'actif')
        .forEach((cf) => {
          const cfDate = parseISO(cf.date_debut);
          if (cfDate <= monthEnd) {
            if (cf.frequence === 'mensuel') {
              planifie += cf.montant;
            } else if (cf.frequence === 'trimestriel' && i % 3 === 0) {
              planifie += cf.montant;
            } else if (cf.frequence === 'annuel' && i === 5) {
              planifie += cf.montant;
            }
          }
        });

      // Dépenses réelles (dépenses ponctuelles du mois)
      const reel = depensesPonctuelles
        .filter((dp) => {
          const dpDate = parseISO(dp.date);
          return dpDate >= monthStart && dpDate <= monthEnd;
        })
        .reduce((sum, dp) => sum + dp.montant, 0);

      monthsData.push({
        month: monthKey,
        planifie,
        reel,
      });
    }

    // Données pour le graphique par catégorie
    const categoryData: Record<string, number> = {};
    depensesPonctuelles.forEach((dp) => {
      const category = dp.categorie;
      categoryData[category] = (categoryData[category] || 0) + dp.montant;
    });

    // Données pour le graphique planifié vs réel
    // Note: react-native-chart-kit ne supporte qu'un seul dataset pour LineChart
    const lineChartData = {
      labels: monthsData.map((d) => d.month),
      datasets: [
        {
          data: monthsData.map((d) => Math.round(d.planifie)),
        },
      ],
    };

    // Données pour le graphique par catégorie
    const pieChartData = Object.entries(categoryData).map(([category, montant]) => {
      const colors = [
        '#2E7D32',
        '#4CAF50',
        '#FF9800',
        '#F44336',
        '#2196F3',
        '#9C27B0',
      ];
      return {
        name: category,
        population: montant,
        color: colors[Object.keys(categoryData).indexOf(category) % colors.length],
        legendFontColor: COLORS.text,
        legendFontSize: 12,
      };
    });

    // Indicateurs clés
    const currentMonth = monthsData[monthsData.length - 1];
    const budgetMois = currentMonth.planifie;
    const depensesReelles = currentMonth.reel;
    const ecart = budgetMois - depensesReelles;
    const depensesTotal = depensesPonctuelles.reduce((sum, dp) => sum + dp.montant, 0);

    return {
      lineChartData,
      pieChartData,
      budgetMois,
      depensesReelles,
      ecart,
      depensesTotal,
    };
  }, [chargesFixes, depensesPonctuelles]);

  const chartConfig = {
    backgroundColor: COLORS.background,
    backgroundGradientFrom: COLORS.background,
    backgroundGradientTo: COLORS.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: COLORS.primary,
    },
  };

  // Calculer les données pour le graphique réel (utilisé dans le rendu)
  const monthsDataForReel = useMemo(() => {
    const now = new Date();
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const reel = depensesPonctuelles
        .filter((dp) => {
          const dpDate = parseISO(dp.date);
          return dpDate >= monthStart && dpDate <= monthEnd;
        })
        .reduce((sum, dp) => sum + dp.montant, 0);

      data.push(reel);
    }
    return data;
  }, [depensesPonctuelles]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Vue d'ensemble financière</Text>

        {/* Indicateurs clés */}
        <View style={styles.statsContainer}>
          <StatCard
            value={formatAmount(graphData.budgetMois)}
            label="Budget du mois"
            valueColor={COLORS.primary}
          />
          <StatCard
            value={formatAmount(graphData.depensesReelles)}
            label="Dépenses réelles"
            valueColor={COLORS.accent}
          />
          <StatCard
            value={formatAmount(graphData.ecart)}
            label={graphData.ecart >= 0 ? 'Écart (sous budget)' : 'Écart (dépassement)'}
            valueColor={graphData.ecart >= 0 ? COLORS.success : COLORS.error}
          />
        </View>

        {/* Graphique Planifié vs Réel */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Planifié vs Réel (6 derniers mois)</Text>
          {graphData.lineChartData.datasets[0].data.length > 0 ? (
            <>
              <View style={styles.chartContainer}>
                <Text style={styles.chartSubtitle}>Planifié</Text>
                <LineChart
                  data={graphData.lineChartData}
                  width={screenWidth - SPACING.lg * 2}
                  height={200}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
              <View style={styles.chartContainer}>
                <Text style={styles.chartSubtitle}>Réel</Text>
                <LineChart
                  data={{
                    labels: graphData.lineChartData.labels,
                    datasets: [
                      {
                        data: monthsDataForReel.map((d) => Math.round(d)),
                      },
                    ],
                  }}
                  width={screenWidth - SPACING.lg * 2}
                  height={200}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            </>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>Aucune donnée disponible</Text>
            </View>
          )}
        </View>

        {/* Graphique par catégorie */}
        {graphData.pieChartData.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Répartition par catégorie</Text>
            <PieChart
              data={graphData.pieChartData}
              width={screenWidth - SPACING.lg * 2}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </View>
        )}

        {/* Résumé total */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Résumé total</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total des dépenses enregistrées:</Text>
            <Text style={styles.summaryValue}>{formatAmount(graphData.depensesTotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Nombre de dépenses:</Text>
            <Text style={styles.summaryValue}>{depensesPonctuelles.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Charges fixes actives:</Text>
            <Text style={styles.summaryValue}>
              {chargesFixes.filter((cf) => cf.statut === 'actif').length}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  chartSection: {
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
  },
  chartTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  chart: {
    marginVertical: SPACING.sm,
    borderRadius: 8,
  },
  emptyChart: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  chartContainer: {
    marginBottom: SPACING.md,
  },
  chartSubtitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  summarySection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
});

