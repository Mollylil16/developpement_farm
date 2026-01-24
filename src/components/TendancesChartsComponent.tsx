/**
 * Composant pour afficher les graphiques de tendances
 * Évolution du poids, mortalité, finances, GMQ
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import Card from './Card';
import { loadPeseesRecents } from '../store/slices/productionSlice';
import { loadMortalitesParProjet } from '../store/slices/mortalitesSlice';
import type { ChargeFixe, DepensePonctuelle } from '../types/finance';
import type { Mortalite } from '../types/mortalites';
import type { ProductionPesee } from '../types/production';
import { selectPeseesRecents } from '../store/selectors/productionSelectors';
import { selectAllMortalites } from '../store/selectors/mortalitesSelectors';
import {
  selectAllChargesFixes,
  selectAllDepensesPonctuelles,
} from '../store/selectors/financeSelectors';

const screenWidth = Dimensions.get('window').width;

type PeriodeType = '7j' | '30j' | '3m' | '6m' | '12m';

export default function TendancesChartsComponent() {
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const peseesRecents: ProductionPesee[] = useAppSelector(selectPeseesRecents);
  const mortalites: Mortalite[] = useAppSelector(selectAllMortalites);
  const chargesFixes: ChargeFixe[] = useAppSelector(selectAllChargesFixes);
  const depensesPonctuelles: DepensePonctuelle[] = useAppSelector(selectAllDepensesPonctuelles);
  const [periode, setPeriode] = useState<PeriodeType>('3m');

  // Charger les données nécessaires
  useEffect(() => {
    if (projetActif) {
      dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 100 }));
      dispatch(loadMortalitesParProjet(projetActif.id));
    }
  }, [dispatch, projetActif]);

  // Configuration des graphiques
  const chartConfig = useMemo(
    () => ({
      backgroundColor: colors.surface,
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(34, 139, 34, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
      style: {
        borderRadius: BORDER_RADIUS.md,
      },
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: colors.primary,
      },
    }),
    [colors, isDark]
  );

  // Calculer la date de début selon la période
  const getDateDebut = (periodeType: PeriodeType): Date => {
    const maintenant = new Date();
    switch (periodeType) {
      case '7j':
        return new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30j':
        return new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3m':
        return subMonths(maintenant, 3);
      case '6m':
        return subMonths(maintenant, 6);
      case '12m':
        return subMonths(maintenant, 12);
      default:
        return subMonths(maintenant, 3);
    }
  };

  // 1. Graphique d'évolution du poids moyen
  const poidsChartData = useMemo(() => {
    const dateDebut = getDateDebut(periode);
    const peseesFiltrees = peseesRecents.filter((p: ProductionPesee) => {
      const datePesee = parseISO(p.date);
      return datePesee >= dateDebut;
    });

    if (peseesFiltrees.length === 0) return null;

    // Grouper par semaine ou mois selon la période
    const groupBy = periode === '7j' || periode === '30j' ? 'week' : 'month';

    const grouped = peseesFiltrees.reduce(
      (
        acc: Record<string, { poids: number[]; count: number; date: Date }>,
        pesee: ProductionPesee
      ) => {
        const datePesee = parseISO(pesee.date);
        let key: string;
        let dateReference: Date;

        if (groupBy === 'week') {
          const weekStart = new Date(datePesee);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          dateReference = weekStart;
          key = format(weekStart, 'dd MMM', { locale: fr });
        } else {
          dateReference = startOfMonth(datePesee);
          key = format(datePesee, 'MMM yyyy', { locale: fr });
        }

        if (!acc[key]) {
          acc[key] = { poids: [], count: 0, date: dateReference };
        }
        acc[key].poids.push(pesee.poids_kg);
        acc[key].count++;
        return acc;
      },
      {} as Record<string, { poids: number[]; count: number; date: Date }>
    );

    // Trier par date réelle (croissant : du plus ancien au plus récent)
    const labels = Object.keys(grouped).sort((a, b) => {
      return grouped[a].date.getTime() - grouped[b].date.getTime();
    });

    const data = labels.map((key) => {
      const group = grouped[key];
      return Math.round((group.poids.reduce((a, b) => a + b, 0) / group.count) * 10) / 10;
    });

    return {
      labels: labels.slice(-8), // Limiter à 8 points pour lisibilité
      datasets: [
        {
          data: data.slice(-8),
        },
      ],
    };
  }, [peseesRecents, periode]);

  // 2. Graphique de mortalité (taux mensuel)
  const mortaliteChartData = useMemo(() => {
    const dateDebut = getDateDebut(periode);
    const mortalitesFiltrees = mortalites.filter((m) => {
      const dateMortalite = parseISO(m.date);
      return dateMortalite >= dateDebut;
    });

    if (mortalitesFiltrees.length === 0) return null;

    // Grouper par mois
    const grouped = mortalitesFiltrees.reduce(
      (acc, mortalite) => {
        const dateMortalite = parseISO(mortalite.date);
        const key = format(dateMortalite, 'MMM yyyy', { locale: fr });

        if (!acc[key]) {
          acc[key] = { total: 0, count: 0 };
        }
        acc[key].total += mortalite.nombre_porcs;
        acc[key].count++;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>
    );

    const labels = Object.keys(grouped).sort();
    const data = labels.map((key) => grouped[key].total);

    return {
      labels: labels.slice(-6), // Limiter à 6 mois
      datasets: [
        {
          data: data.slice(-6),
        },
      ],
    };
  }, [mortalites, periode]);

  // 3. Graphique de GMQ par période
  const gmqChartData = useMemo(() => {
    const dateDebut = getDateDebut(periode);
    const peseesFiltrees = peseesRecents.filter((p: ProductionPesee) => {
      const datePesee = parseISO(p.date);
      return datePesee >= dateDebut && p.gmq !== null && p.gmq !== undefined;
    });

    if (peseesFiltrees.length === 0) return null;

    // Grouper par mois
    const grouped = peseesFiltrees.reduce(
      (acc: Record<string, { gmq: number[]; count: number }>, pesee: ProductionPesee) => {
        const datePesee = parseISO(pesee.date);
        const key = format(datePesee, 'MMM yyyy', { locale: fr });

        if (!acc[key]) {
          acc[key] = { gmq: [], count: 0 };
        }
        if (pesee.gmq) {
          acc[key].gmq.push(pesee.gmq);
          acc[key].count++;
        }
        return acc;
      },
      {} as Record<string, { gmq: number[]; count: number }>
    );

    const labels = Object.keys(grouped).sort();
    const data = labels.map((key) => {
      const group = grouped[key];
      return Math.round(group.gmq.reduce((a, b) => a + b, 0) / group.count);
    });

    return {
      labels: labels.slice(-6),
      datasets: [
        {
          data: data.slice(-6),
        },
      ],
    };
  }, [peseesRecents, periode]);

  // 4. Graphique financier (dépenses mensuelles)
  const financesChartData = useMemo(() => {
    const dateDebut = getDateDebut(periode);
    const maintenant = new Date();
    const maintenantStart = startOfMonth(maintenant);

    // Calculer les dépenses par mois (uniquement dans le passé)
    const depensesFiltrees = depensesPonctuelles.filter((d: DepensePonctuelle) => {
      const dateDepense = parseISO(d.date);
      return dateDepense >= dateDebut && dateDepense <= maintenant;
    });

    // Calculer les charges fixes mensuelles
    const chargesFixesActives = chargesFixes.filter((cf: ChargeFixe) => cf.statut === 'actif');

    // Grouper par mois avec clé de date pour tri chronologique
    const grouped = new Map<string, { date: Date; montant: number }>();

    // Ajouter les dépenses ponctuelles
    depensesFiltrees.forEach((depense: DepensePonctuelle) => {
      const dateDepense = parseISO(depense.date);
      const monthStart = startOfMonth(dateDepense);
      const key = format(monthStart, 'yyyy-MM');

      if (!grouped.has(key)) {
        grouped.set(key, { date: monthStart, montant: 0 });
      }
      const entry = grouped.get(key)!;
      entry.montant += depense.montant;
    });

    // Ajouter les charges fixes mensuelles
    chargesFixesActives.forEach((cf: ChargeFixe) => {
      const montantMensuel =
        cf.frequence === 'mensuel'
          ? cf.montant
          : cf.frequence === 'trimestriel'
            ? cf.montant / 3
            : cf.montant / 12;

      // Ajouter pour chaque mois depuis dateDebut jusqu'à maintenant
      let currentDate = startOfMonth(dateDebut);

      while (currentDate <= maintenantStart) {
        const key = format(currentDate, 'yyyy-MM');
        if (!grouped.has(key)) {
          grouped.set(key, { date: new Date(currentDate), montant: 0 });
        }
        const entry = grouped.get(key)!;
        entry.montant += montantMensuel;
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }
    });

    // Trier par date chronologique
    const sortedEntries = Array.from(grouped.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-6); // Prendre les 6 derniers mois

    const labels = sortedEntries.map((entry) => format(entry.date, 'MMM yyyy', { locale: fr }));
    const data = sortedEntries.map((entry) => Math.round(entry.montant));

    return {
      labels,
      datasets: [
        {
          data,
        },
      ],
    };
  }, [depensesPonctuelles, chargesFixes, periode]);

  const periodes: { label: string; value: PeriodeType }[] = [
    { label: '7 jours', value: '7j' },
    { label: '30 jours', value: '30j' },
    { label: '3 mois', value: '3m' },
    { label: '6 mois', value: '6m' },
    { label: '12 mois', value: '12m' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sélecteur de période */}
        <View
          style={[
            styles.periodSelector,
            {
              backgroundColor: colors.surface,
              ...colors.shadow.small,
            },
          ]}
        >
          <Text style={[styles.periodLabel, { color: colors.text }]}>Période :</Text>
          <View style={styles.periodButtons}>
            {periodes.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.periodButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                  periode === p.value && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setPeriode(p.value)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    { color: colors.text },
                    periode === p.value && {
                      color: colors.textOnPrimary,
                      fontWeight: FONT_WEIGHTS.bold,
                    },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Graphique d'évolution du poids */}
        <Card elevation="medium" padding="large" style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            📊 Évolution du poids moyen
          </Text>
          {poidsChartData ? (
            <LineChart
              data={poidsChartData}
              width={screenWidth - SPACING.xl * 2 - SPACING.lg * 2}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(34, 139, 34, ${opacity})`,
              }}
              bezier
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=" kg"
            />
          ) : (
            <View style={[styles.emptyChart, { backgroundColor: colors.background }]}>
              <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
                Aucune pesée enregistrée pour cette période
              </Text>
            </View>
          )}
        </Card>

        {/* Graphique de mortalité */}
        <Card elevation="medium" padding="large" style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>💀 Mortalité mensuelle</Text>
          {mortaliteChartData ? (
            <BarChart
              data={mortaliteChartData}
              width={screenWidth - SPACING.xl * 2 - SPACING.lg * 2}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
              }}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=" porcs"
              showValuesOnTopOfBars
            />
          ) : (
            <View style={[styles.emptyChart, { backgroundColor: colors.background }]}>
              <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
                Aucune mortalité enregistrée pour cette période
              </Text>
            </View>
          )}
        </Card>

        {/* Graphique de GMQ */}
        <Card elevation="medium" padding="large" style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            📈 GMQ moyen (Gain Moyen Quotidien)
          </Text>
          {gmqChartData ? (
            <LineChart
              data={gmqChartData}
              width={screenWidth - SPACING.xl * 2 - SPACING.lg * 2}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              }}
              bezier
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=" g/j"
            />
          ) : (
            <View style={[styles.emptyChart, { backgroundColor: colors.background }]}>
              <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
                Aucune donnée GMQ disponible pour cette période
              </Text>
            </View>
          )}
        </Card>

        {/* Graphique financier */}
        <Card elevation="medium" padding="large" style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>💰 Dépenses mensuelles</Text>
          {financesChartData && financesChartData.datasets?.[0]?.data?.length > 0 ? (
            <BarChart
              data={financesChartData}
              width={screenWidth - SPACING.xl * 2 - SPACING.lg * 2}
              height={220}
              chartConfig={{
                ...chartConfig,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
              }}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=" FCFA"
              showValuesOnTopOfBars
            />
          ) : (
            <View style={[styles.emptyChart, { backgroundColor: colors.background }]}>
              <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
                Aucune dépense enregistrée pour cette période
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  periodSelector: {
    padding: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  periodLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.sm,
  },
  periodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs / 2,
  },
  periodButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginHorizontal: SPACING.xs / 2,
    marginBottom: SPACING.xs,
  },
  periodButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  chartCard: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  chartTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  chart: {
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyChart: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  emptyChartText: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
