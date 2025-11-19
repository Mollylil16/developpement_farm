/**
 * 📊 MODULE PLANNING PRODUCTION - Écran Principal
 * Système de planification stratégique avancé
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';

// Composants (à créer)
import SimulateurProductionComponent from '../components/SimulateurProductionComponent';
import PlanificateurSailliesComponent from '../components/PlanificateurSailliesComponent';
import PrevisionVentesComponent from '../components/PrevisionVentesComponent';

type OngletType = 'simulation' | 'saillies' | 'ventes';

export default function PlanningProductionScreen() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  
  const { projetActif } = useAppSelector((state) => state.projet);
  const planningState = useAppSelector((state) => state.planningProduction);
  
  const [ongletActif, setOngletActif] = useState<OngletType>('simulation');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Recharger les données
    setTimeout(() => setRefreshing(false), 1000);
  };

  const onglets = [
    {
      id: 'simulation' as OngletType,
      label: 'Simulation',
      icon: 'calculator-outline',
      description: 'Objectif de production',
    },
    {
      id: 'saillies' as OngletType,
      label: 'Saillies',
      icon: 'calendar-outline',
      description: 'Planning reproduction',
    },
    {
      id: 'ventes' as OngletType,
      label: 'Ventes',
      icon: 'cash-outline',
      description: 'Prévision des ventes',
    },
  ];

  const renderOnglets = () => (
    <View style={[styles.ongletsContainer, { backgroundColor: colors.surface }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ongletsContent}
      >
        {onglets.map((onglet) => (
          <TouchableOpacity
            key={onglet.id}
            style={[
              styles.onglet,
              ongletActif === onglet.id && {
                backgroundColor: colors.primary + '20',
                borderBottomColor: colors.primary,
                borderBottomWidth: 3,
              },
            ]}
            onPress={() => setOngletActif(onglet.id)}
          >
            <Ionicons
              name={onglet.icon as any}
              size={24}
              color={ongletActif === onglet.id ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.ongletLabel,
                {
                  color: ongletActif === onglet.id ? colors.primary : colors.textSecondary,
                  fontWeight: ongletActif === onglet.id ? '600' : '400',
                },
              ]}
            >
              {onglet.label}
            </Text>
            <Text style={[styles.ongletDescription, { color: colors.textSecondary }]}>
              {onglet.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderContenu = () => {
    const refreshControl = (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={[colors.primary]}
        tintColor={colors.primary}
      />
    );

    switch (ongletActif) {
      case 'simulation':
        return <SimulateurProductionComponent refreshControl={refreshControl} />;
      case 'saillies':
        return <PlanificateurSailliesComponent refreshControl={refreshControl} />;
      case 'ventes':
        return <PrevisionVentesComponent refreshControl={refreshControl} />;
      default:
        return null;
    }
  };

  if (!projetActif) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucun projet actif
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* En-tête */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="trending-up" size={28} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Planning Production
            </Text>
          </View>
          {planningState.alertes.length > 0 && (
            <View style={[styles.alertBadge, { backgroundColor: colors.error }]}>
              <Text style={styles.alertBadgeText}>{planningState.alertes.length}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Planification stratégique et prévisions
        </Text>
      </View>

      {/* Onglets */}
      {renderOnglets()}

      {/* Contenu */}
      {renderContenu()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  alertBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  alertBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  ongletsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  ongletsContent: {
    paddingHorizontal: 8,
  },
  onglet: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
    minWidth: 120,
  },
  ongletLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  ongletDescription: {
    fontSize: 11,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
});

