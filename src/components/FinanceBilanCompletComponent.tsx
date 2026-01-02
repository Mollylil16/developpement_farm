/**
 * Composant Bilan Financier Complet
 * Affiche un bilan financier complet et bancable avec toutes les sections
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import { selectProjetActif } from '../store/selectors/projetSelectors';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { logger } from '../utils/logger';
import Card from './Card';
import apiClient from '../services/api/apiClient';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { exportBilanCompletPDF } from '../services/pdf/bilanCompletPDF';
import { exportBilanCompletExcel } from '../services/excel/bilanCompletExcel';

const screenWidth = Dimensions.get('window').width;

interface BilanCompletData {
  periode: {
    date_debut: string;
    date_fin: string;
    nombre_mois: number;
  };
  revenus: {
    total: number;
    par_categorie: Record<string, number>;
    nombre_transactions: number;
  };
  depenses: {
    opex_total: number;
    charges_fixes_total: number;
    total: number;
    par_categorie: Record<string, number>;
    nombre_transactions: number;
  };
  dettes: {
    total: number;
    nombre: number;
    interets_mensuels: number;
    liste: Array<{
      id: string;
      libelle: string;
      montant_restant: number;
      date_echeance: string | null;
      taux_interet: number;
    }>;
  };
  actifs: {
    valeur_cheptel: number;
    valeur_stocks: number;
    total: number;
    nombre_animaux: number;
    poids_moyen_cheptel: number;
  };
  resultats: {
    solde: number;
    marge_brute: number;
    cash_flow: number;
  };
  indicateurs: {
    taux_endettement: number;
    ratio_rentabilite: number;
    cout_kg_opex: number;
    total_kg_vendus: number;
    total_kg_vendus_estime?: boolean;
  };
}

type PeriodeType = 'mois_actuel' | 'mois_precedent' | 'trimestre' | 'annee' | 'personnalise';

export default function FinanceBilanCompletComponent() {
  const { colors } = useTheme();
  const projetActif = useAppSelector(selectProjetActif);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bilanData, setBilanData] = useState<BilanCompletData | null>(null);
  const [periodeType, setPeriodeType] = useState<PeriodeType>('mois_actuel');
  const [dateDebut, setDateDebut] = useState<string | undefined>(undefined);
  const [dateFin, setDateFin] = useState<string | undefined>(undefined);

  // Calculer les dates selon le type de période
  const getPeriodeDates = useCallback((type: PeriodeType) => {
    const maintenant = new Date();
    let debut: Date;
    let fin: Date = maintenant;

    switch (type) {
      case 'mois_actuel':
        debut = startOfMonth(maintenant);
        fin = endOfMonth(maintenant);
        break;
      case 'mois_precedent':
        const moisPrecedent = subMonths(maintenant, 1);
        debut = startOfMonth(moisPrecedent);
        fin = endOfMonth(moisPrecedent);
        break;
      case 'trimestre':
        debut = new Date(maintenant.getFullYear(), maintenant.getMonth() - 2, 1);
        fin = endOfMonth(maintenant);
        break;
      case 'annee':
        debut = new Date(maintenant.getFullYear(), 0, 1);
        fin = endOfMonth(maintenant);
        break;
      case 'personnalise':
        return { debut: dateDebut, fin: dateFin };
      default:
        debut = startOfMonth(maintenant);
        fin = endOfMonth(maintenant);
    }

    return {
      debut: debut.toISOString(),
      fin: fin.toISOString(),
    };
  }, [dateDebut, dateFin]);

  // Charger le bilan
  const loadBilan = useCallback(async () => {
    if (!projetActif?.id) return;

    try {
      const { debut, fin } = getPeriodeDates(periodeType);
      if (!debut || !fin) {
        Alert.alert('Erreur', 'Veuillez sélectionner une période valide');
        return;
      }

      const data = await apiClient.get<BilanCompletData>('/finance/bilan-complet', {
        params: {
          projet_id: projetActif.id,
          date_debut: debut,
          date_fin: fin,
        },
      });

      setBilanData(data);
    } catch (error) {
      logger.error('Erreur lors du chargement du bilan:', error);
      Alert.alert('Erreur', 'Impossible de charger le bilan financier');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projetActif?.id, periodeType, getPeriodeDates]);

  useEffect(() => {
    if (projetActif?.id) {
      setLoading(true);
      loadBilan();
    }
  }, [projetActif?.id, periodeType, dateDebut, dateFin]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBilan();
  }, [loadBilan]);

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  const formatPourcentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Graphique des revenus par catégorie (format PieChart: tableau d'objets)
  const revenusChartData = useMemo(() => {
    if (!bilanData || Object.keys(bilanData.revenus.par_categorie).length === 0) {
      return null;
    }

    const categories = Object.entries(bilanData.revenus.par_categorie);
    const chartColors = ['#1565C0', '#1976D2', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB'];
    
    return categories.map(([cat, montant], index) => ({
      name: cat.length > 10 ? cat.substring(0, 10) + '...' : cat,
      data: montant,
      color: chartColors[index % chartColors.length],
      legendFontColor: '#333',
      legendFontSize: 11,
    }));
  }, [bilanData]);

  // Graphique des dépenses par catégorie (format PieChart: tableau d'objets)
  const depensesChartData = useMemo(() => {
    if (!bilanData || Object.keys(bilanData.depenses.par_categorie).length === 0) {
      return null;
    }

    const categories = Object.entries(bilanData.depenses.par_categorie);
    const chartColors = ['#D32F2F', '#F44336', '#E57373', '#EF5350', '#E91E63', '#F06292'];
    
    return categories.map(([cat, montant], index) => ({
      name: cat.length > 10 ? cat.substring(0, 10) + '...' : cat,
      data: montant,
      color: chartColors[index % chartColors.length],
      legendFontColor: '#333',
      legendFontSize: 11,
    }));
  }, [bilanData]);

  if (loading && !bilanData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement du bilan financier...
        </Text>
      </View>
    );
  }

  if (!bilanData) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Aucune donnée disponible
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* En-tête avec sélection de période */}
      <Card style={styles.headerCard}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="calculator" size={28} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bilan Financier Complet</Text>
        </View>

        {/* Sélecteur de période */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              periodeType === 'mois_actuel' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setPeriodeType('mois_actuel')}
          >
            <Text
              style={[
                styles.periodButtonText,
                periodeType === 'mois_actuel' && { color: '#fff' },
                { color: colors.text },
              ]}
            >
              Mois actuel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              periodeType === 'mois_precedent' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setPeriodeType('mois_precedent')}
          >
            <Text
              style={[
                styles.periodButtonText,
                periodeType === 'mois_precedent' && { color: '#fff' },
                { color: colors.text },
              ]}
            >
              Mois précédent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              periodeType === 'trimestre' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setPeriodeType('trimestre')}
          >
            <Text
              style={[
                styles.periodButtonText,
                periodeType === 'trimestre' && { color: '#fff' },
                { color: colors.text },
              ]}
            >
              Trimestre
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              periodeType === 'annee' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setPeriodeType('annee')}
          >
            <Text
              style={[
                styles.periodButtonText,
                periodeType === 'annee' && { color: '#fff' },
                { color: colors.text },
              ]}
            >
              Année
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.periodInfo, { color: colors.textSecondary }]}>
          {format(parseISO(bilanData.periode.date_debut), 'dd MMM yyyy', { locale: fr })} -{' '}
          {format(parseISO(bilanData.periode.date_fin), 'dd MMM yyyy', { locale: fr })} ({bilanData.periode.nombre_mois} mois)
        </Text>
      </Card>

      {/* Résultats principaux */}
      <Card style={styles.resultsCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Résultats Financiers</Text>
        <View style={styles.resultsGrid}>
          <View style={[styles.resultBox, { backgroundColor: colors.success + '15' }]}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Solde Net</Text>
            <Text
              style={[
                styles.resultValue,
                { color: bilanData.resultats.solde >= 0 ? colors.success : colors.error },
              ]}
            >
              {formatMontant(bilanData.resultats.solde)} FCFA
            </Text>
          </View>
          <View style={[styles.resultBox, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Marge Brute</Text>
            <Text style={[styles.resultValue, { color: colors.primary }]}>
              {formatMontant(bilanData.resultats.marge_brute)} FCFA
            </Text>
          </View>
          <View style={[styles.resultBox, { backgroundColor: colors.info + '15' }]}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Cash Flow</Text>
            <Text
              style={[
                styles.resultValue,
                { color: bilanData.resultats.cash_flow >= 0 ? colors.info : colors.error },
              ]}
            >
              {formatMontant(bilanData.resultats.cash_flow)} FCFA
            </Text>
          </View>
        </View>
      </Card>

      {/* Revenus */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={24} color={colors.success} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Revenus</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Revenus</Text>
          <Text style={[styles.totalValue, { color: colors.success }]}>
            {formatMontant(bilanData.revenus.total)} FCFA
          </Text>
          <Text style={[styles.totalSubtext, { color: colors.textSecondary }]}>
            {bilanData.revenus.nombre_transactions} transaction(s)
          </Text>
        </View>

        {revenusChartData && (
          <View style={styles.chartContainer}>
            <PieChart
              data={revenusChartData}
              width={screenWidth - SPACING.md * 4}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(21, 101, 192, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
              }}
              accessor="data"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {Object.keys(bilanData.revenus.par_categorie).length > 0 && (
          <View style={styles.categoryList}>
            {Object.entries(bilanData.revenus.par_categorie).map(([categorie, montant]) => (
              <View key={categorie} style={[styles.categoryItem, { borderColor: colors.border }]}>
                <Text style={[styles.categoryLabel, { color: colors.text }]}>{categorie}</Text>
                <Text style={[styles.categoryValue, { color: colors.success }]}>
                  {formatMontant(montant)} FCFA
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Dépenses */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-down" size={24} color={colors.error} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dépenses</Text>
        </View>
        <View style={styles.expensesBreakdown}>
          <View style={[styles.expenseBox, { backgroundColor: colors.error + '15' }]}>
            <Text style={[styles.expenseLabel, { color: colors.textSecondary }]}>OPEX</Text>
            <Text style={[styles.expenseValue, { color: colors.error }]}>
              {formatMontant(bilanData.depenses.opex_total)} FCFA
            </Text>
          </View>
          <View style={[styles.expenseBox, { backgroundColor: colors.warning + '15' }]}>
            <Text style={[styles.expenseLabel, { color: colors.textSecondary }]}>Charges Fixes</Text>
            <Text style={[styles.expenseValue, { color: colors.warning }]}>
              {formatMontant(bilanData.depenses.charges_fixes_total)} FCFA
            </Text>
          </View>
          <View style={[styles.expenseBox, { backgroundColor: colors.error + '20' }]}>
            <Text style={[styles.expenseLabel, { color: colors.textSecondary }]}>Total</Text>
            <Text style={[styles.expenseValue, { color: colors.error }]}>
              {formatMontant(bilanData.depenses.total)} FCFA
            </Text>
          </View>
        </View>

        {depensesChartData && (
          <View style={styles.chartContainer}>
            <PieChart
              data={depensesChartData}
              width={screenWidth - SPACING.md * 4}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(211, 47, 47, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
              }}
              accessor="data"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {Object.keys(bilanData.depenses.par_categorie).length > 0 && (
          <View style={styles.categoryList}>
            {Object.entries(bilanData.depenses.par_categorie).map(([categorie, montant]) => (
              <View key={categorie} style={[styles.categoryItem, { borderColor: colors.border }]}>
                <Text style={[styles.categoryLabel, { color: colors.text }]}>{categorie}</Text>
                <Text style={[styles.categoryValue, { color: colors.error }]}>
                  {formatMontant(montant)} FCFA
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Dettes */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="card-outline" size={24} color={colors.warning} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dettes</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Dettes</Text>
          <Text style={[styles.totalValue, { color: colors.warning }]}>
            {formatMontant(bilanData.dettes.total)} FCFA
          </Text>
          <Text style={[styles.totalSubtext, { color: colors.textSecondary }]}>
            {bilanData.dettes.nombre} dette(s) en cours
          </Text>
          <Text style={[styles.totalSubtext, { color: colors.textSecondary }]}>
            Intérêts mensuels: {formatMontant(bilanData.dettes.interets_mensuels)} FCFA
          </Text>
        </View>

        {bilanData.dettes.liste.length > 0 && (
          <View style={styles.dettesList}>
            {bilanData.dettes.liste.map((dette) => (
              <View key={dette.id} style={[styles.detteItem, { borderColor: colors.border }]}>
                <View style={styles.detteItemLeft}>
                  <Text style={[styles.detteLabel, { color: colors.text }]}>{dette.libelle}</Text>
                  {dette.date_echeance && (
                    <Text style={[styles.detteDate, { color: colors.textSecondary }]}>
                      Échéance: {format(parseISO(dette.date_echeance), 'dd MMM yyyy', { locale: fr })}
                    </Text>
                  )}
                  <Text style={[styles.detteInfo, { color: colors.textSecondary }]}>
                    Taux: {dette.taux_interet}% annuel
                  </Text>
                </View>
                <View style={styles.detteItemRight}>
                  <Text style={[styles.detteMontant, { color: colors.warning }]}>
                    {formatMontant(dette.montant_restant)} FCFA
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Actifs */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="business" size={24} color={colors.info} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Actifs</Text>
        </View>
        <View style={styles.actifsGrid}>
          <View style={[styles.actifBox, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.actifLabel, { color: colors.textSecondary }]}>Valeur Cheptel</Text>
            <Text style={[styles.actifValue, { color: colors.primary }]}>
              {formatMontant(bilanData.actifs.valeur_cheptel)} FCFA
            </Text>
            <Text style={[styles.actifSubtext, { color: colors.textSecondary }]}>
              {bilanData.actifs.nombre_animaux} animal(s) - Poids moyen: {bilanData.actifs.poids_moyen_cheptel.toFixed(1)} kg
            </Text>
          </View>
          <View style={[styles.actifBox, { backgroundColor: colors.info + '15' }]}>
            <Text style={[styles.actifLabel, { color: colors.textSecondary }]}>Valeur Stocks</Text>
            <Text style={[styles.actifValue, { color: colors.info }]}>
              {formatMontant(bilanData.actifs.valeur_stocks)} FCFA
            </Text>
          </View>
          <View style={[styles.actifBox, { backgroundColor: colors.success + '15' }]}>
            <Text style={[styles.actifLabel, { color: colors.textSecondary }]}>Total Actifs</Text>
            <Text style={[styles.actifValue, { color: colors.success }]}>
              {formatMontant(bilanData.actifs.total)} FCFA
            </Text>
          </View>
        </View>
      </Card>

      {/* Indicateurs */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="analytics" size={24} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Indicateurs Clés</Text>
        </View>
        <View style={styles.indicatorsGrid}>
          <View style={[styles.indicatorBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.indicatorLabel, { color: colors.textSecondary }]}>
              Taux d'endettement
            </Text>
            <Text style={[styles.indicatorValue, { color: colors.text }]}>
              {formatPourcentage(bilanData.indicateurs.taux_endettement)}
            </Text>
          </View>
          <View style={[styles.indicatorBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.indicatorLabel, { color: colors.textSecondary }]}>
              Ratio de rentabilité
            </Text>
            <Text
              style={[
                styles.indicatorValue,
                { color: bilanData.indicateurs.ratio_rentabilite >= 0 ? colors.success : colors.error },
              ]}
            >
              {formatPourcentage(bilanData.indicateurs.ratio_rentabilite)}
            </Text>
          </View>
          <View style={[styles.indicatorBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.indicatorLabel, { color: colors.textSecondary }]}>
              Coût/kg OPEX
            </Text>
            <Text style={[styles.indicatorValue, { color: colors.text }]}>
              {formatMontant(bilanData.indicateurs.cout_kg_opex)} FCFA/kg
            </Text>
          </View>
          <View style={[styles.indicatorBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.indicatorLabel, { color: colors.textSecondary }]}>
              Total kg vendus
              {bilanData.indicateurs.total_kg_vendus_estime && (
                <Text style={{ color: colors.warning, fontSize: FONT_SIZES.xs }}> (estimation)</Text>
              )}
            </Text>
            <Text style={[styles.indicatorValue, { color: colors.text }]}>
              {formatMontant(bilanData.indicateurs.total_kg_vendus)} kg
            </Text>
            {bilanData.indicateurs.total_kg_vendus_estime && (
              <Text style={[styles.indicatorSubtext, { color: colors.textSecondary }]}>
                Estimation basée sur les ventes réalisées
              </Text>
            )}
          </View>
        </View>
      </Card>

      {/* Boutons Export */}
      <Card style={styles.exportCard}>
        <View style={styles.exportButtonsContainer}>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.primary }]}
            onPress={async () => {
              if (!projetActif || !bilanData) return;
              try {
                await exportBilanCompletPDF({
                  projet: projetActif,
                  ...bilanData,
                });
                Alert.alert('Succès', 'Bilan exporté en PDF avec succès');
              } catch (error) {
                logger.error('Erreur export PDF:', error);
                Alert.alert('Erreur', 'Impossible d\'exporter le bilan en PDF');
              }
            }}
          >
            <Ionicons name="document-text-outline" size={20} color="#fff" />
            <Text style={styles.exportButtonText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.success }]}
            onPress={async () => {
              if (!projetActif || !bilanData) return;
              try {
                await exportBilanCompletExcel({
                  projet: projetActif,
                  ...bilanData,
                });
                Alert.alert('Succès', 'Bilan exporté en Excel (CSV) avec succès');
              } catch (error) {
                logger.error('Erreur export Excel:', error);
                Alert.alert('Erreur', 'Impossible d\'exporter le bilan en Excel');
              }
            }}
          >
            <Ionicons name="document-outline" size={20} color="#fff" />
            <Text style={styles.exportButtonText}>Excel</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
  },
  headerCard: {
    marginBottom: SPACING.md,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  periodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  periodButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  periodButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  periodInfo: {
    fontSize: FONT_SIZES.sm,
  },
  resultsCard: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  resultBox: {
    flex: 1,
    minWidth: '30%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  resultLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
  },
  resultValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  sectionCard: {
    marginBottom: SPACING.md,
  },
  totalBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#f9f9f9',
    marginBottom: SPACING.md,
  },
  totalLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs / 2,
  },
  totalValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs / 2,
  },
  totalSubtext: {
    fontSize: FONT_SIZES.xs,
  },
  chartContainer: {
    marginVertical: SPACING.md,
    alignItems: 'center',
  },
  categoryList: {
    gap: SPACING.xs,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  categoryLabel: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  categoryValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  expensesBreakdown: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  expenseBox: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  expenseLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
  },
  expenseValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  dettesList: {
    gap: SPACING.sm,
  },
  detteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  detteItemLeft: {
    flex: 1,
  },
  detteLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs / 2,
  },
  detteDate: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
  },
  detteInfo: {
    fontSize: FONT_SIZES.xs,
  },
  detteItemRight: {
    alignItems: 'flex-end',
  },
  detteMontant: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  actifsGrid: {
    gap: SPACING.sm,
  },
  actifBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  actifLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs / 2,
  },
  actifValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs / 2,
  },
  actifSubtext: {
    fontSize: FONT_SIZES.xs,
  },
  indicatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  indicatorBox: {
    flex: 1,
    minWidth: '45%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  indicatorLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs / 2,
  },
  indicatorValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  indicatorSubtext: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs / 2,
    fontStyle: 'italic',
  },
  exportCard: {
    marginTop: SPACING.md,
  },
  exportButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
});

