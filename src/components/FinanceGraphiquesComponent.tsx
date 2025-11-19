/**
 * Composant graphiques financiers
 */

import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Animated, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadProductionAnimaux, loadPeseesParAnimal } from '../store/slices/productionSlice';
import { loadRevenus } from '../store/slices/financeSlice';
import { selectAllAnimaux, selectPeseesParAnimal } from '../store/selectors/productionSelectors';
import { selectAllChargesFixes, selectAllDepensesPonctuelles, selectAllRevenus } from '../store/selectors/financeSelectors';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import PriceConfigCard from './finance/PriceConfigCard';
import LivestockStatsCard from './finance/LivestockStatsCard';
import ProjectedRevenueCard from './finance/ProjectedRevenueCard';
import ComparisonCard from './finance/ComparisonCard';
import { exportFinancePDF } from '../services/pdf/financePDF';

const screenWidth = Dimensions.get('window').width;

export default function FinanceGraphiquesComponent() {
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [exportingPDF, setExportingPDF] = useState(false);
  const chargesFixes = useAppSelector(selectAllChargesFixes);
  const depensesPonctuelles = useAppSelector(selectAllDepensesPonctuelles);
  const revenus = useAppSelector(selectAllRevenus);
  const financeLoading = useAppSelector((state) => state.finance.loading);
  const { projetActif } = useAppSelector((state) => state.projet);
  const animaux = useAppSelector(selectAllAnimaux);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  
  // Charger les données nécessaires
  useEffect(() => {
    if (projetActif) {
      dispatch(loadRevenus(projetActif.id));
      dispatch(loadProductionAnimaux({ projetId: projetActif.id }));
    }
  }, [dispatch, projetActif?.id]);

  // Animation fade-in au chargement
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ✅ Mémoïser les IDs des animaux pour éviter les re-renders inutiles
  const animauxIds = React.useMemo(() => 
    animaux.map(a => a.id).sort().join(','), 
    [animaux]
  );

  // ✅ Utiliser useRef pour tracker les pesées déjà chargées
  const peseesChargeesRef = React.useRef<Set<string>>(new Set());

  // Charger les pesées pour tous les animaux actifs
  useEffect(() => {
    if (!projetActif) return;
    
    const animauxActifs = animaux.filter(
      (a) => a.projet_id === projetActif.id && a.statut?.toLowerCase() === 'actif'
    );
    
    // Ne charger que les pesées qui n'ont pas encore été chargées
    animauxActifs.forEach((animal) => {
      if (!peseesChargeesRef.current.has(animal.id)) {
        peseesChargeesRef.current.add(animal.id);
        dispatch(loadPeseesParAnimal(animal.id));
      }
    });
  }, [dispatch, projetActif?.id, animauxIds, animaux]);

  // Callback pour mettre à jour après modification des prix
  const handlePriceUpdate = React.useCallback(() => {
    // Les composants enfants se mettront à jour automatiquement via les sélecteurs Redux
  }, []);

  // Fonction pour exporter les finances en PDF
  const handleExportPDF = useCallback(async () => {
    if (!projetActif) return;
    
    setExportingPDF(true);
    try {
      // Calculer les totaux
      const totalCharges = chargesFixes.reduce((sum, c) => sum + c.montant, 0);
      const totalDepenses = depensesPonctuelles.reduce((sum, d) => sum + d.montant, 0);
      const totalRevenus = revenus.reduce((sum, r) => sum + r.montant, 0);
      const solde = totalRevenus - (totalCharges + totalDepenses);
      
      // Calculer les moyennes mensuelles (basé sur les 6 derniers mois)
      const nombreMois = 6;
      const depensesMensuelle = (totalCharges + totalDepenses) / nombreMois;
      const revenusMensuel = totalRevenus / nombreMois;
      
      // Préparer les données pour le PDF
      const financeData = {
        projet: projetActif,
        chargesFixes: chargesFixes,
        depensesPonctuelles: depensesPonctuelles,
        revenus: revenus,
        totaux: {
          chargesFixes: totalCharges,
          depensesPonctuelles: totalDepenses,
          totalDepenses: totalCharges + totalDepenses,
          totalRevenus: totalRevenus,
          solde: solde,
        },
        moyennes: {
          depensesMensuelle: depensesMensuelle,
          revenusMensuel: revenusMensuel,
        },
      };
      
      // Générer et partager le PDF
      await exportFinancePDF(financeData);
      
      Alert.alert(
        'PDF généré avec succès',
        'Le rapport financier a été généré et est prêt à être partagé.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      Alert.alert(
        'Erreur',
        'Impossible de générer le PDF. Vérifiez vos données et réessayez.',
        [{ text: 'OK' }]
      );
    } finally {
      setExportingPDF(false);
    }
  }, [projetActif, chargesFixes, depensesPonctuelles, revenus]);



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
    const previousMonth = monthsData[monthsData.length - 2] || { revenus: 0, reel: 0 };
    const budgetMois = currentMonth.planifie;
    const depensesReelles = currentMonth.reel;
    const revenusMois = currentMonth.revenus;
    const ecart = budgetMois - depensesReelles;
    const solde = revenusMois - depensesReelles;
    const depensesTotal = depensesPonctuelles.reduce((sum, dp) => sum + dp.montant, 0);
    const revenusTotal = revenus.reduce((sum, r) => sum + r.montant, 0);
    const soldeTotal = revenusTotal - depensesTotal;

    // Calculer les tendances (comparaison avec le mois précédent)
    const revenusTrend = previousMonth.revenus > 0 
      ? ((revenusMois - previousMonth.revenus) / previousMonth.revenus) * 100 
      : null;
    const depensesTrend = previousMonth.reel > 0 
      ? ((depensesReelles - previousMonth.reel) / previousMonth.reel) * 100 
      : null;
    const soldePrecedent = previousMonth.revenus - previousMonth.reel;
    const soldeTrend = soldePrecedent !== 0 
      ? ((solde - soldePrecedent) / Math.abs(soldePrecedent)) * 100 
      : null;

    // Calculer le taux d'épargne avec protection contre les erreurs de précision
    const tauxEpargne = revenusMois > 0 
      ? Math.round(((revenusMois - depensesReelles) / revenusMois) * 100 * 100) / 100 // Arrondir à 2 décimales puis multiplier par 100 pour le pourcentage
      : 0;

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
      revenusTrend,
      depensesTrend,
      soldeTrend,
      tauxEpargne: Math.max(0, Math.min(100, tauxEpargne)), // S'assurer que le taux est entre 0 et 100
      currentMonthName: format(now, 'MMMM yyyy', { locale: fr }),
    };
  }, [chargesFixes, depensesPonctuelles, revenus]);

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

  const formatAmountParts = (amount: number) => {
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return { number: formatted, currency: 'F' };
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Vue d'ensemble financière</Text>

        {/* Carte financière unique */}
        <Animated.View 
          style={[
            styles.financialCard, 
            { 
              backgroundColor: colors.surface,
              opacity: fadeAnim,
            }
          ]}
          accessible={true}
          accessibilityLabel={`Aperçu financier pour ${graphData.currentMonthName}`}
          accessibilityRole="summary"
        >
          {/* Header */}
          <View style={styles.financialCardHeader}>
            <Text style={[styles.financialCardTitle, { color: colors.text }]}>
              💰 Aperçu Financier
            </Text>
            <Text style={[styles.financialCardSubtitle, { color: colors.textSecondary }]}>
              {graphData.currentMonthName}
            </Text>
          </View>

          {/* 3 colonnes */}
          <View style={styles.columnsContainer}>
            {/* Revenus */}
            <View 
              style={styles.column}
              accessible={true}
              accessibilityLabel={`Revenus: ${formatAmount(graphData.revenusMois)}${graphData.revenusTrend !== null ? `, ${graphData.revenusTrend >= 0 ? 'augmentation' : 'diminution'} de ${Math.abs(graphData.revenusTrend).toFixed(1)}%` : ''}`}
              accessibilityRole="text"
            >
              <Text style={styles.columnIcon}>💰</Text>
              <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>Revenus</Text>
              <View style={styles.amountContainer}>
                <Text style={[styles.columnAmount, { color: colors.success || '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatAmountParts(graphData.revenusMois).number}
                </Text>
                <Text style={[styles.columnCurrency, { color: colors.success || '#10B981' }]}>
                  {formatAmountParts(graphData.revenusMois).currency}
                </Text>
              </View>
              {graphData.revenusTrend !== null && (
                <Text style={[
                  styles.columnTrend,
                  { 
                    color: graphData.revenusTrend >= 0 
                      ? colors.success || '#10B981' 
                      : colors.error || '#EF4444' 
                  }
                ]}>
                  {graphData.revenusTrend >= 0 ? '↗' : '↘'} {Math.abs(graphData.revenusTrend).toFixed(1)}%
                </Text>
              )}
            </View>

            {/* Séparateur vertical */}
            <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

            {/* Dépenses */}
            <View 
              style={styles.column}
              accessible={true}
              accessibilityLabel={`Dépenses: ${formatAmount(graphData.depensesReelles)}${graphData.depensesTrend !== null ? `, ${graphData.depensesTrend >= 0 ? 'augmentation' : 'diminution'} de ${Math.abs(graphData.depensesTrend).toFixed(1)}%` : ''}`}
              accessibilityRole="text"
            >
              <Text style={styles.columnIcon}>💸</Text>
              <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>Dépenses</Text>
              <View style={styles.amountContainer}>
                <Text style={[styles.columnAmount, { color: colors.warning || '#F59E0B' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatAmountParts(graphData.depensesReelles).number}
                </Text>
                <Text style={[styles.columnCurrency, { color: colors.warning || '#F59E0B' }]}>
                  {formatAmountParts(graphData.depensesReelles).currency}
                </Text>
              </View>
              {graphData.depensesTrend !== null && (
                <Text style={[
                  styles.columnTrend,
                  { 
                    color: graphData.depensesTrend >= 0 
                      ? colors.error || '#EF4444' 
                      : colors.success || '#10B981' 
                  }
                ]}>
                  {graphData.depensesTrend >= 0 ? '↗' : '↘'} {Math.abs(graphData.depensesTrend).toFixed(1)}%
                </Text>
              )}
            </View>

            {/* Séparateur vertical */}
            <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

            {/* Solde */}
            <View 
              style={styles.column}
              accessible={true}
              accessibilityLabel={`Solde: ${formatAmount(graphData.solde)}, ${graphData.solde >= 0 ? 'positif' : 'négatif'}`}
              accessibilityRole="text"
            >
              <Text style={styles.columnIcon}>💳</Text>
              <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>Solde</Text>
              <View style={styles.amountContainer}>
                <Text style={[
                  styles.columnAmount,
                  { 
                    color: graphData.solde >= 0 
                      ? colors.primary || '#3B82F6' 
                      : colors.error || '#EF4444' 
                  }
                ]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatAmountParts(graphData.solde).number}
                </Text>
                <Text style={[
                  styles.columnCurrency,
                  { 
                    color: graphData.solde >= 0 
                      ? colors.primary || '#3B82F6' 
                      : colors.error || '#EF4444' 
                  }
                ]}>
                  {formatAmountParts(graphData.solde).currency}
                </Text>
              </View>
              <Text style={[
                styles.columnStatus,
                { 
                  color: graphData.solde >= 0 
                    ? colors.success || '#10B981' 
                    : colors.error || '#EF4444' 
                }
              ]}>
                {graphData.solde >= 0 ? 'Positif' : 'Négatif'}
              </Text>
            </View>
          </View>

          {/* Recommandation */}
          {(() => {
            const pourcentageDepenses = graphData.revenusMois > 0 
              ? (graphData.depensesReelles / graphData.revenusMois) * 100 
              : 0;
            
            let recommandation = '';
            let icon = '';
            let color = colors.primary;

            if (graphData.solde < 0) {
              icon = '⚠️';
              color = colors.error;
              recommandation = "Attention : Vos dépenses dépassent vos revenus. Réduisez les dépenses ou augmentez vos revenus.";
            } else if (graphData.solde === 0) {
              icon = '⚖️';
              color = colors.warning;
              recommandation = "Équilibre atteint, mais sans marge de sécurité. Essayez de générer plus de revenus.";
            } else if (pourcentageDepenses > 80) {
              icon = '💡';
              color = colors.warning;
              recommandation = "Solde positif mais dépenses élevées (>80%). Surveillez vos coûts.";
            } else if (pourcentageDepenses > 60) {
              icon = '👍';
              color = colors.success;
              recommandation = "Bonne gestion ! Continuez à optimiser vos dépenses.";
            } else {
              icon = '🎉';
              color = colors.success;
              recommandation = "Excellente santé financière ! Envisagez d'investir dans votre croissance.";
            }

            return (
              <>
                <View style={[styles.horizontalDivider, { backgroundColor: colors.border }]} />
                <View style={[styles.recommendationContainer, { backgroundColor: color + '10', borderColor: color + '30' }]}>
                  <Text style={styles.recommendationIcon}>{icon}</Text>
                  <Text style={[styles.recommendationText, { color: color }]}>
                    {recommandation}
                  </Text>
                </View>
              </>
            );
          })()}
        </Animated.View>

        {/* Configuration des prix de vente */}
        <PriceConfigCard onPriceUpdate={handlePriceUpdate} />

        {/* Statistiques du cheptel actif */}
        <LivestockStatsCard />

        {/* Revenus prévisionnels */}
        <View style={styles.previsionnelsContainer}>
          <ProjectedRevenueCard type="vif" />
          <ProjectedRevenueCard type="carcasse" />
        </View>

        {/* Comparaison des options et recommandations */}
        <ComparisonCard />

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
    paddingBottom: 100, // Espace pour la barre de navigation
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg + 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    flex: 1,
  },
  exportButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  financialCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  financialCardHeader: {
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  financialCardTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  financialCardSubtitle: {
    fontSize: FONT_SIZES.md,
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  columnIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs / 2,
  },
  columnLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xs / 2,
  },
  columnAmount: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  columnCurrency: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  columnTrend: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: SPACING.xs / 2,
  },
  columnStatus: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: SPACING.xs / 2,
  },
  verticalDivider: {
    width: 1,
    marginHorizontal: SPACING.sm,
    alignSelf: 'stretch',
  },
  horizontalDivider: {
    height: 1,
    marginVertical: SPACING.sm,
    marginHorizontal: -SPACING.md,
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  recommendationIcon: {
    fontSize: 20,
  },
  recommendationText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    lineHeight: 18,
  },
  savingsRateContainer: {
    marginTop: SPACING.md,
  },
  savingsRateHeader: {
    marginBottom: SPACING.sm,
  },
  savingsRateLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: SPACING.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
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
  configCard: {
    marginBottom: SPACING.xl,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  configTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  editButton: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  configForm: {
    marginTop: SPACING.sm,
  },
  configButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  configButton: {
    flex: 1,
    maxWidth: 150,
  },
  configDisplay: {
    marginTop: SPACING.sm,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  configLabel: {
    fontSize: FONT_SIZES.md,
  },
  configValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  statsCard: {
    marginBottom: SPACING.xl,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  previsionnelsContainer: {
    marginBottom: SPACING.xl,
  },
  previsionnelCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  previsionnelHeader: {
    marginBottom: SPACING.md,
  },
  previsionnelLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  previsionnelContent: {
    marginTop: SPACING.sm,
  },
  previsionnelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  previsionnelRowHighlight: {
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  previsionnelText: {
    fontSize: FONT_SIZES.md,
  },
  previsionnelValue: {
    fontSize: FONT_SIZES.md,
  },
  progressContainer: {
    marginVertical: SPACING.md,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'right',
  },
  comparisonCard: {
    marginBottom: SPACING.xl,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  comparisonContent: {
    marginTop: SPACING.sm,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  comparisonLabel: {
    fontSize: FONT_SIZES.md,
  },
  comparisonValue: {
    fontSize: FONT_SIZES.md,
  },
  recommendationBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
  },
  recommendationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  recommendationText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
  },
});

