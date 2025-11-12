/**
 * Composant graphiques financiers
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useAppSelector } from '../store/hooks';
import { ChargeFixe, DepensePonctuelle, Revenu } from '../types';
import { SPACING, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import StatCard from './StatCard';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

export default function FinanceGraphiquesComponent() {
  const { colors, isDark } = useTheme();
  const { chargesFixes, depensesPonctuelles, revenus } = useAppSelector((state) => state.finance);

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

      // Revenus du mois
      const revenusMois = revenus
        .filter((r) => {
          const rDate = parseISO(r.date);
          return rDate >= monthStart && rDate <= monthEnd;
        })
        .reduce((sum, r) => sum + r.montant, 0);

      monthsData.push({
        month: monthKey,
        planifie,
        reel,
        revenus: revenusMois,
      });
    }

    // Données pour le graphique par catégorie de dépenses
    const categoryData: Record<string, number> = {};
    depensesPonctuelles.forEach((dp) => {
      const category = dp.categorie;
      categoryData[category] = (categoryData[category] || 0) + dp.montant;
    });

    // Données pour le graphique par catégorie de revenus
    const revenusCategoryData: Record<string, number> = {};
    revenus.forEach((r) => {
      const category = r.categorie;
      revenusCategoryData[category] = (revenusCategoryData[category] || 0) + r.montant;
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

    // Données pour le graphique par catégorie de dépenses
    const pieChartColors = [
      '#2E7D32',
      '#4CAF50',
      '#FF9800',
      '#F44336',
      '#2196F3',
      '#9C27B0',
    ];
    const pieChartData = Object.entries(categoryData).map(([category, montant]) => {
      return {
        name: category,
        population: montant,
        color: pieChartColors[Object.keys(categoryData).indexOf(category) % pieChartColors.length],
        legendFontColor: colors.text,
        legendFontSize: 12,
      };
    });

    // Données pour le graphique par catégorie de revenus
    const revenusPieChartData = Object.entries(revenusCategoryData).map(([category, montant]) => {
      const categoryLabels: Record<string, string> = {
        vente_porc: 'Vente porc',
        vente_autre: 'Vente autre',
        subvention: 'Subvention',
        autre: 'Autre',
      };
      return {
        name: categoryLabels[category] || category,
        population: montant,
        color: pieChartColors[Object.keys(revenusCategoryData).indexOf(category) % pieChartColors.length],
        legendFontColor: colors.text,
        legendFontSize: 12,
      };
    });

    // Indicateurs clés
    const currentMonth = monthsData[monthsData.length - 1];
    const budgetMois = currentMonth.planifie;
    const depensesReelles = currentMonth.reel;
    const revenusMois = currentMonth.revenus;
    const ecart = budgetMois - depensesReelles;
    const solde = revenusMois - depensesReelles;
    const depensesTotal = depensesPonctuelles.reduce((sum, dp) => sum + dp.montant, 0);
    const revenusTotal = revenus.reduce((sum, r) => sum + r.montant, 0);
    const soldeTotal = revenusTotal - depensesTotal;

    return {
      lineChartData,
      pieChartData,
      revenusPieChartData,
      budgetMois,
      depensesReelles,
      revenusMois,
      ecart,
      solde,
      depensesTotal,
      revenusTotal,
      soldeTotal,
    };
  }, [chargesFixes, depensesPonctuelles, revenus, colors]);

  const chartConfig = useMemo(() => ({
    backgroundColor: colors.background,
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '33, 33, 33'}, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  }), [colors, isDark]);

  // Calculer les données pour le graphique réel et revenus (utilisé dans le rendu)
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

      const revenusMois = revenus
        .filter((r) => {
          const rDate = parseISO(r.date);
          return rDate >= monthStart && rDate <= monthEnd;
        })
        .reduce((sum, r) => sum + r.montant, 0);

      data.push({ reel, revenus: revenusMois });
    }
    return data;
  }, [depensesPonctuelles, revenus]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Vue d'ensemble financière</Text>

        {/* Indicateurs clés */}
        <View style={styles.statsContainer}>
          <StatCard
            value={formatAmount(graphData.revenusMois)}
            label="Revenus du mois"
            valueColor={colors.success || colors.primary}
          />
          <StatCard
            value={formatAmount(graphData.depensesReelles)}
            label="Dépenses du mois"
            valueColor={colors.accent}
          />
          <StatCard
            value={formatAmount(graphData.solde)}
            label={graphData.solde >= 0 ? 'Solde (bénéfice)' : 'Solde (perte)'}
            valueColor={graphData.solde >= 0 ? colors.success : colors.error}
          />
        </View>

        {/* Graphique Planifié vs Réel */}
        <View style={[styles.chartSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Planifié vs Réel (6 derniers mois)</Text>
          {graphData.lineChartData.datasets[0].data.length > 0 ? (
            <>
              <View style={styles.chartContainer}>
                <Text style={[styles.chartSubtitle, { color: colors.text }]}>Planifié</Text>
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
                <Text style={[styles.chartSubtitle, { color: colors.text }]}>Dépenses réelles</Text>
                <LineChart
                  data={{
                    labels: graphData.lineChartData.labels,
                    datasets: [
                      {
                        data: monthsDataForReel.map((d) => Math.round(d.reel)),
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
              <View style={styles.chartContainer}>
                <Text style={[styles.chartSubtitle, { color: colors.text }]}>Revenus</Text>
                <LineChart
                  data={{
                    labels: graphData.lineChartData.labels,
                    datasets: [
                      {
                        data: monthsDataForReel.map((d) => Math.round(d.revenus)),
                      },
                    ],
                  }}
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
            </>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>Aucune donnée disponible</Text>
            </View>
          )}
        </View>

        {/* Graphique par catégorie de dépenses */}
        {graphData.pieChartData.length > 0 && (
          <View style={[styles.chartSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Répartition des dépenses par catégorie</Text>
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

        {/* Graphique par catégorie de revenus */}
        {graphData.revenusPieChartData.length > 0 && (
          <View style={[styles.chartSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Répartition des revenus par catégorie</Text>
            <PieChart
              data={graphData.revenusPieChartData}
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
        <View style={[styles.summarySection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Résumé total</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total des revenus:</Text>
            <Text style={[styles.summaryValue, { color: colors.success || colors.primary }]}>{formatAmount(graphData.revenusTotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total des dépenses:</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatAmount(graphData.depensesTotal)}</Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: SPACING.sm, marginTop: SPACING.sm }]}>
            <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: 'bold' }]}>Solde total:</Text>
            <Text style={[styles.summaryValue, { color: graphData.soldeTotal >= 0 ? colors.success : colors.error, fontWeight: 'bold' }]}>
              {formatAmount(graphData.soldeTotal)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Nombre de revenus:</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{revenus.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Nombre de dépenses:</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{depensesPonctuelles.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Charges fixes actives:</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
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
    marginBottom: SPACING.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  chartSection: {
    marginBottom: SPACING.xl,
    padding: SPACING.md,
    borderRadius: 8,
  },
  chartTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
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
  },
  chartContainer: {
    marginBottom: SPACING.md,
  },
  chartSubtitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  summarySection: {
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.md,
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
  },
});

