/**
 * Composant Graphique avec Courbes Superposées pour Tous les Sujets
 * Affiche l'évolution du poids de tous les animaux (mode individuel) ou bandes (mode bande)
 * avec une courbe par sujet superposée
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import Card from '../Card';
import { usePoidsEvolution, PoidsEvolution } from '../../hooks/pesees/usePoidsEvolution';
import { useModeElevage } from '../../hooks/useModeElevage';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AllSubjectsChartProps {
  projetId: string | undefined;
  periode?: '7j' | '30j' | '90j' | 'tout';
  sujetIds?: string[]; // Optionnel : pour filtrer certains sujets
  maxSubjects?: number; // Nombre maximum de sujets à afficher (par défaut: 10)
  showLegend?: boolean; // Afficher la légende (par défaut: true)
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2; // Card padding + margins

// Couleurs pour les différentes courbes (max 10 couleurs)
const CHART_COLORS = [
  '#3B82F6', // Bleu
  '#EF4444', // Rouge
  '#10B981', // Vert
  '#F59E0B', // Orange
  '#8B5CF6', // Violet
  '#EC4899', // Rose
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange foncé
  '#6366F1', // Indigo
];

export default function AllSubjectsChart({
  projetId,
  periode = '30j',
  sujetIds,
  maxSubjects = 10,
  showLegend = true,
}: AllSubjectsChartProps) {
  const { colors } = useTheme();
  const mode = useModeElevage();

  const { data: evolutionData, loading, error } = usePoidsEvolution({
    projetId,
    mode,
    periode,
    sujetIds,
    enabled: !!projetId,
  });

  // Préparer les données du graphique avec toutes les courbes
  const chartData = useMemo(() => {
    if (!evolutionData || !evolutionData.dates || evolutionData.dates.length === 0) {
      return null;
    }

    const { dates, par_sujet } = evolutionData;

    // Si pas de données par sujet, on ne peut pas afficher de courbes superposées
    if (!par_sujet || Object.keys(par_sujet).length === 0) {
      return null;
    }

    // Limiter le nombre de sujets
    const sujetEntries = Object.entries(par_sujet).slice(0, maxSubjects);
    
    if (sujetEntries.length === 0) {
      return null;
    }

    // Formater les dates pour l'affichage
    const formattedDates = dates.map((dateStr) => {
      try {
        const date = parseISO(dateStr);
        if (periode === '7j') {
          return format(date, 'dd/MM', { locale: fr });
        } else if (periode === '30j') {
          return format(date, 'dd/MM', { locale: fr });
        } else if (periode === '90j') {
          return format(date, 'dd MMM', { locale: fr });
        } else {
          return format(date, 'MMM yyyy', { locale: fr });
        }
      } catch {
        return dateStr;
      }
    });

    // Limiter le nombre de dates pour la lisibilité
    const maxPoints = periode === '7j' ? 7 : periode === '30j' ? 10 : periode === '90j' ? 15 : 20;
    const step = Math.ceil(formattedDates.length / maxPoints);
    const filteredDates = formattedDates.filter((_, index) => index % step === 0 || index === formattedDates.length - 1);
    const filteredIndices = dates.map((_, index) => index).filter((_, index) => index % step === 0 || index === dates.length - 1);

    // Préparer les datasets pour chaque sujet
    const datasets = sujetEntries.map(([sujetId, sujetData], index) => {
      const color = CHART_COLORS[index % CHART_COLORS.length];
      const poids = filteredIndices.map((originalIndex) => {
        const poidsAtIndex = sujetData.poids[originalIndex];
        return typeof poidsAtIndex === 'number' && !isNaN(poidsAtIndex) && poidsAtIndex > 0 ? poidsAtIndex : 0;
      });

      return {
        data: poids,
        color: (opacity = 1) => color,
        strokeWidth: 2,
      };
    });

    // Calculer min et max pour l'échelle
    const allWeights = sujetEntries.flatMap(([, sujetData]) => 
      sujetData.poids.filter((w) => typeof w === 'number' && !isNaN(w) && w > 0)
    );
    
    if (allWeights.length === 0) {
      return null;
    }

    const minWeight = Math.min(...allWeights);
    const maxWeight = Math.max(...allWeights);
    const padding = (maxWeight - minWeight) * 0.1 || 1;

    return {
      labels: filteredDates,
      datasets,
      sujetNames: sujetEntries.map(([, sujetData]) => sujetData.nom),
      sujetColors: sujetEntries.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
      minWeight: Math.max(0, minWeight - padding),
      maxWeight: maxWeight + padding,
    };
  }, [evolutionData, periode, maxSubjects]);

  if (loading) {
    return (
      <Card elevation="medium" padding="large" style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={32} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des données...
          </Text>
        </View>
      </Card>
    );
  }

  if (error || !chartData) {
    return (
      <Card elevation="medium" padding="large" style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || 'Aucune donnée disponible'}
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
            {evolutionData?.par_sujet && Object.keys(evolutionData.par_sujet).length === 0
              ? 'Aucun sujet avec des pesées dans cette période'
              : 'Ajoutez des pesées pour voir l\'évolution'}
          </Text>
        </View>
      </Card>
    );
  }

  // Configuration du graphique
  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(${hexToRgb(colors.primary)}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${hexToRgb(colors.text)}, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '3',
      strokeWidth: '1',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
      strokeWidth: 1,
    },
  };

  // Si trop de sujets, afficher un avertissement
  const totalSubjects = evolutionData?.par_sujet ? Object.keys(evolutionData.par_sujet).length : 0;
  const showingAll = totalSubjects <= maxSubjects;

  return (
    <Card elevation="medium" padding="large" style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Ionicons name="analytics" size={24} color={colors.primary} />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            📊 Évolution de Tous les Sujets
          </Text>
          {!showingAll && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Affichage de {maxSubjects} sur {totalSubjects} sujets
            </Text>
          )}
        </View>
      </View>

      {/* Graphique */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScrollView}>
        <LineChart
          data={chartData}
          width={Math.max(CHART_WIDTH, chartData.labels.length * 60)}
          height={280}
          yAxisLabel=""
          yAxisSuffix=" kg"
          yAxisInterval={1}
          fromZero={false}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLabels={true}
          segments={4}
        />
      </ScrollView>

      {/* Légende */}
      {showLegend && chartData.sujetNames.length > 0 && (
        <View style={styles.legendContainer}>
          <Text style={[styles.legendTitle, { color: colors.textSecondary }]}>Légende :</Text>
          <View style={styles.legendGrid}>
            {chartData.sujetNames.map((nom, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: chartData.sujetColors[index] }]} />
                <Text style={[styles.legendText, { color: colors.text }]} numberOfLines={1}>
                  {nom}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

// Fonction helper pour convertir hex en RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return '0, 0, 0'; // Par défaut noir
  }
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `${r}, ${g}, ${b}`;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs / 2,
  },
  chartScrollView: {
    marginHorizontal: -SPACING.md,
  },
  chart: {
    marginVertical: SPACING.sm,
    borderRadius: 16,
  },
  legendContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  legendTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minWidth: '30%',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
});

