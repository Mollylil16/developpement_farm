import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type { AnalyseFinanciere, RentabilitePorc } from '../store/slices/financeSlice';

const { width } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Icon name={icon} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

interface AnalyseFinanciereProps {
  analyse: AnalyseFinanciere;
}

export const AnalyseFinanciereComponent: React.FC<AnalyseFinanciereProps> = ({ analyse }) => {
  // Données pour le graphique d'évolution mensuelle
  const chartData = {
    labels: analyse.evolutionMensuelle.map(item => 
      new Date(item.date).toLocaleDateString('fr-FR', { month: 'short' })
    ),
    datasets: [
      {
        data: analyse.evolutionMensuelle.map(item => item.recettes),
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: analyse.evolutionMensuelle.map(item => item.depenses),
        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Données pour le graphique en barres des catégories
  const categoriesData = {
    labels: Object.keys(analyse.transactionsParCategorie).slice(0, 5),
    datasets: [
      {
        data: Object.values(analyse.transactionsParCategorie).slice(0, 5),
      },
    ],
  };

  return (
    <ScrollView style={styles.container}>
      {/* Statistiques principales */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Chiffre d'Affaires"
          value={`${analyse.chiffreAffairesTotal.toLocaleString()} €`}
          icon="euro"
          color="#4CAF50"
        />
        <StatCard
          title="Coûts Totaux"
          value={`${analyse.coutsTotaux.toLocaleString()} €`}
          icon="money-off"
          color="#F44336"
        />
        <StatCard
          title="Bénéfice Net"
          value={`${analyse.beneficeNet.toLocaleString()} €`}
          icon="trending-up"
          color={analyse.beneficeNet >= 0 ? "#4CAF50" : "#F44336"}
          subtitle={`${analyse.rentabiliteGenerale.toFixed(1)}% de rentabilité`}
        />
        <StatCard
          title="Coût par kg"
          value={`${analyse.coutParKgProduction.toFixed(2)} €`}
          icon="scale"
          color="#FF9800"
        />
      </View>

      {/* Graphique d'évolution mensuelle */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Évolution Mensuelle</Text>
        <LineChart
          data={chartData}
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
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Recettes</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Dépenses</Text>
          </View>
        </View>
      </View>

      {/* Graphique des catégories */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Répartition par Catégorie</Text>
        <BarChart
          data={categoriesData}
          width={width - 40}
          height={220}
          yAxisLabel="€"
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
    </ScrollView>
  );
};

interface RentabilitePorcsProps {
  rentabilitePorcs: RentabilitePorc[];
  porcs: any[];
}

export const RentabilitePorcsComponent: React.FC<RentabilitePorcsProps> = ({ 
  rentabilitePorcs, 
  porcs 
}) => {
  const getPorcInfo = (porcId: string) => {
    return porcs.find(p => p.id === porcId);
  };

  const getRentabiliteColor = (rentabilite: number) => {
    if (rentabilite >= 20) return '#4CAF50';
    if (rentabilite >= 10) return '#FF9800';
    if (rentabilite >= 0) return '#FFC107';
    return '#F44336';
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Rentabilité par Porc</Text>
      
      {rentabilitePorcs.map((rentabilite) => {
        const porc = getPorcInfo(rentabilite.porcId);
        if (!porc) return null;

        return (
          <View key={rentabilite.porcId} style={styles.porcCard}>
            <View style={styles.porcHeader}>
              <Text style={styles.porcName}>
                {porc.numeroIdentification} - {porc.race}
              </Text>
              <View style={[
                styles.rentabiliteBadge, 
                { backgroundColor: getRentabiliteColor(rentabilite.rentabilite) }
              ]}>
                <Text style={styles.rentabiliteText}>
                  {rentabilite.rentabilite.toFixed(1)}%
                </Text>
              </View>
            </View>
            
            <View style={styles.porcStats}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Poids:</Text>
                <Text style={styles.statValue}>{porc.poidsActuel} kg</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Coût total:</Text>
                <Text style={styles.statValue}>{rentabilite.coutTotal.toLocaleString()} €</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Prix de vente:</Text>
                <Text style={styles.statValue}>{rentabilite.prixVente.toLocaleString()} €</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Bénéfice:</Text>
                <Text style={[
                  styles.statValue,
                  { color: rentabilite.benefice >= 0 ? '#4CAF50' : '#F44336' }
                ]}>
                  {rentabilite.benefice.toLocaleString()} €
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Coût/kg:</Text>
                <Text style={styles.statValue}>{rentabilite.coutParKg.toFixed(2)} €</Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-between',
  },
  statCard: {
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
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  chart: {
    borderRadius: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    margin: 20,
    marginBottom: 10,
  },
  porcCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  porcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  porcName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  rentabiliteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rentabiliteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  porcStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statRow: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
});
