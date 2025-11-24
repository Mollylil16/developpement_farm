/**
 * VaccinationStatsCard - Carte récapitulative des statistiques de vaccination
 * 
 * Affiche les KPI globaux de prophylaxie
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { StatsGlobales } from '../hooks/useVaccinationLogic';

interface VaccinationStatsCardProps {
  stats: StatsGlobales;
}

export default function VaccinationStatsCard({ stats }: VaccinationStatsCardProps) {
  const { colors } = useTheme();
  
  const statItems = [
    {
      icon: 'paw' as const,
      label: 'Animaux',
      value: stats.totalAnimaux,
      color: colors.primary,
    },
    {
      icon: 'medical' as const,
      label: 'Vaccinations',
      value: stats.totalVaccinations,
      color: colors.success,
    },
    {
      icon: 'alert-circle' as const,
      label: 'En retard',
      value: stats.porcsEnRetard,
      color: colors.error,
    },
    {
      icon: 'shield-checkmark' as const,
      label: 'Couverture',
      value: `${stats.tauxCouverture}%`,
      color: stats.tauxCouverture >= 80 ? colors.success : colors.warning,
    },
  ];
  
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Ionicons name="stats-chart" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Vue d'ensemble</Text>
      </View>
      
      <View style={styles.statsGrid}>
        {statItems.map((item, index) => (
          <View key={index} style={styles.statItem}>
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{item.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: '22%',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});

