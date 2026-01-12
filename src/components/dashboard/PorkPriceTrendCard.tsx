/**
 * Carte affichant la tendance du prix du porc poids vif (FCFA/kg)
 * Graphique sur les 6 derniers mois
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { format, startOfMonth, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import Card from '../Card';
import LoadingSpinner from '../LoadingSpinner';
import EmptyState from '../EmptyState';
import { usePorkPriceTrend } from '../../hooks/usePorkPriceTrend';
import type { WeeklyPorkPriceTrend } from '../../database/repositories/WeeklyPorkPriceTrendRepository';

const screenWidth = Dimensions.get('window').width;

interface PorkPriceTrendCardProps {
  style?: StyleProp<ViewStyle>;
}

export default function PorkPriceTrendCard({ style }: PorkPriceTrendCardProps) {
  const { colors, isDark } = useTheme();
  const {
    trends,
    currentWeekPrice,
    previousWeekPrice,
    priceChange,
    priceChangePercent,
    loading,
    error,
    lastUpdated,
  } = usePorkPriceTrend();

  // Configuration du graphique
  const chartConfig = useMemo(
    () => ({
      backgroundColor: colors.surface,
      backgroundGradientFrom: colors.surface,
      backgroundGradientTo: colors.surface,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(34, 139, 34, ${opacity})`, // Vert pour la ligne principale
      labelColor: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
      style: {
        borderRadius: BORDER_RADIUS.md,
      },
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: colors.primary,
      },
      propsForBackgroundLines: {
        strokeDasharray: '', // Lignes pleines
        stroke: colors.border,
        strokeWidth: 1,
      },
    }),
    [colors, isDark]
  );

  // Fonction pour obtenir le mois à partir d'une tendance hebdomadaire
  const getMonthFromTrend = (trend: WeeklyPorkPriceTrend): Date => {
    // Utiliser updatedAt si disponible, sinon calculer à partir de year/weekNumber
    if (trend.updatedAt) {
      return startOfMonth(parseISO(trend.updatedAt));
    }

    // Calculer le mois à partir de l'année et du numéro de semaine ISO
    // Semaine ISO: la semaine 1 contient le 4 janvier
    const jan4 = new Date(trend.year, 0, 4);
    const jan4Day = jan4.getDay() || 7; // 1 = lundi, 7 = dimanche
    const daysToMonday = jan4Day - 1;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - daysToMonday);

    // Calculer la date de début de la semaine
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (trend.weekNumber - 1) * 7);

    // Retourner le début du mois de cette semaine
    return startOfMonth(weekStart);
  };

  // Préparer les données pour le graphique (4 dernières semaines)
  const chartData = useMemo(() => {
    if (trends.length === 0) return null;

    // Prendre les 4 dernières semaines
    const last4Weeks = trends.slice(-4);

    // Créer les labels (Semaine N)
    const labels = last4Weeks.map((t) => `S${t.weekNumber}`);

    // Créer les données de prix
    const priceData = last4Weeks.map((t) => t.avgPricePlatform || t.avgPriceRegional || 0);

    // Calculer min et max pour l'échelle
    const allPrices = priceData.filter((p) => p > 0);
    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 500;
    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 2000;
    const range = maxPrice - minPrice || 500;
    const padding = range * 0.1;

    return {
      labels,
      datasets: [
        {
          data: priceData.map(p => p || minPrice), // Éviter les 0 pour le graphique
        },
      ],
      yAxisMin: Math.max(0, minPrice - padding),
      yAxisMax: maxPrice + padding,
    };
  }, [trends]);

  // Calculer le prix moyen des 4 dernières semaines
  const { avgPrice4Weeks, previousAvgPrice, weekPriceChange, weekPriceChangePercent } =
    useMemo(() => {
      if (trends.length === 0) {
        return {
          avgPrice4Weeks: undefined,
          previousAvgPrice: undefined,
          weekPriceChange: undefined,
          weekPriceChangePercent: undefined,
        };
      }

      // Prendre les 4 dernières semaines
      const last4Weeks = trends.slice(-4);
      const prices = last4Weeks
        .map((t) => t.avgPricePlatform || t.avgPriceRegional || 0)
        .filter((p) => p > 0);

      if (prices.length === 0) {
        return {
          avgPrice4Weeks: undefined,
          previousAvgPrice: undefined,
          weekPriceChange: undefined,
          weekPriceChangePercent: undefined,
        };
      }

      // Prix moyen des 4 dernières semaines
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

      // Comparer avec les 4 semaines précédentes (si disponibles)
      let previousAvg: number | undefined;
      let change: number | undefined;
      let changePercent: number | undefined;

      if (trends.length >= 8) {
        const previous4Weeks = trends.slice(-8, -4);
        const previousPrices = previous4Weeks
          .map((t) => t.avgPricePlatform || t.avgPriceRegional || 0)
          .filter((p) => p > 0);
        
        if (previousPrices.length > 0) {
          previousAvg = Math.round(previousPrices.reduce((a, b) => a + b, 0) / previousPrices.length);
          change = avgPrice - previousAvg;
          changePercent = (change / previousAvg) * 100;
        }
      }

      return {
        avgPrice4Weeks: avgPrice,
        previousAvgPrice: previousAvg,
        weekPriceChange: change,
        weekPriceChangePercent: changePercent,
      };
    }, [trends]);

  // Formatage du sous-titre avec variation (prix moyen 4 dernières semaines)
  const { priceText, changeText, changeColor } = useMemo(() => {
    if (!avgPrice4Weeks) {
      return { priceText: 'Calcul en cours...', changeText: '', changeColor: colors.textSecondary };
    }

    const priceFormatted = avgPrice4Weeks.toLocaleString('fr-FR');
    let change = '';
    let color = colors.textSecondary;

    if (
      weekPriceChange !== undefined &&
      weekPriceChangePercent !== undefined &&
      previousAvgPrice
    ) {
      const changeFormatted = Math.abs(weekPriceChangePercent).toFixed(1);
      const arrow = weekPriceChange >= 0 ? '↑' : '↓';
      change = ` (${arrow} ${changeFormatted}%)`;
      color = weekPriceChange >= 0 ? colors.success : colors.error;
    }

    return { 
      priceText: `${priceFormatted} FCFA/kg`, 
      changeText: change, 
      changeColor: color 
    };
  }, [avgPrice4Weeks, weekPriceChange, weekPriceChangePercent, previousAvgPrice, colors]);

  if (loading) {
    return (
      <Card style={[styles.card, style, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Tendance du prix du porc poids vif (FCFA/kg)
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="small" />
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={[styles.card, style, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Tendance du prix du porc poids vif (FCFA/kg)
          </Text>
        </View>
        <EmptyState
          icon={<Ionicons name="alert-circle-outline" size={48} color={colors.error} />}
          title="Erreur"
          message={error}
        />
      </Card>
    );
  }

  if (!chartData || trends.length === 0) {
    return (
      <Card style={[styles.card, style, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Tendance du prix du porc poids vif (FCFA/kg)
          </Text>
        </View>
        <EmptyState
          icon={<Ionicons name="stats-chart-outline" size={48} color={colors.textSecondary} />}
          title="Aucune donnée disponible"
          message="Les tendances de prix seront disponibles une fois que des transactions auront été enregistrées"
        />
      </Card>
    );
  }

  return (
    <Card style={[styles.card, style, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            Tendance du prix du porc poids vif (FCFA/kg)
          </Text>
          {lastUpdated && (
            <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
              Mis à jour {format(new Date(lastUpdated), 'HH:mm', { locale: fr })}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitleLabel}>
          Prix moyen (4 dernières semaines) :{' '}
          <Text style={[styles.subtitlePrice, { color: '#2196F3' }]}>
            {priceText}
          </Text>
          {changeText && (
            <Text style={{ color: changeColor, fontWeight: '600' }}>
              {changeText}
            </Text>
          )}
        </Text>
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={screenWidth - SPACING.xl * 2 - SPACING.md * 2}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withDots={true}
          withShadow={false}
          segments={4}
          yAxisInterval={50}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(34, 139, 34, 1)' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              Prix moyen (FCFA/kg)
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  header: {
    marginBottom: SPACING.md,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
  },
  lastUpdated: {
    fontSize: FONT_SIZES.xs,
    marginLeft: SPACING.sm,
  },
  subtitleContainer: {
    marginBottom: SPACING.md,
  },
  subtitleLabel: {
    fontSize: FONT_SIZES.md,
    color: '#666',
  },
  subtitlePrice: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  chart: {
    borderRadius: BORDER_RADIUS.md,
  },
  footer: {
    marginTop: SPACING.sm,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
});
