/**
 * Carte affichant la tendance du prix du porc poids vif (FCFA/kg)
 * Graphique sur 26 semaines + semaine en cours
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
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

  // Préparer les données pour le graphique
  const chartData = useMemo(() => {
    if (trends.length === 0) return null;

    // Prendre les 26 dernières semaines + semaine en cours
    const displayTrends = trends.slice(-27);

    // Créer les labels (S30, S31, etc.)
    const labels = displayTrends.map((t) => {
      const weekLabel = `S${t.weekNumber.toString().padStart(2, '0')}`;
      return weekLabel;
    });

    // Créer les données de prix (plateforme)
    const platformData = displayTrends.map((t) => t.avgPricePlatform || t.avgPriceRegional || 0);

    // Créer les données de prix régional (ligne pointillée)
    const regionalData = displayTrends.map((t) => t.avgPriceRegional || 0);

    // Calculer min et max pour l'échelle
    const allPrices = [...platformData, ...regionalData].filter((p) => p > 0);
    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 500;
    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 2000;
    const range = maxPrice - minPrice;
    const padding = range * 0.1; // 10% de padding

    return {
      labels: labels.length > 10 ? labels.filter((_, i) => i % 2 === 0 || i === labels.length - 1) : labels,
      datasets: [
        {
          data: platformData,
        },
      ],
      yAxisMin: Math.max(0, minPrice - padding),
      yAxisMax: maxPrice + padding,
    };
  }, [trends]);

  // Formatage du sous-titre avec variation
  const subtitle = useMemo(() => {
    if (!currentWeekPrice) return 'Semaine en cours : Calcul en cours...';
    
    const priceFormatted = currentWeekPrice.toLocaleString('fr-FR');
    let changeText = '';
    let changeColor = colors.textSecondary;

    if (priceChange !== undefined && priceChangePercent !== undefined && previousWeekPrice) {
      const changeFormatted = Math.abs(priceChangePercent).toFixed(1);
      const arrow = priceChange >= 0 ? '↑' : '↓';
      changeText = ` (${arrow} ${changeFormatted}% vs S-1)`;
      changeColor = priceChange >= 0 ? colors.success : colors.error;
    }

    return `Semaine en cours : ${priceFormatted} FCFA/kg${changeText}`;
  }, [currentWeekPrice, priceChange, priceChangePercent, previousWeekPrice, colors]);

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

