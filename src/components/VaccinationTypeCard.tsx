/**
 * VaccinationTypeCard - Carte pour un type de prophylaxie
 *
 * Affiche les statistiques et actions pour un type spécifique
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { TypeProphylaxie, StatistiquesProphylaxieParType } from '../types/sante';

interface VaccinationTypeCardProps {
  stat: StatistiquesProphylaxieParType;
  icone: keyof typeof Ionicons.glyphMap;
  couleur: string;
  onAjouter: (type: TypeProphylaxie) => void;
  onVoirCalendrier: (type: TypeProphylaxie) => void;
}

export default function VaccinationTypeCard({
  stat,
  icone,
  couleur,
  onAjouter,
  onVoirCalendrier,
}: VaccinationTypeCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* En-tête avec icône */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: couleur + '20' }]}>
          <Ionicons name={icone} size={32} color={couleur} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.titre, { color: colors.text }]}>{stat.nom_type}</Text>
          <Text style={[styles.sousTitre, { color: colors.textSecondary }]}>
            {stat.total_vaccinations} administration{stat.total_vaccinations > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <View style={styles.statRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Effectués</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stat.porcs_vaccines}</Text>
        </View>

        <View style={styles.statItem}>
          <View style={styles.statRow}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>En retard</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stat.en_retard}</Text>
        </View>

        <View style={styles.statItem}>
          <View style={styles.statRow}>
            <Ionicons name="shield-checkmark" size={16} color={couleur} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Couverture</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stat.taux_couverture}%</Text>
        </View>
      </View>

      {/* Barre de progression */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${stat.taux_couverture}%`,
              backgroundColor: couleur,
            },
          ]}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: couleur + '20' }]}
          onPress={() => onAjouter(stat.type_prophylaxie)}
        >
          <Ionicons name="add-circle-outline" size={20} color={couleur} />
          <Text style={[styles.buttonText, { color: couleur }]}>Ajouter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.background }]}
          onPress={() => onVoirCalendrier(stat.type_prophylaxie)}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Calendrier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
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
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  titre: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sousTitre: {
    fontSize: 14,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
