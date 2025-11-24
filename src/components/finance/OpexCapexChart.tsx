/**
 * Graphique OPEX vs CAPEX Amorti
 * Affiche l'évolution des dépenses OPEX et CAPEX amorti sur plusieurs mois
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useAppSelector } from '../../store/hooks';
import { selectAllDepensesPonctuelles } from '../../store/selectors/financeSelectors';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { startOfMonth, endOfMonth, subMonths, format, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getTypeDepense } from '../../types/finance';
import { getAmortissementMensuel, getMoisActifsAmortissement } from '../../utils/financeCalculations';
import { DEFAULT_DUREE_AMORTISSEMENT_MOIS } from '../../types/projet';

const screenWidth = Dimensions.get('window').width;

export default function OpexCapexChart() {
  const { colors, isDark } = useTheme();
  const depensesPonctuelles = useAppSelector(selectAllDepensesPonctuelles);
  const { projetActif } = useAppSelector((state) => state.projet);

  const chartData = useMemo(() => {
    const maintenant = new Date();
    const nombreMois = 6;
    const mois: Date[] = [];

    // Générer les 6 derniers mois
    for (let i = nombreMois - 1; i >= 0; i--) {
      mois.push(subMonths(maintenant, i));
    }

    // Initialiser les données
    const opexParMois: number[] = [];
    const capexAmortiParMois: number[] = [];
    const labels: string[] = [];

    const dureeAmortissement = projetActif?.duree_amortissement_par_defaut_mois || DEFAULT_DUREE_AMORTISSEMENT_MOIS;

    mois.forEach((moisDate) => {
      const debutMois = startOfMonth(moisDate);
      const finMois = endOfMonth(moisDate);

      let totalOpex = 0;
      let totalCapexAmorti = 0;

      depensesPonctuelles.forEach((depense) => {
        const dateDepense = parseISO(depense.date);
        const typeDepense = getTypeDepense(depense.categorie);

        if (typeDepense === 'OPEX') {
          // Si c'est une dépense OPEX du mois, l'ajouter
          if (isWithinInterval(dateDepense, { start: debutMois, end: finMois })) {
            totalOpex += depense.montant;
          }
        } else {
          // Si c'est une dépense CAPEX, calculer son amortissement pour ce mois
          const moisActifs = getMoisActifsAmortissement(
            depense,
            debutMois,
            finMois,
            dureeAmortissement
          );

          if (moisActifs > 0) {
            const amortissementMensuel = getAmortissementMensuel(depense, dureeAmortissement);
            totalCapexAmorti += amortissementMensuel * moisActifs;
          }
        }
      });

      opexParMois.push(totalOpex);
      capexAmortiParMois.push(totalCapexAmorti);
      labels.push(format(moisDate, 'MMM', { locale: fr }));
    });

    return {
      labels,
      datasets: [
        {
          data: opexParMois,
          color: () => colors.info,
        },
        {
          data: capexAmortiParMois,
          color: () => colors.warning,
        },
      ],
      opexParMois,
      capexAmortiParMois,
    };
  }, [depensesPonctuelles, projetActif, colors]);

  const formatAmount = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(0)}K`;
    }
    return numValue.toFixed(0);
  };

  const totalOpex = chartData.opexParMois.reduce((sum, val) => sum + val, 0);
  const totalCapex = chartData.capexAmortiParMois.reduce((sum, val) => sum + val, 0);
  const totalGeneral = totalOpex + totalCapex;

  const pourcentageOpex = totalGeneral > 0 ? (totalOpex / totalGeneral) * 100 : 0;
  const pourcentageCapex = totalGeneral > 0 ? (totalCapex / totalGeneral) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>📊 OPEX vs CAPEX Amorti</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Évolution sur 6 mois (FCFA)
        </Text>
      </View>

      {/* Légende */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.info }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>OPEX (Opérationnel)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>CAPEX (Amorti)</Text>
        </View>
      </View>

      {/* Graphique avec scroll horizontal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.chartScrollContainer}
        style={styles.chartScrollView}
      >
        <BarChart
          data={{
            labels: chartData.labels,
            datasets: chartData.datasets,
          }}
          width={Math.max(screenWidth - SPACING.xl * 2, chartData.labels.length * 80)}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: colors.surface,
            backgroundGradientFrom: colors.surface,
            backgroundGradientTo: colors.surface,
            decimalPlaces: 0,
            color: (opacity = 1) => (isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`),
            labelColor: (opacity = 1) => (isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`),
            style: {
              borderRadius: BORDER_RADIUS.md,
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: colors.border,
              strokeWidth: 1,
            },
            formatYLabel: formatAmount,
          }}
          style={styles.chart}
          withInnerLines={true}
          showBarTops={false}
          fromZero={true}
        />
      </ScrollView>

      {/* Totaux et pourcentages */}
      <View style={styles.totalsContainer}>
        <View style={[styles.totalCard, { backgroundColor: colors.info + '15', borderColor: colors.info }]}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total OPEX</Text>
          <Text style={[styles.totalValue, { color: colors.info }]}>
            {new Intl.NumberFormat('fr-FR').format(totalOpex)} F
          </Text>
          <Text style={[styles.totalPercent, { color: colors.info }]}>
            {pourcentageOpex.toFixed(1)}% du total
          </Text>
        </View>

        <View style={[styles.totalCard, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total CAPEX</Text>
          <Text style={[styles.totalValue, { color: colors.warning }]}>
            {new Intl.NumberFormat('fr-FR').format(totalCapex)} F
          </Text>
          <Text style={[styles.totalPercent, { color: colors.warning }]}>
            {pourcentageCapex.toFixed(1)}% du total
          </Text>
        </View>
      </View>

      {/* Info explicative */}
      <View style={styles.infoBox}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          💡 Les investissements (CAPEX) sont automatiquement amortis sur{' '}
          {projetActif?.duree_amortissement_par_defaut_mois || DEFAULT_DUREE_AMORTISSEMENT_MOIS} mois.
          Seul l'amortissement mensuel est inclus dans les coûts de production.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    marginBottom: SPACING.xs / 2,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: FONT_SIZES.sm,
  },
  chartScrollView: {
    marginVertical: SPACING.sm,
  },
  chartScrollContainer: {
    paddingRight: SPACING.md,
  },
  chart: {
    borderRadius: BORDER_RADIUS.md,
  },
  totalsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  totalCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },
  totalValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold as any,
    marginBottom: SPACING.xs / 2,
  },
  totalPercent: {
    fontSize: FONT_SIZES.xs,
  },
  infoBox: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#0099CC15',
    borderWidth: 1,
    borderColor: '#0099CC30',
  },
  infoText: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 16,
  },
});

