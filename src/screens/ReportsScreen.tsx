import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { StatCard, QuickActionButton, Section } from '../components/UIComponents';
import { CalculsAgricoles } from '../utils/calculs';
import { PDFGeneratorService, RapportPDFData } from '../services/PDFGeneratorService';
import ExportPDFModal from '../components/ExportPDFModal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Porc, Gestation, Transaction, Recommandation } from '../types';

const { width } = Dimensions.get('window');

const ReportsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { porcs } = useSelector((state: RootState) => state.porcs);
  const { gestations, sevrages } = useSelector((state: RootState) => state.reproduction);
  const { transactions } = useSelector((state: RootState) => state.finance);
  const { planifications } = useSelector((state: RootState) => state.planification);
  const { deviseConfig } = useSelector((state: RootState) => state.parametres);
  const { projetActuel, utilisateurActuel } = useSelector((state: RootState) => state.collaboration);

  const [activeTab, setActiveTab] = useState<'overview' | 'production' | 'finance' | 'planification'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<'semaine' | 'mois' | 'trimestre' | 'annee'>('mois');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Calculs dynamiques basés sur les vraies données
  const kpis = CalculsAgricoles.calculerKPIs(porcs, gestations, transactions);
  
  // Période d'analyse
  const maintenant = new Date();
  const periode = {
    debut: new Date(maintenant.getTime() - (selectedPeriod === 'semaine' ? 7 : selectedPeriod === 'mois' ? 30 : selectedPeriod === 'trimestre' ? 90 : 365) * 24 * 60 * 60 * 1000),
    fin: maintenant,
  };

  // Rapports dynamiques
  const rapportCroissance = CalculsAgricoles.genererRapportCroissance(porcs, periode);
  const rapportProduction = CalculsAgricoles.genererRapportProduction(gestations, sevrages, transactions);
  const rapportFinancier = CalculsAgricoles.genererRapportFinancier(transactions, periode);
  const recommandations = CalculsAgricoles.genererRecommandations(porcs, gestations, transactions);

  // Fonctions utilitaires
  const formaterMontant = (montant: number) => {
    return CalculsAgricoles.formaterMontant(montant, deviseConfig);
  };

  // Fonctions d'export PDF
  const handleExportPDF = async (options: any) => {
    if (!projetActuel || !utilisateurActuel) {
      Alert.alert('Erreur', 'Informations de projet manquantes');
      return;
    }

    setExportLoading(true);
    setShowExportModal(false);

    try {
      const rapportData: RapportPDFData = {
        projet: projetActuel,
        utilisateurActuel,
        periode: {
          debut: periode.debut,
          fin: periode.fin,
        },
        porcs,
        gestations,
        transactions,
        deviseConfig,
      };

      const filePath = await PDFGeneratorService.genererRapportComplet(rapportData, options);
      
      // Partager le PDF
      await PDFGeneratorService.partagerPDF(filePath, `Rapport ${options.type}`);
      
      Alert.alert('Succès', 'Rapport PDF généré et partagé avec succès !');
      
      // Nettoyer le fichier temporaire après un délai
      setTimeout(() => {
        PDFGeneratorService.nettoyerFichier(filePath);
      }, 5000);
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le rapport PDF');
    } finally {
      setExportLoading(false);
    }
  };

  // Données pour la répartition des porcs
  const repartitionData = [
    {
      name: 'Gestation',
      population: kpis.truiesGestantes,
      color: '#FF9800',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Croissance',
      population: kpis.porcsEnCroissance,
      color: '#2196F3',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'À vendre',
      population: kpis.porcsAVendre,
      color: '#4CAF50',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
  ];

  // Fonctions de gestion
  const handleExportRapport = () => {
    Alert.alert(
      'Exporter le rapport',
      'Fonctionnalité d\'export en cours de développement',
      [{ text: 'OK' }]
    );
  };

  const handlePartagerRapport = () => {
    Alert.alert(
      'Partager le rapport',
      'Fonctionnalité de partage en cours de développement',
      [{ text: 'OK' }]
    );
  };

  const RapportCard = ({ title, value, icon, color, subtitle, onPress }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subtitle?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={[styles.reportCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Icon name={icon} size={24} color={color} />
      <Text style={styles.reportValue}>{value}</Text>
      <Text style={styles.reportTitle}>{title}</Text>
      {subtitle && <Text style={styles.reportSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  const RecommandationCard = ({ recommandation }: { recommandation: Recommandation }) => (
    <View style={styles.recommendationCard}>
      <View style={styles.recommendationHeader}>
        <Icon name={recommandation.icon} size={20} color={recommandation.color} />
        <Text style={styles.recommendationTitle}>{recommandation.titre}</Text>
      </View>
      <Text style={styles.recommendationDescription}>{recommandation.description}</Text>
      <Text style={styles.recommendationAction}>{recommandation.action}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Rapports & Analytics</Text>
        <Text style={styles.subtitle}>Analyse de performance de votre élevage</Text>
      </View>

      {/* Sélecteur de période */}
      <View style={styles.periodSelector}>
        {(['semaine', 'mois', 'trimestre', 'annee'] as const).map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonSelected
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextSelected
            ]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigation par onglets */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Vue d'ensemble
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'production' && styles.activeTab]}
          onPress={() => setActiveTab('production')}
        >
          <Text style={[styles.tabText, activeTab === 'production' && styles.activeTabText]}>
            Production
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'finance' && styles.activeTab]}
          onPress={() => setActiveTab('finance')}
        >
          <Text style={[styles.tabText, activeTab === 'finance' && styles.activeTabText]}>
            Finance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'planification' && styles.activeTab]}
          onPress={() => setActiveTab('planification')}
        >
          <Text style={[styles.tabText, activeTab === 'planification' && styles.activeTabText]}>
            Planification
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu selon l'onglet actif */}
      <View style={styles.content}>
        {activeTab === 'overview' && (
          <>
            {/* KPIs principaux */}
            <Section title="Indicateurs clés">
      <View style={styles.kpiContainer}>
                <StatCard
          title="Total Porcs"
                  value={kpis.totalPorcs.toString()}
          icon="pets"
          color="#2E7D32"
        />
                <StatCard
          title="Gestations"
                  value={kpis.truiesGestantes.toString()}
          icon="pregnant-woman"
          color="#FF9800"
        />
                <StatCard
          title="Croissance"
                  value={kpis.porcsEnCroissance.toString()}
          icon="trending-up"
          color="#2196F3"
        />
                <StatCard
          title="À Vendre"
                  value={kpis.porcsAVendre.toString()}
          icon="euro"
          color="#4CAF50"
        />
      </View>
            </Section>

      {/* Graphique de croissance */}
            <Section title="Évolution du Poids Moyen">
      <View style={styles.chartContainer}>
        <LineChart
                  data={rapportCroissance}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#2E7D32',
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>
            </Section>

            {/* Répartition des porcs */}
            <Section title="Répartition des Porcs">
              <View style={styles.chartContainer}>
                <PieChart
                  data={repartitionData}
                  width={width - 40}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  style={styles.chart}
                />
              </View>
            </Section>
          </>
        )}

        {activeTab === 'production' && (
          <>
            {/* Statistiques de production */}
            <Section title="Statistiques de Production">
              <View style={styles.kpiContainer}>
                <RapportCard
                  title="Naissances"
                  value={gestations.filter(g => g.statut === 'terminee').length}
                  icon="child-care"
                  color="#4CAF50"
                  subtitle="Cette période"
                />
                <RapportCard
                  title="Sevrages"
                  value={sevrages.length}
                  icon="restaurant"
                  color="#FF9800"
                  subtitle="Réalisés"
                />
                <RapportCard
                  title="Ventes"
                  value={transactions.filter(t => t.type === 'vente').length}
                  icon="euro"
                  color="#2196F3"
                  subtitle="Cette période"
                />
                <RapportCard
                  title="Poids Moyen"
                  value={`${kpis.poidsMoyen} kg`}
                  icon="fitness-center"
                  color="#9C27B0"
                  subtitle="En croissance"
                />
              </View>
            </Section>

      {/* Graphique de production */}
            <Section title="Production Mensuelle">
      <View style={styles.chartContainer}>
        <BarChart
                  data={rapportProduction}
          width={width - 40}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          style={styles.chart}
        />
      </View>
            </Section>

            {/* Analyse de reproduction */}
            <Section title="Analyse de Reproduction">
              <View style={styles.analysisContainer}>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Taux de reproduction</Text>
                  <Text style={styles.analysisValue}>
                    {CalculsAgricoles.calculerTauxReproduction(
                      gestations.filter(g => g.statut === 'terminee').length,
                      porcs.filter(p => p.sexe === 'femelle').length
                    ).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Taux de mortalité</Text>
                  <Text style={styles.analysisValue}>{kpis.tauxMortalite}%</Text>
                </View>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Efficacité alimentaire</Text>
                  <Text style={styles.analysisValue}>
                    {CalculsAgricoles.calculerEfficaciteAlimentaire(
                      kpis.poidsMoyen - 20, // Simulation du gain de poids
                      100 // Simulation de l'aliment consommé
                    ).toFixed(2)} kg/kg
                  </Text>
                </View>
      </View>
            </Section>
          </>
        )}

        {activeTab === 'finance' && (
          <>
      {/* Analyse financière */}
            <Section title="Analyse Financière">
              <View style={styles.financialContainer}>
                <View style={styles.financialItem}>
                  <Text style={styles.financialLabel}>Chiffre d'affaires</Text>
                  <Text style={styles.financialValue}>{formaterMontant(rapportFinancier.chiffreAffaires)}</Text>
                </View>
          <View style={styles.financialItem}>
                  <Text style={styles.financialLabel}>Dépenses totales</Text>
                  <Text style={styles.financialValue}>{formaterMontant(rapportFinancier.depensesTotal)}</Text>
          </View>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Coûts d'alimentation</Text>
                  <Text style={styles.financialValue}>{formaterMontant(rapportFinancier.depensesAlimentation)}</Text>
          </View>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Coûts vétérinaires</Text>
                  <Text style={styles.financialValue}>{formaterMontant(rapportFinancier.depensesVeterinaires)}</Text>
          </View>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Marge brute</Text>
                  <Text style={[styles.financialValue, { color: rapportFinancier.margeBrute >= 0 ? '#4CAF50' : '#F44336' }]}>
                    {formaterMontant(rapportFinancier.margeBrute)}
                  </Text>
                </View>
                <View style={styles.financialItem}>
                  <Text style={styles.financialLabel}>Marge brute (%)</Text>
                  <Text style={[styles.financialValue, { color: rapportFinancier.margeBrutePourcentage >= 0 ? '#4CAF50' : '#F44336' }]}>
                    {rapportFinancier.margeBrutePourcentage.toFixed(1)}%
                  </Text>
          </View>
        </View>
            </Section>

            {/* Actions rapides financières */}
            <Section title="Actions rapides">
              <View style={styles.quickActions}>
                <QuickActionButton
                  title="Nouvelle Transaction"
                  icon="add-circle"
                  onPress={() => {/* Navigation vers FinanceScreen */}}
                  color="#2196F3"
                />
                <QuickActionButton
                  title="Analyse Rentabilité"
                  icon="analytics"
                  onPress={() => {/* Navigation vers analyse détaillée */}}
                  color="#4CAF50"
                />
              </View>
            </Section>
          </>
        )}

        {activeTab === 'planification' && (
          <>
            {/* Statistiques de planification */}
            <Section title="Planifications Actives">
              <View style={styles.kpiContainer}>
                <RapportCard
                  title="Planifications"
                  value={planifications.length}
                  icon="assignment"
                  color="#2196F3"
                  subtitle="Total"
                />
                <RapportCard
                  title="Saillies Planifiées"
                  value={planifications.reduce((sum, p) => sum + p.saillies.length, 0)}
                  icon="schedule"
                  color="#FF9800"
                  subtitle="Total"
                />
                <RapportCard
                  title="Saillies Réalisées"
                  value={planifications.reduce((sum, p) => sum + p.saillies.filter(s => s.statut === 'realise').length, 0)}
                  icon="check-circle"
                  color="#4CAF50"
                  subtitle="Réalisées"
                />
                <RapportCard
                  title="Objectifs Atteints"
                  value={planifications.filter(p => {
                    const stats = CalculsAgricoles.analyserPlanification(p);
                    return stats.objectifAtteint;
                  }).length}
                  icon="flag"
                  color="#9C27B0"
                  subtitle="Sur objectif"
                />
              </View>
            </Section>

            {/* Actions rapides planification */}
            <Section title="Actions rapides">
              <View style={styles.quickActions}>
                <QuickActionButton
                  title="Nouvelle Planification"
                  icon="add-circle"
                  onPress={() => {/* Navigation vers PlanificationScreen */}}
                  color="#2196F3"
                />
                <QuickActionButton
                  title="Calendrier Saillies"
                  icon="calendar-today"
                  onPress={() => {/* Navigation vers calendrier */}}
                  color="#4CAF50"
                />
              </View>
            </Section>
          </>
        )}
      </View>

      {/* Recommandations */}
      <Section title="Recommandations">
        <View style={styles.recommendationsContainer}>
          {recommandations.map((recommandation: Recommandation, index: number) => (
            <RecommandationCard key={index} recommandation={recommandation} />
          ))}
        </View>
      </Section>

      {/* Actions d'export */}
      <Section title="Export & Partage">
        <View style={styles.exportContainer}>
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => setShowExportModal(true)}
            disabled={exportLoading}
          >
            <Icon name="picture-as-pdf" size={24} color="#fff" />
            <Text style={styles.exportButtonText}>
              {exportLoading ? 'Génération...' : 'Exporter en PDF'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareButton}>
            <Icon name="share" size={24} color="#2196F3" />
            <Text style={styles.shareButtonText}>Partager</Text>
          </TouchableOpacity>
        </View>
      </Section>

      {/* Modal d'export PDF */}
      <ExportPDFModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportPDF}
        loading={exportLoading}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 10,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  periodButtonSelected: {
    backgroundColor: '#2E7D32',
  },
  periodButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  periodButtonTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 10,
    padding: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#2E7D32',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    padding: 15,
  },
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reportCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  reportTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reportSubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 1,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    borderRadius: 16,
  },
  analysisContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analysisItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  analysisLabel: {
    fontSize: 14,
    color: '#666',
  },
  analysisValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  financialContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  financialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  financialLabel: {
    fontSize: 14,
    color: '#666',
  },
  financialValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
  },
  recommendationsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  recommendationDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  recommendationAction: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  exportContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  shareButton: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButtonText: {
    color: '#2196F3',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
});

export default ReportsScreen;