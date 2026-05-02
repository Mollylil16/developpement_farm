/**
 * SanteAlertes - Section des alertes sanitaires
 *
 * Affiche les alertes critiques/élevées/moyennes en scrollview horizontal
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Alerte {
  gravite: 'critique' | 'elevee' | 'moyenne' | 'faible';
  message: string;
  type: string;
}

interface SanteAlertesProps {
  alertes: Alerte[];
  nombreAlertesCritiques: number;
  showAlertes: boolean;
  onClose: () => void;
}

export default function SanteAlertes({
  alertes,
  nombreAlertesCritiques,
  showAlertes,
  onClose,
}: SanteAlertesProps) {
  const { colors } = useTheme();

  if (!showAlertes || alertes.length === 0) {
    return null;
  }

  return (
    <View style={[styles.alertesContainer, { backgroundColor: colors.surface }]}>
      <View style={styles.alertesHeader}>
        <View style={styles.alertesTitleContainer}>
          <Ionicons name="alert-circle" size={24} color={colors.error} />
          <Text style={[styles.alertesTitle, { color: colors.text }]}>Alertes Sanitaires</Text>
          {nombreAlertesCritiques > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.error }]}>
              <Text style={styles.badgeText}>{nombreAlertesCritiques}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertesScroll}>
        {alertes.map((alerte, index) => (
          <View
            key={index}
            style={[
              styles.alerteCard,
              {
                backgroundColor:
                  alerte.gravite === 'critique'
                    ? colors.error + '20'
                    : alerte.gravite === 'elevee'
                      ? colors.warning + '20'
                      : colors.info + '20',
                borderColor:
                  alerte.gravite === 'critique'
                    ? colors.error
                    : alerte.gravite === 'elevee'
                      ? colors.warning
                      : colors.info,
              },
            ]}
          >
            <Text
              style={[
                styles.alerteType,
                {
                  color:
                    alerte.gravite === 'critique'
                      ? colors.error
                      : alerte.gravite === 'elevee'
                        ? colors.warning
                        : colors.info,
                },
              ]}
            >
              {alerte.gravite.toUpperCase()}
            </Text>
            <Text style={[styles.alerteMessage, { color: colors.text }]}>{alerte.message}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  alertesContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  alertesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertesTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  alertesScroll: {
    flexGrow: 0,
  },
  alerteCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
    minWidth: 200,
  },
  alerteType: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  alerteMessage: {
    fontSize: 13,
  },
});
