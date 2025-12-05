/**
 * Carte affichant la tendance du prix du porc poids vif (FCFA/kg)
 * Graphique sur les 6 derniers mois
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
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
  style?: any;
}

export default function PorkPriceTrendCard({ style }: PorkPriceTrendCardProps) {
  const { colors, isDark } = useTheme();
  const { trends, currentWeekPrice, previousWeekPrice, priceChange, priceChangePercent, loading, error, lastUpdated } = usePorkPriceTrend();

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

  // Préparer les données pour le graphique (groupées par mois)
  const chartData = useMemo(() => {
    if (trends.length === 0) return null;

    // Grouper les tendances hebdomadaires par mois
    const monthlyData = new Map<string, { prices: number[]; regionalPrices: number[] }>();
    
    trends.forEach((t) => {
      const monthDate = getMonthFromTrend(t);
      const monthKey = format(monthDate, 'yyyy-MM');
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { prices: [], regionalPrices: [] });
      }
      
      const monthData = monthlyData.get(monthKey)!;
      const price = t.avgPricePlatform || t.avgPriceRegional || 0;
      const regionalPrice = t.avgPriceRegional || 0;
      
      if (price > 0) {
        monthData.prices.push(price);
      }
      if (regionalPrice > 0) {
        monthData.regionalPrices.push(regionalPrice);
      }
    });

    // Convertir en tableau et trier par date
    const sortedMonths = Array.from(monthlyData.entries())
      .map(([key, data]) => ({
        monthKey: key,
        monthDate: parseISO(key + '-01'),
        avgPrice: data.prices.length > 0 
          ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
          : 0,
        avgRegionalPrice: data.regionalPrices.length > 0
          ? Math.round(data.regionalPrices.reduce((a, b) => a + b, 0) / data.regionalPrices.length)
          : 0,
      }))
      .sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime())
      .slice(-6); // Prendre les 6 derniers mois

    // Créer les labels (MMM yyyy)
    const labels = sortedMonths.map((m) => format(m.monthDate, 'MMM yyyy', { locale: fr }));

    // Créer les données de prix (plateforme)
    const platformData = sortedMonths.map((m) => m.avgPrice);

    // Créer les données de prix régional
    const regionalData = sortedMonths.map((m) => m.avgRegionalPrice);

    // Calculer min et max pour l'échelle
    const allPrices = [...platformData, ...regionalData].filter((p) => p > 0);
    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 500;
    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 2000;
    const range = maxPrice - minPrice;
    const padding = range * 0.1; // 10% de padding

    return {
      labels: labels, // Afficher tous les labels pour 6 mois
      datasets: [
        {
          data: platformData,
        },
      ],
      yAxisMin: Math.max(0, minPrice - padding),
      yAxisMax: maxPrice + padding,
    };
  }, [trends]);

  // Calculer le prix du mois en cours et du mois précédent
  const { currentMonthPrice, previousMonthPrice, monthPriceChange, monthPriceChangePercent } = useMemo(() => {
    if (trends.length === 0) {
      return { currentMonthPrice: undefined, previousMonthPrice: undefined, monthPriceChange: undefined, monthPriceChangePercent: undefined };
    }

    // Grouper par mois
    const monthlyData = new Map<string, number[]>();
    
    trends.forEach((t) => {
      const monthDate = getMonthFromTrend(t);
      const monthKey = format(monthDate, 'yyyy-MM');
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      
      const price = t.avgPricePlatform || t.avgPriceRegional || 0;
      if (price > 0) {
        monthlyData.get(monthKey)!.push(price);
      }
    });

    // Trier par date
    const sortedMonths = Array.from(monthlyData.entries())
      .map(([key, prices]) => ({
        monthKey: key,
        monthDate: parseISO(key + '-01'),
        avgPrice: prices.length > 0 
          ? prices.reduce((a, b) => a + b, 0) / prices.length
          : 0,
      }))
      .sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime())
      .filter(m => m.avgPrice > 0);

    if (sortedMonths.length === 0) {
      return { currentMonthPrice: undefined, previousMonthPrice: undefined, monthPriceChange: undefined, monthPriceChangePercent: undefined };
    }

    const currentMonth = sortedMonths[sortedMonths.length - 1];
    const previousMonth = sortedMonths.length > 1 ? sortedMonths[sortedMonths.length - 2] : undefined;

    const currentPrice = currentMonth.avgPrice;
    const previousPrice = previousMonth?.avgPrice;
    const change = previousPrice ? currentPrice - previousPrice : undefined;
    const changePercent = previousPrice ? (change! / previousPrice) * 100 : undefined;

    return {
      currentMonthPrice: currentPrice,
      previousMonthPrice: previousPrice,
      monthPriceChange: change,
      monthPriceChangePercent: changePercent,
    };
  }, [trends]);

  // Formatage du sous-titre avec variation
  const subtitle = useMemo(() => {
    if (!currentMonthPrice) return 'Mois en cours : Calcul en cours...';
    
    const priceFormatted = Math.round(currentMonthPrice).toLocaleString('fr-FR');
    let changeText = '';
    let changeColor = colors.textSecondary;

    if (monthPriceChange !== undefined && monthPriceChangePercent !== undefined && previousMonthPrice) {
      const changeFormatted = Math.abs(monthPriceChangePercent).toFixed(1);
      const arrow = monthPriceChange >= 0 ? '↑' : '↓';
      changeText = ` (${arrow} ${changeFormatted}% vs M-1)`;
      changeColor = monthPriceChange >= 0 ? colors.success : colors.error;
    }

    return `Mois en cours : ${priceFormatted} FCFA/kg${changeText}`;
  }, [currentMonthPrice, monthPriceChange, monthPriceChangePercent, previousMonthPrice, colors]);

  if (loading) {
    return (
      <Card style={[styles.card, style, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Tendance du prix du porc poids vif (FCFA/kg)</Text>
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
          <Text style={[styles.title, { color: colors.text }]}>Tendance du prix du porc poids vif (FCFA/kg)</Text>
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
          <Text style={[styles.title, { color: colors.text }]}>Tendance du prix du porc poids vif (FCFA/kg)</Text>
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
          <Text style={[styles.title, { color: colors.text }]}>Tendance du prix du porc poids vif (FCFA/kg)</Text>
          {lastUpdated && (
            <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
              Mis à jour {format(new Date(lastUpdated), 'HH:mm', { locale: fr })}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.subtitleContainer}>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          {subtitle.split('(')[0]}
          {priceChange !== undefined && priceChangePercent !== undefined && (
            <Text style={{ color: priceChange >= 0 ? colors.success : colors.error }}>
              {subtitle.split('(')[1] ? `(${subtitle.split('(')[1]}` : ''}
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
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Prix moyen (FCFA/kg)</Text>
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
  subtitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
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

